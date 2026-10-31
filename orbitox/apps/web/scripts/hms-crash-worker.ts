/**
 * Worker process for HospitalOS crash durability harness (Phase 2b-3).
 * Performs admissions, payments, or lab verifications inside withTenantTx
 * and signals parent at one of 3 randomized kill points:
 * 1. 'before-statement': signals before any database transaction/query begins.
 * 2. 'mid-tx': signals inside withTenantTx before commit.
 * 3. 'post-commit': signals after withTenantTx commits before response.
 */
import crypto from 'node:crypto';
import { Pool } from 'pg';
import { withTenantTx } from '../lib/tenant-db';
import { PhiKeyRing, seal } from '../lib/phi-crypto';
import { recordPayment } from '../lib/hms-repository';

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
  const killPoint = (process.argv[5] || 'mid-tx') as 'before-statement' | 'mid-tx' | 'post-commit';

  if (!op || !tenantId || !payloadJson) {
    process.stderr.write('Usage: tsx hms-crash-worker.ts <admit|pay|verify> <tenantId> <payloadJson> [killPoint]\n');
    process.exit(1);
  }

  const payload = JSON.parse(payloadJson);

  // 1. Kill point: before-statement (killed before any SQL or transaction is started)
  if (killPoint === 'before-statement') {
    if (process.send) {
      process.send({ status: 'BEFORE_STATEMENT', op, killPoint });
    }
    // Hold while parent delivers SIGKILL
    await new Promise((r) => setTimeout(r, 2500));
    process.exit(0);
  }

  // Operations inside transaction
  await withTenantTx(pool, tenantId, async (tx) => {
    if (op === 'admit') {
      const admId = payload.admissionId || `adm_crash_${Date.now()}`;
      await tx.query(
        `INSERT INTO "HmsAdmission" ("id", "patientId", "bedId", "attendingStaffId")
         VALUES ($1, $2, $3, $4)`,
        [admId, payload.patientId, payload.bedId, payload.staffId]
      );

      // 2. Kill point: mid-tx (killed inside transaction before commit)
      if (killPoint === 'mid-tx') {
        if (process.send) {
          process.send({ status: 'MID_TX', op, id: admId, killPoint });
        }
        await new Promise((r) => setTimeout(r, 2500));
      }
    } else if (op === 'pay') {
      if (killPoint === 'mid-tx') {
        // Execute direct payment row insert to establish in-flight uncommitted state
        const payId = `pay_${Date.now()}`;
        await tx.query(
          `INSERT INTO "HmsPayment" ("id", "invoiceId", "amountMinor", "method", "idempotencyKey", "receivedById")
           VALUES ($1, $2, $3::bigint, $4, $5, $6)`,
          [payId, payload.invoiceId, payload.amountMinor, payload.method || 'CASH', payload.idempotencyKey, payload.receivedById || 'staff_crash_1']
        );
        if (process.send) {
          process.send({ status: 'MID_TX', op, id: payload.invoiceId, killPoint });
        }
        await new Promise((r) => setTimeout(r, 2500));
      } else {
        // Normal recordPayment with outbox and invoice trigger
        await recordPayment(tx, {
          invoiceId: payload.invoiceId,
          amountMinor: BigInt(payload.amountMinor),
          method: payload.method || 'CASH',
          idempotencyKey: payload.idempotencyKey,
          receivedById: payload.receivedById || 'staff_crash_1',
        });
      }
    } else if (op === 'verify') {
      // Transition from RESULTED to VERIFIED
      await tx.query(
        `UPDATE "HmsLabOrder"
         SET "status" = 'VERIFIED',
             "verifiedById" = $2,
             "verifiedAt" = now(),
             "updatedAt" = now()
         WHERE "id" = $1`,
        [payload.labOrderId, payload.verifierId || 'staff_crash_2']
      );

      if (killPoint === 'mid-tx') {
        if (process.send) {
          process.send({ status: 'MID_TX', op, id: payload.labOrderId, killPoint });
        }
        await new Promise((r) => setTimeout(r, 2500));
      }
    }
  });

  // 3. Kill point: post-commit (killed after commit succeeds, before returning response)
  if (killPoint === 'post-commit') {
    if (process.send) {
      process.send({ status: 'POST_COMMIT', op, killPoint });
    }
    await new Promise((r) => setTimeout(r, 2500));
  }

  process.stdout.write(`COMPLETED:${op}\n`);
  await pool.end();
}

run().catch((err) => {
  process.stderr.write(`ERROR: ${err.message}\n`);
  process.exit(1);
});
