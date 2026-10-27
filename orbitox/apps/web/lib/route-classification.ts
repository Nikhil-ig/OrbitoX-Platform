/**
 * OrbitoX Control Plane Route Classification & Security Boundaries.
 *
 * Defines the three mutually exclusive access boundaries for all web and API routes:
 * 1. Static Assets: Next.js static bundles and public media files (unrestricted).
 * 2. Explicit Public Routes: Minimal, strictly audited endpoints that require no auth
 *    (/api/health, /api/v1/openapi.json, diner bootstrap, shopper storefronts).
 * 3. Self-Guarded Routes: Customer microservice APIs that enforce their own fail-closed
 *    guards (withApiGuard, withHospitalGuard, withGuestToken).
 * 4. Control Plane Surface: Everything else (admin UI pages, management APIs, fleet, overview).
 *    Protected fail-closed by middleware with ORBITOX_ADMIN_TOKEN or ORBITOX_RUNTIME_TOKEN.
 */

export const STATIC_FILE_EXTENSIONS = /\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|woff|woff2|ttf|eot|map|txt)$/i;

export const SELF_GUARDED_API_PREFIXES: readonly string[] = [
    '/api/hospital/',
    '/api/restaurant/',
    '/api/v1/commerce/',
    '/api/v1/crm/',
    '/api/v1/finance/',
    '/api/v1/hms/',
    '/api/v1/hrms/',
    '/api/v1/inventory/',
    '/api/v1/pos/',
    '/api/v1/restaurant/',
    '/api/v1/school/',
] as const;

export function isNextInternalStatic(pathname: string): boolean {
    return pathname.startsWith('/_next/') || pathname === '/favicon.ico';
}

export function isStaticAsset(pathname: string): boolean {
    if (isNextInternalStatic(pathname)) return true;
    if (pathname.startsWith('/api/')) return false;
    return STATIC_FILE_EXTENSIONS.test(pathname);
}

export function isExplicitPublicRoute(pathname: string): boolean {
    // Exact public control plane diagnostics
    if (pathname === '/api/health' || pathname === '/api/v1/openapi.json') return true;

    // Diner discovery and guest session join bootstrap
    if (/^\/api\/restaurant\/qr\/[^/]+$/.test(pathname)) return true;
    if (pathname === '/api/restaurant/sessions/join') return true;

    // Diner customer-facing UI
    if (pathname === '/dine' || pathname.startsWith('/dine/')) return true;

    // Shopper storefront customer UI (/store/<storeSlug> and subpaths)
    // NOTE: Exact '/store' and '/store/' are demo admin control-plane redirect pages and must remain protected!
    if (/^\/store\/[^/]+(\/.*)?$/.test(pathname)) return true;

    return false;
}

export function isSelfGuardedApiRoute(pathname: string): boolean {
    return SELF_GUARDED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
