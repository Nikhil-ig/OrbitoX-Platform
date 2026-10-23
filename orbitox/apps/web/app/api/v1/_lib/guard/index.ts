import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import {
  ApiGuardOptions,
  ApiRequestContext,
  RouteHandler,
  StandardApiResponse,
} from './types';
import { createErrorResponse, applySecurityHeaders } from './errors';
import {
  authenticateCredential,
  createNewApiKey,
  registerApiKey,
  revokeKey,
  listApiKeys,
  getApiKey,
  getServerPepper,
  computeVerifier,
} from './authenticate';
import { authorizeRequest } from './authorize';
import { resolveTenant } from './tenant';
import { checkRateLimit, checkFailedAuthLimit } from './rate-limit';

export * from './types';
export * from './errors';
export * from './authenticate';
export * from './authorize';
export * from './tenant';
export * from './rate-limit';

/**
 * Enterprise Production API Guard for OrbitoX Platform.
 *
 * Guarantees:
 * 1. Default-Deny: Every endpoint requires authentication unless explicitly declared public.
 * 2. Public callers receive scopes: [], NEVER ['*'].
 * 3. Constant-time HMAC-SHA256 authentication against nonces with server pepper.
 * 4. Header-only credentials (rejects query string tokens).
 * 5. Mandatory declared scopes and strict IP allowlisting on root keys.
 * 6. Authoritative tenant scoping with anti-spoofing enforcement.
 * 7. Rate limiting per credential and strict exponential lockout for failed auth.
 * 8. Standard zero-leak error envelope with baseline security headers.
 */
let drainChecker: (() => boolean) | null = null;
let requestTracker: { track: () => void; untrack: () => void } | null = null;

export function setDrainChecker(fn: () => boolean): void {
  drainChecker = fn;
}

export function setRequestTracker(tracker: { track: () => void; untrack: () => void }): void {
  requestTracker = tracker;
}

