const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@127.0.0.1:5432/orbitox_phase2';
process.env.DATABASE_URL = databaseUrl;
process.env.APP_DATABASE_URL = process.env.APP_DATABASE_URL || 'postgresql://orbitox_runtime:test_runtime_pass@127.0.0.1:5432/orbitox_phase2';
process.env.PLATFORM_AUDIT_DATABASE_URL = process.env.PLATFORM_AUDIT_DATABASE_URL || 'postgresql://orbitox_platform_admin_audit:test_audit_pass@127.0.0.1:5432/orbitox_phase2';
process.env.HMS_AUDIT_DATABASE_URL = process.env.HMS_AUDIT_DATABASE_URL || 'postgresql://hms_audit_reader:test_audit_pass@127.0.0.1:5432/orbitox_phase2';
process.env.OUTBOX_RELAY_DATABASE_URL = process.env.OUTBOX_RELAY_DATABASE_URL || 'postgresql://orbitox_outbox_relay:test_outbox_pass@127.0.0.1:5432/orbitox_phase2';
(process.env as any).NODE_ENV = 'test';
process.env.ORBITOX_SYNC_SAGA = 'true';
process.env.ORBITOX_TEST_STANDALONE = 'true';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { platformRepository } from '@/server/db/platform-repository';
import { operationStore } from '@/server/provisioning/operation-store';
import { provisioningSaga } from '@/server/provisioning/provisioning-saga';
import { PlatformOperationRecord } from '@/server/provisioning/types';
import { prisma } from '@/server/db/prisma';

