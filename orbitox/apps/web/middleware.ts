import { NextRequest, NextResponse } from 'next/server';

/**
 * Public Allowlist for OrbitoX Gateway.
 * Edge-safe second line of defense: routes in this set do not require an upfront
 * auth header in the gateway middleware.
 *
 * Full verification and capability checks still occur inside withApiGuard.
 */
const PUBLIC_ALLOWLIST_EXACT = new Set([
  '/api/v1/openapi.json',
  '/api/v1/health',
]);

function isAllowlisted(pathname: string): boolean {
  if (PUBLIC_ALLOWLIST_EXACT.has(pathname)) {
    return true;
  }
  // Allow health/readiness probes (e.g. /api/v1/projects/:id/health)
  if (pathname.endsWith('/health')) {
    return true;
  }
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only guard /api/v1/**
  if (!pathname.startsWith('/api/v1/')) {
    return NextResponse.next();
  }

  // Allow allowlisted public endpoints
  if (isAllowlisted(pathname)) {
    return NextResponse.next();
  }

  // Edge-safe check: Require presence of credential headers
  const authHeader = request.headers.get('authorization');
  const apiKeyHeader = request.headers.get('x-api-key');

  const hasCredential =
    (authHeader && authHeader.trim().length > 0) ||
    (apiKeyHeader && apiKeyHeader.trim().length > 0);

  if (!hasCredential) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Missing Authorization or x-api-key header.',
        },
      },
      {
        status: 401,
        headers: {
          'content-type': 'application/json',
          'x-content-type-options': 'nosniff',
          'referrer-policy': 'no-referrer',
          'cache-control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/v1/:path*'],
};
