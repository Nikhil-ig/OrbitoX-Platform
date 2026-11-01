import { prisma } from '@/lib/prisma';
import { PlatformOperationRecord, OperationStep } from './types';

// In-memory fallback for JSON / mock test adapter modes
const memoryOperations = new Map<string, PlatformOperationRecord>();

export class OperationStore {
  async createOperation(op: PlatformOperationRecord): Promise<PlatformOperationRecord> {
    memoryOperations.set(op.id, { ...op });

    if (process.env.ORBITOX_PLATFORM_REPOSITORY !== 'json') {
      try {
        await (prisma as any).platformOperation.create({
          data: {
            id: op.id,
            type: op.type,
            tenantId: op.tenantId,
            organizationId: op.organizationId,
            idempotencyKey: op.idempotencyKey,
            status: op.status,
            steps: op.steps as any,
            request: op.request as any,
            result: op.result as any,
            error: op.error,
            operatorId: op.operatorId,
            requestId: op.requestId,
            createdAt: new Date(op.createdAt),
            updatedAt: new Date(op.updatedAt),
            completedAt: op.completedAt ? new Date(op.completedAt) : null,
          },
        });
      } catch (err: any) {
        // If Prisma not connected or table pending migration in test harness, fallback to memory
        console.warn('[OperationStore] DB write fallback to memory:', err?.message || err);
      }
    }

    return op;
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

    return memoryOperations.get(id) || null;
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

    const merged: PlatformOperationRecord = {
      ...existing,
      ...updates,
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
            ...(updates.result !== undefined ? { result: updates.result as any } : {}),
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
