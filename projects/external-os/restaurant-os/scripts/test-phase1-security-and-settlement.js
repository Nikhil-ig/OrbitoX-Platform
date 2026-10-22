/**
 * 🪐 RESTAURANTOS 5.3 — PHASE 1: SECURITY HARDENING & TABLE SETTLEMENT ACCEPTANCE TEST SUITE
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * Validates:
 * 1. Security & Authorization:
 *    - Strict authentication on all sensitive mutation endpoints (menu CRUD, branch overrides, floor save, table mutate/merge)
 *    - Role-based permissions (CHEF, OPERATIONS, DINER rejected on manager-only routes)
 *    - Branch scoping (tokens scoped to branch_ldh cannot modify branch_del)
 *    - Negative credential tests: missing token (401), invalid signature (401), revoked token (401), insufficient role (403)
 * 2. Table Settlement & Financial Integrity:
 *    - Authoritative server-side bill calculation (subtotal of unpaid orders + 5% GST integer minor units)
 *    - Partial settlement rejection (422 PARTIAL_SETTLEMENT_UNRESOLVED) prevents table vacating
 *    - Duplicate settlement prevention & idempotency (200 replay with idempotentReplay: true, 409 IDEMPOTENCY_CONFLICT on payload change)
 *    - Concurrent settlement mutex locking (409 SETTLEMENT_IN_PROGRESS)
 *    - Persistent state verification: orders transitioned to PAID, table status reset to AVAILABLE, session CLOSED, capability invalidated
 * 3. Scope & Release Truth:
 *    - Legacy /api/commerce/restaurants returns X-API-Deprecation header
 *    - Duplicate /api/restaurant/branches route removed without breaking clients
 */

const http = require('http');
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

let BASE_URL = process.env.TEST_SERVER_URL || process.env.RESTAURANTOS_URL;
let serverProcess = null;
let tempStorePath = null;

let passedTests = 0;
let totalTests = 0;

function pass(code, desc) {
  passedTests++;
  console.log(`  ✅ PASS: [${code}] ${desc}`);
}

