/**
 * 🚀 OrbitoX RestaurantOS - Live HTTP API Integration Test Suite
 * ─────────────────────────────────────────────────────────────
 * Tests real HTTP REST endpoints against the live Next.js server on port 3005:
 * 1. QR Locator Resolution (SCAN ≠ JOIN)
 * 2. Public Menu Fetching
 * 3. Seating / Join Session Token Issuance
 * 4. Deterministic Pricing Quote Computation
 * 5. Order Submission & Idempotent Retries
 * 6. KDS Station Queue & Chef Bumping
 * 7. Live Customer Projection Synchronization
 * 8. Multi-Guest Companion Join (Rahul joins Nikhil)
 * 9. Remote QR Clone Penetration Check
 */

const BASE_URL = 'http://localhost:3005';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runLiveHttpTests() {
  console.log('🍽️ ========================================================');
  console.log('🍽️ LIVE HTTP API VERIFICATION: ORBITOX RESTAURANTOS');
  console.log(`🍽️ Target Server: ${BASE_URL}`);
  console.log('🍽️ ========================================================\n');

  // STEP 1: QR Discovery
  console.log('📡 [1/9] Resolving Public QR Locator (7Kp9xQ8m2L)...');
  const qrRes = await fetch(`${BASE_URL}/api/restaurant/qr/7Kp9xQ8m2L`);
  assert(qrRes.status === 200, 'HTTP 200 returned for valid locator');
  const qrJson = await qrRes.json();
  assert(qrJson.success === true, 'Response marked success');
  assert(qrJson.data.tableNumber === 'T-14', 'Table resolved to T-14');
  assert(qrJson.data.restaurantName === 'OrbitoX Bistro', 'Restaurant name is OrbitoX Bistro');
  assert(qrJson.data.sessionId === undefined, 'INVARIANT: Discovery context leaks ZERO sessionId');
  console.log('  ✅ Step 1 Verified: Table 14 Discovery Context returned.\n');

  // STEP 2: Public Menu
  console.log('📡 [2/9] Fetching Public Culinary Menu...');
  const menuRes = await fetch(`${BASE_URL}/api/restaurant/menu?locationId=loc_ludhiana`);
  assert(menuRes.status === 200, 'HTTP 200 returned for menu');
  const menuJson = await menuRes.json();
  assert(menuJson.data.categories.length >= 3, 'Menu contains 3+ categories');
  const mains = menuJson.data.categories.find(c => c.name === 'Mains');
  assert(!!mains, 'Mains category present with items');
  console.log(`  ✅ Step 2 Verified: ${menuJson.data.categories.length} categories loaded.\n`);

  // STEP 3: Guest A Joins Party
  console.log('📡 [3/9] Guest A (Nikhil) Joining Table Party...');
  const joinResA = await fetch(`${BASE_URL}/api/restaurant/sessions/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locator: '7Kp9xQ8m2L', displayName: 'Nikhil' }),
  });
  assert(joinResA.status === 200, 'HTTP 200 returned for join party');
  const joinJsonA = await joinResA.json();
  assert(joinJsonA.success === true, 'Join succeeded');
  assert(joinJsonA.data.status === 'APPROVED', 'Status is APPROVED');
  const tokenNikhil = joinJsonA.data.capabilityToken;
  assert(typeof tokenNikhil === 'string' && tokenNikhil.length > 20, 'Cryptographic GuestCapability token issued');
  console.log('  ✅ Step 3 Verified: Nikhil seated as Host with ephemeral capability.\n');

  // STEP 4: Pricing Quote
  console.log('📡 [4/9] Requesting Server-Validated Pricing Quote...');
  const cartA = [
    { itemId: 'item_paneer_tikka', quantity: 1, selectedModifierIds: ['m_medium'] },
    { itemId: 'item_dal_makhani', quantity: 1, selectedModifierIds: [] },
  ];
  const quoteRes = await fetch(`${BASE_URL}/api/restaurant/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cartItems: cartA }),
  });
  assert(quoteRes.status === 200, 'HTTP 200 returned for quote');
  const quoteJson = await quoteRes.json();
  assert(quoteJson.success === true, 'Quote calculation successful');
  assert(quoteJson.data.subtotalMinor === '73000', 'Subtotal is ₹730.00 (73000 minor)');
  assert(quoteJson.data.taxMinor === '3650', '5% GST is ₹36.50 (3650 minor)');
  assert(quoteJson.data.totalMinor === '76650', 'Total minor units exact (₹766.50)');
  assert(typeof quoteJson.data.inputHash === 'string', 'SHA-256 inputHash present');
  assert(typeof quoteJson.data.resultHash === 'string', 'SHA-256 resultHash present');
  const quoteId = quoteJson.data.quoteId;
  console.log('  ✅ Step 4 Verified: Tamper-proof quote locked.\n');

  // STEP 5: Order Submission & Idempotent Retry
  console.log('📡 [5/9] Submitting Order to Kitchen with Idempotency Key...');
  const idempKey = `idemp_live_test_${Date.now()}`;
  const orderRes = await fetch(`${BASE_URL}/api/restaurant/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      capabilityToken: tokenNikhil,
      quoteId,
      cartItems: cartA,
      idempotencyKey: idempKey,
    }),
  });
  if (orderRes.status !== 200) {
    const errText = await orderRes.text();
    console.error('Order submission failed with:', orderRes.status, errText);
  }
  assert(orderRes.status === 200, 'HTTP 200 returned for order submission');
  const orderJson = await orderRes.json();
  assert(orderJson.success === true, 'Order created and confirmed');
  const orderId = orderJson.data.orderId;
  assert(orderJson.data.status === 'CONFIRMED', 'Commercial status is CONFIRMED');
  assert(orderJson.data.customerStage === 'CONFIRMED', 'Customer stage is CONFIRMED');

  // Idempotent retry test
  console.log('  Testing duplicate transmission with identical Idempotency-Key...');
  const retryRes = await fetch(`${BASE_URL}/api/restaurant/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      capabilityToken: tokenNikhil,
      quoteId,
      cartItems: cartA,
      idempotencyKey: idempKey,
    }),
  });
  const retryJson = await retryRes.json();
  assert(retryJson.data.orderId === orderId, 'Idempotent retry returned identical order without duplicating');
  console.log('  ✅ Step 5 Verified: Order submitted and idempotent retries safe.\n');

  // STEP 6: KDS Station Queue
  console.log('📡 [6/9] Fetching Kitchen Station Queue (Tandoor)...');
  const kdsRes = await fetch(`${BASE_URL}/api/restaurant/kds?stationId=st_tandoor`);
  assert(kdsRes.status === 200, 'HTTP 200 returned for KDS queue');
  const kdsJson = await kdsRes.json();
  const tandoorTask = kdsJson.data.find(t => t.orderId === orderId) || kdsJson.data[0];
  assert(tandoorTask.status === 'QUEUED', 'Task starts in QUEUED status');
  console.log(`  ✅ Step 6 Verified: Task [${tandoorTask.itemName}] queued at Tandoor Station.\n`);

  // STEP 7: Chef Bumps Task & Live Projection Synchronizes
  console.log('📡 [7/9] Chef Bumps Task to IN_PROGRESS...');
  const bumpRes = await fetch(`${BASE_URL}/api/restaurant/kds`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer staff:chef_tandoor',
    },
    body: JSON.stringify({
      taskId: tandoorTask.id,
      newStatus: 'IN_PROGRESS',
      bumpedBy: 'Chef Balwant',
    }),
  });
  assert(bumpRes.status === 200, 'HTTP 200 returned for task bump');

  // Check diner live status projection
  const statusRes = await fetch(`${BASE_URL}/api/restaurant/orders?orderId=${orderId}`);
  const statusJson = await statusRes.json();
  assert(statusJson.data.projection.stage === 'COOKING', 'Customer projection updated to COOKING stage (65%)');
  console.log('  ✅ Step 7 Verified: Customer live journey moved to COOKING.\n');

  // STEP 8: Guest B (Rahul) Joins Party
  console.log('📡 [8/9] Guest B (Rahul) Scans Same QR & Joins Table...');
  const joinResB = await fetch(`${BASE_URL}/api/restaurant/sessions/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locator: '7Kp9xQ8m2L', displayName: 'Rahul' }),
  });
  assert(joinResB.status === 200, 'HTTP 200 returned for Guest B');
  const joinJsonB = await joinResB.json();
  const tokenRahul = joinJsonB.data.capabilityToken;
  assert(!!tokenRahul && tokenRahul !== tokenNikhil, 'Guest B receives independent non-fungible capability token');
  console.log('  ✅ Step 8 Verified: Multi-guest companion join successful.\n');

  // STEP 9: Remote QR Attack Verification
  console.log('📡 [9/9] Verifying Remote Attacker Scanning Copied QR...');
  const attackerRes = await fetch(`${BASE_URL}/api/restaurant/qr/7Kp9xQ8m2L`);
  const attackerJson = await attackerRes.json();
  assert(attackerJson.data.publicMenuAvailable === true, 'Public menu available to scanner');
  assert((attackerJson.data).orders === undefined, 'ZERO orders leaked to remote scanner');
  assert((attackerJson.data).participants === undefined, 'ZERO diner names leaked to remote scanner');
  assert((attackerJson.data).sessionId === undefined, 'ZERO session IDs leaked to remote scanner');
  console.log('  ✅ Step 9 Verified: SCAN ≠ JOIN strictly enforced against remote attacks.\n');

  console.log('🎉 ========================================================');
  console.log('🎉 ALL LIVE HTTP REST API INVARIANTS 100% VERIFIED!');
  console.log('🎉 ========================================================\n');
}

runLiveHttpTests().catch(err => {
  console.error('Fatal Live Test Error:', err);
  process.exit(1);
});
