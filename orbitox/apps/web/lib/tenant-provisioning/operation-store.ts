import { prisma } from '@/lib/prisma';
import { PlatformOperationRecord, OperationStep } from './types';

// In-memory fallback for JSON / mock test adapter modes
const memoryOperations = new Map<string, PlatformOperationRecord>();

/**
 * Ephemeral single-use secret store with 15-minute TTL (NEVER stored in DB).
 *
 * NOTE: The in-memory one-time store is strictly per-server instance (process-local state).
 * The primary delivery mechanism is the raw API key secret returned synchronously once
 * in the initial 202 Accepted response. This in-memory store serves only as a short fallback
 * for clients that failed to capture the secret in the initial 202 response.
 */
interface EphemeralSecret {
  secret: string;
  id?: string;
  prefix?: string;
  expiresAt: number;
}

const oneTimeSecretMap = new Map<string, EphemeralSecret>();

export class OneTimeSecretStore {
  setOneTimeSecret(
    operationId: string,
    secret: string,
    metadata: { id?: string; prefix?: string } = {}
  ): void {
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes TTL
    oneTimeSecretMap.set(operationId, {
      secret,
      id: metadata.id,
      prefix: metadata.prefix,
      expiresAt,
    });
  }

  getOneTimeSecret(operationId: string): { secret: string; id?: string; prefix?: string; expiresAt: string } | null {
    const item = oneTimeSecretMap.get(operationId);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      oneTimeSecretMap.delete(operationId);
      return null;
    }
    return {
      secret: item.secret,
      id: item.id,
      prefix: item.prefix,
      expiresAt: new Date(item.expiresAt).toISOString(),
    };
  }

  consumeOneTimeSecret(operationId: string): { secret: string; id?: string; prefix?: string; expiresAt: string } | null {
    const item = this.getOneTimeSecret(operationId);
    if (item) {
      oneTimeSecretMap.delete(operationId);
    }
    return item;
  }

  clear(): void {
    oneTimeSecretMap.clear();
  }
}

export const oneTimeSecretStore = new OneTimeSecretStore();

/**
 * Sanitizes any result payload so raw API key secrets are NEVER persisted to DB or memory.
 */
function sanitizeOperationResult(result: any): any {
  if (!result || typeof result !== 'object') return result;
  const clone = { ...result };
  if (clone.apiKey && typeof clone.apiKey === 'object') {
    const { secret, rawSecret, ...safeKey } = clone.apiKey;
    clone.apiKey = safeKey;
  }
  return clone;
}

function rowToRecord(row: any): PlatformOperationRecord {
  return {
    id: row.id,
    type: row.type,
    tenantId: row.tenantId,
    organizationId: row.organizationId,
    idempotencyKey: row.idempotencyKey,
    status: row.status,
    leaseOwner: row.leaseOwner,
    leaseExpiresAt: row.leaseExpiresAt
      ? (row.leaseExpiresAt instanceof Date ? row.leaseExpiresAt.toISOString() : String(row.leaseExpiresAt))
      : null,
    steps: (typeof row.steps === 'string' ? JSON.parse(row.steps) : row.steps) || [],
    request: (typeof row.request === 'string' ? JSON.parse(row.request) : row.request) || {},
    result: (typeof row.result === 'string' ? JSON.parse(row.result) : row.result) || null,
    error: row.error,
    operatorId: row.operatorId,
    requestId: row.requestId,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    completedAt: row.completedAt
      ? (row.completedAt instanceof Date ? row.completedAt.toISOString() : String(row.completedAt))
      : null,
  };
}

export class OperationStore {
  async createOperation(op: PlatformOperationRecord): Promise<PlatformOperationRecord> {
    const nowIso = new Date().toISOString();
    const sanitizedOp: PlatformOperationRecord = {
      ...op,
      createdAt: op.createdAt || nowIso,
      updatedAt: op.updatedAt || nowIso,
      result: sanitizeOperationResult(op.result),
    };

    memoryOperations.set(sanitizedOp.id, { ...sanitizedOp });

    if (process.env.ORBITOX_PLATFORM_REPOSITORY !== 'json') {
      try {
        await (prisma as any).platformOperation.create({
          data: {
            id: sanitizedOp.id,
            type: sanitizedOp.type || 'TENANT_PROVISION',
            tenantId: sanitizedOp.tenantId,
            organizationId: sanitizedOp.organizationId,
            idempotencyKey: sanitizedOp.idempotencyKey,
            status: sanitizedOp.status,
            leaseOwner: sanitizedOp.leaseOwner || null,
            leaseExpiresAt: sanitizedOp.leaseExpiresAt ? new Date(sanitizedOp.leaseExpiresAt) : null,
            steps: sanitizedOp.steps as any,
            request: sanitizedOp.request as any,
            result: sanitizedOp.result as any,
            error: sanitizedOp.error,
            operatorId: sanitizedOp.operatorId,
            requestId: sanitizedOp.requestId,
            createdAt: new Date(sanitizedOp.createdAt),
            updatedAt: new Date(sanitizedOp.updatedAt),
            completedAt: sanitizedOp.completedAt ? new Date(sanitizedOp.completedAt) : null,
          },
        });
      } catch (err: any) {
        // If Prisma not connected or table pending migration in test harness, fallback to memory
        console.warn('[OperationStore] DB write fallback to memory:', err?.message || err);
      }
    }

    return sanitizedOp;
  }