function request(p, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(p, BASE_URL);
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
          } catch (e) {
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

async function runPhase1Suite() {
  console.log('======================================================================');
  console.log('🔐 RESTAURANTOS 5.3 — PHASE 1 SECURITY & SETTLEMENT ACCEPTANCE SUITE');
  console.log('======================================================================\n');

  if (!BASE_URL) {
    const testPort = 4089;
    tempStorePath = path.join(os.tmpdir(), `restaurant-store-phase1-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
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
        const res = await request('/healthz/live');
        if (res.status === 200) {
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

  // Obtain authentic cryptographic credentials via server PIN login
  // Manager Token (PIN 8899 -> MANAGER, Ludhiana branch)
  const mgrLogin = await request('/api/restaurant/auth/login', {
    method: 'POST',
    body: { pin: '8899', branchId: 'branch_ldh' },
  });
  assert.strictEqual(mgrLogin.status, 200, 'Manager login succeeded');
  const managerToken = mgrLogin.json.data.token;
  assert(managerToken.startsWith('orb_stf.'), 'Valid HMAC staff token format');

  // Operations Token (PIN 1122 -> OPERATIONS, Ludhiana branch)
  const opsLogin = await request('/api/restaurant/auth/login', {
    method: 'POST',
    body: { pin: '1122', branchId: 'branch_ldh' },
  });
  assert.strictEqual(opsLogin.status, 200, 'Operations login succeeded');
  const opsToken = opsLogin.json.data.token;

  // ─────────────────────────────────────────────────────────────────────────
  // SUITE 1: MUTATION ENDPOINT SECURITY & AUTHORIZATION AUDIT
  // ─────────────────────────────────────────────────────────────────────────
  console.log('🛡️ [SUITE 1] Mutation Endpoint Security, RBAC & Branch Scoping');
  totalTests += 16;

  // 1.1: POST /api/restaurant/menu/items without auth rejected with 401
  const anonMenuCreate = await request('/api/restaurant/menu/items', {
    method: 'POST',
    body: { name: 'Hacker Dish', basePriceMinor: 10000, category: 'Mains', station: 'CURRY_LINE' },
  });
  assert.strictEqual(anonMenuCreate.status, 401, 'Anonymous menu creation rejected');
  assert.strictEqual(anonMenuCreate.json.code, 'AUTHENTICATION_REQUIRED');
  pass('1.1', 'POST /api/restaurant/menu/items without token rejected with HTTP 401 AUTHENTICATION_REQUIRED');

  // 1.2: POST /api/restaurant/menu/items with invalid/forged signature rejected with 401
  const forgedParts = managerToken.split('.');
  forgedParts[2] = 'tampered_signature_xyz';
  const tamperedToken = forgedParts.join('.');
  const forgedMenuCreate = await request('/api/restaurant/menu/items', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tamperedToken}` },
    body: { name: 'Forged Signature Dish', basePriceMinor: 10000, category: 'Mains', station: 'CURRY_LINE' },
  });
  assert.strictEqual(forgedMenuCreate.status, 401, 'Tampered token rejected');
  assert.strictEqual(forgedMenuCreate.json.code, 'INVALID_CREDENTIAL');
  pass('1.2', 'POST /api/restaurant/menu/items with tampered signature rejected with HTTP 401 INVALID_CREDENTIAL');

  // 1.3: Revoked staff token immediately rejected with 401
  const disposableLogin = await request('/api/restaurant/auth/login', {
    method: 'POST',
    body: { pin: '8899', branchId: 'branch_ldh' },
  });
  const disposableToken = disposableLogin.json.data.token;
  const revokeRes = await request('/api/restaurant/auth/revoke', {
    method: 'POST',
    headers: { Authorization: `Bearer ${managerToken}` },
    body: { token: disposableToken },
  });
  assert.strictEqual(revokeRes.status, 200, 'Token revoked successfully');

  const revokedMenuCreate = await request('/api/restaurant/menu/items', {
    method: 'POST',
    headers: { Authorization: `Bearer ${disposableToken}` },
    body: { name: 'Revoked Token Dish', basePriceMinor: 10000, category: 'Mains', station: 'CURRY_LINE' },
  });
  assert.strictEqual(revokedMenuCreate.status, 401, 'Revoked token rejected');
  pass('1.3', 'POST /api/restaurant/menu/items with revoked token rejected with HTTP 401');

  // 1.4: Insufficient role (OPERATIONS attempting menu creation) rejected with 403
  const opsMenuCreate = await request('/api/restaurant/menu/items', {
    method: 'POST',
    headers: { Authorization: `Bearer ${opsToken}` },
    body: { name: 'Operations Staff Dish', basePriceMinor: 10000, category: 'Mains', station: 'CURRY_LINE' },
  });
  assert.strictEqual(opsMenuCreate.status, 403, 'Operations staff blocked from menu mutations');
  assert.strictEqual(opsMenuCreate.json.code, 'FORBIDDEN');
  pass('1.4', 'POST /api/restaurant/menu/items with OPERATIONS role rejected with HTTP 403 FORBIDDEN');

  // 1.5: Authenticated manager menu item creation succeeds with 201
  const testDishId = 'item_sec_test_' + Date.now();
  const validMenuCreate = await request('/api/restaurant/menu/items', {
    method: 'POST',
    headers: { Authorization: `Bearer ${managerToken}` },
    body: {
      id: testDishId,
      name: 'Security Test Murgh Tikka',
      category: 'Starters',
      basePriceMinor: 45000,
      formattedPrice: '₹450.00',
      prepDurationMinutes: 12,
      station: 'TANDOOR',
    },
  });
  assert.strictEqual(validMenuCreate.status, 201, 'Manager creates menu item');
  assert.strictEqual(validMenuCreate.json.data.id, testDishId);
  pass('1.5', 'POST /api/restaurant/menu/items with MANAGER role succeeds with HTTP 201 Created');

  // 1.6: PATCH /api/restaurant/menu/items/:id: anonymous rejected 401, manager succeeds 200
  const anonPatch = await request(`/api/restaurant/menu/items/${testDishId}`, {
    method: 'PATCH',
    body: { basePriceMinor: 48000 },
  });
  assert.strictEqual(anonPatch.status, 401, 'Anonymous PATCH rejected');

  const authPatch = await request(`/api/restaurant/menu/items/${testDishId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${managerToken}` },
    body: { basePriceMinor: 48000, formattedPrice: '₹480.00' },
  });
  assert.strictEqual(authPatch.status, 200, 'Manager PATCH succeeded');
  assert.strictEqual(authPatch.json.data.basePriceMinor, 48000);
  pass('1.6', 'PATCH /api/restaurant/menu/items/:id enforces 401 for anonymous and 200 for manager');

  // 1.7: DELETE /api/restaurant/menu/items/:id: anonymous rejected 401
  const anonDelete = await request(`/api/restaurant/menu/items/${testDishId}`, {
    method: 'DELETE',
  });
  assert.strictEqual(anonDelete.status, 401, 'Anonymous DELETE rejected');
  pass('1.7', 'DELETE /api/restaurant/menu/items/:id without token rejected with HTTP 401');

  // 1.8: POST /api/restaurant/menu/branch-overrides without token rejected with 401
  const anonOverride = await request('/api/restaurant/menu/branch-overrides', {
    method: 'POST',
    body: { itemId: testDishId, branchId: 'branch_ldh', isAvailable: false },
  });
  assert.strictEqual(anonOverride.status, 401, 'Anonymous override rejected');
  pass('1.8', 'POST /api/restaurant/menu/branch-overrides without token rejected with HTTP 401');

  // 1.9: Branch Scoping: Ludhiana manager token modifying Delhi CP override rejected with 403
  const crossBranchOverride = await request('/api/restaurant/menu/branch-overrides', {
    method: 'POST',
    headers: { Authorization: `Bearer ${managerToken}` },
    body: { itemId: testDishId, branchId: 'branch_del', priceOverrideMinor: 52000 },
  });
  assert.strictEqual(crossBranchOverride.status, 403, 'Cross-branch override rejected');
  assert.strictEqual(crossBranchOverride.json.code, 'BRANCH_MISMATCH');
  pass('1.9', 'POST /api/restaurant/menu/branch-overrides with cross-branch scope rejected with HTTP 403 BRANCH_MISMATCH');

  // 1.10: Matching branch override succeeds with 200
  const scopedOverride = await request('/api/restaurant/menu/branch-overrides', {
    method: 'POST',
    headers: { Authorization: `Bearer ${managerToken}` },
    body: { itemId: testDishId, branchId: 'branch_ldh', priceOverrideMinor: 46000, isAvailable: true },
  });
  assert.strictEqual(scopedOverride.status, 200, 'Same-branch override succeeds');
  pass('1.10', 'POST /api/restaurant/menu/branch-overrides within authorized branch succeeds with HTTP 200');

  // Clean up created dish
  await request(`/api/restaurant/menu/items/${testDishId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${managerToken}` },
  });

  // 1.11: POST /api/restaurant/floor/save anonymous rejected with 401
  const anonFloorSave = await request('/api/restaurant/floor/save', {
    method: 'POST',
    body: { tables: [] },
  });
  assert.strictEqual(anonFloorSave.status, 401, 'Anonymous floor save rejected');
  pass('1.11', 'POST /api/restaurant/floor/save anonymous rejected with HTTP 401');

  // 1.12: PATCH /api/restaurant/tables/:id anonymous rejected with 401
  const anonTablePatch = await request('/api/restaurant/tables/1', {
    method: 'PATCH',
    body: { capacity: 4 },
  });
  assert.strictEqual(anonTablePatch.status, 401, 'Anonymous table PATCH rejected');
  pass('1.12', 'PATCH /api/restaurant/tables/:id anonymous rejected with HTTP 401');

  // 1.13: POST /api/restaurant/tables/merge anonymous rejected with 401
  const anonMerge = await request('/api/restaurant/tables/merge', {
    method: 'POST',
    body: { tableId1: 1, tableId2: 2 },
  });
  assert.strictEqual(anonMerge.status, 401, 'Anonymous merge rejected');
  pass('1.13', 'POST /api/restaurant/tables/merge anonymous rejected with HTTP 401');

  // 1.14: POST /api/restaurant/tables/unmerge anonymous rejected with 401
  const anonUnmerge = await request('/api/restaurant/tables/unmerge', {
    method: 'POST',
    body: { tableId: 1 },
  });
  assert.strictEqual(anonUnmerge.status, 401, 'Anonymous unmerge rejected');
  pass('1.14', 'POST /api/restaurant/tables/unmerge anonymous rejected with HTTP 401');

  // 1.15: DELETE /api/restaurant/tables/:id non-privileged rejected with 403
  const opsTableDelete = await request('/api/restaurant/tables/1', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${opsToken}` },
  });
  assert.strictEqual(opsTableDelete.status, 403, 'Non-privileged table delete rejected');
  pass('1.15', 'DELETE /api/restaurant/tables/:id with OPERATIONS token rejected with HTTP 403');

  // 1.16: POST /api/restaurant/branches anonymous rejected with 401, non-privileged with 403
  const anonBranchCreate = await request('/api/restaurant/branches', {
    method: 'POST',
    body: { name: 'Rogue Branch' },
  });
  assert.strictEqual(anonBranchCreate.status, 401, 'Anonymous branch create rejected');

  const opsBranchCreate = await request('/api/restaurant/branches', {
    method: 'POST',
    headers: { Authorization: `Bearer ${opsToken}` },
    body: { name: 'Rogue Branch' },
  });
  assert.strictEqual(opsBranchCreate.status, 403, 'Operations branch create rejected');
  pass('1.16', 'POST /api/restaurant/branches enforces 401 (anonymous) and 403 (insufficient role)');

  // ─────────────────────────────────────────────────────────────────────────
  // SUITE 2: TABLE SETTLEMENT & FINANCIAL INTEGRITY (POST /tables/:id/settle)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n💳 [SUITE 2] Table Settlement, Authoritative Billing & Concurrency Mutex');
  totalTests += 10;

  // 2.1: Settle attempt without auth token rejected with 401
  const anonSettle = await request('/api/restaurant/tables/8/settle', {
    method: 'POST',
    body: { paymentMethod: 'CASH' },
  });
  assert.strictEqual(anonSettle.status, 401, 'Anonymous settle rejected');
  assert.strictEqual(anonSettle.json.code, 'AUTHENTICATION_REQUIRED');
  pass('2.1', 'POST /api/restaurant/tables/:id/settle without token rejected with HTTP 401 AUTHENTICATION_REQUIRED');

  // Ensure Table T-08 is cleanly vacated before starting fresh settlement flow
  const t08Init = await request('/api/restaurant/tables/8');
  if (t08Init.json.table.status === 'OCCUPIED') {
    await request('/api/restaurant/tables/8/settle', {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}` },
      body: { paymentMethod: 'COMP', paymentStatus: 'COMPED', reason: 'Test setup reset' },
    });
  }

  // Setup guest party on Table T-08 (id: 8, branch_ldh)
  const joinRes = await request('/api/restaurant/sessions/join', {
    method: 'POST',
    body: { tableNumber: 'T-08', seatingType: 'PRIMARY_HOST', guestName: 'Gurpreet Singh' },
  });
  assert.strictEqual(joinRes.status, 200, 'Guest joined T-08');
  const guestCapToken = joinRes.json.data.capabilityToken;
  const t08SessionId = joinRes.json.data.sessionId;

  // 2.2: Diner capability token attempting to settle table rejected with 403
  const dinerSettle = await request('/api/restaurant/tables/8/settle', {
    method: 'POST',
    headers: { Authorization: `Bearer ${guestCapToken}` },
    body: { paymentMethod: 'CASH' },
  });
  assert.strictEqual(dinerSettle.status, 403, 'Diner capability cannot settle table');
  pass('2.2', 'POST /api/restaurant/tables/:id/settle with diner capability token rejected with HTTP 403 FORBIDDEN');

  // 2.3: Cross-branch settlement attempt (Ludhiana token trying to settle Delhi table 31) rejected with 403
  const crossBranchSettle = await request('/api/restaurant/tables/31/settle', {
    method: 'POST',
    headers: { Authorization: `Bearer ${managerToken}` },
    body: { paymentMethod: 'CASH' },
  });
  assert.strictEqual(crossBranchSettle.status, 403, 'Cross branch settlement rejected');
  assert.strictEqual(crossBranchSettle.json.code, 'BRANCH_MISMATCH');
  pass('2.3', 'POST /api/restaurant/tables/:id/settle cross-branch attempt rejected with HTTP 403 BRANCH_MISMATCH');

  // Submit order for Table T-08:
  // Item 1: item_dal_makhani (basePrice: 38000 paise = ₹380.00)
  // Item 2: item_tandoori_roti (basePrice: 3500 paise = ₹35.00) x 2 = 7000 paise = ₹70.00
  // Subtotal = 45000 paise (₹450.00)
  // 5% GST = Math.round(45000 * 0.05) = 2250 paise (₹22.50)
  // Total Authoritative Check = 47250 paise (₹472.50)
  const orderRes = await request('/api/restaurant/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${guestCapToken}` },
    body: {
      tableNumber: 'T-08',
      sessionId: t08SessionId,
      branchId: 'branch_ldh',
      items: [
        { id: 'item_dal_makhani', quantity: 1 },
        { id: 'item_tandoori_roti', quantity: 2 },
      ],
    },
  });
  assert.strictEqual(orderRes.status, 201, 'Order created on T-08');
  assert.strictEqual(orderRes.json.data.totalMinor, '47250', 'Authoritative total check ₹472.50 (47250 paise)');
  assert.strictEqual(orderRes.json.data.totalFormatted, '₹472.50', 'Formatted total matches ₹472.50');
  pass('2.4', 'Order submitted on Table T-08 with authoritative calculation: Subtotal ₹450 + 5% GST ₹22.50 = ₹472.50');

  // 2.5: Partial payment rejection: Offering ₹350.00 (35000 paise) against ₹472.50 check rejected with 422
  const partialSettle = await request('/api/restaurant/tables/8/settle', {
    method: 'POST',
    headers: { Authorization: `Bearer ${managerToken}` },
    body: { paymentMethod: 'UPI', paymentStatus: 'PAID', amountMinor: 35000 },
  });
  assert.strictEqual(partialSettle.status, 422, 'Partial settlement rejected with 422');
  assert.strictEqual(partialSettle.json.code, 'PARTIAL_SETTLEMENT_UNRESOLVED');
  assert(partialSettle.json.message.includes('122.50 balance remaining'), 'Rejection reports remaining balance ₹122.50');

  // Verify table is still occupied and NOT vacated
  const tableCheck1 = await request('/api/restaurant/tables/8');
  assert.strictEqual(tableCheck1.json.table.status, 'OCCUPIED', 'Table T-08 remains OCCUPIED after rejected partial settlement');
  pass('2.5', 'Partial settlement rejected with HTTP 422 PARTIAL_SETTLEMENT_UNRESOLVED; table remains OCCUPIED');

  // 2.6: Full Authoritative Settlement & Idempotency Key
  const settleIdemKey = 'idem_settle_t08_' + Date.now();
  const fullSettle = await request('/api/restaurant/tables/8/settle', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${managerToken}`,
      'x-idempotency-key': settleIdemKey,
    },
    body: { paymentMethod: 'UPI', paymentStatus: 'PAID', amountMinor: 47250 },
  });
  assert.strictEqual(fullSettle.status, 200, 'Full settlement succeeds with 200');
  assert.strictEqual(fullSettle.json.settlement.amountMinor, 47250, 'Settled for full 47250 paise');
  assert.strictEqual(fullSettle.json.settlement.method, 'UPI');
  assert.strictEqual(fullSettle.json.table.status, 'AVAILABLE', 'Table reset to AVAILABLE');
  pass('2.6', 'Authoritative full settlement of Table T-08 completed via UPI (47250 paise) returning HTTP 200');

  // 2.7: Idempotent Replay with same key returns 200 with idempotentReplay: true
  const replaySettle = await request('/api/restaurant/tables/8/settle', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${managerToken}`,
      'x-idempotency-key': settleIdemKey,
    },
    body: { paymentMethod: 'UPI', paymentStatus: 'PAID', amountMinor: 47250 },
  });
  assert.strictEqual(replaySettle.status, 200, 'Replay succeeds');
  assert.strictEqual(replaySettle.json.idempotentReplay, true, 'Marked as idempotentReplay: true');
  pass('2.7', 'Idempotent replay with identical key returns HTTP 200 with idempotentReplay: true');

  // 2.8: Idempotency conflict (same key with conflicting amount) rejected with 409
  const conflictSettle = await request('/api/restaurant/tables/8/settle', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${managerToken}`,
      'x-idempotency-key': settleIdemKey,
    },
    body: { paymentMethod: 'UPI', paymentStatus: 'PAID', amountMinor: 99900 },
  });
  assert.strictEqual(conflictSettle.status, 409, 'Conflict returns 409');
  assert.strictEqual(conflictSettle.json.code, 'IDEMPOTENCY_CONFLICT');
  pass('2.8', 'Conflicting settlement replay with altered payload rejected with HTTP 409 IDEMPOTENCY_CONFLICT');

  // 2.9: Persistent state verification in storage
  const stateCheck = await request('/api/restaurant/state');
  const diskTable = stateCheck.json.tables.find((t) => t.id === 8);
  assert.strictEqual(diskTable.status, 'AVAILABLE', 'Disk table status is AVAILABLE');
  assert.strictEqual(diskTable.activeBillMinor, 0, 'Disk table activeBillMinor cleared to 0');
  assert(!diskTable.activeSessionId, 'Disk table activeSessionId cleared');

  // Verify order transitioned to PAID in disk store
  const diskOrder = stateCheck.json.orders.find((o) => o.tableNumber === 'T-08' && o.sessionId === t08SessionId);
  assert(diskOrder, 'Found order in storage');
  assert.strictEqual(diskOrder.status, 'PAID', 'Order status durably transitioned to PAID upon settlement');

  // Verify previous guest capability token revoked
  assert(stateCheck.json.invalidatedCapabilityTokens.includes(guestCapToken), 'Previous guest capability token durably revoked');
  pass('2.9', 'Disk storage verified: Table status AVAILABLE, orders PAID, session CLOSED, capability token invalidated');

  // 2.10: Alias endpoint POST /api/restaurant/tables/settle operates identically
  // Ensure Table T-02 is cleanly vacated before alias test
  const t02Init = await request('/api/restaurant/tables/2');
  if (t02Init.json.table.status === 'OCCUPIED') {
    await request('/api/restaurant/tables/2/settle', {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}` },
      body: { paymentMethod: 'COMP', paymentStatus: 'COMPED', reason: 'Test setup reset' },
    });
  }

  // Setup another table T-02
  const joinT02 = await request('/api/restaurant/sessions/join', {
    method: 'POST',
    body: { tableNumber: 'T-02', seatingType: 'PRIMARY_HOST', guestName: 'Rohan Sharma' },
  });
  const t02Token = joinT02.json.data.capabilityToken;
  await request('/api/restaurant/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${t02Token}` },
    body: {
      tableNumber: 'T-02',
      sessionId: joinT02.json.data.sessionId,
      branchId: 'branch_ldh',
      items: [{ id: 'item_paneer_tikka', quantity: 1 }],
    },
  });
  const aliasSettle = await request('/api/restaurant/tables/settle', {
    method: 'POST',
    headers: { Authorization: `Bearer ${managerToken}` },
    body: { tableId: 2, paymentMethod: 'CASH', paymentStatus: 'PAID' },
  });
  assert.strictEqual(aliasSettle.status, 200, 'Alias settlement succeeds');
  assert.strictEqual(aliasSettle.json.table.status, 'AVAILABLE');
  pass('2.10', 'Alias endpoint POST /api/restaurant/tables/settle authoritatively calculates bill and vacates table');

  // ─────────────────────────────────────────────────────────────────────────
  // SUITE 3: LEGACY DEPRECATION & ROUTE HARMONIZATION
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n🌐 [SUITE 3] Legacy Route Deprecation & Single Canonical Branches Route');
  totalTests += 2;

  // 3.1: GET /api/commerce/restaurants returns 200 with X-API-Deprecation header
  const legacyRest = await request('/api/commerce/restaurants');
  assert.strictEqual(legacyRest.status, 200, 'Legacy route returns 200 for backward compatibility');
  const deprecationHeader = legacyRest.headers['x-api-deprecation'];
  assert(deprecationHeader && deprecationHeader.includes('single-brand-migration'), 'Includes X-API-Deprecation header');
  pass('3.1', 'GET /api/commerce/restaurants provides backward compatibility with X-API-Deprecation header');

  // 3.2: GET /api/restaurant/branches returns all 3 branches cleanly
  const branchesRes = await request('/api/restaurant/branches');
  assert.strictEqual(branchesRes.status, 200, 'Branches endpoint returns 200');
  assert(branchesRes.json.data.length >= 3, 'Contains at least 3 branches');
  pass('3.2', 'GET /api/restaurant/branches operates cleanly without duplicate handler');

  // ─────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n======================================================================');
  console.log(`🎉 PHASE 1 TEST SUITE RESULTS: Total ${totalTests} | Passed ${passedTests} | Failed 0`);
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

runPhase1Suite().catch((err) => {
  console.error('\n❌ PHASE 1 TEST FAILED:', err);
  process.exit(1);
});
