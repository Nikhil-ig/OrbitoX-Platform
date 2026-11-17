const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@127.0.0.1:5432/orbitox_phase2';
process.env.DATABASE_URL = databaseUrl;
process.env.APP_DATABASE_URL = process.env.APP_DATABASE_URL || 'postgresql://orbitox_runtime:test_runtime_pass@127.0.0.1:5432/orbitox_phase2';
process.env.PLATFORM_AUDIT_DATABASE_URL = process.env.PLATFORM_AUDIT_DATABASE_URL || 'postgresql://orbitox_platform_admin_audit:test_audit_pass@127.0.0.1:5432/orbitox_phase2';
process.env.HMS_AUDIT_DATABASE_URL = process.env.HMS_AUDIT_DATABASE_URL || 'postgresql://hms_audit_reader:test_audit_pass@127.0.0.1:5432/orbitox_phase2';
process.env.OUTBOX_RELAY_DATABASE_URL = process.env.OUTBOX_RELAY_DATABASE_URL || 'postgresql://orbitox_outbox_relay:test_outbox_pass@127.0.0.1:5432/orbitox_phase2';
(process.env as any).NODE_ENV = 'test';

import 'server-only';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import http from 'node:http';
import { PrismaClient } from '@prisma/client';
import { prisma } from '@/server/db/prisma';
import { platformRepository } from '@/server/db/platform-repository';
import { operationStore } from '@/server/provisioning/operation-store';
import {
  claimPendingOutboxMessages,
  dispatchClaimedMessage,
  dispatchOutboxMessage,
  dispatchPendingOutboxMessages,
  calculateBackoff,
  replayOutboxMessage,
  clearEmittedWebhooks,
} from '@/server/provisioning/webhook-emitter';
import { PlatformOperationRecord } from '@/server/provisioning/types';

