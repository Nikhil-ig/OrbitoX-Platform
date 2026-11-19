const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://apple@127.0.0.1:5432/orbitox_phase2';
process.env.DATABASE_URL = databaseUrl;
(process.env as any).NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { prisma } from '@/server/db/prisma';
import {
  OperationStore,
  DatabasePersistenceError,
} from '@/server/provisioning/operation-store';
import { PlatformOperationRecord } from '@/server/provisioning/types';

describe('P0.2: Fail-Closed Operation Persistence & Distributed Lease Durability', () => {
  const store = new OperationStore();
  let testOrg: any;
  const createdOpIds = new Set<string>();

  before(async () => {
    delete process.env.ORBITOX_PLATFORM_REPOSITORY; // Ensure PostgreSQL mode
    const runId = crypto.randomBytes(4).toString('hex');
    testOrg = await prisma.platformOrganization.create({
      data: {
        name: `Persist Test Org ${runId}`,
        slug: `persist-org-${runId}`,
        billingEmail: `persist_${runId}@orbitox.io`,
      },
    });
  });

  after(async () => {
    try {
      if (createdOpIds.size > 0) {
        await (prisma as any).platformOperation.deleteMany({
          where: { id: { in: Array.from(createdOpIds) } },
        });
      }
      if (testOrg?.id) {
        await (prisma as any).platformOrganization.deleteMany({
          where: { id: testOrg.id },
        });
      }
    } catch (err) {
      console.error('[CLEANUP ERROR]:', err);
    }
  });

  it('1. createOperation writes directly to PostgreSQL database table PlatformOperation', async () => {
    const opId = `op_persist_test_${crypto.randomBytes(6).toString('hex')}`;
    createdOpIds.add(opId);
    const op: PlatformOperationRecord = {
      id: opId,
      type: 'TENANT_PROVISION',
      tenantId: `org/${testOrg.id}/project/p1/environment/production`,
      organizationId: testOrg.id,
      idempotencyKey: `idemp_${opId}`,
      status: 'PROVISIONING',
      steps: [{ id: '1', name: 'Step 1', status: 'COMPLETED' }],
      request: { name: 'Persist Test', slug: 'p1', plugins: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const created = await store.createOperation(op);
    assert.equal(created.id, opId);

    // Verify row exists in real database
    const dbRow = await (prisma as any).platformOperation.findUnique({
      where: { id: opId },
    });
    assert.ok(dbRow, 'Operation must exist in PostgreSQL PlatformOperation table');
    assert.equal(dbRow.id, opId);
    assert.equal(dbRow.status, 'PROVISIONING');
    assert.equal(dbRow.organizationId, testOrg.id);
  });

  it('2. getOperation reads from PostgreSQL and returns accurate record', async () => {
    const opId = Array.from(createdOpIds)[0]!;
    const retrieved = await store.getOperation(opId);
    assert.ok(retrieved);
    assert.equal(retrieved.id, opId);
    assert.equal(retrieved.organizationId, testOrg.id);
  });

  it('3. getOperationByIdempotencyKey finds record in PostgreSQL', async () => {
    const opId = Array.from(createdOpIds)[0]!;
    const retrieved = await store.getOperationByIdempotencyKey(testOrg.id, `idemp_${opId}`);
    assert.ok(retrieved);
    assert.equal(retrieved.id, opId);
  });

  it('4. updateOperation updates record in PostgreSQL database', async () => {
    const opId = Array.from(createdOpIds)[0]!;
    const updated = await store.updateOperation(opId, {
      status: 'PARTIAL',
      error: 'Simulated provisioning partial failure',
    });
    assert.ok(updated);
    assert.equal(updated.status, 'PARTIAL');

    // Verify update persisted to database
    const dbRow = await (prisma as any).platformOperation.findUnique({
      where: { id: opId },
    });
    assert.equal(dbRow.status, 'PARTIAL');
    assert.equal(dbRow.error, 'Simulated provisioning partial failure');
  });

  it('5. claimOperationLease and releaseOperationLease enforce mutual exclusion in PostgreSQL', async () => {
    const opId = `op_lease_test_${crypto.randomBytes(6).toString('hex')}`;
    createdOpIds.add(opId);
    await store.createOperation({
      id: opId,
      type: 'TENANT_PROVISION',
      tenantId: `org/${testOrg.id}/project/p2/environment/production`,
      organizationId: testOrg.id,
      status: 'PROVISIONING',
      steps: [],
      request: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Worker 1 claims lease
    const claim1 = await store.claimOperationLease(opId, 'replica-worker-1', 10);
    assert.equal(claim1, true);

    // Worker 2 cannot claim while held by Worker 1
    const claim2 = await store.claimOperationLease(opId, 'replica-worker-2', 10);
    assert.equal(claim2, false);

    // Heartbeat succeeds for owner
    const hb = await store.heartbeatOperationLease(opId, 'replica-worker-1', 15);
    assert.equal(hb, true);

    // Heartbeat fails for non-owner
    const hbOther = await store.heartbeatOperationLease(opId, 'replica-worker-2', 15);
    assert.equal(hbOther, false);

    // Release lease
    await store.releaseOperationLease(opId, 'replica-worker-1');

    // Worker 2 can now claim the released lease
    const claim2After = await store.claimOperationLease(opId, 'replica-worker-2', 10);
    assert.equal(claim2After, true);
  });

  it('6. fail-closed: database error during createOperation throws DatabasePersistenceError without fallback', async () => {
    const origCreate = (prisma as any).platformOperation.create;
    (prisma as any).platformOperation.create = async () => {
      throw new Error('Connection lost to database cluster');
    };

    try {
      const opId = `op_fail_closed_${crypto.randomBytes(6).toString('hex')}`;
      await assert.rejects(
        async () => {
          await store.createOperation({
            id: opId,
            type: 'TENANT_PROVISION',
            tenantId: 'tenant_test',
            organizationId: testOrg.id,
            status: 'PROVISIONING',
            steps: [],
            request: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        },
        (err: any) => {
          assert.ok(err instanceof DatabasePersistenceError);
          assert.match(err.message, /Connection lost to database cluster/);
          return true;
        }
      );
    } finally {
      (prisma as any).platformOperation.create = origCreate;
    }
  });

  it('7. fail-closed: database error during getOperation throws DatabasePersistenceError', async () => {
    const origFindUnique = (prisma as any).platformOperation.findUnique;
    (prisma as any).platformOperation.findUnique = async () => {
      throw new Error('Database read replica timeout');
    };

    try {
      await assert.rejects(
        async () => {
          await store.getOperation('some_op_id');
        },
        (err: any) => {
          assert.ok(err instanceof DatabasePersistenceError);
          assert.match(err.message, /Database read replica timeout/);
          return true;
        }
      );
    } finally {
      (prisma as any).platformOperation.findUnique = origFindUnique;
    }
  });

  it('8. fail-closed: database error during claimOperationLease throws DatabasePersistenceError', async () => {
    const origQueryRaw = (prisma as any).$queryRaw;
    (prisma as any).$queryRaw = async () => {
      throw new Error('Deadlock detected on distributed lease');
    };

    try {
      await assert.rejects(
        async () => {
          await store.claimOperationLease('some_op_id', 'worker-1');
        },
        (err: any) => {
          assert.ok(err instanceof DatabasePersistenceError);
          assert.match(err.message, /Deadlock detected on distributed lease/);
          return true;
        }
      );
    } finally {
      (prisma as any).$queryRaw = origQueryRaw;
    }
  });
});
