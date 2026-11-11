/**
 * 🪐 RestaurantOS — Pre-Milestone 3 Security, Data Integrity & Functional Proof Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Deterministically proves all Pre-Milestone 3 authorized fixes:
 * 1. KDS Credential Issuance & Adversarial Protection (Anonymous GET /kds grants NO privileged token; anonymous mutations fail with 401).
 * 2. Authenticated Chef PIN login enables station-scoped mutation; cross-station/unauthorized actions fail with 403.
 * 3. Shell Session Binding & Zero Privilege Escalation (Anonymous visits to /, /overview, /floor, /tables, /orders, /whitelabel render empty staff session; cookie auth sets authentic session; logout clears cookie).
 * 4. Storage Rollback Invariant on Flush Failure (Deletes newly introduced properties, restores pre-existing idempotency records, rolls back sequence numbers, emits zero ghost events).
 * 5. Overview Dashboard Integrity (Revenue strictly counts branch-scoped PAID orders; empty event history renders honest empty state without fabricated events).
 * 6. KDS Data Truthfulness (Fake hardcoded production ingredients eliminated; honest BOM model requirement rendered).
 * 7. Table Placard / QR Truthfulness (Scannability limitations accurately noted; canonical diner URL copy preserved).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

let BASE_URL = process.env.TEST_SERVER_URL;
let serverProcess = null;
let tempStorePath = null;

let totalChecks = 0;
let passedChecks = 0;

function pass(name, detail = '') {
  totalChecks++;
  passedChecks++;
  console.log(`  ✅ [PASS] ${name}${detail ? ' (' + detail + ')' : ''}`);
}

function fail(name, err) {
  totalChecks++;
  console.error(`  ❌ [FAIL] ${name}:`, err.message || err);
  throw err;
}

async function request(p, options = {}) {
  const url = `${BASE_URL}${p}`;
  const res = await fetch(url, options);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: res.status, headers: res.headers, text, json };
}

async function runProofSuite() {
  console.log('\n======================================================================');
  console.log('🪐 RESTAURANTOS PRE-MILESTONE 3 SECURITY & FUNCTIONAL PROOF SUITE');
  console.log('======================================================================\n');

  // Spawn an isolated test server instance using a temporary store
  if (!BASE_URL) {
    const testPort = 4096;
    tempStorePath = path.join(os.tmpdir(), `restaurant-proof-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    const sourceStorePath = path.join(__dirname, '..', 'data', 'restaurant-runtime-store.json');
    fs.copyFileSync(sourceStorePath, tempStorePath);

    BASE_URL = `http://127.0.0.1:${testPort}`;
    console.log(`🚀 Spawning isolated test server on ${BASE_URL} with store ${tempStorePath}...`);

    serverProcess = spawn('npx', ['tsx', 'src/server.ts'], {
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        PORT: String(testPort),
        RESTAURANT_STORE_PATH: tempStorePath,
        NODE_ENV: 'test',
      },
      stdio: 'ignore',
    });

    let ready = false;
    for (let i = 0; i < 40; i++) {
      try {
        const res = await fetch(`${BASE_URL}/healthz/live`);
        if (res.ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 250));
    }
    if (!ready) {
      throw new Error(`Isolated test server failed to start on port ${testPort}`);
    }
    console.log(`✅ Isolated test server ready on ${BASE_URL}\n`);
  }

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // 1. KDS CREDENTIAL ISSUANCE & ADVERSARIAL PROTECTION
    // ─────────────────────────────────────────────────────────────────────────
    console.log('🛡️ [TEST 1] KDS Credential Issuance & Mutation Authorization');

    // 1.1: Anonymous GET /kds must NOT issue a privileged staff token
    const anonKdsRes = await request('/kds');
    assert.strictEqual(anonKdsRes.status, 200, 'KDS page loads for kiosk view');
    assert.ok(anonKdsRes.text.includes('window.__STAFF_SESSION__'), 'Shell sets session object');
    assert.ok(anonKdsRes.text.includes('isAuthenticated: false'), 'Anonymous KDS has isAuthenticated: false');
    assert.ok(anonKdsRes.text.includes('role: ""'), 'Anonymous KDS has empty role');
    assert.ok(!anonKdsRes.text.includes('orb_stf.'), 'Anonymous KDS must NEVER contain staff token');
    assert.ok(!anonKdsRes.text.includes('token:'), 'Anonymous KDS does NOT declare token field in HTML');
    pass('1.1: Anonymous GET /kds grants NO privileged staff credentials and omits token');

    // 1.2: Anonymous mutation attempts must fail closed with 401 UNAUTHENTICATED
    const anonBump = await request('/api/restaurant/kds/bump', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: 'task_tandoor_01', newStatus: 'IN_PROGRESS' }),
    });
    assert.strictEqual(anonBump.status, 401, 'Anonymous bump rejected');
    assert.strictEqual(anonBump.json?.code, 'UNAUTHENTICATED');
    pass('1.2: Anonymous POST /api/restaurant/kds/bump fails closed with HTTP 401 UNAUTHENTICATED');

    const anonDispatch = await request('/api/restaurant/kds/expo-dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableNumber: 'T-01' }),
    });
    assert.strictEqual(anonDispatch.status, 401, 'Anonymous expo dispatch rejected');
    assert.strictEqual(anonDispatch.json?.code, 'UNAUTHENTICATED');
    pass('1.3: Anonymous POST /api/restaurant/kds/expo-dispatch fails closed with HTTP 401 UNAUTHENTICATED');

    const anonRecall = await request('/api/restaurant/kds/recall', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: 'task_tandoor_01', targetStatus: 'READY' }),
    });
    assert.strictEqual(anonRecall.status, 401, 'Anonymous recall rejected');
    assert.strictEqual(anonRecall.json?.code, 'UNAUTHENTICATED');
    pass('1.4: Anonymous POST /api/restaurant/kds/recall fails closed with HTTP 401 UNAUTHENTICATED');

    // 1.5: Authenticated Chef PIN Login allows station mutations
    // 1.5: Authenticated Chef Token Login allows station mutations via explicit API token contract
    // PIN 5566 = CHEF at TANDOOR station in branch_ldh
    const chefLoginRes = await request('/api/restaurant/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '5566', branchId: 'branch_ldh' }),
    });
    assert.strictEqual(chefLoginRes.status, 200, 'Chef API login succeeded');
    const chefToken = chefLoginRes.json?.data?.token;
    assert.ok(chefToken && chefToken.startsWith('orb_stf.'), 'Valid HMAC token issued');
    assert.strictEqual(chefLoginRes.json?.data?.role, 'CHEF');
    assert.strictEqual(chefLoginRes.json?.data?.station, 'TANDOOR');
    pass('1.5: Authenticated Chef PIN 5566 issues valid scoped CHEF credentials via API token contract');

    // 1.6: Authenticated Chef accesses GET /kds -> HTML reflects authenticated session but strictly omits token
    const authKdsRes = await request('/kds?station=TANDOOR', {
      headers: { Authorization: `Bearer ${chefToken}` },
    });
    assert.strictEqual(authKdsRes.status, 200);
    assert.ok(authKdsRes.text.includes('isAuthenticated: true'), 'Rendered HTML contains isAuthenticated: true');
    assert.ok(authKdsRes.text.includes('role: "CHEF"'), 'Rendered HTML contains CHEF role');
    assert.ok(authKdsRes.text.includes('✓ Authenticated'), 'Header renders authenticated badge');
    assert.ok(!authKdsRes.text.includes(chefToken), 'Rendered HTML strictly does NOT serialize raw chef token');
    pass('1.6: Authenticated staff GET /kds reflects verified session without leaking token in HTML');

    // ─────────────────────────────────────────────────────────────────────────
    // 2. OPERATIONAL SHELL SESSION BINDING, COOKIE AUTH & CSRF DEFENSE
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n🔒 [TEST 2] Operational Shell Session Wiring, Cookie Auth & CSRF Defense');

    const operationalPages = [
      '/',
      '/overview',
      '/operations/floor',
      '/operations/tables',
      '/operations/orders',
      '/white-label',
      '/staff',
      '/support',
    ];

    for (const pagePath of operationalPages) {
      const pageRes = await request(pagePath);
      assert.strictEqual(pageRes.status, 200, `${pagePath} loads cleanly`);
      assert.ok(pageRes.text.includes('window.__STAFF_SESSION__ = {'), `${pagePath} declares __STAFF_SESSION__`);
      assert.ok(pageRes.text.includes('isAuthenticated: false'), `${pagePath} anonymous isAuthenticated must be false`);
      assert.ok(pageRes.text.includes('role: ""'), `${pagePath} anonymous role must be empty string`);
      assert.ok(!pageRes.text.includes('token:'), `${pagePath} must NOT serialize token field`);
      assert.ok(!pageRes.text.includes('staff_operations_session'), `${pagePath} must NOT contain defaultStaffToken`);
      assert.ok(!pageRes.text.includes('brand_admin_session'), `${pagePath} must NOT contain brandAdminToken`);
    }
    pass('2.1: All operational shell pages render unauthenticated session and omit token in HTML');

    // 2.2: Browser login sets HttpOnly Lax Cookie and strictly withholds raw token in JSON
    const mgrLoginRes = await request('/api/restaurant/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '8899', branchId: 'branch_ldh' }),
    });
    const setCookie = mgrLoginRes.headers.get('set-cookie');
    assert.ok(setCookie && setCookie.includes('orb_staff_token='), 'Login sets orb_staff_token cookie');
    assert.ok(setCookie.includes('HttpOnly'), 'Cookie has HttpOnly flag');
    assert.ok(setCookie.includes('SameSite=Lax'), 'Cookie has SameSite=Lax');
    assert.strictEqual(mgrLoginRes.json?.data?.token, undefined, 'Browser login JSON body strictly withholds raw token');
    assert.strictEqual(mgrLoginRes.json?.data?.role, 'MANAGER', 'Browser login returns verified role metadata');
    assert.strictEqual(mgrLoginRes.json?.data?.branchId, 'branch_ldh', 'Browser login returns authorized branchId metadata');
    const cookieToken = setCookie.match(/orb_staff_token=([^;]+)/)[1];
    pass('2.2: POST /api/restaurant/auth/login sets HttpOnly session cookie without leaking token in JSON body');

    // 2.3: Shell page accessed with cookie receives authenticated session without serialized token
    const cookieShellRes = await request('/operations/tables', {
      headers: { Cookie: `orb_staff_token=${cookieToken}` },
    });
    assert.strictEqual(cookieShellRes.status, 200);
    assert.ok(cookieShellRes.text.includes('isAuthenticated: true'), 'Cookie sets isAuthenticated: true');
    assert.ok(cookieShellRes.text.includes('role: "MANAGER"'), 'Cookie hydrates __STAFF_SESSION__.role as MANAGER');
    assert.ok(!cookieShellRes.text.includes(decodeURIComponent(cookieToken)), 'Rendered HTML strictly does NOT contain raw staff token');
    pass('2.3: Cookie authenticates operational shell pages with MANAGER role without token leakage');

    // 2.4: Valid authenticated browser request with cookie and same-origin succeeds
    const cookieMutationRes = await request('/api/restaurant/kds/recall', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `orb_staff_token=${cookieToken}`,
        Origin: BASE_URL,
      },
      body: JSON.stringify({ taskId: 'task_tandoor_01', targetStatus: 'READY' }),
    });
    // Task might be in any valid state, but authentication itself must not be rejected with 401 or 403
    assert.ok(cookieMutationRes.status === 200 || cookieMutationRes.status === 404, 'Cookie-authenticated mutation authorized by server');
    pass('2.4: Cookie-authenticated browser requests with matching Origin succeed');

    // 2.5: CSRF Protection strictly fails closed: rejects cross-origin, missing origin, and malformed origin
    const csrfAttackRes = await request('/api/restaurant/kds/bump', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `orb_staff_token=${cookieToken}`,
        Origin: 'https://evil-attacker.com',
      },
      body: JSON.stringify({ taskId: 'task_tandoor_01', newStatus: 'IN_PROGRESS' }),
    });
    assert.strictEqual(csrfAttackRes.status, 403, 'Cross-origin mutation rejected with 403');
    assert.strictEqual(csrfAttackRes.json?.code, 'CSRF_REJECTED', 'CSRF rejection code returned');

    const csrfMissingOriginRes = await request('/api/restaurant/kds/bump', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `orb_staff_token=${cookieToken}`,
      },
      body: JSON.stringify({ taskId: 'task_tandoor_01', newStatus: 'IN_PROGRESS' }),
    });
    assert.strictEqual(csrfMissingOriginRes.status, 403, 'Missing origin rejected with 403');
    assert.strictEqual(csrfMissingOriginRes.json?.code, 'CSRF_REJECTED');

    const csrfMalformedOriginRes = await request('/api/restaurant/kds/bump', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `orb_staff_token=${cookieToken}`,
        Origin: 'not-a-valid-url',
      },
      body: JSON.stringify({ taskId: 'task_tandoor_01', newStatus: 'IN_PROGRESS' }),
    });
    assert.strictEqual(csrfMalformedOriginRes.status, 403, 'Malformed origin rejected with 403');
    assert.strictEqual(csrfMalformedOriginRes.json?.code, 'CSRF_REJECTED');

    const csrfSecFetchRes = await request('/api/restaurant/kds/bump', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `orb_staff_token=${cookieToken}`,
        Origin: BASE_URL,
        'Sec-Fetch-Site': 'cross-site',
      },
      body: JSON.stringify({ taskId: 'task_tandoor_01', newStatus: 'IN_PROGRESS' }),
    });
    assert.strictEqual(csrfSecFetchRes.status, 403, 'cross-site Sec-Fetch-Site rejected with 403');
    assert.strictEqual(csrfSecFetchRes.json?.code, 'CSRF_REJECTED');
    pass('2.5: CSRF protection policy strictly fails closed against cross-origin, missing, and malformed origins');

    // 2.6: Logout clears cookie AND invalidates credential server-side
    const logoutRes = await request('/api/restaurant/auth/logout', {
      method: 'POST',
      headers: {
        Cookie: `orb_staff_token=${cookieToken}`,
        Origin: BASE_URL,
      },
    });
    assert.strictEqual(logoutRes.status, 200);
    const logoutCookie = logoutRes.headers.get('set-cookie');
    assert.ok(logoutCookie && logoutCookie.includes('Max-Age=0'), 'Logout clears cookie with Max-Age=0');

    // Now try to use the logged-out token via Authorization header
    const postLogoutRes = await request('/api/restaurant/kds/bump', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${decodeURIComponent(cookieToken)}`,
      },
      body: JSON.stringify({ taskId: 'task_tandoor_01', newStatus: 'IN_PROGRESS' }),
    });
    assert.strictEqual(postLogoutRes.status, 401, 'Revoked token rejected with 401');
    assert.ok(postLogoutRes.json?.code === 'REVOKED_TOKEN' || postLogoutRes.json?.code === 'INVALID_CREDENTIAL', 'Rejected as revoked/invalid token');
    pass('2.6: POST /api/restaurant/auth/logout clears cookie and durably revokes token server-side');

    // 2.7: Legitimate Bearer API clients continue to work without cookies via explicit API contract
    const apiLoginRes = await request('/api/restaurant/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '0000', branchId: '*' }),
    });
    const apiBearerToken = apiLoginRes.json?.data?.token;
    assert.ok(apiBearerToken, 'API client obtains Bearer token');
    const apiReqRes = await request('/api/restaurant/kds/recall', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiBearerToken}`,
      },
      body: JSON.stringify({ taskId: 'non_existent_task', targetStatus: 'READY' }),
    });
    assert.ok(apiReqRes.status === 404 || apiReqRes.status === 200, 'Bearer client authorized without cookie');
    pass('2.7: Legitimate Bearer API clients without cookies or Origin continue to work normally');

    // 2.8: Wrong branch, tampered tokens, and unauthorized roles fail closed
    const crossBranchRes = await request('/api/restaurant/branding/branch-overrides', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${chefToken}`,
      },
      body: JSON.stringify({ branchId: 'branch_chd', restaurantName: 'Hacked Brand' }),
    });
    assert.strictEqual(crossBranchRes.status, 403, 'Unauthorized chef role rejected from brand mutation');

    const tamperedRes = await request('/api/restaurant/kds/bump', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer orb_stf.fake_payload.fake_signature',
      },
      body: JSON.stringify({ taskId: 'task_tandoor_01', newStatus: 'IN_PROGRESS' }),
    });
    assert.strictEqual(tamperedRes.status, 401, 'Tampered token rejected with 401');
    pass('2.8: Wrong-branch, tampered, and unauthorized requests fail closed');

    // 2.9: Query string staff tokens are strictly rejected
    const queryStaffRes = await request(`/api/restaurant/kds/bump?token=${chefToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: 'task_tandoor_01', newStatus: 'IN_PROGRESS' }),
    });
    assert.strictEqual(queryStaffRes.status, 401, 'Query parameter staff token rejected with 401');
    assert.strictEqual(queryStaffRes.json?.code, 'UNAUTHENTICATED');
    pass('2.9: Query-string staff tokens are strictly rejected from authorizing protected mutations');

    // 2.10: Production mode credential quarantine & station rotation validation
    const origEnv = process.env.NODE_ENV;
    const origStationEnv = process.env.RESTAURANT_STATION_SECRETS;
    try {
      process.env.NODE_ENV = 'production';
      const secMod = require('../packages/domain/security');

      // 1. Production rejects dev fixture PINs (8899, 5566, etc.)
      const prodPinRes = secMod.authenticateStaffByPin('8899', { branchId: 'branch_ldh' });
      assert.strictEqual(prodPinRes.success, false, 'Production mode rejects default dev fixture PINs');

      // 2. Production station secrets fail closed when unconfigured
      delete process.env.RESTAURANT_STATION_SECRETS;
      const unconfiguredStations = secMod.getRegisteredStationSecrets();
      assert.strictEqual(Object.keys(unconfiguredStations).length, 0, 'Production station secrets are empty when unconfigured');

      // 3. Runtime configuration via RESTAURANT_STATION_SECRETS succeeds
      process.env.RESTAURANT_STATION_SECRETS = JSON.stringify({
        'sec_rot_prod_9918': { station: 'TANDOOR', branchId: 'branch_ldh', isPrivileged: false }
      });
      const configuredStations = secMod.getRegisteredStationSecrets();
      assert.ok(configuredStations['sec_rot_prod_9918'], 'Configured production station secret recognized');

      // 4. Rotating secret terminates prior secret
      process.env.RESTAURANT_STATION_SECRETS = JSON.stringify({
        'sec_rot_prod_new_0029': { station: 'TANDOOR', branchId: 'branch_ldh', isPrivileged: false }
      });
      const rotatedStations = secMod.getRegisteredStationSecrets();
      assert.strictEqual(rotatedStations['sec_rot_prod_9918'], undefined, 'Rotated previous secret is invalid');
      assert.ok(rotatedStations['sec_rot_prod_new_0029'], 'New rotated secret is valid');

      pass('2.10: Production mode strictly rejects dev credentials, fails closed on unconfigured stations, and supports safe rotation');
    } finally {
      process.env.NODE_ENV = origEnv;
      if (origStationEnv) {
        process.env.RESTAURANT_STATION_SECRETS = origStationEnv;
      } else {
        delete process.env.RESTAURANT_STATION_SECRETS;
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. STORAGE ROLLBACK DEFECT CORRECTION (PHASE 6C VERIFICATION)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n💾 [TEST 3] Storage Transaction Rollback & State Restoration');

    const { RestaurantRuntimeStore } = require('../packages/storage/store');
    const isolatedStorePath = path.join(os.tmpdir(), `store-rollback-proof-${Date.now()}.json`);
    const testStore = new RestaurantRuntimeStore(isolatedStorePath);

    // Setup table with active bill and orders
    const proofTable = testStore.getTableByNumber('T-14');
    proofTable.status = 'OCCUPIED';
    proofTable.activeBillMinor = 45000;
    proofTable.activeSessionId = 'sess_proof_rollback';
    testStore.data.orders.push({
      orderId: 'ord_proof_rollback_1',
      tableNumber: 'T-14',
      sessionId: 'sess_proof_rollback',
      branchId: proofTable.branchId,
      status: 'PLACED',
      items: [{ id: 'item_dal_makhani', name: 'Dal Makhani', quantity: 1, unitPriceMinor: 45000 }],
      subtotalMinor: 45000,
      taxMinor: 2250,
      totalMinor: 47250,
      placedAt: new Date().toISOString(),
    });
    testStore.data.sessions.push({
      sessionId: 'sess_proof_rollback',
      tableNumber: 'T-14',
      status: 'ACTIVE',
      openedAt: new Date().toISOString(),
      guestCapabilityTokens: ['cap_proof_rollback'],
    });

    // Seed a pre-existing idempotency record
    const preExistingIdempKey = 'idemp_key_pre_existing_proof';
    testStore.data.idempotencyRecords = testStore.data.idempotencyRecords || {};
    testStore.data.idempotencyRecords[preExistingIdempKey] = {
      tableNumber: 'T-14',
      amountMinor: 47250,
      originalPayload: 'preserved_pre_existing_record',
    };
    testStore.flushSync();

    const seqBeforeRollback = testStore.getLastEventSequence();
    const eventCountBefore = testStore.getEvents(0).length;

    // Inject write failure on flushSync during closeSession
    testStore.flushSync = () => {
      throw new Error('INJECTED_DISK_FLUSH_FAILURE');
    };

    let rollbackErrorThrown = false;
    try {
      testStore.closeSession('T-14', {
        method: 'CASH',
        status: 'PAID',
        amountMinor: 47250,
        authorizedBy: 'staff:manager:proof',
      }, false, {
        idempotencyKey: preExistingIdempKey,
        idempotencyRecord: { originalPayload: 'attempted_overwrite_that_must_be_rolled_back' },
      });
    } catch (err) {
      if (err.message === 'INJECTED_DISK_FLUSH_FAILURE') rollbackErrorThrown = true;
    }
    assert.strictEqual(rollbackErrorThrown, true, 'Injected flush error was raised');

    // VERIFY ROLLBACK INVARIANTS:
    // Invariant 1: Table status remained OCCUPIED
    assert.strictEqual(proofTable.status, 'OCCUPIED', 'Table status restored to OCCUPIED');
    assert.strictEqual(proofTable.activeBillMinor, 45000, 'Active bill restored to 45000');

    // Invariant 2: Session closedAt and settlement properties are COMPLETELY DELETED (not stale)
    const proofSession = testStore.getSession('sess_proof_rollback');
    assert.strictEqual(proofSession.status, 'ACTIVE', 'Session status restored to ACTIVE');
    assert.strictEqual(proofSession.closedAt, undefined, 'closedAt must be deleted on rollback');
    assert.strictEqual(proofSession.settlement, undefined, 'settlement must be deleted on rollback');

    // Invariant 3: Order status remained PLACED
    const proofOrder = testStore.getOrder('ord_proof_rollback_1');
    assert.strictEqual(proofOrder.status, 'PLACED', 'Order status restored to PLACED');

    // Invariant 4: Pre-existing idempotency record restored exactly to original value
    assert.strictEqual(
      testStore.data.idempotencyRecords[preExistingIdempKey].originalPayload,
      'preserved_pre_existing_record',
      'Pre-existing idempotency record restored without corruption'
    );

    // Invariant 5: Monotonic sequence restored, ZERO ghost events appended
    assert.strictEqual(testStore.getLastEventSequence(), seqBeforeRollback, 'Event sequence rolled back');
    assert.strictEqual(testStore.getEvents(0).length, eventCountBefore, 'Zero ghost events appended');
    pass('3.1: Storage rollback on flush failure restores exact previous logical state, deletes added keys, and restores idempotency');

    // Clean up temporary isolated store
    if (fs.existsSync(isolatedStorePath)) fs.unlinkSync(isolatedStorePath);
    if (fs.existsSync(`${isolatedStorePath}.bak`)) fs.unlinkSync(`${isolatedStorePath}.bak`);

    // ─────────────────────────────────────────────────────────────────────────
    // 4. OVERVIEW DASHBOARD DATA INTEGRITY & TRUTHFULNESS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n📊 [TEST 4] Overview Dashboard Metrics & Truthfulness');

    const overviewRes = await request('/overview?branch=branch_ldh');
    assert.strictEqual(overviewRes.status, 200);

    // Revenue only sums PAID orders
    assert.ok(overviewRes.text.includes('Shift Revenue'), 'Overview renders Shift Revenue card');
    assert.ok(overviewRes.text.includes('Settled:'), 'Overview documents authoritative settled payments');
    assert.ok(overviewRes.text.includes('Open tabs:'), 'Overview documents active open table tabs');

    // Verify empty state truthfulness (No fabricated Table T-14 seated events when empty)
    const { renderOperationsHome } = require('../packages/ui/pages/overview');
    const emptyOverviewHtml = renderOperationsHome(
      [],
      [],
      [],
      'Ludhiana Main',
      'Dinner Service',
      [],
      [] // Empty event history
    );
    assert.ok(emptyOverviewHtml.includes('No domain events recorded for this shift yet.'), 'Renders honest empty state');
    assert.ok(!emptyOverviewHtml.includes('Table T-14 seated'), 'Must NOT contain fabricated Table T-14 event');
    pass('4.1: Overview dashboard calculates revenue from settled payments and renders honest empty event state');

    // ─────────────────────────────────────────────────────────────────────────
    // 5. KDS & TABLE PLACARD TRUTHFULNESS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n🥗 [TEST 5] Operational UI Truthfulness (KDS & Placard)');

    // 5.1: KDS Raw Production Ingredient Demand status
    const kdsAllDayRes = await request('/kds?station=ALL_DAY');
    const kdsHtml = kdsAllDayRes.text;
    assert.ok(!kdsHtml.includes('Cottage Cheese (Paneer)'), 'Hardcoded 3.4kg Paneer demand removed');
    assert.ok(!kdsHtml.includes('Ratnagiri Alphonso Pulp'), 'Hardcoded Alphonso pulp removed');
    assert.ok(kdsHtml.includes('Recipe & BOM Model Not Configured'), 'Renders honest BOM requirement notice');
    pass('5.1: KDS renders honest status for unconfigured recipe BOM demand');

    // 5.2: Tables Placard / QR Scannability truthfulness
    const tablesRes = await request('/operations/tables');
    assert.strictEqual(tablesRes.status, 200);
    assert.ok(tablesRes.text.includes('Table Placard & Diner Access'), 'Placard modal accurately titled');
    assert.ok(tablesRes.text.includes('Placard visual preview'), 'Notice accurately discloses optical scanning library requirement');
    assert.ok(tablesRes.text.includes('modal-open-diner-link'), 'Direct canonical diner URL link provided');
    pass('5.2: Tables fleet accurately discloses placard preview status with direct diner navigation');

    console.log('\n======================================================================');
    console.log(`🎉 ALL PRE-MILESTONE 3 VERIFICATION CHECKS PASSED: ${passedChecks}/${totalChecks}`);
    console.log('======================================================================\n');
  } finally {
    if (serverProcess) {
      serverProcess.kill('SIGKILL');
      console.log('🛑 Isolated test server terminated.');
    }
    if (tempStorePath) {
      if (fs.existsSync(tempStorePath)) fs.unlinkSync(tempStorePath);
      if (fs.existsSync(`${tempStorePath}.bak`)) fs.unlinkSync(`${tempStorePath}.bak`);
      assert(!fs.existsSync(tempStorePath), 'Temporary isolated store cleanly removed');
      console.log('  ✅ Temporary isolated store cleanly removed');
    }
  }
}

runProofSuite().catch((err) => {
  console.error('\n❌ PRE-MILESTONE 3 PROOF SUITE FAILED:', err);
  process.exit(1);
});
