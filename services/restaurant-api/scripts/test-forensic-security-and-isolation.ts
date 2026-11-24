import http from 'http';
import assert from 'assert';
import { issueStaffToken } from '../src/shared/security';

const BASE_HOST = 'maxora-resto.localhost';
const PORT = 4010;

function makeRequest(options: {
  method: string;
  path: string;
  host?: string;
  headers?: Record<string, string>;
  body?: any;
}): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any; rawBody: string }> {
  return new Promise((resolve, reject) => {
    const data = options.body ? JSON.stringify(options.body) : undefined;
    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path: options.path,
        method: options.method,
        headers: {
          Host: options.host || BASE_HOST,
          Accept: 'application/json',
          ...(data
            ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
              }
            : {}),
          ...(options.headers || {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          let parsed: any = null;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body: parsed,
            rawBody: raw,
          });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runForensicSecurityTests() {
  console.log('===============================================================');
  console.log('OrbitoX Forensic Security & Tenant Isolation Suite (Rev 1.5.0)');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  // 1. Unknown / Unregistered Tenant Host Rejection
  await test('Negative 1: Unknown host header rejects with 404 TENANT_NOT_FOUND', async () => {
    const res = await makeRequest({
      method: 'GET',
      path: '/api/restaurant/menu/items',
      host: 'non-existent-tenant-9999.localhost',
    });
    assert(
      res.status === 404,
      `Expected status 404, got ${res.status}`
    );
    assert(
      res.body.error === 'TENANT_NOT_FOUND' || res.body.code === 'TENANT_NOT_FOUND',
      `Expected TENANT_NOT_FOUND, got ${JSON.stringify(res.body)}`
    );
  });

  // 2. Unauthenticated Mutation Rejection
  await test('Negative 2: Unauthenticated table deletion rejects with 401', async () => {
    const res = await makeRequest({
      method: 'DELETE',
      path: '/api/restaurant/tables/tbl_nonexistent',
      // No auth header or cookie
    });
    assert(
      res.status === 401,
      `Expected status 401, got ${res.status}`
    );
    assert(
      res.body.code === 'AUTHENTICATION_REQUIRED' || res.body.error === 'AUTHENTICATION_REQUIRED',
      `Expected AUTHENTICATION_REQUIRED, got ${JSON.stringify(res.body)}`
    );
  });

  // 3. Forged / Expired Token Rejection
  await test('Negative 3: Forged JWT token rejects with 401', async () => {
    const res = await makeRequest({
      method: 'DELETE',
      path: '/api/restaurant/tables/tbl_fake_id',
      headers: {
        Authorization: 'Bearer orb_stf.eyJzdWIiOiJoYWNrZXIiLCJyb2xlIjoiT1dORVIifQ.invalidsignature123',
      },
    });
    assert(
      res.status === 401,
      `Expected status 401, got ${res.status}`
    );
  });

  // 4. Removed Dev Test Token Rejection in shell
  await test('Negative 4: orbito_manager_token is rejected', async () => {
    const res = await makeRequest({
      method: 'POST',
      path: '/api/restaurant/tables',
      headers: {
        Authorization: 'Bearer orbito_manager_token',
      },
      body: {
        label: 'T-X',
        capacity: 4,
      },
    });
    assert(
      res.status === 401,
      `Expected status 401 for orbito_manager_token, got ${res.status}`
    );
  });

  // 5. Unauthenticated Staff Directory Access
  await test('Negative 5: Anonymous GET /api/restaurant/staff rejects with 401', async () => {
    const res = await makeRequest({
      method: 'GET',
      path: '/api/restaurant/staff',
    });
    assert(
      res.status === 401,
      `Expected status 401, got ${res.status}`
    );
  });

  // 6. Insufficient Permissions (Floor staff trying to provision staff)
  await test('Negative 6: Non-privileged staff trying to create staff rejects with 403', async () => {
    const res = await makeRequest({
      method: 'POST',
      path: '/api/restaurant/staff',
      headers: {
        Authorization: 'Bearer staff:operations', // has role OPERATIONS (not MANAGER/ADMIN)
      },
      body: {
        name: 'Unauthorized User',
        role: 'SERVER',
        pin: '1234',
      },
    });
    assert(
      res.status === 403,
      `Expected status 403 FORBIDDEN, got ${res.status}`
    );
    assert(
      res.body.code === 'FORBIDDEN' || res.body.error === 'FORBIDDEN',
      `Expected FORBIDDEN, got ${JSON.stringify(res.body)}`
    );
  });

  // 7. Privilege Escalation Prevention (Manager cannot provision ADMIN)
  await test('Negative 7: Manager attempting to provision ADMIN role rejects with 403 PRIVILEGE_ESCALATION', async () => {
    const res = await makeRequest({
      method: 'POST',
      path: '/api/restaurant/staff',
      headers: {
        Authorization: 'Bearer staff:manager', // MANAGER role
      },
      body: {
        name: 'New Admin',
        role: 'ADMIN',
        pin: '1234',
        branchId: 'branch_maxora-resto_main',
      },
    });
    assert(
      res.status === 403,
      `Expected status 403, got ${res.status}`
    );
    assert(
      res.body.code === 'PRIVILEGE_ESCALATION' || res.body.error === 'PRIVILEGE_ESCALATION',
      `Expected PRIVILEGE_ESCALATION, got ${JSON.stringify(res.body)}`
    );
  });

  // 8. Staff PIN Exposure Check
  await test('Security 8: Staff list never returns pinHash or salt', async () => {
    const res = await makeRequest({
      method: 'GET',
      path: '/api/restaurant/staff',
      headers: {
        Authorization: 'Bearer staff:manager',
      },
    });
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    assert(Array.isArray(res.body.data), 'Expected res.body.data to be an array');
    for (const member of res.body.data) {
      assert(
        member.pinHash === undefined,
        `VULNERABILITY DETECTED: pinHash exposed for staff member ${member.id}`
      );
      assert(
        member.salt === undefined,
        `VULNERABILITY DETECTED: salt exposed for staff member ${member.id}`
      );
      assert(
        member.pin === undefined,
        `VULNERABILITY DETECTED: raw pin exposed for staff member ${member.id}`
      );
    }
  });

  // 9. Cross-Tenant Token Isolation
  await test('Security 9: Cross-tenant staff token cannot access or mutate another tenant', async () => {
    // Generate an authentic cryptographically signed token for 'foreign-tenant-uuid'
    const foreignToken = issueStaffToken({
      sub: 'stf_foreign_manager',
      name: 'Foreign Manager',
      role: 'MANAGER',
      tenantId: 'foreign-tenant-uuid',
      branchId: 'branch_foreign',
      expiresInSeconds: 3600,
    });

    // Attempt to access maxora-resto with this foreign tenant token
    const res = await makeRequest({
      method: 'GET',
      path: '/api/restaurant/staff',
      host: 'maxora-resto.localhost',
      headers: {
        Authorization: `Bearer ${foreignToken}`,
      },
    });
    assert(
      res.status === 401,
      `Expected 401 authentication rejection for foreign tenant token, got ${res.status}`
    );
  });

  // 10. Missing Required Input Validation
  await test('Negative 10: Invalid payload on order creation rejects with 400', async () => {
    const res = await makeRequest({
      method: 'POST',
      path: '/api/restaurant/orders',
      body: {
        // Missing items, tableId, etc.
      },
    });
    assert(res.status === 400, `Expected status 400, got ${res.status}`);
  });

  console.log('\n---------------------------------------------------------------');
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log('---------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runForensicSecurityTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
