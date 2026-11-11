import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';
import { POST as postCheckout } from '@/app/api/v1/customer/organizations/[organizationId]/billing/checkout/route';
import {
  CUSTOMER_CSRF_COOKIE,
  CUSTOMER_SESSION_COOKIE,
} from '@/lib/phase6-account-service';
import { newSessionTokens } from '@/lib/phase6-account-security';

if (process.env.ORBITOX_PLATFORM_REPOSITORY === 'prisma') {
  describe('Phase 6 Razorpay checkout idempotency', () => {
    const ownerUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
    const runtimeUrl = process.env.APP_DATABASE_URL || process.env.DATABASE_URL;
    const maintenanceUrl = process.env.MAINTENANCE_DATABASE_URL;
    if (!ownerUrl || !runtimeUrl || !maintenanceUrl) {
      throw new Error('TEST_DATABASE_URL/DATABASE_URL, APP_DATABASE_URL, and MAINTENANCE_DATABASE_URL are required.');
    }

    const owner = new PrismaClient({ datasourceUrl: ownerUrl });
    const runtime = new PrismaClient({ datasourceUrl: runtimeUrl });
    const maintenance = new PrismaClient({ datasourceUrl: maintenanceUrl });
    const run = crypto.randomUUID().replaceAll('-', '');
    const organizationId = `checkout_org_${run}`;
    const projectId = `checkout_project_${run}`;
    const environmentId = `checkout_environment_${run}`;
    const tenantId = `org/${organizationId}/project/${projectId}/environment/${environmentId}`;
    const pluginId = '@orbitox/hms';
    const planId = `phase6-checkout-${run}`;
    const razorpayPlanId = `plan_${run}`;
    const subscriptionId = `sub_${run}`;
    const idempotencyKey = `checkout-${run}`;
    const email = `checkout-${run}@example.invalid`;
    let sessionToken = '';
    let csrfToken = '';

    before(async () => {
      process.env.RAZORPAY_KEY_ID = 'rzp_test_phase6checkout';
      process.env.RAZORPAY_KEY_SECRET = crypto.randomBytes(32).toString('hex');
      const now = new Date();
      await owner.platformOrganization.create({
        data: {
          id: organizationId,
          slug: `checkout-${run}`,
          name: 'Phase 6 checkout test',
          billingEmail: email,
        },
      });
      await owner.platformProject.create({
        data: {
          id: projectId,
          slug: `checkout-${run}`,
          name: 'Phase 6 checkout project',
          organizationId,
          businessModel: 'HEALTHCARE_NETWORK',
          planTier: 'starter',
          technicalLead: 'Checkout Test',
          contactEmail: email,
        },
      });
      await owner.projectEnvironment.create({
        data: { id: environmentId, projectId, slug: 'production', name: 'Production' },
      });
      const user = await owner.customerUser.create({
        data: {
          email,
          emailVerifiedAt: now,
          mfaTotpSealed: 'test-sealed-totp',
        },
        select: { id: true },
      });
      await owner.customerMembership.create({
        data: { organizationId, userId: user.id, role: 'OWNER' },
      });
      const tokens = newSessionTokens();
      sessionToken = tokens.sessionToken;
      csrfToken = tokens.csrfToken;
      await owner.customerSession.create({
        data: {
          userId: user.id,
          tokenHash: tokens.sessionTokenHash,
          csrfTokenHash: tokens.csrfTokenHash,
          idleExpiresAt: new Date(now.getTime() + 60 * 60 * 1000),
          absoluteExpiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          reauthenticatedAt: now,
          ipAddress: '192.0.2.2',
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
          name: 'Phase 6 checkout test',
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
      await runtime.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
        await tx.pluginInstallation.create({
          data: {
            tenantId,
            runtimeTenantId: tenantId,
            pluginId,
            status: 'ACTIVE',
            entitlementRevision: 1,
            planId,
          },
        });
      });
    });

    after(async () => {
      await owner.billingSubscription.deleteMany({ where: { razorpaySubscriptionId: subscriptionId } });
      await owner.tenantIdempotencyKey.deleteMany({
        where: { tenantId, scope: 'customer.billing.checkout', key: idempotencyKey },
      });
      await owner.pluginInstallation.deleteMany({ where: { tenantId, pluginId } });
      await owner.billingPlanMap.deleteMany({ where: { razorpayPlanId } });
      await owner.plan.deleteMany({ where: { planId } });
      const user = await owner.customerUser.findFirst({ where: { email }, select: { id: true } });
      if (user) {
        await owner.customerSession.deleteMany({ where: { userId: user.id } });
      }
      if (await owner.platformOrganization.findUnique({ where: { id: organizationId }, select: { id: true } })) {
        await maintenance.$queryRaw`SELECT public.close_customer_organization(${organizationId})`;
      }
      if (user) await owner.customerUser.delete({ where: { id: user.id } });
      await Promise.all([owner.$disconnect(), runtime.$disconnect(), maintenance.$disconnect()]);
    });

    it('creates one provider subscription for two concurrent requests with the same idempotency key', async () => {
      const originalFetch = globalThis.fetch;
      let providerCalls = 0;
      globalThis.fetch = async (input, init) => {
        providerCalls += 1;
        assert.equal(String(input), 'https://api.razorpay.com/v1/subscriptions');
        assert.equal(new Headers(init?.headers).get('X-Idempotency-Key')?.startsWith('checkout_'), true);
        await new Promise((resolve) => setTimeout(resolve, 30));
        return new Response(JSON.stringify({
          id: subscriptionId,
          status: 'created',
          plan_id: razorpayPlanId,
          current_start: null,
          current_end: null,
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      };

      try {
        const [first, second] = await Promise.all([
          postCheckout(makeRequest(), { params: Promise.resolve({ organizationId }) }),
          postCheckout(makeRequest(), { params: Promise.resolve({ organizationId }) }),
        ]);
        assert.equal(first.status, 201);
        assert.equal(second.status, 201);
        const firstBody = await first.json();
        const secondBody = await second.json();
        assert.equal(firstBody.subscriptionId, subscriptionId);
        assert.equal(secondBody.subscriptionId, subscriptionId);
        assert.equal([firstBody, secondBody].filter((body) => body.replayed === true).length, 1);
        assert.equal(providerCalls, 1);
        assert.equal(await owner.billingSubscription.count({
          where: { tenantId, pluginId, razorpaySubscriptionId: subscriptionId },
        }), 1);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    function makeRequest(): NextRequest {
      return new NextRequest(
        `https://console.orbitox.test/api/v1/customer/organizations/${organizationId}/billing/checkout`,
        {
          method: 'POST',
          headers: {
            cookie: `${CUSTOMER_SESSION_COOKIE}=${sessionToken}; ${CUSTOMER_CSRF_COOKIE}=${csrfToken}`,
            origin: 'https://console.orbitox.test',
            'content-type': 'application/json',
            'x-csrf-token': csrfToken,
            'idempotency-key': idempotencyKey,
          },
          body: JSON.stringify({ tenantId, razorpayPlanId }),
        },
      );
    }
  });
}
