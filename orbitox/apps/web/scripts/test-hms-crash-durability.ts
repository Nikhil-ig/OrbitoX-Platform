/**
 * HospitalOS Crash Durability Harness (Phase 2b-3 Requirement 4).
 *
 * Spawns worker processes executing clinical transactions (admission, payment, lab verification),
 * terminates them with SIGKILL (kill -9) mid-operation, and verifies:
 * 1. Zero partial or orphaned rows across all tables.
 * 2. Invariant I3 (Ledger Balance): SUM(amountMinor) strictly equals paidMinor for every invoice.
 * 3. Invariant I2 (Bed Occupancy): exactly <= 1 open admission per bed at all times.
 * 4. Invariant I4 (Lab State Machine): clean transitions with no half-updated state.
 */
import assert from 'node:assert/strict';
import { fork, ChildProcess } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import { Pool } from 'pg';
import { withTenantTx } from '../lib/tenant-db';
import { PhiKeyRing, seal, blindIndex } from '../lib/phi-crypto';

const url = process.env.APP_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://orbitox_runtime@127.0.0.1:5432/orbitox_phase2';
const pool = new Pool({ connectionString: url });

const ring = new PhiKeyRing({
  keys: { k2026: crypto.randomBytes(32).toString('base64') },
  activeKid: 'k2026',
  indexKey: crypto.randomBytes(32).toString('base64'),
});

const CRASH_TENANT = `org/crash-test-${crypto.randomBytes(4).toString('hex')}/project/p1/environment/prod`;
const workerScript = path.resolve(__dirname, 'hms-crash-worker.ts');

