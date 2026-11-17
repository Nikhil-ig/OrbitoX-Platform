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
import { prisma } from '@/server/db/prisma';
import { platformRepository } from '@/server/db/platform-repository';
import { operationStore } from '@/server/provisioning/operation-store';
import {
  dispatchOutboxMessage,
  dispatchPendingOutboxMessages,
  getAuthoritativeWebhookSecret,
  getEmittedWebhooks,
  clearEmittedWebhooks,
} from '@/server/provisioning/webhook-emitter';
import { PlatformOperationRecord } from '@/server/provisioning/types';

describe('Phase 4: Persistent Outbox & Webhook Reliability', () => {
  let testOrg: any;
  const createdOpIds: string[] = [];

  before(async () => {
    const slug = `whk-org-${crypto.randomBytes(4).toString('hex')}`;
    testOrg = await platformRepository.createOrganization({
      name: `Webhook Test Org ${slug}`,
      slug,
      billingEmail: `billing-${slug}@orbitox.io`,
    });
  });

  after(async () => {
    delete process.env.ORBITOX_WEBHOOK_URL;
    delete process.env.ORBITOX_WEBHOOK_SECRET;
  });

  it('27. Persistent outbox authoritative delivery with stable event ID and receiver idempotency', async () => {
    clearEmittedWebhooks();
    const headersReceived: Record<string, string> = {};
    let receivedBody: any = null;

    const server = http.createServer((req, res) => {
      for (const [k, v] of Object.entries(req.headers)) {
        if (typeof v === 'string') {
          headersReceived[k] = v;
        }
      }
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        try {
          receivedBody = JSON.parse(raw);
        } catch { }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      });
    });

    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    const port = (server.address() as any).port;

    const oldUrl = process.env.ORBITOX_WEBHOOK_URL;
    const oldSecret = process.env.ORBITOX_WEBHOOK_SECRET;
    process.env.ORBITOX_WEBHOOK_URL = `http://127.0.0.1:${port}/webhook`;
    process.env.ORBITOX_WEBHOOK_SECRET = 'orb_test_webhook_signing_preview_01';

    try {
      const tenantId = `org/${testOrg.id}/project/whk-proj/environment/production`;
      const stableOutboxId = `outbox_stable_${crypto.randomUUID()}`;

      // Create outbox message record in DB if in Prisma mode
      if (process.env.ORBITOX_PLATFORM_REPOSITORY !== 'json') {
        await (prisma as any).$transaction(async (tx: any) => {
          await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
          await tx.platformOutboxMessage.create({
            data: {
              id: stableOutboxId,
              tenantId,
              eventType: 'tenant.ready',
              aggregateType: 'TENANT',
              aggregateId: tenantId,
              payload: { tenantId, status: 'ACTIVE' },
              status: 'PENDING',
            },
          });
        });
      }

      const delivery = await dispatchOutboxMessage({
        id: stableOutboxId,
        eventType: 'tenant.ready',
        tenantId,
        payload: { tenantId, status: 'ACTIVE' },
      });

      assert.strictEqual(delivery.delivered, true, 'Delivery must succeed');
      assert.strictEqual(delivery.id, stableOutboxId, 'Delivery id must equal authoritative outbox id');

      // Verify headers
      assert.strictEqual(headersReceived['x-orbitox-delivery-id'], stableOutboxId);
      assert.strictEqual(headersReceived['x-orbitox-event-id'], stableOutboxId);
      assert.strictEqual(headersReceived['x-orbitox-event'], 'tenant.ready');
      assert.ok(headersReceived['x-orbitox-signature'], 'Signature header must be present');
      assert.ok(headersReceived['x-orbitox-timestamp'], 'Timestamp header must be present');

      // Verify HMAC-SHA256 signature validity
      const expectedSig = crypto
        .createHmac('sha256', 'orb_test_webhook_signing_preview_01')
        .update(JSON.stringify(receivedBody))
        .digest('hex');
      assert.strictEqual(headersReceived['x-orbitox-signature'], expectedSig);

      // Verify DB record status is DISPATCHED in Prisma mode
      if (process.env.ORBITOX_PLATFORM_REPOSITORY !== 'json') {
        const outboxRecord = await (prisma as any).$transaction(async (tx: any) => {
          await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
          return tx.platformOutboxMessage.findUnique({ where: { id: stableOutboxId } });
        });
        assert.strictEqual(outboxRecord?.status, 'DISPATCHED');
        assert.ok(outboxRecord?.dispatchedAt);
      }
    } finally {
      server.close();
      if (oldUrl) process.env.ORBITOX_WEBHOOK_URL = oldUrl;
      else delete process.env.ORBITOX_WEBHOOK_URL;
      if (oldSecret) process.env.ORBITOX_WEBHOOK_SECRET = oldSecret;
      else delete process.env.ORBITOX_WEBHOOK_SECRET;
    }
  });

  it('28. Fail-closed on missing/weak webhook signing secret', async () => {
    const oldUrl = process.env.ORBITOX_WEBHOOK_URL;
    const oldSecret = process.env.ORBITOX_WEBHOOK_SECRET;

    process.env.ORBITOX_WEBHOOK_URL = 'http://127.0.0.1:9999/webhook';

    try {
      // 1. Missing secret
      delete process.env.ORBITOX_WEBHOOK_SECRET;
      assert.throws(
        () => getAuthoritativeWebhookSecret(),
        /ORBITOX_WEBHOOK_SECRET is required/
      );

      await assert.rejects(
        () =>
          dispatchOutboxMessage({
            id: 'whk_test_missing_secret',
            eventType: 'tenant.ready',
            tenantId: 'test_tenant',
            payload: {},
          }),
        /ORBITOX_WEBHOOK_SECRET is required/
      );

      // 2. Weak secret (< 32 chars)
      process.env.ORBITOX_WEBHOOK_SECRET = 'orb_test_sample_secret_12345'; // 29 chars, < 32
      assert.throws(
        () => getAuthoritativeWebhookSecret(),
        /min 32 characters/
      );

      await assert.rejects(
        () =>
          dispatchOutboxMessage({
            id: 'whk_test_weak_secret',
            eventType: 'tenant.ready',
            tenantId: 'test_tenant',
            payload: {},
          }),
        /min 32 characters/
      );

      // 3. Valid secret (>= 32 chars) succeeds
      process.env.ORBITOX_WEBHOOK_SECRET = 'orb_test_webhook_signing_preview_01';
      const valid = getAuthoritativeWebhookSecret();
      assert.strictEqual(valid, 'orb_test_webhook_signing_preview_01');
    } finally {
      if (oldUrl) process.env.ORBITOX_WEBHOOK_URL = oldUrl;
      else delete process.env.ORBITOX_WEBHOOK_URL;
      if (oldSecret) process.env.ORBITOX_WEBHOOK_SECRET = oldSecret;
      else delete process.env.ORBITOX_WEBHOOK_SECRET;
    }
  });

  it('29. Database-level event deduplication: duplicate activations reuse existing outbox record', async () => {
    const slug = `dedup-proj-${crypto.randomBytes(4).toString('hex')}`;
    const opId1 = `op_dedup_1_${crypto.randomBytes(6).toString('hex')}`;
    const opId2 = `op_dedup_2_${crypto.randomBytes(6).toString('hex')}`;
    createdOpIds.push(opId1, opId2);

    const created = await platformRepository.createProject({
      name: `Dedup Project ${slug}`,
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
    const worker1 = 'worker_dedup_1:att_1';
    const worker2 = 'worker_dedup_2:att_2';

    const baseOp: PlatformOperationRecord = {
      id: opId1,
      type: 'TENANT_PROVISION',
      tenantId,
      organizationId: testOrg.id,
      status: 'PROVISIONING',
      leaseOwner: worker1,
      leaseExpiresAt: new Date(Date.now() + 10000).toISOString(),
      steps: [{ id: '1', name: 'Step 1', status: 'COMPLETED' }],
      request: { name: `Dedup ${slug}`, slug, plugins: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await operationStore.createOperation(baseOp);

    // First finalization
    const result1 = await operationStore.finalizeProjectActivationAndOutbox({
      operationId: opId1,
      expectedLeaseOwner: worker1,
      projectId,
      tenantId,
      organizationId: testOrg.id,
      cleanSlug: slug,
      environmentSlug: 'production',
      plugins: [],
      steps: baseOp.steps,
    });

    assert.ok(result1.outboxMessageId, 'First activation must return an outbox message ID');

    // Second operation for same tenant
    const secondOp: PlatformOperationRecord = {
      ...baseOp,
      id: opId2,
      leaseOwner: worker2,
    };
    await operationStore.createOperation(secondOp);

    // Second finalization for same tenant
    const result2 = await operationStore.finalizeProjectActivationAndOutbox({
      operationId: opId2,
      expectedLeaseOwner: worker2,
      projectId,
      tenantId,
      organizationId: testOrg.id,
      cleanSlug: slug,
      environmentSlug: 'production',
      plugins: [],
      steps: secondOp.steps,
    });

    if (process.env.ORBITOX_PLATFORM_REPOSITORY !== 'json') {
      // In Prisma/PostgreSQL, the outbox record is deduplicated and the same ID is returned
      assert.strictEqual(result2.outboxMessageId, result1.outboxMessageId, 'Duplicate activation must reuse existing outbox record');

      const outboxMsgs = await (prisma as any).$transaction(async (tx: any) => {
        await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
        return tx.platformOutboxMessage.findMany({
          where: { tenantId, eventType: 'tenant.ready' },
        });
      });
      assert.strictEqual(outboxMsgs.length, 1, 'Total outbox records for tenant.ready must remain exactly 1');
    }
  });

  it('30. Crash recovery: commit-before-delivery recovers pending outbox message and dispatches on recovery sweep', async () => {
    if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'json') {
      return; // Crash recovery of persistent DB outbox applies to PostgreSQL mode
    }

    clearEmittedWebhooks();
    const slug = `crash-rec-${crypto.randomBytes(4).toString('hex')}`;
    const tenantId = `org/${testOrg.id}/project/${slug}/environment/production`;
    const outboxId = `outbox_crash_${crypto.randomUUID()}`;

    // 1. Transaction committed outbox record in PENDING status, but server crashed before dispatching
    await (prisma as any).$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
      await tx.platformOutboxMessage.create({
        data: {
          id: outboxId,
          tenantId,
          eventType: 'tenant.ready',
          aggregateType: 'TENANT',
          aggregateId: tenantId,
          payload: { tenantId, recovered: true },
          status: 'PENDING',
          retryCount: 0,
        },
      });
    });

    // 2. Run recovery sweep
    const dispatched = await dispatchPendingOutboxMessages({ tenantId });
    assert.strictEqual(dispatched >= 1, true, 'Recovery sweep must process at least 1 pending outbox message');

    // 3. Verify outbox message is now DISPATCHED
    const record = await (prisma as any).$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
      return tx.platformOutboxMessage.findUnique({ where: { id: outboxId } });
    });
    assert.strictEqual(record?.status, 'DISPATCHED');
    assert.ok(record?.dispatchedAt);
  });

  it('31. Dead-letter handling after retry limit exceeded', async () => {
    if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'json') {
      return; // DB outbox dead-lettering applies to PostgreSQL mode
    }

    // Set up a failing mock webhook endpoint (returns 500)
    const server = http.createServer((req, res) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    });

    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    const port = (server.address() as any).port;

    const oldUrl = process.env.ORBITOX_WEBHOOK_URL;
    const oldSecret = process.env.ORBITOX_WEBHOOK_SECRET;
    process.env.ORBITOX_WEBHOOK_URL = `http://127.0.0.1:${port}/webhook`;
    process.env.ORBITOX_WEBHOOK_SECRET = 'orb_test_webhook_signing_preview_01';

    const tenantId = `org/${testOrg.id}/project/dead-letter/environment/production`;
    const outboxId = `outbox_dead_${crypto.randomUUID()}`;

    try {
      // 1. Create outbox record with retryCount = 4
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
          },
        });
      });

      // 2. Dispatch fails (5th attempt)
      const delivery = await dispatchOutboxMessage({
        id: outboxId,
        eventType: 'tenant.ready',
        tenantId,
        payload: { tenantId },
        retryCount: 4,
      });

      assert.strictEqual(delivery.delivered, false, 'Dispatch must fail');

      // 3. Verify record transitioned to FAILED (dead-letter)
      const record = await (prisma as any).$transaction(async (tx: any) => {
        await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
        return tx.platformOutboxMessage.findUnique({ where: { id: outboxId } });
      });
      assert.strictEqual(record?.status, 'FAILED', 'Status must be FAILED after exceeding 5 retries');
      assert.strictEqual(record?.retryCount, 5);
      assert.ok(record?.lastError?.includes('500'), 'Last error must be recorded');

      // 4. Verify recovery sweep skips FAILED messages
      const recoveredCount = await dispatchPendingOutboxMessages({ tenantId });
      assert.strictEqual(recoveredCount, 0, 'Recovery sweep must not pick up FAILED messages');
    } finally {
      server.close();
      if (oldUrl) process.env.ORBITOX_WEBHOOK_URL = oldUrl;
      else delete process.env.ORBITOX_WEBHOOK_URL;
      if (oldSecret) process.env.ORBITOX_WEBHOOK_SECRET = oldSecret;
      else delete process.env.ORBITOX_WEBHOOK_SECRET;
    }
  });
});
