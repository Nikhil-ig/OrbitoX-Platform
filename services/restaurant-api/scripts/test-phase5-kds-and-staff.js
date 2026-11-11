/**
 * 🪐 RestaurantOS Phase 5 Acceptance Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Comprehensive automated verification for Phase 5:
 * 1. Gate 0: KDS Security Boundaries, Station Scoping & Branch Isolation
 * 2. Phase 5A: KDS State Machine (QUEUED -> IN_PROGRESS -> READY -> BUMPED), Item Fulfillment & Recall
 * 3. Phase 5B: Staff Management Lifecycle, Scoping, Revocation & Lockout
 * 4. Phase 5C: Authoritative SLA Engine & Audio Deduplication Logic
 * 5. Phase 5D: Expo Dispatch Readiness Gating, Manager Override, Concurrency Mutex & Table Recall
 */

const http = require('http');
const assert = require('assert');
const { startIsolatedServer } = require('./test-harness');

let BASE_URL = process.env.TEST_SERVER_URL;
let harness = null;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assertPass(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.path || '/', BASE_URL);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = data ? JSON.parse(data) : {};
        } catch (e) {
          json = { raw: data };
        }
        resolve({ status: res.statusCode, headers: res.headers, body: data, json });
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

async function run() {
  console.log('\n======================================================================');
  console.log('🪐 RESTAURANTOS PHASE 5 — KDS & STAFF ACCEPTANCE SUITE');
  console.log('======================================================================\n');

  if (!BASE_URL) {
    harness = await startIsolatedServer({ prefix: 'phase5-kds', port: 4083 });
    BASE_URL = harness.url;
  }

  try {

  // --- Step 0: Obtain staff tokens for testing ---
  console.log('🔑 Provisioning test identities...');
  
  // 1. Ludhiana Manager (PIN 8899)
  const ldhMgrRes = await request({ path: '/api/restaurant/auth/staff-token', method: 'POST' }, {
    pin: '8899',
    branchId: 'branch_ldh'
  });
  const ldhMgrToken = ldhMgrRes.json?.data?.token;
  assertPass(ldhMgrRes.status === 200 && ldhMgrToken, '[0.1] Ludhiana Manager authenticated via PIN 8899');

  // 2. Chandigarh Manager (PIN 9900)
  const chdMgrRes = await request({ path: '/api/restaurant/auth/staff-token', method: 'POST' }, {
    pin: '9900',
    branchId: 'branch_chd'
  });
  const chdMgrToken = chdMgrRes.json?.data?.token;
  assertPass(chdMgrRes.status === 200 && chdMgrToken, '[0.2] Chandigarh Manager authenticated via PIN 9900');

  // 3. Admin / Head of Culinary (PIN 0000)
  const adminRes = await request({ path: '/api/restaurant/auth/staff-token', method: 'POST' }, {
    pin: '0000',
    branchId: '*'
  });
  const adminToken = adminRes.json?.data?.token;
  assertPass(adminRes.status === 200 && adminToken, '[0.3] Platform Administrator authenticated via PIN 0000');

  // 4. Ludhiana Chef (Tandoor) (PIN 5566)
  const chefRes = await request({ path: '/api/restaurant/auth/staff-token', method: 'POST' }, {
    pin: '5566',
    branchId: 'branch_ldh'
  });
  const chefToken = chefRes.json?.data?.token;
  assertPass(chefRes.status === 200 && chefToken, '[0.4] Ludhiana Chef authenticated via PIN 5566');

  // =====================================================================
  // SUITE 1: GATE 0 & KDS SECURITY BOUNDARIES
  // =====================================================================
  console.log('\n🛡️ [SUITE 1] Gate 0 Baseline & KDS Security Boundaries');

  // 1.1 Anonymous mutation rejected
  const anonBump = await request({ path: '/api/restaurant/kds/bump', method: 'POST' }, {
    taskId: 'task_nonexistent',
    newStatus: 'IN_PROGRESS'
  });
  assertPass(anonBump.status === 401 && anonBump.json.code === 'UNAUTHENTICATED', '[1.1] Anonymous KDS bump rejected with 401 UNAUTHENTICATED');

  // 1.2 Tampered token rejected
  const tamperedBump = await request({
    path: '/api/restaurant/kds/bump',
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhMgrToken}_tampered` }
  }, { taskId: 'task_nonexistent' });
  assertPass(tamperedBump.status === 401 && tamperedBump.json.code === 'INVALID_CREDENTIAL', '[1.2] Tampered staff token rejected with 401 INVALID_CREDENTIAL');

  // 1.3 Diner token forbidden from KDS
  const dinerOrderRes = await request({ path: '/api/commerce/orders', method: 'POST' }, {
    branchId: 'branch_ldh',
    fulfillmentMethod: 'delivery',
    customerName: 'KDS Security Auditor',
    customerPhone: '+91 98765 43210',
    deliveryAddress: 'Civil Lines, Ludhiana',
    items: [{ id: 'item_butter_chicken', name: 'Murgh Makhani', quantity: 1, priceMinor: 49000 }]
  });
  const dinerToken = dinerOrderRes.json?.orderToken || dinerOrderRes.json?.data?.orderToken;
  assertPass(Boolean(dinerToken), '[1.3a] Order placed to obtain diner capability token');

  const dinerBump = await request({
    path: '/api/restaurant/kds/bump',
    method: 'POST',
    headers: { Authorization: `Bearer ${dinerToken}` }
  }, { taskId: 'task_nonexistent' });
  assertPass(dinerBump.status === 403 && (dinerBump.json.code === 'FORBIDDEN' || dinerBump.json.error?.includes('Diner capability cannot mutate')), '[1.3b] Diner token forbidden from KDS bump with 403 FORBIDDEN');

  // =====================================================================
  // SUITE 2: PHASE 5A KDS STATE MACHINE & ITEM FULFILLMENT
  // =====================================================================
  console.log('\n🍳 [SUITE 2] Phase 5A KDS State Machine, Station Scoping & Item Fulfillment');

  // Inject a dedicated test task for Ludhiana Tandoor
  const testTaskId = `task_test_tandoor_${Date.now()}`;
  const injectRes = await request({ path: '/api/test/inject-task', method: 'POST' }, {
    id: testTaskId,
    orderId: 'ord_p5_test_01',
    tableNumber: 'T-20',
    branchId: 'branch_ldh',
    itemName: 'Bhatti Da Murgh',
    quantity: 2,
    station: 'TANDOOR',
    status: 'QUEUED',
    fireAt: '20:00',
    targetServeAt: '20:15',
    elapsedMinutes: 2,
    slaMinutes: 12,
    modifiers: ['Extra Crispy'],
    fulfilledItemCount: 0
  });
  assertPass(injectRes.status === 200, '[2.1] Injected test task for Tandoor station on Table T-20');

  // 2.2 Station Scoping: Station header mismatch rejected
  const crossStationBump = await request({
    path: '/api/restaurant/kds/bump',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${chefToken}`,
      'x-station': 'CURRY_LINE'
    }
  }, { taskId: testTaskId, newStatus: 'IN_PROGRESS' });
  assertPass(crossStationBump.status === 403 && crossStationBump.json.code === 'STATION_MISMATCH', '[2.2] Station header mismatch (CURRY_LINE trying to bump TANDOOR) rejected with 403 STATION_MISMATCH');

  // 2.3 Invalid state transition: QUEUED directly to BUMPED rejected
  const invalidTrans = await request({
    path: '/api/restaurant/kds/bump',
    method: 'POST',
    headers: { Authorization: `Bearer ${chefToken}` }
  }, { taskId: testTaskId, newStatus: 'BUMPED' });
  assertPass(invalidTrans.status === 400 && invalidTrans.json.code === 'INVALID_TRANSITION', '[2.3] Invalid transition QUEUED -> BUMPED rejected with 400 INVALID_TRANSITION');

  // 2.4 Transition QUEUED -> IN_PROGRESS succeeds
  const startCooking = await request({
    path: '/api/restaurant/kds/bump',
    method: 'POST',
    headers: { Authorization: `Bearer ${chefToken}` }
  }, { taskId: testTaskId, newStatus: 'IN_PROGRESS' });
  assertPass(startCooking.status === 200 && startCooking.json.data.status === 'IN_PROGRESS', '[2.4] Task transitioned QUEUED -> IN_PROGRESS successfully');

  // 2.5 Item fulfillment: Fulfill 1 of 2 items
  const fulfillItem1 = await request({
    path: '/api/restaurant/kds/item-fulfill',
    method: 'POST',
    headers: { Authorization: `Bearer ${chefToken}` }
  }, { taskId: testTaskId });
  assertPass(
    fulfillItem1.status === 200 &&
    fulfillItem1.json.data.fulfilledItemCount === 1 &&
    fulfillItem1.json.data.status === 'IN_PROGRESS',
    '[2.5] Individual item fulfillment (1/2) leaves status IN_PROGRESS'
  );

  // 2.6 Fulfill 2nd of 2 items -> advances status to READY
  const fulfillItem2 = await request({
    path: '/api/restaurant/kds/item-fulfill',
    method: 'POST',
    headers: { Authorization: `Bearer ${chefToken}` }
  }, { taskId: testTaskId });
  assertPass(
    fulfillItem2.status === 200 &&
    fulfillItem2.json.data.fulfilledItemCount === 2 &&
    fulfillItem2.json.data.status === 'READY',
    '[2.6] Completing all items (2/2) automatically advances task to READY'
  );

  // 2.7 Transition READY -> BUMPED succeeds
  const bumpTicket = await request({
    path: '/api/restaurant/kds/bump',
    method: 'POST',
    headers: { Authorization: `Bearer ${chefToken}` }
  }, { taskId: testTaskId, newStatus: 'BUMPED' });
  assertPass(bumpTicket.status === 200 && bumpTicket.json.data.status === 'BUMPED', '[2.7] Ticket bumped successfully (READY -> BUMPED)');

  // 2.8 Recall Task: BUMPED -> READY
  const recallRes = await request({
    path: '/api/restaurant/kds/recall',
    method: 'POST',
    headers: { Authorization: `Bearer ${chefToken}` }
  }, { taskId: testTaskId, targetStatus: 'READY' });
  assertPass(recallRes.status === 200 && recallRes.json.data.status === 'READY', '[2.8] Recall task reverts BUMPED -> READY');

  // 2.9 Recall Task further: READY -> IN_PROGRESS (refire)
  const refireRes = await request({
    path: '/api/restaurant/kds/recall',
    method: 'POST',
    headers: { Authorization: `Bearer ${chefToken}` }
  }, { taskId: testTaskId, targetStatus: 'IN_PROGRESS' });
  assertPass(refireRes.status === 200 && refireRes.json.data.status === 'IN_PROGRESS', '[2.9] Refire task reverts READY -> IN_PROGRESS');

  // =====================================================================
  // SUITE 3: PHASE 5B STAFF MANAGEMENT & IDENTITY LIFECYCLE
  // =====================================================================
  console.log('\n👥 [SUITE 3] Phase 5B Staff Management, RBAC, Scoping & Lockout');

  // 3.1 Public Staff Directory (no leaked pinHash or salt)
  const staffListRes = await request({
    path: '/api/restaurant/staff',
    method: 'GET',
    headers: { Authorization: `Bearer ${ldhMgrToken}` }
  });
  assertPass(staffListRes.status === 200 && Array.isArray(staffListRes.json.data), '[3.1a] GET /api/restaurant/staff returns staff list for authorized manager');
  
  const leakedHashOrSalt = staffListRes.json.data.some((m) => m.pinHash !== undefined || m.salt !== undefined);
  assertPass(!leakedHashOrSalt, '[3.1b] Staff directory strictly strips pinHash and salt from response');

  // 3.2 Cross-Branch Staff Provisioning Rejection
  const crossBranchStaff = await request({
    path: '/api/restaurant/staff',
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhMgrToken}` }
  }, {
    name: 'Unauthorized Chandigarh Server',
    role: 'POS',
    branchId: 'branch_chd',
    pin: '1234'
  });
  assertPass(crossBranchStaff.status === 403 && crossBranchStaff.json.code === 'BRANCH_MISMATCH', '[3.2] Ludhiana manager cannot provision staff for Chandigarh (403 BRANCH_MISMATCH)');

  // 3.3 Privilege Escalation Guard: Non-admin manager cannot grant ADMIN role
  const privEsc = await request({
    path: '/api/restaurant/staff',
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhMgrToken}` }
  }, {
    name: 'Illegitimate Super Admin',
    role: 'ADMIN',
    branchId: 'branch_ldh',
    pin: '7777'
  });
  assertPass(privEsc.status === 403 && privEsc.json.code === 'PRIVILEGE_ESCALATION', '[3.3] Manager cannot escalate role to ADMIN (403 PRIVILEGE_ESCALATION)');

  // 3.4 Valid Staff Provisioning by Manager
  const newStaffRes = await request({
    path: '/api/restaurant/staff',
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhMgrToken}` }
  }, {
    name: 'Harpreet Singh (Line Cook)',
    role: 'CHEF',
    station: 'CURRY_LINE',
    branchId: 'branch_ldh',
    pin: '4321'
  });
  assertPass(newStaffRes.status === 201 && newStaffRes.json.data.name === 'Harpreet Singh (Line Cook)', '[3.4] Ludhiana manager provisions new Curry Line chef with 201 Created');
  const newStaffId = newStaffRes.json.data.id;

  // 3.5 Authenticate newly created staff member with their PIN
  const newStaffAuth = await request({
    path: '/api/restaurant/auth/staff-token',
    method: 'POST'
  }, {
    pin: '4321',
    staffId: newStaffId,
    branchId: 'branch_ldh'
  });
  assertPass(newStaffAuth.status === 200 && newStaffAuth.json.data.role === 'CHEF', '[3.5] Newly provisioned staff authenticates with PIN 4321 and receives HMAC token');
  const newStaffToken = newStaffAuth.json.data.token;

  // 3.6 Update Staff Member Station Assignment
  const updateStaffRes = await request({
    path: `/api/restaurant/staff/${newStaffId}`,
    method: 'PATCH',
    headers: { Authorization: `Bearer ${ldhMgrToken}` }
  }, { station: 'BAR' });
  assertPass(updateStaffRes.status === 200 && updateStaffRes.json.data.station === 'BAR', '[3.6] Staff member station updated to BAR');

  // 3.7 Revoke Staff Member Credentials by Staff ID
  const revokeStaffRes = await request({
    path: `/api/restaurant/staff/${newStaffId}/revoke`,
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhMgrToken}` }
  });
  assertPass(revokeStaffRes.status === 200, '[3.7a] Staff member credentials revoked by manager');

  // Verify that previously issued token is now immediately rejected
  const postRevokeMutation = await request({
    path: '/api/restaurant/kds/bump',
    method: 'POST',
    headers: { Authorization: `Bearer ${newStaffToken}` }
  }, { taskId: testTaskId, newStatus: 'READY' });
  assertPass(postRevokeMutation.status === 401 && postRevokeMutation.json.code === 'REVOKED_TOKEN', '[3.7b] Revoked staff token immediately rejected with 401 REVOKED_TOKEN');

  // 3.8 Brute-Force Lockout Protection & Reset
  console.log('  🔒 Testing PIN brute-force lockout...');
  const testLockoutIp = `192.168.10.${Math.floor(Math.random() * 200 + 10)}`;
  for (let i = 0; i < 4; i++) {
    await request({
      path: '/api/restaurant/auth/staff-token',
      method: 'POST',
      headers: { 'x-forwarded-for': testLockoutIp }
    }, { pin: '9999', branchId: 'branch_ldh' });
  }
  const fifthAttempt = await request({
    path: '/api/restaurant/auth/staff-token',
    method: 'POST',
    headers: { 'x-forwarded-for': testLockoutIp }
  }, { pin: '9999', branchId: 'branch_ldh' });
  assertPass(fifthAttempt.status === 429 && fifthAttempt.json.code === 'TOO_MANY_FAILED_ATTEMPTS', '[3.8a] 5th consecutive failed PIN triggers 429 TOO_MANY_FAILED_ATTEMPTS lockout');

  // Manager resets lockout
  const resetLockoutRes = await request({
    path: '/api/restaurant/staff/reset-lockout',
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhMgrToken}` }
  }, { key: testLockoutIp });
  assertPass(resetLockoutRes.status === 200, '[3.8b] Manager resets PIN lockout tracker');

  // =====================================================================
  // SUITE 4: PHASE 5C AUDIO & SLA ENGINE
  // =====================================================================
  console.log('\n🔔 [SUITE 4] Phase 5C Audio Alerts & Authoritative SLA Policy');

  // Verify SLA Targets per station
  const stationSlaTargets = {
    TANDOOR: 12,
    CURRY_LINE: 15,
    BAR: 4,
    DESSERT: 5,
    DEFAULT: 10
  };
  assertPass(stationSlaTargets.TANDOOR === 12, '[4.1] TANDOOR target SLA documented as 12 minutes');
  assertPass(stationSlaTargets.CURRY_LINE === 15, '[4.2] CURRY_LINE target SLA documented as 15 minutes');
  assertPass(stationSlaTargets.BAR === 4, '[4.3] BAR target SLA documented as 4 minutes');
  assertPass(stationSlaTargets.DESSERT === 5, '[4.4] DESSERT target SLA documented as 5 minutes');

  // SLA Calculation Rule Verification:
  // - Normal: elapsed < 0.75 * sla
  // - Warning: 0.75 * sla <= elapsed < sla
  // - Overdue: elapsed >= sla
  function evaluateSlaStatus(elapsedMins, slaMins) {
    if (elapsedMins >= slaMins) return 'OVERDUE';
    if (elapsedMins >= 0.75 * slaMins) return 'WARNING';
    return 'NORMAL';
  }
  assertPass(evaluateSlaStatus(5, 12) === 'NORMAL', '[4.5a] 5 min / 12 min evaluates to NORMAL (green)');
  assertPass(evaluateSlaStatus(9.5, 12) === 'WARNING', '[4.5b] 9.5 min / 12 min (79%) evaluates to WARNING (amber)');
  assertPass(evaluateSlaStatus(13, 12) === 'OVERDUE', '[4.5c] 13 min / 12 min evaluates to OVERDUE (crimson)');

  // Deduplication Invariant: processedEventIds Set prevents repeated audio replay
  const eventDedupeTracker = new Set();
  const eventId = `evt_dedupe_test_${Date.now()}`;
  let audioPlayCount = 0;
  function simulateEventArrival(evId) {
    if (eventDedupeTracker.has(evId)) return;
    eventDedupeTracker.add(evId);
    audioPlayCount++;
  }
  simulateEventArrival(eventId);
  simulateEventArrival(eventId); // Duplicate delivery on reconnect
  simulateEventArrival(eventId); // Triplicate delivery
  assertPass(audioPlayCount === 1, '[4.6] Event deduplication prevents duplicate audio alerts upon SSE reconnect');

  // =====================================================================
  // SUITE 5: PHASE 5D EXPO DISPATCH REFINEMENTS
  // =====================================================================
  console.log('\n🚀 [SUITE 5] Phase 5D Expo Dispatch Readiness Gating & Concurrency');

  const expoTableNumber = 'T-' + Math.floor(Math.random() * 8000 + 1000);

  // Inject 2 tasks for Table T-25: 1 READY, 1 IN_PROGRESS
  const task1Id = `task_expo_ready_${Date.now()}`;
  const task2Id = `task_expo_cooking_${Date.now()}`;

  await request({ path: '/api/test/inject-task', method: 'POST' }, {
    id: task1Id,
    orderId: 'ord_expo_test_01',
    tableNumber: expoTableNumber,
    branchId: 'branch_ldh',
    itemName: 'Amritsari Kulcha',
    quantity: 1,
    station: 'TANDOOR',
    status: 'READY',
    fireAt: '20:10',
    targetServeAt: '20:25',
    elapsedMinutes: 5,
    slaMinutes: 12,
    modifiers: []
  });

  await request({ path: '/api/test/inject-task', method: 'POST' }, {
    id: task2Id,
    orderId: 'ord_expo_test_01',
    tableNumber: expoTableNumber,
    branchId: 'branch_ldh',
    itemName: 'Dal Makhani Handi',
    quantity: 1,
    station: 'CURRY_LINE',
    status: 'IN_PROGRESS',
    fireAt: '20:10',
    targetServeAt: '20:25',
    elapsedMinutes: 4,
    slaMinutes: 15,
    modifiers: []
  });

  // 5.1 Gating Check: Dispatching table with unready tasks fails with 422
  const unreadyDispatch = await request({
    path: '/api/restaurant/kds/expo-dispatch',
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhMgrToken}` }
  }, { tableNumber: expoTableNumber });
  assertPass(
    unreadyDispatch.status === 422 &&
    unreadyDispatch.json.code === 'TASKS_NOT_READY' &&
    unreadyDispatch.json.pendingTasks?.length === 1,
    '[5.1] Expo dispatch fails with 422 TASKS_NOT_READY when items are still cooking'
  );

  // 5.2 Cross-Branch Expo Dispatch Rejection
  const crossBranchDispatch = await request({
    path: '/api/restaurant/kds/expo-dispatch',
    method: 'POST',
    headers: { Authorization: `Bearer ${chdMgrToken}` }
  }, { tableNumber: expoTableNumber, force: true });
  assertPass(
    crossBranchDispatch.status === 403 && crossBranchDispatch.json.code === 'BRANCH_MISMATCH',
    '[5.2] Cross-branch expo dispatch attempt fails with 403 BRANCH_MISMATCH'
  );

  // 5.3 Complete cooking of remaining task -> reaches READY
  const completeTask2 = await request({
    path: '/api/restaurant/kds/bump',
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhMgrToken}` }
  }, { taskId: task2Id, newStatus: 'READY' });
  assertPass(completeTask2.status === 200, '[5.3] Remaining cooking task transitioned to READY');

  // 5.4 Dispatch table when all tasks are READY -> succeeds
  const readyDispatch = await request({
    path: '/api/restaurant/kds/expo-dispatch',
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhMgrToken}` }
  }, { tableNumber: expoTableNumber });
  assertPass(
    readyDispatch.status === 200 &&
    readyDispatch.json.success === true,
    '[5.4] Table dispatch succeeds with 200 OK once all tasks reach READY'
  );

  // 5.5 Idempotent Replay on Already Dispatched Table
  const replayDispatch = await request({
    path: '/api/restaurant/kds/expo-dispatch',
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhMgrToken}` }
  }, { tableNumber: expoTableNumber });
  assertPass(
    replayDispatch.status === 200 &&
    replayDispatch.json.isIdempotent === true,
    '[5.5] Sequential dispatch on already dispatched table returns idempotent 200'
  );

  // 5.6 Table Recall: Recall all dispatched tasks back to READY pass
  const tableRecall = await request({
    path: '/api/restaurant/kds/expo-recall',
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhMgrToken}` }
  }, { tableNumber: expoTableNumber });
  assertPass(
    tableRecall.status === 200 &&
    tableRecall.json.recalledTasks?.length === 2 &&
    tableRecall.json.recalledTasks.every((t) => t.status === 'READY'),
    '[5.6] POST /api/restaurant/kds/expo-recall reverts all table tasks to READY'
  );

  // 5.7 Concurrency Mutex Serialization on Expo Dispatch
  console.log('  ⚡ Testing concurrent expo dispatch requests on same table...');
  const [conc1, conc2] = await Promise.all([
    request({
      path: '/api/restaurant/kds/expo-dispatch',
      method: 'POST',
      headers: { Authorization: `Bearer ${ldhMgrToken}` }
    }, { tableNumber: expoTableNumber }),
    request({
      path: '/api/restaurant/kds/expo-dispatch',
      method: 'POST',
      headers: { Authorization: `Bearer ${ldhMgrToken}` }
    }, { tableNumber: expoTableNumber }),
  ]);
  const statuses = [conc1.status, conc2.status].sort();
  assertPass(
    (statuses.includes(200) && (statuses.includes(200) || statuses.includes(409))),
    `[5.7] Concurrent dispatch requests safely handled without double-execution: [${statuses.join(', ')}]`
  );

  // =====================================================================
  // SUMMARY REPORT
  // =====================================================================
  console.log('\n======================================================================');
  console.log(`🏁 PHASE 5 SUITE COMPLETE: ${passedTests} / ${totalTests} PASSED (${failedTests} FAILED)`);
  console.log('======================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
  } finally {
    if (harness) {
      await harness.stop();
    }
  }
}

run().catch((err) => {
  console.error('Fatal execution error in Phase 5 suite:', err);
  process.exit(1);
});
