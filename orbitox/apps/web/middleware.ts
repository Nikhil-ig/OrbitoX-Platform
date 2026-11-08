import { NextRequest, NextResponse } from 'next/server';
import {
  extractPresentedCredential,
  safeEqual,
  createInternalAuthToken,
  getAdminToken,
  getRuntimeToken,
  adminTokenAllowsRequest,
} from './app/api/v1/_lib/auth-pipeline';
import {
  getOperatorSession,
  OPERATOR_SESSION_COOKIE,
} from './lib/phase6-account-service';
import { operatorRoleAllows, requiredOperatorRole, requiresRecentReauthentication } from './lib/operator-route-policy';

import {
  isStaticAsset,
  isExplicitPublicRoute,
  isSelfGuardedApiRoute,
} from './lib/route-classification';
import { applySecurityHeaders } from './lib/security-headers';

/**
 * Access control for the OrbitoX control plane. Two credentials, two roles:
 *
 *  operator session      -> "admin": named people with an explicit role and MFA.
 *  ORBITOX_ADMIN_TOKEN   -> "admin": automation only, limited by method/path scopes.
 *  ORBITOX_RUNTIME_TOKEN  -> "runtime": apps connected through the SDK. It only opens
 *                            the narrow set of endpoints a runtime needs (see RUNTIME_RULES),
 *                            so a leaked runtime token can never open the admin UI.
 *
 * Inverted fail-closed architecture:
 * All incoming routes are intercepted by default except Next.js internals.
 * Routes are evaluated against three clear boundaries:
 * 1. Static assets (images, fonts, bundles) bypass middleware.
 * 2. Explicit public routes (/api/health, /api/v1/openapi.json, diner bootstrap, shopper storefronts) bypass middleware.
 * 3. Self-guarded customer API routes (/api/hospital/*, /api/restaurant/*, /api/v1/{crm,commerce,pos...}/*)
 *    bypass middleware and enforce zero-trust authentication fail-closed inside their own handlers (withApiGuard).
 * 4. Everything else is control plane and MUST present authentic admin or runtime credentials.
 */
