import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { after, before, beforeEach, describe, it } from 'node:test';
import { Prisma, PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';
import { POST as postRazorpayWebhook } from '@/app/api/v1/billing/webhook/razorpay/route';
import { sweepBillingGrace } from '@/lib/billing-grace-sweep';
import type { RazorpayWebhookEvent } from '@/lib/phase6-razorpay-billing';

if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'prisma') {
describe('Phase 6 durable Razorpay webhook', () => {
  const runtimeUrl = process.env.APP_DATABASE_URL || process.env.DATABASE_URL;
  const maintenanceUrl = process.env.MAINTENANCE_DATABASE_URL;
  const ownerUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!runtimeUrl || !maintenanceUrl || !ownerUrl) {
    throw new Error('APP_DATABASE_URL, MAINTENANCE_DATABASE_URL, and TEST_DATABASE_URL are required.');
  }

  const runtime = new PrismaClient({ datasourceUrl: runtimeUrl });
  const maintenance = new PrismaClient({ datasourceUrl: maintenanceUrl });
  const owner = new PrismaClient({ datasourceUrl: ownerUrl });
  const run = crypto.randomUUID().replaceAll('-', '');
  const organizationId = `org_${run}`;
  const projectId = `project_${run}`;
  const environmentId = `environment_${run}`;
  const tenantId = `org/${organizationId}/project/${projectId}/environment/${environmentId}`;
  const pluginId = '@orbitox/hms';
  const planId = `phase6-billing-${run}`;
  const razorpayPlanId = `plan_${run}`;
  const subscriptionId = `sub_${run}`;
  const webhookSecret = crypto.randomBytes(32).toString('hex');
  let latestEventAt = 0;

  before(async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;
    process.env.ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
    await owner.platformOrganization.create({
      data: {
        id: organizationId,
        slug: `billing-${run}`,
        name: 'Phase 6 Billing Test',
        billingEmail: `billing-${run}@example.invalid`,
      },
    });
    await owner.platformProject.create({
      data: {
        id: projectId,
        slug: `billing-${run}`,
        name: 'Phase 6 Billing Project',
        organizationId,
        businessModel: 'HEALTHCARE_NETWORK',
        planTier: 'starter',
        technicalLead: 'Billing Test',
        contactEmail: `billing-${run}@example.invalid`,
      },
    });
    await owner.projectEnvironment.create({
      data: {
        id: environmentId,
        projectId,
        slug: 'production',
        name: 'Production',
      },
    });
    await maintenance.plugin.upsert({
      where: { pluginId },
      create: { pluginId, name: 'HospitalOS' },
      update: {},
    });
    await maintenance.plan.create({
      data: {
        planId,
        pluginId,
        name: 'Phase 6 billing test',
        tier: 'starter',
        gracePeriodDays: 7,
        suspensionGraceDays: 30,
      },
    });
    await maintenance.billingPlanMap.create({
      data: {
        razorpayPlanId,
        pluginId,
        internalPlanId: planId,
        amountMinor: 100,
        currency: 'INR',
        period: 'monthly',
        interval: 1,
      },
    });
    await withRuntimeTenant((tx) => tx.pluginInstallation.create({
      data: {
        tenantId,
        runtimeTenantId: tenantId,
        pluginId,
        status: 'ACTIVE',
        entitlementRevision: 1,
        planId,
      },
    }));
    await runtime.billingSubscription.create({
      data: {
        razorpaySubscriptionId: subscriptionId,
        organizationId,
        tenantId,
        pluginId,
        razorpayPlanId,
        status: 'active',
        currentEnd: new Date(Date.now() + 40 * 86_400_000),
        lastEventAt: BigInt(Math.floor(Date.now() / 1000) - 10),
      },
    });
  });

  beforeEach(async () => {
    latestEventAt = Math.floor(Date.now() / 1000);
    await runtime.billingSubscription.update({
      where: { razorpaySubscriptionId: subscriptionId },
      data: {
        status: 'active',
        currentEnd: new Date((latestEventAt + 40 * 86_400) * 1000),
        graceStartedAt: null,
        lastEventAt: BigInt(latestEventAt - 10),
      },
    });
    await withRuntimeTenant((tx) => tx.pluginInstallation.update({
      where: { tenantId_pluginId: { tenantId, pluginId } },
      data: { status: 'ACTIVE', planId, entitlementRevision: 1 },
    }));
  });

  async function readInstallation() {
    return withRuntimeTenant((tx) => tx.pluginInstallation.findUniqueOrThrow({
      where: { tenantId_pluginId: { tenantId, pluginId } },
    }));
  }

  async function withRuntimeTenant<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return runtime.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
      return work(tx);
    });
  }

  after(async () => {
    await owner.platformOutboxMessage.deleteMany({ where: { tenantId } });
    await owner.platformAuditEvent.deleteMany({ where: { organizationId } });
    await owner.billingWebhookEvent.deleteMany({ where: { eventId: { startsWith: `evt_${run}_` } } });
    await owner.billingUnknownEvent.deleteMany({ where: { eventId: { startsWith: `evt_${run}_` } } });
    await owner.billingSubscription.deleteMany({ where: { razorpaySubscriptionId: subscriptionId } });
    await owner.pluginInstallation.deleteMany({ where: { tenantId, pluginId } });
    await owner.billingGraceSweepLease.deleteMany({ where: { id: 'global' } });
    await owner.billingPlanMap.deleteMany({ where: { razorpayPlanId: { startsWith: 'plan_' + run } } });
    await owner.plan.deleteMany({ where: { planId } });
    await owner.platformOrganization.deleteMany({ where: { id: organizationId } });
    await owner.accountEmailOutbox.deleteMany({ where: { recipient: `billing-${run}@example.invalid` } });
    await Promise.all([runtime.$disconnect(), maintenance.$disconnect(), owner.$disconnect()]);
  });

  it('records each event durably and treats duplicate ids as no-ops', async () => {
    const body = subscriptionEvent('subscription.pending', latestEventAt, subscriptionId);
    const first = await postRazorpayWebhook(createRequest(body));
    const second = await postRazorpayWebhook(createRequest(body));
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal((await second.json()).duplicate, true);
    assert.equal(await owner.billingWebhookEvent.count({ where: { eventId: body.id } }), 1);
    assert.equal((await runtime.billingSubscription.findUniqueOrThrow({
      where: { razorpaySubscriptionId: subscriptionId },
    })).graceStartedAt?.getTime(), latestEventAt * 1000);
  });

  it('applies consecutive webhook timestamps beyond the 32-bit epoch limit', async () => {
    for (const createdAt of [2_200_000_000, 2_200_000_001]) {
      const event = subscriptionEvent('subscription.charged', createdAt, subscriptionId);
      const response = await postRazorpayWebhook(createRequest(event));
      assert.equal(response.status, 200);
      assert.equal((await response.json()).applied, true);
      assert.equal(
        (await runtime.billingSubscription.findUniqueOrThrow({
          where: { razorpaySubscriptionId: subscriptionId },
        })).lastEventAt,
        BigInt(createdAt),
      );
    }
  });

  it('does not trust notes to apply an unknown subscription to another tenant', async () => {
    const body = subscriptionEvent('subscription.activated', latestEventAt, 'sub_unknown', {
      notes: { tenantId, pluginId, planId: 'enterprise' },
    });
    const response = await postRazorpayWebhook(createRequest(body));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).reason, 'UNKNOWN_SUBSCRIPTION');
    assert.equal((await readInstallation()).status, 'ACTIVE');
    assert.equal(await owner.billingUnknownEvent.count({ where: { eventId: body.id } }), 1);
  });

  it('serializes competing delivery and ignores an out-of-order event', async () => {
    const firstEvent = subscriptionEvent('subscription.paused', latestEventAt, subscriptionId);
    const deliveries = await Promise.all(
      Array.from({ length: 3 }, () => postRazorpayWebhook(createRequest(firstEvent))),
    );
    assert.equal(deliveries.filter((response) => response.status === 200).length, 3);
    const bodies = await Promise.all(deliveries.map((response) => response.json()));
    assert.equal(bodies.filter((body) => body.duplicate).length, 2);
    assert.equal((await readInstallation()).status, 'READ_ONLY');

    const olderEvent = subscriptionEvent('subscription.charged', latestEventAt - 1, subscriptionId);
    const olderResponse = await postRazorpayWebhook(createRequest(olderEvent));
    assert.equal((await olderResponse.json()).reason, 'STALE_OR_DUPLICATE');
    assert.equal((await readInstallation()).status, 'READ_ONLY');
  });

  it('keeps access through the paid period after cancellation', async () => {
    const paidThrough = latestEventAt + 10 * 86_400;
    const event = subscriptionEvent('subscription.cancelled', latestEventAt, subscriptionId, {
      current_end: paidThrough,
    });
    const response = await postRazorpayWebhook(createRequest(event));
    assert.equal(response.status, 200);
    assert.equal((await readInstallation()).status, 'ACTIVE');
    assert.equal((await runtime.billingSubscription.findUniqueOrThrow({
      where: { razorpaySubscriptionId: subscriptionId },
    })).cancelAtPeriodEnd, true);
  });

  it('sends payment failure notices without starting grace or changing subscription state', async () => {
    const body: RazorpayWebhookEvent = {
      id: `evt_${run}_${crypto.randomUUID()}`,
      event: 'payment.failed',
      created_at: latestEventAt,
      payload: { payment: { entity: { id: `pay_${run}`, subscription_id: subscriptionId } } },
    };
    const response = await postRazorpayWebhook(createRequest(body));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).reason, 'PAYMENT_FAILED_NOTICE_QUEUED');
    const persisted = await runtime.billingSubscription.findUniqueOrThrow({
      where: { razorpaySubscriptionId: subscriptionId },
    });
    assert.equal(persisted.status, 'active');
    assert.equal(persisted.graceStartedAt, null);
    assert.equal(persisted.lastEventAt, BigInt(latestEventAt - 10));
    assert.equal(await owner.accountEmailOutbox.count({
      where: { recipient: `billing-${run}@example.invalid`, template: 'PAYMENT_FAILED' },
    }), 1);
  });

  it('uses a maintenance lease and transitions expired grace in one sweep', async () => {
    const now = new Date();
    await maintenance.billingGraceSweepLease.create({
      data: {
        id: 'global',
        leaseOwner: `other-${run}`,
        leaseExpiresAt: new Date(now.getTime() + 60_000),
      },
    });
    assert.deepEqual(await sweepBillingGrace(runtime, maintenance, now), {
      acquired: false,
      scanned: 0,
      transitioned: 0,
    });
    await owner.billingGraceSweepLease.deleteMany({ where: { id: 'global' } });

    await runtime.billingSubscription.update({
      where: { razorpaySubscriptionId: subscriptionId },
      data: {
        status: 'pending',
        graceStartedAt: new Date(now.getTime() - 31 * 86_400_000),
      },
    });
    const result = await sweepBillingGrace(runtime, maintenance, now);
    assert.equal(result.acquired, true);
    assert.equal(result.scanned, 1);
    assert.equal(result.transitioned, 1);
    assert.equal((await readInstallation()).status, 'SUSPENDED');
    assert.equal(await owner.platformAuditEvent.count({
      where: { organizationId, action: 'billing.subscription.grace_sweep_transition' },
    }), 1);
  });

  it('stores unmapped plan changes without changing the installation', async () => {
    const event = subscriptionEvent('subscription.updated', latestEventAt, subscriptionId, {
      plan_id: 'plan_unmapped',
      notes: { planId: razorpayPlanId },
    });
    const response = await postRazorpayWebhook(createRequest(event));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).reason, 'UNMAPPED_PLAN_CHANGE');
    assert.equal((await readInstallation()).planId, planId);
    assert.equal(await owner.billingUnknownEvent.count({ where: { eventId: event.id } }), 1);
  });

  it('rejects invalid signatures and increments the durable alert metric', async () => {
    const event = subscriptionEvent('subscription.charged', latestEventAt, subscriptionId);
    const response = await postRazorpayWebhook(createRequest(event, '0'.repeat(64)));
    assert.equal(response.status, 401);
    const rawBody = JSON.stringify(event);
    const validSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    const changedBody = await postRazorpayWebhook(createRequest(event, validSignature, `${rawBody} `));
    assert.equal(changedBody.status, 401);
    assert.ok(await owner.billingWebhookAlertMetric.findUnique({ where: { name: 'invalid_signature' } }));
  });

  function subscriptionEvent(
    type: string,
    createdAt: number,
    id: string,
    entity: Record<string, unknown> = {},
  ) {
    return {
      id: `evt_${run}_${crypto.randomUUID()}`,
      event: type,
      created_at: createdAt,
      payload: {
        subscription: {
          entity: {
            id,
              status: type === 'subscription.charged' ? 'active' : type.split('.')[1],
            plan_id: razorpayPlanId,
            current_end: latestEventAt + 40 * 86_400,
            ...entity,
          },
        },
      },
    };
  }

  function createRequest(
    event: RazorpayWebhookEvent,
    signature?: string,
    raw = JSON.stringify(event),
  ): NextRequest {
    return new NextRequest('http://127.0.0.1:3005/api/v1/billing/webhook/razorpay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': signature ??
          crypto.createHmac('sha256', webhookSecret).update(raw).digest('hex'),
      },
      body: raw,
    });
  }
});
}
