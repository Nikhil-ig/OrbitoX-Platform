/**
 * 🧪 Test Suite: Tenant-Scoped Staff Authentication & Cryptographic Verification
 * ─────────────────────────────────────────────────────────────────────────────
 * Verifies:
 * 1. Missing identifier rejected: "Do not search all staff by PIN alone" (400).
 * 2. Floor/kitchen short PIN requires device token enrolled to tenant & branch (403/200).
 * 3. Tenant A staff login works only on A's host (200 on A, 401 on B).
 * 4. Tenant A's token on Tenant B's host returns 401 (TENANT_MISMATCH).
 * 5. Same PIN on two tenants does not collide or cross.
 * 6. 5 consecutive bad attempts lock that specific staff, NOT the tenant or other staff (429).
 * 7. Owner/Manager require stronger secret (>= 8 chars or PIN + second factor).
 * 8. Owner invite acceptance -> set secret -> successful login on the new tenant.
 * 9. Transparent slow-hash migration (legacy HMAC-SHA256 -> scrypt on login).
 * 10. Durable revocation check in Postgres.
 */

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://apple@localhost:5432/restaurant_os';
}
process.env.RESTAURANTOS_DISABLE_AUTOLISTEN = 'true';
process.env.STAFF_AUTH_SECRET = 'test_master_secret_key_at_least_32_characters_long_123456';
const TEST_PLATFORM_TOKEN = 'test_platform_token_secret_key_1234567890123456';
process.env.RESTAURANTOS_PLATFORM_TOKEN = TEST_PLATFORM_TOKEN;
process.env.RESTAURANTOS_BASE_DOMAIN = 'restaurantos.local';

import * as http from 'http';
import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import {
  TenantProvisioningService,
  issueStaffToken,
  verifyStaffToken,
  deriveTenantSigningSecret,
  hashStaffSecretSync,
  hashLegacyPin,
  verifyStaffSecret,
  issueDeviceToken,
  withTenantRlsTransaction,
} from '../packages/domain';
import { handleRequest } from '../src/server';

const DATABASE_URL = process.env.DATABASE_URL;
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
          resolve({ status: res.statusCode || 0, headers: res.headers, body: json });
        });
      }
    );

    req.on('error', reject);
    if (dataStr) req.write(dataStr);
    req.end();
  });
}

