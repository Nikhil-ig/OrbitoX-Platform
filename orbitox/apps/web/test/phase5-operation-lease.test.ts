const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@127.0.0.1:5432/orbitox_phase2';
process.env.DATABASE_URL = databaseUrl;
process.env.APP_DATABASE_URL = process.env.APP_DATABASE_URL || 'postgresql://orbitox_runtime:test_runtime_pass@127.0.0.1:5432/orbitox_phase2';
process.env.PLATFORM_AUDIT_DATABASE_URL = process.env.PLATFORM_AUDIT_DATABASE_URL || 'postgresql://orbitox_platform_admin_audit:test_audit_pass@127.0.0.1:5432/orbitox_phase2';
process.env.HMS_AUDIT_DATABASE_URL = process.env.HMS_AUDIT_DATABASE_URL || 'postgresql://hms_audit_reader:test_audit_pass@127.0.0.1:5432/orbitox_phase2';
process.env.OUTBOX_RELAY_DATABASE_URL = process.env.OUTBOX_RELAY_DATABASE_URL || 'postgresql://orbitox_outbox_relay:test_outbox_pass@127.0.0.1:5432/orbitox_phase2';
(process.env as any).NODE_ENV = 'test';
process.env.ORBITOX_SYNC_SAGA = 'true';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { platformRepository } from '../lib/platform-repository';
import { operationStore } from '../lib/tenant-provisioning/operation-store';
import { provisioningSaga } from '../lib/tenant-provisioning/provisioning-saga';
import { PlatformOperationRecord } from '../lib/tenant-provisioning/types';
import { prisma } from '../lib/prisma';

