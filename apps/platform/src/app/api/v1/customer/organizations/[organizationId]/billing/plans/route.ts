import { NextResponse } from 'next/server';
import { withCustomerAuth } from '@/server/auth/customer-auth';
import {
  canCustomerDashboardAction,
  getCustomerOrganizationRole,
  noStoreHeaders,
} from '@/server/organizations/customer-dashboard';
import { prisma } from '@/server/db/prisma';

type RouteContext = { params: Promise<{ organizationId: string }> };

export const GET = withCustomerAuth<RouteContext>(async (_request, session, context) => {
  const { organizationId } = await context.params;
  const role = await getCustomerOrganizationRole(organizationId, session.userId);
  if (!role) {
    return NextResponse.json({ ok: false, error: 'ORGANIZATION_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  }
  if (!canCustomerDashboardAction(role, 'readBilling')) {
    return NextResponse.json({ ok: false, error: 'BILLING_ACCESS_FORBIDDEN' }, { status: 403, headers: noStoreHeaders() });
  }

  const [org, plans, planMaps, subscriptions, projects] = await Promise.all([
    prisma.platformOrganization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, slug: true, gstin: true },
    }),
    prisma.plan.findMany({
      where: {
        status: 'ACTIVE',
        NOT: { planId: { startsWith: 'custom-plan-' } },
      },
      include: {
        features: true,
        quotas: true,
      },
      orderBy: [{ priceMinor: 'asc' }, { planId: 'asc' }],
    }),
    prisma.billingPlanMap.findMany({
      where: { active: true },
      orderBy: [{ amountMinor: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.billingSubscription.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
      select: {
        razorpaySubscriptionId: true,
        tenantId: true,
        pluginId: true,
        status: true,
        currentStart: true,
        currentEnd: true,
        cancelAtPeriodEnd: true,
        planMap: {
          select: {
            razorpayPlanId: true,
            internalPlanId: true,
            amountMinor: true,
            currency: true,
            period: true,
            interval: true,
          },
        },
      },
    }),
    prisma.platformProject.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        planTier: true,
        monthlyApiCalls: true,
        apiCallQuota: true,
        environments: { select: { id: true, name: true, slug: true } },
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    role,
    canChangeBillingPlan: canCustomerDashboardAction(role, 'changeBillingPlan'),
    organization: org,
    plans: plans.map((p) => ({
      id: p.id,
      planId: p.planId,
      pluginId: p.pluginId,
      name: p.name,
      description: p.description,
      tier: p.tier,
      priceMinor: p.priceMinor,
      currency: p.currency,
      billingInterval: p.billingInterval,
      gracePeriodDays: p.gracePeriodDays,
      features: p.features.map((f) => ({
        featureKey: f.featureKey,
        description: f.description,
        enabled: f.enabled,
      })),
      quotas: p.quotas.map((q) => ({
        quotaKey: q.quotaKey,
        limit: q.limit,
        window: q.window,
        unit: q.unit,
      })),
    })),
    billingPlanMaps: planMaps.map((m) => ({
      razorpayPlanId: m.razorpayPlanId,
      pluginId: m.pluginId,
      internalPlanId: m.internalPlanId,
      amountMinor: m.amountMinor,
      currency: m.currency,
      period: m.period,
      interval: m.interval,
    })),
    subscriptions,
    projects: projects.map((pr) => ({
      ...pr,
      monthlyApiCalls: pr.monthlyApiCalls.toString(),
      apiCallQuota: pr.apiCallQuota?.toString() ?? null,
    })),
  }, { headers: noStoreHeaders() });
}, { write: false });
