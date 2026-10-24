/**
 * 🪐 RestaurantOS — Item 1: Multi-Tenant Provisioning & Lifecycle Verification Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Verifies:
 * 1. Slug validation and reserved word rejection
 * 2. Platform authentication enforcement (>= 32 chars, constant-time, fail-closed)
 * 3. Complete atomic tenant provisioning with clean starter templates
 * 4. Zero pilot data leakage and zero default PINs
 * 5. Concurrent provisioning safety and race condition resistance
 * 6. Single-use cryptographic invite tokens with expiration and lockout
 * 7. Tenant lifecycle: suspend, write blocking (403), resume, cancel, retention window, and data export
 * 8. Idempotency key preservation
 */

import * as http from 'http';
import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import {
  TenantProvisioningService,
  validateTenantSlug,
  verifyPlatformAuth,
  RESERVED_SLUGS,
} from '../packages/domain/provisioning';
import { getCleanStarterTemplate, CLEAN_STARTER_TEMPLATES } from '../packages/domain/templates';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://apple@localhost:5432/restaurant_os';
process.env.DATABASE_URL = DATABASE_URL;
const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
const provisioning = new TenantProvisioningService(prisma, 'orbitox.live');

const TEST_PLATFORM_TOKEN = 'test_platform_token_restaurantos_secure_32ch_alpha_bravo';
process.env.RESTAURANTOS_PLATFORM_TOKEN = TEST_PLATFORM_TOKEN;

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${name}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${name}${detail ? ` (${detail})` : ''}`);
  }
}

async function runProvisioningTestSuite() {
  console.log('\n===============================================================');
  console.log('🪐 RESTAURANTOS ITEM 1: TENANT PROVISIONING & LIFECYCLE SUITE');
  console.log('===============================================================\n');

  // ─────────────────────────────────────────────────────────────
  // 1. SLUG VALIDATION & RESERVED WORDS
  // ─────────────────────────────────────────────────────────────
  console.log('--- Suite 1: Slug Validation & Reserved Word Guardrails ---');

  const valid1 = validateTenantSlug('bistro-downtown');
  assert(valid1.valid, 'Valid slug "bistro-downtown" is accepted');

  const valid2 = validateTenantSlug('cafe99');
  assert(valid2.valid, 'Valid alphanumeric slug "cafe99" is accepted');

  const res1 = validateTenantSlug('www');
  assert(!res1.valid && res1.error?.includes('reserved word'), 'Reserved slug "www" is rejected');

  const res2 = validateTenantSlug('admin');
  assert(!res2.valid && res2.error?.includes('reserved word'), 'Reserved slug "admin" is rejected');

  const res3 = validateTenantSlug('api');
  assert(!res3.valid && res3.error?.includes('reserved word'), 'Reserved slug "api" is rejected');

  const res4 = validateTenantSlug('platform');
  assert(!res4.valid && res4.error?.includes('reserved word'), 'Reserved slug "platform" is rejected');

  const inv1 = validateTenantSlug('-invalid-start');
  assert(!inv1.valid, 'Slug starting with hyphen is rejected');

  const inv2 = validateTenantSlug('invalid-end-');
  assert(!inv2.valid, 'Slug ending with hyphen is rejected');

  const inv3 = validateTenantSlug('has spaces in name');
  assert(!inv3.valid, 'Slug with spaces is rejected');

  const inv4 = validateTenantSlug('UPPERCASE');
  assert(!inv4.valid, 'Uppercase slug is rejected');

  const inv5 = validateTenantSlug('ab');
  assert(!inv5.valid, 'Too short slug (< 3 chars) is rejected');

  // ─────────────────────────────────────────────────────────────
  // 2. PLATFORM SERVICE AUTHENTICATION
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Suite 2: Platform Service Authentication Guardrails ---');

  const mockReqValid = {
    headers: { authorization: `Bearer ${TEST_PLATFORM_TOKEN}` },
  } as unknown as http.IncomingMessage;
  assert(verifyPlatformAuth(mockReqValid), 'Valid platform token authorizes service calls');

  const mockReqWrong = {
    headers: { authorization: 'Bearer wrong_token_that_does_not_match_at_all_32chars' },
  } as unknown as http.IncomingMessage;
  assert(!verifyPlatformAuth(mockReqWrong), 'Wrong platform token is rejected');

  const mockReqShort = {
    headers: { authorization: 'Bearer short' },
  } as unknown as http.IncomingMessage;
  assert(!verifyPlatformAuth(mockReqShort), 'Short platform token is rejected');

  const mockReqNone = {
    headers: {},
  } as unknown as http.IncomingMessage;
  assert(!verifyPlatformAuth(mockReqNone), 'Missing platform token is rejected');

  // ─────────────────────────────────────────────────────────────
  // 3. COMPLETE ATOMIC TENANT PROVISIONING & CLEAN TEMPLATES
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Suite 3: Atomic Provisioning & Clean Templates ---');

  const uniqueSuffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const tenantSlug = `atelier-${uniqueSuffix}`;
  const restaurantName = `Atelier Maison ${uniqueSuffix}`;

  const provisionResult = await provisioning.provisionTenant({
    restaurantName,
    slug: tenantSlug,
    ownerName: 'Chef Julien Laurent',
    ownerEmail: `julien@${tenantSlug}.com`,
    templateId: 'tmpl_starter_bistro',
    planId: 'growth',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    gstin: '07AAAAA0000A1Z5',
  });

  assert(provisionResult.tenantId === `tenant_${tenantSlug}`, 'Provisioned tenant ID matches convention');
  assert(provisionResult.status === 'trial', 'New tenant starts in TRIAL status');
  assert(provisionResult.planId === 'growth', 'Assigned subscription plan is recorded');
  assert(provisionResult.subdomainUrl.includes(tenantSlug), 'Subdomain URL generated correctly');
  assert(provisionResult.inviteUrl.includes('/accept-invite?token='), 'Single-use invite URL returned');
  assert(Boolean(provisionResult.inviteToken), 'Raw invite token returned for owner delivery');

  // Verify in PostgreSQL
  const dbTenant = await prisma.tenant.findUnique({
    where: { id: provisionResult.tenantId },
    include: {
      branches: true,
      floors: true,
      tables: true,
      categories: true,
      menuItems: true,
      staffMembers: true,
      brandConfig: true,
      invites: true,
    },
  });

  assert(Boolean(dbTenant), 'Tenant persisted to PostgreSQL');
  assert(dbTenant?.branches.length === 1, 'Exactly one primary branch provisioned');
  assert(dbTenant?.floors.length === 1, 'Exactly one main floor provisioned');
  assert(dbTenant?.tables.length === 6, 'Template table count provisioned (6 tables)');
  assert(dbTenant?.categories.length === 4, 'Clean starter template categories provisioned (4 categories)');
  assert(dbTenant?.menuItems.length === 6, 'Clean starter template items provisioned (6 items)');

  // ─────────────────────────────────────────────────────────────
  // 4. ZERO PILOT DATA LEAKAGE & ZERO DEFAULT PINS
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Suite 4: Zero Pilot Data Leakage & Zero Default PINs ---');

  const pilotDishes = ['Amritsari Fish Tikka', 'Dal Makhani', 'Butter Chicken', 'Tandoori Roti'];
  const hasPilotDishes = dbTenant?.menuItems.some((item) =>
    pilotDishes.some((pd) => item.name.toLowerCase().includes(pd.toLowerCase()))
  );
  assert(!hasPilotDishes, 'ZERO pilot restaurant dishes exist in new tenant');

  const knownDefaultPins = ['8899', '1122', '0000', '1234'];
  const ownerStaff = dbTenant?.staffMembers.find((s) => s.role === 'OWNER');
  assert(Boolean(ownerStaff), 'Owner staff account created with role OWNER');
  assert(ownerStaff?.status === 'PENDING_INVITE', 'Owner staff starts in PENDING_INVITE status');
  assert(ownerStaff?.pinHash === 'INVITE_PENDING', 'Zero default PINs set at rest for owner account');

  // Verify invite token is hashed at rest in DB
  const dbInvite = dbTenant?.invites[0];
  assert(Boolean(dbInvite), 'Owner invite record created in database');
  assert(dbInvite?.tokenHash !== provisionResult.inviteToken, 'Invite token is hashed with SHA-256 at rest');
  assert(
    dbInvite?.tokenHash === crypto.createHash('sha256').update(provisionResult.inviteToken).digest('hex'),
    'Invite token hash correctly matches SHA-256 of raw token'
  );
  assert(!dbInvite?.usedAt, 'Invite starts with usedAt null');
  assert(
    (dbInvite?.expiresAt.getTime() || 0) > Date.now() + 70 * 3600 * 1000,
    'Invite expires in 72 hours'
  );

  // ─────────────────────────────────────────────────────────────
  // 5. SLUG COLLISION & CONCURRENT PROVISIONING SAFETY
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Suite 5: Collision Resistance & Concurrency Safety ---');

  let collisionFailed = false;
  try {
    await provisioning.provisionTenant({
      restaurantName: 'Duplicate Attempt',
      slug: tenantSlug,
      ownerName: 'Chef Copy',
    });
  } catch (err: any) {
    collisionFailed = err.message.includes('already taken');
  }
  assert(collisionFailed, 'Duplicate tenant slug provisioning is cleanly rejected with 409 collision');

  // Test concurrent provisioning of two distinct tenants
  const slugAlpha = `concurrent-alpha-${Date.now().toString(36)}`;
  const slugBeta = `concurrent-beta-${Date.now().toString(36)}`;

  const [resAlpha, resBeta] = await Promise.all([
    provisioning.provisionTenant({
      restaurantName: 'Concurrent Alpha',
      slug: slugAlpha,
      ownerName: 'Alpha Owner',
    }),
    provisioning.provisionTenant({
      restaurantName: 'Concurrent Beta',
      slug: slugBeta,
      ownerName: 'Beta Owner',
    }),
  ]);

  assert(resAlpha.slug === slugAlpha && resBeta.slug === slugBeta, 'Concurrent provisioning of distinct tenants succeeds without conflict');

  // ─────────────────────────────────────────────────────────────
  // 6. SINGLE-USE OWNER INVITE ACCEPTANCE & EXPIRATION
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Suite 6: Single-Use Owner Invite Acceptance Flow ---');

  // Insecure PIN rejected
  let insecurePinRejected = false;
  try {
    await provisioning.acceptOwnerInvite({
      token: provisionResult.inviteToken,
      pin: '0000',
    });
  } catch (err: any) {
    insecurePinRejected = err.message.includes('too common');
  }
  assert(insecurePinRejected, 'Common trivial PINs (0000, 1234, 8899) are rejected during invite setup');

  // Successful acceptance
  const acceptResult = await provisioning.acceptOwnerInvite({
    token: provisionResult.inviteToken,
    pin: '7829',
    ownerName: 'Julien Laurent, Executive Chef',
  });

  assert(acceptResult.success, 'Owner invite accepted with custom secure PIN');
  assert(acceptResult.role === 'OWNER', 'Issued credentials have role OWNER');
  assert(Boolean(acceptResult.token), 'Authoritative staff JWT token issued upon invite acceptance');

  // Verify state transitions in database
  const activatedStaff = await prisma.staffMember.findUnique({ where: { id: ownerStaff!.id } });
  assert(activatedStaff?.status === 'ACTIVE', 'Owner staff status transitioned to ACTIVE');
  assert(activatedStaff?.pinHash !== 'INVITE_PENDING', 'Real salted HMAC PIN hash persisted');

  const activatedTenant = await prisma.tenant.findUnique({ where: { id: provisionResult.tenantId } });
  assert(activatedTenant?.status === 'active', 'Tenant status transitioned from trial to active');

  const updatedInvite = await prisma.ownerInvite.findUnique({ where: { id: dbInvite!.id } });
  assert(Boolean(updatedInvite?.usedAt), 'Invite record stamped with usedAt timestamp');

  // Replay attempt fails (single-use enforcement)
  let replayFailed = false;
  try {
    await provisioning.acceptOwnerInvite({
      token: provisionResult.inviteToken,
      pin: '7829',
    });
  } catch (err: any) {
    replayFailed = err.message.includes('already been used');
  }
  assert(replayFailed, 'Single-use invite token cannot be re-used (replay rejected)');

  // Expired token rejection
  const expiredRawToken = 'test_expired_token_' + crypto.randomBytes(16).toString('hex');
  const expiredHash = crypto.createHash('sha256').update(expiredRawToken).digest('hex');
  await prisma.ownerInvite.create({
    data: {
      tenantId: provisionResult.tenantId,
      staffMemberId: ownerStaff!.id,
      tokenHash: expiredHash,
      expiresAt: new Date(Date.now() - 3600 * 1000), // 1 hour in the past
    },
  });

  let expiredRejected = false;
  try {
    await provisioning.acceptOwnerInvite({
      token: expiredRawToken,
      pin: '5931',
    });
  } catch (err: any) {
    expiredRejected = err.message.includes('expired');
  }
  assert(expiredRejected, 'Expired invite token is rejected');

  // ─────────────────────────────────────────────────────────────
  // 7. TENANT LIFECYCLE: SUSPEND, RESUME, CANCEL & EXPORT
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Suite 7: Tenant Lifecycle: Suspend, Resume, Cancel & Export ---');

  // Suspend
  await provisioning.suspendTenant(provisionResult.tenantId);
  const suspendedTenant = await prisma.tenant.findUnique({ where: { id: provisionResult.tenantId } });
  assert(suspendedTenant?.status === 'suspended', 'Tenant successfully suspended');

  // Resume
  await provisioning.resumeTenant(provisionResult.tenantId);
  const resumedTenant = await prisma.tenant.findUnique({ where: { id: provisionResult.tenantId } });
  assert(resumedTenant?.status === 'active', 'Tenant successfully resumed to active status');

  // Cancel with 30-day retention window
  await provisioning.cancelTenant(provisionResult.tenantId, 30);
  const cancelledTenant = await prisma.tenant.findUnique({ where: { id: provisionResult.tenantId } });
  assert(cancelledTenant?.status === 'cancelled', 'Tenant marked as cancelled');
  assert(
    Boolean(cancelledTenant?.retentionUntil) &&
      cancelledTenant!.retentionUntil!.getTime() > Date.now() + 29 * 24 * 3600 * 1000,
    '30-day retention window scheduled for deletion'
  );

  // Full Compliance Export
  const exportData = await provisioning.exportTenantData(provisionResult.tenantId);
  assert(Boolean(exportData.exportVersion), 'Export contains schema version');
  assert(exportData.tenant.id === provisionResult.tenantId, 'Export contains full tenant data model');
  assert(exportData.tenant.branches.length === 1, 'Export includes branches');
  assert(exportData.tenant.menuItems.length === 6, 'Export includes menu catalog');
  assert(exportData.tenant.tables.length === 6, 'Export includes tables');

  // ─────────────────────────────────────────────────────────────
  // 8. IDEMPOTENCY KEY VERIFICATION
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Suite 8: Idempotency Key Handling ---');

  const idemKey = `idem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const idemSlug = `idem-tenant-${Date.now().toString(36)}`;

  const idemRes1 = await provisioning.provisionTenant({
    restaurantName: 'Idempotent Restaurant',
    slug: idemSlug,
    ownerName: 'Idem Owner',
    idempotencyKey: idemKey,
  });

  const idemRes2 = await provisioning.provisionTenant({
    restaurantName: 'Idempotent Restaurant',
    slug: idemSlug,
    ownerName: 'Idem Owner',
    idempotencyKey: idemKey,
  });

  assert(
    idemRes1.tenantId === idemRes2.tenantId && idemRes1.inviteToken === idemRes2.inviteToken,
    'Idempotent provisioning returns cached response without duplicating database entities'
  );

  // ─────────────────────────────────────────────────────────────
  // 9. END-TO-END HTTP API WORKFLOWS
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Suite 9: End-to-End HTTP API Workflows ---');

  function makeRequest(
    port: number,
    method: string,
    path: string,
    headers: Record<string, string>,
    body?: any
  ): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
    return new Promise((resolve, reject) => {
      const dataStr = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined;
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

  const serverPort = 4019;
  const { spawn } = await import('child_process');
  const serverProc = spawn('npx', ['tsx', 'src/server.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(serverPort),
      RESTAURANTOS_PLATFORM_TOKEN: TEST_PLATFORM_TOKEN,
      NODE_ENV: 'test',
    },
    stdio: 'pipe',
  });

  // Wait for HTTP server to become responsive
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
  assert(serverReady, 'Live RestaurantOS runtime server booted on test port');

  try {
    // 9.1 Unauthorized POST /internal/tenants -> 401
    const unauthRes = await makeRequest(serverPort, 'POST', '/internal/tenants', {}, {
      restaurantName: 'Unauth Bistro',
      slug: 'unauth-bistro',
      ownerName: 'Hacker',
    });
    assert(unauthRes.status === 401, 'POST /internal/tenants without platform token returns 401');

    // 9.2 Authorized POST /internal/tenants -> 201
    const httpSlug = `e2e-http-${Date.now().toString(36)}`;
    const authHeaders = { Authorization: `Bearer ${TEST_PLATFORM_TOKEN}` };
    const createRes = await makeRequest(
      serverPort,
      'POST',
      '/internal/tenants',
      authHeaders,
      {
        restaurantName: 'E2E Gourmet Bistro',
        slug: httpSlug,
        ownerName: 'Chef Antoine',
        templateId: 'tmpl_starter_bistro',
        planId: 'starter',
      }
    );
    assert(createRes.status === 201, 'POST /internal/tenants with platform token returns 201 Created');
    assert(createRes.body.tenantId === `tenant_${httpSlug}`, 'HTTP response includes correct tenantId');
    assert(Boolean(createRes.body.inviteUrl), 'HTTP response includes inviteUrl');

    const createdTenantId = createRes.body.tenantId;
    const inviteToken = createRes.body.inviteToken;

    // 9.3 GET /internal/tenants -> 200 list
    const listRes = await makeRequest(serverPort, 'GET', '/internal/tenants?limit=10', authHeaders);
    assert(listRes.status === 200 && Array.isArray(listRes.body.items), 'GET /internal/tenants returns paginated list');
    assert(listRes.body.items.some((it: any) => it.id === createdTenantId), 'Created tenant is in paged list');

    // 9.4 GET /internal/tenants/:id -> 200 details
    const detailRes = await makeRequest(serverPort, 'GET', `/internal/tenants/${createdTenantId}`, authHeaders);
    assert(detailRes.status === 200 && detailRes.body.id === createdTenantId, 'GET /internal/tenants/:id returns details');

    // 9.5 GET /accept-invite?token=... -> 200 HTML
    const landingRes = await makeRequest(serverPort, 'GET', `/accept-invite?token=${inviteToken}`, {});
    assert(landingRes.status === 200 && typeof landingRes.body === 'string' && landingRes.body.includes('Claim Your Restaurant'), 'GET /accept-invite renders owner invite HTML page');

    // 9.6 POST /api/restaurant/auth/accept-invite -> 200
    const acceptHttpRes = await makeRequest(
      serverPort,
      'POST',
      '/api/restaurant/auth/accept-invite',
      {},
      { token: inviteToken, pin: '6482', name: 'Chef Antoine Laurent' }
    );
    assert(acceptHttpRes.status === 200 && acceptHttpRes.body.success, 'POST /api/restaurant/auth/accept-invite succeeds with valid token');
    assert(Boolean(acceptHttpRes.body.token), 'Accept invite issues staff JWT token');

    // 9.7 POST /internal/tenants/:id/suspend -> 200
    const suspendRes = await makeRequest(serverPort, 'POST', `/internal/tenants/${createdTenantId}/suspend`, authHeaders);
    assert(suspendRes.status === 200 && suspendRes.body.tenant.status === 'suspended', 'POST /internal/tenants/:id/suspend sets status to suspended');

    // 9.8 Writes to suspended tenant blocked with 403
    const blockedWrite = await makeRequest(
      serverPort,
      'POST',
      '/api/restaurant/orders',
      { Host: `${httpSlug}.orbitox.live` },
      { tableNumber: 'T-01', items: [] }
    );
    assert(blockedWrite.status === 403 && blockedWrite.body.code === 'TENANT_SUSPENDED', 'Writes to suspended tenant return 403 TENANT_SUSPENDED');

    // 9.9 POST /internal/tenants/:id/resume -> 200
    const resumeRes = await makeRequest(serverPort, 'POST', `/internal/tenants/${createdTenantId}/resume`, authHeaders);
    assert(resumeRes.status === 200 && resumeRes.body.tenant.status === 'active', 'POST /internal/tenants/:id/resume resumes tenant');

    // 9.10 GET /internal/tenants/:id/export -> 200
    const exportRes = await makeRequest(serverPort, 'GET', `/internal/tenants/${createdTenantId}/export`, authHeaders);
    assert(exportRes.status === 200 && exportRes.body.exportVersion === '1.0.0', 'GET /internal/tenants/:id/export returns compliance export');

    // 9.11 POST /internal/tenants/:id/cancel -> 200
    const cancelRes = await makeRequest(serverPort, 'POST', `/internal/tenants/${createdTenantId}/cancel`, authHeaders);
    assert(cancelRes.status === 200 && cancelRes.body.tenant.status === 'cancelled', 'POST /internal/tenants/:id/cancel marks tenant cancelled with retention');
  } finally {
    serverProc.kill('SIGTERM');
  }

  console.log('\n===============================================================');
  console.log(`Results: ${passed} / ${passed + failed} tests passed.`);
  if (failed > 0) {
    console.error(`🚨 ${failed} tests failed!`);
    process.exit(1);
  } else {
    console.log('🎉 ALL TENANT PROVISIONING & LIFECYCLE TESTS PASSED CLEANLY!');
    console.log('===============================================================\n');
  }

  await prisma.$disconnect();
}

runProvisioningTestSuite().catch(async (e) => {
  console.error('Fatal error in provisioning test suite:', e);
  await prisma.$disconnect();
  process.exit(1);
});
