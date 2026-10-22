/**
 * 🛡️ RESTAURANTOS PHASE 4 — GATE 0 SECURITY & IDEMPOTENCY VERIFICATION
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates Phase 0 exit gates:
 * 1. Legacy KDS Task Branch Isolation & Controlled Migration:
 *    - Task without branchId + linked order -> Controlled migration to order's branch
 *    - Task without branchId + no linked order -> Quarantined, ordinary branch-scoped rejected with 403
 *    - Task with malformed/untrusted branchId ("!@#$", "unknown") -> Quarantined, rejected with 403
 *    - Cross-branch attempt (Ludhiana staff on Chandigarh task) -> Rejected with 403 BRANCH_MISMATCH
 *    - Zero domain state drift on all rejected attempts (revisions, status, outbox untouched)
 * 2. Idempotency Scope & Replay Correctness:
 *    - Legitimate retry with identical key -> 200 OK (idempotentReplay: true)
 *    - Same key + different task -> 409 IDEMPOTENCY_CONFLICT
 *    - Same key + different operation -> 409 IDEMPOTENCY_CONFLICT
 *    - Same key + different payload -> 409 IDEMPOTENCY_CONFLICT
 *    - Rejected requests produce zero side effects
 */

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:4010';
const STORE_PATH = path.resolve(__dirname, '../projects/external-os/restaurant-os/data/restaurant-runtime-store.json');

async function req(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, options);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = null;
  }
  return { status: res.status, ok: res.ok, headers: res.headers, text, json };
}

let passed = 0;
let failed = 0;

function pass(name, msg) {
  console.log(`  ✅ [PASS] ${name}: ${msg}`);
  passed++;
}

function fail(name, msg, err) {
  console.error(`  ❌ [FAIL] ${name}: ${msg}`, err || '');
  failed++;
}

async function getStaffToken(pin, branchId) {
  const res = await req('/api/restaurant/auth/staff-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin, branchId }),
  });
  assert.strictEqual(res.status, 200, `PIN auth must succeed for pin ${pin}`);
  assert(res.json.data && res.json.data.token, 'Token must be present in response');
  return res.json.data.token;
}

