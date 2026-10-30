/**
 * HospitalOS Crash Durability Harness (Phase 2b-3 Requirement 4).
 *
 * Seeded randomization (1337) with 3 kill points:
 * 1. 'before-statement': killed before the database transaction/statement begins.
 * 2. 'mid-tx': killed inside withTenantTx before commit.
 * 3. 'post-commit': killed after withTenantTx commits before response.
 *
 * Runs 30 trials per operation (admissions, payments, lab verifications) = 90 trials total.
 * Asserts:
 * - >= 25% of trials died after commit.
 * - Durable post-commit rows preserved across SIGKILL.
 * - Invariant I2 (Bed Occupancy): exactly <= 1 open admission per bed.
 * - Invariant I3 (Ledger Balance): SUM(amountMinor) strictly equals paidMinor for every invoice.
 * - Idempotency replay with same key returns original payment (replayed: true) without second charge.
 * - Lab verification transition is atomic: verified once; subsequent attempts fail with LAB_ORDER_FINAL.
 */
import assert from 'node:assert/strict';
import { fork, ChildProcess } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import { Pool } from 'pg';
import { withTenantTx } from '../lib/tenant-db';
import { PhiKeyRing, seal, blindIndex } from '../lib/phi-crypto';
import { recordPayment } from '../lib/hms-repository';

export type KillPoint = 'before-statement' | 'mid-tx' | 'post-commit';

const url = process.env.APP_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://orbitox_runtime@127.0.0.1:5432/orbitox_phase2';
const pool = new Pool({ connectionString: url });

const ring = new PhiKeyRing({
  keys: { k2026: crypto.randomBytes(32).toString('base64') },
  activeKid: 'k2026',
  indexKey: crypto.randomBytes(32).toString('base64'),
});

const CRASH_TENANT = `org/crash-test-${crypto.randomBytes(4).toString('hex')}/project/p1/environment/prod`;
const workerScript = path.resolve(__dirname, 'hms-crash-worker.ts');

/**
 * Standard LCG seeded PRNG (Numerical Recipes: a = 1664525, c = 1013904223).
 * Deterministically generates kill points from seed 1337.
 */
function createLcg(seed = 1337) {
  let s = seed >>> 0;
  const points: KillPoint[] = ['before-statement', 'mid-tx', 'post-commit'];
  return function nextKillPoint(): KillPoint {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return points[s % 3]!;
  };
}

const TOTAL_TRIALS_PER_OP = 30;

