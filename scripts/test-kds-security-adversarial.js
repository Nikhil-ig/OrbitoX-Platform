/**
 * 🛡️ RestaurantOS 5.3 — KDS Adversarial Security & Authorization Regression Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates fail-closed security and comprehensive authorization matrix across:
 * - /api/restaurant/kds/bump (& alternate /api/restaurant/kds, /api/restaurant/kds/tasks/:id/bump)
 * - /api/restaurant/kds/fulfill-item (& alias /api/restaurant/kds/item-fulfill, /api/restaurant/kds/tasks/:id/fulfill-item)
 * - /api/restaurant/kds/recall (& /api/restaurant/kds/tasks/:id/recall)
 * - /api/restaurant/kds/expo-dispatch (& /api/restaurant/kds/tasks/:id/dispatch)
 *
 * Test Matrix Cases (1 through 9):
 * 1. Anonymous request (Fail-closed in both prod & dev) -> 401 UNAUTHENTICATED
 * 2. Malformed / tampered credential -> 401 INVALID_CREDENTIAL
 * 3. Explicitly revoked credential -> 401 REVOKED_TOKEN / FORBIDDEN
 * 4. Authenticated but unauthorized role (POS, Diner) -> 403 FORBIDDEN
 * 5. Valid staff member from wrong branch (Delhi manager on Ludhiana task) -> 403 BRANCH_MISMATCH
 * 6. Wrong station / unauthorized station scope -> 403 STATION_MISMATCH
 * 7. Authorized staff member performing legitimate operation -> 200 OK
 * 8. Invalid or terminal-state transition -> 400 INVALID_TRANSITION / ALREADY_COMPLETED
 * 9. Idempotent repeat request -> 200 OK (isIdempotent: true)
 *
 * Assertions:
 * - HTTP status code
 * - Error code in payload
 * - State immutability on rejected mutations (zero state drift)
 */

const assert = require('assert');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const RUNTIME_URL = 'http://localhost:4010';