export const config = {
  runtime: 'nodejs',
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

export type Principal = 'admin' | 'runtime';

/** What a runtime token may do, per endpoint under /api/v1/projects/{id}/. */
const RUNTIME_RULES: Record<string, ReadonlySet<string>> = {
  bridge: new Set(['GET', 'POST']),
  apis: new Set(['GET', 'POST', 'PUT']),
  commands: new Set(['GET', 'POST']),
  features: new Set(['GET']),
  manifest: new Set(['GET', 'PUT']),
  plans: new Set(['GET']),
  quotes: new Set(['POST']),
  entitlements: new Set(['GET']),
  usage: new Set(['POST']),
};

function deny(req: NextRequest, status: 401 | 403 | 503, message: string): NextResponse {
  const isApi = req.nextUrl.pathname.startsWith('/api/');
  const headers: Record<string, string> = { 'Cache-Control': 'no-store' };
  if (status === 401) headers['WWW-Authenticate'] = 'Basic realm="OrbitoX Control Plane", charset="UTF-8"';
  if (isApi) {
    const code = status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : 'AUTH_NOT_CONFIGURED';
    return NextResponse.json({ success: false, error: { code, message } }, { status, headers });
  }
  return new NextResponse(message, { status, headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' } });
}

async function allow(
  req: NextRequest,
  principal: Principal,
  credential?: string | null,
  operatorId?: string,
): Promise<NextResponse> {
  const headers = new Headers(req.headers);
  // Strip any client-supplied internal or principal headers before setting verified ones
  headers.delete('x-orbitox-principal');
  headers.delete('x-orbitox-internal-sig');
  headers.delete('x-orbitox-internal-ts');
  headers.delete('x-orbitox-operator-id');

  const { signature, timestamp } = await createInternalAuthToken(principal, operatorId);
  headers.set('x-orbitox-principal', principal);
  headers.set('x-orbitox-internal-sig', signature);
  headers.set('x-orbitox-internal-ts', timestamp);
  if (operatorId) headers.set('x-orbitox-operator-id', operatorId);

  if (credential) {
    headers.set('x-orbitox-credential', credential);
  }
  return NextResponse.next({ request: { headers } });
}

/** If this path is a runtime-facing endpoint, returns its name (e.g. "bridge"). */
function runtimeEndpoint(pathname: string): string | null {
  const m = /^\/api\/v1\/projects\/[^/]+\/([a-z]+)(\/.*)?$/.exec(pathname);
  return m && m[1] && m[1] in RUNTIME_RULES ? m[1] : null;
}

async function handleMiddleware(req: NextRequest): Promise<NextResponse> {
  const pathname = req.nextUrl.pathname;

  // 1. Static files bypass middleware
  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  // 2. Explicit public routes bypass middleware
  if (isExplicitPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // 3. Customer API routes authenticate inside their own route guards (withApiGuard / withHospitalGuard / withGuestToken)
  if (isSelfGuardedApiRoute(pathname)) {
    return NextResponse.next();
  }

  const rawNodeEnv = (process.env.NODE_ENV || '').toLowerCase().trim();
  // Safe default: missing NODE_ENV is treated as production
  const isDevelopment = rawNodeEnv === 'development' || rawEnvIsTest(rawNodeEnv);
  const isProduction = !isDevelopment;
  const allowInsecureDev = isDevelopment && process.env.ALLOW_UNAUTHENTICATED_DEV_MODE === 'true';

  const adminToken = getAdminToken();
  const runtimeToken = getRuntimeToken();
  const endpoint = runtimeEndpoint(req.nextUrl.pathname);

  const presented = extractPresentedCredential(req);
  if (presented && adminToken && adminTokenAllowsRequest(req.nextUrl.pathname, req.method)) {
    if (await safeEqual(presented, adminToken)) {
      return allow(req, 'admin', presented);
    }
  }
  if (presented) {
    if (endpoint) {
      const isProjectKey = presented.startsWith('orb_proj_');
      const isSharedToken = Boolean(runtimeToken && (await safeEqual(presented, runtimeToken)));
      if (isProjectKey || isSharedToken) {
        if (RUNTIME_RULES[endpoint]!.has(req.method)) return allow(req, 'runtime', presented);
        return deny(req, 403, `Runtime token cannot ${req.method} /${endpoint}.`);
      }
    }
  }

  // Development convenience ONLY when explicitly opted in via ALLOW_UNAUTHENTICATED_DEV_MODE=true
  if (allowInsecureDev) {
    if (endpoint && !runtimeToken && !adminToken) return allow(req, 'admin');
    if (endpoint && !runtimeToken) return allow(req, 'runtime');
    if (!endpoint && !adminToken) return allow(req, 'admin');
  } else {
    // Production & secure development fail closed with a clear reason when config is missing
    if (endpoint && !runtimeToken && !adminToken) {
      return deny(req, 503, 'Control plane is locked: ORBITOX_RUNTIME_TOKEN is not configured.');
    }
  }

  if (endpoint) return deny(req, 401, 'Authentication required.');

  const rawSession = req.cookies.get(OPERATOR_SESSION_COOKIE)?.value;
  if (!rawSession) {
    if (req.nextUrl.pathname.startsWith('/api/')) return deny(req, 401, 'Operator session required.');
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/platform/login';
    loginUrl.searchParams.set('next', `${req.nextUrl.pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }
  const operator = await getOperatorSession(rawSession);
  if (!operator) {
    if (req.nextUrl.pathname.startsWith('/api/')) return deny(req, 401, 'Operator session required.');
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/platform/login';
    loginUrl.searchParams.set('next', `${req.nextUrl.pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase()) && !sameOrigin(req)) {
    return deny(req, 403, 'A same-origin request is required for operator actions.');
  }

  const requiredRole = requiredOperatorRole(req.nextUrl.pathname, req.method) ?? 'SUPPORT_READONLY';
  if (!operatorRoleAllows(operator.role, requiredRole)) {
    return deny(req, 403, 'Your operator role cannot access this route.');
  }
  if (requiresRecentReauthentication(req.nextUrl.pathname, req.method)) {
    const reauthAt = operator.reauthenticatedAt?.getTime();
    if (!reauthAt || Date.now() - reauthAt > 5 * 60 * 1000) {
      if (req.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json(
          { success: false, error: { code: 'REAUTH_REQUIRED', message: 'Re-authenticate before this sensitive action.' } },
          { status: 403, headers: { 'Cache-Control': 'no-store' } },
        );
      }
      return deny(req, 403, 'Re-authenticate before this sensitive action.');
    }
  }
  return allow(req, 'admin', undefined, operator.operatorId);
}

function rawEnvIsTest(env: string): boolean {
  return env === 'test';
}

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  try {
    const configuredOrigin = process.env.ORBITOX_PUBLIC_BASE_URL?.trim();
    const expectedOrigin = configuredOrigin ? new URL(configuredOrigin).origin : req.nextUrl.origin;
    return new URL(origin).origin === expectedOrigin;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const res = await handleMiddleware(req);
  return applySecurityHeaders(res);
}