describe('Phase 3: Distributed Provisioning Lease Correctness, Attempt-Scoped Tokens & Fencing', () => {
  let testOrg: any;
  const createdOpIds: string[] = [];

  before(async () => {
    const runId = crypto.randomBytes(4).toString('hex');
    testOrg = await platformRepository.createOrganization({
      name: `Lease Concurrency Org ${runId}`,
      slug: `lease-conc-org-${runId}`,
      billingEmail: `lease_conc_${runId}@orbitox.io`,
    });
  });

  after(async () => {
    if (createdOpIds.length > 0) {
      await (prisma as any).platformOperation.deleteMany({
        where: { id: { in: createdOpIds } },
      }).catch(() => {});
    }
  });

  it('1. Attempt exclusivity: Attempt B cannot claim while Attempt A holds an unexpired lease (even on same worker base)', async () => {
    const opId = `op_conc_attempt_${crypto.randomBytes(6).toString('hex')}`;
    createdOpIds.push(opId);
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

    const baseWorker = 'worker_node_1';
    const attemptA = `${baseWorker}:attempt_aaa1`;
    const attemptB = `${baseWorker}:attempt_bbb2`;

    // Attempt A claims lease with 30s TTL
    const claimA = await operationStore.claimOperationLease(opId, attemptA, 30);
    assert.strictEqual(claimA, true, 'Attempt A must successfully claim lease');

    // Attempt B (different attemptId on same worker base) tries to claim: must fail
    const claimB = await operationStore.claimOperationLease(opId, attemptB, 30);
    assert.strictEqual(claimB, false, 'Attempt B must NOT be able to claim unexpired lease held by Attempt A');

    const opRecord = await operationStore.getOperation(opId);
    assert.strictEqual(opRecord?.leaseOwner, attemptA);
  });

  it('2. Lease renewal: renewOperationLease succeeds while unexpired, fails if expired or wrong owner', async () => {
    const opId = `op_conc_renew_${crypto.randomBytes(6).toString('hex')}`;
    createdOpIds.push(opId);
    const op: PlatformOperationRecord = {
      id: opId,
      type: 'TENANT_PROVISION',
      tenantId: `org/${testOrg.id}/project/p2/environment/production`,
      organizationId: testOrg.id,
      status: 'PROVISIONING',
      steps: [{ id: '1', name: 'Step 1', status: 'COMPLETED' }],
      request: { name: 'Test 2', slug: 'p2', plugins: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await operationStore.createOperation(op);

    const ownerA = 'worker_node_1:attempt_111';
    const ownerB = 'worker_node_2:attempt_222';

    // Claim lease with 1s short TTL
    const claimed = await operationStore.claimOperationLease(opId, ownerA, 1);
    assert.strictEqual(claimed, true);

    // Wrong owner cannot renew
    const wrongRenew = await operationStore.renewOperationLease(opId, ownerB, 10);
    assert.strictEqual(wrongRenew, false, 'Wrong owner must fail renewOperationLease');

    // Correct owner renews while active
    const correctRenew = await operationStore.renewOperationLease(opId, ownerA, 1);
    assert.strictEqual(correctRenew, true, 'Current owner must succeed renewOperationLease');

    // Wait for lease to expire
    await new Promise((r) => setTimeout(r, 1200));

    // After expiration, renewOperationLease must return false (cannot renew expired lease)
    const expiredRenew = await operationStore.renewOperationLease(opId, ownerA, 10);
    assert.strictEqual(expiredRenew, false, 'Expired lease cannot be renewed via renewOperationLease');

    // But ownerB can now claim the expired lease
    const claimedB = await operationStore.claimOperationLease(opId, ownerB, 30);
    assert.strictEqual(claimedB, true, 'Owner B can claim the expired lease');

    const record = await operationStore.getOperation(opId);
    assert.strictEqual(record?.leaseOwner, ownerB);
  });

  it('3. Fencing token protection: updateOperation rejects updates if leaseOwner mismatch', async () => {
    const opId = `op_conc_fence_${crypto.randomBytes(6).toString('hex')}`;
    createdOpIds.push(opId);
    const op: PlatformOperationRecord = {
      id: opId,
      type: 'TENANT_PROVISION',
      tenantId: `org/${testOrg.id}/project/p3/environment/production`,
      organizationId: testOrg.id,
      status: 'PROVISIONING',
      leaseOwner: 'worker_node_A:attempt_1',
      leaseExpiresAt: new Date(Date.now() + 60000).toISOString(),
      steps: [
        { id: '1', name: 'Step 1', status: 'COMPLETED' },
        { id: '2', name: 'Step 2', status: 'RUNNING' },
      ],
      request: { name: 'Test 3', slug: 'p3', plugins: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await operationStore.createOperation(op);

    // Stale worker (attempt_0) tries to update with expectedLeaseOwner: attempt_0
    await assert.rejects(
      async () => {
        await operationStore.updateOperation(
          opId,
          { steps: [{ id: '1', name: 'Step 1', status: 'COMPLETED' }, { id: '2', name: 'Step 2', status: 'COMPLETED' }] },
          { expectedLeaseOwner: 'worker_node_A:attempt_0' }
        );
      },
      /LEASE_FENCING_ERROR/,
      'Stale attempt update must be rejected with LEASE_FENCING_ERROR'
    );

    // Legitimate owner (attempt_1) succeeds
    const updated = await operationStore.updateOperation(
      opId,
      { steps: [{ id: '1', name: 'Step 1', status: 'COMPLETED' }, { id: '2', name: 'Step 2', status: 'COMPLETED' }] },
      { expectedLeaseOwner: 'worker_node_A:attempt_1' }
    );
    assert.ok(updated);
    assert.strictEqual(updated.steps.find((s) => s.id === '2')?.status, 'COMPLETED');
  });

  it('4. Strict fencing: updateOperation rejects when current leaseOwner is null', async () => {
    const opId = `op_fence_null_${crypto.randomBytes(6).toString('hex')}`;
    createdOpIds.push(opId);
    const op: PlatformOperationRecord = {
      id: opId,
      type: 'TENANT_PROVISION',
      tenantId: `org/${testOrg.id}/project/p_null/environment/production`,
      organizationId: testOrg.id,
      status: 'PROVISIONING',
      leaseOwner: null,
      leaseExpiresAt: null,
      steps: [{ id: '1', name: 'Step 1', status: 'PENDING' }],
      request: { name: 'Test Null', slug: 'p_null', plugins: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await operationStore.createOperation(op);

    await assert.rejects(
      async () => {
        await operationStore.updateOperation(
          opId,
          { status: 'PROVISIONING' },
          { expectedLeaseOwner: 'worker_node_1:att_1' }
        );
      },
      /LEASE_FENCING_ERROR/,
      'Cannot update leased operation when current lease is unowned (null)'
    );
  });

  it('5. Strict fencing: updateOperation rejects when lease has expired even if leaseOwner matches', async () => {
    const opId = `op_fence_exp_${crypto.randomBytes(6).toString('hex')}`;
    createdOpIds.push(opId);
    const owner = 'worker_node_1:att_exp';
    const op: PlatformOperationRecord = {
      id: opId,
      type: 'TENANT_PROVISION',
      tenantId: `org/${testOrg.id}/project/p_exp/environment/production`,
      organizationId: testOrg.id,
      status: 'PROVISIONING',
      leaseOwner: owner,
      leaseExpiresAt: new Date(Date.now() - 5000).toISOString(), // expired 5 seconds ago
      steps: [{ id: '1', name: 'Step 1', status: 'PENDING' }],
      request: { name: 'Test Exp', slug: 'p_exp', plugins: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await operationStore.createOperation(op);

    await assert.rejects(
      async () => {
        await operationStore.updateOperation(
          opId,
          { status: 'PROVISIONING' },
          { expectedLeaseOwner: owner }
        );
      },
      /LEASE_FENCING_ERROR/,
      'Cannot update operation when held lease has expired'
    );
  });

  it('6. Retry flow: retryOperation resumes a PARTIAL operation with single lease acquisition to ACTIVE', async () => {
    const slug = `retry-slug-${crypto.randomBytes(4).toString('hex')}`;
    const opId = `op_retry_${crypto.randomBytes(6).toString('hex')}`;
    createdOpIds.push(opId);
    const op: PlatformOperationRecord = {
      id: opId,
      type: 'TENANT_PROVISION',
      tenantId: `org/${testOrg.id}/project/${slug}/environment/production`,
      organizationId: testOrg.id,
      status: 'PARTIAL',
      leaseOwner: null,
      leaseExpiresAt: null,
      steps: [
        { id: '1', name: 'Validate request', status: 'COMPLETED' },
        { id: '2', name: 'Create project', status: 'COMPLETED' },
        { id: '3', name: 'Seed default tables', status: 'COMPLETED' },
        { id: '4', name: 'Issue management API key', status: 'COMPLETED' },
        { id: '5', name: 'Plugin provisioning', status: 'FAILED', error: 'Network timeout during plugin step' },
        { id: '6', name: 'Initial grant push', status: 'PENDING' },
        { id: '7', name: 'Final tenant activation', status: 'PENDING' },
      ],
      request: { name: `Retry Resto ${slug}`, slug, plugins: [{ id: 'restaurant-os', plan: 'restaurant-starter' }] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await operationStore.createOperation(op);

    // Call retryOperation - must claim lease once and not fail due to double lease acquisition
    const result = await provisioningSaga.retryOperation(opId);
    assert.ok(result, 'retryOperation must return updated operation');
    assert.strictEqual(result.status, 'ACTIVE', 'Operation must reach ACTIVE status after retry');
    const finalStep5 = result.steps.find((s) => s.id === '5');
    assert.strictEqual(finalStep5?.status, 'COMPLETED', 'Step 5 must be COMPLETED');
    const finalStep7 = result.steps.find((s) => s.id === '7');
    assert.strictEqual(finalStep7?.status, 'COMPLETED', 'Step 7 must be COMPLETED');
  });

  it('7. Resume flow: resumeWorkflow recovers an interrupted PROVISIONING operation to ACTIVE', async () => {
    const slug = `resume-slug-${crypto.randomBytes(4).toString('hex')}`;
    const opId = `op_resume_${crypto.randomBytes(6).toString('hex')}`;
    createdOpIds.push(opId);
    const op: PlatformOperationRecord = {
      id: opId,
      type: 'TENANT_PROVISION',
      tenantId: `org/${testOrg.id}/project/${slug}/environment/production`,
      organizationId: testOrg.id,
      status: 'PROVISIONING',
      leaseOwner: 'crashed_worker:attempt_dead',
      leaseExpiresAt: new Date(Date.now() - 10000).toISOString(), // expired lease
      steps: [
        { id: '1', name: 'Validate request', status: 'COMPLETED' },
        { id: '2', name: 'Create project', status: 'COMPLETED' },
        { id: '3', name: 'Seed default tables', status: 'COMPLETED' },
        { id: '4', name: 'Issue management API key', status: 'COMPLETED' },
        { id: '5', name: 'Plugin provisioning', status: 'PENDING' },
        { id: '6', name: 'Initial grant push', status: 'PENDING' },
        { id: '7', name: 'Final tenant activation', status: 'PENDING' },
      ],
      request: { name: `Resume Resto ${slug}`, slug, plugins: [{ id: 'restaurant-os', plan: 'restaurant-starter' }] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await operationStore.createOperation(op);

    const result = await provisioningSaga.resumeWorkflow(opId);
    assert.ok(result, 'resumeWorkflow must return updated operation');
    assert.strictEqual(result.status, 'ACTIVE', 'Interrupted operation must reach ACTIVE status');
  });

  it('8. Competing calls: retryOperation returns null when an active unexpired lease is held by another worker', async () => {
    const slug = `compete-slug-${crypto.randomBytes(4).toString('hex')}`;
    const opId = `op_compete_${crypto.randomBytes(6).toString('hex')}`;
    createdOpIds.push(opId);
    const op: PlatformOperationRecord = {
      id: opId,
      type: 'TENANT_PROVISION',
      tenantId: `org/${testOrg.id}/project/${slug}/environment/production`,
      organizationId: testOrg.id,
      status: 'PROVISIONING',
      leaseOwner: 'competing_live_worker:attempt_live',
      leaseExpiresAt: new Date(Date.now() + 60000).toISOString(), // 60s in future
      steps: [{ id: '1', name: 'Step 1', status: 'RUNNING' }],
      request: { name: `Compete Resto ${slug}`, slug, plugins: [{ id: 'restaurant-os', plan: 'restaurant-starter' }] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await operationStore.createOperation(op);

    const result = await provisioningSaga.retryOperation(opId);
    assert.strictEqual(result, null, 'retryOperation must return null when active unexpired lease is held');
  });
});
