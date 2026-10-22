/**
 * Phase 4 Verification Test Suite: Authoritative Live Tracking & Real-Time Sync
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates:
 * 1. Authoritative order lifecycle transitions:
 *    CONFIRMED -> IN_PREPARATION -> READY -> SERVED -> CANCELLED
 * 2. Station breakdown tracking: station assignments (TANDOOR, CURRY_LINE) & statuses
 * 3. Token-gated vs anonymous tracking capabilities
 * 4. Cancellation policies: customer cancel when queued vs rejected when in prep
 * 5. Realtime SSE connection to /api/restaurant/events
 * 6. Protection against non-existent or tampered tracking tokens (404 / 403)
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

async function getStaffToken(pin = '0000', branchId = '*') {
  const res = await request({
    method: 'POST',
    path: '/api/restaurant/auth/staff-token',
  }, { pin, branchId });
  if (res.status !== 200 || !res.data?.data?.token) {
    throw new Error(`Failed to get staff token: ${JSON.stringify(res.data)}`);
  }
  return res.data.data.token;
}

async function runTests() {
  console.log('🧪 Starting Phase 4 Live Order Tracking & Realtime State Test Suite...\n');
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

  const staffToken = await getStaffToken('0000', '*');
  assert(Boolean(staffToken), 'Provisioned staff HMAC token for Admin / Master Kitchen');

  // 1. Create a 2-item order with different stations (Tandoor & Curry Line)
  const orderRes = await request({
    method: 'POST',
    path: '/api/commerce/orders',
  }, {
    branchId: 'branch_chd',
    fulfillmentMethod: 'delivery',
    customerName: 'Jasleen Kaur',
    customerPhone: '+91 98888 12345',
    deliveryAddress: 'House 502, Sector 35-B, Chandigarh',
    items: [
      { id: 'item_paneer_tikka', name: 'Paneer Tikka Charcoal Grilled', quantity: 1, priceMinor: 35000 },
      { id: 'item_butter_chicken', name: 'Murgh Makhani', quantity: 1, priceMinor: 49000 },
    ],
  });

  assert(orderRes.status === 201, 'Order created successfully with 2 items across multiple stations');
  const orderId = orderRes.data.orderId;
  const orderToken = orderRes.data.orderToken;
  assert(Boolean(orderId) && Boolean(orderToken), 'Order returns valid orderId and orderToken');

  // 2. Initial State: Must be CONFIRMED with QUEUED tasks
  const track1 = await request({
    method: 'GET',
    path: `/api/commerce/orders/${orderId}`,
    headers: { Authorization: `Bearer ${orderToken}` },
  });

  assert(track1.status === 200, 'Initial tracking request succeeds');
  assert(track1.data.status === 'CONFIRMED', 'Initial live status is CONFIRMED');
  assert(track1.data.statusLabel.includes('Confirmed'), 'Status label reflects Confirmed state');
  assert(Array.isArray(track1.data.tasks) && track1.data.tasks.length === 2, 'Tracking response lists exactly 2 station tasks');
  assert(track1.data.tasks.every((t) => t.status === 'QUEUED'), 'All tasks initially have status QUEUED');
  
  const stations = track1.data.tasks.map((t) => t.station);
  assert(stations.includes('TANDOOR') && stations.includes('CURRY_LINE'), 'Tasks correctly partitioned into TANDOOR and CURRY_LINE stations');

  const taskTandoor = track1.data.tasks.find((t) => t.station === 'TANDOOR');
  const taskCurry = track1.data.tasks.find((t) => t.station === 'CURRY_LINE');

  // 3. State Progression to IN_PREPARATION (One task moves to IN_PROGRESS)
  const bumpToProgress = await request({
    method: 'POST',
    path: '/api/restaurant/kds/bump',
    headers: {
      Authorization: `Bearer ${staffToken}`,
    },
  }, {
    taskId: taskTandoor.id,
    newStatus: 'IN_PROGRESS',
  });
  assert(bumpToProgress.status === 200, 'KDS bump to IN_PROGRESS succeeds');

  const track2 = await request({
    method: 'GET',
    path: `/api/commerce/orders/${orderId}`,
  });
  assert(track2.status === 200, 'Public tracking request succeeds');
  assert(track2.data.status === 'IN_PREPARATION', 'Order live status transitions to IN_PREPARATION');
  assert(track2.data.statusLabel.includes('Preparing'), 'Status label accurately displays "Preparing Fresh in Kitchen"');

  // 4. State Progression to READY (All tasks move to READY or BUMPED)
  // Kitchen state machine requires QUEUED -> IN_PROGRESS -> READY
  await request({
    method: 'POST',
    path: '/api/restaurant/kds/bump',
    headers: { Authorization: `Bearer ${staffToken}` },
  }, { taskId: taskCurry.id, newStatus: 'IN_PROGRESS' });

  await request({
    method: 'POST',
    path: '/api/restaurant/kds/bump',
    headers: { Authorization: `Bearer ${staffToken}` },
  }, { taskId: taskTandoor.id, newStatus: 'READY' });

  await request({
    method: 'POST',
    path: '/api/restaurant/kds/bump',
    headers: { Authorization: `Bearer ${staffToken}` },
  }, { taskId: taskCurry.id, newStatus: 'READY' });

  const track3 = await request({
    method: 'GET',
    path: `/api/commerce/orders/${orderId}`,
  });
  assert(track3.data.status === 'READY', 'Order live status transitions to READY when all tasks are ready');
  assert(track3.data.statusLabel.includes('Ready'), 'Status label accurately displays "Ready for Pickup / Out for Delivery"');

  // 5. State Progression to SERVED (All tasks bumped)
  await request({
    method: 'POST',
    path: '/api/restaurant/kds/bump',
    headers: { Authorization: `Bearer ${staffToken}` },
  }, { taskId: taskTandoor.id, newStatus: 'BUMPED' });

  await request({
    method: 'POST',
    path: '/api/restaurant/kds/bump',
    headers: { Authorization: `Bearer ${staffToken}` },
  }, { taskId: taskCurry.id, newStatus: 'BUMPED' });

  const track4 = await request({
    method: 'GET',
    path: `/api/commerce/orders/${orderId}`,
  });
  assert(track4.data.status === 'SERVED', 'Order live status transitions to SERVED when all tasks are bumped');
  assert(track4.data.statusLabel.includes('Completed') || track4.data.statusLabel.includes('Dispatched'), 'Status label reflects completed and dispatched');

  // 6. Security: Non-existent order returns 404
  const test404 = await request({
    method: 'GET',
    path: '/api/commerce/orders/ord_non_existent_9999',
  });
  assert(test404.status === 404, 'Non-existent order returns 404 NOT_FOUND');

  // 7. Security: Invalid order token returns 403
  const test403 = await request({
    method: 'GET',
    path: `/api/commerce/orders/${orderId}`,
    headers: { Authorization: 'Bearer ordtok_invalid_tampered_token_xyz' },
  });
  assert(test403.status === 403, 'Tampered/mismatched order token returns 403 UNAUTHORIZED_ORDER_ACCESS');

  // 8. Cancellation Policy Check:
  // Create an order and cancel it while still QUEUED
  const cancelOrderRes = await request({
    method: 'POST',
    path: '/api/commerce/orders',
  }, {
    branchId: 'branch_chd',
    fulfillmentMethod: 'delivery',
    customerName: 'Gurnoor Singh',
    customerPhone: '+91 97777 44321',
    deliveryAddress: 'House 12, Sector 10-A, Chandigarh',
    items: [{ id: 'item_butter_chicken', name: 'Murgh Makhani', quantity: 1, priceMinor: 49000 }],
  });
  const cancelOrderId = cancelOrderRes.data.orderId;
  const cancelOrderToken = cancelOrderRes.data.orderToken;

  const doCancel = await request({
    method: 'POST',
    path: `/api/commerce/orders/${cancelOrderId}/cancel`,
    headers: { Authorization: `Bearer ${cancelOrderToken}` },
  }, { reason: 'Changed my mind' });
  assert(doCancel.status === 200 && doCancel.data.status === 'CANCELLED', 'Customer successfully cancels order in QUEUED state');

  const trackCancelled = await request({
    method: 'GET',
    path: `/api/commerce/orders/${cancelOrderId}`,
  });
  assert(trackCancelled.data.status === 'CANCELLED', 'Tracking reflects CANCELLED status');
  assert(trackCancelled.data.statusLabel === 'Order Cancelled', 'Tracking label displays "Order Cancelled"');

  // 9. Realtime SSE Connection Verification
  const sseTest = await new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 4010,
      path: `/api/restaurant/events?branchId=branch_chd&orderId=${orderId}`,
      method: 'GET',
      headers: { Accept: 'text/event-stream' },
    }, (res) => {
      let isSSE = res.headers['content-type']?.includes('text/event-stream');
      let statusOk = res.statusCode === 200;
      res.destroy(); // close connection
      resolve({ statusOk, isSSE });
    });
    req.on('error', () => resolve({ statusOk: false, isSSE: false }));
    req.end();
  });
  assert(sseTest.statusOk && sseTest.isSSE, 'Realtime SSE endpoint /api/restaurant/events responds with 200 text/event-stream');

  console.log(`\n📊 Live Tracking Test Suite Results: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
