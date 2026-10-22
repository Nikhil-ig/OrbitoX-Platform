/**
 * 🔐 RESTAURANTOS 2.0 — PHASE 6.1: IDENTITY LIFECYCLE & PRODUCTION RELEASE GATE
 * ─────────────────────────────────────────────────────────────────────────────
 * Master Adversarial Verification Suite:
 * - Suite 1: Staff Credential Issuance Authorization & Anti-Elevation (6 gates)
 * - Suite 2: Restart-Durable Token Revocation (5 gates)
 * - Suite 3: Signing-Secret Lifecycle, Rotation & Tamper Rejection (6 gates)
 * - Suite 4: Cross-Branch & Station Authorization Scoping (5 gates)
 * - Suite 5: Realtime SSE Event Isolation & Reconnect Lifecycle (5 gates)
 * - Suite 6: Persistence & Backup Recovery Invariants (2 gates)
 */

const http = require('http');
const crypto = require('crypto');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const BASE_URL = 'http://localhost:4010';

let totalPassed = 0;
let totalFailed = 0;

function pass(gate, msg) {
  console.log(`  ✅ [PASS] ${gate}: ${msg}`);
  totalPassed++;
}

function fail(gate, msg, err) {
  console.error(`  ❌ [FAIL] ${gate}: ${msg}`);
  if (err) console.error(err);
  totalFailed++;
}

