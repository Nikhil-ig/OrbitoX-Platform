/**
 * HospitalOS repository on the plugin schema. Every function takes a TenantTx (never a pool),
 * so it cannot run outside a tenant-scoped transaction.
 *
 * PHI rules:
 *  - PHI is sealed before it reaches SQL and opened only in readPatientForPurpose(), which writes
 *    an HmsPhiAccessLog row in the SAME transaction (no read without an audit row).
 *  - Search uses blind indexes; list endpoints return MRN + operational fields only.
 *  - Outbox payloads and idempotency responses carry ids, never PHI.
 */
import crypto from 'node:crypto';
import type { TenantTx } from './tenant-db';
import { HttpError } from './db-errors';
import { PhiKeyRing, seal, open, blindIndex } from './phi-crypto';

const newId = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;

async function outbox(tx: TenantTx, topic: string, payload: Record<string, string | number | null>) {
  await tx.query(`INSERT INTO "TenantOutbox" ("topic","payload") VALUES ($1,$2::jsonb)`, [topic, JSON.stringify(payload)]);
  // Delivered only on COMMIT; payload is just the tenant (listeners re-read the outbox under RLS).
  await tx.query(`SELECT pg_notify('orbitox_outbox', current_setting('app.current_tenant_id'))`);
}

export interface NewPatient {
  mrn: string; name: string; phone?: string; dateOfBirth?: string; ageBand?: string;
  gender?: 'M' | 'F' | 'OTHER' | 'UNDISCLOSED'; bloodGroup?: string; allergies?: string; emergencyContact?: string;
}

