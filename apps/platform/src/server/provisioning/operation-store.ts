import 'server-only';
import { prisma } from '@/server/db/prisma';
import { PlatformOperationRecord, OperationStep } from '@/server/provisioning/types';

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

export class DatabasePersistenceError extends Error {
  constructor(operation: string, cause?: any) {
    super(`Database persistence failed during ${operation}: ${cause?.message || cause}`);
    this.name = 'DatabasePersistenceError';
  }
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

    if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'json') {
      memoryOperations.set(sanitizedOp.id, { ...sanitizedOp });
      return sanitizedOp;
    }

    try {
      const row = await (prisma as any).platformOperation.create({
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
      return rowToRecord(row);
    } catch (err: any) {
      console.error('[OperationStore] createOperation DB write failed (fail-closed):', err?.message || err);
      throw new DatabasePersistenceError('createOperation', err);
    }
  }

  async getOperation(id: string): Promise<PlatformOperationRecord | null> {
    if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'json') {
      const mem = memoryOperations.get(id);
      return mem ? JSON.parse(JSON.stringify(mem)) : null;
    }

    try {
      const row = await (prisma as any).platformOperation.findUnique({
        where: { id },
      });
      return row ? rowToRecord(row) : null;
    } catch (err: any) {
      console.error('[OperationStore] getOperation DB query failed (fail-closed):', err?.message || err);
      throw new DatabasePersistenceError('getOperation', err);
    }
  }

  async getOperationByIdempotencyKey(
    organizationId: string,
    idempotencyKey: string
  ): Promise<PlatformOperationRecord | null> {
    if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'json') {
      for (const op of memoryOperations.values()) {
        if (op.organizationId === organizationId && op.idempotencyKey === idempotencyKey) {
          return JSON.parse(JSON.stringify(op));
        }
      }
      return null;
    }

    try {
      const row = await (prisma as any).platformOperation.findFirst({
        where: { organizationId, idempotencyKey },
      });
      return row ? rowToRecord(row) : null;
    } catch (err: any) {
      console.error('[OperationStore] getOperationByIdempotencyKey DB query failed (fail-closed):', err?.message || err);
      throw new DatabasePersistenceError('getOperationByIdempotencyKey', err);
    }
  }

  async updateOperation(
    id: string,
    updates: Partial<PlatformOperationRecord>,
    options: { expectedLeaseOwner?: string } = {}
  ): Promise<PlatformOperationRecord | null> {
    if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'json') {
      const existing = memoryOperations.get(id);
      if (!existing) return null;

      if (existing.status === 'CANCELLED' && updates.status !== 'CANCELLED') {
        throw new Error(
          `OPERATION_CANCELLED: Operation ${id} is cancelled and cannot be updated.`
        );
      }

      if (options.expectedLeaseOwner) {
        const now = Date.now();
        const expiresAt = existing.leaseExpiresAt ? new Date(existing.leaseExpiresAt).getTime() : 0;
        if (existing.leaseOwner !== options.expectedLeaseOwner || expiresAt < now) {
          throw new Error(
            `LEASE_FENCING_ERROR: Operation lease fencing failed for owner ${options.expectedLeaseOwner}. Current leaseOwner=${existing.leaseOwner}, expiresAt=${existing.leaseExpiresAt}`
          );
        }
      }

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
      return merged;
    }

    const existing = await this.getOperation(id);
    if (!existing) return null;

    if (existing.status === 'CANCELLED' && updates.status !== 'CANCELLED') {
      throw new Error(
        `OPERATION_CANCELLED: Operation ${id} is cancelled and cannot be updated.`
      );
    }

    if (options.expectedLeaseOwner) {
      const now = Date.now();
      const expiresAt = existing.leaseExpiresAt ? new Date(existing.leaseExpiresAt).getTime() : 0;
      if (existing.leaseOwner !== options.expectedLeaseOwner || expiresAt < now) {
        throw new Error(
          `LEASE_FENCING_ERROR: Operation lease owner mismatch. Expected ${options.expectedLeaseOwner}, got ${existing.leaseOwner} (expiresAt=${existing.leaseExpiresAt})`
        );
      }
    }

    const sanitizedResult = updates.result !== undefined ? sanitizeOperationResult(updates.result) : existing.result;
    const nowIso = new Date().toISOString();
    const completedAtIso = (updates.status === 'ACTIVE' || updates.status === 'FAILED' || updates.status === 'PARTIAL' || updates.status === 'CANCELLED')
      ? (updates.completedAt || nowIso)
      : undefined;

    try {
      const whereClause: any = { id };
      if (updates.status !== 'CANCELLED') {
        whereClause.status = { not: 'CANCELLED' };
      }
      if (options.expectedLeaseOwner) {
        whereClause.leaseOwner = options.expectedLeaseOwner;
        whereClause.leaseExpiresAt = { gte: new Date() };
      }

      const updateResult = await (prisma as any).platformOperation.updateMany({
        where: whereClause,
        data: {
          ...(updates.status ? { status: updates.status } : {}),
          ...(updates.steps ? { steps: updates.steps as any } : {}),
          ...(updates.result !== undefined ? { result: sanitizedResult as any } : {}),
          ...(updates.error !== undefined ? { error: updates.error } : {}),
          ...(updates.leaseOwner !== undefined ? { leaseOwner: updates.leaseOwner } : {}),
          ...(updates.leaseExpiresAt !== undefined
            ? { leaseExpiresAt: updates.leaseExpiresAt ? new Date(updates.leaseExpiresAt) : null }
            : {}),
          updatedAt: new Date(nowIso),
          ...(completedAtIso ? { completedAt: new Date(completedAtIso) } : {}),
        },
      });

      if (updateResult.count === 0) {
        const current = await this.getOperation(id);
        if (current?.status === 'CANCELLED') {
          throw new Error(`OPERATION_CANCELLED: Operation ${id} is cancelled.`);
        }
        if (options.expectedLeaseOwner) {
          throw new Error(
            `LEASE_FENCING_ERROR: Operation lease fencing failed for owner ${options.expectedLeaseOwner}. Current leaseOwner=${current?.leaseOwner}, expiresAt=${current?.leaseExpiresAt}`
          );
        }
      }

      const row = await (prisma as any).platformOperation.findUnique({ where: { id } });
      return row ? rowToRecord(row) : null;
    } catch (err: any) {
      if (err.message?.includes('LEASE_FENCING_ERROR') || err.message?.includes('OPERATION_CANCELLED')) throw err;
      console.error('[OperationStore] updateOperation DB write failed (fail-closed):', err?.message || err);
      throw new DatabasePersistenceError('updateOperation', err);
    }
  }

  /**
   * Fenced Step 7: Atomically verifies active unexpired lease owner and non-cancelled status,
   * activates project, writes outbox message, and marks operation ACTIVE in a single transaction.
   */
  async finalizeProjectActivationAndOutbox(input: {
    operationId: string;
    expectedLeaseOwner: string;
    projectId: string;
    tenantId: string;
    organizationId: string;
    cleanSlug: string;
    environmentSlug: string;
    plugins: { id: string; plan: string }[];
    operatorId?: string;
    requestId?: string;
    steps: OperationStep[];
    apiKey?: {
      id?: string;
      prefix?: string;
      masked?: string;
      environmentId?: string;
    };
  }): Promise<{ webhookPayload: Record<string, any> }> {
    const webhookPayload = {
      operationId: input.operationId,
      tenantId: input.tenantId,
      organizationId: input.organizationId,
      slug: input.cleanSlug,
      environment: input.environmentSlug,
      status: 'ACTIVE',
      plugins: input.plugins.map((p) => ({
        id: p.id,
        plan: p.plan,
        status: 'ACTIVE',
      })),
    };

    if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'json') {
      const existing = memoryOperations.get(input.operationId);
      if (!existing) {
        throw new Error(`LEASE_FENCING_ERROR: Operation ${input.operationId} not found`);
      }
      if (existing.status === 'CANCELLED') {
        throw new Error(`OPERATION_CANCELLED: Operation ${input.operationId} was cancelled.`);
      }
      const now = Date.now();
      const expiresAt = existing.leaseExpiresAt ? new Date(existing.leaseExpiresAt).getTime() : 0;
      if (existing.leaseOwner !== input.expectedLeaseOwner || expiresAt < now) {
        throw new Error(
          `LEASE_FENCING_ERROR: Lease owner mismatch or expired. Expected ${input.expectedLeaseOwner}, got ${existing.leaseOwner} (expiresAt=${existing.leaseExpiresAt})`
        );
      }

      existing.status = 'ACTIVE';
      existing.steps = input.steps;
      existing.result = {
        tenantId: input.tenantId,
        organizationId: input.organizationId,
        slug: input.cleanSlug,
        status: 'ACTIVE',
        plugins: input.plugins.map((p) => ({
          id: p.id,
          plan: p.plan,
          status: 'ACTIVE',
        })),
        apiKey: input.apiKey,
      };
      existing.updatedAt = new Date().toISOString();
      existing.completedAt = new Date().toISOString();
      memoryOperations.set(input.operationId, existing);
      return { webhookPayload };
    }

    try {
      await (prisma as any).$transaction(async (tx: any) => {
        const op = await tx.platformOperation.findUnique({
          where: { id: input.operationId },
        });
        if (!op) {
          throw new Error(`LEASE_FENCING_ERROR: Operation ${input.operationId} not found`);
        }
        if (op.status === 'CANCELLED') {
          throw new Error(`OPERATION_CANCELLED: Operation ${input.operationId} was cancelled.`);
        }
        const now = new Date();
        if (
          op.leaseOwner !== input.expectedLeaseOwner ||
          !op.leaseExpiresAt ||
          new Date(op.leaseExpiresAt).getTime() < now.getTime()
        ) {
          throw new Error(
            `LEASE_FENCING_ERROR: Lease owner mismatch or expired. Expected ${input.expectedLeaseOwner}, got ${op.leaseOwner} (expiresAt=${op.leaseExpiresAt})`
          );
        }

        // 1. Activate project
        if (input.projectId) {
          await tx.platformProject.update({
            where: { id: input.projectId },
            data: { status: 'ACTIVE' },
          });
        }

        // 2. Insert outbox message
        await tx.platformOutboxMessage.create({
          data: {
            tenantId: input.tenantId,
            eventType: 'tenant.ready',
            aggregateType: 'TENANT',
            aggregateId: input.tenantId,
            payload: webhookPayload,
            status: 'PENDING',
          },
        });

        // 3. Mark operation ACTIVE
        await tx.platformOperation.update({
          where: { id: input.operationId },
          data: {
            status: 'ACTIVE',
            steps: input.steps as any,
            result: {
              tenantId: input.tenantId,
              organizationId: input.organizationId,
              slug: input.cleanSlug,
              status: 'ACTIVE',
              plugins: input.plugins.map((p) => ({
                id: p.id,
                plan: p.plan,
                status: 'ACTIVE',
              })),
              apiKey: input.apiKey,
            } as any,
            updatedAt: now,
            completedAt: now,
          },
        });
      });

      return { webhookPayload };
    } catch (err: any) {
      if (err.message?.includes('LEASE_FENCING_ERROR') || err.message?.includes('OPERATION_CANCELLED')) {
        throw err;
      }
      console.error('[OperationStore] finalizeProjectActivationAndOutbox failed (fail-closed):', err?.message || err);
      throw new DatabasePersistenceError('finalizeProjectActivationAndOutbox', err);
    }
  }

  /**
   * Distributed Lease: claims an operation with an atomic conditional update.
   * Only succeeds if leaseExpiresAt is NULL or in the past (lease has expired).
   */
  async claimOperationLease(
    id: string,
    leaseOwner: string,
    ttlSeconds?: number,
    options: { force?: boolean } = {}
  ): Promise<boolean> {
    const isForce = Boolean(options.force);
    const effectiveTtl = ttlSeconds ?? (
      process.env.OPERATION_LEASE_TTL_SECONDS
        ? Number(process.env.OPERATION_LEASE_TTL_SECONDS)
        : (process.env.NODE_ENV === 'test' ? 2 : 30)
    );

    if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'json') {
      const mem = memoryOperations.get(id);
      if (mem) {
        const now = Date.now();
        const expiresAt = mem.leaseExpiresAt ? new Date(mem.leaseExpiresAt).getTime() : 0;
        if (isForce || !mem.leaseExpiresAt || expiresAt < now) {
          mem.leaseOwner = leaseOwner;
          mem.leaseExpiresAt = new Date(now + effectiveTtl * 1000).toISOString();
          return true;
        }
        return false;
      }
      return false;
    }

    try {
      const rows = await (prisma as any).$queryRaw<Array<{ id: string }>>`
        UPDATE "PlatformOperation"
        SET "leaseOwner" = ${leaseOwner},
            "leaseExpiresAt" = NOW() + (${effectiveTtl} * INTERVAL '1 second'),
            "updatedAt" = NOW()
        WHERE "id" = ${id}
          AND (${isForce} = true OR "leaseExpiresAt" IS NULL OR "leaseExpiresAt" < NOW())
        RETURNING id
      `;
      return Array.isArray(rows) && rows.length > 0;
    } catch (err: any) {
      console.error('[OperationStore] claimOperationLease DB update failed (fail-closed):', err?.message || err);
      throw new DatabasePersistenceError('claimOperationLease', err);
    }
  }

  /**
   * Distributed Lease: renews an unexpired lease ownership.
   * Fails if lease has expired or owner does not match.
   */
  async renewOperationLease(
    id: string,
    leaseOwner: string,
    ttlSeconds?: number
  ): Promise<boolean> {
    const effectiveTtl = ttlSeconds ?? (
      process.env.OPERATION_LEASE_TTL_SECONDS
        ? Number(process.env.OPERATION_LEASE_TTL_SECONDS)
        : (process.env.NODE_ENV === 'test' ? 2 : 30)
    );

    if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'json') {
      const mem = memoryOperations.get(id);
      if (mem && mem.leaseOwner === leaseOwner) {
        const now = Date.now();
        const expiresAt = mem.leaseExpiresAt ? new Date(mem.leaseExpiresAt).getTime() : 0;
        if (expiresAt >= now) {
          mem.leaseExpiresAt = new Date(now + effectiveTtl * 1000).toISOString();
          return true;
        }
      }
      return false;
    }

    try {
      const rows = await (prisma as any).$queryRaw<Array<{ id: string }>>`
        UPDATE "PlatformOperation"
        SET "leaseExpiresAt" = NOW() + (${effectiveTtl} * INTERVAL '1 second'),
            "updatedAt" = NOW()
        WHERE "id" = ${id}
          AND "leaseOwner" = ${leaseOwner}
          AND "leaseExpiresAt" >= NOW()
        RETURNING id
      `;
      return Array.isArray(rows) && rows.length > 0;
    } catch (err: any) {
      console.error('[OperationStore] renewOperationLease DB update failed (fail-closed):', err?.message || err);
      throw new DatabasePersistenceError('renewOperationLease', err);
    }
  }

  /**
   * Distributed Lease: heartbeats an existing lease ownership.
   */
  async heartbeatOperationLease(
    id: string,
    leaseOwner: string,
    ttlSeconds?: number
  ): Promise<boolean> {
    return this.renewOperationLease(id, leaseOwner, ttlSeconds);
  }

  /**
   * Distributed Lease: explicitly releases a held lease.
   */
  async releaseOperationLease(
    id: string,
    leaseOwner: string
  ): Promise<void> {
    if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'json') {
      const mem = memoryOperations.get(id);
      if (mem && mem.leaseOwner === leaseOwner) {
        mem.leaseOwner = null;
        mem.leaseExpiresAt = null;
      }
      return;
    }

    try {
      await (prisma as any).$executeRaw`
        UPDATE "PlatformOperation"
        SET "leaseOwner" = NULL,
            "leaseExpiresAt" = NULL,
            "updatedAt" = NOW()
        WHERE "id" = ${id}
          AND "leaseOwner" = ${leaseOwner}
      `;
    } catch (err: any) {
      console.error('[OperationStore] releaseOperationLease DB update failed (fail-closed):', err?.message || err);
      throw new DatabasePersistenceError('releaseOperationLease', err);
    }
  }

  /**
   * Distributed Lease: lists operations eligible for resumption (status PROVISIONING with expired or null lease).
   */
  async listResumableOperations(): Promise<PlatformOperationRecord[]> {
    if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'json') {
      const now = Date.now();
      return Array.from(memoryOperations.values())
        .filter((o) => o.status === 'PROVISIONING' && (!o.leaseExpiresAt || new Date(o.leaseExpiresAt).getTime() < now))
        .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    }

    try {
      const rows = await (prisma as any).$queryRaw<Array<any>>`
        SELECT * FROM "PlatformOperation"
        WHERE "status" = 'PROVISIONING'
          AND ("leaseExpiresAt" IS NULL OR "leaseExpiresAt" < NOW())
        ORDER BY "createdAt" ASC
      `;
      return Array.isArray(rows) ? rows.map((r: any) => rowToRecord(r)) : [];
    } catch (err: any) {
      console.error('[OperationStore] listResumableOperations DB query failed (fail-closed):', err?.message || err);
      throw new DatabasePersistenceError('listResumableOperations', err);
    }
  }

  async listOperations(filter?: { organizationId?: string; status?: string }): Promise<PlatformOperationRecord[]> {
    if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'json') {
      let items = Array.from(memoryOperations.values());
      if (filter?.organizationId) {
        items = items.filter((o) => o.organizationId === filter.organizationId);
      }
      if (filter?.status) {
        items = items.filter((o) => o.status === filter.status);
      }
      return items.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    }

    try {
      const where: any = {};
      if (filter?.organizationId) where.organizationId = filter.organizationId;
      if (filter?.status) where.status = filter.status;
      const rows = await (prisma as any).platformOperation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return rows ? rows.map((row: any) => rowToRecord(row)) : [];
    } catch (err: any) {
      console.error('[OperationStore] listOperations DB query failed (fail-closed):', err?.message || err);
      throw new DatabasePersistenceError('listOperations', err);
    }
  }
}

export const operationStore = new OperationStore();