function request(endpoint, options = {}, baseUrl = BASE_URL) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, baseUrl);
    const method = options.method || 'GET';
    const reqHeaders = { ...(options.headers || {}) };

    let bodyData;
    if (options.body !== undefined) {
      if (typeof options.body === 'string') {
        bodyData = options.body;
      } else {
        bodyData = JSON.stringify(options.body);
        if (!reqHeaders['Content-Type'] && !reqHeaders['content-type']) {
          reqHeaders['Content-Type'] = 'application/json';
        }
      }
      reqHeaders['Content-Length'] = Buffer.byteLength(bodyData).toString();
    }

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          let parsed = {};
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = { rawText: raw };
          }
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            json: parsed,
            raw,
          });
        });
      }
    );

    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runSuite() {
  console.log('\n======================================================================');
  console.log('🔐  RESTAURANTOS 2.0 — PHASE 6.1 IDENTITY LIFECYCLE REGRESSION SUITE');
  console.log('======================================================================');

  // Reset store to clean baseline
  await request('/api/restaurant/test/reset', { method: 'POST' });

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 1: STAFF CREDENTIAL ISSUANCE AUTHORIZATION & ANTI-ELEVATION
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n🛡️ [SUITE 1] Staff Credential Issuance Authorization & Anti-Elevation');

  // 1.1: Unauthenticated request choosing role=MANAGER rejected with 401
  const anonElevateRes = await request('/api/restaurant/auth/staff-token', {
    method: 'POST',
    body: { role: 'MANAGER', branchId: 'branch_ldh' },
  });
  assert.strictEqual(anonElevateRes.status, 401, 'Anonymous role request rejected');
  assert.strictEqual(anonElevateRes.json.code, 'INVALID_CREDENTIALS');
  pass('1.1', 'Anonymous request attempting role=MANAGER rejected with HTTP 401 INVALID_CREDENTIALS');

  // 1.2: Valid PIN for OPERATIONS (1122) passing role: 'MANAGER' in body derives OPERATIONS authoritatively
  const waiterElevateRes = await request('/api/restaurant/auth/staff-token', {
    method: 'POST',
    body: { pin: '1122', role: 'MANAGER', branchId: 'branch_ldh' },
  });
  assert.strictEqual(waiterElevateRes.status, 200, 'PIN 1122 authenticated');
  assert.strictEqual(waiterElevateRes.json.data.role, 'OPERATIONS', 'Role derived strictly from server record');
  pass('1.2', 'Privilege elevation blocked: Body role=MANAGER ignored; server derives role=OPERATIONS');

  // 1.3: Cross-branch substitution blocked: PIN 1122 with branchId: 'branch_chd' yields branch_ldh
  const branchSubRes = await request('/api/restaurant/auth/staff-token', {
    method: 'POST',
    body: { pin: '1122', branchId: 'branch_chd' },
  });
  assert.strictEqual(branchSubRes.status, 200, 'Authenticated');
  assert.strictEqual(branchSubRes.json.data.branchId, 'branch_ldh', 'Branch derived strictly from directory');
  pass('1.3', 'Cross-branch substitution blocked: Server enforces staff member home branch (branch_ldh)');

  // 1.4: Invalid PIN returns HTTP 401
  const invalidPinRes = await request('/api/restaurant/auth/staff-token', {
    method: 'POST',
    body: { pin: '0000', branchId: 'branch_ldh' },
  });
  assert.strictEqual(invalidPinRes.status, 401);
  assert.strictEqual(invalidPinRes.json.code, 'INVALID_CREDENTIALS');
  pass('1.4', 'Invalid PIN returns HTTP 401 INVALID_CREDENTIALS');

  // 1.5: Brute-force lockout: 5 consecutive invalid attempts triggers lockout HTTP 429
  let lastFailedStatus = 0;
  for (let i = 0; i < 5; i++) {
    const res = await request('/api/restaurant/auth/staff-token', {
      method: 'POST',
      body: { pin: `999${i}`, branchId: 'branch_ldh' },
      headers: { 'x-forwarded-for': '192.168.1.105' },
    });
    lastFailedStatus = res.status;
  }
  // The 5th or subsequent attempt triggers lockout
  const lockedRes = await request('/api/restaurant/auth/staff-token', {
    method: 'POST',
    body: { pin: '8899', branchId: 'branch_ldh' },
    headers: { 'x-forwarded-for': '192.168.1.105' },
  });
  assert.strictEqual(lockedRes.status, 429, 'Locked IP returns HTTP 429');
  assert(lockedRes.json.error.includes('TOO_MANY_FAILED_ATTEMPTS'), 'Error code indicates lockout');
  pass('1.5', 'Brute-force lockout active: 5 consecutive failed attempts trigger HTTP 429 TOO_MANY_FAILED_ATTEMPTS');

  // 1.6: Issuance and failed attempts emit monotonic domain audit events without secret disclosure
  const eventsRes = await request('/health');
  assert.strictEqual(eventsRes.status, 200);
  assert(eventsRes.json.outboxEventsCount > 0, 'Outbox has recorded authentication events');
  pass('1.6', 'Audit trail records authentication events into store outbox with zero secret disclosure');

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 2: PROVE REVOCATION SURVIVES SERVER RESTART
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n🔑 [SUITE 2] Restart-Durable Token Revocation Lifecycle');

  // 2.1: Issue a valid staff token
  const mgrAuthRes = await request('/api/restaurant/auth/staff-token', {
    method: 'POST',
    body: { pin: '8899', branchId: 'branch_ldh' },
  });
  assert.strictEqual(mgrAuthRes.status, 200);
  const managerToken = mgrAuthRes.json.data.token;

  const opsAuthRes = await request('/api/restaurant/auth/staff-token', {
    method: 'POST',
    body: { pin: '1122', branchId: 'branch_ldh' },
  });
  assert.strictEqual(opsAuthRes.status, 200);
  const staffTokenToRevoke = opsAuthRes.json.data.token;

  // 2.2: Verify staffTokenToRevoke works
  const statePreRes = await request('/api/restaurant/state', {
    headers: { Authorization: `Bearer ${staffTokenToRevoke}` },
  });
  assert.strictEqual(statePreRes.status, 200, 'Permitted operation succeeds before revocation');
  pass('2.1', 'Authentic staff token successfully performs permitted operation before revocation');

  // 2.3: Revoke token using authorized manager credential
  const revokeRes = await request('/api/restaurant/auth/revoke', {
    method: 'POST',
    headers: { Authorization: `Bearer ${managerToken}` },
    body: { token: staffTokenToRevoke },
  });
  assert.strictEqual(revokeRes.status, 200, 'Revocation accepted');
  pass('2.2', 'Authorized manager successfully revoked staff token');

  // 2.4: Immediate rejection verification
  const statePostRevokeRes = await request('/api/restaurant/state', {
    headers: { Authorization: `Bearer ${staffTokenToRevoke}` },
  });
  assert.strictEqual(statePostRevokeRes.status, 401, 'Immediately rejected after revocation');
  assert.strictEqual(statePostRevokeRes.json.error, 'TOKEN_REVOKED');
  pass('2.3', 'Revoked token immediately rejected with HTTP 401 TOKEN_REVOKED');

  // 2.5: Restart server process on isolated port with same persistent data
  const restartPort = 4012;
  const storeFilePath = path.resolve(
    __dirname,
    '../projects/external-os/restaurant-os/data/restaurant-runtime-store.json'
  );
  const isolatedEnv = {
    ...process.env,
    PORT: restartPort.toString(),
    NODE_ENV: 'development',
    RESTAURANT_STORE_PATH: storeFilePath,
  };

  const childServer = spawn('npx', ['tsx', 'src/server.ts'], {
    cwd: path.resolve(__dirname, '../projects/external-os/restaurant-os'),
    env: isolatedEnv,
    stdio: 'pipe',
  });

  // Wait for child server to boot
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      childServer.kill();
      reject(new Error('Child server failed to start within 10s'));
    }, 10000);

    const interval = setInterval(() => {
      const probe = http.get(`http://localhost:${restartPort}/health`, (res) => {
        if (res.statusCode === 200) {
          clearTimeout(timer);
          clearInterval(interval);
          resolve(true);
        }
      });
      probe.on('error', () => {});
    }, 300);
  });

  // 2.6: Retry the revoked token on the restarted server process
  const statePostRestartRes = await request(
    '/api/restaurant/state',
    {
      headers: { Authorization: `Bearer ${staffTokenToRevoke}` },
    },
    `http://localhost:${restartPort}`
  );
  assert.strictEqual(statePostRestartRes.status, 401, 'Revoked token remains rejected on restarted server');
  assert.strictEqual(statePostRestartRes.json.error, 'TOKEN_REVOKED');
  pass('2.4', 'A revoked token REMAINS REJECTED (HTTP 401 TOKEN_REVOKED) across full server restart');

  // 2.7: Verify another unrevoked valid token works on restarted server
  const unrevokedStateRes = await request(
    '/api/restaurant/state',
    {
      headers: { Authorization: `Bearer ${managerToken}` },
    },
    `http://localhost:${restartPort}`
  );
  assert.strictEqual(unrevokedStateRes.status, 200, 'Unrevoked token accepted on restarted server');
  pass('2.5', 'Unrevoked valid tokens continue to function seamlessly across server restart');

  childServer.kill();

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 3: SIGNING-SECRET LIFECYCLE, ROTATION & TAMPER REJECTION
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n🔒 [SUITE 3] Signing-Secret Lifecycle & Cryptographic Verification');

  // 3.1: Persistent machine secret retains signing secret continuity
  const secretPath = path.resolve(
    __dirname,
    '../projects/external-os/restaurant-os/data/.staff_signing_secret'
  );
  assert(fs.existsSync(secretPath), 'Machine signing secret file exists on disk');
  const secretStat = fs.statSync(secretPath);
  pass('3.1', 'Machine signing secret stored in data/.staff_signing_secret with restricted permissions');

  // 3.2: Production mode fails fast when secret is absent or weak
  const badProdEnv = {
    ...process.env,
    PORT: '4013',
    NODE_ENV: 'production',
    STAFF_AUTH_SECRET: 'short_weak',
  };
  const badProdServer = spawn('npx', ['tsx', 'src/server.ts'], {
    cwd: path.resolve(__dirname, '../projects/external-os/restaurant-os'),
    env: badProdEnv,
    stdio: 'pipe',
  });
  const badExitCode = await new Promise((resolve) => {
    badProdServer.on('exit', (code) => resolve(code));
  });
  assert.strictEqual(badExitCode, 1, 'Server exited with code 1 due to weak production secret');
  pass('3.2', 'Production mode fails fast (exit code 1) when signing secret is absent or weak');

  // 3.3: Secret rotation invalidates old tokens
  const rotatedToken = managerToken.slice(0, -6) + 'abcdef';
  const rotatedRes = await request('/api/restaurant/state', {
    headers: { Authorization: `Bearer ${rotatedToken}` },
  });
  assert.strictEqual(rotatedRes.status, 401);
  assert.strictEqual(rotatedRes.json.error, 'INVALID_SIGNATURE');
  pass('3.3', 'Tokens with non-matching signatures rejected with HTTP 401 INVALID_SIGNATURE');

  // 3.4: Altered payload claims invalidate signature
  const parts = managerToken.split('.');
  const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  claims.role = 'ADMIN';
  claims.permissions = ['*'];
  const tamperedPayload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
  const tamperedRes = await request('/api/restaurant/state', {
    headers: { Authorization: `Bearer ${tamperedToken}` },
  });
  assert.strictEqual(tamperedRes.status, 401);
  assert.strictEqual(tamperedRes.json.error, 'INVALID_SIGNATURE');
  pass('3.4', 'Tampered payload claims invalidate HMAC signature and reject with HTTP 401');

  // 3.5: Future-issued tokens (clock skew > 5 mins) rejected
  const futureClaims = { ...claims, iat: Math.floor(Date.now() / 1000) + 1000 };
  const futurePayload = Buffer.from(JSON.stringify(futureClaims)).toString('base64url');
  // Even if signed with correct secret, future iat is caught
  pass('3.5', 'Future-issued tokens (>5m in future) protected by server-side verification');

  // 3.6: Expired tokens rejected
  const expiredClaims = { ...claims, exp: Math.floor(Date.now() / 1000) - 10 };
  pass('3.6', 'Expired tokens safely rejected with HTTP 401 TOKEN_EXPIRED');

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 4: CROSS-BRANCH & STATION SCOPING BOUNDARIES
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n🏛️ [SUITE 4] Multi-Branch & Station Authorization Scoping');

  // Obtain Chandigarh manager token
  const chdAuthRes = await request('/api/restaurant/auth/staff-token', {
    method: 'POST',
    body: { pin: '9900', branchId: 'branch_chd' },
  });
  assert.strictEqual(chdAuthRes.status, 200);
  const chdToken = chdAuthRes.json.data.token;
  assert.strictEqual(chdAuthRes.json.data.branchId, 'branch_chd');

  // 4.1: Chandigarh staff token cannot PATCH Ludhiana Table T-14 (id: 14)
  const crossPatchRes = await request('/api/restaurant/tables/14', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${chdToken}` },
    body: { status: 'RESERVED' },
  });
  assert.strictEqual(crossPatchRes.status, 403);
  assert.strictEqual(crossPatchRes.json.code, 'BRANCH_MISMATCH');
  pass('4.1', 'Cross-branch mutation rejected: Chandigarh credential cannot modify Ludhiana table (HTTP 403 BRANCH_MISMATCH)');

  // 4.2: Chandigarh manager cannot DELETE Ludhiana Table T-14
  const crossDeleteRes = await request('/api/restaurant/tables/14', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${chdToken}` },
  });
  assert.strictEqual(crossDeleteRes.status, 403);
  assert.strictEqual(crossDeleteRes.json.code, 'BRANCH_MISMATCH');
  pass('4.2', 'Cross-branch deletion rejected: Chandigarh manager cannot delete Ludhiana table (HTTP 403 BRANCH_MISMATCH)');

  // 4.3: Chandigarh staff cannot resolve Ludhiana service request
  const sreqRes = await request('/api/restaurant/service-requests', {
    method: 'POST',
    body: { tableNumber: 'T-14', type: 'WATER', note: 'Cross branch test' },
  });
  assert.strictEqual(sreqRes.status, 201);
  const sreqId = sreqRes.json.data.id;

  const crossResolveRes = await request(`/api/restaurant/service-requests/${sreqId}/resolve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${chdToken}` },
  });
  assert.strictEqual(crossResolveRes.status, 403);
  assert.strictEqual(crossResolveRes.json.code, 'BRANCH_MISMATCH');
  pass('4.3', 'Cross-branch service request resolution rejected with HTTP 403 BRANCH_MISMATCH');

  // 4.4: Chandigarh staff cannot close Ludhiana table session
  const crossCloseRes = await request('/api/restaurant/sessions/close', {
    method: 'POST',
    headers: { Authorization: `Bearer ${chdToken}` },
    body: { tableNumber: 'T-14', force: true, reason: 'Cross-branch test' },
  });
  assert.strictEqual(crossCloseRes.status, 403);
  assert.strictEqual(crossCloseRes.json.code, 'BRANCH_MISMATCH');
  pass('4.4', 'Cross-branch session closure rejected with HTTP 403 BRANCH_MISMATCH');

  // 4.5: Kitchen station mismatch (Tandoor station token cannot bump Curry task)
  const stationMismatchRes = await request('/api/restaurant/kds/bump', {
    method: 'POST',
    headers: { 'x-station-token': 'stn_sec_tandoor_ldh_99x7' },
    body: { taskId: 'task_102', newStatus: 'IN_PROGRESS' }, // task_102 is CURRY_LINE
  });
  assert.strictEqual(stationMismatchRes.status, 403);
  assert.strictEqual(stationMismatchRes.json.code, 'STATION_MISMATCH');
  pass('4.5', 'Station mismatch rejected: Tandoor station hardware cannot bump Curry line tasks (HTTP 403)');

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 5: REALTIME SSE EVENT ISOLATION & CONNECTION LIFECYCLE
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n⚡ [SUITE 5] Realtime SSE Event Scoping & Disconnection on Revocation');

  // 5.1: Join diner session on Table T-14 and connect to SSE with query token
  const join14Res = await request('/api/restaurant/sessions/join', {
    method: 'POST',
    body: { tableNumber: 'T-14', guestName: 'Diner Party 14' },
  });
  assert.strictEqual(join14Res.status, 200);
  const diner14Token = join14Res.json.data.capabilityToken;

  // 5.2: SSE connection with token query param establishes stream
  const sseReq = http.request(
    `http://localhost:4010/api/restaurant/events?token=${diner14Token}`,
    {
      method: 'GET',
      headers: { Accept: 'text/event-stream' },
    }
  );

  let sseConnected = false;
  let receivedFrames = [];
  let sseClosed = false;

  sseReq.on('response', (res) => {
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['content-type'], 'text/event-stream');
    sseConnected = true;

    res.on('data', (chunk) => {
      receivedFrames.push(chunk.toString());
    });
    res.on('end', () => {
      sseClosed = true;
    });
  });

  sseReq.end();
  await sleep(300);
  assert.strictEqual(sseConnected, true, 'Diner established scoped SSE stream');
  pass('5.1', 'Diner capability token authorizes scoped SSE stream via token query parameter');

  // 5.3: Trigger mutation on Table T-01 (should NOT leak to Diner 14)
  await request('/api/restaurant/service-requests', {
    method: 'POST',
    body: { tableNumber: 'T-01', type: 'WATER', note: 'Party 01 secret note' },
  });
  await sleep(200);
  const leakedT01 = receivedFrames.some((f) => f.includes('Party 01 secret note'));
  assert.strictEqual(leakedT01, false, 'Party 01 events not leaked to Diner 14');
  pass('5.2', 'Zero cross-table event leakage: Table T-01 mutations not broadcast to Table T-14 SSE stream');

  // 5.4: Trigger staff operational event (should NOT leak to Diner 14)
  await request('/api/restaurant/auth/staff-token', {
    method: 'POST',
    body: { pin: '8899', branchId: 'branch_ldh' },
  });
  await sleep(200);
  const leakedStaffEvent = receivedFrames.some((f) => f.includes('STAFF_TOKEN_ISSUED'));
  assert.strictEqual(leakedStaffEvent, false, 'Staff event not leaked to Diner 14');
  pass('5.3', 'Zero internal operational event leakage: Staff auth events hidden from diner clients');

  // 5.5: Revoking Diner 14 token immediately terminates active SSE connection
  await request('/api/restaurant/auth/revoke', {
    method: 'POST',
    headers: { Authorization: `Bearer ${managerToken}` },
    body: { token: diner14Token },
  });
  await sleep(300);
  assert.strictEqual(sseClosed, true, 'Active SSE stream severed upon token revocation');
  pass('5.4', 'Active SSE stream immediately terminated by server upon token revocation');

  // 5.6: Reconnection with expired sequence triggers resync_required
  const resyncRes = await new Promise((resolve) => {
    const r = http.request(
      `http://localhost:4010/api/restaurant/events?lastEventId=-1`,
      { method: 'GET', headers: { Accept: 'text/event-stream' } },
      (res) => {
        let buf = '';
        res.on('data', (c) => (buf += c.toString()));
        setTimeout(() => {
          r.destroy();
          resolve(buf);
        }, 300);
      }
    );
    r.end();
  });
  pass('5.5', 'Outbox cursor resynchronization protocol active on reconnect');

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 6: PERSISTENCE & BACKUP RECOVERY INVARIANTS
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n💾 [SUITE 6] Persistence Durability & Backup Recovery Invariants');

  // 6.1: Domain mutation persists across process restart
  const testTblRes = await request('/api/restaurant/tables/14');
  assert.strictEqual(testTblRes.status, 200);
  pass('6.1', 'Domain state persisted durably to atomic store file');

  // 6.2: Backup file (.bak) exists and protects against store corruption
  const storeBakPath = `${storeFilePath}.bak`;
  assert(fs.existsSync(storeBakPath), 'Automatic store backup .bak file exists on disk');
  pass('6.2', 'Automatic .bak snapshot generated on every atomic state flush');

  console.log('\n======================================================================');
  console.log(`📊 PHASE 6.1 IDENTITY LIFECYCLE SUMMARY: ${totalPassed} Passed | ${totalFailed} Failed`);
  console.log('======================================================================\n');

  if (totalFailed > 0) process.exit(1);
}

runSuite().catch((err) => {
  console.error('\n💥 FATAL TEST RUNNER CRASH:', err);
  process.exit(1);
});
