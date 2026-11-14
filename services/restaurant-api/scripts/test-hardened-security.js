/**
 * 🔒 RESTAURANTOS — SECURITY HARDENING ACCEPTANCE TEST SUITE
 * ─────────────────────────────────────────────────────────
 * Validates:
 * 1. Gated test & debug endpoints:
 *    - /api/test/*, /debug/*, /api/restaurant/test/*, and /api/restaurant/reseed
 *      return HTTP 404 when RESTAURANTOS_ENABLE_TEST_ROUTES is unset.
 *    - Return functional response (not 404) when RESTAURANTOS_ENABLE_TEST_ROUTES=true.
 * 2. CORS Allowlist Policy:
 *    - Strict allowlist replaces wildcard 'Access-Control-Allow-Origin: *'.
 *    - Matches localhost and loopback origins by default.
 *    - Evaluates RESTAURANTOS_ALLOWED_ORIGINS when configured.
 *    - Disallowed origins never receive Access-Control-Allow-Origin header.
 * 3. Token Query String Removal:
 *    - Sensitive authentication credentials in ?token= URL query parameter are ignored/rejected.
 *    - Standard Authorization: Bearer <token> header is required and accepted.
 * 4. Dynamic Hardware Station Secrets:
 *    - Hardcoded stn_sec_* literals replaced with dynamic secrets.
 *    - Stored in .station_secrets.json with secure 0600 permissions.
 */

const http = require('http');
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

let passedTests = 0;
let totalTests = 0;

function pass(code, desc) {
  passedTests++;
  console.log(`  ✅ PASS: [${code}] ${desc}`);
}

function request(baseUrl, p, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(p, baseUrl);
    const bodyStr = options.body ? JSON.stringify(options.body) : null;
    const headers = Object.assign(
      {
        'Content-Type': 'application/json',
      },
      options.headers || {}
    );
    if (bodyStr) {
      headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(raw);
          } catch {
            json = null;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            json,
            raw,
          });
        });
      }
    );

    req.on('error', reject);
    if (bodyStr) {
      req.write(bodyStr);
    }
    req.end();
  });
}