describe('Phase 5 Fix 1: Distributed Operation Lease & Crash Recovery Concurrency', () => {
  let testOrg: any;

  before(async () => {
    const runId = crypto.randomBytes(4).toString('hex');
    testOrg = await platformRepository.createOrganization({
      name: `Lease Test Org ${runId}`,
      slug: `lease-org-${runId}`,
      billingEmail: `lease_${runId}@orbitox.io`,
    });
  });

  it('claims lease conditionally: exactly one worker wins concurrent claim', async () => {
    const opId = `op_lease_race_${crypto.randomBytes(6).toString('hex')}`;
    const op: PlatformOperationRecord = {
      id: opId,
      type: 'TENANT_PROVISION',
      tenantId: `org/${testOrg.id}/project/p1/environment/production`,
      organizationId: testOrg.id,
      status: 'PROVISIONING',
      steps: [{ id: '1', name: 'Step 1', status: 'COMPLETED' }],
      request: { name: 'Test', slug: 'p1', plugins: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await operationStore.createOperation(op);

    // Two workers attempt to claim the lease at the exact same instant
    const [claimA, claimB] = await Promise.all([
      operationStore.claimOperationLease(opId, 'worker-server-A', 30),
      operationStore.claimOperationLease(opId, 'worker-server-B', 30),
    ]);

    // Exactly one worker must succeed
    assert.strictEqual(
      (claimA ? 1 : 0) + (claimB ? 1 : 0),
      1,
      `Exactly one worker must claim the lease: workerA=${claimA}, workerB=${claimB}`
    );

    const winner = claimA ? 'worker-server-A' : 'worker-server-B';
    const loser = claimA ? 'worker-server-B' : 'worker-server-A';

    const currentOp = await operationStore.getOperation(opId);
    assert.strictEqual(currentOp?.leaseOwner, winner);
    assert.ok(currentOp?.leaseExpiresAt, 'leaseExpiresAt must be populated');
    assert.ok(
      new Date(currentOp.leaseExpiresAt).getTime() > Date.now(),
      'lease must be active in the future'
    );

    // Loser worker cannot re-claim an active lease
    const retryLoser = await operationStore.claimOperationLease(opId, loser, 30);
    assert.strictEqual(retryLoser, false, 'Loser worker must not be able to steal active lease');

    // Winner can heartbeat and renew lease
    const heartbeatResult = await operationStore.heartbeatOperationLease(opId, winner, 30);
    assert.strictEqual(heartbeatResult, true, 'Winner must successfully heartbeat active lease');

    // Winner releases lease
    await operationStore.releaseOperationLease(opId, winner);
    const releasedOp = await operationStore.getOperation(opId);
    assert.strictEqual(releasedOp?.leaseOwner, null);
    assert.strictEqual(releasedOp?.leaseExpiresAt, null);
  });

  it('live operation on server A is not taken by a booting server B', async () => {
    const opId = `op_live_lease_${crypto.randomBytes(6).toString('hex')}`;
    const op: PlatformOperationRecord = {
      id: opId,
      type: 'TENANT_PROVISION',
      tenantId: `org/${testOrg.id}/project/p2/environment/production`,
      organizationId: testOrg.id,
      status: 'PROVISIONING',
      steps: [{ id: '1', name: 'Step 1', status: 'COMPLETED' }],
      request: { name: 'Live Op', slug: 'p2', plugins: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await operationStore.createOperation(op);

    // Server A claims the lease and is actively executing
    const claimedByA = await operationStore.claimOperationLease(opId, 'server-A-live', 30);
    assert.strictEqual(claimedByA, true, 'Server A must claim initial lease');

    // Server B boots and checks for resumable operations
    const resumableOps = await operationStore.listResumableOperations();
    const foundByServerB = resumableOps.some((o) => o.id === opId);
    assert.strictEqual(
      foundByServerB,
      false,
      'Active operation on Server A must NOT appear in Server B resumable list'
    );

    // If Server B directly attempts resumeWorkflow, it must safely reject and return null
    const resumeResult = await provisioningSaga.resumeWorkflow(opId, { workerId: 'server-B-boot' });
    assert.strictEqual(resumeResult, null, 'Resume call must return null when active lease is held by another server');
    const opInDb = await operationStore.getOperation(opId);
    assert.strictEqual(
      opInDb?.leaseOwner,
      'server-A-live',
      'Lease ownership must remain with Server A'
    );

    // Clean up
    await operationStore.releaseOperationLease(opId, 'server-A-live');
  });

  it('two servers booting simultaneously with one stuck expired operation: exactly one resumes it', async () => {
    const opId = `op_expired_lease_${crypto.randomBytes(6).toString('hex')}`;
    const op: PlatformOperationRecord = {
      id: opId,
      type: 'TENANT_PROVISION',
      tenantId: `org/${testOrg.id}/project/p3/environment/production`,
      organizationId: testOrg.id,
      status: 'PROVISIONING',
      leaseOwner: 'crashed-server-dead',
      leaseExpiresAt: new Date(Date.now() - 60000).toISOString(), // Expired 1 min ago
      steps: [
        { id: '1', name: 'Step 1', status: 'COMPLETED' },
        { id: '2', name: 'Step 2', status: 'COMPLETED' },
        { id: '3', name: 'Step 3', status: 'COMPLETED' },
        { id: '4', name: 'Step 4', status: 'COMPLETED' },
        { id: '5', name: 'Step 5', status: 'PENDING' },
        { id: '6', name: 'Step 6', status: 'PENDING' },
        { id: '7', name: 'Step 7', status: 'PENDING' },
      ],
      request: { name: 'Expired Lease Op', slug: 'p3', plugins: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await operationStore.createOperation(op);

    // Both servers list resumable operations
    const resumable = await operationStore.listResumableOperations();
    assert.ok(
      resumable.some((o) => o.id === opId),
      'Expired operation must be recognized as resumable'
    );

    // Both Server 1 and Server 2 attempt to claim the lease simultaneously
    const [server1Claim, server2Claim] = await Promise.all([
      operationStore.claimOperationLease(opId, 'server-instance-1', 30),
      operationStore.claimOperationLease(opId, 'server-instance-2', 30),
    ]);

    assert.strictEqual(
      (server1Claim ? 1 : 0) + (server2Claim ? 1 : 0),
      1,
      `Exactly one booting server must win lease: server1=${server1Claim}, server2=${server2Claim}`
    );

    // Clean up
    const winnerWorker = server1Claim ? 'server-instance-1' : 'server-instance-2';
    await operationStore.releaseOperationLease(opId, winnerWorker);
  });

  it('retry on an operation leased by another live server does not take it over', async () => {
    const opId = `op_retry_held_${crypto.randomBytes(6).toString('hex')}`;
    const op: PlatformOperationRecord = {
      id: opId,
      type: 'TENANT_PROVISION',
      tenantId: `org/${testOrg.id}/project/p-retry/environment/production`,
      organizationId: testOrg.id,
      status: 'PROVISIONING',
      leaseOwner: 'server-live-A',
      leaseExpiresAt: new Date(Date.now() + 60000).toISOString(), // Live lease: expires in 60s
      steps: [
        { id: '1', name: 'Step 1', status: 'COMPLETED' },
        { id: '2', name: 'Step 2', status: 'COMPLETED' },
        { id: '3', name: 'Step 3', status: 'COMPLETED' },
        { id: '4', name: 'Step 4', status: 'COMPLETED' },
        { id: '5', name: 'Step 5', status: 'FAILED', error: 'Transient network failure' },
      ],
      request: { name: 'Retry Lease Op', slug: 'p-retry', plugins: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await operationStore.createOperation(op);

    // Server B attempts to retry the operation while Server A holds the live lease
    const retryResult = await provisioningSaga.retryOperation(opId);
    assert.strictEqual(retryResult, null, 'retryOperation must return null when active lease is held by another worker');

    // Verify DB record: leaseOwner remains server-live-A and step 5 remains FAILED
    const opInDb = await operationStore.getOperation(opId);
    assert.ok(opInDb);
    assert.strictEqual(opInDb.leaseOwner, 'server-live-A', 'Lease owner must not be overwritten');
    assert.strictEqual(opInDb.steps.find((s) => s.id === '5')?.status, 'FAILED', 'Step status must not be modified by unauthorized retry');

    // Clean up
    await operationStore.releaseOperationLease(opId, 'server-live-A');
  });

  after(async () => {
    if (testOrg) {
      await (prisma as any).platformOperation.deleteMany({
        where: { organizationId: testOrg.id },
      }).catch(() => {});
      await (prisma as any).platformOrganization.delete({
        where: { id: testOrg.id },
      }).catch(() => {});
    }
  });
});
