/**
 * Independent Forensic Audit & Verification Script
 * Validates:
 * 1. KDS Task Branch Isolation & Quarantine
 * 2. Idempotency Key Conflict Rejection (409) & Replay (200)
 * 3. Customer Identity Validation & Privacy Masking
 * 4. Real Server-Side Order Transition (CONFIRMED -> IN_PREPARATION -> READY)
 * 5. SSE Order-Scoped Isolation (Proves Client B does NOT receive Client A's events)
 * 6. White-Label Durability & Clean Reset
 */

const http = require('http');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:4010';

function request(method, pathUrl, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(pathUrl, BASE_URL);
    const reqHeaders = { 'Content-Type': 'application/json', ...headers };
    let payload = null;
    if (body !== null) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = http.request(
      urlObj,
      { method, headers: reqHeaders },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch (e) {}
          resolve({ status: res.statusCode, headers: res.headers, body: data, json });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runForensicAudit() {
  console.log('🔬 STARTING INDEPENDENT FORENSIC VERIFICATION...\n');
  const results = [];

  function record(id, title, passed, detail) {
    results.push({ id, title, passed, detail });
    console.log(`  ${passed ? '✅' : '❌'} [${id}] ${title}: ${detail}`);
  }

  // ---------------------------------------------------------------------------
  // 1. KDS Isolation & Quarantine
  // ---------------------------------------------------------------------------
  console.log('🛡️ 1. Testing KDS Task Branch Isolation & Quarantine...');
  
  // Create an order in Chandigarh branch
  const chdOrderRes = await request('POST', '/api/commerce/orders', {
    branchId: 'branch_chd',
    fulfillmentMethod: 'delivery',
    customerName: 'Chandigarh Patron',
    customerPhone: '9876543210',
    deliveryAddress: 'Sector 17, Chandigarh',
    items: [{ id: 'item_paneer_tikka', name: 'Paneer Tikka', quantity: 1, priceMinor: 35000 }],
  });
  const chdOrderId = chdOrderRes.json?.orderId;
  const chdOrderToken = chdOrderRes.json?.orderToken;

  // Retrieve Chandigarh KDS task
  const chdOrderData = await request('GET', `/api/commerce/orders/${chdOrderId}?orderToken=${chdOrderToken}`);
  const chdTaskId = chdOrderData.json?.order?.tasks?.[0]?.id || chdOrderData.json?.tasks?.[0]?.id;

  // Test 1.1: Cross-branch mutation rejection (Ludhiana chef token attempting to mutate Chandigarh task)
  const crossBranchRes = await request('POST', '/api/restaurant/kds/bump', {
    taskId: chdTaskId,
    newStatus: 'IN_PROGRESS',
  }, {
    Authorization: 'Bearer staff:operations', // Ludhiana branch operator
  });
  record(
    'SEC-01',
    'Cross-Branch KDS Rejection',
    crossBranchRes.status === 403 && crossBranchRes.json?.code === 'BRANCH_MISMATCH',
    `Status ${crossBranchRes.status}, code: ${crossBranchRes.json?.code}`
  );

  // Test 1.2: Unknown Task Protection
  const unknownTaskRes = await request('POST', '/api/restaurant/kds/bump', {
    taskId: 'task_nonexistent_xyz',
    newStatus: 'IN_PROGRESS',
  }, {
    Authorization: 'Bearer staff:manager',
  });
  record(
    'SEC-02',
    'Unknown Task Protection',
    unknownTaskRes.status === 404 && unknownTaskRes.json?.code === 'TASK_NOT_FOUND',
    `Status ${unknownTaskRes.status}, code: ${unknownTaskRes.json?.code}`
  );

  // ---------------------------------------------------------------------------
  // 2. Idempotency Key Scope & 409 Conflict Rejection
  // ---------------------------------------------------------------------------
  console.log('\n🔒 2. Testing Idempotency Key Conflict & Replay...');
  const testIdempKey = `audit-key-${Date.now()}`;
  
  // Create a real Ludhiana order
  const orderRes = await request('POST', '/api/commerce/orders', {
    branchId: 'branch_ldh',
    fulfillmentMethod: 'delivery',
    customerName: 'Audit Customer',
    customerPhone: '9876543210',
    deliveryAddress: '100 Audit Boulevard, Ludhiana',
    items: [{ id: 'item_tandoori_roti', name: 'Tandoori Roti', quantity: 1, priceMinor: 3500 }],
  });
  const createdOrderId = orderRes.json?.orderId;
  const orderToken = orderRes.json?.orderToken;

  // Fetch tasks for this order
  const trackingInitial = await request('GET', `/api/commerce/orders/${createdOrderId}?orderToken=${orderToken}`);
  const taskToBump = trackingInitial.json?.order?.tasks?.[0]?.id || trackingInitial.json?.tasks?.[0]?.id;

  // 2.1 First bump with idempotency key
  const firstValidBump = await request('POST', '/api/restaurant/kds/bump', {
    taskId: taskToBump,
    newStatus: 'IN_PROGRESS',
    station: 'TANDOOR',
  }, {
    Authorization: 'Bearer staff:manager',
    'x-idempotency-key': testIdempKey,
  });
  record(
    'IDEMP-01',
    'Initial Mutation with Idempotency Key',
    firstValidBump.status === 200,
    `Status ${firstValidBump.status}`
  );

  // 2.2 Replay identical
  const replayBump = await request('POST', '/api/restaurant/kds/bump', {
    taskId: taskToBump,
    newStatus: 'IN_PROGRESS',
    station: 'TANDOOR',
  }, {
    Authorization: 'Bearer staff:manager',
    'x-idempotency-key': testIdempKey,
  });
  record(
    'IDEMP-02',
    'Exact Duplicate Replay Returns 200 with idempotentReplay: true',
    replayBump.status === 200 && replayBump.json?.idempotentReplay === true,
    `Status ${replayBump.status}, idempotentReplay: ${replayBump.json?.idempotentReplay}`
  );

  // 2.3 Conflicting payload under same key
  const conflictBump = await request('POST', '/api/restaurant/kds/bump', {
    taskId: taskToBump,
    newStatus: 'READY', // altered status!
    station: 'TANDOOR',
  }, {
    Authorization: 'Bearer staff:manager',
    'x-idempotency-key': testIdempKey,
  });
  record(
    'IDEMP-03',
    'Conflicting Payload Under Same Key Rejection (409)',
    conflictBump.status === 409 && conflictBump.json?.code === 'IDEMPOTENCY_CONFLICT',
    `Status ${conflictBump.status}, code: ${conflictBump.json?.code}`
  );

  // ---------------------------------------------------------------------------
  // 3. Customer Identity Validation & Privacy Masking
  // ---------------------------------------------------------------------------
  console.log('\n👤 3. Testing Customer Identity Validation & Privacy Masking...');

  // 3.1 Invalid phone format
  const badPhoneRes = await request('POST', '/api/commerce/orders', {
    branchId: 'branch_ldh',
    fulfillmentMethod: 'delivery',
    customerName: 'Forensic User',
    customerPhone: '12345', // invalid
    deliveryAddress: 'Some Street',
    items: [{ id: 'item_tandoori_roti', name: 'Tandoori Roti', quantity: 1, priceMinor: 3500 }],
  });
  record(
    'IDENT-01',
    'Invalid Phone Rejected with 400 INVALID_PHONE_NUMBER',
    badPhoneRes.status === 400 && (badPhoneRes.json?.error === 'INVALID_PHONE_NUMBER' || badPhoneRes.json?.code === 'INVALID_PHONE_NUMBER'),
    `Status ${badPhoneRes.status}, error: ${badPhoneRes.json?.error}`
  );

  // 3.2 HTML tag injection in name
  const xssNameRes = await request('POST', '/api/commerce/orders', {
    branchId: 'branch_ldh',
    fulfillmentMethod: 'delivery',
    customerName: '<script>alert("xss")</script>',
    customerPhone: '9876543210',
    deliveryAddress: 'Some Street',
    items: [{ id: 'item_tandoori_roti', name: 'Tandoori Roti', quantity: 1, priceMinor: 3500 }],
  });
  record(
    'IDENT-02',
    'HTML Injected Name Rejected with 400 INVALID_CUSTOMER_NAME',
    xssNameRes.status === 400 && (xssNameRes.json?.error === 'INVALID_CUSTOMER_NAME' || xssNameRes.json?.code === 'INVALID_CUSTOMER_NAME'),
    `Status ${xssNameRes.status}, error: ${xssNameRes.json?.error}`
  );

  // 3.3 Public query masking
  const publicOrderQuery = await request('GET', `/api/commerce/orders/${createdOrderId}`);
  const publicPhone = publicOrderQuery.json?.order?.customerPhone;
  const publicAddress = publicOrderQuery.json?.order?.deliveryAddress;
  record(
    'PRIV-01',
    'Unauthenticated Query Masks Personal Data',
    publicOrderQuery.status === 200 && publicPhone === '+91 ******3210' && publicAddress === '[Protected Delivery Address]',
    `Phone: "${publicPhone}", Address: "${publicAddress}"`
  );

  // 3.4 Authorized query with orderToken reveals full details
  const authOrderQuery = await request('GET', `/api/commerce/orders/${createdOrderId}?orderToken=${orderToken}`);
  const authPhone = authOrderQuery.json?.order?.customerPhone;
  const authAddress = authOrderQuery.json?.order?.deliveryAddress;
  record(
    'PRIV-02',
    'OrderToken Query Receives Full Details',
    authOrderQuery.status === 200 && authPhone === '+91 98765 43210' && authAddress === '100 Audit Boulevard, Ludhiana',
    `Phone: "${authPhone}", Address: "${authAddress}"`
  );

  // 3.5 Tampered orderToken rejected with 403
  const forgedTokenQuery = await request('GET', `/api/commerce/orders/${createdOrderId}?orderToken=ordtok_fake1234567890abcdef`);
  record(
    'PRIV-03',
    'Forged OrderToken Rejected with 403',
    forgedTokenQuery.status === 403 && forgedTokenQuery.json?.error === 'UNAUTHORIZED_ORDER_ACCESS',
    `Status ${forgedTokenQuery.status}, error: ${forgedTokenQuery.json?.error}`
  );

  // ---------------------------------------------------------------------------
  // 4. Real Server-Side Order Transition (Domain Events)
  // ---------------------------------------------------------------------------
  console.log('\n🍳 4. Testing Real Authoritative Order Progression...');

  // Order status after bump to IN_PROGRESS should be IN_PREPARATION
  const trackInPrep = await request('GET', `/api/commerce/orders/${createdOrderId}?orderToken=${orderToken}`);
  const currentLiveStatus = trackInPrep.json?.status;
  record(
    'PROG-01',
    'Order Status is IN_PREPARATION after Task Starts',
    currentLiveStatus === 'IN_PREPARATION',
    `status: ${currentLiveStatus}`
  );

  // Bump task to READY
  await request('POST', '/api/restaurant/kds/bump', {
    taskId: taskToBump,
    newStatus: 'READY',
    station: 'TANDOOR',
  }, {
    Authorization: 'Bearer staff:manager',
    'x-idempotency-key': `audit-ready-${Date.now()}`,
  });
  const trackReady = await request('GET', `/api/commerce/orders/${createdOrderId}?orderToken=${orderToken}`);
  const readyLiveStatus = trackReady.json?.status;
  record(
    'PROG-02',
    'Order Status is READY after All Tasks Ready',
    readyLiveStatus === 'READY',
    `status: ${readyLiveStatus}`
  );

  // ---------------------------------------------------------------------------
  // 5. SSE Isolation Verification (Order-Scoped)
  // ---------------------------------------------------------------------------
  console.log('\n📡 5. Testing SSE Subscription Isolation...');

  // Create Order B
  const orderBRes = await request('POST', '/api/commerce/orders', {
    branchId: 'branch_ldh',
    fulfillmentMethod: 'delivery',
    customerName: 'Customer B',
    customerPhone: '9811122233',
    deliveryAddress: '200 B Street',
    items: [{ id: 'item_tandoori_roti', name: 'Tandoori Roti', quantity: 1, priceMinor: 3500 }],
  });
  const orderBId = orderBRes.json?.orderId;
  const orderBToken = orderBRes.json?.orderToken;

  // Open SSE client for Order B
  let orderBReceivedEvents = [];
  const sseReq = http.request(
    new URL(`/api/restaurant/events?orderToken=${orderBToken}`, BASE_URL),
    { method: 'GET', headers: { Accept: 'text/event-stream' } },
    (res) => {
      res.on('data', (chunk) => {
        const text = chunk.toString();
        orderBReceivedEvents.push(text);
      });
    }
  );
  sseReq.end();
  await new Promise((r) => setTimeout(r, 600)); // wait for connection

  // Now trigger an event on Order A (bump to BUMPED / SERVED)
  await request('POST', '/api/restaurant/kds/bump', {
    taskId: taskToBump,
    newStatus: 'BUMPED',
    station: 'TANDOOR',
  }, {
    Authorization: 'Bearer staff:manager',
    'x-idempotency-key': `audit-bumped-${Date.now()}`,
  });
  await new Promise((r) => setTimeout(r, 600)); // wait for event propagation

  // Close SSE stream
  sseReq.destroy();

  // Check if Order B's stream received Order A's event
  const leakedOrderA = orderBReceivedEvents.some((txt) => txt.includes(createdOrderId));
  record(
    'SSE-01',
    'SSE Subscription Scoping Prevents Cross-Order Leakage',
    !leakedOrderA,
    `Leaked Order A to Client B: ${leakedOrderA}`
  );

  // ---------------------------------------------------------------------------
  // 6. White-Label Durability & Clean Reset
  // ---------------------------------------------------------------------------
  console.log('\n🎨 6. Testing White-Label Branch Override Durability & Reset...');

  // Save override for Chandigarh
  const saveWlRes = await request('POST', '/api/restaurant/branding/branch-overrides', {
    branchId: 'branch_chd',
    restaurantName: 'The Audit Heritage Palace',
    primaryColor: '#7A3E1D',
  }, {
    Authorization: 'Bearer staff:manager',
  });
  record(
    'WL-01',
    'Branch Override Saved Successfully',
    saveWlRes.status === 200 && saveWlRes.json?.success === true,
    `Status ${saveWlRes.status}`
  );

  // Verify GET returns override
  const getWlChd = await request('GET', '/api/restaurant/branding/branch-overrides?branchId=branch_chd');
  record(
    'WL-02',
    'GET Returns Active Override',
    getWlChd.json?.isOverridden === true && getWlChd.json?.effective?.restaurantName === 'The Audit Heritage Palace',
    `Name: "${getWlChd.json?.effective?.restaurantName}", isOverridden: ${getWlChd.json?.isOverridden}`
  );

  // Verify unmodified Ludhiana branch cleanly inherits
  const getWlLdh = await request('GET', '/api/restaurant/branding/branch-overrides?branchId=branch_ldh');
  record(
    'WL-03',
    'Unmodified Branch Inherits Base Brand Defaults',
    getWlLdh.json?.isOverridden === false && getWlLdh.json?.effective?.restaurantName === 'OrbitoX Bistro & Bar',
    `Ludhiana Name: "${getWlLdh.json?.effective?.restaurantName}", isOverridden: ${getWlLdh.json?.isOverridden}`
  );

  // Reset Chandigarh override
  const resetWlRes = await request('DELETE', '/api/restaurant/branding/branch-overrides/branch_chd', null, {
    Authorization: 'Bearer staff:manager',
  });
  record(
    'WL-04',
    'Reset Branch Override Returns 200',
    resetWlRes.status === 200 && resetWlRes.json?.success === true,
    `Status ${resetWlRes.status}`
  );

  // Verify Chandigarh now inherits base defaults
  const getWlChdPostReset = await request('GET', '/api/restaurant/branding/branch-overrides?branchId=branch_chd');
  record(
    'WL-05',
    'Post-Reset Branch Inherits Base Brand Cleanly',
    getWlChdPostReset.json?.isOverridden === false && getWlChdPostReset.json?.effective?.restaurantName === 'OrbitoX Bistro & Bar',
    `Post-Reset Name: "${getWlChdPostReset.json?.effective?.restaurantName}", isOverridden: ${getWlChdPostReset.json?.isOverridden}`
  );

  console.log('\n======================================================================');
  const allPassed = results.every((r) => r.passed);
  console.log(`🏁 AUDIT EXECUTION COMPLETE: ${results.filter((r) => r.passed).length} / ${results.length} PASSED`);
  console.log('======================================================================\n');

  if (!allPassed) process.exit(1);
}

runForensicAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