export async function createPatient(tx: TenantTx, ring: PhiKeyRing, p: NewPatient): Promise<{ id: string; mrn: string }> {
  if (!p.name?.trim()) throw new HttpError(422, 'INVALID_INPUT', 'name required');
  const id = newId('pat');
  const ref = (column: string) => ({ tenantId: tx.tenantId, column, rowId: id });
  const s = (v: string | undefined, col: string) => (v == null || v === '' ? null : seal(ring, v, ref(col)));
  await tx.query(
    `INSERT INTO "HmsPatient" ("id","mrn","nameSealed","nameBlind","phoneSealed","phoneBlind","dateOfBirthSealed",
                               "ageBand","gender","bloodGroup","allergiesSealed","emergencyContactSealed")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [id, p.mrn, s(p.name, 'name'), blindIndex(ring, p.name, 'name', tx.tenantId, 'name'),
     s(p.phone, 'phone'), p.phone ? blindIndex(ring, p.phone, 'phone', tx.tenantId, 'phone') : null,
     s(p.dateOfBirth, 'dateOfBirth'), p.ageBand ?? null, p.gender ?? null, p.bloodGroup ?? null,
     s(p.allergies, 'allergies'), s(p.emergencyContact, 'emergencyContact')],
  );
  await outbox(tx, 'hms.patient.created', { id });
  return { id, mrn: p.mrn };
}

/** Exact phone search without plaintext: returns ids + MRN only. */
export async function findPatientIdsByPhone(tx: TenantTx, ring: PhiKeyRing, phone: string) {
  const { rows } = await tx.query<{ id: string; mrn: string }>(
    `SELECT "id","mrn" FROM "HmsPatient" WHERE "phoneBlind" = $1 ORDER BY "createdAt" LIMIT 20`,
    [blindIndex(ring, phone, 'phone', tx.tenantId, 'phone')],
  );
  return rows;
}

const PHI_COLUMNS = { name: 'nameSealed', phone: 'phoneSealed', dateOfBirth: 'dateOfBirthSealed',
                      allergies: 'allergiesSealed', emergencyContact: 'emergencyContactSealed' } as const;
export type PhiField = keyof typeof PHI_COLUMNS;
export type Purpose = 'TREATMENT' | 'BILLING' | 'OPERATIONS' | 'BREAK_GLASS' | 'PATIENT_REQUEST';

/** Minimum-necessary: callers name the fields they need; billing never gets allergies, etc. */
const PURPOSE_ALLOWS: Record<Purpose, readonly PhiField[]> = {
  TREATMENT:       ['name', 'phone', 'dateOfBirth', 'allergies', 'emergencyContact'],
  BREAK_GLASS:     ['name', 'phone', 'dateOfBirth', 'allergies', 'emergencyContact'],
  PATIENT_REQUEST: ['name', 'phone', 'dateOfBirth', 'allergies', 'emergencyContact'],
  BILLING:         ['name', 'phone'],
  OPERATIONS:      ['name'],
};

export async function readPatientForPurpose(
  tx: TenantTx, ring: PhiKeyRing,
  q: { patientId: string; actorId: string; purpose: Purpose; fields: PhiField[]; requestId: string },
) {
  if (q.fields.length === 0) throw new HttpError(422, 'INVALID_INPUT', 'fields required');
  const denied = q.fields.filter((f) => !PURPOSE_ALLOWS[q.purpose].includes(f));
  if (denied.length) throw new HttpError(403, 'PHI_FIELD_NOT_PERMITTED_FOR_PURPOSE');

  if (q.purpose === 'BREAK_GLASS') {
    const g = await tx.query(
      `SELECT 1 FROM "HmsBreakGlassGrant" WHERE "staffId"=$1 AND "patientId"=$2 AND now() < "expiresAt" LIMIT 1`,
      [q.actorId, q.patientId]);
    if (g.rowCount === 0) throw new HttpError(403, 'BREAK_GLASS_GRANT_REQUIRED');
  }
  const cols = q.fields.map((f) => `"${PHI_COLUMNS[f]}"`).join(',');   // whitelist-derived, not user input
  const { rows } = await tx.query(`SELECT "id","mrn",${cols} FROM "HmsPatient" WHERE "id"=$1`, [q.patientId]);
  if (!rows[0]) throw new HttpError(404, 'PATIENT_NOT_FOUND');      // other tenants' ids look identical: 404
  // Audit BEFORE returning data; if the insert fails the whole read fails.
  await tx.query(
    `INSERT INTO "HmsPhiAccessLog" ("actorId","patientId","columns","purpose","requestId") VALUES ($1,$2,$3,$4,$5)`,
    [q.actorId, q.patientId, q.fields.map((f) => PHI_COLUMNS[f]), q.purpose, q.requestId]);
  const out: Record<string, string | null> = { id: rows[0].id, mrn: rows[0].mrn };
  for (const f of q.fields) {
    const v = rows[0][PHI_COLUMNS[f]];
    out[f] = v == null ? null : open(ring, v, { tenantId: tx.tenantId, column: f, rowId: q.patientId });
  }
  return out;
}

export async function admitPatient(tx: TenantTx, a: { patientId: string; bedId: string; staffId: string; notes?: string; ring?: PhiKeyRing }) {
  const id = newId('adm');
  const notes = a.notes && a.ring ? seal(a.ring, a.notes, { tenantId: tx.tenantId, column: 'admissionNotes', rowId: id }) : null;
  await tx.query(
    `INSERT INTO "HmsAdmission" ("id","patientId","bedId","attendingStaffId","notesSealed") VALUES ($1,$2,$3,$4,$5)`,
    [id, a.patientId, a.bedId, a.staffId, notes]);
  await outbox(tx, 'hms.admission.created', { id, bedId: a.bedId });
  return { id };
}

export async function dischargePatient(tx: TenantTx, admissionId: string) {
  const r = await tx.query(`UPDATE "HmsAdmission" SET "dischargedAt"=now() WHERE "id"=$1 AND "dischargedAt" IS NULL RETURNING "bedId"`, [admissionId]);
  if (r.rowCount === 0) throw new HttpError(404, 'OPEN_ADMISSION_NOT_FOUND');
  await outbox(tx, 'hms.admission.discharged', { id: admissionId, bedId: r.rows[0].bedId });
}

export async function bookAppointment(tx: TenantTx, b: { patientId: string; doctorId: string; start: Date; end: Date }) {
  if (!(b.end > b.start)) throw new HttpError(422, 'INVALID_SLOT');
  const id = newId('apt');
  await tx.query(
    `INSERT INTO "HmsAppointment" ("id","patientId","doctorId","slot") VALUES ($1,$2,$3,tstzrange($4,$5,'[)'))`,
    [id, b.patientId, b.doctorId, b.start.toISOString(), b.end.toISOString()]);
  return { id };
}

/**
 * Idempotent payment. The DB guarantees: no overpay (row lock), no double record (unique key),
 * no phantom bump on retry (AFTER trigger). This function adds: same key + different payload => 422.
 */
export async function recordPayment(
  tx: TenantTx,
  p: { invoiceId: string; amountMinor: bigint; method: 'CASH' | 'CARD' | 'UPI' | 'INSURANCE' | 'BANK_TRANSFER'; idempotencyKey: string; receivedById: string },
): Promise<{ paymentId: string; replayed: boolean; invoice: { paidMinor: string; status: string } }> {
  if (p.amountMinor <= 0n) throw new HttpError(422, 'INVALID_AMOUNT');
  const id = newId('pay');
  const ins = await tx.query<{ id: string }>(
    `INSERT INTO "HmsPayment" ("id","invoiceId","amountMinor","method","idempotencyKey","receivedById")
     VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT ("tenantId","idempotencyKey") DO NOTHING RETURNING "id"`,
    [id, p.invoiceId, p.amountMinor.toString(), p.method, p.idempotencyKey, p.receivedById]);
  let paymentId = ins.rows[0]?.id;
  let replayed = false;
  if (!paymentId) {
    const prev = await tx.query<{ id: string; invoiceId: string; amountMinor: string; method: string }>(
      `SELECT "id","invoiceId","amountMinor","method" FROM "HmsPayment" WHERE "idempotencyKey"=$1`, [p.idempotencyKey]);
    const row = prev.rows[0];
    if (!row) throw new HttpError(409, 'PAYMENT_IN_PROGRESS', 'retry', true);
    if (row.invoiceId !== p.invoiceId || BigInt(row.amountMinor) !== p.amountMinor || row.method !== p.method) {
      throw new HttpError(422, 'IDEMPOTENCY_KEY_REUSED');
    }
    paymentId = row.id; replayed = true;
  } else {
    await outbox(tx, 'hms.payment.recorded', { id: paymentId, invoiceId: p.invoiceId });
  }
  const inv = await tx.query<{ paidMinor: string; status: string }>(
    `SELECT "paidMinor"::text AS "paidMinor","status" FROM "HmsInvoice" WHERE "id"=$1`, [p.invoiceId]);
  return { paymentId, replayed, invoice: inv.rows[0] };
}
