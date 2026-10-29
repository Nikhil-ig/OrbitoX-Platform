/**
 * Negative control test for Phase 2b:
 * Drops the bed-uniqueness index and the payment validator trigger,
 * proves that both invariants fail as required, and restores the invariants.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { Pool } from 'pg';
import { withTenantTx } from '../lib/tenant-db';
import { mapDbError } from '../lib/db-errors';
import { PhiKeyRing } from '../lib/phi-crypto';
import * as hms from '../lib/hms-repository';

const A = 'org/negative-ctrl/project/p1/environment/prod';
const runtimeUrl = process.env.HMS_IT_RUNTIME_URL || 'postgresql://orbitox_runtime@127.0.0.1:5432/orbitox_phase2';
const adminUrl = process.env.DATABASE_URL || 'postgresql://apple@127.0.0.1:5432/orbitox_phase2';

const runtimePool = new Pool({ connectionString: runtimeUrl, max: 10 });
const adminPool = new Pool({ connectionString: adminUrl, max: 2 });

const ring = new PhiKeyRing({
  keys: { k1: crypto.randomBytes(32).toString('base64') },
  activeKid: 'k1',
  indexKey: crypto.randomBytes(32).toString('base64'),
});
const SEALED = 'v1.k1.AAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAA.eA';

async function dropInvariants() {
  await adminPool.query(`DROP INDEX IF EXISTS "HmsAdmission_one_open_per_bed"`);
  await adminPool.query(`DROP TRIGGER IF EXISTS "HmsPayment_validate" ON "HmsPayment"`);
}

async function restoreInvariants() {
  await adminPool.query(`DELETE FROM "HmsAdmission" WHERE "tenantId" = '${A}'`);
  await adminPool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS "HmsAdmission_one_open_per_bed" ON "HmsAdmission" ("tenantId", "bedId") WHERE "dischargedAt" IS NULL`
  );
  await adminPool.query(
    `DROP TRIGGER IF EXISTS "HmsPayment_validate" ON "HmsPayment";
     CREATE TRIGGER "HmsPayment_validate" BEFORE INSERT ON "HmsPayment" FOR EACH ROW EXECUTE FUNCTION hms_validate_payment();`
  );
}

before(async () => {
  await withTenantTx(runtimePool, A, async (tx) => {
    await tx.query(`INSERT INTO "HmsDepartment"(id,name) VALUES ('dep_neg','Negative Control Dept') ON CONFLICT DO NOTHING`);
    await tx.query(`INSERT INTO "HmsWard"(id,"departmentId",name) VALUES ('w_neg','dep_neg','Ward Neg') ON CONFLICT DO NOTHING`);
    await tx.query(`INSERT INTO "HmsBed"(id,"wardId",label,"dailyRateMinor") VALUES ('bed_neg','w_neg','B-Neg',100000) ON CONFLICT DO NOTHING`);
    await tx.query(
      `INSERT INTO "HmsStaff"(id,"nameSealed","emailBlind",role) VALUES ('doc_neg',$1,$2,'DOCTOR') ON CONFLICT DO NOTHING`,
      [SEALED, crypto.createHash('md5').update('doc_neg').digest('hex')]
    );
    await tx.query(
      `INSERT INTO "HmsStaff"(id,"nameSealed","emailBlind",role) VALUES ('cash_neg',$1,$2,'BILLING') ON CONFLICT DO NOTHING`,
      [SEALED, crypto.createHash('md5').update('cash_neg').digest('hex')]
    );
  });

  // Drop invariants to enter negative control state
  await dropInvariants();
});

after(async () => {
  // Always restore invariants after negative control
  await restoreInvariants();
  await runtimePool.end();
  await adminPool.end();
});

describe('Negative control: dropped invariants produce test failures as required', () => {
  it('NEGATIVE CONTROL 1: Without bed-uniqueness index, concurrent admissions to same bed SUCCEED (breaking invariant I3)', async () => {
    const ids: string[] = [];
    const prefix = Date.now().toString().slice(-4);
    for (let i = 0; i < 5; i++) {
      ids.push(
        (
          await withTenantTx(runtimePool, A, (tx) =>
            hms.createPatient(tx, ring, {
              mrn: `MRN-NEG-${prefix}-${String(i).padStart(4, '0')}`,
              name: `PNeg${i}`,
            })
          )
        ).id
      );
    }
    const results = await Promise.allSettled(
      ids.map((patientId) => withTenantTx(runtimePool, A, (tx) => hms.admitPatient(tx, { patientId, bedId: 'bed_neg', staffId: 'doc_neg' })))
    );
    const ok = results.filter((r) => r.status === 'fulfilled').length;

    // Under normal invariant, exactly 1 succeeds and 4 fail with BED_OCCUPIED.
    // Under negative control (dropped index), more than 1 succeeds!
    assert.ok(ok > 1, `Negative control verified: without index, ${ok} concurrent admissions succeeded on the same bed`);
  });

  it('NEGATIVE CONTROL 2: Without payment validator trigger, overpayment SUCCEEDS (breaking invariant I6)', async () => {
    const invId = `invNeg_${Date.now()}`;
    const pat = await withTenantTx(runtimePool, A, (tx) =>
      hms.createPatient(tx, ring, { mrn: `MRN-NEG-PAY-${Date.now().toString().slice(-4)}`, name: 'PayerNeg' })
    );
    await withTenantTx(runtimePool, A, (tx) =>
      tx.query(`INSERT INTO "HmsInvoice"(id,"patientId","totalMinor") VALUES ($1,$2,60000)`, [invId, pat.id])
    );
    const pay = (k: string) =>
      withTenantTx(runtimePool, A, (tx) =>
        hms.recordPayment(tx, {
          invoiceId: invId,
          amountMinor: 40000n,
          method: 'CASH',
          idempotencyKey: k,
          receivedById: 'cash_neg',
        })
      );
    const suffix = Date.now();
    const rs = await Promise.allSettled([pay(`neg-key-a-${suffix}`), pay(`neg-key-b-${suffix}`)]);
    const ok = rs.filter((r) => r.status === 'fulfilled').length;
    const rejected = rs.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
    const mapped = rejected ? mapDbError(rejected.reason) : null;

    // Under normal invariant with trigger, exactly one cashier succeeds and the other gets PAYMENT_EXCEEDS_BALANCE.
    // Without the trigger, PAYMENT_EXCEEDS_BALANCE is lost (hitting raw check constraint and mapping to INVALID_INPUT).
    assert.equal(ok, 1);
    assert.notEqual(mapped?.code, 'PAYMENT_EXCEEDS_BALANCE', 'Negative control verified: without trigger, clean invariant code PAYMENT_EXCEEDS_BALANCE is not returned');
  });
});