describe('Phase 5: Outbox Multi-Worker Concurrency & Reliability Suite', () => {
  let testOrg: any;
  const createdProjectIds: string[] = [];

  // Independent secondary Prisma client to simulate a distinct worker / database connection
  const workerClientB = new PrismaClient({
    datasources: { db: { url: process.env.OUTBOX_RELAY_DATABASE_URL || databaseUrl } },
  });

  before(async () => {
    const slug = `outbox-concurr-${crypto.randomBytes(4).toString('hex')}`;
    testOrg = await platformRepository.createOrganization({
      name: `Outbox Concurrency Org ${slug}`,
      slug,
      billingEmail: `billing-${slug}@orbitox.io`,
    });
  });

  after(async () => {
    delete process.env.ORBITOX_WEBHOOK_URL;
    delete process.env.ORBITOX_WEBHOOK_SECRET;
    await workerClientB.$disconnect().catch(() => {});
  });

  it('1. Two simultaneous activations attempt same event: conflict-safe insert returns exact same outbox ID', async () => {
    const slug = `race-act-${crypto.randomBytes(4).toString('hex')}`;
    const opId1 = `op_race_1_${crypto.randomBytes(6).toString('hex')}`;
    const opId2 = `op_race_2_${crypto.randomBytes(6).toString('hex')}`;

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
    createdProjectIds.push(projectId);
    await platformRepository.updateProject(projectId, { status: 'PROVISIONING' });

    const tenantId = `org/${testOrg.id}/project/${slug}/environment/production`;
    const worker1 = 'worker_race_1:attempt_1';
    const worker2 = 'worker_race_2:attempt_2';

    const baseOp1: PlatformOperationRecord = {
      id: opId1,
      type: 'TENANT_PROVISION',
      tenantId,
      organizationId: testOrg.id,
      status: 'PROVISIONING',
      leaseOwner: worker1,
      leaseExpiresAt: new Date(Date.now() + 10000).toISOString(),
      steps: [{ id: '1', name: 'Step 1', status: 'COMPLETED' }],
      request: { name: `Race 1 ${slug}`, slug, plugins: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const baseOp2: PlatformOperationRecord = {
      ...baseOp1,
      id: opId2,
      leaseOwner: worker2,
      request: { name: `Race 2 ${slug}`, slug, plugins: [] },
    };

    await operationStore.createOperation(baseOp1);
    await operationStore.createOperation(baseOp2);

    // Run both finalizations concurrently
    const [res1, res2] = await Promise.all([
      operationStore.finalizeProjectActivationAndOutbox({
        operationId: opId1,
        expectedLeaseOwner: worker1,
        projectId,
        tenantId,
        organizationId: testOrg.id,
        cleanSlug: slug,
        environmentSlug: 'production',
        plugins: [],
        steps: baseOp1.steps,
      }),
      operationStore.finalizeProjectActivationAndOutbox({
        operationId: opId2,
        expectedLeaseOwner: worker2,
        projectId,
        tenantId,
        organizationId: testOrg.id,
        cleanSlug: slug,
        environmentSlug: 'production',
        plugins: [],
        steps: baseOp2.steps,
      }),
    ]);

    assert.ok(res1.outboxMessageId, 'Worker 1 must receive an outboxMessageId');
    assert.ok(res2.outboxMessageId, 'Worker 2 must receive an outboxMessageId');
    assert.strictEqual(
      res1.outboxMessageId,
      res2.outboxMessageId,
      'Concurrent finalizations must return the exact same outbox message ID'
    );

    if (process.env.ORBITOX_PLATFORM_REPOSITORY !== 'json') {
      const records = await (prisma as any).$transaction(async (tx: any) => {
        await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
        return tx.platformOutboxMessage.findMany({
          where: { tenantId, eventType: 'tenant.ready' },
        });
      });
      assert.strictEqual(records.length, 1, 'Total records in DB for tenant.ready must remain strictly 1');
      assert.strictEqual(records[0].id, res1.outboxMessageId);
    }
  });

  it('2. Two workers attempt to claim the same pending event: exactly one worker claims it', async () => {
    if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'json') return;

    const tenantId = `org/${testOrg.id}/project/claim-race-${crypto.randomBytes(4).toString('hex')}/environment/production`;
    const outboxId = `outbox_claim_race_${crypto.randomUUID()}`;

    // Create 1 pending outbox message
    await (prisma as any).$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
      await tx.platformOutboxMessage.create({
        data: {
          id: outboxId,
          tenantId,
          eventType: 'tenant.ready',
          aggregateType: 'TENANT',
          aggregateId: tenantId,
          payload: { tenantId },
          status: 'PENDING',
          retryCount: 0,
        },
      });
    });

    // Worker A and Worker B race to claim the single message simultaneously
    const [claimedA, claimedB] = await Promise.all([
      claimPendingOutboxMessages({
        workerId: 'worker_node_alpha',
        limit: 10,
        claimTtlSeconds: 30,
        tenantId,
      }),
      claimPendingOutboxMessages({
        workerId: 'worker_node_beta',
        limit: 10,
        claimTtlSeconds: 30,
        tenantId,
      }),
    ]);

    const totalClaimed = claimedA.length + claimedB.length;
    assert.strictEqual(totalClaimed, 1, 'Exactly one worker must claim the single pending event');

    const winnerWorker = claimedA.length === 1 ? 'worker_node_alpha' : 'worker_node_beta';
    const winnerClaims = claimedA.length === 1 ? claimedA : claimedB;
    assert.strictEqual(winnerClaims[0]!.id, outboxId);
    assert.strictEqual(winnerClaims[0]!.claimOwner, winnerWorker);

    // Verify record state in DB is PROCESSING with winner's ownership
    const record = await (prisma as any).$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
      return tx.platformOutboxMessage.findUnique({ where: { id: outboxId } });
    });
    assert.strictEqual(record?.status, 'PROCESSING');
    assert.strictEqual(record?.claimOwner, winnerWorker);
    assert.ok(record?.claimExpiresAt);
  });

  it('3. Worker crashes after claiming an event: message remains PROCESSING and unclaimable while unexpired', async () => {
    if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'json') return;

    const tenantId = `org/${testOrg.id}/project/crash-hold-${crypto.randomBytes(4).toString('hex')}/environment/production`;
    const outboxId = `outbox_crash_hold_${crypto.randomUUID()}`;

    await (prisma as any).$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
      await tx.platformOutboxMessage.create({
        data: {
          id: outboxId,
          tenantId,
          eventType: 'tenant.ready',
          aggregateType: 'TENANT',
          aggregateId: tenantId,
          payload: { tenantId },
          status: 'PENDING',
          retryCount: 0,
        },
      });
    });

    // Worker A claims with 60-second TTL, then simulated crash (does not dispatch)
    const workerAClaims = await claimPendingOutboxMessages({
      workerId: 'worker_crashed_node_1',
      limit: 1,
      claimTtlSeconds: 60,
      tenantId,
    });
    assert.strictEqual(workerAClaims.length, 1);
    assert.strictEqual(workerAClaims[0]!.id, outboxId);

    // Worker B runs normal sweep immediately (while unexpired)
    const workerBClaims = await claimPendingOutboxMessages({
      workerId: 'worker_live_node_2',
      limit: 10,
      claimTtlSeconds: 30,
      tenantId,
    });
    assert.strictEqual(workerBClaims.length, 0, 'Live worker must NOT steal unexpired claim from crashed worker');
  });

  it('4. Expired claim is recovered by another worker: claimExpiresAt in past allows takeover', async () => {
    if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'json') return;

    const tenantId = `org/${testOrg.id}/project/recover-exp-${crypto.randomBytes(4).toString('hex')}/environment/production`;
    const outboxId = `outbox_rec_exp_${crypto.randomUUID()}`;

    // Insert an already-expired PROCESSING record (claim expired 10 seconds ago)
    await (prisma as any).$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
      await tx.platformOutboxMessage.create({
        data: {
          id: outboxId,
          tenantId,
          eventType: 'tenant.ready',
          aggregateType: 'TENANT',
          aggregateId: tenantId,
          payload: { tenantId },
          status: 'PROCESSING',
          claimOwner: 'worker_dead_node',
          claimExpiresAt: new Date(Date.now() - 10000), // Expired 10s ago
          retryCount: 0,
        },
      });
    });

    // Worker B attempts claim sweep
    const recovered = await claimPendingOutboxMessages({
      workerId: 'worker_recovery_node',
      limit: 1,
      claimTtlSeconds: 30,
      tenantId,
    });

    assert.strictEqual(recovered.length, 1, 'Worker B must successfully recover the expired claim');
    assert.strictEqual(recovered[0]!.id, outboxId);
    assert.strictEqual(recovered[0]!.claimOwner, 'worker_recovery_node');

    // Worker B dispatches successfully
    const delivery = await dispatchClaimedMessage(recovered[0]!, { workerId: 'worker_recovery_node' });
    assert.strictEqual(delivery.delivered, true);

    const record = await (prisma as any).$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
      return tx.platformOutboxMessage.findUnique({ where: { id: outboxId } });
    });
    assert.strictEqual(record?.status, 'DISPATCHED');
    assert.strictEqual(record?.claimOwner, null);
  });

  it('5. Stale worker cannot overwrite newer worker result: fenced status update fails with 0 rows affected', async () => {
    if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'json') return;

    const tenantId = `org/${testOrg.id}/project/fenced-stale-${crypto.randomBytes(4).toString('hex')}/environment/production`;
    const outboxId = `outbox_stale_fence_${crypto.randomUUID()}`;

    // Worker A claims with 1 second TTL
    await (prisma as any).$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
      await tx.platformOutboxMessage.create({
        data: {
          id: outboxId,
          tenantId,
          eventType: 'tenant.ready',
          aggregateType: 'TENANT',
          aggregateId: tenantId,
          payload: { tenantId },
          status: 'PENDING',
          retryCount: 0,
        },
      });
    });

    const workerAClaims = await claimPendingOutboxMessages({
      workerId: 'worker_slow_A',
      limit: 1,
      claimTtlSeconds: 1, // 1 second TTL
      tenantId,
    });
    assert.strictEqual(workerAClaims.length, 1);

    // Wait 1.1s for Worker A's lease to expire
    await new Promise((r) => setTimeout(r, 1100));

    // Worker B re-claims and successfully dispatches
    const workerBClaims = await claimPendingOutboxMessages({
      workerId: 'worker_fast_B',
      limit: 1,
      claimTtlSeconds: 30,
      tenantId,
    });
    assert.strictEqual(workerBClaims.length, 1);
    await dispatchClaimedMessage(workerBClaims[0]!, { workerId: 'worker_fast_B' });

    // Now stale Worker A wakes up and attempts to update its delivery result
    const staleDelivery = await dispatchClaimedMessage(workerAClaims[0]!, { workerId: 'worker_slow_A' });
    assert.strictEqual(staleDelivery.delivered, true);

    // Verify DB record: Worker B's DISPATCHED state remains authoritative and was NOT overwritten by Worker A
    const record = await (prisma as any).$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
      return tx.platformOutboxMessage.findUnique({ where: { id: outboxId } });
    });
    assert.strictEqual(record?.status, 'DISPATCHED');
    assert.strictEqual(record?.claimOwner, null);
  });

  it('6. HTTP succeeds but DB update fails (crash recovery): next recovery sweep uses same delivery ID', async () => {
    if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'json') return;

    const deliveryHeadersSeen: string[] = [];
    const server = http.createServer((req, res) => {
      const delivId = req.headers['x-orbitox-delivery-id'];
      if (typeof delivId === 'string') deliveryHeadersSeen.push(delivId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    const port = (server.address() as any).port;

    const oldUrl = process.env.ORBITOX_WEBHOOK_URL;
    const oldSecret = process.env.ORBITOX_WEBHOOK_SECRET;
    process.env.ORBITOX_WEBHOOK_URL = `http://127.0.0.1:${port}/webhook`;
    process.env.ORBITOX_WEBHOOK_SECRET = 'orb_test_webhook_signing_preview_01';

    const tenantId = `org/${testOrg.id}/project/crash-post-http-${crypto.randomBytes(4).toString('hex')}/environment/production`;
    const outboxId = `outbox_crash_post_${crypto.randomUUID()}`;

    try {
      // 1. Pending message
      await (prisma as any).$transaction(async (tx: any) => {
        await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
        await tx.platformOutboxMessage.create({
          data: {
            id: outboxId,
            tenantId,
            eventType: 'tenant.ready',
            aggregateType: 'TENANT',
            aggregateId: tenantId,
            payload: { tenantId },
            status: 'PENDING',
            retryCount: 0,
          },
        });
      });

      // Claim message
      const claimed = await claimPendingOutboxMessages({
        workerId: 'worker_crash_db',
        limit: 1,
        claimTtlSeconds: 1, // 1s TTL to simulate crash before DB update
        tenantId,
      });

      // Execute HTTP delivery directly to simulate HTTP succeeded before crash
      const secret = 'orb_test_webhook_signing_preview_01';
      const body = JSON.stringify({ id: outboxId, tenantId });
      const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
      await fetch(process.env.ORBITOX_WEBHOOK_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-orbitox-delivery-id': outboxId,
          'x-orbitox-event-id': outboxId,
          'x-orbitox-event': 'tenant.ready',
          'x-orbitox-signature': signature,
          'x-orbitox-timestamp': new Date().toISOString(),
        },
        body,
      });

      // Lease expires
      await new Promise((r) => setTimeout(r, 1100));

      // 2. Recovery worker sweeps and dispatches again
      const sweepCount = await dispatchPendingOutboxMessages({ tenantId, workerId: 'worker_recover_after_crash' });
      assert.strictEqual(sweepCount, 1);

      // Verify that both deliveries used the exact same delivery ID
      assert.strictEqual(deliveryHeadersSeen.length, 2);
      assert.strictEqual(deliveryHeadersSeen[0], outboxId);
      assert.strictEqual(deliveryHeadersSeen[1], outboxId);
    } finally {
      server.close();
      if (oldUrl) process.env.ORBITOX_WEBHOOK_URL = oldUrl;
      else delete process.env.ORBITOX_WEBHOOK_URL;
      if (oldSecret) process.env.ORBITOX_WEBHOOK_SECRET = oldSecret;
      else delete process.env.ORBITOX_WEBHOOK_SECRET;
    }
  });

  it('7. Receiver processes event but sender times out: retry uses exact same x-orbitox-delivery-id', async () => {
    let callCount = 0;
    const deliveryIdsReceived: string[] = [];

    const server = http.createServer(async (req, res) => {
      callCount++;
      const id = req.headers['x-orbitox-delivery-id'] as string;
      deliveryIdsReceived.push(id);

      if (callCount === 1) {
        // First attempt: simulate slow receiver that exceeds the 500ms test timeout
        await new Promise((r) => setTimeout(r, 800));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } else {
        // Second attempt: fast 200 OK
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      }
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    const port = (server.address() as any).port;

    const oldUrl = process.env.ORBITOX_WEBHOOK_URL;
    const oldSecret = process.env.ORBITOX_WEBHOOK_SECRET;
    process.env.ORBITOX_WEBHOOK_URL = `http://127.0.0.1:${port}/webhook`;
    process.env.ORBITOX_WEBHOOK_SECRET = 'orb_test_webhook_signing_preview_01';

    const tenantId = `org/${testOrg.id}/project/timeout-rec-${crypto.randomBytes(4).toString('hex')}/environment/production`;
    const outboxId = `outbox_timeout_${crypto.randomUUID()}`;

    try {
      if (process.env.ORBITOX_PLATFORM_REPOSITORY !== 'json') {
        await (prisma as any).$transaction(async (tx: any) => {
          await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
          await tx.platformOutboxMessage.create({
            data: {
              id: outboxId,
              tenantId,
              eventType: 'tenant.ready',
              aggregateType: 'TENANT',
              aggregateId: tenantId,
              payload: { tenantId },
              status: 'PENDING',
              retryCount: 0,
            },
          });
        });
      }

      // First dispatch attempt with 500ms timeout (will trigger timeout failure)
      const del1 = await dispatchOutboxMessage(
        {
          id: outboxId,
          eventType: 'tenant.ready',
          tenantId,
          payload: { tenantId },
        },
        { timeoutMs: 500 }
      );
      assert.strictEqual(del1.delivered, false, 'First attempt must time out');

      // Second dispatch attempt
      const del2 = await dispatchOutboxMessage({
        id: outboxId,
        eventType: 'tenant.ready',
        tenantId,
        payload: { tenantId },
      });
      assert.strictEqual(del2.delivered, true, 'Second attempt must succeed');

      // Verify both attempts delivered identical delivery IDs
      assert.strictEqual(deliveryIdsReceived.length, 2);
      assert.strictEqual(deliveryIdsReceived[0], outboxId);
      assert.strictEqual(deliveryIdsReceived[1], outboxId);
    } finally {
      server.close();
      if (oldUrl) process.env.ORBITOX_WEBHOOK_URL = oldUrl;
      else delete process.env.ORBITOX_WEBHOOK_URL;
      if (oldSecret) process.env.ORBITOX_WEBHOOK_SECRET = oldSecret;
      else delete process.env.ORBITOX_WEBHOOK_SECRET;
    }
  });

  it('8. Retry scheduling prevents early retries: nextAttemptAt in future is excluded from claiming', async () => {
    if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'json') return;

    const tenantId = `org/${testOrg.id}/project/backoff-sched-${crypto.randomBytes(4).toString('hex')}/environment/production`;
    const outboxId = `outbox_sched_${crypto.randomUUID()}`;

    // Create a message scheduled for retry 5 seconds in the future
    await (prisma as any).$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
      await tx.platformOutboxMessage.create({
        data: {
          id: outboxId,
          tenantId,
          eventType: 'tenant.ready',
          aggregateType: 'TENANT',
          aggregateId: tenantId,
          payload: { tenantId },
          status: 'PENDING',
          retryCount: 1,
          nextAttemptAt: new Date(Date.now() + 5000), // 5 seconds in future
        },
      });
    });

    // Worker attempts claim immediately (before nextAttemptAt)
    const earlyClaims = await claimPendingOutboxMessages({
      workerId: 'worker_early_bird',
      limit: 10,
      tenantId,
    });
    assert.strictEqual(earlyClaims.length, 0, 'Early claiming sweep must return 0 messages');

    // Manually advance nextAttemptAt to past
    await (prisma as any).$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
      await tx.platformOutboxMessage.update({
        where: { id: outboxId },
        data: { nextAttemptAt: new Date(Date.now() - 1000) },
      });
    });

    // Worker claims again (eligible now)
    const eligibleClaims = await claimPendingOutboxMessages({
      workerId: 'worker_on_time',
      limit: 10,
      tenantId,
    });
    assert.strictEqual(eligibleClaims.length, 1, 'Worker must claim message once nextAttemptAt is reached');
    assert.strictEqual(eligibleClaims[0]!.id, outboxId);
  });

  it('9. Maximum attempts lead to dead-letter state (FAILED): excluded from normal sweeps', async () => {
    if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'json') return;

    const server = http.createServer((req, res) => {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Service Unavailable' }));
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    const port = (server.address() as any).port;

    const oldUrl = process.env.ORBITOX_WEBHOOK_URL;
    const oldSecret = process.env.ORBITOX_WEBHOOK_SECRET;
    process.env.ORBITOX_WEBHOOK_URL = `http://127.0.0.1:${port}/webhook`;
    process.env.ORBITOX_WEBHOOK_SECRET = 'orb_test_webhook_signing_preview_01';

    const tenantId = `org/${testOrg.id}/project/dead-letter-max-${crypto.randomBytes(4).toString('hex')}/environment/production`;
    const outboxId = `outbox_dead_letter_${crypto.randomUUID()}`;

    try {
      // Create message with retryCount = 4 (1 attempt remaining before maxAttempts = 5)
      await (prisma as any).$transaction(async (tx: any) => {
        await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
        await tx.platformOutboxMessage.create({
          data: {
            id: outboxId,
            tenantId,
            eventType: 'tenant.ready',
            aggregateType: 'TENANT',
            aggregateId: tenantId,
            payload: { tenantId },
            status: 'PENDING',
            retryCount: 4,
            maxAttempts: 5,
          },
        });
      });

      // Claim and dispatch 5th failing attempt
      const claimed = await claimPendingOutboxMessages({
        workerId: 'worker_dl_tester',
        limit: 1,
        tenantId,
      });
      assert.strictEqual(claimed.length, 1);

      await dispatchClaimedMessage(claimed[0]!, { workerId: 'worker_dl_tester' });

      // Verify transitioned to FAILED
      const record = await (prisma as any).$transaction(async (tx: any) => {
        await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
        return tx.platformOutboxMessage.findUnique({ where: { id: outboxId } });
      });
      assert.strictEqual(record?.status, 'FAILED');
      assert.strictEqual(record?.retryCount, 5);
      assert.ok(record?.lastError?.includes('503'));

      // Verify normal sweep ignores FAILED message
      const sweepClaims = await claimPendingOutboxMessages({
        workerId: 'worker_sweep_check',
        limit: 10,
        tenantId,
      });
      assert.strictEqual(sweepClaims.length, 0, 'Dead-lettered messages must be excluded from claiming sweeps');
    } finally {
      server.close();
      if (oldUrl) process.env.ORBITOX_WEBHOOK_URL = oldUrl;
      else delete process.env.ORBITOX_WEBHOOK_URL;
      if (oldSecret) process.env.ORBITOX_WEBHOOK_SECRET = oldSecret;
      else delete process.env.ORBITOX_WEBHOOK_SECRET;
    }
  });

  it('10. Manual replay retains original event identity: resets to PENDING and preserves ID and payload', async () => {
    if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'json') return;

    const tenantId = `org/${testOrg.id}/project/manual-replay-${crypto.randomBytes(4).toString('hex')}/environment/production`;
    const outboxId = `outbox_manual_replay_${crypto.randomUUID()}`;
    const originalPayload = { tenantId, initialConfig: 'preset_alpha', secretSeed: 98765 };

    // 1. Create a dead-lettered FAILED message
    await (prisma as any).$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
      await tx.platformOutboxMessage.create({
        data: {
          id: outboxId,
          tenantId,
          eventType: 'tenant.ready',
          aggregateType: 'TENANT',
          aggregateId: tenantId,
          payload: originalPayload,
          status: 'FAILED',
          retryCount: 5,
          lastError: 'HTTP 503: Service Unavailable',
        },
      });
    });

    // 2. Operator invokes manual replay
    const replayed = await replayOutboxMessage(outboxId, { tenantId });
    assert.strictEqual(replayed, true, 'replayOutboxMessage must return true');

    // 3. Verify record was reset to PENDING and eligible for immediate claim
    const record = await (prisma as any).$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
      return tx.platformOutboxMessage.findUnique({ where: { id: outboxId } });
    });
    assert.strictEqual(record?.status, 'PENDING');
    assert.strictEqual(record?.retryCount, 0);
    assert.strictEqual(record?.lastError, null);
    assert.strictEqual(record?.id, outboxId, 'Original event ID must be preserved');
    assert.deepStrictEqual(record?.payload, originalPayload, 'Original payload must be preserved');

    // 4. Verify claim sweep picks up the replayed message
    const claims = await claimPendingOutboxMessages({
      workerId: 'worker_post_replay',
      limit: 1,
      tenantId,
    });
    assert.strictEqual(claims.length, 1);
    assert.strictEqual(claims[0]!.id, outboxId);
  });
});
