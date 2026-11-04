import { NextResponse } from 'next/server';
import { withCustomerAuth } from '@/lib/customer-auth';
import { getCustomerOrganizationRole, noStoreHeaders } from '@/lib/customer-dashboard';
import { prisma } from '@/lib/prisma';
import { tenantBelongsToOrganization } from '@/lib/billing-tenant';

type RouteContext = {
  params: Promise<{ organizationId: string; projectId: string; environmentId: string }>;
};

export const GET = withCustomerAuth<RouteContext>(async (_request, session, context) => {
  const { organizationId, projectId, environmentId } = await context.params;
  if (!await getCustomerOrganizationRole(organizationId, session.userId)) {
    return NextResponse.json({ ok: false, error: 'ORGANIZATION_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  }
  const tenantId = `org/${organizationId}/project/${projectId}/environment/${environmentId}`;
  const detail = await prisma.$transaction(async (tx) => {
    const scope = await tenantBelongsToOrganization(tx, tenantId, organizationId);
    if (!scope) return null;
    await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
    const [project, installations, subscriptions] = await Promise.all([
      tx.platformProject.findFirst({
        where: { id: projectId, organizationId },
        select: {
          id: true, slug: true, name: true, status: true, plan: true, planTier: true,
          monthlyApiCalls: true, apiCallQuota: true,
          environments: {
            where: { id: environmentId },
            select: { id: true, slug: true, name: true, isProduction: true },
          },
        },
      }),
      tx.pluginInstallation.findMany({
        where: { tenantId },
        select: { pluginId: true, status: true, statusReason: true, planId: true },
      }),
      tx.billingSubscription.findMany({
        where: { tenantId },
        orderBy: { updatedAt: 'desc' },
        select: {
          pluginId: true, status: true, currentStart: true, currentEnd: true,
          cancelAtPeriodEnd: true, graceStartedAt: true,
          planMap: { select: { internalPlanId: true, amountMinor: true, currency: true, period: true, interval: true } },
        },
      }),
    ]);
    return project?.environments.length
      ? { scope, project, installations, subscriptions }
      : null;
  });
  if (!detail) return NextResponse.json({ ok: false, error: 'TENANT_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  return NextResponse.json({
    ok: true,
    tenantId,
    project: {
      id: detail.project.id,
      slug: detail.project.slug,
      name: detail.project.name,
      status: detail.project.status,
      plan: detail.project.plan,
      planTier: detail.project.planTier,
      monthlyApiCalls: detail.project.monthlyApiCalls.toString(),
      apiCallQuota: detail.project.apiCallQuota?.toString() ?? null,
    },
    environment: detail.project.environments[0],
    plugins: detail.installations.map((installation) => {
      const subscription = detail.subscriptions.find((row) => row.pluginId === installation.pluginId);
      return {
        pluginId: installation.pluginId,
        status: installation.status,
        suspensionReason: installation.statusReason,
        planId: subscription?.planMap.internalPlanId || installation.planId,
        subscription: subscription ? {
          status: subscription.status,
          currentStart: subscription.currentStart,
          currentEnd: subscription.currentEnd,
          graceStartedAt: subscription.graceStartedAt,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          plan: {
            amountMinor: subscription.planMap.amountMinor,
            currency: subscription.planMap.currency,
            period: subscription.planMap.period,
            interval: subscription.planMap.interval,
          },
        } : null,
      };
    }),
  }, { headers: noStoreHeaders() });
}, { write: false });
