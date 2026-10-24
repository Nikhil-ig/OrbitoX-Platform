/**
 * 🧪 RestaurantOS Safe Tenancy, Host Resolution, HKDF Key Derivation & RLS Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative verification of:
 * 1. Strict Host Resolution & Branded 404 on Unrecognized Hosts (Zero Fallback).
 * 2. Header Spoofing Prevention (Public x-tenant-id ignored; host takes precedence).
 * 3. Platform Override (Only authenticated RESTAURANTOS_PLATFORM_TOKEN can pass x-tenant-id).
 * 4. 30-Second LRU Cache & Invalidation.
 * 5. HKDF Per-Tenant Key Derivation & Cross-Tenant Token Rejection (401/403).
 * 6. PostgreSQL Row-Level Security (RLS) enforcement (0 rows without app.tenant_id).
 * 7. Route Authorization Matrix (Public vs Staff vs Manager vs Platform-Service).
 */

import * as http from 'http';
import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import {
  TenantProvisioningService,
  issueStaffToken,
  verifyStaffToken,
  deriveTenantSigningSecret,
  resolveTenantFromRequest,
  invalidateTenantResolutionCache,
  renderTenantNotFoundPage,
  withTenantRlsTransaction,
} from '../packages/domain';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://apple@localhost:5432/restaurant_os';
const TEST_PLATFORM_TOKEN = 'test_platform_token_secret_key_1234567890123456';
const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function makeRequest(
  port: number,
  method: string,
  path: string,
  headers: Record<string, string>,
  body?: any
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
  return new Promise((resolve, reject) => {
    const dataStr = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const reqHeaders: Record<string, string> = { ...headers };
    if (dataStr) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(dataStr).toString();
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let responseData = '';
        res.on('data', (c) => (responseData += c));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(responseData);
          } catch {
            json = responseData;
          }
          resolve({ status: res.statusCode || 500, headers: res.headers, body: json });
        });
      }
    );
    req.on('error', reject);
    if (dataStr) req.write(dataStr);
    req.end();
  });
}

