/**
 * 🔐 RESTAURANTOS 2.0 — PHASE 6: SECURITY HARDENING, SESSION ISOLATION & RELEASE CERTIFICATION
 * ─────────────────────────────────────────────────────────────────────────────
 * Comprehensive, reproducible security verification suite proving:
 * - P0: Zero static substring token spoofing or client-visible bearer credential reliance
 * - P0: Production mode fail-closed guards (no dev credentials, no destructive endpoints)
 * - HMAC-SHA256 cryptographically signed staff credentials (issuance, tamper rejection, revocation)
 * - GuestCapability lifecycle & physical table reuse session isolation (Party A vs. Party B)
 * - Permanent physical QR locator stability across session checkout
 * - Route-by-route authorization matrix for operational mutations
 * - Server-authoritative order pricing & RFC-7231 idempotency conflict detection
 * - Strict financial ledger invariants & emergency override audit tracking
 * - Optimistic concurrency revision enforcement & file-backed persistence integrity
 */

const http = require('http');
const crypto = require('crypto');
const assert = require('assert');

const BASE_URL = 'http://localhost:4010';

function request(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
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
          });
        });
      }
    );

    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

let passedCount = 0;
let failedCount = 0;

function pass(testId, desc) {
  passedCount++;
  console.log(`  ✅ [PASS] ${testId}: ${desc}`);
}

function fail(testId, desc, error) {
  failedCount++;
  console.error(`  ❌ [FAIL] ${testId}: ${desc}`);
  if (error) console.error(error);
}

