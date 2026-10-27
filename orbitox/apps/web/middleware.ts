import { NextRequest, NextResponse } from 'next/server';
import {
  extractPresentedCredential,
  safeEqual,
  createInternalAuthToken,
  getAdminToken,
  getRuntimeToken,
} from './app/api/v1/_lib/auth-pipeline';

/**
 * Access control for the OrbitoX control plane. Two credentials, two roles:
 *
 *  ORBITOX_ADMIN_TOKEN    -> "admin": people and tools that manage the platform
 *                            (admin UI, management APIs, issuing commands).
 *  ORBITOX_RUNTIME_TOKEN  -> "runtime": apps connected through the SDK. It only opens
 *                            the narrow set of endpoints a runtime needs (see RUNTIME_RULES),
 *                            so a leaked runtime token can never open the admin UI.
 *
 * Browsers get the native login prompt (HTTP Basic: any username, token as password).
 * API clients send `Authorization: Bearer <token>` or `x-admin-token: <token>`.
 *
 * Missing NODE_ENV is treated as production (fail closed).
 * Development stays open ONLY when explicitly opted in via ALLOW_UNAUTHENTICATED_DEV_MODE=true.
 * The verified role is cryptographically signed and forwarded to route handlers in `x-orbitox-principal`
 * and `x-orbitox-internal-sig` (any client-supplied values are stripped and discarded).
 *
 * Customer microservice APIs (/api/v1/crm, /api/v1/commerce, etc.) and public storefronts
 * are NOT gated by this middleware and are protected fail-closed by withApiGuard using API keys.
 */
export const config = {
  matcher: [
    '/admin/:path*',
    '/platform/:path*',
    '/hms/:path*',
    '/hrms/:path*',
    '/crm/:path*',
    '/finance/:path*',
    '/commerce/:path*',
    '/store/:path*',
    '/api/v1/admin/:path*',
    '/api/v1/platform/:path*',
    '/api/v1/fleet/:path*',
    '/api/v1/overview',
    '/api/v1/overview/:path*',
    '/api/v1/system/:path*',
    '/api/v1/projects/:path*',
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

async function allow(req: NextRequest, principal: Principal, credential?: string | null): Promise<NextResponse> {
  const headers = new Headers(req.headers);
  // Strip any client-supplied internal or principal headers before setting verified ones
  headers.delete('x-orbitox-principal');
  headers.delete('x-orbitox-internal-sig');
  headers.delete('x-orbitox-internal-ts');

  const { signature, timestamp } = await createInternalAuthToken(principal);
  headers.set('x-orbitox-principal', principal);
  headers.set('x-orbitox-internal-sig', signature);
  headers.set('x-orbitox-internal-ts', timestamp);

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

export async function middleware(req: NextRequest) {
  const rawNodeEnv = (process.env.NODE_ENV || '').toLowerCase().trim();
  // Safe default: missing NODE_ENV is treated as production
  const isDevelopment = rawNodeEnv === 'development' || rawEnvIsTest(rawNodeEnv);
  const isProduction = !isDevelopment;
  const allowInsecureDev = isDevelopment && process.env.ALLOW_UNAUTHENTICATED_DEV_MODE === 'true';

  const adminToken = getAdminToken();
  const runtimeToken = getRuntimeToken();
  const endpoint = runtimeEndpoint(req.nextUrl.pathname);

  const presented = extractPresentedCredential(req);
  if (presented) {
    if (adminToken && (await safeEqual(presented, adminToken))) {
      return allow(req, 'admin', presented);
    }
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
    if (!adminToken && !endpoint) {
      return deny(req, 503, 'Control plane is locked: ORBITOX_ADMIN_TOKEN is not configured.');
    }
    if (endpoint && !runtimeToken && !adminToken) {
      return deny(req, 503, 'Control plane is locked: ORBITOX_RUNTIME_TOKEN is not configured.');
    }
  }

  return deny(req, 401, 'Authentication required.');
}

function rawEnvIsTest(env: string): boolean {
  return env === 'test';
}
