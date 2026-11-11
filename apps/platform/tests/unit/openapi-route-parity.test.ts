import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

function findFilesRecursive(dir: string, pattern: RegExp): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFilesRecursive(fullPath, pattern));
    } else if (entry.isFile() && pattern.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Normalizes a Next.js file path under `app/` to an OpenAPI path pattern:
 * e.g. `app/api/hospital/security/staff/[id]/unlock/route.ts` -> `/api/hospital/security/staff/{id}/unlock`
 */
function nextRouteToOpenApiPath(appDir: string, routeFilePath: string): string {
  const rel = path.relative(appDir, routeFilePath);
  // Remove trailing /route.ts
  const withoutFile = rel.replace(/\/route\.ts$/, '');
  // Normalize Windows slashes if any
  const normalized = withoutFile.replace(/\\/g, '/');
  // Replace [param] with {param} and [...param] with {param}
  const openApiPath = normalized.replace(/\[\.\.\.([^\]]+)\]/g, '{$1}').replace(/\[([^\]]+)\]/g, '{$1}');
  return '/' + openApiPath;
}

/**
 * Extracts exported HTTP methods (GET, POST, PATCH, PUT, DELETE) from route.ts file contents
 */
function extractExportedMethods(fileContent: string): string[] {
  const methods: string[] = [];
  const exportRegex = /export\s+(?:async\s+)?function\s+(GET|POST|PATCH|PUT|DELETE|HEAD|OPTIONS)\b/g;
  let match;
  while ((match = exportRegex.exec(fileContent)) !== null) {
    if (match[1]) {
      methods.push(match[1].toLowerCase());
    }
  }
  return methods;
}

