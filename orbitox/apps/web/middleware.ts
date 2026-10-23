import { NextRequest, NextResponse } from 'next/server';

/**
 * Access control for the OrbitoX control plane. Two credentials, two roles:
 *
 *  ORBITOX_ADMIN_TOKEN    -> "admin":   people and tools that manage the platform
 *                            (admin UI, management APIs, issuing commands).
 *  ORBITOX_RUNTIME_TOKEN  -> "runtime": apps connected through the SDK. It only opens
 *                            the narrow set of endpoints a runtime needs (see RUNTIME_RULES),
 *                            so a leaked runtime token can never open the admin UI.
 *
 * Browsers get the native login prompt (HTTP Basic: any username, token as password).
 * API clients send `Authorization: Bearer <token>`.
 *
 * Production fails closed when a token is missing; development stays open for convenience.
 * The verified role is forwarded to route handlers in `x-orbitox-principal`
 * (any value sent by the client is discarded and replaced).
 *
 * Public, never gated: storefronts / diner pages and GET /api/health.
 */
export const config = {
  matcher: [
    '/admin/:path*',
    '/platform/:path*',
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
  commands: new Set(['GET', 'POST']), // POST is further restricted to COMPLETE in the route
  features: new Set(['GET']),
  manifest: new Set(['GET', 'PUT']),
};

const encoder = new TextEncoder();

/** Constant-time string comparison (hashes first so lengths never leak). */
async function safeEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ]);
  const va = new Uint8Array(ha);
  const vb = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i]! ^ vb[i]!;
  return diff === 0;
}

function extractCredential(req: NextRequest): string | null {
  const header = req.headers.get('authorization');
  if (!header) return null;
  const [scheme, value] = header.split(' ');
  if (!scheme || !value) return null;
  if (scheme.toLowerCase() === 'bearer') return value;
  if (scheme.toLowerCase() === 'basic') {
    try {
      const decoded = atob(value);
      const idx = decoded.indexOf(':');
      return idx === -1 ? decoded : decoded.slice(idx + 1);
    } catch {
      return null;
    }
  }
  return null;
}

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

function allow(req: NextRequest, principal: Principal): NextResponse {
  const headers = new Headers(req.headers);
  headers.set('x-orbitox-principal', principal); // overwrites anything the client sent
  return NextResponse.next({ request: { headers } });
}

/** If this path is a runtime-facing endpoint, returns its name (e.g. "bridge"). */
function runtimeEndpoint(pathname: string): string | null {
  const m = /^\/api\/v1\/projects\/[^/]+\/([a-z]+)\/?$/.exec(pathname);
  return m && m[1] && m[1] in RUNTIME_RULES ? m[1] : null;
}

export async function middleware(req: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production';
  const adminToken = process.env.ORBITOX_ADMIN_TOKEN?.trim();
  const runtimeToken = process.env.ORBITOX_RUNTIME_TOKEN?.trim();
  const endpoint = runtimeEndpoint(req.nextUrl.pathname);

  const presented = extractCredential(req);
  if (presented) {
    if (adminToken && (await safeEqual(presented, adminToken))) return allow(req, 'admin');
    if (endpoint && runtimeToken && (await safeEqual(presented, runtimeToken))) {
      if (RUNTIME_RULES[endpoint]!.has(req.method)) return allow(req, 'runtime');
      return deny(req, 403, `Runtime token cannot ${req.method} /${endpoint}.`);
    }
  }

  // No valid credential. Development convenience: open when the relevant token is not configured.
  if (!isProduction) {
    if (endpoint && !runtimeToken && !adminToken) return allow(req, 'admin');
    if (endpoint && !runtimeToken) return allow(req, 'runtime');
    if (!endpoint && !adminToken) return allow(req, 'admin');
  } else {
    // Production fails closed with a clear reason when the config itself is missing.
    if (!adminToken && !endpoint) return deny(req, 503, 'Control plane is locked: ORBITOX_ADMIN_TOKEN is not configured.');
    if (endpoint && !runtimeToken && !adminToken) {
      return deny(req, 503, 'Control plane is locked: ORBITOX_RUNTIME_TOKEN is not configured.');
    }
  }

  return deny(req, 401, 'Authentication required.');
}
