import { NextRequest, NextResponse } from 'next/server';
import { ApiRequestContext } from '@/app/api/v1/_lib/api-types';

export const ORBITOX_BACKEND_URL = process.env.ORBITOX_BACKEND_URL || 'http://localhost:3000';

function trustedHeaders(authContext: ApiRequestContext, headers?: HeadersInit): Headers {
  const trusted = new Headers(headers);
  trusted.set('Authorization', `Bearer ${authContext.credential}`);
  trusted.set('x-tenant-id', authContext.tenantId);
  trusted.set('x-context-id', authContext.tenantId);
  return trusted;
}

export async function authenticatedHospitalFetch(
  upstreamPath: string,
  authContext: ApiRequestContext | undefined,
  init: RequestInit = {}
): Promise<Response> {
  if (!authContext?.tenantId || !authContext.credential) {
    throw new Error('A verified customer principal is required.');
  }
  return fetch(`${ORBITOX_BACKEND_URL}${upstreamPath}`, {
    ...init,
    headers: trustedHeaders(authContext, init.headers),
  });
}

export async function safeProxyOrFallback(
  req: NextRequest,
  upstreamPath: string,
  fallbackFn: () => Promise<any> | any,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {},
  authContext: ApiRequestContext
) {
  if (!authContext?.tenantId || !authContext.credential) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'A verified customer principal is required.' } },
      { status: 401 }
    );
  }

  const method = options.method || req.method || 'GET';
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 800);

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: trustedHeaders(authContext, {
        'Accept': 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      }),
      signal: abortController.signal,
      cache: 'no-store',
    };

    if (options.body) {
      fetchOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    }

    const res = await fetch(`${ORBITOX_BACKEND_URL}${upstreamPath}`, fetchOptions);
    clearTimeout(timeoutId);

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    // Upstream returned 404 or HTML error page — seamlessly fall back
    const fallbackData = await fallbackFn();
    return NextResponse.json({
      success: true,
      data: fallbackData,
      meta: { source: 'in_memory_resilience_engine', upstreamPath },
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    // Upstream unreachable (connection refused, timeout, etc.) — execute in-memory fallback
    try {
      const fallbackData = await fallbackFn();
      return NextResponse.json({
        success: true,
        data: fallbackData,
        meta: { source: 'in_memory_resilience_engine', upstreamPath },
      });
    } catch (fallbackErr: any) {
      return NextResponse.json(
        { success: false, error: fallbackErr.message || 'Error executing resilient fallback.' },
        { status: 500 }
      );
    }
  }
}