describe('OpenAPI Route Parity & Drift CI Tests (Phase 5 Item 4)', () => {
  // Locate docs/api by ascending
  let repoRoot = path.resolve(__dirname, '../../..');
  if (!fs.existsSync(path.join(repoRoot, 'docs/api')) && !fs.existsSync(path.join(repoRoot, 'docs/openapi'))) {
    repoRoot = path.resolve(__dirname, '../../../..');
  }
  const appDir = path.resolve(__dirname, '../../src/app');
  const appApiDir = path.join(appDir, 'api');
  const docsOpenApiDir = fs.existsSync(path.join(repoRoot, 'docs/api'))
    ? path.join(repoRoot, 'docs/api')
    : path.join(repoRoot, 'docs/openapi');

  const platformSpecPath = path.join(docsOpenApiDir, 'platform-api.json');
  const hospitalSpecPath = path.join(docsOpenApiDir, 'hospital-os-api.json');
  const restaurantSpecPath = path.join(docsOpenApiDir, 'restaurant-os-api.json');

  it('verifies all 3 OpenAPI 3.1.0 specification files exist and are valid JSON', () => {
    assert.ok(fs.existsSync(platformSpecPath), `Missing platform spec: ${platformSpecPath}`);
    assert.ok(fs.existsSync(hospitalSpecPath), `Missing hospital spec: ${hospitalSpecPath}`);
    assert.ok(fs.existsSync(restaurantSpecPath), `Missing restaurant spec: ${restaurantSpecPath}`);

    const platformSpec = JSON.parse(fs.readFileSync(platformSpecPath, 'utf8'));
    const hospitalSpec = JSON.parse(fs.readFileSync(hospitalSpecPath, 'utf8'));
    const restaurantSpec = JSON.parse(fs.readFileSync(restaurantSpecPath, 'utf8'));

    assert.equal(platformSpec.openapi, '3.1.0', 'Platform spec must be OpenAPI 3.1.0');
    assert.equal(hospitalSpec.openapi, '3.1.0', 'Hospital spec must be OpenAPI 3.1.0');
    assert.equal(restaurantSpec.openapi, '3.1.0', 'Restaurant spec must be OpenAPI 3.1.0');

    assert.ok(platformSpec.paths && typeof platformSpec.paths === 'object');
    assert.ok(hospitalSpec.paths && typeof hospitalSpec.paths === 'object');
    assert.ok(restaurantSpec.paths && typeof restaurantSpec.paths === 'object');
  });

  describe('Platform Control Plane API Spec Parity', () => {
    const platformSpec = JSON.parse(fs.readFileSync(platformSpecPath, 'utf8'));
    const specPaths = Object.keys(platformSpec.paths);

    // Identify public tenant & operations Next.js route files
    const tenantsDir = path.join(appApiDir, 'v1', 'tenants');
    const operationsDir = path.join(appApiDir, 'v1', 'operations');
    const tenantFiles = findFilesRecursive(tenantsDir, /^route\.ts$/);
    const operationFiles = findFilesRecursive(operationsDir, /^route\.ts$/);
    const platformRouteFiles = [...tenantFiles, ...operationFiles];

    const codePaths = platformRouteFiles.map((file) => nextRouteToOpenApiPath(appDir, file));

    it('asserts every public platform tenant/operation route is present in platform-api.json', () => {
      for (const codePath of codePaths) {
        assert.ok(
          platformSpec.paths[codePath],
          `Missing platform route in platform-api.json: ${codePath}`
        );
      }
    });

    it('asserts platform-api.json does not list any non-existent platform routes', () => {
      for (const specPath of specPaths) {
        assert.ok(
          codePaths.includes(specPath),
          `Spec lists non-existent platform route: ${specPath}`
        );
      }
    });

    it('asserts exported HTTP methods match spec definitions for platform routes', () => {
      for (const file of platformRouteFiles) {
        const routePath = nextRouteToOpenApiPath(appDir, file);
        const fileContent = fs.readFileSync(file, 'utf8');
        const codeMethods = extractExportedMethods(fileContent);
        const specMethods = Object.keys(platformSpec.paths[routePath] || {});

        for (const m of codeMethods) {
          assert.ok(
            specMethods.includes(m),
            `Route ${routePath} exports ${m.toUpperCase()} in code but missing in platform-api.json`
          );
        }
      }
    });
  });

  describe('HospitalOS API Spec Parity', () => {
    const hospitalSpec = JSON.parse(fs.readFileSync(hospitalSpecPath, 'utf8'));
    const specPaths = Object.keys(hospitalSpec.paths);

    const hospitalDir = path.join(appApiDir, 'hospital');
    const hospitalFiles = findFilesRecursive(hospitalDir, /^route\.ts$/);
    const codePaths = hospitalFiles.map((file) => nextRouteToOpenApiPath(appDir, file));

    it('asserts exactly 28 HospitalOS routes exist in code and in hospital-os-api.json', () => {
      assert.equal(codePaths.length, 28, `Expected 28 HospitalOS routes in code, found ${codePaths.length}`);
      assert.equal(specPaths.length, 28, `Expected 28 HospitalOS routes in spec, found ${specPaths.length}`);
    });

    it('asserts 100% path parity between HospitalOS code routes and hospital-os-api.json', () => {
      for (const codePath of codePaths) {
        assert.ok(
          hospitalSpec.paths[codePath],
          `Missing HospitalOS route in hospital-os-api.json: ${codePath}`
        );
      }
      for (const specPath of specPaths) {
        assert.ok(
          codePaths.includes(specPath),
          `hospital-os-api.json lists route not found in code: ${specPath}`
        );
      }
    });

    it('asserts exported HTTP methods match spec definitions for all 28 HospitalOS routes', () => {
      for (const file of hospitalFiles) {
        const routePath = nextRouteToOpenApiPath(appDir, file);
        const fileContent = fs.readFileSync(file, 'utf8');
        const codeMethods = extractExportedMethods(fileContent);
        const specMethods = Object.keys(hospitalSpec.paths[routePath] || {});

        for (const m of codeMethods) {
          assert.ok(
            specMethods.includes(m),
            `HospitalOS route ${routePath} exports ${m.toUpperCase()} in code but missing in hospital-os-api.json`
          );
        }
      }
    });
  });

  describe('RestaurantOS API Spec Parity', () => {
    const restaurantSpec = JSON.parse(fs.readFileSync(restaurantSpecPath, 'utf8'));
    const specPaths = Object.keys(restaurantSpec.paths);

    const serverFile = path.join(repoRoot, 'projects/external-os/restaurant-os/src/server.ts');

    it('asserts restaurant-os server.ts exists', () => {
      assert.ok(fs.existsSync(serverFile), `Missing restaurant-os server: ${serverFile}`);
    });

    it('asserts every path in restaurant-os-api.json is handled in restaurant-os server.ts', () => {
      const serverContent = fs.readFileSync(serverFile, 'utf8');
      for (const specPath of specPaths) {
        // Strip parameterized segment e.g. /api/restaurant/orders/{id} -> /api/restaurant/orders
        const prefix = specPath.split('/{')[0] || '';
        assert.ok(
          serverContent.includes(prefix),
          `Restaurant route prefix ${prefix} (from ${specPath}) not found in restaurant-os server.ts`
        );
      }
    });
  });
});