async function waitForServer(baseUrl, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await request(baseUrl, '/healthz/live');
      if (res.status === 200) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Server at ${baseUrl} failed to become healthy within timeout.`);
}

async function runHardeningSuite() {
  console.log('======================================================================');
  console.log('🔒 RESTAURANTOS SECURITY HARDENING VERIFICATION SUITE');
  console.log('======================================================================\n');

  const testPort1 = 4071;
  const baseUrl1 = `http://127.0.0.1:${testPort1}`;
  const tempStore1 = path.join(os.tmpdir(), `store-harden-1-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.json`);
  const dataDir1 = path.dirname(tempStore1);
  const sourceStore = path.join(__dirname, '..', 'data', 'restaurant-runtime-store.json');
  fs.copyFileSync(sourceStore, tempStore1);

  // SECTION 1 & 2: Server running with default settings (RESTAURANTOS_ENABLE_TEST_ROUTES unset)
  console.log('--- TEST GROUP 1: Gated Test Endpoints (Default Disabled) & CORS ---');
  const server1 = spawn('npx', ['tsx', 'src/server.ts'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(testPort1),
      RESTAURANT_STORE_PATH: tempStore1,
      NODE_ENV: 'test',
      RESTAURANTOS_ALLOWED_ORIGINS: 'https://app.orbitox.io,https://partner.orbitox.com',
      // Explicitly unset RESTAURANTOS_ENABLE_TEST_ROUTES
      RESTAURANTOS_ENABLE_TEST_ROUTES: '',
    },
    stdio: 'ignore',
  });

  try {
    await waitForServer(baseUrl1);

    // 1.1: Test routes return 404 when RESTAURANTOS_ENABLE_TEST_ROUTES is unset
    totalTests++;
    const injectRes = await request(baseUrl1, '/api/test/inject-task', {
      method: 'POST',
      body: { taskId: 'task_test_1', title: 'Test Task' },
    });
    assert.strictEqual(injectRes.status, 404, 'Expected 404 for /api/test/inject-task');
    pass('TEST-GATE-1', 'POST /api/test/inject-task returns HTTP 404 when test routes disabled');

    totalTests++;
    const resetRes = await request(baseUrl1, '/api/restaurant/test/reset', {
      method: 'POST',
    });
    assert.strictEqual(resetRes.status, 404, 'Expected 404 for /api/restaurant/test/reset');
    pass('TEST-GATE-2', 'POST /api/restaurant/test/reset returns HTTP 404 when test routes disabled');

    totalTests++;
    const reseedRes = await request(baseUrl1, '/api/restaurant/reseed', {
      method: 'POST',
    });
    assert.strictEqual(reseedRes.status, 404, 'Expected 404 for /api/restaurant/reseed');
    pass('TEST-GATE-3', 'POST /api/restaurant/reseed returns HTTP 404 when test routes disabled');

    totalTests++;
    const debugRes = await request(baseUrl1, '/debug/state', {
      method: 'GET',
    });
    assert.strictEqual(debugRes.status, 404, 'Expected 404 for /debug/state');
    pass('TEST-GATE-4', 'GET /debug/* returns HTTP 404 when test routes disabled');

    // 2.1: CORS policy: allowed origin reflects with Vary: Origin
    totalTests++;
    const corsAllowed = await request(baseUrl1, '/api/restaurant/menu', {
      method: 'GET',
      headers: { Origin: 'https://app.orbitox.io' },
    });
    assert.strictEqual(corsAllowed.headers['access-control-allow-origin'], 'https://app.orbitox.io');
    assert.strictEqual(corsAllowed.headers['vary'], 'Origin');
    pass('CORS-1', 'Permitted origin receives exact Access-Control-Allow-Origin with Vary: Origin');

    // 2.2: CORS policy: unauthorized origin is blocked (no Access-Control-Allow-Origin header)
    totalTests++;
    const corsBlocked = await request(baseUrl1, '/api/restaurant/menu', {
      method: 'GET',
      headers: { Origin: 'https://malicious-attacker.com' },
    });
    assert.strictEqual(corsBlocked.headers['access-control-allow-origin'], undefined, 'Unauthorized origin must not receive allow-origin header');
    pass('CORS-2', 'Unauthorized origin does not receive Access-Control-Allow-Origin header (no wildcard *)');

    // 2.3: CORS Preflight OPTIONS
    totalTests++;
    const preflight = await request(baseUrl1, '/api/restaurant/orders', {
      method: 'OPTIONS',
      headers: { Origin: 'https://app.orbitox.io' },
    });
    assert.strictEqual(preflight.status, 204);
    assert.strictEqual(preflight.headers['access-control-allow-origin'], 'https://app.orbitox.io');
    pass('CORS-3', 'OPTIONS preflight responds with 204 and authorized origin');

    // 3.1: Token Query Parameter ?token= is rejected for authenticated endpoints
    console.log('\n--- TEST GROUP 2: Query String ?token= Removal ---');

    // Issue a legitimate cryptographic staff token first
    const authRes = await request(baseUrl1, '/api/restaurant/auth/staff-token', {
      method: 'POST',
      body: { pin: '8899', branchId: 'branch_ldh' },
    });
    assert.strictEqual(authRes.status, 200);
    const staffToken = authRes.json.data.token;
    assert(staffToken && staffToken.startsWith('orb_stf.'), 'Valid staff token issued');

    // Try authenticating with ?token= query parameter (forbidden on sensitive endpoints)
    totalTests++;
    const queryAuthRes = await request(baseUrl1, `/api/restaurant/menu/items?token=${encodeURIComponent(staffToken)}`, {
      method: 'POST',
      body: { name: 'Unauthorized Item', price: 100 },
    });
    assert.strictEqual(queryAuthRes.status, 401, 'Expected 401 when passing staff token via query string');
    pass('QUERY-TOKEN-1', 'Passing sensitive staff token via ?token= query string is rejected with HTTP 401');

    // Authenticate with standard Authorization: Bearer header (authorized)
    totalTests++;
    const bearerAuthRes = await request(baseUrl1, '/api/restaurant/menu/items', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: {
        id: 'item_test_hardening_' + Date.now(),
        name: 'Hardened Item',
        price: 25000,
        category: 'MAINS',
        station: 'CURRY_LINE',
        branchId: 'branch_ldh',
      },
    });
    assert.strictEqual(bearerAuthRes.status, 201, 'Expected 201 with Authorization: Bearer header');
    pass('QUERY-TOKEN-2', 'Same staff token via Authorization: Bearer header succeeds with HTTP 201');

    // 4.1: Dynamic Station Secrets
    console.log('\n--- TEST GROUP 3: Dynamic Station Secrets ---');
    const defaultSecretsFile = path.join(__dirname, '..', 'data', '.station_secrets.json');
    const localSecretsFile = path.join(dataDir1, '.station_secrets.json');
    const activeSecretsFile = fs.existsSync(localSecretsFile) ? localSecretsFile : defaultSecretsFile;
    assert(fs.existsSync(activeSecretsFile), `.station_secrets.json must exist at ${activeSecretsFile}`);

    // Verify 0600 file permissions
    totalTests++;
    const fileStats = fs.statSync(activeSecretsFile);
    assert.strictEqual(fileStats.mode & 0o777, 0o600, 'Station secrets file must be chmod 0600');
    pass('STATION-1', '.station_secrets.json file created with secure 0600 permissions');

    const secretsMap = JSON.parse(fs.readFileSync(activeSecretsFile, 'utf8'));
    const secretKeys = Object.keys(secretsMap);
    assert(secretKeys.length >= 4, 'Expected at least 4 dynamic station secrets');
    const dynamicStationSecret = secretKeys[0];
    assert(dynamicStationSecret.startsWith('stn_sec_'), 'Dynamic station secret starts with stn_sec_');
    assert.notStrictEqual(dynamicStationSecret, 'stn_sec_tandoor_ldh_99x7', 'Static stn_sec_tandoor_ldh_99x7 must not be the generated secret');

    totalTests++;
    // Test hardware station authorization with the dynamic secret
    const stationReqRes = await request(baseUrl1, '/api/restaurant/kds', {
      method: 'GET',
      headers: { 'x-station-token': dynamicStationSecret },
    });
    assert.strictEqual(stationReqRes.status, 200, 'Dynamic station secret authorizes on KDS route');
    pass('STATION-2', `Dynamic station secret ${dynamicStationSecret.slice(0, 16)}... authorizes on hardware station route`);

  } finally {
    server1.kill();
    try { fs.unlinkSync(tempStore1); } catch {}
  }

  // SECTION 4: Server running with RESTAURANTOS_ENABLE_TEST_ROUTES=true
  console.log('\n--- TEST GROUP 4: Test Routes Gated Behind Flag (Enabled) ---');
  const testPort2 = 4072;
  const baseUrl2 = `http://127.0.0.1:${testPort2}`;
  const tempStore2 = path.join(os.tmpdir(), `store-harden-2-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.json`);
  fs.copyFileSync(sourceStore, tempStore2);

  const server2 = spawn('npx', ['tsx', 'src/server.ts'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(testPort2),
      RESTAURANT_STORE_PATH: tempStore2,
      NODE_ENV: 'test',
      RESTAURANTOS_ENABLE_TEST_ROUTES: 'true',
    },
    stdio: 'ignore',
  });

  try {
    await waitForServer(baseUrl2);

    totalTests++;
    const injectEnabledRes = await request(baseUrl2, '/api/test/inject-task', {
      method: 'POST',
      body: {
        id: 'task_dynamic_test',
        tableNumber: 'T-1',
        title: 'Dynamic Test Dish',
        station: 'TANDOOR',
        status: 'PENDING',
        branchId: 'branch_ldh',
      },
    });
    assert.strictEqual(injectEnabledRes.status, 200, 'Expected 200 for /api/test/inject-task when flag is true');
    assert.strictEqual(injectEnabledRes.json.success, true);
    pass('TEST-GATE-ENABLED-1', 'POST /api/test/inject-task succeeds when RESTAURANTOS_ENABLE_TEST_ROUTES=true');

  } finally {
    server2.kill();
    try { fs.unlinkSync(tempStore2); } catch {}
  }

  console.log('\n======================================================================');
  console.log(`🎉 ALL HARDENING ACCEPTANCE CHECKS PASSED: ${passedTests}/${totalTests}`);
  console.log('======================================================================\n');
}

runHardeningSuite().catch((err) => {
  console.error('\n❌ HARDENING TEST SUITE FAILED:', err);
  process.exit(1);
});
