/**
 * OrbitoX Control Plane Route Classification & Security Boundaries.
 *
 * Defines the mutually exclusive access boundaries for all web and API routes:
 * 1. Static Assets: Next.js internal static bundles (/_next/) and explicit audited files in public/.
 *    SECURITY: Static bypass is strictly prohibited from using file extension matching, which
 *    would allow requests like /admin/projects/abc.png or /crm/leads/1.txt to bypass authentication.
 * 2. Explicit Public Routes: Minimal, strictly audited endpoints that require no auth
 *    (/api/health, /api/v1/openapi.json, diner bootstrap, shopper storefronts).
 * 3. Self-Guarded Routes: Customer microservice APIs that enforce their own fail-closed
 *    guards (withApiGuard, withHospitalGuard, withGuestToken).
 * 4. Control Plane Surface: Everything else (admin UI pages, management APIs, fleet, overview).
 *    Protected fail-closed by middleware with ORBITOX_ADMIN_TOKEN or ORBITOX_RUNTIME_TOKEN.
 */

/**
 * Exact, audited static files allowed from public/.
 * Any file placed in apps/web/public must be registered here and audited.
 * Dynamic classification tests ensure apps/web/public matches this set exactly.
 */
export const ALLOWED_PUBLIC_FILES: ReadonlySet<string> = new Set([
    '/favicon.ico',
    '/robots.txt',
]);

export const PROTECTED_PAGE_PREFIXES: readonly string[] = [
    '/admin',
    '/platform',
    '/hms',
    '/hrms',
    '/crm',
    '/finance',
    '/commerce',
    '/inventory',
    '/kds',
    '/overview',
    '/fleet',
] as const;

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
    return pathname.startsWith('/_next/');
}

/**
 * Evaluates whether a request is for an authorized static asset.
 * MUST NEVER evaluate by file extension to prevent authentication bypass on dynamic routes.
 */
export function isStaticAsset(pathname: string): boolean {
    if (isNextInternalStatic(pathname)) return true;
    return ALLOWED_PUBLIC_FILES.has(pathname);
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
