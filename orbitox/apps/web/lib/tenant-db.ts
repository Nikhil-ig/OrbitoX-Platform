/**
 * Tenant-scoped transactions on node-postgres and Prisma.
 *
 * Rules this module enforces:
 *  R1 The tenant is set with set_config(..., is_local => true): it lives exactly as long as the
 *     transaction, so a pooled connection can never leak tenant A into tenant B's request.
 *  R2 Callers get a TenantTx that exposes ONLY query(); they cannot COMMIT/ROLLBACK/SET ROLE
 *     or reset the tenant. Repository functions accept TenantTx, never a Pool or un-scoped client.
 *  R3 Only errors that PostgreSQL guarantees were rolled back (40001 serialization, 40P01 deadlock)
 *     are retried. A failure during COMMIT is surfaced as COMMIT_OUTCOME_UNKNOWN, never retried,
 *     because the transaction may have committed.
 *  R4 statement_timeout / lock_timeout are always bounded so one stuck row cannot pin the pool.
 *  R5 Broken connections are destroyed, not returned to the pool.
 */
import { Prisma, PrismaClient } from '@prisma/client';

if (typeof BigInt !== 'undefined' && !(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    const num = Number(this);
    return Number.isSafeInteger(num) ? num : this.toString();
  };
}

export interface QueryResultRow {
  [column: string]: any;
}

export interface QueryResult<R extends QueryResultRow = any> {
  rows: R[];
  rowCount: number;
}

export interface PoolClient {
  query<R extends QueryResultRow = any>(queryTextOrConfig: string, values?: any[]): Promise<QueryResult<R>>;
  release(err?: Error | boolean): void;
}

export interface Pool {
  connect(): Promise<PoolClient>;
}

export const TENANT_RE = /^org\/[^/]+\/project\/[^/]+\/environment\/[^/]+$/;

export class TenantScopeError extends Error {
  readonly code = 'TENANT_SCOPE_INVALID';
}
export class CommitOutcomeUnknownError extends Error {
  readonly code = 'COMMIT_OUTCOME_UNKNOWN';
  constructor(override readonly cause: unknown) {
    super('connection failed during COMMIT; outcome unknown');
  }
}

declare const BRAND: unique symbol;
export interface TenantTx {
  readonly tenantId: string;
  query<R extends QueryResultRow = any>(text: string, params?: unknown[]): Promise<{ rows: R[]; rowCount: number }>;
  readonly [BRAND]: true;
  readonly prisma?: Prisma.TransactionClient;
}

