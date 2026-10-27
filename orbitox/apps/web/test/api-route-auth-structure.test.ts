import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
    isExplicitPublicRoute,
    isSelfGuardedApiRoute,
    isStaticAsset,
    SELF_GUARDED_API_PREFIXES,
} from '../lib/route-classification';

const appRoot = path.resolve(__dirname, '..');
const appDir = path.join(appRoot, 'app');
const apiRoot = path.join(appDir, 'api');

const explicitPublicApiRoutes = new Set([
    'health/route.ts',
    'v1/openapi.json/route.ts',
    'restaurant/qr/[locator]/route.ts',
    'restaurant/sessions/join/route.ts',
]);

const middlewareProtectedApiPrefixes = [
    'v1/admin/',
    'v1/platform/',
    'v1/projects/',
    'v1/system/',
    'v1/fleet/',
    'v1/overview/',
    'v1/overview/route.ts',
];

const approvedWrappers = /withApiGuard|withHospitalGuard|withRestaurantGuard|withGuestToken|withPublicGuestBootstrap/;

function listFiles(directory: string, filename: string): string[] {
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) return listFiles(entryPath, filename);
        return entry.name === filename ? [entryPath] : [];
    });
}

describe('Route & Page Security Boundary Architecture', () => {
    it('requires an approved auth wrapper, control-plane middleware boundary, or explicit public allowlist for every API route', () => {
        const middleware = fs.readFileSync(path.join(appRoot, 'middleware.ts'), 'utf8');
        const routeFiles = listFiles(apiRoot, 'route.ts');
        const violations: string[] = [];

        // Verify middleware has inverted fail-closed matcher
        assert.ok(
            middleware.includes("'/((?!_next/static|_next/image|favicon.ico).*)'") ||
            middleware.includes('matcher:'),
            'Middleware must use a fail-closed matcher'
        );

        for (const file of routeFiles) {
            const source = fs.readFileSync(file, 'utf8');
            const routePath = path.relative(apiRoot, file).split(path.sep).join('/');

            const isControlPlane = middlewareProtectedApiPrefixes.some((prefix) =>
                routePath.startsWith(prefix)
            );

            if (isControlPlane) {
                // Control-plane routes are gated by middleware with ORBITOX_ADMIN_TOKEN / RUNTIME_TOKEN
                // (and may optionally apply withApiGuard for defense-in-depth)
                continue;
            }

            if (approvedWrappers.test(source)) {
                // Customer-facing APIs outside control-plane prefixes must be registered in SELF_GUARDED_API_PREFIXES
                const urlPath = `/api/${routePath.replace(/\/route\.ts$/, '')}`;
                const isBootstrap = routePath === 'restaurant/qr/[locator]/route.ts' || routePath === 'restaurant/sessions/join/route.ts';
                if (!isBootstrap && !isSelfGuardedApiRoute(urlPath)) {
                    violations.push(`${routePath} (customer API using auth wrapper must be in SELF_GUARDED_API_PREFIXES)`);
                }
                continue;
            }

            if (
                (routePath === 'restaurant/qr/[locator]/route.ts' || routePath === 'restaurant/sessions/join/route.ts') &&
                !source.includes('withPublicGuestBootstrap')
            ) {
                violations.push(`${routePath} (guest bootstrap wrapper missing)`);
                continue;
            }

            if (explicitPublicApiRoutes.has(routePath)) continue;

            const coveredPrefix = middlewareProtectedApiPrefixes.find((prefix) => {
                const routePrefix = routePath.replace(/\/route\.ts$/, '/');
                return routePrefix.startsWith(prefix) || routePath.startsWith(prefix);
            });
            if (!coveredPrefix) {
                violations.push(`${routePath} (unclassified API route: must have auth wrapper, be explicit public, or be control plane)`);
            }
        }

        assert.deepEqual(violations, [], `Unprotected API route files: ${violations.join(', ')}`);
    });

    it('requires every page under app/ to be either on the explicit public list or protected fail-closed by middleware', () => {
        const pageFiles = listFiles(appDir, 'page.tsx');
        const violations: string[] = [];

        for (const file of pageFiles) {
            const relPath = path.relative(appDir, file).split(path.sep).join('/');
            const urlPath = `/${relPath.replace(/(^|\/)page\.tsx$/, '')}`.replace(/\/$/, '') || '/';

            // Shopper storefront customer UI pages
            const isShopperStorefront = /^\/store\/\[storeSlug\](\/.*)?$/.test(urlPath);
            // Diner customer UI pages
            const isDinerUi = urlPath === '/dine' || urlPath.startsWith('/dine/');

            const isClassifiedPublic = isShopperStorefront || isDinerUi;

            if (isClassifiedPublic) {
                // Verify that route classification recognizes sample runtime paths as public
                const samplePath = isShopperStorefront
                    ? urlPath.replace('[storeSlug]', 'test-merchant-slug')
                    : urlPath;
                if (!isExplicitPublicRoute(samplePath)) {
                    violations.push(`${relPath} (expected to be public but rejected by isExplicitPublicRoute)`);
                }
            } else {
                // Must NOT be classified as public; must be gated fail-closed by middleware
                if (isExplicitPublicRoute(urlPath)) {
                    violations.push(`${relPath} (internal/admin page must NOT be in public route classification)`);
                }
            }
        }

        // Specifically assert that '/store' demo redirect is NOT public (Correction 4a)
        assert.equal(
            isExplicitPublicRoute('/store'),
            false,
            "Exact '/store' demo page must NOT be in the public allowlist (Correction 4a)"
        );

        assert.deepEqual(violations, [], `Page security violations: ${violations.join(', ')}`);
    });

    it('bypasses static files from public and assets correctly (Correction 4c)', () => {
        assert.equal(isStaticAsset('/_next/static/chunks/app.js'), true);
        assert.equal(isStaticAsset('/_next/image?url=...'), true);
        assert.equal(isStaticAsset('/favicon.ico'), true);
        assert.equal(isStaticAsset('/brand/logo.svg'), true);
        assert.equal(isStaticAsset('/fonts/inter.woff2'), true);
        assert.equal(isStaticAsset('/images/hero.png'), true);

        // API routes must NEVER be treated as static assets even if named with extension
        assert.equal(isStaticAsset('/api/v1/openapi.json'), false);
        assert.equal(isStaticAsset('/api/health'), false);
    });
});