export function withApiGuard<T = any>(
  optionsOrHandler: ApiGuardOptions | RouteHandler,
  handlerOrOptions?: RouteHandler | ApiGuardOptions
): (req: NextRequest) => Promise<NextResponse | Response> {
  let options: ApiGuardOptions = {};
  let handler: RouteHandler;

  if (typeof optionsOrHandler === 'function') {
    handler = optionsOrHandler;
    options = (handlerOrOptions as ApiGuardOptions) || {};
  } else {
    options = optionsOrHandler || {};
    handler = handlerOrOptions as RouteHandler;
  }

  if (!handler) {
    return ((curriedHandler: RouteHandler) => withApiGuard(options, curriedHandler)) as any;
  }

  return async (req: NextRequest): Promise<NextResponse | Response> => {
    const startTime = performance.now();
    const requestId = `req_${crypto.randomUUID()}`;

    // Drain Gate: reject incoming traffic if draining, unless it's a system management request
    if (drainChecker && drainChecker() && options.serviceId !== 'system') {
      return createErrorResponse({
        code: 'SYSTEM_DRAIN_MODE',
        message: 'Traffic drain in progress: System is transitioning architecture mode. Please retry in 2 seconds.',
        status: 503,
        requestId,
        startTime,
        serviceId: options.serviceId || 'system',
        extraHeaders: {
          'Retry-After': '2',
          'x-orbitox-drain-mode': 'active',
        },
      });
    }

    if (requestTracker) {
      requestTracker.track();
    }

    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const serviceId = options.serviceId || 'system';

    // 1. Failed Auth Brute-Force Rate Limiter
    const failedAuthCheck = await checkFailedAuthLimit(clientIp);
    if (!failedAuthCheck.allowed) {
      return createErrorResponse({
        code: 'TOO_MANY_FAILED_ATTEMPTS',
        message: `Too many failed authentication attempts. Access locked. Try again in ${failedAuthCheck.retryAfterSeconds}s.`,
        status: 429,
        requestId,
        startTime,
        serviceId,
        extraHeaders: {
          'Retry-After': String(failedAuthCheck.retryAfterSeconds),
        },
      });
    }

    // 2. Resolve Public vs Protected Policy (Default Deny)
    const isPublic = Boolean(options.public ?? options.allowPublic ?? false);

    // 3. Authenticate Credential (if present or if protected route)
    const authHeader = req.headers.get('authorization') || req.headers.get('x-api-key');
    let keyRecord: any = undefined;

    if (authHeader) {
      const authResult = await authenticateCredential(req, clientIp);
      if (!authResult.authenticated) {
        return createErrorResponse({
          code: authResult.error?.code || 'UNAUTHORIZED',
          message: authResult.error?.message || 'Authentication failed.',
          status: authResult.error?.status || 401,
          requestId,
          startTime,
          serviceId,
        });
      }
      keyRecord = authResult.keyRecord;
    } else if (!isPublic) {
      return createErrorResponse({
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Provide an API key via Authorization: Bearer or x-api-key header.',
        status: 401,
        requestId,
        startTime,
        serviceId,
      });
    }

    // 4. Authorization & Scope Verification
    const authz = authorizeRequest(options, keyRecord, clientIp);
    if (!authz.authorized) {
      return createErrorResponse({
        code: authz.error?.code || 'FORBIDDEN',
        message: authz.error?.message || 'Forbidden.',
        status: authz.error?.status || 403,
        requestId,
        startTime,
        serviceId,
        details: authz.error?.details,
      });
    }

    // 5. Multi-Tenant Anti-Spoofing & Derivation
    const tenantResult = resolveTenant(req, keyRecord, isPublic);
    if (!tenantResult.valid) {
      return createErrorResponse({
        code: tenantResult.error?.code || 'TENANT_SCOPE_VIOLATION',
        message: tenantResult.error?.message || 'Tenant scope violation.',
        status: tenantResult.error?.status || 403,
        requestId,
        startTime,
        serviceId,
        details: tenantResult.error?.details,
      });
    }

    const tenantId = tenantResult.tenantId;

    // 6. Rate Limiting per credential ID or public client IP
    const rateLimitKey = keyRecord ? `key:${keyRecord.keyId}` : `ip:${clientIp}`;
    const rateLimitPerMin = options.rateLimitPerMin || keyRecord?.rateLimitPerMin || 1000;
    const rateLimitResult = await checkRateLimit(rateLimitKey, rateLimitPerMin);

    if (!rateLimitResult.allowed) {
      const retryAfter = Math.max(1, Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000));
      return createErrorResponse({
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit of ${rateLimitPerMin} requests/minute exceeded.`,
        status: 429,
        requestId,
        startTime,
        tenantId,
        serviceId,
        extraHeaders: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(rateLimitPerMin),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(rateLimitResult.resetAt / 1000)),
        },
      });
    }

    // 7. Context Preparation
    const context: ApiRequestContext = {
      tenantId,
      serviceId,
      apiKeyId: keyRecord?.keyId,
      keyPrefix: keyRecord?.keyPrefix,
      environment: keyRecord?.environment || 'production',
      scopes: authz.effectiveScopes,
      capabilities: keyRecord?.capabilities || authz.effectiveScopes,
      isRoot: Boolean(keyRecord?.isRoot),
      projectId: keyRecord?.projectId,
      environmentId: keyRecord?.environmentId,
      clientIp,
      userAgent,
      requestId,
      startTime,
    };

    // 8. Execute Handler with Fail-Closed Safety & Security Headers
    try {
      const response = await handler(req, context);

      applySecurityHeaders(response.headers, !isPublic);
      response.headers.set('x-request-id', requestId);
      response.headers.set('x-orbitox-tenant', tenantId);

      return response;
    } catch (err: any) {
      // Invariant: Never leak raw error stack or internal system errors
      console.error(`[API ERROR ${requestId}] Uncaught exception in route handler:`, err);
      return createErrorResponse({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected internal server error occurred while processing the request.',
        status: 500,
        requestId,
        startTime,
        tenantId,
        serviceId,
      });
    } finally {
      if (requestTracker) {
        requestTracker.untrack();
      }
    }
  };
}