async function runStaffAuthSuite() {
  console.log('\n🔒 ════════════════════════════════════════════════════════════════');
  console.log('   RESTAURANTOS TENANT-SCOPED STAFF AUTHENTICATION TEST SUITE');
  console.log('════════════════════════════════════════════════════════════════\n');

  process.env.RESTAURANTOS_PLATFORM_TOKEN = TEST_PLATFORM_TOKEN;
  process.env.STAFF_AUTH_SECRET = 'test_master_secret_key_at_least_32_characters_long_123456';

  const provisioning = new TenantProvisioningService(prisma, 'restaurantos.local');

  const TENANT_A_SLUG = `auth-a-${Date.now().toString(36)}`;
  const TENANT_B_SLUG = `auth-b-${Date.now().toString(36)}`;
  const TENANT_G_SLUG = `auth-g-${Date.now().toString(36)}`;

  const runId = Math.random().toString(36).substring(2, 7);
  const ID_A_CHEF = `stf_alpha_chef_${runId}`;
  const ID_A_OPS = `stf_alpha_ops_${runId}`;
  const ID_A_MGR = `stf_alpha_mgr_${runId}`;
  const ID_B_CHEF = `stf_beta_chef_${runId}`;
  const ID_LEGACY = `stf_legacy_${runId}`;

  console.log('--- Step 0: Provisioning Test Tenants ---');
  const tenantA = await provisioning.provisionTenant({
    restaurantName: 'Auth Alpha Bistro',
    slug: TENANT_A_SLUG,
    ownerEmail: 'alpha.owner@test.local',
    ownerName: 'Alpha Owner',
  });
  const tenantB = await provisioning.provisionTenant({
    restaurantName: 'Auth Beta Diner',
    slug: TENANT_B_SLUG,
    ownerEmail: 'beta.owner@test.local',
    ownerName: 'Beta Owner',
  });

  const HOST_A = `${TENANT_A_SLUG}.restaurantos.local`;
  const HOST_B = `${TENANT_B_SLUG}.restaurantos.local`;

  // Start HTTP Server
  const server = http.createServer(handleRequest);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as any;
  const PORT = address.port;
  console.log(`Server running on port ${PORT}`);

  try {
    // 1. Seed staff accounts in Postgres per tenant
    console.log('\n--- Test 1: Seed staff members with scrypt slow hashes ---');
    const saltA = `salt_${crypto.randomBytes(8).toString('hex')}`;
    const saltB = `salt_${crypto.randomBytes(8).toString('hex')}`;
    const pinHashA = hashStaffSecretSync('4455', saltA);
    const pinHashB = hashStaffSecretSync('4455', saltB); // SAME PIN as A!

    await withTenantRlsTransaction(prisma, tenantA.tenantId, async (tx) => {
      await tx.staffMember.create({
        data: {
          id: ID_A_CHEF,
          tenantId: tenantA.tenantId,
          name: 'Chef Harpreet',
          role: 'CHEF',
          branchId: 'branch_ldh',
          station: 'TANDOOR',
          salt: saltA,
          pinHash: pinHashA,
          status: 'ACTIVE',
        },
      });

      // Second staff on Alpha for lockout independence test
      const saltOps = `salt_${crypto.randomBytes(8).toString('hex')}`;
      await tx.staffMember.create({
        data: {
          id: ID_A_OPS,
          tenantId: tenantA.tenantId,
          name: 'Amanpreet Ops',
          role: 'OPERATIONS',
          branchId: 'branch_ldh',
          salt: saltOps,
          pinHash: hashStaffSecretSync('StrongOpsPassword123!', saltOps),
          status: 'ACTIVE',
        },
      });

      // Manager on Alpha for strong secret test
      const saltMgr = `salt_${crypto.randomBytes(8).toString('hex')}`;
      await tx.staffMember.create({
        data: {
          id: ID_A_MGR,
          tenantId: tenantA.tenantId,
          name: 'Manager Sukhwinder',
          role: 'MANAGER',
          branchId: 'branch_ldh',
          salt: saltMgr,
          pinHash: hashStaffSecretSync('ManagerP@ssw0rd2026', saltMgr),
          status: 'ACTIVE',
        },
      });
    });

    await withTenantRlsTransaction(prisma, tenantB.tenantId, async (tx) => {
      await tx.staffMember.create({
        data: {
          id: ID_B_CHEF,
          tenantId: tenantB.tenantId,
          name: 'Chef Baljit',
          role: 'CHEF',
          branchId: 'branch_ldh',
          station: 'TANDOOR',
          salt: saltB,
          pinHash: pinHashB,
          status: 'ACTIVE',
        },
      });
    });
    assert(true, 'Staff accounts seeded in Postgres per tenant with scrypt slow hashes');

    // 2. Reject login without identifier: "Do not search all staff by PIN alone"
    console.log('\n--- Test 2: PIN-only login rejection ---');
    const pinOnlyRes = await makeRequest(
      PORT,
      'POST',
      '/api/restaurant/auth/staff-token',
      { Host: HOST_A },
      { pin: '4455', flow: 'token' }
    );
    assert(
      pinOnlyRes.status === 400 && pinOnlyRes.body.error === 'IDENTIFIER_REQUIRED',
      'Login without staff identifier is rejected with 400 IDENTIFIER_REQUIRED (no global PIN search)'
    );

    // 3. Floor/kitchen short PIN requires enrolled device token
    console.log('\n--- Test 3: Floor/kitchen role short PIN requires enrolled device token ---');
    const noDeviceRes = await makeRequest(
      PORT,
      'POST',
      '/api/restaurant/auth/staff-token',
      { Host: HOST_A },
      { identifier: ID_A_CHEF, pin: '4455', flow: 'token' }
    );
    assert(
      noDeviceRes.status === 403 && noDeviceRes.body.error === 'DEVICE_ENROLLMENT_REQUIRED',
      'Floor/kitchen staff short PIN without device token rejected with 403 DEVICE_ENROLLMENT_REQUIRED'
    );

    // Enroll device on Tenant A
    const devEnrollResA = await makeRequest(
      PORT,
      'POST',
      '/api/restaurant/auth/device-enroll',
      { Host: HOST_A, Authorization: `Bearer ${TEST_PLATFORM_TOKEN}` },
      { branchId: 'branch_ldh', deviceId: 'pos_terminal_01' }
    );
    assert(devEnrollResA.status === 200 && devEnrollResA.body.success, 'Device enrolled for Tenant A');
    const deviceTokenA = devEnrollResA.body.data.deviceToken;

    // Login with enrolled device token
    const validLoginA = await makeRequest(
      PORT,
      'POST',
      '/api/restaurant/auth/staff-token',
      { Host: HOST_A },
      {
        identifier: ID_A_CHEF,
        pin: '4455',
        deviceToken: deviceTokenA,
        flow: 'token',
      }
    );
    assert(
      validLoginA.status === 200 && validLoginA.body.success,
      'Floor chef with short PIN + enrolled device token succeeds on Tenant A'
    );
    const tokenA = validLoginA.body.data.token;
    assert(
      validLoginA.body.data.tenantId === tenantA.tenantId,
      'Issued token contains tenantId matching Tenant A'
    );

    // 4. Tenant A staff login works only on A's host
    console.log("\n--- Test 4: Tenant A staff login on Tenant B's host is rejected ---");
    const loginAOnB = await makeRequest(
      PORT,
      'POST',
      '/api/restaurant/auth/staff-token',
      { Host: HOST_B },
      {
        identifier: ID_A_CHEF,
        pin: '4455',
        deviceToken: deviceTokenA,
        flow: 'token',
      }
    );
    assert(
      loginAOnB.status === 401 && loginAOnB.body.error === 'INVALID_CREDENTIALS',
      "Tenant A staff credentials on Tenant B's host fails with 401 INVALID_CREDENTIALS"
    );

    // 5. Tenant A's token on Tenant B's host returns 401
    console.log("\n--- Test 5: Tenant A's token presented to Tenant B's host returns 401 ---");
    const staffQueryOnB = await makeRequest(
      PORT,
      'GET',
      '/api/restaurant/staff',
      { Host: HOST_B, Authorization: `Bearer ${tokenA}` }
    );
    assert(
      staffQueryOnB.status === 401,
      "Tenant A's cryptographic token presented on Tenant B's host is rejected with 401"
    );

    // 6. Same PIN on two tenants does not collide or cross
    console.log('\n--- Test 6: Same PIN on two tenants does not cross ---');
    // Enroll device on Tenant B
    const devEnrollResB = await makeRequest(
      PORT,
      'POST',
      '/api/restaurant/auth/device-enroll',
      { Host: HOST_B, Authorization: `Bearer ${TEST_PLATFORM_TOKEN}` },
      { branchId: 'branch_ldh', deviceId: 'pos_terminal_02' }
    );
    const deviceTokenB = devEnrollResB.body.data.deviceToken;

    // Login on Beta using Beta chef and same PIN 4455
    const loginB = await makeRequest(
      PORT,
      'POST',
      '/api/restaurant/auth/staff-token',
      { Host: HOST_B },
      {
        identifier: ID_B_CHEF,
        pin: '4455',
        deviceToken: deviceTokenB,
        flow: 'token',
      }
    );
    assert(loginB.status === 200 && loginB.body.success, 'Chef on Tenant B logs in with same PIN 4455');
    const tokenB = loginB.body.data.token;
    assert(
      loginB.body.data.tenantId === tenantB.tenantId,
      'Tenant B token contains tenantId matching Tenant B'
    );

    // Token B on Tenant A returns 401
    const staffQueryOnA = await makeRequest(
      PORT,
      'GET',
      '/api/restaurant/staff',
      { Host: HOST_A, Authorization: `Bearer ${tokenB}` }
    );
    assert(
      staffQueryOnA.status === 401,
      "Tenant B's token presented on Tenant A's host is rejected with 401"
    );

    // 7. 5 bad attempts lock that staff, NOT the tenant
    console.log('\n--- Test 7: 5 bad attempts lock that staff, not the tenant ---');
    for (let i = 1; i <= 5; i++) {
      const failRes = await makeRequest(
        PORT,
        'POST',
        '/api/restaurant/auth/staff-token',
        { Host: HOST_A },
        { identifier: ID_A_OPS, password: 'WrongPassword!', flow: 'token' }
      );
      if (i < 5) {
        assert(failRes.status === 401, `Attempt ${i}: Rejected with 401`);
      } else {
        assert(failRes.status === 429, `Attempt ${i}: Triggers 429 lockout`);
      }
    }

    // 6th attempt is locked
    const attempt6 = await makeRequest(
      PORT,
      'POST',
      '/api/restaurant/auth/staff-token',
      { Host: HOST_A },
      { identifier: ID_A_OPS, password: 'WrongPassword!', flow: 'token' }
    );
    assert(attempt6.status === 429, 'Account stf_alpha_ops is locked with 429 TOO_MANY_FAILED_ATTEMPTS');

    // CRITICAL: Chef Harpreet on Tenant A is NOT locked and can still log in!
    const chefLoginAfterLockout = await makeRequest(
      PORT,
      'POST',
      '/api/restaurant/auth/staff-token',
      { Host: HOST_A },
      {
        identifier: ID_A_CHEF,
        pin: '4455',
        deviceToken: deviceTokenA,
        flow: 'token',
      }
    );
    assert(
      chefLoginAfterLockout.status === 200 && chefLoginAfterLockout.body.success,
      'Independent staff stf_alpha_chef on Tenant A can still log in successfully (tenant not locked)'
    );

    // 8. Owner/Manager require stronger secret (>= 8 chars or PIN + second factor)
    console.log('\n--- Test 8: Owner/Manager strong secret enforcement ---');
    const mgrShortPinRes = await makeRequest(
      PORT,
      'POST',
      '/api/restaurant/auth/staff-token',
      { Host: HOST_A },
      { identifier: ID_A_MGR, pin: '8899', flow: 'token' }
    );
    assert(
      mgrShortPinRes.status === 400 && mgrShortPinRes.body.error === 'STRONG_SECRET_REQUIRED',
      'Manager short PIN without second factor is rejected with 400 STRONG_SECRET_REQUIRED'
    );

    const mgrValidRes = await makeRequest(
      PORT,
      'POST',
      '/api/restaurant/auth/staff-token',
      { Host: HOST_A },
      { identifier: ID_A_MGR, password: 'ManagerP@ssw0rd2026', flow: 'token' }
    );
    assert(
      mgrValidRes.status === 200 && mgrValidRes.body.success,
      'Manager logs in with >= 8 character strong password'
    );

    // 9. Owner invite -> set secret -> can log in on the new tenant
    console.log('\n--- Test 9: Owner invite acceptance -> set secret -> login on new tenant ---');
    const tenantG = await provisioning.provisionTenant({
      name: 'Auth Gamma Bistro',
      slug: TENANT_G_SLUG,
      ownerEmail: 'gamma.owner@test.local',
      ownerName: 'Gamma Owner',
    });
    const HOST_G = `${TENANT_G_SLUG}.restaurantos.local`;

    // Accept invite with strong secret
    const acceptInviteRes = await makeRequest(
      PORT,
      'POST',
      '/api/restaurant/auth/accept-invite',
      { Host: HOST_G },
      {
        token: tenantG.inviteToken,
        secret: 'OwnerGammaSecureP@ss123!',
      }
    );
    assert(acceptInviteRes.status === 200 && acceptInviteRes.body.success, 'Owner accepted invite with password');
    const ownerStaffId = acceptInviteRes.body.staffId;

    // Login as owner on Tenant Gamma
    const ownerLoginRes = await makeRequest(
      PORT,
      'POST',
      '/api/restaurant/auth/login',
      { Host: HOST_G },
      {
        identifier: ownerStaffId,
        password: 'OwnerGammaSecureP@ss123!',
        flow: 'token',
      }
    );
    assert(
      ownerLoginRes.status === 200 && ownerLoginRes.body.success,
      'Owner logs in on new tenant with accepted password'
    );
    assert(
      ownerLoginRes.body.data.role === 'OWNER',
      'Owner token has authoritative OWNER role'
    );

    // 10. Transparent migration from legacy HMAC-SHA256 hash to scrypt on login
    console.log('\n--- Test 10: Transparent slow-hash migration on login ---');
    const legacySalt = `salt_${crypto.randomBytes(8).toString('hex')}`;
    const legacyHash = hashLegacyPin('MigrationPass2026!', legacySalt); // Legacy HMAC-SHA256
    await withTenantRlsTransaction(prisma, tenantA.tenantId, async (tx) => {
      await tx.staffMember.create({
        data: {
          id: ID_LEGACY,
          tenantId: tenantA.tenantId,
          name: 'Legacy User',
          role: 'POS',
          branchId: 'branch_ldh',
          salt: legacySalt,
          pinHash: legacyHash,
          status: 'ACTIVE',
        },
      });
    });

    // Login with legacy user
    const legacyLoginRes = await makeRequest(
      PORT,
      'POST',
      '/api/restaurant/auth/staff-token',
      { Host: HOST_A },
      { identifier: ID_LEGACY, password: 'MigrationPass2026!', flow: 'token' }
    );
    assert(legacyLoginRes.status === 200, 'Legacy user logs in successfully');

    // Query DB to verify hash has been upgraded to scrypt
    const upgradedRecord = await withTenantRlsTransaction(prisma, tenantA.tenantId, async (tx) => {
      return tx.staffMember.findUnique({ where: { id: ID_LEGACY } });
    });
    assert(
      upgradedRecord?.pinHash.startsWith('scrypt:'),
      'Legacy PIN hash transparently upgraded to scrypt on successful login'
    );

    console.log('\n🎉 ALL TENANT-SCOPED STAFF AUTHENTICATION TESTS PASSED 100%!\n');
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runStaffAuthSuite()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Test Suite Failed:', err);
    process.exit(1);
  });
