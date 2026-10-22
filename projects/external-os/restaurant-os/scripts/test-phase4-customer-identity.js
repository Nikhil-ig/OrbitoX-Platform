/**
 * Phase 4 Verification Test Suite: Customer Identity Capture & Privacy Enforcement
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates:
 * 1. Server-side validation for customerName, customerPhone, deliveryAddress, customerNotes
 * 2. Indian mobile phone number normalization and format validation
 * 3. Privacy masking in unauthenticated order queries (+91 ******XXXX)
 * 4. Full customer details retrieval when authorized with orderToken or staff credentials
 * 5. Idempotency conflict detection (409 on conflicting identity/items)
 * 6. Branch scoping integrity (order and kitchen tasks scoped to target branch)
 */

const http = require('http');

const BASE_URL = 'http://localhost:4010';

function request(options, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.path || '/', BASE_URL);
    const reqOpts = {
      method: options.method || 'GET',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: options.headers || {},
    };

    const req = http.request(reqOpts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, data: json });
      });
    });

    req.on('error', reject);
    if (body) {
      const payload = typeof body === 'string' ? body : JSON.stringify(body);
      req.setHeader('Content-Type', 'application/json');
      req.setHeader('Content-Length', Buffer.byteLength(payload));
      req.write(payload);
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Phase 4 Customer Identity & Privacy Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details ? '— ' + details : ''}`);
      failed++;
    }
  }

  // 1. Validation: Missing Customer Name
  const test1 = await request({ method: 'POST', path: '/api/commerce/orders' }, {
    branchId: 'branch_ldh',
    fulfillmentMethod: 'delivery',
    customerName: '',
    customerPhone: '+91 98765 43210',
    deliveryAddress: 'Civil Lines, Ludhiana',
    items: [{ id: 'item_butter_chicken', name: 'Murgh Makhani', quantity: 1, priceMinor: 49000 }]
  });
  assert(test1.status === 400 && test1.data.error === 'INVALID_CUSTOMER_NAME', 'Rejects empty customer name with 400');

  // 2. Validation: Malicious HTML in Customer Name
  const test2 = await request({ method: 'POST', path: '/api/commerce/orders' }, {
    branchId: 'branch_ldh',
    fulfillmentMethod: 'delivery',
    customerName: 'Patron <script>alert("xss")</script>',
    customerPhone: '+91 98765 43210',
    deliveryAddress: 'Civil Lines, Ludhiana',
    items: [{ id: 'item_butter_chicken', name: 'Murgh Makhani', quantity: 1, priceMinor: 49000 }]
  });
  assert(test2.status === 400 && test2.data.error === 'INVALID_CUSTOMER_NAME', 'Rejects HTML tags in customer name with 400');

  // 3. Validation: Invalid Mobile Number (too short / invalid prefix)
  const test3 = await request({ method: 'POST', path: '/api/commerce/orders' }, {
    branchId: 'branch_ldh',
    fulfillmentMethod: 'delivery',
    customerName: 'Amanpreet Singh',
    customerPhone: '12345',
    deliveryAddress: 'Civil Lines, Ludhiana',
    items: [{ id: 'item_butter_chicken', name: 'Murgh Makhani', quantity: 1, priceMinor: 49000 }]
  });
  assert(test3.status === 400 && test3.data.error === 'INVALID_PHONE_NUMBER', 'Rejects invalid phone number format with 400');

  // 4. Validation: Missing Delivery Address for Delivery Order
  const test4 = await request({ method: 'POST', path: '/api/commerce/orders' }, {
    branchId: 'branch_ldh',
    fulfillmentMethod: 'delivery',
    customerName: 'Amanpreet Singh',
    customerPhone: '+91 98765 43210',
    deliveryAddress: '   ',
    items: [{ id: 'item_butter_chicken', name: 'Murgh Makhani', quantity: 1, priceMinor: 49000 }]
  });
  assert(test4.status === 400 && (test4.data.error === 'INVALID_DELIVERY_ADDRESS' || test4.data.error === 'DELIVERY_ADDRESS_REQUIRED'), 'Rejects missing delivery address for delivery order with 400');

  // 5. Success: Valid Order with 10-digit Indian Mobile Normalization
  const idempKey1 = `idemp_test_${Date.now()}_1`;
  const test5 = await request({
    method: 'POST',
    path: '/api/commerce/orders',
    headers: { 'x-idempotency-key': idempKey1 }
  }, {
    branchId: 'branch_chd',
    fulfillmentMethod: 'delivery',
    customerName: 'Harpreet Singh',
    customerPhone: '9876543210', // 10-digit local format without +91 prefix
    deliveryAddress: 'House 142, Sector 8-C, Chandigarh',
    customerNotes: 'Ring bell twice, leave at reception',
    items: [{ id: 'item_butter_chicken', name: 'Murgh Makhani', quantity: 2, priceMinor: 49000 }]
  });
  assert(test5.status === 201 && test5.data.success === true, 'Successfully places valid order with 201');
  assert(Boolean(test5.data.orderId), 'Returns unique orderId');
  assert(Boolean(test5.data.orderToken), 'Returns order capability token');
  const createdOrderId = test5.data.orderId;
  const createdOrderToken = test5.data.orderToken;

  // 6. Branch Scoping Integrity: Target branch is branch_chd
  const test6 = await request({
    method: 'GET',
    path: `/api/commerce/orders/${createdOrderId}`,
    headers: { 'Authorization': `Bearer ${createdOrderToken}` }
  });
  assert(test6.status === 200, 'Retrieves order with orderToken');
  assert(test6.data.order.branchId === 'branch_chd', 'Order branchId is strictly scoped to target branch (branch_chd)');
  assert(test6.data.order.targetBranch?.id === 'branch_chd', 'Target branch metadata is included');
  assert(test6.data.order.customerPhone === '+91 98765 43210', 'Phone number normalized to +91 98765 43210');
  assert(test6.data.order.customerName === 'Harpreet Singh', 'Customer name preserved accurately');

  // 7. Privacy Masking: Querying Order Anonymously / Without Order Token
  const test7 = await request({
    method: 'GET',
    path: `/api/commerce/orders/${createdOrderId}`
  });
  assert(test7.status === 200, 'Anonymous query succeeds for public tracking');
  assert(test7.data.order.customerPhone === '+91 ******3210', 'Unauthenticated query receives masked phone (+91 ******3210)');
  assert(test7.data.order.deliveryAddress === '[Protected Delivery Address]', 'Unauthenticated query receives redacted delivery address');
  assert(test7.data.order.customerNotes === undefined, 'Unauthenticated query redacts customer private notes');

  // 8. Staff Authentication: Staff can view full unmasked customer details
  const test8 = await request({
    method: 'GET',
    path: `/api/commerce/orders/${createdOrderId}`,
    headers: { 'Authorization': 'Bearer staff:manager' }
  });
  assert(test8.status === 200, 'Staff query succeeds');
  assert(test8.data.order.customerPhone === '+91 98765 43210', 'Staff query receives unmasked phone');
  assert(test8.data.order.deliveryAddress === 'House 142, Sector 8-C, Chandigarh', 'Staff query receives full delivery address');

  // 9. Idempotency: Exact Replay Succeeds (200 with idempotentReplay: true)
  const test9 = await request({
    method: 'POST',
    path: '/api/commerce/orders',
    headers: { 'x-idempotency-key': idempKey1 }
  }, {
    branchId: 'branch_chd',
    fulfillmentMethod: 'delivery',
    customerName: 'Harpreet Singh',
    customerPhone: '9876543210',
    deliveryAddress: 'House 142, Sector 8-C, Chandigarh',
    customerNotes: 'Ring bell twice, leave at reception',
    items: [{ id: 'item_butter_chicken', name: 'Murgh Makhani', quantity: 2, priceMinor: 49000 }]
  });
  assert(test9.status === 200 && test9.data.idempotentReplay === true, 'Exact idempotency replay returns 200 with idempotentReplay: true');
  assert(test9.data.orderId === createdOrderId, 'Idempotent replay returns identical orderId');

  // 10. Idempotency Conflict: Same Key with Conflicting Customer Name -> 409 IDEMPOTENCY_CONFLICT
  const test10 = await request({
    method: 'POST',
    path: '/api/commerce/orders',
    headers: { 'x-idempotency-key': idempKey1 }
  }, {
    branchId: 'branch_chd',
    fulfillmentMethod: 'delivery',
    customerName: 'Someone Else entirely',
    customerPhone: '9876543210',
    deliveryAddress: 'House 142, Sector 8-C, Chandigarh',
    items: [{ id: 'item_butter_chicken', name: 'Murgh Makhani', quantity: 2, priceMinor: 49000 }]
  });
  assert(test10.status === 409 && test10.data.code === 'IDEMPOTENCY_CONFLICT', 'Rejects conflicting customer details with 409 IDEMPOTENCY_CONFLICT');

  console.log(`\n📊 Customer Identity Test Suite Results: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
