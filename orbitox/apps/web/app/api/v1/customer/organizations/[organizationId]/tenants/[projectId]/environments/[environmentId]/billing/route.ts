import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { withCustomerAuth } from '@/lib/customer-auth';
import {
  canCustomerDashboardAction,
  getCustomerOrganizationRole,
  noStoreHeaders,
} from '@/lib/customer-dashboard';
import { prisma } from '@/lib/prisma';
import { tenantBelongsToOrganization } from '@/lib/billing-tenant';
import { listRazorpayInvoices, listRazorpayPayments } from '@/lib/razorpay-client';

type RouteContext = {
  params: Promise<{ organizationId: string; projectId: string; environmentId: string }>;
};

export const GET = withCustomerAuth<RouteContext>(async (_request, session, context) => {
  const { organizationId, projectId, environmentId } = await context.params;
  const role = await getCustomerOrganizationRole(organizationId, session.userId);
  if (!role) return NextResponse.json({ ok: false, error: 'ORGANIZATION_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  if (!canCustomerDashboardAction(role, 'readBilling')) {
    return NextResponse.json({ ok: false, error: 'BILLING_ACCESS_FORBIDDEN' }, { status: 403, headers: noStoreHeaders() });
  }
  const tenantId = `org/${organizationId}/project/${projectId}/environment/${environmentId}`;
  const billing = await prisma.$transaction(async (tx) => {
    const scope = await tenantBelongsToOrganization(tx, tenantId, organizationId);
    if (!scope) return null;
    await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
    const subscription = await tx.billingSubscription.findFirst({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      select: {
        razorpaySubscriptionId: true,
        pluginId: true,
        status: true,
        currentStart: true,
        currentEnd: true,
        cancelAtPeriodEnd: true,
        graceStartedAt: true,
        planMap: {
          select: {
            internalPlanId: true,
            amountMinor: true,
            currency: true,
            period: true,
            interval: true,
          },
        },
      },
    });
    if (!subscription) return { subscription: null, cached: null as Prisma.JsonValue | null };
    const cacheKey = cacheKeyFor(subscription.razorpaySubscriptionId);
    const cache = await tx.billingProviderCache.findUnique({
      where: { tenantId_cacheKey: { tenantId, cacheKey } },
      select: { payload: true, expiresAt: true, subscriptionId: true },
    });
    return {
      subscription,
      cached: cache?.subscriptionId === subscription.razorpaySubscriptionId &&
          cache.expiresAt > new Date()
        ? cache.payload
        : null,
    };
  });
  if (!billing) return NextResponse.json({ ok: false, error: 'TENANT_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  if (!billing.subscription) {
    return NextResponse.json({
      ok: true,
      tenantId,
      subscription: null,
      invoices: [],
      payments: [],
      cached: false,
    }, { headers: noStoreHeaders() });
  }

  let activity: BillingActivity;
  let cached = false;
  const cachedActivity = parseBillingActivity(billing.cached);
  if (cachedActivity) {
    activity = cachedActivity;
    cached = true;
  } else {
    try {
      const [invoices, payments] = await Promise.all([
        listRazorpayInvoices(billing.subscription.razorpaySubscriptionId),
        listRazorpayPayments(billing.subscription.razorpaySubscriptionId),
      ]);
      activity = { invoices, payments };
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
        await tx.billingProviderCache.upsert({
          where: {
            tenantId_cacheKey: {
              tenantId,
              cacheKey: cacheKeyFor(billing.subscription!.razorpaySubscriptionId),
            },
          },
          create: {
            cacheKey: cacheKeyFor(billing.subscription!.razorpaySubscriptionId),
            tenantId,
            subscriptionId: billing.subscription!.razorpaySubscriptionId,
            payload: JSON.parse(JSON.stringify(activity)) as Prisma.InputJsonValue,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          },
          update: {
            payload: JSON.parse(JSON.stringify(activity)) as Prisma.InputJsonValue,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            updatedAt: new Date(),
          },
        });
      });
    } catch (error) {
      console.error('Unable to load cached Razorpay billing activity.', error);
      return NextResponse.json({ ok: false, error: 'BILLING_PROVIDER_UNAVAILABLE' }, { status: 502, headers: noStoreHeaders() });
    }
  }
  return NextResponse.json({
    ok: true,
    tenantId,
    subscription: {
      id: billing.subscription.razorpaySubscriptionId,
      pluginId: billing.subscription.pluginId,
      status: billing.subscription.status,
      currentStart: billing.subscription.currentStart,
      currentEnd: billing.subscription.currentEnd,
      graceStartedAt: billing.subscription.graceStartedAt,
      cancelAtPeriodEnd: billing.subscription.cancelAtPeriodEnd,
      plan: billing.subscription.planMap,
    },
    ...activity,
    cached,
  }, { headers: noStoreHeaders() });
}, { write: false });

interface BillingActivity {
  invoices: unknown[];
  payments: unknown[];
}

function parseBillingActivity(value: Prisma.JsonValue | null): BillingActivity | null {
  if (!isRecord(value) || !Array.isArray(value.invoices) || !Array.isArray(value.payments)) {
    return null;
  }
  return { invoices: value.invoices, payments: value.payments };
}

function cacheKeyFor(subscriptionId: string): string {
  return crypto.createHash('sha256').update(`razorpay:activity:${subscriptionId}`).digest('hex');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
