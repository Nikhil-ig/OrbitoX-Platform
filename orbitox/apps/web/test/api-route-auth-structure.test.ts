import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

const appRoot = path.resolve(__dirname, '..');
const apiRoot = path.join(appRoot, 'app', 'api');
const explicitPublicRoutes = new Set([
    'health/route.ts',
    'v1/openapi.json/route.ts',
    'restaurant/qr/[locator]/route.ts',
    'restaurant/sessions/join/route.ts',
]);
const middlewareProtectedRoutes = [
    'v1/admin/',
    'v1/platform/',
    'v1/projects/',
    'v1/system/',
    'v1/fleet/',
    'v1/overview/',
    'v1/overview/route.ts',
];
const approvedWrappers = /withApiGuard|withHospitalGuard|withRestaurantGuard|withGuestToken|withPublicGuestBootstrap/;

function listRouteFiles(directory: string): string[] {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) return listRouteFiles(entryPath);
        return entry.name === 'route.ts' ? [entryPath] : [];
    });
}

describe('API route authentication structure', () => {
    it('requires an approved auth wrapper, middleware boundary, or explicit public allowlist for every route', () => {
        const middleware = fs.readFileSync(path.join(appRoot, 'middleware.ts'), 'utf8');
        const routeFiles = listRouteFiles(apiRoot);
        const violations: string[] = [];

        for (const file of routeFiles) {
            const source = fs.readFileSync(file, 'utf8');
            if (approvedWrappers.test(source)) continue;

            const routePath = path.relative(apiRoot, file).split(path.sep).join('/');
            if (
                (routePath === 'restaurant/qr/[locator]/route.ts' || routePath === 'restaurant/sessions/join/route.ts') &&
                !source.includes('withPublicGuestBootstrap')
            ) {
                violations.push(`${routePath} (guest bootstrap wrapper missing)`);
                continue;
            }
            if (explicitPublicRoutes.has(routePath)) continue;

            const coveredPrefix = middlewareProtectedRoutes.find((prefix) => {
                const routePrefix = routePath.replace(/\/route\.ts$/, '/');
                return routePrefix.startsWith(prefix) || routePath.startsWith(prefix);
            });
            if (!coveredPrefix) {
                violations.push(routePath);
                continue;
            }

            const matcherPath = coveredPrefix.replace(/\/$/, '');
            const matcherExists = matcherPath === 'v1/overview'
                ? middleware.includes("'/api/v1/overview'") || middleware.includes("'/api/v1/overview/:path*'")
                : middleware.includes(`'/api/${matcherPath}/:path*'`);
            if (!matcherExists) violations.push(`${routePath} (middleware matcher missing)`);
        }

        assert.deepEqual(violations, [], `Unprotected API route files: ${violations.join(', ')}`);
    });
});