const FORBIDDEN_SQL = /^\s*(commit|rollback|begin|start\s+transaction|savepoint|release|set\s+role|reset|set\s+session|discard)\b|set_config\s*\(\s*'app\.current_tenant_id'/i;
const RETRYABLE = new Set(['40001', '40P01']);

export interface TenantTxOptions {
  isolation?: 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
  statementTimeoutMs?: number;   // default 10000
  lockTimeoutMs?: number;        // default 5000
  maxRetries?: number;           // default 3 (only for 40001/40P01)
  readOnly?: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function createGuardedPrismaClient(client: Prisma.TransactionClient): Prisma.TransactionClient {
  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === '$executeRawUnsafe' || prop === '$queryRawUnsafe') {
        return function (query: string, ...args: any[]) {
          if (typeof query === 'string' && FORBIDDEN_SQL.test(query)) {
            throw new TenantScopeError('transaction-control statements are not allowed in TenantTx');
          }
          return (target as any)[prop](query, ...args);
        };
      }
      if (prop === '$executeRaw' || prop === '$queryRaw') {
        return function (queryOrStrings: any, ...args: any[]) {
          let sql = '';
          if (Array.isArray(queryOrStrings)) {
            sql = queryOrStrings.join(' ? ');
          } else if (queryOrStrings && typeof queryOrStrings.sql === 'string') {
            sql = queryOrStrings.sql;
          } else if (typeof queryOrStrings === 'string') {
            sql = queryOrStrings;
          }
          if (FORBIDDEN_SQL.test(sql)) {
            throw new TenantScopeError('transaction-control statements are not allowed in TenantTx');
          }
          return (target as any)[prop](queryOrStrings, ...args);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

export async function withTenantTx<T>(
  poolOrPrisma: Pool | PrismaClient,
  tenantId: string,
  fn: (tx: TenantTx) => Promise<T>,
  opts: TenantTxOptions = {}
): Promise<T> {
  if (typeof tenantId !== 'string' || !TENANT_RE.test(tenantId) || tenantId.length > 512) {
    throw new TenantScopeError('invalid tenant id');
  }
  const isolation = opts.isolation ?? 'READ COMMITTED';
  const st = Math.trunc(opts.statementTimeoutMs ?? 10000);
  const lt = Math.trunc(opts.lockTimeoutMs ?? 5000);
  if (!(st > 0 && st <= 60_000 && lt > 0 && lt <= st)) throw new RangeError('invalid timeouts');
  const maxRetries = opts.maxRetries ?? 3;

  // Branch 1: PrismaClient
  if ('$transaction' in poolOrPrisma && typeof poolOrPrisma.$transaction === 'function') {
    const prisma = poolOrPrisma as PrismaClient;
    for (let attempt = 0; ; attempt++) {
      try {
        const isolationLevel: Prisma.TransactionIsolationLevel =
          isolation === 'SERIALIZABLE' ? Prisma.TransactionIsolationLevel.Serializable :
          isolation === 'REPEATABLE READ' ? Prisma.TransactionIsolationLevel.RepeatableRead :
          Prisma.TransactionIsolationLevel.ReadCommitted;

        return await prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true),
                                     set_config('statement_timeout', ${`${st}ms`}, true),
                                     set_config('lock_timeout', ${`${lt}ms`}, true)`;

          const guardedPrisma = createGuardedPrismaClient(tx);
          const tenantTx: TenantTx = {
            tenantId,
            prisma: guardedPrisma,
            async query(text, params) {
              if (FORBIDDEN_SQL.test(text)) throw new TenantScopeError('transaction-control statements are not allowed in TenantTx');
              if (/^\s*(insert|update|delete)\b/i.test(text) && !/returning/i.test(text)) {
                const count = await tx.$executeRawUnsafe(text, ...(params || []));
                return { rows: [], rowCount: count };
              } else {
                const rows = await tx.$queryRawUnsafe<any[]>(text, ...(params || []));
                return { rows: Array.isArray(rows) ? rows : [], rowCount: Array.isArray(rows) ? rows.length : 0 };
              }
            },
          } as TenantTx;

          return await fn(tenantTx);
        }, { isolationLevel, timeout: 10_000, maxWait: 5_000 });
      } catch (e: any) {
        const code = e?.code || e?.meta?.code;
        if (RETRYABLE.has(code) && attempt < maxRetries) {
          await sleep(Math.min(200, 10 * 2 ** attempt) + Math.random() * 25);
          continue;
        }
        if (e?.code === 'P2028' || e?.message?.includes('Transaction already closed')) {
          throw new CommitOutcomeUnknownError(e);
        }
        throw e;
      }
    }
  }

  // Branch 2: node-postgres Pool
  const pool = poolOrPrisma as Pool;
  for (let attempt = 0; ; attempt++) {
    const client: PoolClient = await pool.connect();
    let broken: Error | undefined;
    let inTx = false;
    let released = false;
    const release = () => { if (!released) { released = true; client.release(broken); } };
    try {
      await client.query(`BEGIN ISOLATION LEVEL ${isolation}${opts.readOnly ? ' READ ONLY' : ''}`);
      inTx = true;
      await client.query(`SELECT set_config('app.current_tenant_id', $1, true),
                                 set_config('statement_timeout', $2, true),
                                 set_config('lock_timeout', $3, true)`, [tenantId, `${st}ms`, `${lt}ms`]);
      const tx: TenantTx = {
        tenantId,
        async query(text, params) {
          if (FORBIDDEN_SQL.test(text)) throw new TenantScopeError('transaction-control statements are not allowed in TenantTx');
          const r = await client.query(text, params as any[]);
          return { rows: r.rows, rowCount: r.rowCount ?? 0 };
        },
      } as TenantTx;
      const result = await fn(tx);
      try {
        await client.query('COMMIT');
      } catch (e: any) {
        inTx = false;
        // A server-side COMMIT error with a SQLSTATE (e.g. deferred constraint, 40001) means rolled back.
        if (e?.code) throw e;
        broken = e;
        throw new CommitOutcomeUnknownError(e);
      }
      inTx = false;
      return result;
    } catch (e: any) {
      if (inTx) {
        try { await client.query('ROLLBACK'); } catch (re: any) { broken = re; }
      }
      if (RETRYABLE.has(e?.code) && attempt < maxRetries) {
        release();
        await sleep(Math.min(200, 10 * 2 ** attempt) + Math.random() * 25);   // jittered backoff
        continue;
      }
      if (!e?.code && !(e instanceof CommitOutcomeUnknownError) && !(e instanceof TenantScopeError) && e?.message?.match(/Connection terminated|ECONNRESET|socket/i)) {
        broken = e;
      }
      throw e;
    } finally {
      // release(err) destroys the connection instead of returning it to the pool
      release();
    }
  }
}
