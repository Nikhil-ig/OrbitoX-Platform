import { NextResponse } from 'next/server';
import { withCustomerAuth } from '@/server/auth/customer-auth';
import { getCustomerOrganizationRole, noStoreHeaders } from '@/server/organizations/customer-dashboard';
import { prisma } from '@/server/db/prisma';
import { tenantBelongsToOrganization } from '@/server/billing/billing-tenant';

type RouteContext = {
  params: Promise<{ organizationId: string; projectId: string; environmentId: string }>;
};

export const GET = withCustomerAuth<RouteContext>(async (_request, session, context) => {
  const { organizationId, projectId, environmentId } = await context.params;
  if (!await getCustomerOrganizationRole(organizationId, session.userId)) {
    return NextResponse.json({ ok: false, error: 'ORGANIZATION_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  }
  const tenantId = `org/${organizationId}/project/${projectId}/environment/${environmentId}`;
  const usage = await prisma.$transaction(async (tx) => {
    const scope = await tenantBelongsToOrganization(tx, tenantId, organizationId);
    if (!scope) return null;
    await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
    const project = await tx.platformProject.findFirst({
      where: {
        id: projectId,
        organizationId,
        environments: { some: { id: environmentId } },
      },
      select: { monthlyApiCalls: true, apiCallQuota: true },
    });
    if (!project) return null;
    const period = new Date().toISOString().slice(0, 7);
    const [installations, usageRows] = await Promise.all([
      tx.pluginInstallation.findMany({
        where: { tenantId },
        select: { pluginId: true, planId: true, entitlementRevision: true, status: true },
      }),
      tx.platformPluginUsage.findMany({
        where: { tenantId, period },
        select: { pluginId: true, requestCount: true },
      }),
    ]);
    const plugins = await Promise.all(installations.map(async (installation) => {
      const [plan, grant] = await Promise.all([
        installation.planId
          ? tx.plan.findUnique({
              where: { planId: installation.planId },
              select: { planId: true, quotas: { select: { quotaKey: true, limit: true, unit: true, window: true } } },
            })
          : null,
        tx.pluginGrantRevision.findUnique({
          where: { tenantId_pluginId: { tenantId, pluginId: installation.pluginId } },
          select: { highestRevision: true },
        }),
      ]);
      const requests = usageRows.find((row) => row.pluginId === installation.pluginId)?.requestCount ?? 0n;
      const apiQuota = plan?.quotas.find((quota) =>
        ['api_calls', 'monthly_api_calls'].includes(quota.quotaKey.toLowerCase()),
      );
      const quota = apiQuota?.limit ?? null;
      return {
        pluginId: installation.pluginId,
        planId: plan?.planId ?? installation.planId,
        status: installation.status,
        entitlementRevision: installation.entitlementRevision,
        signedGrantRevision: grant?.highestRevision ?? null,
        usage: requests.toString(),
        quota,
        quotaUnit: apiQuota?.unit ?? null,
        quotaWindow: apiQuota?.window ?? null,
        warningAt80Percent: quota !== null && requests * 5n >= BigInt(quota) * 4n,
      };
    }));
    return {
      period,
      project: {
        usage: project.monthlyApiCalls.toString(),
        quota: project.apiCallQuota?.toString() ?? null,
        warningAt80Percent: project.apiCallQuota !== null &&
          project.apiCallQuota > 0n &&
          project.monthlyApiCalls * 5n >= project.apiCallQuota * 4n,
      },
      plugins,
    };
  });
  if (!usage) return NextResponse.json({ ok: false, error: 'TENANT_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  return NextResponse.json({ ok: true, tenantId, usage }, { headers: noStoreHeaders() });
}, { write: false });