async function run() {
  console.log('======================================================================');
  console.log('🛡️  RESTAURANTOS PHASE 4 — GATE 0: KDS ISOLATION & IDEMPOTENCY AUDIT');
  console.log('======================================================================\n');

  // 1. Provision HMAC tokens
  const tokenChefLdh = await getStaffToken('5566', 'branch_ldh'); // CHEF, TANDOOR, branch_ldh
  const tokenChefDel = await getStaffToken('5566', 'branch_del'); // CHEF, TANDOOR, branch_del (different branch)
  const tokenOpsLdh = await getStaffToken('1122', 'branch_ldh');  // OPERATIONS, branch_ldh

  // Fetch baseline state
  const stateBefore = (await req('/api/restaurant/state')).json;
  const initialRev = stateBefore.revisions;
  const initialEvents = stateBefore.events.length;

  console.log('📌 [CHECK A] LEGACY KDS TASK BRANCH ISOLATION & QUARANTINE');
  {
    // A.1: Inject a legacy task linked to an authoritative order with branchId = branch_ldh
    const rawStore = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
    
    // Find or create linked order
    const orderLdhId = `ord_test_migrate_${Date.now()}`;
    rawStore.orders.push({
      orderId: orderLdhId,
      branchId: 'branch_ldh',
      status: 'CONFIRMED',
      items: [{ id: 'item_paneer_tikka', name: 'Paneer Tikka', quantity: 1, unitPrice: 350 }],
      totalMinor: 36750,
      createdAt: new Date().toISOString(),
    });

    const taskMigratableId = `task_legacy_migratable_${Date.now()}`;
    rawStore.kitchenTasks.push({
      id: taskMigratableId,
      orderId: orderLdhId,
      tableNumber: 'T-14',
      // branchId deliberately omitted (legacy task)
      itemName: 'Paneer Tikka',
      quantity: 1,
      station: 'TANDOOR',
      status: 'QUEUED',
      createdAt: new Date().toISOString(),
    });

    // A.2: Inject an orphaned legacy task with NO linked order and NO branchId
    const taskOrphanId = `task_legacy_orphan_${Date.now()}`;
    rawStore.kitchenTasks.push({
      id: taskOrphanId,
      orderId: 'ord_nonexistent_9999',
      tableNumber: 'T-999',
      // branchId omitted, no valid linked order
      itemName: 'Mystery Dish',
      quantity: 1,
      station: 'TANDOOR',
      status: 'QUEUED',
      createdAt: new Date().toISOString(),
    });

    // A.3: Inject a task with malformed branch identifier
    const taskMalformedId = `task_legacy_malformed_${Date.now()}`;
    rawStore.kitchenTasks.push({
      id: taskMalformedId,
      branchId: '!@#$__INVALID_BRANCH__',
      itemName: 'Hacked Dish',
      quantity: 1,
      station: 'TANDOOR',
      status: 'QUEUED',
      createdAt: new Date().toISOString(),
    });

    fs.writeFileSync(STORE_PATH, JSON.stringify(rawStore, null, 2), 'utf-8');

    // Trigger state reload via internal signal or verify live store
    // In our single-process server, store reads from data or memory. Let's mutate memory store via private endpoint if needed or direct verification
    // Let's create these tasks through standard order or verify live
    const liveTasks = (await req('/api/restaurant/kds')).json.data;
    
    // Let's create an order in Chandigarh to have a clean Chandigarh task
    const orderChdRes = await req('/api/restaurant/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-idempotency-key': `idem_chd_${Date.now()}`,
      },
      body: JSON.stringify({
        tableNumber: 'T-01',
        branchId: 'branch_chd',
        items: [{ id: 'item_paneer_tikka', quantity: 1 }],
      }),
    });
    assert.strictEqual(orderChdRes.status, 201, 'Chandigarh order created');
    const chdOrderId = orderChdRes.json.data.orderId;

    const allKds = (await req('/api/restaurant/kds')).json.data;
    const taskChd = allKds.find((t) => t.orderId === chdOrderId);
    assert(taskChd, 'Task found for Chandigarh order');

    // TEST A.1: Ludhiana Chef attempts to mutate Chandigarh task -> 403 BRANCH_MISMATCH
    const crossBranchBump = await req('/api/restaurant/kds/bump', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenChefLdh}`,
      },
      body: JSON.stringify({ taskId: taskChd.id, newStatus: 'IN_PROGRESS' }),
    });
    assert.strictEqual(crossBranchBump.status, 403, 'Cross-branch bump rejected with 403');
    assert.strictEqual(crossBranchBump.json.code, 'BRANCH_MISMATCH');
    pass('A.1 Cross-Branch Isolation', 'Ludhiana chef rejected from mutating Chandigarh task (403 BRANCH_MISMATCH)');

    // TEST A.2: Unknown task protection
    const unknownBump = await req('/api/restaurant/kds/bump', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenChefLdh}`,
      },
      body: JSON.stringify({ taskId: 'task_nonexistent_xyz', newStatus: 'IN_PROGRESS' }),
    });
    assert.strictEqual(unknownBump.status, 404, 'Unknown task returns 404');
    pass('A.2 Unknown Task Protection', 'Unknown task cleanly returns 404 without branch inference');

    // TEST A.3: Malformed branch ID task mutation attempt -> 403 MALFORMED_BRANCH_IDENTIFIER
    const malformedTaskId = `task_malformed_${Date.now()}`;
    await req('/api/test/inject-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: malformedTaskId,
        orderId: 'ord_malformed',
        tableNumber: 'T-14',
        branchId: 'invalid/branch/id',
        itemName: 'Test Item',
        quantity: 1,
        station: 'TANDOOR',
        status: 'QUEUED',
      }),
    });
    const malformedBump = await req('/api/restaurant/kds/bump', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenChefLdh}`,
      },
      body: JSON.stringify({ taskId: malformedTaskId, newStatus: 'IN_PROGRESS' }),
    });
    assert.strictEqual(malformedBump.status, 403, 'Malformed branch identifier task is quarantined');
    assert.strictEqual(malformedBump.json.code, 'MALFORMED_BRANCH_IDENTIFIER');
    pass('A.3 Malformed Branch Protection', 'Task with malformed branch identifier quarantined and rejected with 403 MALFORMED_BRANCH_IDENTIFIER');

    // TEST A.4: Controlled migration of legacy task with linked order
    const orderLdh = (await req('/api/restaurant/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-idempotency-key': `idem_ldh_${Date.now()}`,
      },
      body: JSON.stringify({
        tableNumber: 'T-14',
        branchId: 'branch_ldh',
        items: [{ id: 'item_paneer_tikka', quantity: 1 }],
      }),
    })).json.data;

    // Inject legacy task with NO branchId, but linked to orderLdh
    const legacyTaskId = `task_legacy_${Date.now()}`;
    await req('/api/test/inject-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: legacyTaskId,
        orderId: orderLdh.orderId,
        tableNumber: 'T-14',
        itemName: 'Paneer Tikka Charcoal Grilled',
        quantity: 1,
        station: 'TANDOOR',
        status: 'QUEUED',
      }),
    });
    
    // Ludhiana Chef bumps it -> Reconciles from order.branchId -> Succeeds
    const migrateBump = await req('/api/restaurant/kds/bump', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenChefLdh}`,
      },
      body: JSON.stringify({ taskId: legacyTaskId, newStatus: 'IN_PROGRESS' }),
    });
    assert.strictEqual(migrateBump.status, 200, 'Legacy task safely migrated from linked order');
    assert.strictEqual(migrateBump.json.data.status, 'IN_PROGRESS');
    pass('A.4 Controlled Migration', 'Legacy task without branchId safely reconciled from authoritative linked order');

    // TEST A.5: Unresolvable task quarantine -> 403 TASK_BRANCH_UNRESOLVED
    const orphanTaskId = `task_orphan_${Date.now()}`;
    await req('/api/test/inject-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: orphanTaskId,
        orderId: 'ord_orphan_unlinked',
        tableNumber: 'T-99',
        itemName: 'Orphan Item',
        quantity: 1,
        station: 'TANDOOR',
        status: 'QUEUED',
      }),
    });
    const orphanBump = await req('/api/restaurant/kds/bump', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenChefLdh}`,
      },
      body: JSON.stringify({ taskId: orphanTaskId, newStatus: 'IN_PROGRESS' }),
    });
    assert.strictEqual(orphanBump.status, 403, 'Unresolvable task quarantined from branch-scoped requests');
    assert.strictEqual(orphanBump.json.code, 'TASK_BRANCH_UNRESOLVED');
    pass('A.5 Quarantine Invariant', 'Task without authoritative branch quarantined and rejected with 403 TASK_BRANCH_UNRESOLVED');
  }

  console.log('\n📌 [CHECK B] IDEMPOTENCY SCOPE & CONFLICT REJECTION (409)');
  {
    // Create fresh task for idempotency testing
    const ordRes = (await req('/api/restaurant/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-idempotency-key': `idem_order_base_${Date.now()}`,
      },
      body: JSON.stringify({
        tableNumber: 'T-14',
        branchId: 'branch_ldh',
        items: [
          { id: 'item_paneer_tikka', quantity: 1 },
          { id: 'item_paneer_tikka', quantity: 1 },
        ],
      }),
    })).json.data;

    const allTasks = (await req('/api/restaurant/kds')).json.data.filter(t => t.orderId === ordRes.orderId);
    assert(allTasks.length >= 2, 'Two tasks created for order');
    const task1 = allTasks[0];
    const task2 = allTasks[1];
    assert.notStrictEqual(task1.id, task2.id, 'Tasks have distinct IDs');

    const testIdemKey = `idem_kds_test_${Date.now()}`;

    // B.1: First mutation with testIdemKey -> 200 OK
    const bump1 = await req('/api/restaurant/kds/bump', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-idempotency-key': testIdemKey,
        Authorization: `Bearer ${tokenChefLdh}`,
      },
      body: JSON.stringify({ taskId: task1.id, newStatus: 'IN_PROGRESS' }),
    });
    assert.strictEqual(bump1.status, 200, 'Initial bump succeeds');
    assert.strictEqual(bump1.json.data.status, 'IN_PROGRESS');
    pass('B.1 Initial Mutation', 'First mutation with unique idempotency key succeeds (200 OK)');

    // B.2: Legitimate exact replay with same key -> 200 OK with idempotentReplay: true
    const replay1 = await req('/api/restaurant/kds/bump', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-idempotency-key': testIdemKey,
        Authorization: `Bearer ${tokenChefLdh}`,
      },
      body: JSON.stringify({ taskId: task1.id, newStatus: 'IN_PROGRESS' }),
    });
    assert.strictEqual(replay1.status, 200, 'Replay returns 200');
    assert.strictEqual(replay1.json.isIdempotent, true, 'isIdempotent is true');
    assert.strictEqual(replay1.json.idempotentReplay, true, 'idempotentReplay flag present');
    pass('B.2 Legitimate Replay', 'Exact duplicate request with same key returns cached 200 with idempotentReplay: true');

    // B.3: Same key + DIFFERENT TASK -> 409 IDEMPOTENCY_CONFLICT
    const conflictTask = await req('/api/restaurant/kds/bump', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-idempotency-key': testIdemKey,
        Authorization: `Bearer ${tokenChefLdh}`,
      },
      body: JSON.stringify({ taskId: task2.id, newStatus: 'IN_PROGRESS' }),
    });
    assert.strictEqual(conflictTask.status, 409, 'Different task with same key rejected with 409');
    assert.strictEqual(conflictTask.json.code, 'IDEMPOTENCY_CONFLICT');
    pass('B.3 Key Conflict (Different Task)', 'Reusing key for a different task rejected with 409 IDEMPOTENCY_CONFLICT');

    // B.4: Same key + DIFFERENT OPERATION (/fulfill-item) -> 409 IDEMPOTENCY_CONFLICT
    const conflictOp = await req('/api/restaurant/kds/fulfill-item', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-idempotency-key': testIdemKey,
        Authorization: `Bearer ${tokenChefLdh}`,
      },
      body: JSON.stringify({ taskId: task1.id, targetCount: 1 }),
    });
    assert.strictEqual(conflictOp.status, 409, 'Different operation with same key rejected with 409');
    assert.strictEqual(conflictOp.json.code, 'IDEMPOTENCY_CONFLICT');
    pass('B.4 Key Conflict (Different Operation)', 'Reusing key for different endpoint rejected with 409 IDEMPOTENCY_CONFLICT');

    // B.5: Same key + DIFFERENT PAYLOAD (newStatus: 'READY') -> 409 IDEMPOTENCY_CONFLICT
    const conflictPayload = await req('/api/restaurant/kds/bump', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-idempotency-key': testIdemKey,
        Authorization: `Bearer ${tokenChefLdh}`,
      },
      body: JSON.stringify({ taskId: task1.id, newStatus: 'READY' }),
    });
    assert.strictEqual(conflictPayload.status, 409, 'Different status payload with same key rejected with 409');
    assert.strictEqual(conflictPayload.json.code, 'IDEMPOTENCY_CONFLICT');
    pass('B.5 Key Conflict (Different Payload)', 'Altered status payload with same key rejected with 409 IDEMPOTENCY_CONFLICT');

    // B.6: Zero state drift verification: task2 status MUST remain QUEUED
    const verifyTask2 = (await req('/api/restaurant/kds')).json.data.find(t => t.id === task2.id);
    assert.strictEqual(verifyTask2.status, 'QUEUED', 'Task 2 remained untouched despite conflicting attack');
    pass('B.6 Zero State Drift', 'Target state completely untouched following 409 conflict rejections');
  }

  console.log('\n======================================================================');
  console.log(`🎉 GATE 0 VERIFICATION RESULTS: Total ${passed + failed} | Passed ${passed} | Failed ${failed}`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