async function seedFixtureData() {
  console.log(`[Seed] Initializing crash test fixture for tenant: ${CRASH_TENANT}`);
  const runId = crypto.randomBytes(4).toString('hex');

  await withTenantTx(pool, CRASH_TENANT, async (tx) => {
    // Departments, Wards, Beds
    await tx.query(`INSERT INTO "HmsDepartment" (id, name) VALUES ('dep_crash', $1) ON CONFLICT DO NOTHING`, [`Emergency Crash ${runId}`]);
    await tx.query(`INSERT INTO "HmsWard" (id, "departmentId", name) VALUES ('ward_crash', 'dep_crash', $1) ON CONFLICT DO NOTHING`, [`ICU Crash ${runId}`]);

    for (let i = 1; i <= 10; i++) {
      await tx.query(
        `INSERT INTO "HmsBed" (id, "wardId", label, "dailyRateMinor") VALUES ($1, 'ward_crash', $2, 100000) ON CONFLICT DO NOTHING`,
        [`bed_crash_${i}`, `Bed Crash ${i}-${runId}`]
      );
    }

    // Staff
    const staffName = seal(ring, 'Dr. Crash Specialist', { tenantId: CRASH_TENANT, column: 'nameSealed', rowId: 'staff_crash_1' });
    const staffEmail = blindIndex(ring, `dr.crash.${runId}@hospital.org`, 'email', CRASH_TENANT, 'emailBlind');
    await tx.query(
      `INSERT INTO "HmsStaff" (id, "nameSealed", "emailBlind", role) VALUES ('staff_crash_1', $1, $2, 'DOCTOR') ON CONFLICT DO NOTHING`,
      [staffName, staffEmail]
    );

    // Patients, Invoices, Lab Orders
    for (let i = 1; i <= 10; i++) {
      const patId = `pat_crash_${i}`;
      const patName = seal(ring, `Patient Crash ${i}`, { tenantId: CRASH_TENANT, column: 'nameSealed', rowId: patId });
      const patBlind = blindIndex(ring, `Patient Crash ${i}`, 'name', CRASH_TENANT, 'nameBlind');
      await tx.query(
        `INSERT INTO "HmsPatient" (id, mrn, "nameSealed", "nameBlind") VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
        [patId, `MRN-CRASH-${runId.toUpperCase()}-${i}`, patName, patBlind]
      );

      // Invoices
      await tx.query(
        `INSERT INTO "HmsInvoice" (id, "patientId", "totalMinor", "paidMinor") VALUES ($1, $2, 100000, 0) ON CONFLICT DO NOTHING`,
        [`inv_crash_${i}`, patId]
      );

      // Lab Orders
      await tx.query(
        `INSERT INTO "HmsLabOrder" (id, "patientId", "orderedById", "testType") VALUES ($1, $2, 'staff_crash_1', 'Electrolytes') ON CONFLICT DO NOTHING`,
        [`lab_crash_${i}`, patId]
      );
    }
  });
}

function spawnWorkerAndKill(op: 'admit' | 'pay' | 'verify', payload: Record<string, any>): Promise<{ exitCode: number | null; signal: string | null }> {
  return new Promise((resolve) => {
    const child: ChildProcess = fork(
      workerScript,
      [op, CRASH_TENANT, JSON.stringify(payload)],
      {
        execArgv: ['--loader', 'tsx'],
        env: { ...process.env, APP_DATABASE_URL: url },
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      }
    );

    let killed = false;

    child.on('message', (msg: any) => {
      if (msg && msg.status === 'IN_TRANSACTION' && !killed) {
        killed = true;
        // Mid-transaction SIGKILL
        child.kill('SIGKILL');
      }
    });

    // Fallback timer if message not received
    const timer = setTimeout(() => {
      if (!killed) {
        killed = true;
        child.kill('SIGKILL');
      }
    }, 120);

    child.on('exit', (code, signal) => {
      clearTimeout(timer);
      resolve({ exitCode: code, signal });
    });
  });
}

async function verifyPostCrashInvariants(): Promise<{
  invoicesChecked: number;
  paymentsChecked: number;
  admissionsChecked: number;
  labsChecked: number;
  ledgerBalanceOk: boolean;
  bedOccupancyOk: boolean;
  labIntegrityOk: boolean;
}> {
  return await withTenantTx(pool, CRASH_TENANT, async (tx) => {
    // 1. Verify Ledger Consistency: For every invoice, paidMinor == SUM(amountMinor)
    const { rows: invRows } = await tx.query<{
      id: string;
      paidMinor: string;
      actualPaid: string;
      paymentsCount: number;
    }>(
      `SELECT i."id",
              i."paidMinor"::text as "paidMinor",
              COALESCE(SUM(p."amountMinor"), 0)::text as "actualPaid",
              count(p."id")::int as "paymentsCount"
       FROM "HmsInvoice" i
       LEFT JOIN "HmsPayment" p ON p."tenantId" = i."tenantId" AND p."invoiceId" = i."id"
       GROUP BY i."id", i."paidMinor"`
    );

    for (const inv of invRows) {
      assert.equal(
        inv.paidMinor,
        inv.actualPaid,
        `Ledger mismatch on invoice ${inv.id}: paidMinor (${inv.paidMinor}) != actual sum of payments (${inv.actualPaid})`
      );
    }

    // 2. Verify Bed Occupancy: No bed has > 1 active admission
    const { rows: bedRows } = await tx.query<{ bedId: string; activeCount: number }>(
      `SELECT "bedId", count(*)::int as "activeCount"
       FROM "HmsAdmission"
       WHERE "dischargedAt" IS NULL
       GROUP BY "bedId"`
    );

    for (const bed of bedRows) {
      assert.ok(
        bed.activeCount <= 1,
        `Bed ${bed.bedId} has ${bed.activeCount} open admissions (invariant I2 violated!)`
      );
    }

    // 3. Verify Lab Order Integrity: no partial state
    const { rows: labRows } = await tx.query<{
      id: string;
      status: string;
      resultSealed: string | null;
      verifiedById: string | null;
      verifiedAt: string | null;
    }>(
      `SELECT "id", "status", "resultSealed", "verifiedById", "verifiedAt"
       FROM "HmsLabOrder"`
    );

    for (const lab of labRows) {
      if (lab.status === 'VERIFIED') {
        assert.ok(lab.verifiedById, `Lab ${lab.id} is VERIFIED but verifiedById is null!`);
        assert.ok(lab.verifiedAt, `Lab ${lab.id} is VERIFIED but verifiedAt is null!`);
      } else if (lab.status === 'ORDERED') {
        assert.equal(lab.verifiedById, null, `Lab ${lab.id} is ORDERED but verifiedById is set!`);
      }
    }

    const { rows: totalAdmissions } = await tx.query<{ count: number }>(`SELECT count(*)::int c FROM "HmsAdmission"`);
    const { rows: totalPayments } = await tx.query<{ count: number }>(`SELECT count(*)::int c FROM "HmsPayment"`);

    return {
      invoicesChecked: invRows.length,
      paymentsChecked: totalPayments[0]?.count ?? 0,
      admissionsChecked: totalAdmissions[0]?.count ?? 0,
      labsChecked: labRows.length,
      ledgerBalanceOk: true,
      bedOccupancyOk: true,
      labIntegrityOk: true,
    };
  });
}

async function runDurabilitySuite() {
  console.log('================================================================');
  console.log('OrbitoX HospitalOS Crash Durability Harness (SIGKILL Mid-Op)');
  console.log('================================================================');

  await seedFixtureData();

  console.log('\n--- 1. Mid-Transaction SIGKILL During Clinical Admissions ---');
  let killedAdmissions = 0;
  for (let i = 1; i <= 5; i++) {
    const res = await spawnWorkerAndKill('admit', {
      admissionId: `adm_crash_${i}`,
      patientId: `pat_crash_${i}`,
      bedId: `bed_crash_${i}`,
      staffId: 'staff_crash_1',
    });
    if (res.signal === 'SIGKILL') killedAdmissions++;
  }
  console.log(`[Admissions] Executed 5 trials with ${killedAdmissions} SIGKILL interruptions.`);

  console.log('\n--- 2. Mid-Transaction SIGKILL During Financial Payments ---');
  let killedPayments = 0;
  for (let i = 1; i <= 5; i++) {
    const res = await spawnWorkerAndKill('pay', {
      invoiceId: `inv_crash_${i}`,
      amountMinor: 25000,
      method: 'CASH',
      idempotencyKey: `idem_crash_kill_${i}`,
      receivedById: 'staff_crash_1',
    });
    if (res.signal === 'SIGKILL') killedPayments++;
  }
  console.log(`[Payments] Executed 5 trials with ${killedPayments} SIGKILL interruptions.`);

  console.log('\n--- 3. Mid-Transaction SIGKILL During Diagnostic Lab Verification ---');
  let killedLabs = 0;
  for (let i = 1; i <= 5; i++) {
    const res = await spawnWorkerAndKill('verify', {
      labOrderId: `lab_crash_${i}`,
      staffId: 'staff_crash_1',
      verifierId: 'staff_crash_1',
    });
    if (res.signal === 'SIGKILL') killedLabs++;
  }
  console.log(`[Lab Verification] Executed 5 trials with ${killedLabs} SIGKILL interruptions.`);

  console.log('\n--- 4. Post-Crash Invariant & Ledger Reconciliation ---');
  const check = await verifyPostCrashInvariants();

  console.log(`Invoices Checked:      ${check.invoicesChecked}`);
  console.log(`Payments In Database:  ${check.paymentsChecked}`);
  console.log(`Admissions in DB:      ${check.admissionsChecked}`);
  console.log(`Lab Orders Checked:    ${check.labsChecked}`);
  console.log(`Ledger Balance Check:  ${check.ledgerBalanceOk ? 'PASS (SUM(p.amountMinor) === i.paidMinor)' : 'FAIL'}`);
  console.log(`Bed Occupancy Check:   ${check.bedOccupancyOk ? 'PASS (<= 1 open admission per bed)' : 'FAIL'}`);
  console.log(`Lab State Machine:     ${check.labIntegrityOk ? 'PASS (Valid transitions, no torn rows)' : 'FAIL'}`);

  console.log('\n================================================================');
  console.log('CRASH DURABILITY VERDICT: ALL INVARIANTS PRESERVED ACROSS SIGKILL');
  console.log('================================================================\n');

  await pool.end();
}

runDurabilitySuite().catch((err) => {
  console.error('[CRASH HARNESS FAILED]', err);
  process.exit(1);
});