  async getOperation(id: string): Promise<PlatformOperationRecord | null> {
    if (process.env.ORBITOX_PLATFORM_REPOSITORY !== 'json') {
      try {
        const row = await (prisma as any).platformOperation.findUnique({
          where: { id },
        });
        if (row) {
          return rowToRecord(row);
        }
      } catch (err: any) {
        // fallback to memory
      }
    }

    const mem = memoryOperations.get(id);
    return mem ? JSON.parse(JSON.stringify(mem)) : null;
  }

  async getOperationByIdempotencyKey(
    organizationId: string,
    idempotencyKey: string
  ): Promise<PlatformOperationRecord | null> {
    if (process.env.ORBITOX_PLATFORM_REPOSITORY !== 'json') {
      try {
        const row = await (prisma as any).platformOperation.findFirst({
          where: { organizationId, idempotencyKey },
        });
        if (row) {
          return rowToRecord(row);
        }
      } catch (err: any) {
        // fallback to memory
      }
    }

    for (const op of memoryOperations.values()) {
      if (op.organizationId === organizationId && op.idempotencyKey === idempotencyKey) {
        return op;
      }
    }

    return null;
  }

  async updateOperation(
    id: string,
    updates: Partial<PlatformOperationRecord>
  ): Promise<PlatformOperationRecord | null> {
    const existing = await this.getOperation(id);
    if (!existing) return null;

    const sanitizedResult = updates.result !== undefined ? sanitizeOperationResult(updates.result) : existing.result;

    const merged: PlatformOperationRecord = {
      ...existing,
      ...updates,
      result: sanitizedResult,
      updatedAt: new Date().toISOString(),
      ...(updates.status === 'ACTIVE' || updates.status === 'FAILED' || updates.status === 'PARTIAL' || updates.status === 'CANCELLED'
        ? { completedAt: updates.completedAt || new Date().toISOString() }
        : {}),
    };

    memoryOperations.set(id, merged);

    if (process.env.ORBITOX_PLATFORM_REPOSITORY !== 'json') {
      try {
        await (prisma as any).platformOperation.update({
          where: { id },
          data: {
            ...(updates.status ? { status: updates.status } : {}),
            ...(updates.steps ? { steps: updates.steps as any } : {}),
            ...(updates.result !== undefined ? { result: sanitizedResult as any } : {}),
            ...(updates.error !== undefined ? { error: updates.error } : {}),
            ...(updates.leaseOwner !== undefined ? { leaseOwner: updates.leaseOwner } : {}),
            ...(updates.leaseExpiresAt !== undefined
              ? { leaseExpiresAt: updates.leaseExpiresAt ? new Date(updates.leaseExpiresAt) : null }
              : {}),
            updatedAt: new Date(merged.updatedAt),
            ...(merged.completedAt ? { completedAt: new Date(merged.completedAt) } : {}),
          },
        });
      } catch (err: any) {
        // fallback to memory
      }
    }

    return merged;
  }

  /**
   * Distributed Lease: claims an operation with an atomic conditional update.
   * Only succeeds if leaseExpiresAt is NULL or in the past (lease has expired).
   */
  async claimOperationLease(
    id: string,
    leaseOwner: string,
    ttlSeconds: number = 30
  ): Promise<boolean> {
    if (process.env.ORBITOX_PLATFORM_REPOSITORY !== 'json') {
      try {
        const rows = await (prisma as any).$queryRaw<Array<{ id: string }>>`
          UPDATE "PlatformOperation"
          SET "leaseOwner" = ${leaseOwner},
              "leaseExpiresAt" = NOW() + (${ttlSeconds} * INTERVAL '1 second'),
              "updatedAt" = NOW()
          WHERE "id" = ${id}
            AND ("leaseExpiresAt" IS NULL OR "leaseExpiresAt" < NOW())
          RETURNING id
        `;
        const claimed = Array.isArray(rows) && rows.length > 0;
        if (claimed) {
          const mem = memoryOperations.get(id);
          if (mem) {
            mem.leaseOwner = leaseOwner;
            mem.leaseExpiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
          }
          return true;
        }
        return false;
      } catch (err: any) {
        // Fallback to memory
      }
    }

    const mem = memoryOperations.get(id);
    if (mem) {
      const now = Date.now();
      const expiresAt = mem.leaseExpiresAt ? new Date(mem.leaseExpiresAt).getTime() : 0;
      if (!mem.leaseExpiresAt || expiresAt < now) {
        mem.leaseOwner = leaseOwner;
        mem.leaseExpiresAt = new Date(now + ttlSeconds * 1000).toISOString();
        return true;
      }
      return false;
    }
    return false;
  }