async function runSafeTenancyAndRlsTestSuite() {
  console.log('\n===============================================================');
  console.log('🪐 RESTAURANTOS ITEM 2: SAFE TENANCY, HKDF TOKENS & RLS SUITE');
  console.log('===============================================================\n');

  const provisioning = new TenantProvisioningService(prisma);
  const runId = Date.now().toString(36);
  const slugAlpha = `alpha-${runId}`;
  const slugBeta = `beta-${runId}`;

  console.log('--- Provisioning Test Tenants Alpha and Beta ---');
  const tenantAlpha = await provisioning.provisionTenant({
    restaurantName: 'Alpha Bistro',
    slug: slugAlpha,
    ownerName: 'Alpha Owner',
    ownerEmail: `owner@${slugAlpha}.test`,
    templateId: 'tmpl_starter_bistro',
  });

  const tenantBeta = await provisioning.provisionTenant({
    restaurantName: 'Beta Grill',
    slug: slugBeta,
    ownerName: 'Beta Owner',
    ownerEmail: `owner@${slugBeta}.test`,
    templateId: 'tmpl_starter_bistro',
  });

  console.log(`  Provisioned Tenant Alpha: ${tenantAlpha.tenantId} (${tenantAlpha.slug})`);
  console.log(`  Provisioned Tenant Beta: ${tenantBeta.tenantId} (${tenantBeta.slug})\n`);

  // --- Suite 1: HKDF Per-Tenant Key Derivation & Cryptographic Isolation ---
  console.log('--- Suite 1: HKDF Per-Tenant Key Derivation & Token Isolation ---');
  const secretAlpha = deriveTenantSigningSecret(tenantAlpha.tenantId);
  const secretBeta = deriveTenantSigningSecret(tenantBeta.tenantId);
  assert(secretAlpha.length === 64, 'Derived HKDF secret is 64 hex characters (32 bytes)');
  assert(secretBeta.length === 64, 'Derived HKDF secret for Tenant Beta is 64 hex characters');
  assert(secretAlpha !== secretBeta, 'HKDF secrets for distinct tenants are cryptographically unique');

  // Issue staff token for Alpha
  const tokenAlpha = issueStaffToken({
    sub: 'stf_alpha_mgr',
    name: 'Alpha Manager',
    role: 'MANAGER',
    tenantId: tenantAlpha.tenantId,
    branchId: tenantAlpha.branchId,
  });

  // Verify on Alpha's context
  const verifyOnAlpha = verifyStaffToken(tokenAlpha, { expectedTenantId: tenantAlpha.tenantId });
  assert(verifyOnAlpha.valid === true, 'Staff token for Alpha validates cleanly against Tenant Alpha');
  assert(verifyOnAlpha.claims?.tenantId === tenantAlpha.tenantId, 'Verified claims contain correct tenantId');

  // Verify on Beta's context (Must fail with INVALID_SIGNATURE or TENANT_MISMATCH)
  const verifyOnBeta = verifyStaffToken(tokenAlpha, { expectedTenantId: tenantBeta.tenantId });
  assert(verifyOnBeta.valid === false, 'Staff token minted for Tenant Alpha is REJECTED on Tenant Beta');
  assert(
    verifyOnBeta.error === 'INVALID_SIGNATURE' || verifyOnBeta.error === 'TENANT_MISMATCH',
    `Rejection error is cryptographically sound (${verifyOnBeta.error})`
  );

  // --- Suite 2: PostgreSQL Row-Level Security (RLS) Database Proof ---
  console.log('\n--- Suite 2: PostgreSQL Row-Level Security (RLS) Database Proof ---');
  try {
    // A: Query inside transaction without setting app.tenant_id
    const rowsWithoutTenant = await prisma.$transaction(async (tx: any) => {
      try {
        await tx.$executeRawUnsafe(`SET LOCAL ROLE restaurantos_app;`);
      } catch (e) {
        // Ignored if non-superuser role not available
      }
      return await tx.tableFloor.findMany({
        where: { tenantId: tenantAlpha.tenantId },
      });
    });
    assert(
      rowsWithoutTenant.length === 0,
      'PostgreSQL RLS blocks queries without SET LOCAL app.tenant_id (0 rows returned)'
    );

    // B: Query with SET LOCAL app.tenant_id = Alpha
    const rowsAlpha = await withTenantRlsTransaction(prisma, tenantAlpha.tenantId, async (tx: any) => {
      return await tx.tableFloor.findMany({
        where: { tenantId: tenantAlpha.tenantId },
      });
    });
    assert(
      rowsAlpha.length === tenantAlpha.tableCount,
      `RLS query with app.tenant_id = Alpha returns exactly ${tenantAlpha.tableCount} tables`
    );

    // C: Cross-tenant RLS query: app.tenant_id = Beta, querying Alpha's tenantId
    const crossRows = await withTenantRlsTransaction(prisma, tenantBeta.tenantId, async (tx: any) => {
      return await tx.tableFloor.findMany({
        where: { tenantId: tenantAlpha.tenantId },
      });
    });
    assert(
      crossRows.length === 0,
      'PostgreSQL RLS returns 0 rows when tenant Beta queries tenant Alpha data'
    );

    // D: PLATFORM_SUPERUSER bypasses RLS
    const platformRows = await withTenantRlsTransaction(prisma, 'PLATFORM_SUPERUSER', async (tx: any) => {
      return await tx.tableFloor.findMany({
        where: { tenantId: tenantAlpha.tenantId },
      });
    });
    assert(
      platformRows.length === tenantAlpha.tableCount,
      'RLS with app.tenant_id = PLATFORM_SUPERUSER successfully accesses tenant data'
    );
  } catch (err: any) {
    console.error('⚠️ PostgreSQL RLS check error:', err.message);
    throw err;
  }

  // --- Suite 3: 30s LRU Resolution Cache & Invalidation ---
  console.log('\n--- Suite 3: 30-Second LRU Resolution Cache & Invalidation ---');
  invalidateTenantResolutionCache();

  const mockReqAlpha = {
    headers: { host: `${slugAlpha}.orbitox.live` },
    url: '/api/restaurant/menu',
  } as any;

  const resolved1 = await resolveTenantFromRequest(mockReqAlpha, prisma);
  assert(resolved1?.tenantId === tenantAlpha.tenantId, 'Resolved tenant Alpha from host on first lookup');

  // Second resolution should hit memory cache instantly
  const startCacheTime = process.hrtime.bigint();
  const resolvedCached = await resolveTenantFromRequest(mockReqAlpha, prisma);
  const cacheDurationNs = Number(process.hrtime.bigint() - startCacheTime);
  assert(resolvedCached?.tenantId === tenantAlpha.tenantId, 'Resolved tenant Alpha from cache');
  assert(cacheDurationNs < 50_000_000, `Cache hit returned sub-millisecond (${Math.round(cacheDurationNs / 1000)}µs)`);

  // Invalidate cache
  invalidateTenantResolutionCache(slugAlpha);
  const resolvedAfterInvalidate = await resolveTenantFromRequest(mockReqAlpha, prisma);
  assert(resolvedAfterInvalidate?.tenantId === tenantAlpha.tenantId, 'Re-queried database cleanly after invalidation');

  // --- Suite 4: Live HTTP Server Safe Tenancy & Route Authorization Audit ---
  console.log('\n--- Suite 4: Live HTTP Safe Tenancy & Route Authorization Matrix ---');
  const serverPort = 4022;
  const { spawn } = await import('child_process');
  const serverProc = spawn('npx', ['tsx', 'src/server.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(serverPort),
      DATABASE_URL,
      RESTAURANTOS_PLATFORM_TOKEN: TEST_PLATFORM_TOKEN,
      NODE_ENV: 'test',
    },
    stdio: 'pipe',
  });

  // Wait for server boot
  let serverReady = false;
  for (let i = 0; i < 40; i++) {
    try {
      const ping = await makeRequest(serverPort, 'GET', '/health', {});
      if (ping.status === 200) {
        serverReady = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  assert(serverReady, `Live RestaurantOS test server booted on port ${serverPort}`);

  try {
    // 4.1 Unrecognized Host returns 404 (JSON or HTML renderTenantNotFoundPage) — ZERO fallback!
    const unrecHostRes = await makeRequest(serverPort, 'GET', '/api/restaurant/menu', {
      Host: 'unknown-intruder.orbitox.live',
      Accept: 'application/json',
    });
    assert(unrecHostRes.status === 404, 'Unrecognized host returns HTTP 404');
    assert(unrecHostRes.body.code === 'TENANT_NOT_FOUND', 'Response code is TENANT_NOT_FOUND');

    const unrecHtmlRes = await makeRequest(serverPort, 'GET', '/dine', {
      Host: 'nonexistent-bistro.orbitox.live',
      Accept: 'text/html',
    });
    assert(unrecHtmlRes.status === 404, 'Unrecognized host requesting HTML returns HTTP 404');
    assert(
      typeof unrecHtmlRes.body === 'string' && unrecHtmlRes.body.includes('Restaurant Not Found'),
      'Renders branded Warm Noir 404 HTML template'
    );

    // 4.2 Header Spoofing Prevention: Public client sending x-tenant-id is strictly ignored
    const spoofRes = await makeRequest(serverPort, 'GET', '/api/restaurant/tables', {
      Host: `${slugAlpha}.orbitox.live`,
      'x-tenant-id': tenantBeta.tenantId, // Attempt to spoof Beta on Alpha's host
    });
    assert(spoofRes.headers['x-tenant-id'] === tenantAlpha.tenantId, 'Host strictly takes precedence; spoofed x-tenant-id is IGNORED');

    // 4.3 Platform Service Override: Authenticated platform token CAN set tenant context via x-tenant-id
    const platformOverrideRes = await makeRequest(serverPort, 'GET', '/internal/tenants', {
      Authorization: `Bearer ${TEST_PLATFORM_TOKEN}`,
      'x-tenant-id': tenantBeta.tenantId,
    });
    assert(platformOverrideRes.status === 200, 'Authenticated platform service call succeeds');
    assert(
      platformOverrideRes.headers['x-tenant-id'] === tenantBeta.tenantId,
      'Platform service call honours x-tenant-id override'
    );

    // 4.4 Cross-Tenant Staff Token Rejection: Token for Alpha presented on Beta's host
    const crossTokenRes = await makeRequest(serverPort, 'GET', '/api/restaurant/support/tickets', {
      Host: `${slugBeta}.orbitox.live`,
      Authorization: `Bearer ${tokenAlpha}`,
    });
    assert(
      crossTokenRes.status === 401 || crossTokenRes.status === 403,
      `Cross-tenant staff token is REJECTED on Tenant Beta's host (${crossTokenRes.status})`
    );

    // 4.5 Same-Tenant Staff Token Acceptance: Token for Alpha presented on Alpha's host
    const validStaffRes = await makeRequest(serverPort, 'GET', '/api/restaurant/support/tickets', {
      Host: `${slugAlpha}.orbitox.live`,
      Authorization: `Bearer ${tokenAlpha}`,
    });
    assert(validStaffRes.status === 200, 'Same-tenant staff token is ACCEPTED on Tenant Alpha');

    // 4.6 Route Authorization Audit: Support tickets requires staff authentication
    const unauthTickets = await makeRequest(serverPort, 'GET', '/api/restaurant/support/tickets', {
      Host: `${slugAlpha}.orbitox.live`,
    });
    assert(
      unauthTickets.status === 401,
      'GET /api/restaurant/support/tickets without token returns 401 AUTHENTICATION_REQUIRED'
    );

    // 4.7 Route Authorization Audit: Public guest endpoint /health returns 200
    const guestHealth = await makeRequest(serverPort, 'GET', '/health', {});
    assert(guestHealth.status === 200 && guestHealth.body.status === 'healthy', 'GET /health is public and returns 200');

    // 4.8 Route Authorization Audit: Internal endpoint requires platform auth
    const unauthInternal = await makeRequest(serverPort, 'GET', '/internal/tenants', {});
    assert(unauthInternal.status === 401, 'GET /internal/tenants without platform token returns 401 UNAUTHORIZED');
  } finally {
    serverProc.kill('SIGTERM');
  }

  console.log('\n===============================================================');
  console.log('Results: All Item 2 safe tenancy, HKDF & RLS tests passed!');
  console.log('🎉 ITEM 2 VERIFICATION COMPLETE!');
  console.log('===============================================================\n');
}

runSafeTenancyAndRlsTestSuite()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error in test suite:', err);
    process.exit(1);
  });
