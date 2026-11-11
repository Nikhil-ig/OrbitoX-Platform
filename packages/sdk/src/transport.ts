/**
 * 🪐 OrbitoX SDK - HTTP Transport Engine
 * Handles automatic idempotency keys, jittered exponential backoff, and error mapping.
 */

import * as crypto from 'crypto';
import {
  OrbitoXApiError,
  OrbitoXAuthenticationError,
  OrbitoXForbiddenError,
  OrbitoXNotFoundError,
  OrbitoXRateLimitError,
  OrbitoXServiceUnavailableError,
  OrbitoXTimeoutError,
  scrubSecrets,
} from './errors';

export interface TransportRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  query?: Record<string, any>;
  headers?: Record<string, string | undefined>;
  body?: any;
  idempotencyKey?: string;
  timeoutMs?: number;
  skipIdempotencyKey?: boolean;
}

export interface TransportConfig {
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
  maxRetries?: number;
  fetch?: typeof globalThis.fetch;
}

export class HttpTransport {
  readonly baseUrl: string;
  readonly apiKey?: string;
  readonly timeoutMs: number;
  readonly maxRetries: number;
  private readonly customFetch?: typeof globalThis.fetch;

  constructor(config: TransportConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs ?? 15000;
    this.maxRetries = config.maxRetries ?? 3;
    this.customFetch = config.fetch;
  }

  async request<T = any>(options: TransportRequestOptions): Promise<T> {
    const method = options.method || 'GET';
    const isNaturallyIdempotent = ['GET', 'HEAD', 'PUT', 'DELETE'].includes(method);
    
    // Automatically assign idempotency key for mutating requests unless skipped
    let idempotencyKey = options.idempotencyKey;
    if (!idempotencyKey && !isNaturallyIdempotent && !options.skipIdempotencyKey) {
      idempotencyKey = `idem_${crypto.randomUUID()}`;
    }

    const isIdempotentCall = isNaturallyIdempotent || Boolean(idempotencyKey);
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;
    const fetchFn = this.customFetch || globalThis.fetch;

    let urlString = options.path.startsWith('http') ? options.path : `${this.baseUrl}${options.path.startsWith('/') ? options.path : `/${options.path}`}`;
    if (options.query) {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(options.query)) {
        if (v !== undefined && v !== null) q.append(k, String(v));
      }
      const qs = q.toString();
      if (qs) urlString += (urlString.includes('?') ? '&' : '?') + qs;
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.apiKey && !headers['Authorization'] && !headers['x-api-key']) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    if (idempotencyKey && !headers['idempotency-key'] && !headers['x-idempotency-key']) {
      headers['idempotency-key'] = idempotencyKey;
    }

    let bodyStr: string | undefined = undefined;
    if (options.body !== undefined && options.body !== null) {
      headers['Content-Type'] = 'application/json';
      bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    }

    let attempt = 0;
    const maxAttempts = isIdempotentCall ? this.maxRetries : 0;

    while (true) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetchFn(urlString, {
          method,
          headers,
          body: bodyStr,
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            return (await response.json()) as T;
          }
          const text = await response.text();
          try {
            return JSON.parse(text) as T;
          } catch {
            return text as unknown as T;
          }
        }

        const status = response.status;
        const requestId = response.headers.get('x-request-id') || response.headers.get('request-id') || undefined;

        // Parse error response payload safely
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          try {
            errorData = { message: await response.text() };
          } catch {
            errorData = { message: `HTTP Error ${status}` };
          }
        }

        const errorCode = errorData?.code || errorData?.error?.code || errorData?.error || 'HTTP_ERROR';
        const rawMessage = errorData?.message || errorData?.error?.message || errorData?.error || `HTTP ${status}`;
        const sanitizedMessage = scrubSecrets(rawMessage);

        // Retry only on 429 or 503 and ONLY if request is idempotent
        if ((status === 429 || status === 503) && isIdempotentCall && attempt < maxAttempts) {
          attempt++;
          let delayMs = 100 * Math.pow(2, attempt) + Math.random() * 50;
          if (status === 429) {
            const retryAfterHeader = response.headers.get('retry-after');
            if (retryAfterHeader) {
              const seconds = parseFloat(retryAfterHeader);
              if (!isNaN(seconds) && seconds > 0) {
                delayMs = seconds * 1000;
              }
            }
          }
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        // Map status code to strongly-typed error
        const errParams = {
          message: sanitizedMessage,
          status,
          code: String(errorCode),
          requestId,
          details: errorData,
        };

        if (status === 401) throw new OrbitoXAuthenticationError(errParams);
        if (status === 403) throw new OrbitoXForbiddenError(errParams);
        if (status === 404) throw new OrbitoXNotFoundError(errParams);
        if (status === 429) throw new OrbitoXRateLimitError(errParams);
        if (status === 503) throw new OrbitoXServiceUnavailableError(errParams);

        throw new OrbitoXApiError(errParams);
      } catch (err: any) {
        clearTimeout(timer);

        if (err instanceof OrbitoXApiError) {
          throw err;
        }

        if (err?.name === 'AbortError' || controller.signal.aborted) {
          throw new OrbitoXTimeoutError(`Request timed out after ${timeoutMs}ms`);
        }

        // Retry on network/connection drop only for idempotent calls
        if (isIdempotentCall && attempt < maxAttempts) {
          attempt++;
          const delayMs = 100 * Math.pow(2, attempt) + Math.random() * 50;
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        throw new OrbitoXApiError({
          message: scrubSecrets(err?.message || 'Network request failed'),
          status: 0,
          code: 'NETWORK_ERROR',
          details: err,
        });
      }
    }
  }
}