  /**
   * Distributed Lease: heartbeats an existing lease ownership.
   */
  async heartbeatOperationLease(
    id: string,
    leaseOwner: string,
    ttlSeconds: number = 30
  ): Promise<boolean> {
    if (process.env.ORBITOX_PLATFORM_REPOSITORY !== 'json') {
      try {
        const rows = await (prisma as any).$queryRaw<Array<{ id: string }>>`
          UPDATE "PlatformOperation"
          SET "leaseExpiresAt" = NOW() + (${ttlSeconds} * INTERVAL '1 second'),
              "updatedAt" = NOW()
          WHERE "id" = ${id}
            AND "leaseOwner" = ${leaseOwner}
          RETURNING id
        `;
        const renewed = Array.isArray(rows) && rows.length > 0;
        if (renewed) {
          const mem = memoryOperations.get(id);
          if (mem) {
            mem.leaseExpiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
          }
          return true;
        }
        return false;
      } catch (err: any) {
        // Fallback to memory
      }
    }

    const mem = memoryOperations.get(id);
    if (mem && mem.leaseOwner === leaseOwner) {
      mem.leaseExpiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
      return true;
    }
    return false;
  }

  /**
   * Distributed Lease: explicitly releases a held lease.
   */
  async releaseOperationLease(
    id: string,
    leaseOwner: string
  ): Promise<void> {
    if (process.env.ORBITOX_PLATFORM_REPOSITORY !== 'json') {
      try {
        await (prisma as any).$executeRaw`
          UPDATE "PlatformOperation"
          SET "leaseOwner" = NULL,
              "leaseExpiresAt" = NULL,
              "updatedAt" = NOW()
          WHERE "id" = ${id}
            AND "leaseOwner" = ${leaseOwner}
        `;
      } catch {}
    }
    const mem = memoryOperations.get(id);
    if (mem && mem.leaseOwner === leaseOwner) {
      mem.leaseOwner = null;
      mem.leaseExpiresAt = null;
    }
  }

  /**
   * Distributed Lease: lists operations eligible for resumption (status PROVISIONING with expired or null lease).
   */
  async listResumableOperations(): Promise<PlatformOperationRecord[]> {
    if (process.env.ORBITOX_PLATFORM_REPOSITORY !== 'json') {
      try {
        const rows = await (prisma as any).$queryRaw<Array<any>>`
          SELECT * FROM "PlatformOperation"
          WHERE "status" = 'PROVISIONING'
            AND ("leaseExpiresAt" IS NULL OR "leaseExpiresAt" < NOW())
          ORDER BY "createdAt" ASC
        `;
        if (Array.isArray(rows) && rows.length > 0) {
          return rows.map((r: any) => rowToRecord(r));
        }
      } catch {}
    }

    const now = Date.now();
    return Array.from(memoryOperations.values())
      .filter((o) => o.status === 'PROVISIONING' && (!o.leaseExpiresAt || new Date(o.leaseExpiresAt).getTime() < now))
      .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }

  async listOperations(filter?: { organizationId?: string; status?: string }): Promise<PlatformOperationRecord[]> {
    if (process.env.ORBITOX_PLATFORM_REPOSITORY !== 'json') {
      try {
        const where: any = {};
        if (filter?.organizationId) where.organizationId = filter.organizationId;
        if (filter?.status) where.status = filter.status;
        const rows = await (prisma as any).platformOperation.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 50,
        });
        if (rows && rows.length > 0) {
          return rows.map((row: any) => rowToRecord(row));
        }
      } catch (err: any) {
        // fallback to memory
      }
    }

    let items = Array.from(memoryOperations.values());
    if (filter?.organizationId) {
      items = items.filter((o) => o.organizationId === filter.organizationId);
    }
    if (filter?.status) {
      items = items.filter((o) => o.status === filter.status);
    }
    return items.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }
}

export const operationStore = new OperationStore();
