/**
 * 🧪 RestaurantOS 5.2 — Single-Brand Multi-Branch Automated Acceptance Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates Scenarios A, B, C, D, and E per RESTAURANTOS-5.2-COMMERCE-PLAN:
 * - Scenario A: One Restaurant Brand, Three Branches & Branch Switching
 * - Scenario B: Editable Menu & Multi-Location Branch Overrides
 * - Scenario C: Customer Order, Server Quote, and Kitchen Routing
 * - Scenario D: Branch Isolation & 86'd Availability Guard
 * - Scenario E: Financial Integrity, Integer Minor Units, & Order Idempotency
 */

const BASE_URL = 'http://localhost:4010';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, options);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    // text
  }
  return { status: res.status, headers: res.headers, text, json };
}

async function runAcceptanceSuite() {
  console.log('\n===============================================================');
  console.log('🪐 RESTAURANTOS 5.2 — SINGLE-BRAND MULTI-BRANCH ACCEPTANCE SUITE');
  console.log('===============================================================\n');

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO A: One Restaurant Brand, Three Branches & Location Resolution
  // ───────────────────────────────────────────────────────────────────────────
  console.log('--- SCENARIO A: One Restaurant Brand & Multi-Branch Resolution ---');

  // A1. Verify all 3 branches exist under single brand
  const branchesRes = await request('/api/restaurant/branches');
  assert(branchesRes.status === 200, 'GET /api/restaurant/branches returns HTTP 200');
  assert(branchesRes.json?.success === true, 'Response contains success: true');
  assert(Array.isArray(branchesRes.json?.data) && branchesRes.json.data.length >= 3, 'Contains at least 3 configured branches');

  const ldhBranch = branchesRes.json?.data.find((b) => b.id === 'branch_ldh');
  const chdBranch = branchesRes.json?.data.find((b) => b.id === 'branch_chd');
  const delBranch = branchesRes.json?.data.find((b) => b.id === 'branch_del');

  assert(Boolean(ldhBranch && chdBranch && delBranch), 'All three core branches (Ludhiana, Chandigarh, Delhi) are registered');
  assert(ldhBranch?.openingHours?.openTime === '12:00 PM', 'Ludhiana opening hours configured');
  assert(delBranch?.openingHours?.closeTime === '01:00 AM', 'Delhi CP late-night hours configured (closes 1:00 AM)');

  // A2. Verify CraveAtlas renders single restaurant brand (OrbitoX Bistro & Bar)
  const craveRes = await request('/apps/crave-atlas');
  assert(craveRes.status === 200, 'GET /apps/crave-atlas returns HTTP 200');
  assert(craveRes.text.includes('OrbitoX Bistro & Bar'), 'CraveAtlas displays single brand "OrbitoX Bistro & Bar"');
  assert(!craveRes.text.includes('Verified Partner Kitchens'), 'CraveAtlas has NO multi-merchant partner kitchen marketplace cards');

  // A3. Verify CraveAtlas with ?branch=branch_del resolves Delhi branch context
  const craveDelRes = await request('/apps/crave-atlas?branch=branch_del');
  assert(craveDelRes.text.includes('Delhi Connaught Place'), 'CraveAtlas with ?branch=branch_del resolves Delhi Connaught Place');
  assert(craveDelRes.text.includes('DEL-CP Price') || craveDelRes.text.includes('DEL-CP Special') || craveDelRes.text.includes('₹580.00'), 'Delhi price override appears in menu cards');

  // A4. Verify SwiftBite renders single restaurant brand
  const swiftRes = await request('/apps/swift-bite');
  assert(swiftRes.status === 200, 'GET /apps/swift-bite returns HTTP 200');
  assert(swiftRes.text.includes('OrbitoX') && swiftRes.text.includes('Swift'), 'SwiftBite displays single brand header');
  assert(swiftRes.text.includes('Order Again in 1-Tap'), 'SwiftBite features 1-tap reorder carousel');

  // A5. Verify rejection of unknown/invalid branch in order submission
  const invalidBranchOrder = await request('/api/commerce/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      branchId: 'branch_non_existent_fake',
      items: [{ id: 'item_tandoori_roti', quantity: 1, priceMinor: 3500 }],
    }),
  });
  assert(invalidBranchOrder.status === 400, 'Order to non-existent branch rejected with HTTP 400');
  assert(invalidBranchOrder.json?.error === 'INVALID_BRANCH', 'Rejection code is INVALID_BRANCH');

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO B: Editable Menu & Multi-Location Branch Overrides
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO B: Editable Menu & Multi-Location Branch Overrides ---');

  // B1. Create a new culinary dish in catalog
  const testDishId = 'item_test_biryani_' + Date.now();
  const createDishRes = await request('/api/restaurant/menu/items', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer staff:manager',
    },
    body: JSON.stringify({
      id: testDishId,
      name: 'Nawabi Awadhi Dum Biryani',
      category: 'Mains',
      description: 'Fragrant aged basmati rice layered with saffron chicken and sealed in clay handi.',
      basePriceMinor: 52000,
      formattedPrice: '₹520.00',
      prepDurationMinutes: 18,
      station: 'CURRY_LINE',
    }),
  });
  assert(createDishRes.status === 201, 'POST /api/restaurant/menu/items creates new dish (HTTP 201)');
  assert(createDishRes.json?.data?.id === testDishId, 'Created dish ID matches');

  // B2. Apply a branch-specific price override for Delhi CP
  const overrideRes = await request('/api/restaurant/menu/branch-overrides', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer staff:manager',
    },
    body: JSON.stringify({
      itemId: testDishId,
      branchId: 'branch_del',
      isAvailable: true,
      priceOverrideMinor: 59000,
      formattedPriceOverride: '₹590.00',
    }),
  });
  assert(overrideRes.status === 200, 'POST /api/restaurant/menu/branch-overrides saves branch override (HTTP 200)');

  // B3. Verify Ludhiana gets base price ₹520.00 while Delhi gets ₹590.00
  const ldhMenuRes = await request('/api/restaurant/branches/branch_ldh/menu');
  const ldhDish = ldhMenuRes.json?.data?.find((d) => d.id === testDishId);
  assert(ldhDish?.effectivePriceMinor === 52000, 'Ludhiana inherits base price ₹520.00 (52000 paise)');
  assert(ldhDish?.isPriceOverridden === false, 'Ludhiana has isPriceOverridden: false');

  const delMenuRes = await request('/api/restaurant/branches/branch_del/menu');
  const delDish = delMenuRes.json?.data?.find((d) => d.id === testDishId);
  assert(delDish?.effectivePriceMinor === 59000, 'Delhi receives overridden price ₹590.00 (59000 paise)');
  assert(delDish?.isPriceOverridden === true, 'Delhi has isPriceOverridden: true');

  // B4. 86'd / mark dish unavailable at Chandigarh branch
  const soldOutRes = await request('/api/restaurant/menu/branch-overrides', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer staff:manager',
    },
    body: JSON.stringify({
      itemId: testDishId,
      branchId: 'branch_chd',
      isAvailable: false,
    }),
  });
  assert(soldOutRes.status === 200, 'Saved 86\'d / sold out override for Chandigarh');

  const chdMenuRes = await request('/api/restaurant/branches/branch_chd/menu');
  const chdDish = chdMenuRes.json?.data?.find((d) => d.id === testDishId);
  assert(chdDish?.isAvailableAtBranch === false, 'Chandigarh menu reflects isAvailableAtBranch: false');

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO C: Customer Order, Server Quote, and Kitchen Routing
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO C: Customer Order, Server Quote, & Kitchen Routing ---');

  // C1. Submit customer order to Delhi branch
  const orderIdempKey = 'suite-order-c-' + Date.now();
  const placeOrderRes = await request('/api/commerce/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-idempotency-key': orderIdempKey,
    },
    body: JSON.stringify({
      branchId: 'branch_del',
      fulfillmentMethod: 'delivery',
      customerName: 'Meera Kapoor',
      customerPhone: '+91 98111 22334',
      deliveryAddress: 'Flat 4B, Barakhamba Road, Connaught Place',
      items: [
        { id: testDishId, quantity: 1 }, // ₹590.00 (Delhi price)
        { id: 'item_tandoori_roti', quantity: 2 }, // ₹35.00 x 2 = ₹70.00
      ],
    }),
  });

  assert(placeOrderRes.status === 201, 'POST /api/commerce/orders creates order (HTTP 201)');
  assert(Boolean(placeOrderRes.json?.orderId), 'Order ID assigned');
  const createdOrderId = placeOrderRes.json?.orderId;

  // Verify server-quoted calculations
  // Subtotal = 59000 + 7000 = 66000
  // Tax (5%) = 3300
  // Delivery Fee = 4000
  // Total = 73300 (₹733.00)
  assert(placeOrderRes.json?.quote?.subtotalMinor === 66000, 'Server subtotal accurately computed as 66000 paise (₹660.00)');
  assert(placeOrderRes.json?.quote?.taxMinor === 3300, 'GST 5% accurately computed as 3300 paise (₹33.00)');
  assert(placeOrderRes.json?.quote?.deliveryFeeMinor === 4000, 'Delivery fee accurately computed as 4000 paise (₹40.00)');
  assert(placeOrderRes.json?.quote?.totalMinor === 73300, 'Total payable accurately computed as 73300 paise (₹733.00)');
  assert(placeOrderRes.json?.quote?.formattedTotal === '₹733.00', 'Formatted total matches ₹733.00');

  // C2. Verify order status and kitchen routing
  const trackRes = await request(`/api/commerce/orders/${createdOrderId}`);
  assert(trackRes.status === 200, `GET /api/commerce/orders/${createdOrderId} returns HTTP 200`);
  assert(trackRes.json?.status === 'CONFIRMED' || trackRes.json?.status === 'ACCEPTED' || trackRes.json?.status === 'IN_PREPARATION', 'Order status indicates active live processing');
  assert(Array.isArray(trackRes.json?.tasks) && trackRes.json.tasks.length === 2, 'Spawns 2 distinct kitchen station tasks');

  const biryaniTask = trackRes.json?.tasks.find((t) => t.itemName.includes('Biryani'));
  const rotiTask = trackRes.json?.tasks.find((t) => t.itemName.includes('Roti'));
  assert(biryaniTask?.station === 'CURRY_LINE', 'Biryani task routed to CURRY_LINE');
  assert(rotiTask?.station === 'TANDOOR', 'Tandoori Roti task routed to TANDOOR');

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO D: Branch Isolation & 86'd Availability Guard
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO D: Branch Isolation & 86\'d Availability Guard ---');

  // D1. Attempt to order the 86'd dish at Chandigarh branch -> MUST BE REJECTED
  const order86Res = await request('/api/commerce/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      branchId: 'branch_chd',
      customerName: 'Meera Kapoor',
      customerPhone: '+91 98111 22334',
      deliveryAddress: 'Sector 17, Chandigarh',
      items: [{ id: testDishId, quantity: 1 }],
    }),
  });
  assert(order86Res.status === 400, 'Order containing 86\'d item at Chandigarh branch is rejected with HTTP 400');
  assert(order86Res.json?.error === 'ITEM_UNAVAILABLE_AT_BRANCH', 'Rejection error code is ITEM_UNAVAILABLE_AT_BRANCH');
  assert(order86Res.json?.unavailableItemId === testDishId, 'Unavailable item ID correctly identified in error');

  // D2. Order the same dish at Ludhiana branch where it is available -> MUST SUCCEED
  const orderLdhSuccessRes = await request('/api/commerce/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      branchId: 'branch_ldh',
      fulfillmentMethod: 'pickup',
      customerName: 'Meera Kapoor',
      customerPhone: '+91 98111 22334',
      items: [{ id: testDishId, quantity: 1 }],
    }),
  });
  assert(orderLdhSuccessRes.status === 201, 'Same dish successfully ordered at Ludhiana branch where it is in stock (HTTP 201)');
  assert(orderLdhSuccessRes.json?.quote?.deliveryFeeMinor === 0, 'Pickup fulfillment applies ₹0 delivery fee');

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO E: POS & Financial Safety (Idempotency & Integer Math)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO E: Financial Safety & Idempotency ---');

  // E1. Replay the exact same order with the same x-idempotency-key
  const replayRes = await request('/api/commerce/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-idempotency-key': orderIdempKey,
    },
    body: JSON.stringify({
      branchId: 'branch_del',
      customerName: 'Meera Kapoor',
      items: [{ id: testDishId, quantity: 1 }],
    }),
  });

  assert(replayRes.status === 200, 'Replayed order with duplicate idempotency key returns HTTP 200');
  assert(replayRes.json?.idempotentReplay === true, 'Response specifies idempotentReplay: true');
  assert(replayRes.json?.orderId === createdOrderId, 'Replayed order ID matches original order exactly without duplicate creation');

  // E2. Clean up test dish
  await request(`/api/restaurant/menu/items/${testDishId}`, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer staff:manager' },
  });

  // Summary
  console.log('\n===============================================================');
  console.log(`ACCEPTANCE RESULTS: Total ${totalTests} | Passed ${passedTests} | Failed ${failedTests}`);
  console.log('===============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAcceptanceSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
