import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
    isExplicitPublicRoute,
    isSelfGuardedApiRoute,
    isStaticAsset,
    ALLOWED_PUBLIC_FILES,
    PROTECTED_PAGE_PREFIXES,
    SELF_GUARDED_API_PREFIXES,
} from '@/server/http/route-classification';
import { requiredOperatorRole } from '@/server/organizations/operator-route-policy';
import { isDesignSystemEnabled } from '@/server/http/design-system-gate';
import { middleware } from '@/middleware';
import { NextRequest } from 'next/server';

const packageRoot = path.resolve(__dirname, '../..');
const srcDir = path.join(packageRoot, 'src');
const appDir = path.join(srcDir, 'app');
const publicDir = path.join(packageRoot, 'public');
const apiRoot = path.join(appDir, 'api');

const explicitPublicApiRoutes = new Set([
    'health/route.ts',
    'v1/openapi.json/route.ts',
    'v1/platform/grant-keys/route.ts',
    'v1/billing/webhook/route.ts',
    'v1/billing/webhook/razorpay/route.ts',
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

const approvedWrappers = /withApiGuard|withHospitalGuard|withRestaurantGuard|withCustomerAuth|registerCustomer|verifyCustomerEmail|loginCustomer|requestCustomerPasswordReset|resetCustomerPassword|acceptCustomerInvite|getCustomerSession|withGuestToken|withPublicGuestBootstrap|handleRestaurantPublicRedirect|forwardSignedBridgeCall|verifyBridgeRequest|authorizeApiKey|verifyResendWebhookSignature|operationStore/;

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
        const middleware = fs.readFileSync(path.join(srcDir, 'middleware.ts'), 'utf8');
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
                // Every control-plane method must resolve to an explicit operator role policy.
                const urlPath = `/api/${routePath.replace(/\/route\.ts$/, '')}`;
                if (!isExplicitPublicRoute(urlPath)) {
                    const methods = Array.from(source.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD)\b|export\s+const\s+(GET|POST|PUT|PATCH|DELETE|HEAD)\s*=/g))
                        .map((match) => match[1] || match[2])
                        .filter((method): method is string => Boolean(method));
                    if (methods.length === 0 || methods.some((method) => !requiredOperatorRole(urlPath, method))) {
                        violations.push(`${routePath} (missing explicit operator role policy for an exported method)`);
                    }
                }
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
                !source.includes('withPublicGuestBootstrap') &&
                !source.includes('handleRestaurantPublicRedirect')
            ) {
                violations.push(`${routePath} (guest bootstrap or redirect wrapper missing)`);
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

            // Diner customer UI pages
            const isDinerUi = urlPath === '/dine' || urlPath.startsWith('/dine/');
            const isOperatorLogin = urlPath === '/platform/login';

            const isClassifiedPublic = isDinerUi || isOperatorLogin;

            if (isClassifiedPublic) {
                // Verify that route classification recognizes sample runtime paths as public
                if (!isExplicitPublicRoute(urlPath)) {
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

    it('enforces that every file in apps/web/public is audited and registered in ALLOWED_PUBLIC_FILES', () => {
        if (!fs.existsSync(publicDir)) return;
        const publicFiles = listFiles(publicDir, '').concat(
            fs.readdirSync(publicDir, { recursive: true, withFileTypes: true })
                .filter((e) => e.isFile())
                .map((e) => path.join(e.parentPath || publicDir, e.name))
        );
        const uniqueFiles = Array.from(new Set(publicFiles));
        const violations: string[] = [];

        for (const file of uniqueFiles) {
            const relPath = '/' + path.relative(publicDir, file).split(path.sep).join('/');
            if (!ALLOWED_PUBLIC_FILES.has(relPath)) {
                violations.push(`${relPath} (file exists in public/ but not registered in ALLOWED_PUBLIC_FILES)`);
            }
        }

        assert.deepEqual(violations, [], `Unregistered public files found: ${violations.join(', ')}`);
    });

    it('prohibits static extension bypass on all dynamic page routes (S3-1 regression test)', async () => {
        // Ensure test environment has admin token set for middleware authentication check
        process.env.ORBITOX_ADMIN_TOKEN = 'test_admin_token_super_secret_32_chars_minimum';
        Reflect.set(process.env, 'NODE_ENV', 'production');

        const pageFiles = listFiles(appDir, 'page.tsx');
        const dynamicProtectedPages: string[] = [];

        for (const file of pageFiles) {
            const relPath = path.relative(appDir, file).split(path.sep).join('/');
            const urlPath = `/${relPath.replace(/(^|\/)page\.tsx$/, '')}`.replace(/\/$/, '') || '/';
            // Only examine protected routes with dynamic bracket parameters
            if (urlPath.includes('[') && !urlPath.startsWith('/dine/')) {
                dynamicProtectedPages.push(urlPath);
            }
        }

        assert.ok(dynamicProtectedPages.length >= 4, 'Must have at least 4 dynamic protected page routes');

        const testExtensions = ['.png', '.svg', '.txt', '.js', '.css', '.map', '.ico'];

        for (const pattern of dynamicProtectedPages) {
            for (const ext of testExtensions) {
                // Replace bracket params with dynamic values ending in the extension
                const testPath = pattern.replace(/\[\w+\]/g, `dummy${ext}`);

                // 1. Must never be classified as static asset
                assert.equal(
                    isStaticAsset(testPath),
                    false,
                    `Dynamic route ${testPath} must NEVER be classified as static asset`
                );

                // 2. Must never be classified as explicit public
                assert.equal(
                    isExplicitPublicRoute(testPath),
                    false,
                    `Dynamic route ${testPath} must NEVER be classified as explicit public`
                );

                // 3. Must be intercepted and sent to operator sign-in without auth
                const req = new NextRequest(`http://127.0.0.1:3000${testPath}`);
                const res = await middleware(req);
                assert.equal(
                    res.status,
                    307,
                    `Unauthenticated request to ${testPath} must redirect to operator sign-in`
                );
                assert.equal(new URL(res.headers.get('location')!).pathname, '/platform/login');
            }
        }
    });

    it('bypasses static files from public and assets correctly without extension guessing (S3-1 fix)', () => {
        assert.equal(isStaticAsset('/_next/static/chunks/app.js'), true);
        assert.equal(isStaticAsset('/_next/image?url=...'), true);
        assert.equal(isStaticAsset('/favicon.ico'), true);
        assert.equal(isStaticAsset('/robots.txt'), true);

        // Files not registered in ALLOWED_PUBLIC_FILES must NOT be treated as static
        assert.equal(isStaticAsset('/brand/logo.svg'), false);
        assert.equal(isStaticAsset('/fonts/inter.woff2'), false);
        assert.equal(isStaticAsset('/images/hero.png'), false);

        // Control plane and plugin dynamic routes must NEVER be treated as static assets
        assert.equal(isStaticAsset('/admin/projects/abc.png'), false);
        assert.equal(isStaticAsset('/hms/labs/1.txt'), false);
        assert.equal(isStaticAsset('/platform/x.map'), false);
        assert.equal(isStaticAsset('/hms/patients/p1.svg'), false);

        // API routes must NEVER be treated as static assets even if named with extension
        assert.equal(isStaticAsset('/api/v1/openapi.json'), false);
        assert.equal(isStaticAsset('/api/health'), false);
    });

    it('prohibits in-memory restaurant runtime and @orbitox/pos in-memory service maps from any API route (Phase 2b-5)', () => {
        const allTsFiles = fs.readdirSync(apiRoot, { recursive: true, withFileTypes: true })
            .filter((e) => e.isFile() && (e.name.endsWith('.ts') || e.name.endsWith('.tsx')))
            .map((e) => path.join(e.parentPath || apiRoot, e.name));

        const forbiddenPatterns = [
            /restaurant-runtime/,
            /from\s+['"]@orbitox(?:-io)?\/pos['"]/,
            /require\(['"]@orbitox(?:-io)?\/pos['"]\)/,
            /RestaurantRuntimeManager/,
        ];

        const violations: string[] = [];

        for (const file of allTsFiles) {
            const relPath = path.relative(apiRoot, file).split(path.sep).join('/');
            const source = fs.readFileSync(file, 'utf8');

            for (const pattern of forbiddenPatterns) {
                if (pattern.test(source)) {
                    violations.push(`${relPath} matches forbidden in-memory pattern ${pattern}`);
                }
            }
        }

        // Also assert that restaurant-runtime.ts does not exist on disk
        const runtimePath = path.join(apiRoot, 'restaurant', '_lib', 'restaurant-runtime.ts');
        assert.equal(fs.existsSync(runtimePath), false, 'restaurant-runtime.ts must not exist on disk');

        assert.deepEqual(violations, [], `Found in-memory restaurant runtime references: ${violations.join(', ')}`);
    });

    it('protects /console/* routes fail-closed and gates /console/design-system in production (F-1 & F-6)', async () => {
        // 1. /console is listed in PROTECTED_PAGE_PREFIXES and is NOT explicit public
        assert.equal(PROTECTED_PAGE_PREFIXES.includes('/console'), true);
        assert.equal(isExplicitPublicRoute('/console'), false);
        assert.equal(isExplicitPublicRoute('/console/design-system'), false);
        assert.equal(requiredOperatorRole('/console/design-system', 'GET'), 'SUPPORT_READONLY');

        // 2. Unauthenticated request to /console/design-system redirects to /platform/login
        const prevToken = process.env.ORBITOX_ADMIN_TOKEN;
        const prevBypass = process.env.ALLOW_UNAUTHENTICATED_DEV_MODE;
        process.env.ORBITOX_ADMIN_TOKEN = 'test_admin_token_0123456789abcdef0123456789';
        delete process.env.ALLOW_UNAUTHENTICATED_DEV_MODE;
        try {
            const req = new NextRequest('http://127.0.0.1:3000/console/design-system');
            const res = await middleware(req);
            assert.equal(res.status, 307);
            assert.equal(new URL(res.headers.get('location')!).pathname, '/platform/login');
        } finally {
            if (prevToken === undefined) delete process.env.ORBITOX_ADMIN_TOKEN;
            else process.env.ORBITOX_ADMIN_TOKEN = prevToken;
            if (prevBypass !== undefined) process.env.ALLOW_UNAUTHENTICATED_DEV_MODE = prevBypass;
        }

        // 3. Environment gate: production returns false -> notFound(); dev & staging return true
        assert.equal(isDesignSystemEnabled({ NODE_ENV: 'production', ORBITOX_ENVIRONMENT: 'production' }), false);
        assert.equal(isDesignSystemEnabled({ NODE_ENV: 'production' }), false);
        assert.equal(isDesignSystemEnabled({ NODE_ENV: 'production', ORBITOX_ENVIRONMENT: 'staging' }), true);
        assert.equal(isDesignSystemEnabled({ NODE_ENV: 'development' }), true);
        assert.equal(isDesignSystemEnabled({ NODE_ENV: 'test' }), true);

        // 4. Font license files are registered as allowed static assets
        assert.equal(isStaticAsset('/fonts/LICENSES/OFL-Inter.txt'), true);
        assert.equal(isStaticAsset('/fonts/LICENSES/OFL-JetBrainsMono.txt'), true);
        assert.equal(isStaticAsset('/fonts/LICENSES/OFL-NotoSansDevanagari.txt'), true);
    });
});
