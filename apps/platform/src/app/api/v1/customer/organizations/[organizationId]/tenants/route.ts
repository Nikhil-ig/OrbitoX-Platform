import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth } from '@/server/auth/customer-auth';
import {
  canCustomerDashboardAction,
  getCustomerOrganizationRole,
  noStoreHeaders,
} from '@/server/organizations/customer-dashboard';
import {
  ProvisioningValidationError,
  provisioningSaga,
} from '@/server/provisioning/provisioning-saga';
import type { TenantProvisionPluginInput } from '@/server/provisioning/types';
import { prisma } from '@/server/db/prisma';

type RouteContext = { params: Promise<{ organizationId: string }> };

export const GET = withCustomerAuth<RouteContext>(async (_request, session, context) => {
  const { organizationId } = await context.params;
  if (!await getCustomerOrganizationRole(organizationId, session.userId)) {
    return NextResponse.json({ ok: false, error: 'ORGANIZATION_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  }
  const projects = await prisma.platformProject.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      plan: true,
      planTier: true,
      monthlyApiCalls: true,
      apiCallQuota: true,
      environments: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, slug: true, name: true, isProduction: true },
      },
    },
  });
  const tenantIds = projects.flatMap((project) => project.environments.map((environment) =>
    `org/${organizationId}/project/${project.id}/environment/${environment.id}`,
  ));
  const [installations, subscriptions] = tenantIds.length
    ? await Promise.all([
        prisma.pluginInstallation.findMany({
          where: { tenantId: { in: tenantIds } },
          select: { tenantId: true, pluginId: true, status: true, statusReason: true, planId: true },
        }),
        prisma.billingSubscription.findMany({
          where: { tenantId: { in: tenantIds } },
          orderBy: { updatedAt: 'desc' },
          select: {
            tenantId: true,
            pluginId: true,
            status: true,
            currentEnd: true,
            cancelAtPeriodEnd: true,
            planMap: { select: { internalPlanId: true } },
          },
        }),
      ])
    : [[], []];
  return NextResponse.json({
    ok: true,
    tenants: projects.flatMap((project) => project.environments.map((environment) => {
      const tenantId = `org/${organizationId}/project/${project.id}/environment/${environment.id}`;
      return {
        tenantId,
        project: {
          id: project.id,
          slug: project.slug,
          name: project.name,
          status: project.status,
          plan: project.plan,
          planTier: project.planTier,
          monthlyApiCalls: project.monthlyApiCalls.toString(),
          apiCallQuota: project.apiCallQuota?.toString() ?? null,
        },
        environment,
        plugins: installations.filter((item) => item.tenantId === tenantId).map((item) => {
          const subscription = subscriptions.find((row) =>
            row.tenantId === tenantId && row.pluginId === item.pluginId,
          );
          return {
            pluginId: item.pluginId,
            status: item.status,
            suspensionReason: item.statusReason,
            planId: subscription?.planMap.internalPlanId || item.planId,
            subscriptionStatus: subscription?.status || null,
            currentEnd: subscription?.currentEnd || null,
            cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
          };
        }),
      };
    })),
  }, { headers: noStoreHeaders() });
}, { write: false });

export const POST = withCustomerAuth<RouteContext>(async (request: NextRequest, session, context) => {
  const { organizationId } = await context.params;
  const role = await getCustomerOrganizationRole(organizationId, session.userId);
  if (!role) return NextResponse.json({ ok: false, error: 'ORGANIZATION_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  if (!canCustomerDashboardAction(role, 'createTenant')) {
    return NextResponse.json({ ok: false, error: 'TENANT_CREATE_FORBIDDEN' }, { status: 403, headers: noStoreHeaders() });
  }
  if (!session.emailVerified) {
    return NextResponse.json({ ok: false, error: 'VERIFIED_EMAIL_REQUIRED' }, { status: 403, headers: noStoreHeaders() });
  }
  const idempotencyKey = request.headers.get('idempotency-key')?.trim() || '';
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) {
    return NextResponse.json({ ok: false, error: 'VALID_IDEMPOTENCY_KEY_REQUIRED' }, { status: 422, headers: noStoreHeaders() });
  }
  const body: unknown = await request.json().catch(() => null);
  if (
    !isRecord(body) ||
    !isNonEmptyString(body.name) ||
    !isNonEmptyString(body.slug) ||
    !Array.isArray(body.plugins) ||
    body.plugins.length === 0 ||
    !body.plugins.every(isProvisionPlugin)
  ) {
    return NextResponse.json({ ok: false, error: 'INVALID_TENANT_INPUT' }, { status: 422, headers: noStoreHeaders() });
  }
  try {
    const operation = await provisioningSaga.startProvisioning({
      organizationId,
      name: body.name,
      slug: body.slug,
      environment: isNonEmptyString(body.environment) ? body.environment : undefined,
      plugins: body.plugins,
      region: isNonEmptyString(body.region) ? body.region : undefined,
    }, {
      idempotencyKey,
      operatorId: session.userId,
    });
    return NextResponse.json({
      ok: true,
      operation: {
        id: operation.id,
        tenantId: operation.tenantId,
        status: operation.status,
        steps: operation.steps,
      },
      ...(operation.rawApiKey ? { apiKey: operation.rawApiKey } : {}),
    }, { status: 202, headers: noStoreHeaders() });
  } catch (error) {
    console.error('Customer tenant provisioning failed.', error);
    if (error instanceof ProvisioningValidationError) {
      return NextResponse.json(
        { ok: false, error: error.code, message: error.message },
        { status: 422, headers: noStoreHeaders() },
      );
    }
    return NextResponse.json({ ok: false, error: 'TENANT_PROVISIONING_FAILED' }, { status: 422, headers: noStoreHeaders() });
  }
}, { write: true });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isProvisionPlugin(value: unknown): value is TenantProvisionPluginInput {
  return isRecord(value) &&
    isNonEmptyString(value.id) &&
    (value.plan === undefined || isNonEmptyString(value.plan)) &&
    (value.config === undefined || isRecord(value.config));
}
