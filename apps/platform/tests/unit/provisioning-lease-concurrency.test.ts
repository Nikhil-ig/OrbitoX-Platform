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
import { pluginLifecycleClient } from '@/server/provisioning/plugin-lifecycle-client';
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

  it('9. Lease stealing / fence during async steps: lost lease aborts execution and protects subsequent writes', async () => {
    const slug = `steal-slug-${crypto.randomBytes(4).toString('hex')}`;
    const opId = `op_steal_${crypto.randomBytes(6).toString('hex')}`;
    createdOpIds.push(opId);

    const worker1 = 'worker_node_1:att_1';
    const worker2 = 'worker_node_2:att_2';

    const op: PlatformOperationRecord = {
      id: opId,
      type: 'TENANT_PROVISION',
      tenantId: `org/${testOrg.id}/project/${slug}/environment/production`,
      organizationId: testOrg.id,
      status: 'PROVISIONING',
      leaseOwner: worker1,
      leaseExpiresAt: new Date(Date.now() + 5000).toISOString(),
      steps: [
        { id: '1', name: 'Step 1', status: 'COMPLETED' },
        { id: '2', name: 'Step 2', status: 'COMPLETED' },
        { id: '3', name: 'Step 3', status: 'COMPLETED' },
        { id: '4', name: 'Step 4', status: 'COMPLETED' },
        { id: '5', name: 'Plugin provisioning', status: 'PENDING' },
        { id: '6', name: 'Initial grant push', status: 'PENDING' },
        { id: '7', name: 'Final tenant activation', status: 'PENDING' },
      ],
      request: { name: `Steal Resto ${slug}`, slug, plugins: [{ id: 'restaurant-os', plan: 'restaurant-starter' }] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await operationStore.createOperation(op);

    // Set a delay on step 5 so we can steal the lease concurrently
    process.env.TEST_STEP5_DELAY_MS = '600';

    const asyncExecPromise = provisioningSaga.executeAsyncSteps(
      opId,
      {
        name: `Steal Resto ${slug}`,
        slug,
        organizationId: testOrg.id,
        environment: 'production',
        plugins: [{ id: 'restaurant-os', plan: 'restaurant-starter', planTier: 'STARTER', runtimeUrl: 'http://localhost:3000' } as any],
      },
      op.tenantId,
      testOrg,
      slug,
      'production',
      { workerId: worker1 }
    );

    // Wait 150ms for worker 1 to enter step 5
    await new Promise((r) => setTimeout(r, 150));

    // Force expire worker 1's lease and let worker 2 claim it
    await operationStore.updateOperation(opId, {
      leaseExpiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    const stolen = await operationStore.claimOperationLease(opId, worker2, 30);
    assert.strictEqual(stolen, true, 'Worker 2 must successfully claim expired lease');

    // Wait for worker 1's async step execution to finish
    await asyncExecPromise;
    delete process.env.TEST_STEP5_DELAY_MS;

    // Worker 1 must NOT have marked the operation ACTIVE or overwritten worker 2 as leaseOwner
    const finalOp = await operationStore.getOperation(opId);
    assert.strictEqual(finalOp?.leaseOwner, worker2, 'Worker 2 must remain the lease owner');
    assert.notStrictEqual(finalOp?.status, 'ACTIVE', 'Worker 1 must not have marked operation ACTIVE after lease was lost');
  });

  it('10. Lifecycle client: immediately aborts on pre-aborted signal', async () => {
    const ac = new AbortController();
    ac.abort();

    const res = await pluginLifecycleClient.invokeLifecycle(
      'restaurant-os',
      'provision',
      'org/test/project/p1/environment/production',
      { name: 'Test' },
      { signal: ac.signal }
    );

    assert.strictEqual(res.ok, false);
    assert.match(res.error || '', /aborted/i);
  });

  it('11. Late worker cannot restore CANCELLED operation to ACTIVE', async () => {
    const slug = `cancel-slug-${crypto.randomBytes(4).toString('hex')}`;
    const opId = `op_cancel_${crypto.randomBytes(6).toString('hex')}`;
    createdOpIds.push(opId);
    const worker = 'worker_node_1:att_1';

    const op: PlatformOperationRecord = {
      id: opId,
      type: 'TENANT_PROVISION',
      tenantId: `org/${testOrg.id}/project/${slug}/environment/production`,
      organizationId: testOrg.id,
      status: 'CANCELLED',
      leaseOwner: null,
      leaseExpiresAt: null,
      steps: [{ id: '1', name: 'Step 1', status: 'COMPLETED' }],
      request: { name: `Cancel Resto ${slug}`, slug, plugins: [{ id: 'restaurant-os', plan: 'restaurant-starter' }] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await operationStore.createOperation(op);

    // Stale worker attempts to update status to ACTIVE
    await assert.rejects(
      async () => {
        await operationStore.updateOperation(
          opId,
          { status: 'ACTIVE' },
          { expectedLeaseOwner: worker }
        );
      },
      /OPERATION_CANCELLED/,
      'Must reject update on CANCELLED operation'
    );

    const record = await operationStore.getOperation(opId);
    assert.strictEqual(record?.status, 'CANCELLED');
  });

  it('12. In-flight cancellation: aborts active worker via AbortController and compensates succeeded plugins', async () => {
    const slug = `cancel-inflight-${crypto.randomBytes(4).toString('hex')}`;
    const opId = `op_inflight_${crypto.randomBytes(6).toString('hex')}`;
    createdOpIds.push(opId);

    // Start a mock HTTP server that hangs the response to /orbitox/lifecycle/provision
    const http = await import('node:http');
    let requestReceived = false;

    const server = http.createServer((req, res) => {
      requestReceived = true;
      // Intentionally do not respond; simulate hanging in-flight operation
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as any).port;
    const oldRestUrl = process.env.RESTAURANT_URL;
    process.env.RESTAURANT_URL = `http://127.0.0.1:${port}`;

    try {
      const worker = 'worker_inflight_1:att_1';
      const op: PlatformOperationRecord = {
        id: opId,
        type: 'TENANT_PROVISION',
        tenantId: `org/${testOrg.id}/project/${slug}/environment/production`,
        organizationId: testOrg.id,
        status: 'PROVISIONING',
        leaseOwner: worker,
        leaseExpiresAt: new Date(Date.now() + 10000).toISOString(),
        steps: [
          { id: '1', name: 'Step 1', status: 'COMPLETED' },
          { id: '2', name: 'Step 2', status: 'COMPLETED' },
          { id: '3', name: 'Step 3', status: 'COMPLETED' },
          { id: '4', name: 'Step 4', status: 'COMPLETED' },
          { id: '5', name: 'Plugin provisioning', status: 'PENDING' },
          { id: '6', name: 'Initial grant push', status: 'PENDING' },
          { id: '7', name: 'Final tenant activation', status: 'PENDING' },
        ],
        request: { name: `Inflight Resto ${slug}`, slug, plugins: [{ id: 'restaurant-os', plan: 'restaurant-starter' }] },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await operationStore.createOperation(op);

      const asyncPromise = provisioningSaga.executeAsyncSteps(
        opId,
        {
          name: `Inflight Resto ${slug}`,
          slug,
          organizationId: testOrg.id,
          environment: 'production',
          plugins: [{ id: 'restaurant-os', plan: 'restaurant-starter', planTier: 'STARTER', runtimeUrl: `http://127.0.0.1:${port}` } as any],
        },
        op.tenantId,
        testOrg,
        slug,
        'production',
        { workerId: worker }
      );

      // Wait until HTTP server receives the request
      const start = Date.now();
      while (!requestReceived && Date.now() - start < 3000) {
        await new Promise((r) => setTimeout(r, 50));
      }
      assert.strictEqual(requestReceived, true, 'Mock server must receive lifecycle provision request');

      // Now cancel the operation mid-flight
      const cancelled = await provisioningSaga.cancelOperation(opId);
      assert.strictEqual(cancelled, true, 'cancelOperation must succeed');

      // Wait for async execution to settle
      await asyncPromise;

      // Assert operation is CANCELLED and lease was released
      const finalOp = await operationStore.getOperation(opId);
      assert.strictEqual(finalOp?.status, 'CANCELLED');
      assert.strictEqual(finalOp?.leaseOwner, null);

      // Assert project was NOT activated
      const project = await platformRepository.getProject(slug);
      assert.notStrictEqual(project?.status, 'ACTIVE');
    } finally {
      process.env.RESTAURANT_URL = oldRestUrl;
      server.close();
    }
  });

  it('13. Fenced Step 7: Stolen lease before project activation rolls back transaction and suppresses webhook', async () => {
    const slug = `fenced-step7-${crypto.randomBytes(4).toString('hex')}`;
    const opId = `op_fenced_step7_${crypto.randomBytes(6).toString('hex')}`;
    createdOpIds.push(opId);

    const workerA = 'worker_a:att_1';
    const workerB = 'worker_b:att_2';

    // Create project first (status: PROVISIONING)
    const created = await platformRepository.createProject({
      name: `Fenced Project ${slug}`,
      slug,
      organizationId: testOrg.id,
      planTier: 'free',
      businessModel: 'B2B',
      technicalLead: 'lead@orbitox.io',
      contactEmail: 'contact@orbitox.io',
    });
    const projectId = (created as any).project?.id || (created as any).id;
    await platformRepository.updateProject(projectId, { status: 'PROVISIONING' });

    const op: PlatformOperationRecord = {
      id: opId,
      type: 'TENANT_PROVISION',
      tenantId: `org/${testOrg.id}/project/${slug}/environment/production`,
      organizationId: testOrg.id,
      status: 'PROVISIONING',
      leaseOwner: workerA,
      leaseExpiresAt: new Date(Date.now() + 10000).toISOString(),
      steps: [
        { id: '1', name: 'Step 1', status: 'COMPLETED' },
        { id: '2', name: 'Step 2', status: 'COMPLETED' },
        { id: '3', name: 'Step 3', status: 'COMPLETED' },
        { id: '4', name: 'Step 4', status: 'COMPLETED' },
        { id: '5', name: 'Plugin provisioning', status: 'COMPLETED' },
        { id: '6', name: 'Initial grant push', status: 'COMPLETED' },
        { id: '7', name: 'Final tenant activation', status: 'PENDING' },
      ],
      request: { name: `Fenced Resto ${slug}`, slug, plugins: [{ id: 'restaurant-os', plan: 'restaurant-starter' }] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await operationStore.createOperation(op);

    const { clearEmittedWebhooks, getEmittedWebhooks } = await import('@/server/provisioning/webhook-emitter');
    clearEmittedWebhooks();

    // Hook: right before Step 7's finalizeProjectActivationAndOutbox, worker B steals the lease!
    (globalThis as any).__test_before_step7_activation = async (targetOpId: string) => {
      if (targetOpId === opId) {
        // Expire worker A's lease and let worker B claim it
        await operationStore.updateOperation(opId, {
          leaseExpiresAt: new Date(Date.now() - 1000).toISOString(),
        });
        await operationStore.claimOperationLease(opId, workerB, 30);
      }
    };

    try {
      await provisioningSaga.executeAsyncSteps(
        opId,
        {
          name: `Fenced Resto ${slug}`,
          slug,
          organizationId: testOrg.id,
          environment: 'production',
          plugins: [{ id: 'restaurant-os', plan: 'restaurant-starter', planTier: 'STARTER', runtimeUrl: 'http://localhost:3000' } as any],
        },
        op.tenantId,
        testOrg,
        slug,
        'production',
        { workerId: workerA }
      );
    } finally {
      delete (globalThis as any).__test_before_step7_activation;
    }

    // 1. Worker A's Step 7 must have failed due to LEASE_FENCING_ERROR
    const finalOp = await operationStore.getOperation(opId);
    assert.strictEqual(finalOp?.leaseOwner, workerB, 'Worker B must remain the lease owner');
    assert.notStrictEqual(finalOp?.status, 'ACTIVE', 'Operation must NOT be marked ACTIVE by worker A');

    // 2. Project status must NOT be ACTIVE (rolled back)
    const freshProject = await platformRepository.getProject(slug);
    assert.notStrictEqual(freshProject?.status, 'ACTIVE', 'Project must NOT be marked ACTIVE after lease was lost');

    // 3. Webhook tenant.ready must NEVER have been emitted
    const webhooks = getEmittedWebhooks({ tenantId: op.tenantId, event: 'tenant.ready' });
    assert.strictEqual(webhooks.length, 0, 'Webhook tenant.ready must NOT be emitted when lease is fenced');
  });

  it('14. Transaction-internal race: Lease stolen after initial Step 7 validation rolls back activation and outbox', async () => {
    const slug = `race-step7-${crypto.randomBytes(4).toString('hex')}`;
    const opId = `op_race_step7_${crypto.randomBytes(6).toString('hex')}`;
    createdOpIds.push(opId);

    const workerA = 'worker_race_a:att_1';
    const workerB = 'worker_race_b:att_2';

    const created = await platformRepository.createProject({
      name: `Race Project ${slug}`,
      slug,
      organizationId: testOrg.id,
      planTier: 'free',
      businessModel: 'B2B',
      technicalLead: 'lead@orbitox.io',
      contactEmail: 'contact@orbitox.io',
    });
    const projectId = (created as any).project?.id || (created as any).id;
    await platformRepository.updateProject(projectId, { status: 'PROVISIONING' });

    const tenantId = `org/${testOrg.id}/project/${slug}/environment/production`;
    const op: PlatformOperationRecord = {
      id: opId,
      type: 'TENANT_PROVISION',
      tenantId,
      organizationId: testOrg.id,
      status: 'PROVISIONING',
      leaseOwner: workerA,
      leaseExpiresAt: new Date(Date.now() + 10000).toISOString(),
      steps: [
        { id: '1', name: 'Step 1', status: 'COMPLETED' },
        { id: '2', name: 'Step 2', status: 'COMPLETED' },
        { id: '3', name: 'Step 3', status: 'COMPLETED' },
        { id: '4', name: 'Step 4', status: 'COMPLETED' },
        { id: '5', name: 'Plugin provisioning', status: 'COMPLETED' },
        { id: '6', name: 'Initial grant push', status: 'COMPLETED' },
        { id: '7', name: 'Final tenant activation', status: 'PENDING' },
      ],
      request: { name: `Race Resto ${slug}`, slug, plugins: [{ id: 'restaurant-os', plan: 'restaurant-starter' }] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await operationStore.createOperation(op);

    const { clearEmittedWebhooks, getEmittedWebhooks } = await import('@/server/provisioning/webhook-emitter');
    clearEmittedWebhooks();

    // Hook: right AFTER initial validation in finalizeProjectActivationAndOutbox transaction,
    // another connection steals the lease directly in PostgreSQL!
    (globalThis as any).__test_on_after_step7_validation = async () => {
      await (prisma as any).$queryRaw`
        UPDATE "PlatformOperation"
        SET "leaseOwner" = ${workerB},
            "leaseExpiresAt" = NOW() + INTERVAL '30 seconds',
            "updatedAt" = NOW()
        WHERE "id" = ${opId}
      `;
    };

    try {
      await provisioningSaga.executeAsyncSteps(
        opId,
        {
          name: `Race Resto ${slug}`,
          slug,
          organizationId: testOrg.id,
          environment: 'production',
          plugins: [{ id: 'restaurant-os', plan: 'restaurant-starter', planTier: 'STARTER', runtimeUrl: 'http://localhost:3000' } as any],
        },
        tenantId,
        testOrg,
        slug,
        'production',
        { workerId: workerA }
      );
    } finally {
      delete (globalThis as any).__test_on_after_step7_validation;
    }

    // 1. Stale worker A must not have restored operation to ACTIVE
    const finalOp = await operationStore.getOperation(opId);
    assert.strictEqual(finalOp?.leaseOwner, workerB);
    assert.notStrictEqual(finalOp?.status, 'ACTIVE');

    // 2. Project must remain PROVISIONING (rolled back)
    const freshProject = await platformRepository.getProject(slug);
    assert.strictEqual(freshProject?.status, 'PROVISIONING');

    // 3. No outbox message committed
    const outboxMsgs = await (prisma as any).platformOutboxMessage.findMany({
      where: { tenantId, eventType: 'tenant.ready' },
    });
    assert.strictEqual(outboxMsgs.length, 0);

    // 4. No webhook emitted
    const webhooks = getEmittedWebhooks({ tenantId, event: 'tenant.ready' });
    assert.strictEqual(webhooks.length, 0);
  });

  it('15. Transaction-internal race: Concurrent cancellation during Step 7 finalization rolls back and keeps CANCELLING/CANCELLED', async () => {
    const slug = `canc-step7-${crypto.randomBytes(4).toString('hex')}`;
    const opId = `op_canc_step7_${crypto.randomBytes(6).toString('hex')}`;
    createdOpIds.push(opId);

    const workerA = 'worker_canc_a:att_1';

    const created = await platformRepository.createProject({
      name: `Canc Step7 Project ${slug}`,
      slug,
      organizationId: testOrg.id,
      planTier: 'free',
      businessModel: 'B2B',
      technicalLead: 'lead@orbitox.io',
      contactEmail: 'contact@orbitox.io',
    });
    const projectId = (created as any).project?.id || (created as any).id;
    await platformRepository.updateProject(projectId, { status: 'PROVISIONING' });

    const tenantId = `org/${testOrg.id}/project/${slug}/environment/production`;
    const op: PlatformOperationRecord = {
      id: opId,
      type: 'TENANT_PROVISION',
      tenantId,
      organizationId: testOrg.id,
      status: 'PROVISIONING',
      leaseOwner: workerA,
      leaseExpiresAt: new Date(Date.now() + 10000).toISOString(),
      steps: [
        { id: '1', name: 'Step 1', status: 'COMPLETED' },
        { id: '2', name: 'Step 2', status: 'COMPLETED' },
        { id: '3', name: 'Step 3', status: 'COMPLETED' },
        { id: '4', name: 'Step 4', status: 'COMPLETED' },
        { id: '5', name: 'Plugin provisioning', status: 'COMPLETED' },
        { id: '6', name: 'Initial grant push', status: 'COMPLETED' },
        { id: '7', name: 'Final tenant activation', status: 'PENDING' },
      ],
      request: { name: `Canc Resto ${slug}`, slug, plugins: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await operationStore.createOperation(op);

    const { clearEmittedWebhooks, getEmittedWebhooks } = await import('@/server/provisioning/webhook-emitter');
    clearEmittedWebhooks();

    // Hook: concurrent connection cancels operation after initial validation
    (globalThis as any).__test_on_after_step7_validation = async () => {
      await (prisma as any).$queryRaw`
        UPDATE "PlatformOperation"
        SET "status" = 'CANCELLING',
            "leaseOwner" = NULL,
            "leaseExpiresAt" = NULL,
            "updatedAt" = NOW()
        WHERE "id" = ${opId}
      `;
    };

    try {
      await provisioningSaga.executeAsyncSteps(
        opId,
        {
          name: `Canc Resto ${slug}`,
          slug,
          organizationId: testOrg.id,
          environment: 'production',
          plugins: [],
        },
        tenantId,
        testOrg,
        slug,
        'production',
        { workerId: workerA }
      );
    } finally {
      delete (globalThis as any).__test_on_after_step7_validation;
    }

    const finalOp = await operationStore.getOperation(opId);
    assert.ok(['CANCELLING', 'CANCELLED'].includes(finalOp?.status || ''));
    assert.notStrictEqual(finalOp?.status, 'ACTIVE');

    const freshProject = await platformRepository.getProject(slug);
    assert.strictEqual(freshProject?.status, 'PROVISIONING');

    const outboxMsgs = await (prisma as any).platformOutboxMessage.findMany({
      where: { tenantId, eventType: 'tenant.ready' },
    });
    assert.strictEqual(outboxMsgs.length, 0);

    const webhooks = getEmittedWebhooks({ tenantId, event: 'tenant.ready' });
    assert.strictEqual(webhooks.length, 0);
  });

  it('16. Cross-instance cancellation: Worker on instance A aborts promptly when cancellation is initiated from instance B', async () => {
    const slug = `cross-inst-${crypto.randomBytes(4).toString('hex')}`;
    const opId = `op_cross_inst_${crypto.randomBytes(6).toString('hex')}`;
    createdOpIds.push(opId);

    const { ProvisioningSaga } = await import('@/server/provisioning/provisioning-saga');
    const instanceA = new ProvisioningSaga();
    const instanceB = new ProvisioningSaga();

    const workerA = `${instanceA.workerInstanceId}:att_1`;
    const tenantId = `org/${testOrg.id}/project/${slug}/environment/production`;

    const op: PlatformOperationRecord = {
      id: opId,
      type: 'TENANT_PROVISION',
      tenantId,
      organizationId: testOrg.id,
      status: 'PROVISIONING',
      leaseOwner: workerA,
      leaseExpiresAt: new Date(Date.now() + 10000).toISOString(),
      steps: [
        { id: '1', name: 'Step 1', status: 'COMPLETED' },
        { id: '2', name: 'Step 2', status: 'COMPLETED' },
        { id: '3', name: 'Step 3', status: 'COMPLETED' },
        { id: '4', name: 'Step 4', status: 'COMPLETED' },
        { id: '5', name: 'Plugin provisioning', status: 'PENDING' },
        { id: '6', name: 'Initial grant push', status: 'PENDING' },
        { id: '7', name: 'Final tenant activation', status: 'PENDING' },
      ],
      request: { name: `Cross Inst ${slug}`, slug, plugins: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await operationStore.createOperation(op);

    // Cancel from instance B
    const cancelled = await instanceB.cancelOperation(opId);
    assert.strictEqual(cancelled, true);

    const freshOp = await operationStore.getOperation(opId);
    assert.strictEqual(freshOp?.status, 'CANCELLED');
    assert.strictEqual(freshOp?.leaseOwner, null);

    // When instance A tries to run async steps, it detects terminal status immediately
    await instanceA.executeAsyncSteps(
      opId,
      {
        name: `Cross Inst ${slug}`,
        slug,
        organizationId: testOrg.id,
        environment: 'production',
        plugins: [],
      },
      tenantId,
      testOrg,
      slug,
      'production',
      { workerId: workerA }
    );

    const postOp = await operationStore.getOperation(opId);
    assert.strictEqual(postOp?.status, 'CANCELLED');
    assert.strictEqual(postOp?.steps.find((s) => s.id === '7')?.status, 'PENDING');
  });

  it('17. Reconciliation: External plugin succeeds remotely but response lost, cancellation cleans up via probe', async () => {
    const slug = `reconcile-${crypto.randomBytes(4).toString('hex')}`;
    const opId = `op_reconcile_${crypto.randomBytes(6).toString('hex')}`;
    createdOpIds.push(opId);

    const tenantId = `org/${testOrg.id}/project/${slug}/environment/production`;
    const pluginId = '@orbitox/restaurant';

    let deprovisionCalled = false;
    const originalInvoke = pluginLifecycleClient.invokeLifecycle;
    pluginLifecycleClient.invokeLifecycle = async (pId, action, tId, payload, opts) => {
      if (action === 'deprovision') {
        deprovisionCalled = true;
        return { ok: true, tenantId: tId };
      }
      return originalInvoke.call(pluginLifecycleClient, pId, action, tId, payload, opts);
    };

    try {
      const op: PlatformOperationRecord = {
        id: opId,
        type: 'TENANT_PROVISION',
        tenantId,
        organizationId: testOrg.id,
        status: 'PROVISIONING',
        leaseOwner: 'worker_rec:att_1',
        leaseExpiresAt: new Date(Date.now() + 10000).toISOString(),
        steps: [
          { id: '1', name: 'Step 1', status: 'COMPLETED' },
          { id: '2', name: 'Step 2', status: 'COMPLETED' },
          { id: '3', name: 'Step 3', status: 'COMPLETED' },
          { id: '4', name: 'Step 4', status: 'COMPLETED' },
          { id: '5', name: 'Plugin provisioning', status: 'FAILED', error: 'Network dropped before response' },
          { id: '6', name: 'Initial grant push', status: 'PENDING' },
          { id: '7', name: 'Final tenant activation', status: 'PENDING' },
        ],
        request: { name: `Reconcile Resto ${slug}`, slug, plugins: [{ id: pluginId, plan: 'starter' }] },
        result: {
          inFlightPlugins: [pluginId],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await operationStore.createOperation(op);

      // Probe returns true (remote resource was created before network drop)
      const probe = async (p: string, t: string) => p === pluginId && t === tenantId;
      const cancelled = await provisioningSaga.cancelOperation(opId, { probe });

      assert.strictEqual(cancelled, true);
      assert.strictEqual(deprovisionCalled, true, 'Deprovision must be called for reconciled remote plugin');

      const finalOp = await operationStore.getOperation(opId);
      assert.strictEqual(finalOp?.status, 'CANCELLED');
    } finally {
      pluginLifecycleClient.invokeLifecycle = originalInvoke;
    }
  });

  it('18. Aborted request with remote commit: Compensation cleans up remote resource discovered via reconciliation probe', async () => {
    const slug = `abort-commit-${crypto.randomBytes(4).toString('hex')}`;
    const opId = `op_abort_commit_${crypto.randomBytes(6).toString('hex')}`;
    createdOpIds.push(opId);

    const tenantId = `org/${testOrg.id}/project/${slug}/environment/production`;
    const pluginId = '@orbitox/hms';

    let deprovisionInvoked = false;
    const originalInvoke = pluginLifecycleClient.invokeLifecycle;
    pluginLifecycleClient.invokeLifecycle = async (pId, action, tId, payload, opts) => {
      if (action === 'deprovision') {
        deprovisionInvoked = true;
        return { ok: true, tenantId: tId };
      }
      return originalInvoke.call(pluginLifecycleClient, pId, action, tId, payload, opts);
    };

    try {
      const op: PlatformOperationRecord = {
        id: opId,
        type: 'TENANT_PROVISION',
        tenantId,
        organizationId: testOrg.id,
        status: 'PROVISIONING',
        leaseOwner: 'worker_abort:att_1',
        leaseExpiresAt: new Date(Date.now() + 10000).toISOString(),
        steps: [
          { id: '1', name: 'Step 1', status: 'COMPLETED' },
          { id: '2', name: 'Step 2', status: 'COMPLETED' },
          { id: '3', name: 'Step 3', status: 'COMPLETED' },
          { id: '4', name: 'Step 4', status: 'COMPLETED' },
          { id: '5', name: 'Plugin provisioning', status: 'FAILED', error: 'Client aborted HTTP request' },
          { id: '6', name: 'Initial grant push', status: 'PENDING' },
          { id: '7', name: 'Final tenant activation', status: 'PENDING' },
        ],
        request: { name: `Abort Commit ${slug}`, slug, plugins: [{ id: pluginId, plan: 'enterprise' }] },
        result: {
          inFlightPlugins: [pluginId],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await operationStore.createOperation(op);

      const probe = async (p: string) => p === pluginId;
      const cancelled = await provisioningSaga.cancelOperation(opId, { probe });

      assert.strictEqual(cancelled, true);
      assert.strictEqual(deprovisionInvoked, true, 'Deprovision must clean up committed remote resource');

      const finalOp = await operationStore.getOperation(opId);
      assert.strictEqual(finalOp?.status, 'CANCELLED');
    } finally {
      pluginLifecycleClient.invokeLifecycle = originalInvoke;
    }
  });

  it('19. Compensation failure: Leaves operation in CANCELLING, records failures, and retries remaining plugins on next call', async () => {
    const slug = `comp-fail-${crypto.randomBytes(4).toString('hex')}`;
    const opId = `op_comp_fail_${crypto.randomBytes(6).toString('hex')}`;
    createdOpIds.push(opId);

    const tenantId = `org/${testOrg.id}/project/${slug}/environment/production`;
    const pluginA = '@orbitox/hms';
    const pluginB = '@orbitox/restaurant';

    let deprovisionCalls: string[] = [];
    let pluginBShouldFail = true;

    const originalInvoke = pluginLifecycleClient.invokeLifecycle;
    pluginLifecycleClient.invokeLifecycle = async (pId, action, tId, payload, opts) => {
      if (action === 'deprovision') {
        deprovisionCalls.push(pId);
        if (pId === pluginB && pluginBShouldFail) {
          return { ok: false, error: 'Remote service temporarily unavailable 503' };
        }
        return { ok: true, tenantId: tId };
      }
      return originalInvoke.call(pluginLifecycleClient, pId, action, tId, payload, opts);
    };

    try {
      const op: PlatformOperationRecord = {
        id: opId,
        type: 'TENANT_PROVISION',
        tenantId,
        organizationId: testOrg.id,
        status: 'PROVISIONING',
        leaseOwner: 'worker_comp:att_1',
        leaseExpiresAt: new Date(Date.now() + 10000).toISOString(),
        steps: [
          { id: '1', name: 'Step 1', status: 'COMPLETED' },
          { id: '2', name: 'Step 2', status: 'COMPLETED' },
          { id: '3', name: 'Step 3', status: 'COMPLETED' },
          { id: '4', name: 'Step 4', status: 'COMPLETED' },
          { id: '5', name: 'Plugin provisioning', status: 'COMPLETED' },
          { id: '6', name: 'Initial grant push', status: 'PENDING' },
          { id: '7', name: 'Final tenant activation', status: 'PENDING' },
        ],
        request: { name: `Comp Resto ${slug}`, slug, plugins: [{ id: pluginA, plan: 'p1' }, { id: pluginB, plan: 'p2' }] },
        result: {
          succeededPlugins: [pluginA, pluginB],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await operationStore.createOperation(op);

      // Attempt 1: Plugin B fails deprovision
      const result1 = await provisioningSaga.cancelOperation(opId);
      assert.strictEqual(result1, false, 'cancelOperation must return false when compensation is incomplete');

      const opState1 = await operationStore.getOperation(opId);
      assert.strictEqual(opState1?.status, 'CANCELLING', 'Operation must remain CANCELLING on compensation failure');
      assert.ok(Array.isArray(opState1?.result?.compensationFailures));
      assert.strictEqual(opState1?.result?.compensationFailures.length, 1);
      assert.strictEqual(opState1?.result?.compensationFailures[0].pluginId, pluginB);
      assert.deepStrictEqual(opState1?.result?.compensatedPlugins, [pluginA]);

      // Service B recovers
      pluginBShouldFail = false;
      deprovisionCalls = [];

      // Attempt 2: Retry compensation
      const result2 = await provisioningSaga.cancelOperation(opId);
      assert.strictEqual(result2, true, 'cancelOperation must return true once all compensations succeed');

      // Verify plugin A was NOT called again (idempotent skip of already-compensated plugins)
      assert.strictEqual(deprovisionCalls.includes(pluginA), false, 'Already compensated plugin must not be re-invoked');
      assert.strictEqual(deprovisionCalls.includes(pluginB), true, 'Pending failed plugin must be retried');

      const opState2 = await operationStore.getOperation(opId);
      assert.strictEqual(opState2?.status, 'CANCELLED');
      assert.deepStrictEqual(opState2?.result?.compensationFailures, []);
    } finally {
      pluginLifecycleClient.invokeLifecycle = originalInvoke;
    }
  });

  it('20. Terminal hardening: Cancelled or cancelling operations reject lease claims, retries, and updates', async () => {
    const slug = `term-hard-${crypto.randomBytes(4).toString('hex')}`;
    const opId = `op_term_hard_${crypto.randomBytes(6).toString('hex')}`;
    createdOpIds.push(opId);

    const tenantId = `org/${testOrg.id}/project/${slug}/environment/production`;
    const op: PlatformOperationRecord = {
      id: opId,
      type: 'TENANT_PROVISION',
      tenantId,
      organizationId: testOrg.id,
      status: 'CANCELLED',
      leaseOwner: null,
      leaseExpiresAt: null,
      steps: [{ id: '1', name: 'Step 1', status: 'FAILED' }],
      request: { name: `Term Hard ${slug}`, slug, plugins: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await operationStore.createOperation(op);

    // 1. claimOperationLease returns false
    const claimNormal = await operationStore.claimOperationLease(opId, 'worker_new:att_1', 30);
    assert.strictEqual(claimNormal, false, 'claimOperationLease must reject CANCELLED operations');

    // 2. Force claim returns false
    const claimForce = await operationStore.claimOperationLease(opId, 'worker_new:att_1', 30, { force: true });
    assert.strictEqual(claimForce, false, 'claimOperationLease with force must reject CANCELLED operations');

    // 3. retryOperation returns null
    const retryResult = await provisioningSaga.retryOperation(opId);
    assert.strictEqual(retryResult, null, 'retryOperation must reject CANCELLED operations');

    // 4. resumeWorkflow refuses to execute and returns op
    const resumeResult = await provisioningSaga.resumeWorkflow(opId);
    assert.strictEqual(resumeResult?.status, 'CANCELLED');

    // 5. updateOperation throws OPERATION_CANCELLED when trying to restore status to PROVISIONING
    await assert.rejects(
      async () => {
        await operationStore.updateOperation(opId, { status: 'PROVISIONING' });
      },
      /OPERATION_CANCELLED/
    );
  });

  it('21. Exactly-once finalization: Recovery never duplicates outbox tenant.ready messages or webhooks', async () => {
    const slug = `no-dup-${crypto.randomBytes(4).toString('hex')}`;
    const opId = `op_no_dup_${crypto.randomBytes(6).toString('hex')}`;
    createdOpIds.push(opId);

    const worker = 'worker_nodup:att_1';
    const tenantId = `org/${testOrg.id}/project/${slug}/environment/production`;

    const created = await platformRepository.createProject({
      name: `No Dup Project ${slug}`,
      slug,
      organizationId: testOrg.id,
      planTier: 'free',
      businessModel: 'B2B',
      technicalLead: 'lead@orbitox.io',
      contactEmail: 'contact@orbitox.io',
    });
    const projectId = (created as any).project?.id || (created as any).id;
    await platformRepository.updateProject(projectId, { status: 'PROVISIONING' });

    const op: PlatformOperationRecord = {
      id: opId,
      type: 'TENANT_PROVISION',
      tenantId,
      organizationId: testOrg.id,
      status: 'PROVISIONING',
      leaseOwner: worker,
      leaseExpiresAt: new Date(Date.now() + 10000).toISOString(),
      steps: [
        { id: '1', name: 'Step 1', status: 'COMPLETED' },
        { id: '2', name: 'Step 2', status: 'COMPLETED' },
        { id: '3', name: 'Step 3', status: 'COMPLETED' },
        { id: '4', name: 'Step 4', status: 'COMPLETED' },
        { id: '5', name: 'Plugin provisioning', status: 'COMPLETED' },
        { id: '6', name: 'Initial grant push', status: 'COMPLETED' },
        { id: '7', name: 'Final tenant activation', status: 'PENDING' },
      ],
      request: { name: `No Dup Resto ${slug}`, slug, plugins: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await operationStore.createOperation(op);

    const { clearEmittedWebhooks, getEmittedWebhooks } = await import('@/server/provisioning/webhook-emitter');
    clearEmittedWebhooks();

    // 1. Run execution to completion (Step 7 finalizes)
    await provisioningSaga.executeAsyncSteps(
      opId,
      {
        name: `No Dup Resto ${slug}`,
        slug,
        organizationId: testOrg.id,
        environment: 'production',
        plugins: [],
      },
      tenantId,
      testOrg,
      slug,
      'production',
      { workerId: worker }
    );

    const finalOp = await operationStore.getOperation(opId);
    assert.strictEqual(finalOp?.status, 'ACTIVE');

    // 2. Recovery attempts resumeWorkflow or retryOperation on completed operation
    await provisioningSaga.resumeWorkflow(opId);
    await provisioningSaga.retryOperation(opId);

    // 3. Verify exactly 1 outbox message for tenant.ready
    const outboxMsgs = await (prisma as any).platformOutboxMessage.findMany({
      where: { tenantId, eventType: 'tenant.ready' },
    });
    assert.strictEqual(outboxMsgs.length, 1, 'Exactly one outbox message must be recorded');

    // 4. Verify exactly 1 webhook emission
    const webhooks = getEmittedWebhooks({ tenantId, event: 'tenant.ready' });
    assert.strictEqual(webhooks.length, 1, 'Exactly one tenant.ready webhook must be emitted');
  });
});
