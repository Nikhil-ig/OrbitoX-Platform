/**
 * Durable idempotency inside the SAME transaction as the mutation.
 *
 * Concurrency: two identical requests race on the (tenantId, scope, key) primary key.
 * The loser's INSERT ... ON CONFLICT waits for the winner's transaction; if the winner commits,
 * the loser sees the stored response; if the winner rolls back, the loser proceeds normally.
 * So "in progress" is never observed in practice; it is handled defensively anyway.
 */
import crypto from 'node:crypto';
import type { TenantTx } from './tenant-db';
import { HttpError } from './db-errors';

const KEY_RE = /^[A-Za-z0-9_.:-]{8,128}$/;

/** Deterministic JSON: sorted keys, rejects values JSON cannot represent faithfully. */
export function canonicalJson(value: unknown): string {
  const walk = (v: unknown): unknown => {
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return v;
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) throw new HttpError(422, 'INVALID_INPUT', 'non-finite number');
      return v;
    }
    if (typeof v === 'bigint') return v.toString();
    if (Array.isArray(v)) return v.map(walk);
    if (typeof v === 'object') {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(v as object).sort()) {
        const x = (v as any)[k];
        if (x !== undefined) out[k] = walk(x);
      }
      return out;
    }
    throw new HttpError(422, 'INVALID_INPUT', `unsupported type ${typeof v}`);
  };
  return JSON.stringify(walk(value));
}

export interface IdempotentResult<T> { status: number; body: T; replayed: boolean; }

export async function idempotent<T>(
  tx: TenantTx,
  scope: string,
  key: string | null | undefined,
  requestBody: unknown,
  run: () => Promise<{ status: number; body: T }>,
): Promise<IdempotentResult<T>> {
  if (!key) throw new HttpError(400, 'IDEMPOTENCY_KEY_REQUIRED');
  if (!KEY_RE.test(key)) throw new HttpError(400, 'IDEMPOTENCY_KEY_INVALID');
  if (!/^[a-z]+(\.[a-z_]+)+$/.test(scope)) throw new Error(`invalid idempotency scope ${scope}`);
  const requestHash = crypto.createHash('sha256').update(canonicalJson(requestBody)).digest('hex');

  const inserted = await tx.query<{ key: string }>(
    `INSERT INTO "TenantIdempotencyKey" ("scope","key","requestHash") VALUES ($1,$2,$3)
     ON CONFLICT ("tenantId","scope","key") DO NOTHING RETURNING "key"`,
    [scope, key, requestHash],
  );
  if (inserted.rowCount === 0) {
    const { rows } = await tx.query<{ requestHash: string; responseStatus: number | null; responseBody: T }>(
      `SELECT "requestHash","responseStatus","responseBody" FROM "TenantIdempotencyKey" WHERE "scope"=$1 AND "key"=$2`,
      [scope, key],
    );
    const row = rows[0];
    if (!row) throw new HttpError(409, 'IDEMPOTENCY_IN_PROGRESS', 'idempotency row vanished', true);
    if (row.requestHash !== requestHash) throw new HttpError(422, 'IDEMPOTENCY_KEY_REUSED');
    if (row.responseStatus == null) throw new HttpError(409, 'IDEMPOTENCY_IN_PROGRESS', 'in progress', true);
    return { status: row.responseStatus, body: row.responseBody, replayed: true };
  }
  const result = await run();
  if (result.status >= 500) {
    // Do not memoise server failures: throw so the whole transaction (incl. the key) rolls back.
    throw new HttpError(result.status, 'UPSTREAM_FAILURE');
  }
  await tx.query(
    `UPDATE "TenantIdempotencyKey" SET "responseStatus"=$3, "responseBody"=$4::jsonb WHERE "scope"=$1 AND "key"=$2`,
    [scope, key, result.status, canonicalJson(result.body)],
  );
  return { ...result, replayed: false };
}
