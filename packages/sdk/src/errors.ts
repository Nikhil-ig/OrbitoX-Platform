/**
 * 🪐 OrbitoX SDK - Typed Errors & Secret Redaction
 */

export function scrubSecrets(input: unknown): string {
  if (typeof input !== 'string') {
    try {
      input = JSON.stringify(input);
    } catch {
      input = String(input);
    }
  }

  let text = String(input);
  // Redact API key tokens (e.g. orb_live_..., orb_test_..., Bearer ..., sk_..., etc.)
  text = text.replace(/orb_(live|test)_[a-zA-Z0-9_-]+/g, 'orb_$1_••••••••');
  text = text.replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer ••••••••');
  text = text.replace(/(apiKey|api_key|secret|password|privateKey|pepper)["']?\s*[:=]\s*["']?([^"',\s]+)/gi, '$1: "••••••••"');
  text = text.replace(/(["']?authorization["']?\s*:\s*["'])[^"']+["']/gi, '$1Bearer ••••••••"');

  return text;
}

export class OrbitoXError extends Error {
  constructor(message: string) {
    super(scrubSecrets(message));
    this.name = 'OrbitoXError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export interface OrbitoXApiErrorParams {
  message: string;
  status: number;
  code?: string;
  requestId?: string;
  details?: any;
}

export class OrbitoXApiError extends OrbitoXError {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly details?: any;

  constructor(params: OrbitoXApiErrorParams) {
    super(params.message);
    this.name = 'OrbitoXApiError';
    this.status = params.status;
    this.code = params.code || 'API_ERROR';
    this.requestId = params.requestId;
    this.details = params.details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class OrbitoXAuthenticationError extends OrbitoXApiError {
  constructor(params: Omit<OrbitoXApiErrorParams, 'status'>) {
    super({ ...params, status: 401, code: params.code || 'UNAUTHORIZED' });
    this.name = 'OrbitoXAuthenticationError';
  }
}

export class OrbitoXForbiddenError extends OrbitoXApiError {
  constructor(params: Omit<OrbitoXApiErrorParams, 'status'>) {
    super({ ...params, status: 403, code: params.code || 'FORBIDDEN' });
    this.name = 'OrbitoXForbiddenError';
  }
}

export class OrbitoXNotFoundError extends OrbitoXApiError {
  constructor(params: Omit<OrbitoXApiErrorParams, 'status'>) {
    super({ ...params, status: 404, code: params.code || 'NOT_FOUND' });
    this.name = 'OrbitoXNotFoundError';
  }
}

export class OrbitoXRateLimitError extends OrbitoXApiError {
  readonly retryAfterMs?: number;
  constructor(params: Omit<OrbitoXApiErrorParams, 'status'> & { retryAfterMs?: number }) {
    super({ ...params, status: 429, code: params.code || 'RATE_LIMIT_EXCEEDED' });
    this.name = 'OrbitoXRateLimitError';
    this.retryAfterMs = params.retryAfterMs;
  }
}

export class OrbitoXServiceUnavailableError extends OrbitoXApiError {
  constructor(params: Omit<OrbitoXApiErrorParams, 'status'>) {
    super({ ...params, status: 503, code: params.code || 'SERVICE_UNAVAILABLE' });
    this.name = 'OrbitoXServiceUnavailableError';
  }
}

export class OrbitoXTimeoutError extends OrbitoXError {
  constructor(message = 'Request timed out') {
    super(message);
    this.name = 'OrbitoXTimeoutError';
  }
}
