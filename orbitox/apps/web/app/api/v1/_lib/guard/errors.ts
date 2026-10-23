import { NextResponse } from 'next/server';
import { StandardApiResponse } from './types';

/**
 * Attaches mandatory baseline security headers to every API response.
 */
export function applySecurityHeaders(
  headers: Headers,
  isAuthenticated: boolean = false
): void {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  
  if (isAuthenticated) {
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    headers.set('Pragma', 'no-cache');
  }
}

/**
 * Creates a standardized error response adhering to the zero-leak security contract.
 * Stack traces and internal exceptions are NEVER leaked to the client.
 */
export function createErrorResponse(params: {
  code: string;
  message: string;
  status: number;
  requestId: string;
  startTime: number;
  tenantId?: string;
  serviceId?: string;
  details?: any;
  extraHeaders?: Record<string, string>;
}): NextResponse {
  const latencyMs = Math.max(1, Math.round(performance.now() - params.startTime));

  const body: StandardApiResponse = {
    success: false,
    error: {
      code: params.code,
      message: params.message,
      requestId: params.requestId,
      ...(params.details ? { details: params.details } : {}),
    },
    meta: {
      tenantId: params.tenantId || 'system',
      serviceId: params.serviceId || 'system',
      latencyMs,
      timestamp: new Date().toISOString(),
      requestId: params.requestId,
    },
  };

  const res = NextResponse.json(body, {
    status: params.status,
  });

  applySecurityHeaders(res.headers, params.status !== 401);
  res.headers.set('x-request-id', params.requestId);

  if (params.extraHeaders) {
    for (const [k, v] of Object.entries(params.extraHeaders)) {
      res.headers.set(k, v);
    }
  }

  return res;
}
