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

describe('Hospital Route Structure & Isolation Tests (R1, R3, R4)', () => {
  const appApiDir = path.resolve(__dirname, '../app/api');
  const hospitalRoutesDir = path.join(appApiDir, 'hospital');
  const hmsV1RoutesDir = path.join(appApiDir, 'v1/hms');
  const libDir = path.resolve(__dirname, '../lib');

  const hospitalRouteFiles = findFilesRecursive(hospitalRoutesDir, /^route\.ts$/);
  const hmsV1RouteFiles = findFilesRecursive(hmsV1RoutesDir, /^route\.ts$/);
  const allHmsRouteFiles = [...hospitalRouteFiles, ...hmsV1RouteFiles];

  it('R1: asserts exactly 27 hospital routes and 4 v1/hms routes exist (31 total)', () => {
    assert.equal(
      hospitalRouteFiles.length,
      27,
      `Expected 27 hospital routes, found ${hospitalRouteFiles.length}: ${hospitalRouteFiles.map((f) => path.relative(appApiDir, f)).join(', ')}`
    );
    assert.equal(
      hmsV1RouteFiles.length,
      4,
      `Expected 4 v1/hms routes, found ${hmsV1RouteFiles.length}: ${hmsV1RouteFiles.map((f) => path.relative(appApiDir, f)).join(', ')}`
    );
  });

  it('R1: asserts non-production routes (drill, purge-sanitized) and _init.ts are deleted', () => {
    const drillPath = path.join(hospitalRoutesDir, 'security/drill/route.ts');
    const purgePath = path.join(hospitalRoutesDir, 'security/purge-sanitized/route.ts');
    const initPath = path.join(hospitalRoutesDir, '_init.ts');

    assert.equal(fs.existsSync(drillPath), false, 'security/drill must not exist in production');
    assert.equal(fs.existsSync(purgePath), false, 'security/purge-sanitized must not exist in production');
    assert.equal(fs.existsSync(initPath), false, '_init.ts must not exist');
  });

  it('R1: asserts NO hospital or hms route imports upstream fetch helpers or calls ORBITOX_BACKEND_URL', () => {
    const forbiddenImports = [
      '_init',
      'authenticatedHospitalFetch',
      'ORBITOX_BACKEND_URL',
    ];

    for (const filePath of allHmsRouteFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      const relative = path.relative(appApiDir, filePath);

      for (const forbidden of forbiddenImports) {
        assert.equal(
          content.includes(forbidden),
          false,
          `Forbidden token "${forbidden}" found in ${relative}`
        );
      }

      // Assert no fetch to localhost / upstream
      assert.equal(
        /fetch\s*\(\s*['"`]http/i.test(content),
        false,
        `Direct fetch() call found in ${relative}`
      );
    }
  });

  it('R3: asserts NO route under app/api/hospital or app/api/v1/hms queries prisma outside withTenantTx', () => {
    for (const filePath of allHmsRouteFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      const relative = path.relative(appApiDir, filePath);

      // Check if global prisma is imported
      const importsGlobalPrisma = /import\s+.*\{[^}]*\bprisma\b[^}]*\}\s+from\s+['"]@\/lib\/prisma['"]/.test(content);

      if (importsGlobalPrisma) {
        // If imported, it must ONLY be passed as the first argument to withTenantTx(prisma, ...)
        // Check for any naked calls like `prisma.` not inside `withTenantTx`
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i] || '';
          // Check for naked prisma.<model> (not tx.prisma or client.prisma or withTenantTx(prisma))
          if (/(?<!tx\.|client\.)\bprisma\.[a-zA-Z]/.test(line)) {
            // Must not use prisma.<model>.findMany/etc. directly
            assert.fail(
              `Direct prisma query found in ${relative}:${i + 1}: "${line.trim()}". All queries must run inside withTenantTx.`
            );
          }
        }
      }

      // All routes performing database operations must use withTenantTx
      assert.ok(
        content.includes('withTenantTx'),
        `Route ${relative} must use withTenantTx for tenant database operations`
      );
    }
  });

  it('R4: asserts NO route or repository code calls .prisma.$executeRawUnsafe, $queryRawUnsafe or set_config', () => {
    const codeFilesToCheck = [
      ...allHmsRouteFiles,
      path.join(libDir, 'hms-repository.ts'),
      path.join(libDir, 'hms-auth.ts'),
      path.join(libDir, 'tenant-db.ts'),
    ];

    const forbiddenCalls = [
      /\.prisma\.\$executeRawUnsafe/i,
      /\.prisma\.\$queryRawUnsafe/i,
      /\$executeRawUnsafe\s*\(\s*['"`][^'"`]*set_config/i,
      /\$queryRawUnsafe\s*\(\s*['"`][^'"`]*set_config/i,
    ];

    for (const filePath of codeFilesToCheck) {
      if (!fs.existsSync(filePath)) continue;
      const content = fs.readFileSync(filePath, 'utf8');
      const relative = path.relative(path.resolve(__dirname, '..'), filePath);

      for (const pattern of forbiddenCalls) {
        // Exception: tenant-db.ts defines the set_config initialization once inside withTenantTx
        if (filePath.endsWith('tenant-db.ts')) continue;

        assert.equal(
          pattern.test(content),
          false,
          `Forbidden raw transaction bypass pattern ${pattern} found in ${relative}`
        );
      }
    }
  });
});
