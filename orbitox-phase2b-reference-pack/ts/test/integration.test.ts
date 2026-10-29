/**
 * Runs against a fresh database with 001_hms_plugin_schema.sql applied, as the REAL runtime role.
 *   HMS_IT_RUNTIME_URL=postgresql://orbitox_runtime@127.0.0.1:55432/hms_it
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { Pool } from 'pg';
import { withTenantTx, TenantScopeError } from '../src/tenant-db';
import { mapDbError } from '../src/db-errors';
import { idempotent } from '../src/idempotency';
import { PhiKeyRing } from '../src/phi-crypto';
import * as hms from '../src/hms-repository';

const A = 'org/a/project/p1/environment/prod';
const B = 'org/b/project/p1/environment/prod';
const url = process.env.HMS_IT_RUNTIME_URL!;
const pool = new Pool({ connectionString: url, max: 10 });
const ring = new PhiKeyRing({ keys: { k1: crypto.randomBytes(32).toString('base64') }, activeKid: 'k1',
                              indexKey: crypto.randomBytes(32).toString('base64') });
const SEALED = 'v1.k1.AAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAA.eA';

async function seedRefs(tenant: string, tag: string) {
  await withTenantTx(pool, tenant, async (tx) => {
    await tx.query(`INSERT INTO "HmsDepartment"(id,name) VALUES ('dep1','General')`);
    await tx.query(`INSERT INTO "HmsWard"(id,"departmentId",name) VALUES ('w1','dep1','W1')`);
    await tx.query(`INSERT INTO "HmsBed"(id,"wardId",label,"dailyRateMinor") VALUES ('bed1','w1','B1',100000)`);
    for (const [id, role] of [['doc1', 'DOCTOR'], ['doc2', 'DOCTOR'], ['cash1', 'BILLING']]) {
      await tx.query(`INSERT INTO "HmsStaff"(id,"nameSealed","emailBlind",role) VALUES ($1,$2,$3,$4)`,
        [id, SEALED, crypto.createHash('md5').update(tag + id).digest('hex'), role]);
    }
  });
}

before(async () => { await seedRefs(A, 'a'); await seedRefs(B, 'b'); });
after(async () => { await pool.end(); });

describe('withTenantTx', () => {
  it('tenant setting never leaks to the next user of a pooled connection', async () => {
    const one = new Pool({ connectionString: url, max: 1 });   // force connection reuse
    try {
      await withTenantTx(one, A, async (tx) => { await tx.query('SELECT 1'); });
      const r = await one.query(`SELECT coalesce(current_setting('app.current_tenant_id', true),'') AS t, (SELECT count(*) FROM "HmsBed")::int AS beds`);
      assert.equal(r.rows[0].t, '');
      assert.equal(r.rows[0].beds, 0, 'outside a tenant tx RLS returns nothing');
    } finally { await one.end(); }
  });
  it('rejects bad tenant ids and transaction-control SQL', async () => {
    await assert.rejects(withTenantTx(pool, "org/a' OR 1=1", async () => 1), TenantScopeError);
    await assert.rejects(withTenantTx(pool, 'org/a', async () => 1), TenantScopeError);
    for (const sql of ['COMMIT', 'rollback', 'SET ROLE postgres', "SELECT set_config('app.current_tenant_id','x',true)", 'RESET ALL']) {
      await assert.rejects(withTenantTx(pool, A, (tx) => tx.query(sql)), TenantScopeError, sql);
    }
  });
  it('rolls back everything on error', async () => {
    await assert.rejects(withTenantTx(pool, A, async (tx) => {
      await tx.query(`INSERT INTO "HmsDepartment"(id,name) VALUES ('tmp','Tmp')`);
      throw new Error('boom');
    }));
    const n = await withTenantTx(pool, A, (tx) => tx.query(`SELECT count(*)::int c FROM "HmsDepartment" WHERE id='tmp'`));
    assert.equal(n.rows[0].c, 0);
  });
  it('statement timeout is enforced', async () => {
    await assert.rejects(withTenantTx(pool, A, (tx) => tx.query('SELECT pg_sleep(2)'), { statementTimeoutMs: 200, lockTimeoutMs: 100 }),
      (e: any) => mapDbError(e).code === 'STATEMENT_TIMEOUT');
  });
});

describe('patients and PHI', () => {
  let patientId = '';
  it('creates a patient with sealed PHI and finds it by phone without plaintext', async () => {
    const p = await withTenantTx(pool, A, (tx) => hms.createPatient(tx, ring, { mrn: 'MRN-IT-0001', name: 'Asha Verma', phone: '+91 98111 22233', allergies: 'Penicillin' }));
    patientId = p.id;
    const raw = await withTenantTx(pool, A, (tx) => tx.query(`SELECT * FROM "HmsPatient" WHERE id=$1`, [p.id]));
    const blob = JSON.stringify(raw.rows[0]);
    for (const s of ['Asha', 'Verma', '98111', 'Penicillin']) assert.equal(blob.includes(s), false, `plaintext ${s} stored`);
    const found = await withTenantTx(pool, A, (tx) => hms.findPatientIdsByPhone(tx, ring, '09811122233'));
    assert.deepEqual(found.map((f) => f.id), [p.id]);
    const other = await withTenantTx(pool, B, (tx) => hms.findPatientIdsByPhone(tx, ring, '9811122233'));
    assert.equal(other.length, 0);
  });
  it('read for purpose: minimum necessary, audited, 404 across tenants', async () => {
    const r = await withTenantTx(pool, A, (tx) => hms.readPatientForPurpose(tx, ring,
      { patientId, actorId: 'doc1', purpose: 'TREATMENT', fields: ['name', 'allergies'], requestId: 'req-it-1' }));
    assert.equal(r.name, 'Asha Verma'); assert.equal(r.allergies, 'Penicillin');
    await assert.rejects(withTenantTx(pool, A, (tx) => hms.readPatientForPurpose(tx, ring,
      { patientId, actorId: 'cash1', purpose: 'BILLING', fields: ['allergies'], requestId: 'req-it-2' })),
      (e: any) => e.code === 'PHI_FIELD_NOT_PERMITTED_FOR_PURPOSE');
    await assert.rejects(withTenantTx(pool, B, (tx) => hms.readPatientForPurpose(tx, ring,
      { patientId, actorId: 'doc1', purpose: 'TREATMENT', fields: ['name'], requestId: 'req-it-3' })),
      (e: any) => e.status === 404);
    await assert.rejects(withTenantTx(pool, A, (tx) => hms.readPatientForPurpose(tx, ring,
      { patientId, actorId: 'doc2', purpose: 'BREAK_GLASS', fields: ['name'], requestId: 'req-it-4' })),
      (e: any) => e.code === 'BREAK_GLASS_GRANT_REQUIRED');
  });
});

describe('concurrency invariants through the repository', () => {
  it('20 concurrent admissions to one bed: exactly 1 succeeds, 19 get BED_OCCUPIED', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 20; i++) {
      ids.push((await withTenantTx(pool, A, (tx) => hms.createPatient(tx, ring, { mrn: `MRN-ADM-${String(i).padStart(4, '0')}`, name: `P${i}` }))).id);
    }
    const results = await Promise.allSettled(ids.map((patientId) =>
      withTenantTx(pool, A, (tx) => hms.admitPatient(tx, { patientId, bedId: 'bed1', staffId: 'doc1' }))));
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const codes = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected').map((r) => mapDbError(r.reason).code);
    assert.equal(ok, 1);
    assert.deepEqual([...new Set(codes)], ['BED_OCCUPIED']);
  });

  it('20 concurrent identical payments (same idempotency key) record once; replays agree', async () => {
    const pat = await withTenantTx(pool, A, (tx) => hms.createPatient(tx, ring, { mrn: 'MRN-PAY-0001', name: 'Payer' }));
    await withTenantTx(pool, A, (tx) => tx.query(`INSERT INTO "HmsInvoice"(id,"patientId","totalMinor") VALUES ('invIT',$1,50000)`, [pat.id]));
    const req = { invoiceId: 'invIT', amountMinor: 50000n, method: 'UPI' as const, idempotencyKey: 'it-pay-key-0001', receivedById: 'cash1' };
    const results = await Promise.all(Array.from({ length: 20 }, () => withTenantTx(pool, A, (tx) => hms.recordPayment(tx, req))));
    assert.equal(results.filter((r) => !r.replayed).length, 1);
    assert.equal(new Set(results.map((r) => r.paymentId)).size, 1);
    const inv = await withTenantTx(pool, A, (tx) => tx.query(`SELECT "paidMinor"::text p, status, (SELECT count(*)::int FROM "HmsPayment" WHERE "invoiceId"='invIT') n FROM "HmsInvoice" WHERE id='invIT'`));
    assert.deepEqual(inv.rows[0], { p: '50000', status: 'PAID', n: 1 });
    // sequential replay after the invoice is PAID still replays (not INVOICE_CLOSED)
    const again = await withTenantTx(pool, A, (tx) => hms.recordPayment(tx, req));
    assert.equal(again.replayed, true);
    // same key, different amount => 422
    await assert.rejects(withTenantTx(pool, A, (tx) => hms.recordPayment(tx, { ...req, amountMinor: 1n })),
      (e: any) => e.code === 'IDEMPOTENCY_KEY_REUSED');
  });

  it('two cashiers, different keys, jointly over the balance: one wins, one PAYMENT_EXCEEDS_BALANCE', async () => {
    const pat = await withTenantTx(pool, A, (tx) => hms.createPatient(tx, ring, { mrn: 'MRN-PAY-0002', name: 'Payer2' }));
    await withTenantTx(pool, A, (tx) => tx.query(`INSERT INTO "HmsInvoice"(id,"patientId","totalMinor") VALUES ('invIT2',$1,60000)`, [pat.id]));
    const pay = (k: string) => withTenantTx(pool, A, (tx) => hms.recordPayment(tx, { invoiceId: 'invIT2', amountMinor: 40000n, method: 'CASH', idempotencyKey: k, receivedById: 'cash1' }));
    const rs = await Promise.allSettled([pay('it-pay-key-a001'), pay('it-pay-key-b001')]);
    assert.equal(rs.filter((r) => r.status === 'fulfilled').length, 1);
    const rej = rs.find((r): r is PromiseRejectedResult => r.status === 'rejected')!;
    assert.equal(mapDbError(rej.reason).code, 'PAYMENT_EXCEEDS_BALANCE');
  });

  it('doctor double-booking under concurrency: 1 wins, others DOCTOR_SLOT_TAKEN', async () => {
    const pats: string[] = [];
    for (let i = 0; i < 10; i++) pats.push((await withTenantTx(pool, A, (tx) => hms.createPatient(tx, ring, { mrn: `MRN-APT-${String(i).padStart(4, '0')}`, name: `A${i}` }))).id);
    const start = new Date('2026-11-05T05:00:00Z'), end = new Date('2026-11-05T05:30:00Z');
    const rs = await Promise.allSettled(pats.map((patientId) => withTenantTx(pool, A, (tx) => hms.bookAppointment(tx, { patientId, doctorId: 'doc2', start, end }))));
    assert.equal(rs.filter((r) => r.status === 'fulfilled').length, 1);
    assert.deepEqual([...new Set(rs.filter((r): r is PromiseRejectedResult => r.status === 'rejected').map((r) => mapDbError(r.reason).code))], ['DOCTOR_SLOT_TAKEN']);
  });

  it('generic idempotent(): 20 concurrent creates with one key => one patient, 19 replays', async () => {
    const body = { mrn: 'MRN-IDEM-0001', name: 'Idem Patient' };
    const results = await Promise.all(Array.from({ length: 20 }, () => withTenantTx(pool, A, (tx) =>
      idempotent(tx, 'hms.patient.create', 'idem-create-0001', body, async () => {
        const p = await hms.createPatient(tx, ring, body);
        return { status: 201, body: p };
      }))));
    assert.equal(results.filter((r) => !r.replayed).length, 1);
    assert.equal(new Set(results.map((r) => (r.body as any).id)).size, 1);
    const n = await withTenantTx(pool, A, (tx) => tx.query(`SELECT count(*)::int c FROM "HmsPatient" WHERE mrn='MRN-IDEM-0001'`));
    assert.equal(n.rows[0].c, 1);
    await assert.rejects(withTenantTx(pool, A, (tx) => idempotent(tx, 'hms.patient.create', 'idem-create-0001', { ...body, name: 'Other' }, async () => ({ status: 201, body: {} }))),
      (e: any) => e.code === 'IDEMPOTENCY_KEY_REUSED');
  });

  it('outbox rows are written only for committed work', async () => {
    const before = await withTenantTx(pool, A, (tx) => tx.query(`SELECT count(*)::int c FROM "TenantOutbox"`));
    await assert.rejects(withTenantTx(pool, A, async (tx) => {
      await hms.createPatient(tx, ring, { mrn: 'MRN-ROLL-0001', name: 'Rolled Back' });
      throw new Error('abort after write');
    }));
    const afterRb = await withTenantTx(pool, A, (tx) => tx.query(`SELECT count(*)::int c FROM "TenantOutbox"`));
    assert.equal(afterRb.rows[0].c, before.rows[0].c);
    const bCount = await withTenantTx(pool, B, (tx) => tx.query(`SELECT count(*)::int c FROM "TenantOutbox"`));
    assert.equal(bCount.rows[0].c, 0, 'tenant B sees none of A outbox');
  });
});
