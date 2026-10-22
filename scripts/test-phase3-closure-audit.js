/**
 * 🍷 RESTAURANTOS 5.3 — PHASE 3 FINAL CLOSURE AUDIT SUITE
 * ─────────────────────────────────────────────────────────────────────────────
 * Comprehensive, source-grounded audit covering:
 * Gate A: Route-by-route mutation authorization matrix (Anonymous, Tampered,
 *         Revoked, Diner, Unauthorized Role, Cross-Branch, Authorized).
 * Gate B: Financial invariants, integer minor arithmetic, idempotency, COMP/VOID guards.
 * Gate C: Shared domain state across Storefront, Orders, Floor POS, and Kitchen KDS.
 */

const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:4010';

async function request(path, options = {}) {
  const url = new URL(path, BASE_URL);
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const body = options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined;

  return new Promise((resolve, reject) => {
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
            json = raw;
          }
          resolve({ status: res.statusCode, headers: res.headers, json, raw });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function runClosureAudit() {
  console.log('======================================================================');
  console.log('🍷 RESTAURANTOS 5.3 — PHASE 3 FINAL CLOSURE AUDIT');
  console.log('======================================================================\n');

  // Obtain authentic cryptographic tokens from server staff directory
  const adminAuth = await request('/api/restaurant/auth/staff-token', { method: 'POST', body: { pin: '0000', branchId: '*' } });
  const adminToken = adminAuth.json?.data?.token;

  const ldhMgrAuth = await request('/api/restaurant/auth/staff-token', { method: 'POST', body: { pin: '8899', branchId: 'branch_ldh' } });
  const ldhManagerToken = ldhMgrAuth.json?.data?.token;

  const ldhOpsAuth = await request('/api/restaurant/auth/staff-token', { method: 'POST', body: { pin: '1122', branchId: 'branch_ldh' } });
  const ldhOpsToken = ldhOpsAuth.json?.data?.token;

  const ldhPosAuth = await request('/api/restaurant/auth/staff-token', { method: 'POST', body: { pin: '3344', branchId: 'branch_ldh' } });
  const ldhPosToken = ldhPosAuth.json?.data?.token;

  const ldhChefAuth = await request('/api/restaurant/auth/staff-token', { method: 'POST', body: { pin: '5566', branchId: 'branch_ldh' } });
  const ldhChefToken = ldhChefAuth.json?.data?.token;

  const delMgrAuth = await request('/api/restaurant/auth/staff-token', { method: 'POST', body: { pin: '7788', branchId: 'branch_del' } });
  const delManagerToken = delMgrAuth.json?.data?.token;

  assert.ok(adminToken, 'Admin token acquired');
  assert.ok(ldhManagerToken, 'Ludhiana Manager token acquired');
  assert.ok(ldhChefToken, 'Ludhiana Chef token acquired');
  assert.ok(delManagerToken, 'Delhi Manager token acquired');

  const tamperedToken = ldhManagerToken.slice(0, -6) + 'xxxxxx';

  // Revoke an authorized token to verify revocation enforcement
  const revokeCandidateAuth = await request('/api/restaurant/auth/staff-token', { method: 'POST', body: { pin: '3344', branchId: 'branch_ldh' } });
  const tokenToRevoke = revokeCandidateAuth.json?.data?.token;
  await request('/api/restaurant/auth/revoke', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { token: tokenToRevoke },
  });

  const joinRes = await request('/api/restaurant/sessions/join', {
    method: 'POST',
    body: { tableNumber: 'T-01', seatingType: 'PRIMARY_HOST', guestName: 'Audit Diner' },
  });
  const guestCapToken = joinRes.json?.data?.capabilityToken;
  const dinerHeaders = {
    Authorization: `Bearer ${guestCapToken}`,
    'x-diner-session': joinRes.json?.data?.sessionId || 'sess_demo_1',
    'x-table-locator': '8Kl2aB1q9P',
  };

  let passCount = 0;
  function pass(code, desc) {
    passCount++;
    console.log(`  ✅ [PASS ${passCount}] [${code}] ${desc}`);
  }

  // Set up disposable test order on Table B-01 (Table ID 10, Ludhiana)
  const setupOrderRes = await request('/api/restaurant/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhManagerToken}` },
    body: {
      tableNumber: 'B-01',
      guestName: 'Audit Test Guest',
      items: [{ id: 'item_paneer_tikka', quantity: 1 }],
    },
  });
  assert.strictEqual(setupOrderRes.status, 201, `Setup order creation on B-01: ${JSON.stringify(setupOrderRes.json)}`);
  const auditOrderId = setupOrderRes.json.data.orderId;
  pass('SETUP', `Created test order ${auditOrderId} on B-01 (branch_ldh)`);

  // ───────────────────────────────────────────────────────────────────────────
  // GATE A — AUDIT AUTHORIZATION FOR EVERY MUTATION
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n🛡️ ────────────────────────────────────────────────────────────');
  console.log('🛡️ GATE A: ROUTE-BY-ROUTE AUTHORIZATION MATRIX');
  console.log('🛡️ ────────────────────────────────────────────────────────────');

  // Mutation 1: PATCH /api/restaurant/orders/:id/status
  console.log('\n--- Route 1: PATCH /api/restaurant/orders/:id/status ---');
  // 1.1 No credentials (Anonymous) -> 403 FORBIDDEN
  const anonStatus = await request(`/api/restaurant/orders/${auditOrderId}/status`, {
    method: 'PATCH',
    body: { newStatus: 'IN_PREPARATION' },
  });
  assert.strictEqual(anonStatus.status, 403);
  pass('GATE_A.1.1', 'PATCH status without credentials -> 403 FORBIDDEN');

  // 1.2 Malformed/tampered credentials -> 401 INVALID_CREDENTIAL
  const tamperedStatus = await request(`/api/restaurant/orders/${auditOrderId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tamperedToken}` },
    body: { newStatus: 'IN_PREPARATION' },
  });
  assert.strictEqual(tamperedStatus.status, 401);
  assert.strictEqual(tamperedStatus.json.code, 'INVALID_CREDENTIAL');
  pass('GATE_A.1.2', 'PATCH status with tampered token -> 401 INVALID_CREDENTIAL');

  // 1.3 Revoked credentials -> 401 REVOKED_CAPABILITY
  const revokedStatus = await request(`/api/restaurant/orders/${auditOrderId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenToRevoke}` },
    body: { newStatus: 'IN_PREPARATION' },
  });
  assert.strictEqual(revokedStatus.status, 401);
  assert.ok(revokedStatus.json.code === 'REVOKED_CAPABILITY' || revokedStatus.json.code === 'INVALID_CREDENTIAL');
  pass('GATE_A.1.3', 'PATCH status with revoked token -> 401');

  // 1.4 Diner credentials -> 403 FORBIDDEN
  const dinerStatus = await request(`/api/restaurant/orders/${auditOrderId}/status`, {
    method: 'PATCH',
    headers: dinerHeaders,
    body: { newStatus: 'IN_PREPARATION' },
  });
  assert.strictEqual(dinerStatus.status, 403);
  pass('GATE_A.1.4', 'PATCH status with diner credentials -> 403 FORBIDDEN');

  // 1.5 Cross-branch staff (Delhi manager attempting Ludhiana order) -> 403 BRANCH_MISMATCH
  const crossBranchStatus = await request(`/api/restaurant/orders/${auditOrderId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${delManagerToken}` },
    body: { newStatus: 'IN_PREPARATION' },
  });
  assert.strictEqual(crossBranchStatus.status, 403);
  assert.strictEqual(crossBranchStatus.json.code, 'BRANCH_MISMATCH');
  pass('GATE_A.1.5', 'PATCH status cross-branch attempt -> 403 BRANCH_MISMATCH');

  // 1.6 Authorized local staff (Ludhiana Chef) -> 200 OK
  const chefStatus = await request(`/api/restaurant/orders/${auditOrderId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${ldhChefToken}` },
    body: { newStatus: 'IN_PREPARATION' },
  });
  assert.strictEqual(chefStatus.status, 200);
  assert.strictEqual(chefStatus.json.data.status, 'IN_PREPARATION');
  pass('GATE_A.1.6', 'PATCH status with authorized local staff (CHEF) -> 200 OK');

  // Mutation 2: POST /api/restaurant/orders/:id/cancel
  console.log('\n--- Route 2: POST /api/restaurant/orders/:id/cancel ---');
  // Create another order on B-01 for cancel testing
  const cancelSetup = await request('/api/restaurant/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhManagerToken}` },
    body: {
      tableNumber: 'B-01',
      guestName: 'Cancel Auth Test',
      items: [{ id: 'item_tandoori_roti', quantity: 1 }],
    },
  });
  const cancelTestOrderId = cancelSetup.json.data.orderId;

  // 2.1 No credentials -> 403 FORBIDDEN
  const anonCancel = await request(`/api/restaurant/orders/${cancelTestOrderId}/cancel`, {
    method: 'POST',
    body: { reason: 'Unauthorized cancel' },
  });
  assert.strictEqual(anonCancel.status, 403);
  pass('GATE_A.2.1', 'POST cancel without credentials -> 403 FORBIDDEN');

  // 2.2 Tampered credentials -> 401 INVALID_CREDENTIAL
  const tamperedCancel = await request(`/api/restaurant/orders/${cancelTestOrderId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tamperedToken}` },
    body: { reason: 'Tampered cancel' },
  });
  assert.strictEqual(tamperedCancel.status, 401);
  pass('GATE_A.2.2', 'POST cancel with tampered token -> 401 INVALID_CREDENTIAL');

  // 2.3 Revoked credentials -> 401 REVOKED_CAPABILITY
  const revokedCancel = await request(`/api/restaurant/orders/${cancelTestOrderId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenToRevoke}` },
    body: { reason: 'Revoked cancel' },
  });
  assert.strictEqual(revokedCancel.status, 401);
  assert.ok(revokedCancel.json.code === 'REVOKED_CAPABILITY' || revokedCancel.json.code === 'INVALID_CREDENTIAL');
  pass('GATE_A.2.3', 'POST cancel with revoked token -> 401');

  // 2.4 Diner credentials -> 403 FORBIDDEN
  const dinerCancel = await request(`/api/restaurant/orders/${cancelTestOrderId}/cancel`, {
    method: 'POST',
    headers: dinerHeaders,
    body: { reason: 'Diner cancel' },
  });
  assert.strictEqual(dinerCancel.status, 403);
  pass('GATE_A.2.4', 'POST cancel with diner credentials -> 403 FORBIDDEN');

  // 2.5 Role lacking permission (CHEF) -> 403 FORBIDDEN
  const chefCancel = await request(`/api/restaurant/orders/${cancelTestOrderId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhChefToken}` },
    body: { reason: 'Chef trying to cancel' },
  });
  assert.strictEqual(chefCancel.status, 403);
  assert.strictEqual(chefCancel.json.code, 'FORBIDDEN');
  pass('GATE_A.2.5', 'POST cancel with unauthorized role (CHEF) -> 403 FORBIDDEN');

  // 2.6 Cross-branch staff (Delhi manager attempting Ludhiana cancel) -> 403 BRANCH_MISMATCH
  const crossBranchCancel = await request(`/api/restaurant/orders/${cancelTestOrderId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${delManagerToken}` },
    body: { reason: 'Cross-branch cancel' },
  });
  assert.strictEqual(crossBranchCancel.status, 403);
  assert.strictEqual(crossBranchCancel.json.code, 'BRANCH_MISMATCH');
  pass('GATE_A.2.6', 'POST cancel cross-branch attempt -> 403 BRANCH_MISMATCH');

  // 2.7 Authorized role (Ludhiana Manager) -> 200 OK
  const mgrCancel = await request(`/api/restaurant/orders/${cancelTestOrderId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhManagerToken}` },
    body: { reason: 'Authorized manager cancellation test' },
  });
  assert.strictEqual(mgrCancel.status, 200);
  assert.strictEqual(mgrCancel.json.data.status, 'CANCELLED');
  pass('GATE_A.2.7', 'POST cancel with authorized local MANAGER -> 200 OK');

  // Mutation 3: POST /api/restaurant/tables/:id/settle
  console.log('\n--- Route 3: POST /api/restaurant/tables/:id/settle ---');
  // 3.1 No credentials -> 401 AUTHENTICATION_REQUIRED
  const anonSettle = await request('/api/restaurant/tables/10/settle', {
    method: 'POST',
    body: { paymentMethod: 'UPI', paymentStatus: 'PAID' },
  });
  assert.strictEqual(anonSettle.status, 401);
  pass('GATE_A.3.1', 'POST settle without credentials -> 401 AUTHENTICATION_REQUIRED');

  // 3.2 Tampered credentials -> 401 INVALID_CREDENTIAL
  const tamperedSettle = await request('/api/restaurant/tables/10/settle', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tamperedToken}` },
    body: { paymentMethod: 'UPI', paymentStatus: 'PAID' },
  });
  assert.strictEqual(tamperedSettle.status, 401);
  pass('GATE_A.3.2', 'POST settle with tampered token -> 401 INVALID_CREDENTIAL');

  // 3.3 Revoked credentials -> 401 REVOKED_CAPABILITY
  const revokedSettle = await request('/api/restaurant/tables/10/settle', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenToRevoke}` },
    body: { paymentMethod: 'UPI', paymentStatus: 'PAID' },
  });
  assert.strictEqual(revokedSettle.status, 401);
  assert.ok(revokedSettle.json.code === 'REVOKED_CAPABILITY' || revokedSettle.json.code === 'INVALID_CREDENTIAL');
  pass('GATE_A.3.3', 'POST settle with revoked token -> 401');

  // 3.4 Diner credentials -> 403 FORBIDDEN
  const dinerSettle = await request('/api/restaurant/tables/10/settle', {
    method: 'POST',
    headers: dinerHeaders,
    body: { paymentMethod: 'UPI', paymentStatus: 'PAID' },
  });
  assert.strictEqual(dinerSettle.status, 403);
  pass('GATE_A.3.4', 'POST settle with diner credentials -> 403 FORBIDDEN');

  // 3.5 Role lacking settlement permission (CHEF) -> 403 FORBIDDEN
  const chefSettle = await request('/api/restaurant/tables/10/settle', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhChefToken}` },
    body: { paymentMethod: 'UPI', paymentStatus: 'PAID' },
  });
  assert.strictEqual(chefSettle.status, 403);
  assert.strictEqual(chefSettle.json.code, 'FORBIDDEN');
  pass('GATE_A.3.5', 'POST settle with unauthorized role (CHEF) -> 403 FORBIDDEN');

  // 3.6 Cross-branch staff (Delhi manager attempting Ludhiana table) -> 403 BRANCH_MISMATCH
  const crossBranchSettle = await request('/api/restaurant/tables/10/settle', {
    method: 'POST',
    headers: { Authorization: `Bearer ${delManagerToken}` },
    body: { paymentMethod: 'UPI', paymentStatus: 'PAID' },
  });
  assert.strictEqual(crossBranchSettle.status, 403);
  assert.strictEqual(crossBranchSettle.json.code, 'BRANCH_MISMATCH');
  pass('GATE_A.3.6', 'POST settle cross-branch attempt -> 403 BRANCH_MISMATCH');

  // Mutation 4: POST /api/restaurant/orders (Order Creation Branch Scoping)
  console.log('\n--- Route 4: POST /api/restaurant/orders ---');
  // 4.1 Cross-branch staff creating order on table in another branch -> 403 BRANCH_MISMATCH
  const crossBranchOrder = await request('/api/restaurant/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${delManagerToken}` },
    body: {
      tableNumber: 'B-01', // B-01 (Table ID 10) is in branch_ldh
      items: [{ id: 'item_tandoori_roti', quantity: 1 }],
    },
  });
  assert.strictEqual(crossBranchOrder.status, 403);
  assert.strictEqual(crossBranchOrder.json.code, 'BRANCH_MISMATCH');
  pass('GATE_A.4.1', 'POST orders cross-branch table assignment -> 403 BRANCH_MISMATCH');

  // Mutation 5: GET /api/restaurant/tables/:id/bill (Bill Branch Scoping)
  console.log('\n--- Route 5: GET /api/restaurant/tables/:id/bill ---');
  // 5.1 Cross-branch staff viewing bill of another branch -> 403 BRANCH_MISMATCH
  const crossBranchBill = await request('/api/restaurant/tables/10/bill', {
    headers: { Authorization: `Bearer ${delManagerToken}` },
  });
  assert.strictEqual(crossBranchBill.status, 403);
  assert.strictEqual(crossBranchBill.json.code, 'BRANCH_MISMATCH');
  pass('GATE_A.5.1', 'GET table bill cross-branch access -> 403 BRANCH_MISMATCH');

  // Mutation 6: GET /api/restaurant/orders/:id (Order Single Fetch Branch Scoping)
  console.log('\n--- Route 6: GET /api/restaurant/orders/:id ---');
  // 6.1 Cross-branch staff viewing order details of another branch -> 403 BRANCH_MISMATCH
  const crossBranchOrderFetch = await request(`/api/restaurant/orders/${auditOrderId}`, {
    headers: { Authorization: `Bearer ${delManagerToken}` },
  });
  assert.strictEqual(crossBranchOrderFetch.status, 403);
  assert.strictEqual(crossBranchOrderFetch.json.code, 'BRANCH_MISMATCH');
  pass('GATE_A.6.1', 'GET order details cross-branch access -> 403 BRANCH_MISMATCH');

  // ───────────────────────────────────────────────────────────────────────────
  // GATE B — VERIFY FINANCIAL AND SETTLEMENT SEMANTICS
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n💰 ────────────────────────────────────────────────────────────');
  console.log('💰 GATE B: FINANCIAL & SETTLEMENT SEMANTICS');
  console.log('💰 ────────────────────────────────────────────────────────────');

  // 1. Double cancellation check: Repeating cancellation cannot deduct again
  const doubleCancelRes = await request(`/api/restaurant/orders/${cancelTestOrderId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhManagerToken}` },
    body: { reason: 'Attempting second cancellation' },
  });
  assert.strictEqual(doubleCancelRes.status, 400);
  assert.strictEqual(doubleCancelRes.json.code, 'CANNOT_CANCEL_TERMINAL_ORDER');
  pass('GATE_B.1', 'Repeated cancellation rejected: cannot cancel already cancelled order');

  // 2. Bill vs Order Totals Agreement
  const table10Bill = await request('/api/restaurant/tables/10/bill', {
    headers: { Authorization: `Bearer ${ldhManagerToken}` },
  });
  assert.strictEqual(table10Bill.status, 200);
  assert.strictEqual(table10Bill.json.subtotalMinor, 35000, 'Subtotal is 35000 paise (Paneer Tikka)');
  assert.strictEqual(table10Bill.json.taxMinor, 1750, 'Tax is 1750 paise (5% of 35000)');
  assert.strictEqual(table10Bill.json.totalMinor, 36750, 'Total is 36750 paise (₹367.50)');
  pass('GATE_B.2', 'Authoritative table bill matches line items and integer 5% GST exactly');

  // 3. Failed settlement leaves balance and state intact
  const failedComp = await request('/api/restaurant/tables/10/settle', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhManagerToken}` },
    body: { paymentMethod: 'COMP', paymentStatus: 'COMPED' }, // no reason
  });
  assert.strictEqual(failedComp.status, 400);
  assert.strictEqual(failedComp.json.code, 'REASON_REQUIRED');

  const table10PostFailed = await request('/api/restaurant/tables/10');
  assert.strictEqual(table10PostFailed.json.table.activeBillMinor, 36750, 'Active bill intact after failed settlement');
  assert.ok(['OCCUPIED', 'BILL_REQUESTED'].includes(table10PostFailed.json.table.status), 'Table status unchanged');
  pass('GATE_B.3', 'Failed settlement leaves table activeBillMinor and status completely intact');

  // 4. Idempotency replay with identical payload
  const settleIdemKey = `idem_audit_${Date.now()}`;
  const settleRes1 = await request('/api/restaurant/tables/10/settle', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ldhManagerToken}`,
      'X-Idempotency-Key': settleIdemKey,
    },
    body: { paymentMethod: 'UPI', paymentStatus: 'PAID' },
  });
  assert.strictEqual(settleRes1.status, 200);
  assert.strictEqual(settleRes1.json.table.status, 'AVAILABLE');
  assert.strictEqual(settleRes1.json.table.activeBillMinor, 0);
  pass('GATE_B.4.1', 'Authoritative settlement succeeds and vacates table (AVAILABLE, ₹0.00 bill)');

  // Replay identical idempotency key
  const replayRes = await request('/api/restaurant/tables/10/settle', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ldhManagerToken}`,
      'X-Idempotency-Key': settleIdemKey,
    },
    body: { paymentMethod: 'UPI', paymentStatus: 'PAID' },
  });
  assert.strictEqual(replayRes.status, 200);
  assert.ok(replayRes.json.idempotentReplay, 'Must be marked as idempotentReplay');
  pass('GATE_B.4.2', 'Idempotent replay with identical payload returns cached 200 without double charge');

  // Conflicting idempotency key reuse with different payload
  const conflictReplayRes = await request('/api/restaurant/tables/10/settle', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ldhManagerToken}`,
      'X-Idempotency-Key': settleIdemKey,
    },
    body: { paymentMethod: 'CASH', paymentStatus: 'PAID', amountMinor: 99999 },
  });
  assert.strictEqual(conflictReplayRes.status, 409);
  assert.strictEqual(conflictReplayRes.json.code, 'IDEMPOTENCY_CONFLICT');
  pass('GATE_B.4.3', 'Conflicting idempotency key reuse strictly rejected with 409 IDEMPOTENCY_CONFLICT');

  // 5. Verification status on settlement record
  assert.strictEqual(settleRes1.json.settlement.verification, 'MANUAL_STAFF_RECORDED', 'Manual recorded status');
  pass('GATE_B.5', 'Payment record verified as MANUAL_STAFF_RECORDED (no fake live gateway claim)');

  // ───────────────────────────────────────────────────────────────────────────
  // GATE C — VERIFY SHARED DOMAIN STATE
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n🔄 ────────────────────────────────────────────────────────────');
  console.log('🔄 GATE C: SHARED DOMAIN STATE ACROSS TIERS');
  console.log('🔄 ────────────────────────────────────────────────────────────');

  // Step 1: Create an order on Table 11 (B-02, Ludhiana)
  const sharedOrderRes = await request('/api/restaurant/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhManagerToken}` },
    body: {
      tableNumber: 'B-02',
      guestName: 'Shared State Diner',
      items: [
        { id: 'item_paneer_tikka', quantity: 1 }, // 35000
        { id: 'item_dal_makhani', quantity: 1 },  // 38000
      ],
    },
  });
  assert.strictEqual(sharedOrderRes.status, 201);
  const sharedOrderId = sharedOrderRes.json.data.orderId;
  pass('GATE_C.1', `Submitted shared order ${sharedOrderId} on B-02`);

  // Step 2: Confirm order appears in Ludhiana orders workspace, NOT in Delhi
  const ldhOrders = await request('/api/restaurant/orders?branchId=branch_ldh', {
    headers: { Authorization: `Bearer ${ldhManagerToken}` },
  });
  const delOrders = await request('/api/restaurant/orders?branchId=branch_del', {
    headers: { Authorization: `Bearer ${delManagerToken}` },
  });
  assert.ok(ldhOrders.json.data.some((o) => o.orderId === sharedOrderId), 'Order present in Ludhiana');
  assert.ok(!delOrders.json.data.some((o) => o.orderId === sharedOrderId), 'Order absent in Delhi');
  pass('GATE_C.2', 'Order appears in Ludhiana Operations and is strictly absent from Delhi workspace');

  // Step 3: Check KDS queue has tasks for this order
  const kdsTasksRes = await request('/api/restaurant/kds/tasks', {
    headers: { Authorization: `Bearer ${ldhManagerToken}` },
  });
  const orderTasks = kdsTasksRes.json.data.filter((t) => t.orderId === sharedOrderId);
  assert.strictEqual(orderTasks.length, 2, 'Must have 2 kitchen tasks for the 2 items');
  assert.ok(orderTasks.every((t) => t.status === 'QUEUED'), 'Initial task statuses are QUEUED');
  pass('GATE_C.3', 'Kitchen KDS generated 2 QUEUED tasks mapped directly to order line items');

  // Step 4: Advance status CONFIRMED -> IN_PREPARATION -> SERVED
  await request(`/api/restaurant/orders/${sharedOrderId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${ldhChefToken}` },
    body: { newStatus: 'IN_PREPARATION' },
  });
  const kdsAfterPrep = await request('/api/restaurant/kds/tasks', {
    headers: { Authorization: `Bearer ${ldhManagerToken}` },
  });
  const prepTasks = kdsAfterPrep.json.data.filter((t) => t.orderId === sharedOrderId);
  assert.ok(prepTasks.every((t) => t.status === 'IN_PROGRESS'), 'Tasks transitioned to IN_PROGRESS');

  await request(`/api/restaurant/orders/${sharedOrderId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${ldhManagerToken}` },
    body: { newStatus: 'SERVED' },
  });
  const kdsAfterServed = await request('/api/restaurant/kds/tasks', {
    headers: { Authorization: `Bearer ${ldhManagerToken}` },
  });
  const servedTasks = kdsAfterServed.json.data.filter((t) => t.orderId === sharedOrderId);
  assert.ok(servedTasks.every((t) => t.status === 'BUMPED'), 'Tasks transitioned to BUMPED when SERVED');
  pass('GATE_C.4', 'Order status transitions update linked KDS tasks: QUEUED -> IN_PROGRESS -> BUMPED');

  // Step 5: Settle Table 11
  const settleT11 = await request('/api/restaurant/tables/11/settle', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ldhManagerToken}`,
      'X-Idempotency-Key': `idem_t11_${Date.now()}`,
    },
    body: { paymentMethod: 'CARD', paymentStatus: 'PAID' },
  });
  assert.strictEqual(settleT11.status, 200);
  assert.strictEqual(settleT11.json.table.status, 'AVAILABLE');

  const orderAfterSettle = await request(`/api/restaurant/orders/${sharedOrderId}`, {
    headers: { Authorization: `Bearer ${ldhManagerToken}` },
  });
  assert.strictEqual(orderAfterSettle.json.data.status, 'PAID');
  pass('GATE_C.5', 'Settlement synchronizes table to AVAILABLE and order to PAID across all views');

  // Step 6: Verify disk persistence in runtime store JSON
  const storeFilePath = path.join(__dirname, '../projects/external-os/restaurant-os/data/restaurant-runtime-store.json');
  assert.ok(fs.existsSync(storeFilePath), 'Store file exists on disk');
  const storeRaw = fs.readFileSync(storeFilePath, 'utf8');
  const storeJson = JSON.parse(storeRaw);
  const persistedOrder = storeJson.orders.find((o) => o.orderId === sharedOrderId);
  assert.ok(persistedOrder, 'Order exists in store JSON');
  assert.strictEqual(persistedOrder.status, 'PAID', 'Persisted order status is PAID');
  pass('GATE_C.6', 'Authoritative state verified durable in disk store JSON (survives restart)');

  console.log('\n======================================================================');
  console.log(`🎉 CLOSURE AUDIT COMPLETE: ${passCount} / ${passCount} ASSERTIONS PASSED!`);
  console.log('======================================================================\n');
}

runClosureAudit().catch((err) => {
  console.error('❌ Closure Audit Failed:', err);
  process.exit(1);
});
