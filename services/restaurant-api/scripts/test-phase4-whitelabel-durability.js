/**
 * Phase 4 Verification Test Suite: Durable Branch-Scoped White-Label Overrides
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates:
 * 1. Authentication & Role checks (401 on Anonymous, 403 on non-privileged)
 * 2. Cross-branch isolation (Ludhiana staff cannot alter Chandigarh brand)
 * 3. Color format validation (reject invalid hex codes with 400)
 * 4. Durable persistence to disk (flushSync verification in runtime store JSON)
 * 5. Clean inheritance (unmodified branches inherit platform defaults)
 * 6. Durability reset via DELETE endpoint
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { startIsolatedServer } = require('./test-harness');

let BASE_URL = process.env.TEST_SERVER_URL;
let STORE_PATH = null;
let harness = null;

function request(options, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.path || '/', BASE_URL);
    const reqOpts = {
      method: options.method || 'GET',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: options.headers || {},
    };

    const req = http.request(reqOpts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, data: json });
      });
    });

    req.on('error', reject);
    if (body) {
      const payload = typeof body === 'string' ? body : JSON.stringify(body);
      req.setHeader('Content-Type', 'application/json');
      req.setHeader('Content-Length', Buffer.byteLength(payload));
      req.write(payload);
    }
    req.end();
  });
}

async function getStaffToken(pin, branchId) {
  const res = await request({
    method: 'POST',
    path: '/api/restaurant/auth/staff-token',
  }, { pin, branchId });
  if (res.status !== 200 || !res.data?.data?.token) {
    throw new Error(`Failed to get staff token: ${JSON.stringify(res.data)}`);
  }
  return res.data.data.token;
}

async function runTests() {
  console.log('🧪 Starting Phase 4 White-Label Durability & Inheritance Test Suite...\n');
  if (!BASE_URL) {
    harness = await startIsolatedServer({ prefix: 'phase4-wl', port: 4086 });
    BASE_URL = harness.url;
    STORE_PATH = harness.storePath;
  } else {
    STORE_PATH = path.resolve(__dirname, '../data/restaurant-runtime-store.json');
  }
  let passed = 0;
  let failed = 0;

  try {

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details ? '— ' + details : ''}`);
      failed++;
    }
  }

  // Tokens
  const tokenAdmin = await getStaffToken('0000', '*');
  const tokenMgrLdh = await getStaffToken('8899', 'branch_ldh');
  const tokenMgrChd = await getStaffToken('9900', 'branch_chd');
  const tokenChefLdh = await getStaffToken('5566', 'branch_ldh');

  // 1. Auth Gate: Anonymous rejected with 401
  const test1 = await request({
    method: 'POST',
    path: '/api/restaurant/branding/branch-overrides',
  }, {
    branchId: 'branch_chd',
    restaurantName: 'Hacked Bistro',
  });
  assert(test1.status === 401, 'Anonymous request rejected with 401');

  // 2. Privilege Gate: Non-privileged Chef rejected with 403
  const test2 = await request({
    method: 'POST',
    path: '/api/restaurant/branding/branch-overrides',
    headers: { Authorization: `Bearer ${tokenChefLdh}` },
  }, {
    branchId: 'branch_ldh',
    restaurantName: 'Chef Special Diner',
  });
  assert(test2.status === 403 && test2.data.code === 'FORBIDDEN', 'Chef role rejected from updating branding with 403 FORBIDDEN');

  // 3. Cross-Branch Isolation: Ludhiana Manager cannot modify Chandigarh branding
  const test3 = await request({
    method: 'POST',
    path: '/api/restaurant/branding/branch-overrides',
    headers: { Authorization: `Bearer ${tokenMgrLdh}` },
  }, {
    branchId: 'branch_chd',
    restaurantName: 'Ludhiana Takeover of Chandigarh',
  });
  assert(test3.status === 403 && test3.data.code === 'BRANCH_MISMATCH', 'Ludhiana manager rejected from altering Chandigarh brand with 403 BRANCH_MISMATCH');

  // 4. Color Validation: Invalid hex rejected with 400
  const test4 = await request({
    method: 'POST',
    path: '/api/restaurant/branding/branch-overrides',
    headers: { Authorization: `Bearer ${tokenMgrChd}` },
  }, {
    branchId: 'branch_chd',
    primaryColor: 'not-a-color',
  });
  assert(test4.status === 400 && test4.data.error === 'INVALID_COLOR', 'Rejects invalid hex color with 400 INVALID_COLOR');

  // 5. Successful Override by Chandigarh Manager
  const test5 = await request({
    method: 'POST',
    path: '/api/restaurant/branding/branch-overrides',
    headers: { Authorization: `Bearer ${tokenMgrChd}` },
  }, {
    branchId: 'branch_chd',
    restaurantName: 'The Chandigarh Grand Heritage',
    tagline: 'Artisan North Indian Dining at Sector 17',
    primaryColor: '#8B4513',
    subdomain: 'chandigarh-heritage',
    phone: '+91 172 270 4421',
  });
  assert(test5.status === 200 && test5.data.success === true, 'Chandigarh manager saves branch override with 200 OK');
  assert(test5.data.override.restaurantName === 'The Chandigarh Grand Heritage', 'Override records branch-specific restaurant name');
  assert(test5.data.override.primaryColor === '#8B4513', 'Override records custom primary color');

  // 6. Query GET /api/restaurant/branding/branch-overrides?branchId=branch_chd
  const test6 = await request({
    method: 'GET',
    path: '/api/restaurant/branding/branch-overrides?branchId=branch_chd',
  });
  assert(test6.status === 200, 'GET /api/restaurant/branding/branch-overrides succeeds');
  assert(test6.data.isOverridden === true, 'Reports isOverridden = true for Chandigarh');
  assert(test6.data.effective.restaurantName === 'The Chandigarh Grand Heritage', 'Effective brand reflects overridden restaurant name');
  assert(test6.data.effective.primaryColor === '#8B4513', 'Effective brand reflects overridden primary color');
  assert(Boolean(test6.data.base.restaurantName), 'Base platform brand is preserved');

  // 7. Clean Inheritance on Unmodified Branch (branch_ldh)
  const test7 = await request({
    method: 'GET',
    path: '/api/restaurant/branding/branch-overrides?branchId=branch_ldh',
  });
  assert(test7.status === 200, 'GET branch-overrides for Ludhiana succeeds');
  assert(test7.data.isOverridden === false, 'Ludhiana reports isOverridden = false');
  assert(test7.data.override === null, 'Ludhiana override is null');
  assert(test7.data.effective.restaurantName === test7.data.base.restaurantName, 'Ludhiana cleanly inherits platform default brand name');

  // 8. Disk Durability Verification
  const storeOnDisk = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
  assert(
    Boolean(storeOnDisk.tenantBrand?.branchOverrides && storeOnDisk.tenantBrand.branchOverrides.branch_chd),
    'Branch override is durably persisted to JSON store on disk'
  );
  assert(
    storeOnDisk.tenantBrand?.branchOverrides?.branch_chd?.restaurantName === 'The Chandigarh Grand Heritage',
    'Persisted disk content matches exact override'
  );

  // 9. Reset Branch Override via DELETE Endpoint
  const test9 = await request({
    method: 'DELETE',
    path: '/api/restaurant/branding/branch-overrides/branch_chd',
    headers: { Authorization: `Bearer ${tokenMgrChd}` },
  });
  assert(test9.status === 200 && test9.data.success === true, 'DELETE branch-overrides succeeds with 200 OK');
  assert(test9.data.override === null, 'Response confirms override reset to null');

  // 10. Verify Post-Reset Clean Inheritance
  const test10 = await request({
    method: 'GET',
    path: '/api/restaurant/branding/branch-overrides?branchId=branch_chd',
  });
  assert(test10.status === 200, 'GET branch-overrides post-reset succeeds');
  assert(test10.data.isOverridden === false, 'Chandigarh isOverridden is now false');
  assert(test10.data.effective.restaurantName === test10.data.base.restaurantName, 'Chandigarh now cleanly inherits base platform brand');

  // Verify disk after reset
  const storeOnDiskAfter = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
  assert(
    !storeOnDiskAfter.tenantBrand?.branchOverrides || !storeOnDiskAfter.tenantBrand.branchOverrides.branch_chd,
    'Disk store confirms removal of branch override after reset'
  );

  console.log(`\n📊 White-Label Durability Test Suite Results: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) {
    process.exit(1);
  }
  } finally {
    if (harness) {
      await harness.stop();
    }
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
