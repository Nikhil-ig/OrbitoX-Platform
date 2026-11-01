import { prisma } from '@/lib/prisma';
import { PlatformOperationRecord, OperationStep } from './types';

// In-memory fallback for JSON / mock test adapter modes
const memoryOperations = new Map<string, PlatformOperationRecord>();

// Ephemeral single-use secret store with 15-minute TTL (NEVER stored in DB)
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

export class OperationStore {
  async createOperation(op: PlatformOperationRecord): Promise<PlatformOperationRecord> {
    const sanitizedOp: PlatformOperationRecord = {
      ...op,
      result: sanitizeOperationResult(op.result),
    };

    memoryOperations.set(sanitizedOp.id, { ...sanitizedOp });

    if (process.env.ORBITOX_PLATFORM_REPOSITORY !== 'json') {
      try {
        await (prisma as any).platformOperation.create({
          data: {
            id: sanitizedOp.id,
            type: sanitizedOp.type,
            tenantId: sanitizedOp.tenantId,
            organizationId: sanitizedOp.organizationId,
            idempotencyKey: sanitizedOp.idempotencyKey,
            status: sanitizedOp.status,
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
          return {
            id: row.id,
            type: row.type,
            tenantId: row.tenantId,
            organizationId: row.organizationId,
            idempotencyKey: row.idempotencyKey,
            status: row.status,
            steps: (row.steps as unknown as OperationStep[]) || [],
            request: (row.request as Record<string, any>) || {},
            result: (row.result as Record<string, any>) || null,
            error: row.error,
            operatorId: row.operatorId,
            requestId: row.requestId,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
            completedAt: row.completedAt ? row.completedAt.toISOString() : null,
          };
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
          return {
            id: row.id,
            type: row.type,
            tenantId: row.tenantId,
            organizationId: row.organizationId,
            idempotencyKey: row.idempotencyKey,
            status: row.status,
            steps: (row.steps as unknown as OperationStep[]) || [],
            request: (row.request as Record<string, any>) || {},
            result: (row.result as Record<string, any>) || null,
            error: row.error,
            operatorId: row.operatorId,
            requestId: row.requestId,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
            completedAt: row.completedAt ? row.completedAt.toISOString() : null,
          };
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
}

export const operationStore = new OperationStore();