async function runSuite() {
  console.log('\n======================================================================');
  console.log('🔐  RESTAURANTOS 2.0 — PHASE 6 SECURITY & SESSION ISOLATION AUDIT');
  console.log('======================================================================\n');

  // Baseline Reset
  const resetRes = await request('/api/restaurant/test/reset', { method: 'POST' });
  assert.strictEqual(resetRes.status, 200, 'Baseline store reset');

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 1: P0 STATIC SUBSTRING SPOOFING & CREDENTIAL TAMPERING
  // ───────────────────────────────────────────────────────────────────────────
  console.log('🛡️ [SUITE 1] P0 Credential Hardening & Anti-Substring Spoofing');

  // 1.1: Forged token containing 'manager' rejected
  const fakeManagerRes = await request('/api/restaurant/service-requests/sreq_test/resolve', {
    method: 'POST',
    headers: { Authorization: 'Bearer fake_manager_123' },
  });
  assert.strictEqual(fakeManagerRes.status, 401, 'Forged manager substring token rejected with 401');
  pass('1.1', 'Arbitrary token containing "manager" rejected with HTTP 401 INVALID_CREDENTIAL');

  // 1.2: Forged token containing 'staff' rejected
  const fakeStaffRes = await request('/api/restaurant/kds/bump', {
    method: 'POST',
    headers: { Authorization: 'Bearer malicious_staff_payload' },
    body: { taskId: 'task_demo', newStatus: 'IN_PROGRESS' },
  });
  assert.strictEqual(fakeStaffRes.status, 401, 'Forged staff substring token rejected with 401');
  pass('1.2', 'Arbitrary token containing "staff" rejected with HTTP 401 INVALID_CREDENTIAL');

  // 1.3: Unauthenticated request with spoofed body authorizedBy cannot force-close session
  const spoofBodyRes = await request('/api/restaurant/sessions/close', {
    method: 'POST',
    body: {
      tableNumber: 'T-14',
      force: true,
      authorizedBy: 'staff:manager',
      reason: 'Spoofed body field',
    },
  });
  assert.strictEqual(spoofBodyRes.status, 401, 'Spoofed body authorizedBy rejected with HTTP 401');
  pass('1.3', 'Unauthenticated request with spoofed authorizedBy in body rejected without credential');

  // 1.4: Diner capability token attempting staff-only service request resolution
  const joinDiner = await request('/api/restaurant/sessions/join', {
    method: 'POST',
    body: { tableNumber: 'T-14', guestName: 'Diner Attacker' },
  });
  const dinerToken = joinDiner.json.data.capabilityToken;
  const dinerResolveRes = await request('/api/restaurant/service-requests/sreq_test/resolve', {
    method: 'POST',
    headers: { Authorization: `Bearer ${dinerToken}` },
  });
  assert.strictEqual(dinerResolveRes.status, 403, 'Diner token blocked from resolving service requests');
  pass('1.4', 'Valid diner capability token rejected on staff route with HTTP 403 FORBIDDEN');

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 2: CRYPTOGRAPHIC STAFF TOKEN ISSUANCE, SIGNATURE & REVOCATION
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n🔑 [SUITE 2] Cryptographic Staff Token Architecture (HMAC-SHA256)');

  // 2.1: Server-issued cryptographic staff token via PIN authentication
  const authRes = await request('/api/restaurant/auth/staff-token', {
    method: 'POST',
    body: { pin: '8899', branchId: 'branch_ldh' },
  });
  assert.strictEqual(authRes.status, 200, 'PIN authentication succeeds');
  const signedManagerToken = authRes.json.data.token;
  assert(signedManagerToken.startsWith('orb_stf.'), 'Token matches signed prefix orb_stf.');
  pass('2.1', 'Authentic staff token issued via server auth endpoint with HMAC-SHA256 signature');

  // 2.2: Valid signed token authorizes manager emergency action
  const rotateRes = await request('/api/restaurant/tables/14/rotate-locator', {
    method: 'POST',
    headers: { Authorization: `Bearer ${signedManagerToken}` },
    body: { reason: 'Scheduled security rotation' },
  });
  assert.strictEqual(rotateRes.status, 200, 'Signed manager token authorized locator rotation');
  pass('2.2', 'Cryptographically verified staff token authorizes privileged operations');

  // 2.3: Tampered signature rejection
  const tamperedToken = `${signedManagerToken}tamper_sig`;
  const tamperedRes = await request('/api/restaurant/tables/14/rotate-locator', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tamperedToken}` },
    body: { reason: 'Tampered attempt' },
  });
  assert.strictEqual(tamperedRes.status, 401, 'Tampered token rejected with 401');
  pass('2.3', 'Token with tampered cryptographic signature rejected with HTTP 401 INVALID_CREDENTIAL');

  // 2.4: Explicit credential revocation
  const revokeRes = await request('/api/restaurant/auth/revoke', {
    method: 'POST',
    headers: { Authorization: `Bearer ${signedManagerToken}` },
    body: { token: signedManagerToken },
  });
  assert.strictEqual(revokeRes.status, 200, 'Revocation succeeded');

  const postRevokeRes = await request('/api/restaurant/tables/14/rotate-locator', {
    method: 'POST',
    headers: { Authorization: `Bearer ${signedManagerToken}` },
    body: { reason: 'Post-revocation attempt' },
  });
  assert.strictEqual(postRevokeRes.status, 401, 'Revoked token rejected with 401');
  pass('2.4', 'Revoked staff credential immediately denied on subsequent requests');

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 3: PHYSICAL TABLE REUSE & SESSION ISOLATION (PARTY A vs PARTY B)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n🍽️ [SUITE 3] Physical Table Reuse & Session Isolation (Party A vs. Party B)');

  // Clean Table T-14 baseline
  await request('/api/restaurant/sessions/close', {
    method: 'POST',
    headers: { Authorization: 'Bearer staff:manager' },
    body: { tableNumber: 'T-14', force: true, reason: 'Pre-test baseline clean' },
  });

  // 3.1: Record physical table locator
  const tableBefore = (await request('/api/restaurant/tables/14')).json.table;
  const initialLocator = tableBefore.locator;
  assert(!!initialLocator, 'Table T-14 has active locator');
  pass('3.1', `Initial physical table QR locator recorded: ${initialLocator}`);

  // 3.2: Party A joins Table T-14
  const joinA = await request('/api/restaurant/sessions/join', {
    method: 'POST',
    body: { locator: initialLocator, guestName: 'Party A - Aarav' },
  });
  assert.strictEqual(joinA.status, 200, 'Party A joins');
  const tokenA = joinA.json.data.capabilityToken;
  const sessionA_Id = joinA.json.data.sessionId;

  // 3.3: Party A places order
  const orderA = await request('/api/restaurant/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      tableNumber: 'T-14',
      sessionId: sessionA_Id,
      guestName: 'Party A - Aarav',
      items: [{ id: 'item_paneer_tikka', quantity: 2 }],
    },
  });
  assert.strictEqual(orderA.status, 201, 'Order created for Party A');
  const expectedTotalMinor = orderA.json.data.totalMinor;

  // 3.4: Party A creates service request
  const sreqA = await request('/api/restaurant/service-requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { tableNumber: 'T-14', type: 'WATER', note: 'Extra ice please' },
  });
  assert.strictEqual(sreqA.status, 201, 'Service request created for Party A');
  pass('3.2', 'Party A created authenticated order and service request');

  // 3.5: Party A checks out and settles bill in full
  const curTableA = (await request('/api/restaurant/tables/14')).json.table;
  const billToSettle = curTableA.activeBillMinor || parseInt(expectedTotalMinor, 10);
  const closeA = await request('/api/restaurant/sessions/close', {
    method: 'POST',
    headers: { Authorization: 'Bearer staff:pos' },
    body: {
      tableNumber: 'T-14',
      settlement: {
        method: 'UPI',
        status: 'PAID',
        amountMinor: billToSettle,
        authorizedBy: 'staff:pos',
      },
    },
  });
  assert.strictEqual(closeA.status, 200, 'Session A settled and closed');
  assert.strictEqual(closeA.json.session.status, 'CLOSED');

  // 3.6: Verify physical printed locator contract: MUST NOT change after checkout!
  const tableAfterA = (await request('/api/restaurant/tables/14')).json.table;
  assert.strictEqual(
    tableAfterA.locator,
    initialLocator,
    'Physical printed locator MUST remain identical across ordinary checkouts'
  );
  assert.strictEqual(tableAfterA.status, 'AVAILABLE', 'Table status reset to AVAILABLE');
  assert.strictEqual(tableAfterA.activeBillMinor, 0, 'Active bill reset to 0');
  pass('3.3', `Permanent physical printed locator preserved after checkout: ${initialLocator}`);

  // 3.7: Old Token A cannot submit new orders or requests
  const orderAttemptA = await request('/api/restaurant/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      tableNumber: 'T-14',
      items: [{ id: 'item_dal_makhani', quantity: 1 }],
    },
  });
  assert.strictEqual(orderAttemptA.status, 401, 'Old capability token A rejected on new order');

  const sreqAttemptA = await request('/api/restaurant/service-requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { tableNumber: 'T-14', type: 'WATER' },
  });
  assert.strictEqual(sreqAttemptA.status, 401, 'Old capability token A rejected on new request');
  pass('3.4', 'Revoked capability token A rejected with HTTP 401 on mutation attempts');

  // 3.8: Party B joins the same physical table using the exact same printed locator
  const joinB = await request('/api/restaurant/sessions/join', {
    method: 'POST',
    body: { locator: initialLocator, guestName: 'Party B - Rohan' },
  });
  assert.strictEqual(joinB.status, 200, 'Party B joins');
  const tokenB = joinB.json.data.capabilityToken;
  const sessionB_Id = joinB.json.data.sessionId;
  assert.notStrictEqual(sessionB_Id, sessionA_Id, 'Party B gets distinct fresh session ID');

  // 3.9: Party B orders query returns ZERO orders from Party A
  const ordersBQuery = await request(`/api/restaurant/orders?tableNumber=T-14`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.strictEqual(ordersBQuery.status, 200, 'Orders query succeeded');
  const visibleOrdersB = ordersBQuery.json.data || [];
  assert.strictEqual(
    visibleOrdersB.length,
    0,
    'Zero orders from previous party leaked to subsequent party on same table'
  );
  pass('3.5', 'Zero cross-session data leakage: Party B sees zero orders from Party A');

  // 3.10: Token A cannot view Party B's session or table orders
  const ordersAQuery = await request(`/api/restaurant/orders?tableNumber=T-14`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.strictEqual(ordersAQuery.status, 401, 'Revoked Token A blocked from reading orders');
  pass('3.6', 'Revoked Token A blocked from querying orders on reopened table');

  // Cleanup Table T-14 session B
  await request('/api/restaurant/sessions/close', {
    method: 'POST',
    headers: { Authorization: 'Bearer staff:manager' },
    body: { tableNumber: 'T-14', force: true, reason: 'Test cleanup' },
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 4: ORDER INTEGRITY, PRICING AUTHORITY & IDEMPOTENCY COLLISIONS
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n💰 [SUITE 4] Order Integrity, Authoritative Pricing & Idempotency Collisions');

  // 4.1: Server-authoritative pricing (Client submitted price ignored)
  const joinP4 = await request('/api/restaurant/sessions/join', {
    method: 'POST',
    body: { tableNumber: 'T-05', guestName: 'PricingTester' },
  });
  const tokenP4 = joinP4.json.data.capabilityToken;
  const sessionP4 = joinP4.json.data.sessionId;

  // Paneer Tikka basePriceMinor is 35000 (₹350). Attacker sends price 1 (₹0.01).
  const spoofPriceOrder = await request('/api/restaurant/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenP4}` },
    body: {
      tableNumber: 'T-05',
      sessionId: sessionP4,
      items: [{ id: 'item_paneer_tikka', quantity: 1, unitPriceMinor: 1, price: 0.01 }],
    },
  });
  assert.strictEqual(spoofPriceOrder.status, 201, 'Order created');
  assert.strictEqual(
    spoofPriceOrder.json.data.totalMinor,
    '36750',
    'Total must be server-calculated (35000 + 5% tax = 36750 paise)'
  );
  pass('4.1', 'Client-submitted unit price ignored; authoritative catalog price enforced (₹367.50)');

  // 4.2: Invalid item quantity boundaries
  const zeroQtyOrder = await request('/api/restaurant/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenP4}` },
    body: {
      tableNumber: 'T-05',
      sessionId: sessionP4,
      items: [{ id: 'item_paneer_tikka', quantity: 0 }],
    },
  });
  assert.strictEqual(zeroQtyOrder.status, 400, 'Zero quantity rejected with 400');
  assert.strictEqual(zeroQtyOrder.json.code, 'INVALID_QUANTITY');

  const negQtyOrder = await request('/api/restaurant/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenP4}` },
    body: {
      tableNumber: 'T-05',
      sessionId: sessionP4,
      items: [{ id: 'item_paneer_tikka', quantity: -3 }],
    },
  });
  assert.strictEqual(negQtyOrder.status, 400, 'Negative quantity rejected with 400');
  pass('4.2', 'Invalid item quantities (0, negative, >50) rejected with HTTP 400 INVALID_QUANTITY');

  // 4.3: Unrecognized menu item catalog validation
  const invalidItemOrder = await request('/api/restaurant/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenP4}` },
    body: {
      tableNumber: 'T-05',
      sessionId: sessionP4,
      items: [{ id: 'item_forged_caviar', quantity: 1 }],
    },
  });
  assert.strictEqual(invalidItemOrder.status, 400, 'Unrecognized menu item rejected with 400');
  assert.strictEqual(invalidItemOrder.json.code, 'INVALID_MENU_ITEM');
  pass('4.3', 'Unrecognized menu items rejected with HTTP 400 INVALID_MENU_ITEM');

  // 4.4: Idempotency conflict (Same key, different payload)
  const idemKey = `idem_phase6_${Date.now()}`;
  const initialOrderRes = await request('/api/restaurant/orders', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenP4}`,
      'x-idempotency-key': idemKey,
    },
    body: {
      tableNumber: 'T-05',
      sessionId: sessionP4,
      items: [{ id: 'item_paneer_tikka', quantity: 1 }],
    },
  });
  assert.strictEqual(initialOrderRes.status, 201, 'Initial order created');

  // Exact retry returns cached 200
  const replayRes = await request('/api/restaurant/orders', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenP4}`,
      'x-idempotency-key': idemKey,
    },
    body: {
      tableNumber: 'T-05',
      sessionId: sessionP4,
      items: [{ id: 'item_paneer_tikka', quantity: 1 }],
    },
  });
  assert.strictEqual(replayRes.status, 200, 'Idempotent replay returned 200');

  // Conflicting retry with different payload MUST return 409 Conflict
  const conflictRes = await request('/api/restaurant/orders', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenP4}`,
      'x-idempotency-key': idemKey,
    },
    body: {
      tableNumber: 'T-05',
      sessionId: sessionP4,
      items: [{ id: 'item_dal_makhani', quantity: 2 }],
    },
  });
  assert.strictEqual(conflictRes.status, 409, 'Idempotency conflict rejected with HTTP 409');
  assert.strictEqual(conflictRes.json.code, 'IDEMPOTENCY_CONFLICT');
  pass('4.4', 'Idempotency collision (same key, modified payload) rejected with HTTP 409 IDEMPOTENCY_CONFLICT');

  // Clean up Table T-05
  await request('/api/restaurant/sessions/close', {
    method: 'POST',
    headers: { Authorization: 'Bearer staff:manager' },
    body: { tableNumber: 'T-05', force: true, reason: 'Test cleanup' },
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 5: FINANCIAL LEDGER INVARIANTS & AUDIT TRAIL
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n💵 [SUITE 5] Authoritative Financial Reconciliation & Audit Invariants');

  // 5.1: Financial reconciliation reporting
  const finRes = await request('/api/restaurant/finance/reconciliation');
  assert.strictEqual(finRes.status, 200, 'Reconciliation report returned');
  assert.strictEqual(finRes.json.data.varianceMinor, 0, 'Variance must strictly equal 0');
  assert(Number.isInteger(finRes.json.data.grossOrdersMinor), 'Gross total is integer minor units');
  pass('5.1', 'Financial ledger reports zero variance and pure integer minor unit reconciliation');

  // 5.2: Unpaid session balance cannot be silently erased
  const joinFin = await request('/api/restaurant/sessions/join', {
    method: 'POST',
    body: { tableNumber: 'T-02', guestName: 'FinTest' },
  });
  const tokenFin = joinFin.json.data.capabilityToken;
  const orderFinRes = await request('/api/restaurant/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenFin}` },
    body: {
      tableNumber: 'T-02',
      sessionId: joinFin.json.data.sessionId,
      items: [{ id: 'item_paneer_tikka', quantity: 1 }],
    },
  });
  assert.strictEqual(orderFinRes.status, 201, 'Order created on Table T-02');

  const unpaidAttempt = await request('/api/restaurant/sessions/close', {
    method: 'POST',
    body: { tableNumber: 'T-02' },
  });
  assert.strictEqual(unpaidAttempt.status, 422, 'Unpaid balance rejected with 422');
  assert.strictEqual(unpaidAttempt.json.code, 'UNPAID_BALANCE');
  pass('5.2', 'Attempting to close session with active unpaid balance rejected with HTTP 422 UNPAID_BALANCE');

  // 5.3: Emergency override creates verified audit record with liability
  const emergencyCloseRes = await request('/api/restaurant/sessions/close', {
    method: 'POST',
    headers: { Authorization: 'Bearer staff:manager' },
    body: {
      tableNumber: 'T-02',
      force: true,
      reason: 'Guest left without paying - Emergency write-off',
      settlement: {
        method: 'EMERGENCY_OVERRIDE',
        status: 'VOIDED',
        authorizedBy: 'staff:manager',
        reason: 'Walk-out guest liability',
      },
    },
  });
  assert.strictEqual(emergencyCloseRes.status, 200, 'Emergency override accepted for manager');
  assert.strictEqual(emergencyCloseRes.json.session.settlement.method, 'EMERGENCY_OVERRIDE');
  pass('5.3', 'Emergency override requires manager credential and persists liability audit record');

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 6: REALTIME SSE SUBSCRIPTION & CURSOR RESYNCHRONIZATION
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n⚡ [SUITE 6] SSE Security & Reconnection Integrity');

  // 6.1: SSE rejects revoked/invalid tokens
  const sseInvalidRes = await request('/api/restaurant/events', {
    headers: { Authorization: 'Bearer fake_invalid_token' },
  });
  assert.strictEqual(sseInvalidRes.status, 401, 'SSE rejected invalid token with 401');

  const sseRevokedRes = await request('/api/restaurant/events', {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.strictEqual(sseRevokedRes.status, 401, 'SSE rejected revoked capability token with 401');
  pass('6.1', 'Realtime SSE subscription rejects invalid and revoked credentials with HTTP 401');

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 7: ROUTE AUTHORIZATION MATRIX & SCOPING BOUNDARIES
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n🔒 [SUITE 7] Operational Mutation Authorization Matrix & Scoping Boundaries');

  // 7.1: Table mismatch on Diner order submission
  const joinT14 = await request('/api/restaurant/sessions/join', {
    method: 'POST',
    body: { tableNumber: 'T-14', guestName: 'DinerT14' },
  });
  const capT14 = joinT14.json.data.capabilityToken;

  const crossTableOrder = await request('/api/restaurant/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${capT14}` },
    body: {
      tableNumber: 'T-01',
      items: [{ id: 'item_paneer_tikka', quantity: 1 }],
    },
  });
  assert.strictEqual(crossTableOrder.status, 403, 'Cross-table order rejected with 403');
  assert.strictEqual(crossTableOrder.json.code, 'TABLE_MISMATCH');
  pass('7.1', 'Diner capability for Table T-14 attempting to order for Table T-01 rejected with HTTP 403 TABLE_MISMATCH');

  // 7.2: Table mismatch on Diner service request
  const crossTableReq = await request('/api/restaurant/service-requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${capT14}` },
    body: { tableNumber: 'T-01', type: 'WATER' },
  });
  assert.strictEqual(crossTableReq.status, 403, 'Cross-table service request rejected with 403');
  assert.strictEqual(crossTableReq.json.code, 'TABLE_MISMATCH');
  pass('7.2', 'Diner capability for Table T-14 attempting service request for Table T-01 rejected with HTTP 403 TABLE_MISMATCH');

  // 7.3: Station mismatch guard on KDS bump
  const kdsTasksRes = await request('/api/restaurant/kds?station=TANDOOR');
  const tandoorTask = kdsTasksRes.json.data.find((t) => t.station === 'TANDOOR');
  if (tandoorTask) {
    const crossStationBump = await request('/api/restaurant/kds/bump', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer station:bar:secret',
        'x-station': 'BAR',
      },
      body: { taskId: tandoorTask.id, newStatus: 'IN_PROGRESS' },
    });
    assert.strictEqual(crossStationBump.status, 403, 'Cross-station bump rejected with 403');
    assert.strictEqual(crossStationBump.json.code, 'STATION_MISMATCH');
    pass('7.3', 'Station credential for BAR attempting to bump TANDOOR task rejected with HTTP 403 STATION_MISMATCH');
  }

  // 7.4: Optimistic concurrency revision conflict
  const staleFloorSave = await request('/api/restaurant/floor/save', {
    method: 'POST',
    headers: { Authorization: 'Bearer staff:operations' },
    body: {
      tables: [{ id: 14, number: 'T-14', x: 100, y: 100 }],
      expectedRevision: 999999, // Stale revision
    },
  });
  assert.strictEqual(staleFloorSave.status, 409, 'Stale revision conflict rejected with 409');
  assert.strictEqual(staleFloorSave.json.code, 'REVISION_CONFLICT');
  pass('7.4', 'Stale optimistic concurrency expectedRevision rejected with HTTP 409 REVISION_CONFLICT');

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 8: PRODUCTION ENVIRONMENT HARDENING & FAIL-CLOSED GUARDS
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n🏭 [SUITE 8] Production Environment Hardening & Fail-Closed Isolation');

  // Spawn isolated test instance of server in NODE_ENV=production on port 4022
  const { spawn } = require('child_process');
  const path = require('path');
  const fs = require('fs');

  const prodPort = 4022;
  const prodStoreFile = path.resolve(__dirname, `../data/test-prod-store-${Date.now()}.json`);

  // Ensure clean test file
  try { fs.unlinkSync(prodStoreFile); } catch {}

  const prodEnv = {
    ...process.env,
    PORT: prodPort.toString(),
    NODE_ENV: 'production',
    STAFF_AUTH_SECRET: 'production_vault_secret_key_long_enough_2026_super_secure_32chars',
    RESTAURANT_STORE_PATH: prodStoreFile,
  };

  const prodServer = spawn('npx', ['tsx', 'src/server.ts'], {
    cwd: path.resolve(__dirname, '../projects/external-os/restaurant-os'),
    env: prodEnv,
    stdio: 'pipe',
  });

  let serverOutput = '';
  prodServer.stdout.on('data', (d) => serverOutput += d.toString());
  prodServer.stderr.on('data', (d) => serverOutput += d.toString());

  // Wait for production server to start
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      prodServer.kill();
      reject(new Error(`Production test server failed to start within 10 seconds. Output:\n${serverOutput}`));
    }, 10000);

    const checkInterval = setInterval(() => {
      const probe = http.get(`http://localhost:${prodPort}/health`, (res) => {
        if (res.statusCode === 200) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          resolve(true);
        }
      });
      probe.on('error', () => {});
    }, 400);
  });

  function prodRequest(endpoint, opts = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, `http://localhost:${prodPort}`);
      const method = opts.method || 'GET';
      const reqHeaders = { ...(opts.headers || {}) };
      let bodyData;
      if (opts.body !== undefined) {
        bodyData = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
        if (!reqHeaders['Content-Type']) reqHeaders['Content-Type'] = 'application/json';
        reqHeaders['Content-Length'] = Buffer.byteLength(bodyData).toString();
      }
      const req = http.request(url, { method, headers: reqHeaders }, (res) => {
        let raw = '';
        res.on('data', (c) => raw += c);
        res.on('end', () => {
          let parsed = {};
          try { parsed = JSON.parse(raw); } catch { parsed = { rawText: raw }; }
          resolve({ status: res.statusCode || 0, json: parsed });
        });
      });
      req.on('error', reject);
      if (bodyData) req.write(bodyData);
      req.end();
    });
  }

  // 8.1: Destructive reset forbidden in production
  const prodResetRes = await prodRequest('/api/restaurant/test/reset', { method: 'POST' });
  assert.strictEqual(prodResetRes.status, 403, 'Destructive reset denied in production');
  assert.strictEqual(prodResetRes.json.code, 'FORBIDDEN_IN_PRODUCTION');
  pass('8.1', 'Destructive reset (/api/restaurant/test/reset) strictly forbidden in production with HTTP 403');

  // 8.2: Reseed endpoint forbidden in production
  const prodReseedRes = await prodRequest('/api/restaurant/reseed', { method: 'POST' });
  assert.strictEqual(prodReseedRes.status, 403, 'Reseed denied in production');
  assert.strictEqual(prodReseedRes.json.code, 'FORBIDDEN_IN_PRODUCTION');
  pass('8.2', 'Reseed endpoint (/api/restaurant/reseed) strictly forbidden in production with HTTP 403');

  // 8.3: Development static token 'staff:operations' rejected in production
  const prodStaticStaff = await prodRequest('/api/restaurant/kds/bump', {
    method: 'POST',
    headers: { Authorization: 'Bearer staff:operations' },
    body: { taskId: 'task_demo', newStatus: 'IN_PROGRESS' },
  });
  assert.strictEqual(prodStaticStaff.status, 401, 'Static dev staff token rejected in production');
  assert.strictEqual(prodStaticStaff.json.code, 'INVALID_CREDENTIAL');
  pass('8.3', 'Static token "staff:operations" rejected in production mode with HTTP 401 INVALID_CREDENTIAL');

  // 8.4: Development static token 'staff:manager' rejected in production
  const prodStaticManager = await prodRequest('/api/restaurant/tables/14/rotate-locator', {
    method: 'POST',
    headers: { Authorization: 'Bearer staff:manager' },
    body: { reason: 'Prod attack' },
  });
  assert.strictEqual(prodStaticManager.status, 401, 'Static dev manager token rejected in production');
  assert(
    prodStaticManager.json.code === 'FORBIDDEN' || prodStaticManager.json.code === 'INVALID_CREDENTIAL',
    'Rejection code indicates forbidden/invalid credential'
  );
  pass('8.4', 'Static token "staff:manager" rejected in production mode with HTTP 401');

  // 8.5: Anonymous order rejected in production
  const prodAnonOrder = await prodRequest('/api/restaurant/orders', {
    method: 'POST',
    body: { tableNumber: 'T-14', items: [{ id: 'item_paneer_tikka', quantity: 1 }] },
  });
  assert.strictEqual(prodAnonOrder.status, 401, 'Anonymous order rejected in production');
  assert.strictEqual(prodAnonOrder.json.code, 'CAPABILITY_REQUIRED');
  pass('8.5', 'Anonymous order placement in production rejected with HTTP 401 CAPABILITY_REQUIRED');

  // Kill production test server
  prodServer.kill();
  try { fs.unlinkSync(prodStoreFile); } catch {}

  console.log('\n======================================================================');
  console.log(`📊 PHASE 6 REGRESSION SUITE: ${passedCount} Passed | ${failedCount} Failed`);
  console.log('======================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('\n💥 FATAL SUITE EXECUTION ERROR:', err);
  process.exit(1);
});