async function request(path, options = {}) {
  const url = `${RUNTIME_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (err) {
    json = null;
  }
  return { status: res.status, headers: res.headers, text, json };
}

async function getStaffToken(pin, branchId) {
  const res = await request('/api/restaurant/auth/staff-token', {
    method: 'POST',
    body: { pin, branchId },
  });
  assert.strictEqual(res.status, 200, `PIN auth must succeed for pin ${pin}`);
  assert(res.json.data && res.json.data.token, 'Token must be present in response');
  return res.json.data.token;
}

let passedCount = 0;
let totalCount = 0;

function pass(code, message) {
  passedCount++;
  totalCount++;
  console.log(`  ✅ [${code}] ${message}`);
}

async function runAdversarialSuite() {
  console.log('🛡️ ========================================================');
  console.log('🛡️ RESTAURANTOS 5.3: KDS SECURITY ADVERSARIAL MATRIX');
  console.log('🛡️ ========================================================\n');

  // --- Step 0: Provision identities ---
  console.log('🔑 Provisioning Cryptographic Tokens...');
  const ldhChefToken = await getStaffToken('5566', 'branch_ldh');   // CHEF, TANDOOR, branch_ldh
  const ldhOpsToken = await getStaffToken('1122', 'branch_ldh');    // OPERATIONS, branch_ldh
  const ldhPosToken = await getStaffToken('3344', 'branch_ldh');    // POS, branch_ldh
  const delMgrToken = await getStaffToken('7788', 'branch_del');    // MANAGER, branch_del (WRONG BRANCH)
  const adminWildcardToken = await getStaffToken('0000', '*');       // ADMIN, branchId: '*'
  const revocableToken = await getStaffToken('1122', 'branch_ldh'); // To be revoked

  // Diner capability token
  const dinerJoin = await request('/api/restaurant/sessions/join', {
    method: 'POST',
    body: { tableNumber: 'T-14', guestName: 'DinerHacker' },
  });
  assert.strictEqual(dinerJoin.status, 200, 'Diner join succeeded');
  const dinerCapToken = dinerJoin.json.data.capabilityToken;
  assert(dinerCapToken.startsWith('cap_'), 'Diner capability token prefix verified');

  // Revoke the revocable token (Authorized by Manager/Admin)
  const revokeRes = await request('/api/restaurant/auth/revoke', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminWildcardToken}` },
    body: { token: revocableToken },
  });
  assert.strictEqual(revokeRes.status, 200, 'Staff token revoked successfully');
  console.log('  ✓ Tokens provisioned and revocation registered.\n');

  // --- Step 1: Create isolated order for testing ---
  console.log('📦 Setting up isolated order with multi-station tasks...');
  const tableNumber = 'T-04';
  const createOrderRes = await request('/api/restaurant/orders', {
    method: 'POST',
    body: {
      tableNumber,
      items: [
        { id: 'item_paneer_tikka', quantity: 2 }, // TANDOOR station
        { id: 'item_dal_makhani', quantity: 1 },  // CURRY_LINE station
      ],
    },
  });
  assert.strictEqual(createOrderRes.status, 201, 'Order created');
  const placedOrderId = createOrderRes.json.data.orderId;

  const kdsQueueRes = await request('/api/restaurant/kds?station=ALL');
  const tandoorTask = kdsQueueRes.json.data.find((t) => t.orderId === placedOrderId && t.station === 'TANDOOR');
  const curryTask = kdsQueueRes.json.data.find((t) => t.orderId === placedOrderId && t.station === 'CURRY_LINE');
  assert(tandoorTask, 'Tandoor task created');
  assert(curryTask, 'Curry Line task created');
  assert.strictEqual(tandoorTask.status, 'QUEUED');
  assert.strictEqual(tandoorTask.fulfilledItemCount || 0, 0);
  console.log(`  ✓ Tandoor Task: ${tandoorTask.id}, Curry Task: ${curryTask.id}\n`);

  // =========================================================================
  // SECTION 1: KDS BUMP MUTATION (/api/restaurant/kds/bump)
  // =========================================================================
  console.log('⚡ [ENDPOINT 1/4] /api/restaurant/kds/bump & Aliases');

  // Case 1: Anonymous request
  const anonBump = await request('/api/restaurant/kds/bump', {
    method: 'POST',
    body: { taskId: tandoorTask.id, newStatus: 'IN_PROGRESS' },
  });
  assert.strictEqual(anonBump.status, 401);
  assert.strictEqual(anonBump.json.code, 'UNAUTHENTICATED');
  pass('BUMP-1', 'Anonymous bump rejected with 401 UNAUTHENTICATED');

  // Case 2: Malformed / tampered credential
  const tamperedBump = await request('/api/restaurant/kds/bump', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhChefToken}_corrupt_sig` },
    body: { taskId: tandoorTask.id, newStatus: 'IN_PROGRESS' },
  });
  assert.strictEqual(tamperedBump.status, 401);
  assert.strictEqual(tamperedBump.json.code, 'INVALID_CREDENTIAL');
  pass('BUMP-2', 'Tampered credential rejected with 401 INVALID_CREDENTIAL');

  // Case 3: Revoked credential
  const revokedBump = await request('/api/restaurant/kds/bump', {
    method: 'POST',
    headers: { Authorization: `Bearer ${revocableToken}` },
    body: { taskId: tandoorTask.id, newStatus: 'IN_PROGRESS' },
  });
  assert.strictEqual(revokedBump.status, 401);
  assert.strictEqual(revokedBump.json.code, 'REVOKED_TOKEN');
  pass('BUMP-3', 'Revoked credential rejected with 401 REVOKED_TOKEN');

  // Case 4a: Unauthorized role (POS)
  const posBump = await request('/api/restaurant/kds/bump', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhPosToken}` },
    body: { taskId: tandoorTask.id, newStatus: 'IN_PROGRESS' },
  });
  assert.strictEqual(posBump.status, 403);
  assert.strictEqual(posBump.json.code, 'FORBIDDEN');
  pass('BUMP-4a', 'POS role rejected on kitchen bump with 403 FORBIDDEN');

  // Case 4b: Unauthorized role (DINER capability)
  const dinerBump = await request('/api/restaurant/kds/bump', {
    method: 'POST',
    headers: { Authorization: `Bearer ${dinerCapToken}` },
    body: { taskId: tandoorTask.id, newStatus: 'IN_PROGRESS' },
  });
  assert.strictEqual(dinerBump.status, 403);
  assert.strictEqual(dinerBump.json.code, 'FORBIDDEN');
  pass('BUMP-4b', 'Diner capability token rejected on kitchen bump with 403 FORBIDDEN');

  // Case 5: Valid staff member from wrong branch (Delhi Manager)
  const wrongBranchBump = await request('/api/restaurant/kds/bump', {
    method: 'POST',
    headers: { Authorization: `Bearer ${delMgrToken}` },
    body: { taskId: tandoorTask.id, newStatus: 'IN_PROGRESS' },
  });
  assert.strictEqual(wrongBranchBump.status, 403);
  assert.strictEqual(wrongBranchBump.json.code, 'BRANCH_MISMATCH');
  pass('BUMP-5', 'Cross-branch staff bump rejected with 403 BRANCH_MISMATCH');

  // Case 6: Station mismatch (Tandoor Chef on Curry task)
  const stationMismatchBump = await request('/api/restaurant/kds/bump', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhChefToken}` },
    body: { taskId: curryTask.id, newStatus: 'IN_PROGRESS' },
  });
  assert.strictEqual(stationMismatchBump.status, 403);
  assert.strictEqual(stationMismatchBump.json.code, 'STATION_MISMATCH');
  pass('BUMP-6', 'Chef station mismatch rejected with 403 STATION_MISMATCH');

  // State immutability check: ensure rejected requests caused zero mutation
  const checkQueue1 = await request('/api/restaurant/kds?station=ALL');
  const tandoorCheck1 = checkQueue1.json.data.find((t) => t.id === tandoorTask.id);
  assert.strictEqual(tandoorCheck1.status, 'QUEUED', 'Tandoor task still QUEUED after rejected mutations');
  assert.strictEqual(tandoorCheck1.fulfilledItemCount || 0, 0, 'Fulfilled items count remains 0');
  pass('BUMP-IMMUTABLE', 'Authoritative state untouched across all rejected bump attacks');

  // Case 7: Authorized Chef performing legitimate transition (QUEUED -> IN_PROGRESS)
  const authBump = await request('/api/restaurant/kds/bump', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhChefToken}` },
    body: { taskId: tandoorTask.id, newStatus: 'IN_PROGRESS' },
  });
  assert.strictEqual(authBump.status, 200);
  assert.strictEqual(authBump.json.data.status, 'IN_PROGRESS');
  assert.strictEqual(authBump.json.isIdempotent, false);
  pass('BUMP-7', 'Authorized Chef successfully transitions task to IN_PROGRESS');

  // Case 8: Invalid transition (IN_PROGRESS -> BUMPED directly, skipping READY)
  const invalidTransitionBump = await request('/api/restaurant/kds/bump', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhChefToken}` },
    body: { taskId: tandoorTask.id, newStatus: 'BUMPED' },
  });
  assert.strictEqual(invalidTransitionBump.status, 400);
  assert.strictEqual(invalidTransitionBump.json.code, 'INVALID_TRANSITION');
  pass('BUMP-8', 'Illegal jump transition (IN_PROGRESS -> BUMPED) rejected with 400 INVALID_TRANSITION');

  // Case 9: Idempotent repeat request
  const repeatBump = await request('/api/restaurant/kds/bump', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhChefToken}` },
    body: { taskId: tandoorTask.id, newStatus: 'IN_PROGRESS' },
  });
  assert.strictEqual(repeatBump.status, 200);
  assert.strictEqual(repeatBump.json.data.status, 'IN_PROGRESS');
  assert.strictEqual(repeatBump.json.isIdempotent, true);
  pass('BUMP-9', 'Duplicate status request handled idempotently with isIdempotent: true');

  // Alternate route alias test: RESTful /api/restaurant/kds/tasks/:id/bump
  const restfulBump = await request(`/api/restaurant/kds/tasks/${tandoorTask.id}/bump`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhChefToken}` },
    body: { newStatus: 'READY' },
  });
  assert.strictEqual(restfulBump.status, 200);
  assert.strictEqual(restfulBump.json.data.status, 'READY');
  pass('BUMP-RESTFUL-ALIAS', 'RESTful alias /api/restaurant/kds/tasks/:id/bump succeeds with auth');

  // Alternate route alias test: Legacy POST /api/restaurant/kds
  const legacyBump = await request('/api/restaurant/kds', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhChefToken}` },
    body: { taskId: tandoorTask.id, newStatus: 'BUMPED' },
  });
  assert.strictEqual(legacyBump.status, 200);
  assert.strictEqual(legacyBump.json.data.status, 'BUMPED');
  pass('BUMP-LEGACY-ALIAS', 'Legacy alias POST /api/restaurant/kds succeeds with auth');

  console.log('\n------------------------------------------------------------\n');

  // =========================================================================
  // SECTION 2: ITEM FULFILLMENT (/api/restaurant/kds/fulfill-item & /item-fulfill)
  // =========================================================================
  console.log('⚡ [ENDPOINT 2/4] /api/restaurant/kds/fulfill-item & /item-fulfill');

  // Recall tandoor task back to IN_PROGRESS so it can receive item fulfillment
  const prepRecall = await request('/api/restaurant/kds/recall', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhChefToken}` },
    body: { taskId: tandoorTask.id, targetStatus: 'IN_PROGRESS' },
  });
  assert.strictEqual(prepRecall.status, 200);
  // Reset fulfilled count for clean test
  const curTask = (await request('/api/restaurant/kds?station=ALL')).json.data.find((t) => t.id === tandoorTask.id);

  // Case 1: Anonymous request
  const anonFulfill = await request('/api/restaurant/kds/fulfill-item', {
    method: 'POST',
    body: { taskId: curryTask.id },
  });
  assert.strictEqual(anonFulfill.status, 401);
  assert.strictEqual(anonFulfill.json.code, 'UNAUTHENTICATED');
  pass('FULFILL-1', 'Anonymous item fulfill rejected with 401 UNAUTHENTICATED');

  // Case 2: Tampered credential
  const tamperedFulfill = await request('/api/restaurant/kds/fulfill-item', {
    method: 'POST',
    headers: { Authorization: 'Bearer forged.token.here' },
    body: { taskId: curryTask.id },
  });
  assert.strictEqual(tamperedFulfill.status, 401);
  assert.strictEqual(tamperedFulfill.json.code, 'INVALID_CREDENTIAL');
  pass('FULFILL-2', 'Tampered credential rejected with 401 INVALID_CREDENTIAL');

  // Case 3: Revoked credential
  const revokedFulfill = await request('/api/restaurant/kds/fulfill-item', {
    method: 'POST',
    headers: { Authorization: `Bearer ${revocableToken}` },
    body: { taskId: curryTask.id },
  });
  assert.strictEqual(revokedFulfill.status, 401);
  assert.strictEqual(revokedFulfill.json.code, 'REVOKED_TOKEN');
  pass('FULFILL-3', 'Revoked credential rejected with 401 REVOKED_TOKEN');

  // Case 4: Unauthorized role (POS)
  const posFulfill = await request('/api/restaurant/kds/fulfill-item', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhPosToken}` },
    body: { taskId: curryTask.id },
  });
  assert.strictEqual(posFulfill.status, 403);
  assert.strictEqual(posFulfill.json.code, 'FORBIDDEN');
  pass('FULFILL-4', 'POS role rejected on item fulfill with 403 FORBIDDEN');

  // Case 5: Wrong branch (Delhi Manager)
  const wrongBranchFulfill = await request('/api/restaurant/kds/fulfill-item', {
    method: 'POST',
    headers: { Authorization: `Bearer ${delMgrToken}` },
    body: { taskId: curryTask.id },
  });
  assert.strictEqual(wrongBranchFulfill.status, 403);
  assert.strictEqual(wrongBranchFulfill.json.code, 'BRANCH_MISMATCH');
  pass('FULFILL-5', 'Cross-branch staff item fulfill rejected with 403 BRANCH_MISMATCH');

  // Case 6: Station mismatch (Tandoor Chef on Curry Task)
  const stationMismatchFulfill = await request('/api/restaurant/kds/fulfill-item', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhChefToken}` },
    body: { taskId: curryTask.id },
  });
  assert.strictEqual(stationMismatchFulfill.status, 403);
  assert.strictEqual(stationMismatchFulfill.json.code, 'STATION_MISMATCH');
  pass('FULFILL-6', 'Station mismatch rejected on item fulfill with 403 STATION_MISMATCH');

  // Case 7: Authorized chef fulfilling item on Tandoor Task (1 of 2)
  const authFulfill1 = await request('/api/restaurant/kds/fulfill-item', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhChefToken}` },
    body: { taskId: tandoorTask.id },
  });
  assert.strictEqual(authFulfill1.status, 200);
  assert.strictEqual(authFulfill1.json.data.fulfilledItemCount, 1);
  pass('FULFILL-7a', 'Authorized Chef successfully increments item fulfill count to 1/2');

  // Fulfill 2 of 2 -> reaches quantity
  const authFulfill2 = await request('/api/restaurant/kds/item-fulfill', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhChefToken}` },
    body: { taskId: tandoorTask.id },
  });
  assert.strictEqual(authFulfill2.status, 200);
  assert.strictEqual(authFulfill2.json.data.fulfilledItemCount, 2);
  assert.strictEqual(authFulfill2.json.data.status, 'READY');
  pass('FULFILL-7b', 'Item fulfill via /item-fulfill alias increments count to 2/2 and transitions to READY');

  // Case 8: Cannot fulfill already completed / bumped task
  // Bump to BUMPED
  await request('/api/restaurant/kds/bump', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhChefToken}` },
    body: { taskId: tandoorTask.id, newStatus: 'BUMPED' },
  });
  const terminalFulfill = await request('/api/restaurant/kds/fulfill-item', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhChefToken}` },
    body: { taskId: tandoorTask.id },
  });
  assert.strictEqual(terminalFulfill.status, 400);
  assert.strictEqual(terminalFulfill.json.code, 'ALREADY_COMPLETED');
  pass('FULFILL-8', 'Item fulfillment on BUMPED task rejected with 400 ALREADY_COMPLETED');

  // RESTful alias: POST /api/restaurant/kds/tasks/:id/fulfill-item
  // Recall task first
  await request('/api/restaurant/kds/recall', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhChefToken}` },
    body: { taskId: tandoorTask.id, targetStatus: 'IN_PROGRESS' },
  });
  const restfulFulfill = await request(`/api/restaurant/kds/tasks/${tandoorTask.id}/fulfill-item`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhChefToken}` },
  });
  assert.strictEqual(restfulFulfill.status, 200);
  pass('FULFILL-RESTFUL-ALIAS', 'RESTful alias /api/restaurant/kds/tasks/:id/fulfill-item authorized and executed');

  console.log('\n------------------------------------------------------------\n');

  // =========================================================================
  // SECTION 3: TASK RECALL (/api/restaurant/kds/recall & /tasks/:id/recall)
  // =========================================================================
  console.log('⚡ [ENDPOINT 3/4] /api/restaurant/kds/recall & /tasks/:id/recall');

  // Bump tandoor task to READY then BUMPED so recall can be tested
  await request('/api/restaurant/kds/bump', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhChefToken}` },
    body: { taskId: tandoorTask.id, newStatus: 'READY' },
  });
  await request('/api/restaurant/kds/bump', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhChefToken}` },
    body: { taskId: tandoorTask.id, newStatus: 'BUMPED' },
  });

  // Case 1: Anonymous request
  const anonRecall = await request('/api/restaurant/kds/recall', {
    method: 'POST',
    body: { taskId: tandoorTask.id },
  });
  assert.strictEqual(anonRecall.status, 401);
  assert.strictEqual(anonRecall.json.code, 'UNAUTHENTICATED');
  pass('RECALL-1', 'Anonymous recall rejected with 401 UNAUTHENTICATED');

  // Case 2: Tampered credential
  const tamperedRecall = await request('/api/restaurant/kds/recall', {
    method: 'POST',
    headers: { Authorization: 'Bearer invalid.token' },
    body: { taskId: tandoorTask.id },
  });
  assert.strictEqual(tamperedRecall.status, 401);
  assert.strictEqual(tamperedRecall.json.code, 'INVALID_CREDENTIAL');
  pass('RECALL-2', 'Tampered credential rejected with 401 INVALID_CREDENTIAL');

  // Case 3: Revoked credential
  const revokedRecall = await request('/api/restaurant/kds/recall', {
    method: 'POST',
    headers: { Authorization: `Bearer ${revocableToken}` },
    body: { taskId: tandoorTask.id },
  });
  assert.strictEqual(revokedRecall.status, 401);
  assert.strictEqual(revokedRecall.json.code, 'REVOKED_TOKEN');
  pass('RECALL-3', 'Revoked credential rejected with 401 REVOKED_TOKEN');

  // Case 4: Unauthorized role (POS)
  const posRecall = await request('/api/restaurant/kds/recall', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhPosToken}` },
    body: { taskId: tandoorTask.id },
  });
  assert.strictEqual(posRecall.status, 403);
  assert.strictEqual(posRecall.json.code, 'FORBIDDEN');
  pass('RECALL-4', 'POS role rejected on recall with 403 FORBIDDEN');

  // Case 5: Wrong branch (Delhi Manager)
  const wrongBranchRecall = await request('/api/restaurant/kds/recall', {
    method: 'POST',
    headers: { Authorization: `Bearer ${delMgrToken}` },
    body: { taskId: tandoorTask.id },
  });
  assert.strictEqual(wrongBranchRecall.status, 403);
  assert.strictEqual(wrongBranchRecall.json.code, 'BRANCH_MISMATCH');
  pass('RECALL-5', 'Cross-branch recall rejected with 403 BRANCH_MISMATCH');

  // Case 6: Station mismatch (Tandoor Chef on Curry task)
  const stationMismatchRecall = await request('/api/restaurant/kds/recall', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhChefToken}` },
    body: { taskId: curryTask.id },
  });
  assert.strictEqual(stationMismatchRecall.status, 403);
  assert.strictEqual(stationMismatchRecall.json.code, 'STATION_MISMATCH');
  pass('RECALL-6', 'Station mismatch on recall rejected with 403 STATION_MISMATCH');

  // Case 7: Authorized recall (BUMPED -> READY)
  const authRecall = await request('/api/restaurant/kds/recall', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhChefToken}` },
    body: { taskId: tandoorTask.id },
  });
  assert.strictEqual(authRecall.status, 200);
  assert.strictEqual(authRecall.json.data.status, 'READY');
  pass('RECALL-7', 'Authorized Chef safely recalls task to READY');

  // Case 8: Invalid recall (recall task already QUEUED)
  const invalidRecall = await request('/api/restaurant/kds/recall', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminWildcardToken}` },
    body: { taskId: curryTask.id }, // curryTask is still QUEUED
  });
  assert.strictEqual(invalidRecall.status, 400);
  assert.strictEqual(invalidRecall.json.code, 'INVALID_TRANSITION');
  pass('RECALL-8', 'Recalling a QUEUED task rejected with 400 INVALID_TRANSITION');

  // Case 9: Repeated recall idempotent
  const repeatRecall = await request('/api/restaurant/kds/recall', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhChefToken}` },
    body: { taskId: tandoorTask.id, targetStatus: 'READY' },
  });
  assert.strictEqual(repeatRecall.status, 200);
  assert.strictEqual(repeatRecall.json.isIdempotent, true);
  pass('RECALL-9', 'Duplicate recall request returns 200 with isIdempotent: true');

  // RESTful alias: POST /api/restaurant/kds/tasks/:id/recall
  const restfulRecall = await request(`/api/restaurant/kds/tasks/${tandoorTask.id}/recall`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhChefToken}` },
    body: { targetStatus: 'IN_PROGRESS' },
  });
  assert.strictEqual(restfulRecall.status, 200);
  assert.strictEqual(restfulRecall.json.data.status, 'IN_PROGRESS');
  pass('RECALL-RESTFUL-ALIAS', 'RESTful alias /api/restaurant/kds/tasks/:id/recall authorized and executed');

  console.log('\n------------------------------------------------------------\n');

  // =========================================================================
  // SECTION 4: EXPO DISPATCH (/api/restaurant/kds/expo-dispatch & /tasks/:id/dispatch)
  // =========================================================================
  console.log('⚡ [ENDPOINT 4/4] /api/restaurant/kds/expo-dispatch & /tasks/:id/dispatch');

  // Case 1: Anonymous request
  const anonExpo = await request('/api/restaurant/kds/expo-dispatch', {
    method: 'POST',
    body: { tableNumber },
  });
  assert.strictEqual(anonExpo.status, 401);
  assert.strictEqual(anonExpo.json.code, 'UNAUTHENTICATED');
  pass('EXPO-1', 'Anonymous expo dispatch rejected with 401 UNAUTHENTICATED');

  // Case 2: Tampered credential
  const tamperedExpo = await request('/api/restaurant/kds/expo-dispatch', {
    method: 'POST',
    headers: { Authorization: 'Bearer corrupt_expo_token' },
    body: { tableNumber },
  });
  assert.strictEqual(tamperedExpo.status, 401);
  assert.strictEqual(tamperedExpo.json.code, 'INVALID_CREDENTIAL');
  pass('EXPO-2', 'Tampered credential rejected with 401 INVALID_CREDENTIAL');

  // Case 3: Revoked credential
  const revokedExpo = await request('/api/restaurant/kds/expo-dispatch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${revocableToken}` },
    body: { tableNumber },
  });
  assert.strictEqual(revokedExpo.status, 401);
  assert.strictEqual(revokedExpo.json.code, 'REVOKED_TOKEN');
  pass('EXPO-3', 'Revoked credential rejected with 401 REVOKED_TOKEN');

  // Case 4: Unauthorized role (DINER capability token)
  const dinerExpo = await request('/api/restaurant/kds/expo-dispatch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${dinerCapToken}` },
    body: { tableNumber },
  });
  assert.strictEqual(dinerExpo.status, 403);
  assert.strictEqual(dinerExpo.json.code, 'FORBIDDEN');
  pass('EXPO-4', 'Diner capability rejected on expo dispatch with 403 FORBIDDEN');

  // Case 5: Wrong branch (Delhi Manager dispatching Ludhiana Table)
  const wrongBranchExpo = await request('/api/restaurant/kds/expo-dispatch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${delMgrToken}` },
    body: { tableNumber },
  });
  assert.strictEqual(wrongBranchExpo.status, 403);
  assert.strictEqual(wrongBranchExpo.json.code, 'BRANCH_MISMATCH');
  pass('EXPO-5', 'Cross-branch staff expo dispatch rejected with 403 BRANCH_MISMATCH');

  // Case 6: Station restriction (Line cook assigned to TANDOOR cannot do expo dispatch)
  const lineCookExpo = await request('/api/restaurant/kds/expo-dispatch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhChefToken}` }, // Station TANDOOR
    body: { tableNumber },
  });
  assert.strictEqual(lineCookExpo.status, 403);
  assert.strictEqual(lineCookExpo.json.code, 'STATION_MISMATCH');
  pass('EXPO-6', 'Line cook restricted from Expo pass dispatch with 403 STATION_MISMATCH');

  // State immutability check: ensure table tasks are NOT bumped
  const kdsBeforeExpo = (await request('/api/restaurant/kds?station=ALL')).json.data.filter((t) => t.tableNumber === tableNumber);
  const unbumpedBefore = kdsBeforeExpo.filter((t) => t.status !== 'BUMPED');
  assert(unbumpedBefore.length > 0, 'Tasks for table remain unbumped before authorized dispatch');
  pass('EXPO-IMMUTABLE', 'Authoritative tasks untouched across rejected expo dispatch attempts');

  // Case 7: Authorized Operations staff performing expo dispatch
  const authExpo = await request('/api/restaurant/kds/expo-dispatch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhOpsToken}` },
    body: { tableNumber },
  });
  assert.strictEqual(authExpo.status, 200);
  assert.strictEqual(authExpo.json.isIdempotent, false);
  pass('EXPO-7', 'Authorized Operations staff dispatches order to floor (all tasks bumped)');

  // Verify all tasks for table are now bumped
  const kdsAfterExpo = (await request('/api/restaurant/kds?station=ALL')).json.data.filter((t) => t.tableNumber === tableNumber);
  assert(kdsAfterExpo.every((t) => t.status === 'BUMPED'), 'All tasks for table marked BUMPED');
  pass('EXPO-POST-CHECK', 'All tasks for table transitioned to BUMPED in authoritative store');

  // Case 8: Invalid table / nonexistent tasks
  const invalidTableExpo = await request('/api/restaurant/kds/expo-dispatch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhOpsToken}` },
    body: { tableNumber: 'NONEXISTENT_TABLE_99' },
  });
  assert.strictEqual(invalidTableExpo.status, 400);
  assert.strictEqual(invalidTableExpo.json.code, 'TASKS_NOT_FOUND');
  pass('EXPO-8', 'Dispatching nonexistent table rejected with 400 TASKS_NOT_FOUND');

  // Case 9: Idempotent repeat dispatch
  const repeatExpo = await request('/api/restaurant/kds/expo-dispatch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ldhOpsToken}` },
    body: { tableNumber },
  });
  assert.strictEqual(repeatExpo.status, 200);
  assert.strictEqual(repeatExpo.json.isIdempotent, true);
  pass('EXPO-9', 'Duplicate expo dispatch returns 200 with isIdempotent: true');

  // RESTful alias: POST /api/restaurant/kds/tasks/:id/dispatch
  const restfulDispatch = await request(`/api/restaurant/kds/tasks/${tandoorTask.id}/dispatch`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminWildcardToken}` },
    body: { tableNumber },
  });
  assert.strictEqual(restfulDispatch.status, 200);
  assert.strictEqual(restfulDispatch.json.isIdempotent, true);
  // =========================================================================
  // SECTION 5: PRODUCTION RUNTIME AUTHORIZATION VALIDATION (NODE_ENV=production)
  // =========================================================================
  console.log('\n------------------------------------------------------------\n');
  console.log('🔒 [SECTION 5] Production Runtime Mode Security Validation (Port 4019)');

  const prodPort = 4019;
  const prodStoreFile = path.resolve(__dirname, `../projects/external-os/restaurant-os/packages/storage/test_prod_adversarial_${Date.now()}.json`);
  const prodSecret = 'production_vault_secret_key_long_enough_2026_super_secure_32chars';
  const prodEnv = {
    ...process.env,
    PORT: prodPort.toString(),
    NODE_ENV: 'production',
    STAFF_AUTH_SECRET: prodSecret,
    RESTAURANT_STORE_PATH: prodStoreFile,
  };

  const prodServer = spawn('npx', ['tsx', 'src/server.ts'], {
    cwd: path.resolve(__dirname, '../projects/external-os/restaurant-os'),
    env: prodEnv,
    stdio: 'pipe',
  });

  let prodOutput = '';
  prodServer.stdout.on('data', (d) => prodOutput += d.toString());
  prodServer.stderr.on('data', (d) => prodOutput += d.toString());

  try {
    // Wait for production server to start
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        prodServer.kill();
        reject(new Error(`Production test server failed to start within 10s. Output:\n${prodOutput}`));
      }, 10000);

      const checkInterval = setInterval(() => {
        const probe = http.get(`http://localhost:${prodPort}/health`, (res) => {
          if (res.statusCode === 200) {
            clearTimeout(timeout);
            clearInterval(checkInterval);
            resolve(true);
          }
        });
        probe.on('error', () => {});
      }, 400);
    });

    function prodRequest(endpoint, opts = {}) {
      return new Promise((resolve, reject) => {
        const url = new URL(endpoint, `http://localhost:${prodPort}`);
        const method = opts.method || 'GET';
        const reqHeaders = { ...(opts.headers || {}) };
        let bodyData;
        if (opts.body !== undefined) {
          bodyData = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
          if (!reqHeaders['Content-Type']) reqHeaders['Content-Type'] = 'application/json';
          reqHeaders['Content-Length'] = Buffer.byteLength(bodyData).toString();
        }
        const req = http.request(url, { method, headers: reqHeaders }, (res) => {
          let raw = '';
          res.on('data', (c) => raw += c);
          res.on('end', () => {
            let parsed = {};
            try { parsed = JSON.parse(raw); } catch { parsed = { rawText: raw }; }
            resolve({ status: res.statusCode || 0, json: parsed });
          });
        });
        req.on('error', reject);
        if (bodyData) req.write(bodyData);
        req.end();
      });
    }

    // 5.1: Anonymous KDS bump rejected in production
    const prodAnonBump = await prodRequest('/api/restaurant/kds/bump', {
      method: 'POST',
      body: { taskId: 'task_101', newStatus: 'IN_PROGRESS' },
    });
    assert.strictEqual(prodAnonBump.status, 401);
    assert.strictEqual(prodAnonBump.json.code, 'UNAUTHENTICATED');
    pass('PROD-1', 'Anonymous bump rejected in production with HTTP 401 UNAUTHENTICATED');

    // 5.2: Static dev staff token rejected in production
    const prodDevStaff = await prodRequest('/api/restaurant/kds/bump', {
      method: 'POST',
      headers: { Authorization: 'Bearer staff:chef_tandoor' },
      body: { taskId: 'task_101', newStatus: 'IN_PROGRESS' },
    });
    assert.strictEqual(prodDevStaff.status, 401);
    assert.strictEqual(prodDevStaff.json.code, 'INVALID_CREDENTIAL');
    pass('PROD-2', 'Development token "staff:chef_tandoor" rejected in production with HTTP 401 INVALID_CREDENTIAL');

    // 5.3: Static dev station token rejected in production
    const prodDevStation = await prodRequest('/api/restaurant/kds/bump', {
      method: 'POST',
      headers: { 'x-station-token': 'station_tandoor_key' },
      body: { taskId: 'task_101', newStatus: 'IN_PROGRESS' },
    });
    assert.strictEqual(prodDevStation.status, 401);
    assert.strictEqual(prodDevStation.json.code, 'INVALID_CREDENTIAL');
    pass('PROD-3', 'Development station token rejected in production with HTTP 401 INVALID_CREDENTIAL');

    // 5.4: Legitimate cryptographic token issued via PIN in production authorizes
    const prodAuthRes = await prodRequest('/api/restaurant/auth/staff-token', {
      method: 'POST',
      body: { pin: '5566', branchId: 'branch_ldh' },
    });
    assert.strictEqual(prodAuthRes.status, 200);
    const prodChefToken = prodAuthRes.json.data.token;
    assert(prodChefToken.startsWith('orb_stf.'), 'Valid signed token in production');

    const prodSignedBump = await prodRequest('/api/restaurant/kds/bump', {
      method: 'POST',
      headers: { Authorization: `Bearer ${prodChefToken}` },
      body: { taskId: 'task_101', newStatus: 'IN_PROGRESS' },
    });
    assert.strictEqual(prodSignedBump.status, 200);
    pass('PROD-4', 'Cryptographically signed staff token authorizes task bump in production');

    // 5.5: Registered physical hardware station secret authorizes in production
    const prodHwStation = await prodRequest('/api/restaurant/kds/bump', {
      method: 'POST',
      headers: { 'x-station-token': 'stn_sec_tandoor_ldh_99x7' },
      body: { taskId: 'task_101', newStatus: 'READY' },
    });
    assert.strictEqual(prodHwStation.status, 200);
    pass('PROD-5', 'Hardware registered station secret stn_sec_tandoor_ldh_99x7 authorizes in production');

    // 5.6: Delhi staff token rejected on Ludhiana task in production
    const prodDelhiAuth = await prodRequest('/api/restaurant/auth/staff-token', {
      method: 'POST',
      body: { pin: '7788', branchId: 'branch_del' },
    });
    const prodDelhiToken = prodDelhiAuth.json.data.token;

    const prodCrossBranch = await prodRequest('/api/restaurant/kds/bump', {
      method: 'POST',
      headers: { Authorization: `Bearer ${prodDelhiToken}` },
      body: { taskId: 'task_101', newStatus: 'BUMPED' },
    });
    assert.strictEqual(prodCrossBranch.status, 403);
    assert.strictEqual(prodCrossBranch.json.code, 'BRANCH_MISMATCH');
    pass('PROD-6', 'Cross-branch staff token rejected in production with HTTP 403 BRANCH_MISMATCH');

  } finally {
    prodServer.kill();
    if (fs.existsSync(prodStoreFile)) {
      try { fs.unlinkSync(prodStoreFile); } catch (e) {}
    }
  }

  console.log('\n========================================================');
  console.log(`🎉 ALL ${passedCount}/${totalCount} KDS SECURITY ADVERSARIAL GATES PASSED!`);
  console.log('========================================================\n');
}

runAdversarialSuite().catch((err) => {
  console.error('❌ ADVERSARIAL SUITE FAILED:', err);
  process.exit(1);
});
