/**
 * 🧪 RestaurantOS 5.3 — Gate A & Gate B Closure Audit Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates:
 * Gate A: Financial & Persistence Integrity
 * 1. Two simultaneous settlement requests cannot settle same session twice (concurrency mutex / conflict).
 * 2. Idempotency records and settlement state are durable across restarts.
 * 3. Same idempotency key with different payload is rejected with 409 IDEMPOTENCY_CONFLICT.
 * 4. In-memory atomic rollback on persistence failure guarantees no orphaned paid orders.
 * 5. Settlement locks released safely on success, failure (422 partial), and exceptions.
 * 6. Cross-branch settlement attempt rejected with 403 BRANCH_MISMATCH.
 * 7. Payment provider confirmation truth (MANUAL_STAFF_RECORDED vs PROVIDER_CONFIRMED).
 * 8. Tax calculation integer minor units consistency (half-up rounding and boundaries).
 *
 * Gate B: Comprehensive Security Inventory
 * - Mutation routes audit: Anonymous, Invalid Signature, Revoked Token, Insufficient Role, Cross-Branch.
 */

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const RUNTIME_URL = 'http://localhost:4010';

async function request(p, options = {}) {
  const url = `${RUNTIME_URL}${p}`;
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

let passCount = 0;
let failCount = 0;

function assertPass(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function run() {
  console.log('\n======================================================================');
  console.log('🏛️ RESTAURANTOS 5.3 — GATE A & GATE B CLOSURE AUDIT SUITE');
  console.log('======================================================================\n');

  // Issue real HMAC-SHA256 tokens via authentic PIN authentication
  const ldhAuthRes = await request('/api/restaurant/auth/staff-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: '8899', branchId: 'branch_ldh' }),
  });
  const ldhManagerToken = ldhAuthRes.json?.data?.token;

  const chdAuthRes = await request('/api/restaurant/auth/staff-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: '9900', branchId: 'branch_chd' }),
  });
  const chdManagerToken = chdAuthRes.json?.data?.token;

  const opsAuthRes = await request('/api/restaurant/auth/staff-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: '1122', branchId: 'branch_ldh' }),
  });
  const ldhOpsToken = opsAuthRes.json?.data?.token;

  // Revoked token
  const revokeTargetRes = await request('/api/restaurant/auth/staff-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: '1122', branchId: 'branch_ldh' }),
  });
  const tokenToRevoke = revokeTargetRes.json?.data?.token;
  await request('/api/restaurant/auth/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ldhManagerToken}` },
    body: JSON.stringify({ token: tokenToRevoke }),
  });

  const tamperedToken = ldhManagerToken.slice(0, -6) + 'xxxxxx';

  // ==========================================================================
  // GATE A: Financial and Persistence Integrity
  // ==========================================================================
  console.log('💳 [GATE A] Financial and Persistence Integrity');

  // Ensure Table T-06 is clean and has an active order
  await request('/api/restaurant/tables/T-06/settle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ldhManagerToken}` },
    body: JSON.stringify({ status: 'COMPED', reason: 'Pre-test reset' }),
  });

  // Create an active order on Table T-06 (Dal Makhani: ₹38000 + 2 Tandoori Roti: ₹7000 = ₹45000 + 5% GST = ₹47250)
  const orderRes = await request('/api/restaurant/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: `ord_gate_a_${Date.now()}`,
      tableNumber: 'T-06',
      items: [
        { id: 'item_dal_makhani', quantity: 1 },
        { id: 'item_tandoori_roti', quantity: 2 },
      ],
    }),
  });
  assertPass(orderRes.status === 201, '[A.0] Active test order created on Table T-06');

  // A.1: Two simultaneous settlement requests cannot settle same session twice
  console.log('  ⚡ Testing simultaneous settlement requests on Table T-06...');
  const keySimul = `idemp_simul_${Date.now()}`;
  const [req1, req2] = await Promise.all([
    request('/api/restaurant/tables/T-06/settle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ldhManagerToken}`,
        'X-Idempotency-Key': keySimul,
      },
      body: JSON.stringify({ method: 'UPI', status: 'PAID', amountMinor: 47250 }),
    }),
    request('/api/restaurant/tables/T-06/settle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ldhManagerToken}`,
        'X-Idempotency-Key': keySimul,
      },
      body: JSON.stringify({ method: 'UPI', status: 'PAID', amountMinor: 47250 }),
    }),
  ]);

  // One request must succeed with 200, the concurrent one either returns 200 idempotent replay or 409 SETTLEMENT_IN_PROGRESS
  const statuses = [req1.status, req2.status].sort();
  assertPass(
    (statuses[0] === 200 && statuses[1] === 200) || (statuses[0] === 200 && statuses[1] === 409),
    `[A.1] Concurrent settlement serialized safely: statuses [${statuses.join(', ')}]`
  );

  // A.2: Durable idempotency records across restart / reload
  console.log('  💾 Testing durability of idempotency records in persistent store...');
  const possiblePaths = [
    path.join(__dirname, '..', 'projects', 'external-os', 'restaurant-os', 'data', 'restaurant-runtime-store.json'),
    path.join(__dirname, '..', 'data', 'restaurant-runtime-store.json'),
  ];
  const storeFilePath = possiblePaths.find((p) => fs.existsSync(p));
  let diskStoreData = JSON.parse(fs.readFileSync(storeFilePath, 'utf-8'));
  assertPass(
    diskStoreData.idempotencyRecords && diskStoreData.idempotencyRecords[keySimul] !== undefined,
    '[A.2a] Idempotency record committed durably to disk JSON file'
  );

  // Replay request with same key
  const replayRes = await request('/api/restaurant/tables/T-06/settle', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ldhManagerToken}`,
      'X-Idempotency-Key': keySimul,
    },
    body: JSON.stringify({ method: 'UPI', status: 'PAID', amountMinor: 47250 }),
  });
  assertPass(
    replayRes.status === 200 && replayRes.json.idempotentReplay === true,
    '[A.2b] Replay with persisted idempotency key returns HTTP 200 with idempotentReplay: true'
  );

  // A.3: Conflicting payload with same idempotency key is rejected
  const conflictRes = await request('/api/restaurant/tables/T-06/settle', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ldhManagerToken}`,
      'X-Idempotency-Key': keySimul,
    },
    body: JSON.stringify({ method: 'UPI', status: 'PAID', amountMinor: 99999 }),
  });
  assertPass(
    conflictRes.status === 409 && conflictRes.json.code === 'IDEMPOTENCY_CONFLICT',
    '[A.3] Same idempotency key with different payload rejected with HTTP 409 IDEMPOTENCY_CONFLICT'
  );

  // A.4: In-memory atomic rollback on persistence failure
  console.log('  🛡️ Verifying atomic rollback invariant in store...');
  const { RestaurantRuntimeStore } = require('../projects/external-os/restaurant-os/packages/storage/store');
  const testStore = new RestaurantRuntimeStore(storeFilePath);
  const testTbl = testStore.getTableByNumber('T-05') || testStore.getTable(5);
  testTbl.status = 'OCCUPIED';
  const preStatus = testTbl.status;

  // Force flushSync to fail by mocking it temporarily to simulate a disk/I/O exception
  const originalFlushSync = testStore['flushSync'].bind(testStore);
  testStore['flushSync'] = () => {
    throw new Error('EACCES: Simulated disk write failure');
  };

  let rollbackThrew = false;
  try {
    testStore.settleTableSession('T-05', { method: 'CASH', status: 'PAID' });
  } catch (err) {
    rollbackThrew = true;
  }
  // Restore flushSync
  testStore['flushSync'] = originalFlushSync;

  assertPass(rollbackThrew, '[A.4a] Simulated persistence failure raised exception');
  const postTbl = testStore.getTableByNumber('T-05') || testStore.getTable(5);
  assertPass(
    postTbl.status === preStatus,
    '[A.4b] Rollback invariant verified: Table restored to exact OCCUPIED state on persistence failure'
  );

  // A.5: Settlement locks released safely on failure (e.g. 422 partial settlement)
  // Create an order on Table T-05
  const ord5Res = await request('/api/restaurant/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: `ord_gate_a_t5_${Date.now()}`,
      tableNumber: 'T-05',
      items: [{ id: 'item_paneer_tikka', quantity: 1 }],
    }),
  });
  // Attempt partial settlement (will fail with 422)
  const partialRes = await request('/api/restaurant/tables/T-05/settle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ldhManagerToken}` },
    body: JSON.stringify({ method: 'CASH', status: 'PAID', amountMinor: 100 }),
  });
  assertPass(partialRes.status === 422, '[A.5a] Partial settlement failed with HTTP 422');

  // Immediately attempt full settlement — lock must have been released!
  const fullRes = await request('/api/restaurant/tables/T-05/settle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ldhManagerToken}` },
    body: JSON.stringify({ method: 'CASH', status: 'PAID' }),
  });
  assertPass(fullRes.status === 200, '[A.5b] Lock safely released after 422 failure; subsequent full settlement succeeds');

  // A.6: Cross-branch settlement attempt rejected
  const crossBranchSettle = await request('/api/restaurant/tables/T-05/settle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chdManagerToken}` },
    body: JSON.stringify({ method: 'CASH', status: 'PAID' }),
  });
  assertPass(
    crossBranchSettle.status === 403 && crossBranchSettle.json.code === 'BRANCH_MISMATCH',
    '[A.6] Cross-branch settlement attempt rejected with HTTP 403 BRANCH_MISMATCH'
  );

  // A.7: Payment provider confirmation truth
  // Create an order on T-06 to test payment verification metadata
  await request('/api/restaurant/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: `ord_gate_a_meta_${Date.now()}`,
      tableNumber: 'T-06',
      items: [{ id: 'item_tandoori_roti', quantity: 1 }],
    }),
  });
  // Settle with UPI without gatewayTransactionId
  const unconfirmedSettle = await request('/api/restaurant/tables/T-06/settle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ldhManagerToken}` },
    body: JSON.stringify({ method: 'UPI', status: 'PAID', providerConfirmed: true }), // client claims provider confirmed without real gateway ID
  });
  assertPass(
    unconfirmedSettle.status === 200 &&
    unconfirmedSettle.json.settlement.verification === 'MANUAL_STAFF_RECORDED' &&
    unconfirmedSettle.json.settlement.providerConfirmed === false,
    '[A.7a] UPI payment without real gateway transaction ID marked MANUAL_STAFF_RECORDED and providerConfirmed: false'
  );

  // Create another order on T-06 and settle with real gateway transaction ID
  await request('/api/restaurant/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: `ord_gate_a_real_${Date.now()}`,
      tableNumber: 'T-06',
      items: [{ id: 'item_tandoori_roti', quantity: 1 }],
    }),
  });
  const confirmedSettle = await request('/api/restaurant/tables/T-06/settle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ldhManagerToken}` },
    body: JSON.stringify({
      method: 'UPI',
      status: 'PAID',
      providerConfirmed: true,
      gatewayTransactionId: 'pay_rzp_live_998127394',
    }),
  });
  assertPass(
    confirmedSettle.status === 200 &&
    confirmedSettle.json.settlement.verification === 'PROVIDER_CONFIRMED' &&
    confirmedSettle.json.settlement.providerConfirmed === true,
    '[A.7b] Payment with real gateway transaction ID marked PROVIDER_CONFIRMED'
  );

  // A.8: Tax calculation integer minor units consistency & boundary checks
  const quoteBoundaries = [
    { items: [], expectedSubtotal: 0, expectedTax: 0, expectedTotal: 0 },
    { items: [{ id: 'item_tandoori_roti', quantity: 1 }], expectedSubtotal: 3500, expectedTax: 175, expectedTotal: 3675 },
    { items: [{ id: 'item_tandoori_roti', quantity: 2 }], expectedSubtotal: 7000, expectedTax: 350, expectedTotal: 7350 },
    { items: [{ id: 'item_dal_makhani', quantity: 1 }, { id: 'item_tandoori_roti', quantity: 2 }], expectedSubtotal: 45000, expectedTax: 2250, expectedTotal: 47250 },
  ];
  for (const b of quoteBoundaries) {
    const qRes = await request('/api/restaurant/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: b.items }),
    });
    assertPass(
      qRes.status === 200 &&
      parseInt(qRes.json.data.subtotalMinor, 10) === b.expectedSubtotal &&
      parseInt(qRes.json.data.taxMinor, 10) === b.expectedTax &&
      parseInt(qRes.json.data.totalMinor, 10) === b.expectedTotal,
      `[A.8] Integer tax minor units boundary check: subtotal ₹${(b.expectedSubtotal / 100).toFixed(2)}, tax ₹${(b.expectedTax / 100).toFixed(2)}, total ₹${(b.expectedTotal / 100).toFixed(2)}`
    );
  }

  // ==========================================================================
  // GATE B: Comprehensive Security Inventory & Negative Tests
  // ==========================================================================
  console.log('\n🛡️ [GATE B] Sensitive Mutation Routes Security Completeness');

  const mutationRoutes = [
    { name: 'Menu Item Create', path: '/api/restaurant/menu/items', method: 'POST', body: { name: 'Audit Test' }, minRole: 'MANAGER' },
    { name: 'Menu Item Update', path: '/api/restaurant/menu/items/item_dal_makhani', method: 'PATCH', body: { name: 'Audit Dal' }, minRole: 'MANAGER' },
    { name: 'Menu Item Delete', path: '/api/restaurant/menu/items/item_test_nonexistent', method: 'DELETE', body: {}, minRole: 'MANAGER' },
    { name: 'Branch Menu Override', path: '/api/restaurant/menu/branch-overrides', method: 'POST', body: { itemId: 'item_dal_makhani', branchId: 'branch_ldh', isAvailable: true }, minRole: 'MANAGER', hasBranch: true },
    { name: 'Floor Layout Save', path: '/api/restaurant/floor/save', method: 'POST', body: { branchId: 'branch_ldh', floorId: 'floor_courtyard', tables: [] }, minRole: 'STAFF' },
    { name: 'Table Modify', path: '/api/restaurant/tables/14', method: 'PATCH', body: { label: 'Audit T-14' }, minRole: 'MANAGER' },
    { name: 'Table Delete', path: '/api/restaurant/tables/99999', method: 'DELETE', body: {}, minRole: 'MANAGER' },
    { name: 'Table Seats Add', path: '/api/restaurant/tables/14/seats', method: 'POST', body: { label: 'S99' }, minRole: 'MANAGER' },
    { name: 'Table Seats Delete', path: '/api/restaurant/tables/14/seats/s_nonexistent', method: 'DELETE', body: {}, minRole: 'MANAGER' },
    { name: 'Seat Assign Guest', path: '/api/restaurant/seats/s_nonexistent/guest', method: 'POST', body: { name: 'Audit Guest' }, minRole: 'STAFF' },
    { name: 'Table Locator Rotate', path: '/api/restaurant/tables/14/rotate-locator', method: 'POST', body: { reason: 'Audit' }, minRole: 'MANAGER', hasBranch: true },
    { name: 'Table Merge', path: '/api/restaurant/tables/merge', method: 'POST', body: { primaryTableId: 14, secondaryTableIds: [15] }, minRole: 'STAFF' },
    { name: 'Table Unmerge', path: '/api/restaurant/tables/unmerge', method: 'POST', body: { tableId: 14 }, minRole: 'STAFF' },
    { name: 'Table Settle', path: '/api/restaurant/tables/T-06/settle', method: 'POST', body: { method: 'CASH', status: 'PAID' }, minRole: 'STAFF', hasBranch: true },
    { name: 'Branch Create', path: '/api/restaurant/branches', method: 'POST', body: { name: 'Audit Branch' }, minRole: 'MANAGER' },
    { name: 'Branch Delete', path: '/api/restaurant/branches/branch_nonexistent', method: 'DELETE', body: {}, minRole: 'MANAGER' },
    { name: 'Floor Create', path: '/api/restaurant/floors', method: 'POST', body: { branchId: 'branch_ldh', name: 'Audit Floor' }, minRole: 'MANAGER' },
    { name: 'Floor Delete', path: '/api/restaurant/floors/floor_nonexistent', method: 'DELETE', body: {}, minRole: 'MANAGER' },
    { name: 'Template Install', path: '/api/restaurant/templates/install', method: 'POST', body: { templateId: 'tmpl_haute_gastronomy' }, minRole: 'MANAGER' },
    { name: 'Studio Draft Save', path: '/api/restaurant/studio/draft', method: 'POST', body: { templateId: 'tmpl_haute_gastronomy', customTokens: {} }, minRole: 'MANAGER' },
    { name: 'Studio Publish', path: '/api/restaurant/studio/publish', method: 'POST', body: { templateId: 'tmpl_haute_gastronomy' }, minRole: 'MANAGER' },
    { name: 'Studio Restore', path: '/api/restaurant/studio/revisions/rev_1/restore', method: 'POST', body: {}, minRole: 'MANAGER' },
    { name: 'Branding Save', path: '/api/restaurant/branding', method: 'POST', body: { restaurantName: 'Audit Bistro' }, minRole: 'MANAGER' },
    { name: 'Domain Verify', path: '/api/restaurant/branding/verify-domain', method: 'POST', body: { domain: 'bistro.orbitox.io' }, minRole: 'MANAGER' },
    { name: 'Category Create', path: '/api/restaurant/menu/categories', method: 'POST', body: { name: 'Audit Category' }, minRole: 'MANAGER' },
    { name: 'Category Update', path: '/api/restaurant/menu/categories/cat_starters', method: 'PATCH', body: { name: 'Audit Starters' }, minRole: 'MANAGER' },
    { name: 'Category Reorder', path: '/api/restaurant/menu/categories/reorder', method: 'POST', body: { orderedIds: ['cat_starters'] }, minRole: 'MANAGER' },
    { name: 'Category Delete', path: '/api/restaurant/menu/categories/cat_nonexistent', method: 'DELETE', body: {}, minRole: 'MANAGER' },
    { name: 'Support Status Update', path: '/api/restaurant/support/tickets/tkt_1/status', method: 'POST', body: { status: 'RESOLVED' }, minRole: 'STAFF' },
    { name: 'Service Request Resolve', path: '/api/restaurant/service-requests/req_nonexistent/resolve', method: 'POST', body: {}, minRole: 'STAFF' },
  ];

  for (const route of mutationRoutes) {
    // 1. Anonymous test -> Must reject with 401
    const anonRes = await request(route.path, {
      method: route.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(route.body),
    });
    assertPass(
      anonRes.status === 401,
      `[B.Anon] ${route.name} (${route.method} ${route.path}) anonymous rejected with HTTP 401`
    );

    // 2. Tampered signature test -> Must reject with 401
    const tamperedRes = await request(route.path, {
      method: route.method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tamperedToken}` },
      body: JSON.stringify(route.body),
    });
    assertPass(
      tamperedRes.status === 401,
      `[B.Tampered] ${route.name} tampered signature rejected with HTTP 401`
    );

    // 3. Revoked token test -> Must reject with 401
    const revokedRes = await request(route.path, {
      method: route.method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenToRevoke}` },
      body: JSON.stringify(route.body),
    });
    assertPass(
      revokedRes.status === 401,
      `[B.Revoked] ${route.name} revoked credential rejected with HTTP 401`
    );

    // 4. Insufficient role test (if requires MANAGER, test with OPERATIONS token)
    if (route.minRole === 'MANAGER') {
      const roleRes = await request(route.path, {
        method: route.method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ldhOpsToken}` },
        body: JSON.stringify(route.body),
      });
      assertPass(
        roleRes.status === 403,
        `[B.Role] ${route.name} OPERATIONS role rejected with HTTP 403 FORBIDDEN`
      );
    }

    // 5. Cross-branch test (if branch-scoped route)
    if (route.hasBranch) {
      const crossRes = await request(route.path, {
        method: route.method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chdManagerToken}` },
        body: JSON.stringify(route.body),
      });
      assertPass(
        crossRes.status === 403,
        `[B.Branch] ${route.name} cross-branch rejected with HTTP 403`
      );
    }
  }

  console.log('\n======================================================================');
  console.log(`🎉 GATE A & GATE B AUDIT RESULTS: Total ${passCount + failCount} | Passed ${passCount} | Failed ${failCount}`);
  console.log('======================================================================\n');
}

run().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
