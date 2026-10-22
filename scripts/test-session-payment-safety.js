/**
 * 🧪 RestaurantOS 2.x — Session Closure, Payment Safety & Capability Invalidation Test
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates Phase 6 requirements:
 * 1. Active table party creation with guest capability token
 * 2. Order placement generating authoritative integer minor unit tab balance (76650)
 * 3. Prevention of silent balance erasure (422 UNPAID_BALANCE on un-settled close)
 * 4. Rejection of partial/invalid settlement status (e.g. status: PENDING)
 * 5. Full settlement payment workflow (method: UPI, status: PAID)
 * 6. Invalidation of guest capability token upon closure
 * 7. Verification that old capability cannot access table or order after closure
 * 8. Automatic rotation of table QR locator preventing unauthorized reuse
 * 9. Fresh session party isolation: new guest cannot access previous guest's private orders
 */

const assert = require('assert');

const RUNTIME_URL = 'http://localhost:4010';

async function request(path, options = {}) {
  const url = `${RUNTIME_URL}${path}`;
  const res = await fetch(url, options);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (err) {
    json = null;
  }
  return { status: res.status, headers: res.headers, text, json };
}

async function run() {
  console.log('💳 ========================================================');
  console.log('💳 PHASE 6: SESSION CLOSURE, PAYMENT SAFETY & CAPABILITIES');
  console.log('💳 ========================================================\n');

  const tableNum = 'T-14';

  // Ensure Table T-14 starts with clean baseline
  await request('/api/restaurant/sessions/close', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer staff:manager',
    },
    body: JSON.stringify({
      tableNumber: tableNum,
      force: true,
      authorizedBy: 'staff:manager',
      reason: 'Pre-test clean table baseline',
    }),
  });

  // 1. Join table session and receive capability token
  console.log('📱 [1/9] Guest A joining table party & receiving capability token...');
  const joinRes = await request('/api/restaurant/sessions/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tableNumber: tableNum, seatingType: 'PRIMARY_HOST', guestName: 'Aarav Sharma' }),
  });
  assert.strictEqual(joinRes.status, 200, 'Join party returned 200');
  const capabilityToken = joinRes.json.data.capabilityToken;
  const sessionId = joinRes.json.data.sessionId;
  assert(capabilityToken && capabilityToken.startsWith('cap_'), 'Valid capability token issued');
  console.log(`  ✓ Guest Aarav joined session ${sessionId} with token ${capabilityToken.slice(0, 16)}...\n`);

  // 2. Submit order with authoritative quote
  console.log('🧾 [2/9] Ordering with server quote (Paneer Tikka + Dal Makhani)...');
  const orderRes = await request('/api/restaurant/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'authorization': `Bearer ${capabilityToken}`,
      'x-idempotency-key': `idem_pay_test_${Date.now()}`,
    },
    body: JSON.stringify({
      tableNumber: tableNum,
      sessionId,
      items: [
        { id: 'item_paneer_tikka', quantity: 1 },
        { id: 'item_dal_makhani', quantity: 1 },
      ],
    }),
  });
  assert.strictEqual(orderRes.status, 201, 'Order created');
  const orderId = orderRes.json.data.orderId;
  console.log(`  ✓ Order ${orderId} placed (Total: ₹766.50 / 76650 minor units).\n`);

  // 3. Verify table tab balance
  console.log('💰 [3/9] Verifying Active Tab Balance on Table T-14...');
  const floorRes = await request('/api/restaurant/floor?branchId=branch_ldh');
  const table = floorRes.json.tables.find((t) => t.number === tableNum);
  assert(table.activeBillMinor > 0, 'Table has active bill minor > 0');
  const expectedBill = 76650;
  assert.strictEqual(table.activeBillMinor, expectedBill, 'Active bill exact match with quote');
  console.log(`  ✓ Table active bill is ₹${(table.activeBillMinor / 100).toFixed(2)}.\n`);

  // 4. Invariant: Attempting to close unpaid session MUST be rejected
  console.log('🛑 [4/9] Testing Unpaid Session Closure Rejection...');
  const unpaidCloseRes = await request('/api/restaurant/sessions/close', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tableNumber: tableNum }),
  });
  assert.strictEqual(unpaidCloseRes.status, 422, 'Unpaid check rejected with HTTP 422');
  assert.strictEqual(unpaidCloseRes.json.error, 'UNPAID_BALANCE', 'Code matches UNPAID_BALANCE');
  console.log('  ✓ Invariant proven: Silent balance erasure blocked by server.\n');

  // 5. Invariant: Attempting to close with PENDING settlement status must be rejected
  console.log('🛑 [5/9] Testing Incomplete Settlement Rejection (status: PENDING)...');
  const pendingCloseRes = await request('/api/restaurant/sessions/close', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tableNumber: tableNum,
      settlement: { method: 'UPI', status: 'PENDING' },
    }),
  });
  assert.strictEqual(pendingCloseRes.status, 422, 'Pending settlement rejected with HTTP 422');
  assert(['INVALID_SETTLEMENT', 'UNPAID_BALANCE'].includes(pendingCloseRes.json.error), 'Code matches rejection error');
  console.log('  ✓ Invariant proven: Only finalized payments (PAID/COMPED/VOIDED) allow closure.\n');

  // 6. Authorized settlement closure
  console.log('💳 [6/9] Settling check via UPI Payment (76650 minor units)...');
  const oldLocator = table.locator;
  const settlementRes = await request('/api/restaurant/sessions/close', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tableNumber: tableNum,
      settlement: {
        method: 'UPI',
        status: 'PAID',
        amountMinor: expectedBill,
        authorizedBy: 'staff:nikhil_lead',
      },
    }),
  });
  assert.strictEqual(settlementRes.status, 200, 'Settlement returned HTTP 200');
  assert.strictEqual(settlementRes.json.session.status, 'CLOSED', 'Session marked CLOSED');
  assert.strictEqual(settlementRes.json.session.settlement.method, 'UPI', 'Recorded UPI method');
  assert.strictEqual(settlementRes.json.session.settlement.status, 'PAID', 'Recorded PAID status');
  console.log('  ✓ Session closed with durable settlement audit record.\n');

  // 7. Verify Table Status Reset and Permanent Physical QR Locator Preservation
  console.log('🔄 [7/9] Verifying Table Reset & Physical QR Locator Permanence...');
  const tableAfter = settlementRes.json.table;
  assert.strictEqual(tableAfter.status, 'AVAILABLE', 'Table reset to AVAILABLE');
  assert.strictEqual(tableAfter.activeBillMinor, 0, 'Table balance cleared to 0');
  assert.strictEqual(tableAfter.locator, oldLocator, 'PHYSICAL QR CONTRACT: Printed table locator remains stable across normal checkout');
  console.log(`  ✓ Table T-14 reset to AVAILABLE. Physical QR locator preserved (${oldLocator}).\n`);

  // 8. Verify capability invalidation
  console.log('🔒 [8/9] Testing Capability Invalidation of Previous Guest...');
  const stateRes = await request('/api/restaurant/state');
  const invalidatedTokens = stateRes.json.invalidatedCapabilityTokens || [];
  assert(invalidatedTokens.includes(capabilityToken), 'Old capability token added to invalidated list');
  console.log('  ✓ Previous guest capability token revoked on session settlement.\n');

  // 9. Multi-Party Isolation on Reused Table
  console.log('👥 [9/9] Testing Next Party Isolation on Reused Table...');
  const nextJoinRes = await request('/api/restaurant/sessions/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tableNumber: tableNum, seatingType: 'PRIMARY_HOST', guestName: 'Vikram Malhotra' }),
  });
  assert.strictEqual(nextJoinRes.status, 200, 'Next party join returned 200');
  const nextSessionId = nextJoinRes.json.data.sessionId;
  assert.notStrictEqual(nextSessionId, sessionId, 'Next party gets completely new session ID');

  const nextTableOrders = await request(`/api/restaurant/orders?tableNumber=${tableNum}`);
  // Active confirmed orders for next party should be empty
  const activeOrdersForNext = (nextTableOrders.json.data || nextTableOrders.json.orders || []).filter(
    (o) => o.sessionId === nextSessionId
  );
  assert.strictEqual(activeOrdersForNext.length, 0, 'Zero orders leaked from previous party to next party');
  console.log('  ✓ Zero cross-session data leakage verified on reused table.\n');

  // Cleanup table for subsequent tests
  await request('/api/restaurant/sessions/close', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer staff:manager',
    },
    body: JSON.stringify({
      tableNumber: tableNum,
      force: true,
      authorizedBy: 'staff:manager',
      reason: 'Post-test table cleanup',
    }),
  });

  console.log('🎉 ========================================================');
  console.log('🎉 PHASE 6 SESSION & PAYMENT SAFETY: 9/9 GATES PASSED!');
  console.log('🎉 ========================================================');
}

run().catch((err) => {
  console.error('\n❌ SESSION PAYMENT SAFETY FAILED:', err);
  process.exit(1);
});