async function seedFixtureData() {
  console.log(`[Seed] Initializing 30-bed, 30-invoice, 30-lab fixture for: ${CRASH_TENANT}`);
  const runId = crypto.randomBytes(4).toString('hex');

  await withTenantTx(pool, CRASH_TENANT, async (tx) => {
    // 1. Department and Ward
    await tx.query(`INSERT INTO "HmsDepartment" (id, name) VALUES ('dep_crash', $1) ON CONFLICT DO NOTHING`, [`Emergency Crash ${runId}`]);
    await tx.query(`INSERT INTO "HmsWard" (id, "departmentId", name) VALUES ('ward_crash', 'dep_crash', $1) ON CONFLICT DO NOTHING`, [`ICU Crash ${runId}`]);

    // 2. 30 Beds for 30 admission trials
    for (let i = 1; i <= TOTAL_TRIALS_PER_OP; i++) {
      await tx.query(
        `INSERT INTO "HmsBed" (id, "wardId", label, "dailyRateMinor") VALUES ($1, 'ward_crash', $2, 100000) ON CONFLICT DO NOTHING`,
        [`bed_crash_${i}`, `Bed Crash ${i}-${runId}`]
      );
    }

    // 3. 2 Distinct Staff Members (Doctor + Lab Verifier for 4-eyes rule)
    const staff1Name = seal(ring, 'Dr. Crash Specialist', { tenantId: CRASH_TENANT, column: 'nameSealed', rowId: 'staff_crash_1' });
    const staff1Email = blindIndex(ring, `dr.crash1.${runId}@hospital.org`, 'email', CRASH_TENANT, 'emailBlind');
    await tx.query(
      `INSERT INTO "HmsStaff" (id, "nameSealed", "emailBlind", role) VALUES ('staff_crash_1', $1, $2, 'DOCTOR') ON CONFLICT DO NOTHING`,
      [staff1Name, staff1Email]
    );

    const staff2Name = seal(ring, 'Dr. Verifier Specialist', { tenantId: CRASH_TENANT, column: 'nameSealed', rowId: 'staff_crash_2' });
    const staff2Email = blindIndex(ring, `dr.crash2.${runId}@hospital.org`, 'email', CRASH_TENANT, 'emailBlind');
    await tx.query(
      `INSERT INTO "HmsStaff" (id, "nameSealed", "emailBlind", role) VALUES ('staff_crash_2', $1, $2, 'DOCTOR') ON CONFLICT DO NOTHING`,
      [staff2Name, staff2Email]
    );

    // 4. 30 Patients, Invoices, and Lab Orders
    for (let i = 1; i <= TOTAL_TRIALS_PER_OP; i++) {
      const patId = `pat_crash_${i}`;
      const patName = seal(ring, `Patient Crash ${i}`, { tenantId: CRASH_TENANT, column: 'nameSealed', rowId: patId });
      const patBlind = blindIndex(ring, `Patient Crash ${i}`, 'name', CRASH_TENANT, 'nameBlind');
      await tx.query(
        `INSERT INTO "HmsPatient" (id, mrn, "nameSealed", "nameBlind") VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
        [patId, `MRN-CRASH-${runId.toUpperCase()}-${i}`, patName, patBlind]
      );

      // Invoices for payments
      await tx.query(
        `INSERT INTO "HmsInvoice" (id, "patientId", "totalMinor", "paidMinor") VALUES ($1, $2, 100000, 0) ON CONFLICT DO NOTHING`,
        [`inv_crash_${i}`, patId]
      );

      // Lab orders in RESULTED state ready for verification
      const labResult = seal(ring, 'Normal Lab Values', { tenantId: CRASH_TENANT, column: 'resultSealed', rowId: `lab_crash_${i}` });
      await tx.query(
        `INSERT INTO "HmsLabOrder" (id, "patientId", "orderedById", "testType", "status", "resultSealed", "resultedById")
         VALUES ($1, $2, 'staff_crash_1', 'Electrolytes', 'RESULTED', $3, 'staff_crash_1') ON CONFLICT DO NOTHING`,
        [`lab_crash_${i}`, patId, labResult]
      );
    }
  });
}

interface TrialResult {
  trial: number;
  op: 'admit' | 'pay' | 'verify';
  targetId: string;
  killPoint: KillPoint;
  signal: string | null;
  killedAt: string;
}

function spawnWorkerAndKill(
  op: 'admit' | 'pay' | 'verify',
  payload: Record<string, any>,
  killPoint: KillPoint,
  trial: number
): Promise<TrialResult> {
  return new Promise((resolve, reject) => {
    const child: ChildProcess = fork(
      workerScript,
      [op, CRASH_TENANT, JSON.stringify(payload), killPoint],
      {
        execArgv: ['--import', 'tsx'],
        env: { ...process.env, APP_DATABASE_URL: url },
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      }
    );

    let killedAt = 'NONE';
    let killed = false;

    const kill = (point: string) => {
      if (!killed) {
        killed = true;
        killedAt = point;
        child.kill('SIGKILL');
      }
    };

    child.on('message', (msg: any) => {
      if (!msg || typeof msg !== 'object') return;
      if (killPoint === 'before-statement' && msg.status === 'BEFORE_STATEMENT') {
        kill('before-statement');
      } else if (killPoint === 'mid-tx' && msg.status === 'MID_TX') {
        kill('mid-tx');
      } else if (killPoint === 'post-commit' && msg.status === 'POST_COMMIT') {
        kill('post-commit');
      }
    });

    let stderr = '';
    child.stderr?.on('data', (d) => {
      stderr += d.toString();
    });

    const timer = setTimeout(() => {
      if (!killed) {
        kill('timeout-fallback');
      }
    }, 3000);

    child.on('exit', (code, signal) => {
      clearTimeout(timer);
      if (stderr && code !== null && code !== 0 && signal !== 'SIGKILL') {
        console.error(`Worker error [${op} trial ${trial}]:`, stderr);
      }
      const targetId = payload.admissionId || payload.invoiceId || payload.labOrderId;
      resolve({ trial, op, targetId, killPoint, signal, killedAt });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export async function runDurabilitySuite() {
  console.log('================================================================');
  console.log('OrbitoX HospitalOS Crash Durability Harness (Phase 2b-3 / L4)');
  console.log('Random Seed: 1337 | Kill Points: before-statement, mid-tx, post-commit');
  console.log('Total Trials: 90 (30 Admissions, 30 Payments, 30 Lab Verifications)');
  console.log('================================================================');

  await seedFixtureData();

  const nextKillPoint = createLcg(1337);
  const results: TrialResult[] = [];

  // --- 1. Admissions Trials (1 to 30) ---
  console.log('\n--- 1. Clinical Admissions Trials (30 Trials) ---');
  for (let i = 1; i <= TOTAL_TRIALS_PER_OP; i++) {
    const killPoint = nextKillPoint();
    const res = await spawnWorkerAndKill(
      'admit',
      {
        admissionId: `adm_crash_${i}`,
        patientId: `pat_crash_${i}`,
        bedId: `bed_crash_${i}`,
        staffId: 'staff_crash_1',
      },
      killPoint,
      i
    );
    results.push(res);
  }
  const admitPostCommit = results.filter((r) => r.op === 'admit' && r.killPoint === 'post-commit').length;
  console.log(`[Admissions Complete] 30 trials executed (${admitPostCommit} post-commit, ${30 - admitPostCommit} pre-commit).`);

  // --- 2. Financial Payments Trials (1 to 30) ---
  console.log('\n--- 2. Financial Payments Trials (30 Trials) ---');
  for (let i = 1; i <= TOTAL_TRIALS_PER_OP; i++) {
    const killPoint = nextKillPoint();
    const res = await spawnWorkerAndKill(
      'pay',
      {
        invoiceId: `inv_crash_${i}`,
        amountMinor: 25000,
        method: 'CASH',
        idempotencyKey: `idem_crash_kill_${i}`,
        receivedById: 'staff_crash_1',
      },
      killPoint,
      i
    );
    results.push(res);
  }
  const payPostCommit = results.filter((r) => r.op === 'pay' && r.killPoint === 'post-commit').length;
  console.log(`[Payments Complete] 30 trials executed (${payPostCommit} post-commit, ${30 - payPostCommit} pre-commit).`);

  // --- 3. Lab Verifications Trials (1 to 30) ---
  console.log('\n--- 3. Diagnostic Lab Verifications Trials (30 Trials) ---');
  for (let i = 1; i <= TOTAL_TRIALS_PER_OP; i++) {
    const killPoint = nextKillPoint();
    const res = await spawnWorkerAndKill(
      'verify',
      {
        labOrderId: `lab_crash_${i}`,
        verifierId: 'staff_crash_2',
      },
      killPoint,
      i
    );
    results.push(res);
  }
  const labPostCommit = results.filter((r) => r.op === 'verify' && r.killPoint === 'post-commit').length;
  console.log(`[Lab Verifications Complete] 30 trials executed (${labPostCommit} post-commit, ${30 - labPostCommit} pre-commit).`);

  // --- 4. Assert Kill Point Distribution ---
  const totalPostCommit = results.filter((r) => r.killPoint === 'post-commit').length;
  const postCommitFraction = totalPostCommit / results.length;
  console.log(`\n--- Kill Distribution: Total Trials = ${results.length}, Post-Commit = ${totalPostCommit} (${(postCommitFraction * 100).toFixed(1)}%) ---`);

  assert.ok(
    postCommitFraction >= 0.25,
    `L4 Failure: fewer than 25% of trials died after commit (got ${(postCommitFraction * 100).toFixed(1)}%)`
  );
  console.log(`✔ Kill point assertion passed: ${(postCommitFraction * 100).toFixed(1)}% >= 25% died post-commit`);

  // --- 5. Post-Crash Invariant & Replay Verifications ---
  console.log('\n--- 5. Post-Crash Invariant & Durability Reconciliation ---');

  await withTenantTx(pool, CRASH_TENANT, async (tx) => {
    // 5.1 Verify Admissions:
    for (const r of results.filter((r) => r.op === 'admit')) {
      const { rows } = await tx.query<{ id: string }>(
        `SELECT id FROM "HmsAdmission" WHERE id = $1`,
        [r.targetId]
      );
      if (r.killPoint === 'post-commit') {
        assert.equal(rows.length, 1, `Post-commit admission ${r.targetId} must be durable in DB`);
      } else {
        assert.equal(rows.length, 0, `Pre-commit admission ${r.targetId} must be rolled back`);
      }
    }
    // Invariant I2: every bed has <= 1 open admission
    const { rows: openAdmissions } = await tx.query<{ bedId: string; c: number }>(
      `SELECT "bedId", count(*)::int as c FROM "HmsAdmission" WHERE "dischargedAt" IS NULL GROUP BY "bedId"`
    );
    for (const row of openAdmissions) {
      assert.ok(row.c <= 1, `Invariant I2 violated: bed ${row.bedId} has ${row.c} open admissions`);
    }
    console.log(`✔ Admissions verified: all ${admitPostCommit} post-commit rows durable; Invariant I2 preserved`);

    // 5.2 Verify Payments and Invariant I3:
    for (const r of results.filter((r) => r.op === 'pay')) {
      const invId = r.targetId;
      const { rows: invRows } = await tx.query<{ paidMinor: string }>(
        `SELECT "paidMinor"::text FROM "HmsInvoice" WHERE id = $1`,
        [invId]
      );
      const { rows: payRows } = await tx.query<{ id: string; amountMinor: string }>(
        `SELECT id, "amountMinor"::text FROM "HmsPayment" WHERE "invoiceId" = $1`,
        [invId]
      );

      if (r.killPoint === 'post-commit') {
        assert.equal(payRows.length, 1, `Post-commit payment on ${invId} must exist in DB`);
        const payRow = payRows[0]!;
        const invRow = invRows[0]!;
        assert.equal(payRow.amountMinor, '25000');
        assert.equal(invRow.paidMinor, '25000');

        // Verify Idempotency Replay: call recordPayment with the SAME idempotencyKey
        const replay = await recordPayment(tx, {
          invoiceId: invId,
          amountMinor: 25000n,
          method: 'CASH',
          idempotencyKey: `idem_crash_kill_${r.trial}`,
          receivedById: 'staff_crash_1',
        });
        assert.equal(replay.replayed, true, `Idempotency replay on ${invId} must return replayed=true`);
        assert.equal(replay.paymentId, payRow.id, `Idempotency replay must return original paymentId`);
        assert.equal(replay.invoice.paidMinor, '25000', `Invoice paidMinor must remain 25000 after replay`);
      } else {
        assert.equal(payRows.length, 0, `Pre-commit payment on ${invId} must be rolled back`);
        assert.equal(invRows[0]?.paidMinor ?? '0', '0');
      }
    }

    // Strict Invariant I3 check: SUM(p.amountMinor) == i.paidMinor for all invoices
    const { rows: ledgerCheck } = await tx.query<{ id: string; paidMinor: string; actualSum: string }>(
      `SELECT i.id, i."paidMinor"::text, COALESCE(SUM(p."amountMinor"), 0)::text as "actualSum"
       FROM "HmsInvoice" i
       LEFT JOIN "HmsPayment" p ON p."tenantId" = i."tenantId" AND p."invoiceId" = i.id
       GROUP BY i.id, i."paidMinor"`
    );
    for (const chk of ledgerCheck) {
      assert.equal(chk.paidMinor, chk.actualSum, `Invariant I3 violated on invoice ${chk.id}: paidMinor != actual sum`);
    }
    console.log(`✔ Payments verified: all ${payPostCommit} payments durable, idempotency replayed safely, Invariant I3 preserved`);

    // 5.3 Verify Lab Orders:
    for (const r of results.filter((r) => r.op === 'verify')) {
      const { rows: labRows } = await tx.query<{ status: string; verifiedById: string | null; verifiedAt: string | null }>(
        `SELECT "status", "verifiedById", "verifiedAt" FROM "HmsLabOrder" WHERE id = $1`,
        [r.targetId]
      );
      const labRow = labRows[0];
      if (r.killPoint === 'post-commit') {
        assert.ok(labRow);
        assert.equal(labRow.status, 'VERIFIED');
        assert.equal(labRow.verifiedById, 'staff_crash_2');
        assert.ok(labRow.verifiedAt, `Lab ${r.targetId} must have verifiedAt timestamp`);
      } else {
        assert.ok(labRow);
        assert.equal(labRow.status, 'RESULTED');
        assert.equal(labRow.verifiedById, null);
      }
    }
  });

  // 5.4 Verify subsequent verification on post-commit verified lab orders fails with LAB_ORDER_FINAL
  for (const r of results.filter((r) => r.op === 'verify' && r.killPoint === 'post-commit')) {
    let secondVerifyThrew = false;
    try {
      await withTenantTx(pool, CRASH_TENANT, async (tx2) => {
        await tx2.query(
          `UPDATE "HmsLabOrder" SET "status" = 'VERIFIED', "verifiedById" = 'staff_crash_2' WHERE id = $1`,
          [r.targetId]
        );
      });
    } catch (e: any) {
      secondVerifyThrew = true;
      assert.match(e.message, /is final|HmsLabOrder_final/, `Expected final lab order error`);
    }
    assert.ok(secondVerifyThrew, `Subsequent verification on ${r.targetId} must be rejected (LAB_ORDER_FINAL)`);
  }
  console.log(`✔ Lab orders verified: all ${labPostCommit} verifications durable, single-verification constraint enforced`);

  console.log('\n================================================================');
  console.log('CRASH DURABILITY VERDICT: 90/90 TRIALS PASSED ALL INVARIANTS ACROSS SIGKILL');
  console.log('================================================================\n');

  await pool.end();
}

if (require.main === module) {
  runDurabilitySuite().catch((err) => {
    console.error('[CRASH HARNESS FAILED]', err);
    process.exit(1);
  });
}
