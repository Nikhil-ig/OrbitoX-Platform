/**
 * Worker process for HospitalOS crash durability harness (Phase 2b-3).
 * Performs admissions, payments, or lab verifications inside withTenantTx
 * and signals the parent right before commit so parent can send SIGKILL mid-operation.
 */
import crypto from 'node:crypto';
import { Pool } from 'pg';
import { withTenantTx } from '../lib/tenant-db';
import { PhiKeyRing, seal, blindIndex } from '../lib/phi-crypto';
import { recordPayment, admitPatient } from '../lib/hms-repository';

const url = process.env.APP_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://orbitox_runtime@127.0.0.1:5432/orbitox_phase2';
const pool = new Pool({ connectionString: url });

const ring = new PhiKeyRing({
  keys: { k2026: crypto.randomBytes(32).toString('base64') },
  activeKid: 'k2026',
  indexKey: crypto.randomBytes(32).toString('base64'),
});

async function run() {
  const op = process.argv[2]; // 'admit' | 'pay' | 'verify'
  const tenantId = process.argv[3];
  const payloadJson = process.argv[4];

  if (!op || !tenantId || !payloadJson) {
    process.stderr.write('Usage: tsx hms-crash-worker.ts <admit|pay|verify> <tenantId> <payloadJson>\n');
    process.exit(1);
  }

  const payload = JSON.parse(payloadJson);

  await withTenantTx(pool, tenantId, async (tx) => {
    if (op === 'admit') {
      // Step 1: Check bed service state
      const bed = await tx.query<{ serviceState: string }>(
        `SELECT "serviceState" FROM "HmsBed" WHERE "id" = $1`,
        [payload.bedId]
      );
      if (!bed.rows[0]) throw new Error('Bed not found');

      // Step 2: Insert admission
      const admId = payload.admissionId || `adm_crash_${Date.now()}`;
      await tx.query(
        `INSERT INTO "HmsAdmission" ("id", "patientId", "bedId", "attendingStaffId")
         VALUES ($1, $2, $3, $4)`,
        [admId, payload.patientId, payload.bedId, payload.staffId]
      );

      // Signal parent that we are in transaction
      if (process.send) {
        process.send({ status: 'IN_TRANSACTION', op, id: admId });
      } else {
        process.stdout.write(`STATUS:IN_TRANSACTION:${op}:${admId}\n`);
      }

      // Artificial hold to allow SIGKILL
      await new Promise((r) => setTimeout(r, 200));

    } else if (op === 'pay') {
      // Signal parent right before payment record
      if (process.send) {
        process.send({ status: 'IN_TRANSACTION', op, id: payload.invoiceId });
      } else {
        process.stdout.write(`STATUS:IN_TRANSACTION:${op}:${payload.invoiceId}\n`);
      }

      // Insert payment inside transaction
      await recordPayment(tx, {
        invoiceId: payload.invoiceId,
        amountMinor: BigInt(payload.amountMinor),
        method: payload.method || 'CASH',
        idempotencyKey: payload.idempotencyKey || `idem_crash_${Date.now()}`,
        receivedById: payload.receivedById || 'staff_cashier',
      });

      // Artificial hold to allow SIGKILL
      await new Promise((r) => setTimeout(r, 200));

    } else if (op === 'verify') {
      // Result then verify
      const sealed = seal(ring, 'Lab normal value', {
        tenantId,
        column: 'result',
        rowId: payload.labOrderId,
      });

      await tx.query(
        `UPDATE "HmsLabOrder"
         SET "status" = 'RESULTED',
             "resultSealed" = $2,
             "resultedById" = $3,
             "updatedAt" = now()
         WHERE "id" = $1`,
        [payload.labOrderId, sealed, payload.staffId]
      );

      if (process.send) {
        process.send({ status: 'IN_TRANSACTION', op, id: payload.labOrderId });
      } else {
        process.stdout.write(`STATUS:IN_TRANSACTION:${op}:${payload.labOrderId}\n`);
      }

      // Artificial hold to allow SIGKILL
      await new Promise((r) => setTimeout(r, 200));

      await tx.query(
        `UPDATE "HmsLabOrder"
         SET "status" = 'VERIFIED',
             "verifiedById" = $2,
             "verifiedAt" = now(),
             "updatedAt" = now()
         WHERE "id" = $1`,
        [payload.labOrderId, payload.verifierId || payload.staffId]
      );
    }
  });

  process.stdout.write(`COMPLETED:${op}\n`);
  await pool.end();
}

run().catch((err) => {
  process.stderr.write(`ERROR: ${err.message}\n`);
  process.exit(1);
});
