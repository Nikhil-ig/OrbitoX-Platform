import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth } from '@/server/auth/customer-auth';
import { noStoreHeaders, getCustomerOrganizationRole } from '@/server/organizations/customer-dashboard';
import { prisma } from '@/server/db/prisma';
import { getChecklist } from '@/server/onboarding/checklist-service';

type RouteContext = { params: Promise<{ tenantId: string }> };

async function resolveProject(rawParam: string) {
  const decodedParam = decodeURIComponent(rawParam).trim();
  let project = await prisma.platformProject.findFirst({
    where: {
      OR: [
        { slug: decodedParam },
        { id: decodedParam },
        { slug: decodedParam.replace(/^tenant_/, '') },
      ],
    },
    include: { environments: true },
  });

  if (!project && decodedParam.includes('project/')) {
    const match = /project\/([^/]+)/.exec(decodedParam);
    if (match && match[1]) {
      project = await prisma.platformProject.findFirst({
        where: {
          OR: [
            { id: match[1] },
            { slug: match[1] },
          ],
        },
        include: { environments: true },
      });
    }
  }

  return project;
}

export const GET = withCustomerAuth<RouteContext>(
  async (_request: NextRequest, session, context) => {
    const { tenantId: rawParam } = await context.params;
    const project = await resolveProject(rawParam);
    if (!project) {
      return NextResponse.json(
        { ok: false, error: 'PROJECT_NOT_FOUND', message: 'Restaurant project not found.' },
        { status: 404, headers: noStoreHeaders() },
      );
    }

    const role = await getCustomerOrganizationRole(project.organizationId, session.userId);
    if (!role) {
      return NextResponse.json(
        { ok: false, error: 'UNAUTHORIZED_FOR_ORGANIZATION', message: 'Access denied to this restaurant project.' },
        { status: 403, headers: noStoreHeaders() },
      );
    }

    const canonicalTenantId =
      project.environments.find((e) => e.isProduction)?.id
        ? `org/${project.organizationId}/project/${project.id}/environment/${project.environments.find((e) => e.isProduction)!.id}`
        : `tenant_${project.slug}`;

    // 1. Query BillingSubscription
    const subscription = await prisma.billingSubscription.findFirst({
      where: {
        organizationId: project.organizationId,
        OR: [
          { tenantId: canonicalTenantId },
          { tenantId: { contains: project.id } },
          { tenantId: { contains: project.slug } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        razorpaySubscriptionId: true,
        razorpayPlanId: true,
        status: true,
        currentStart: true,
        currentEnd: true,
        graceStartedAt: true,
        cancelAtPeriodEnd: true,
      },
    });

    // 2. Query Provisioning Saga PlatformOperation
    const activeOp = await (prisma as any).platformOperation.findFirst({
      where: {
        organizationId: project.organizationId,
        OR: [
          { tenantId: { contains: project.slug } },
          { tenantId: { contains: project.id } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        status: true,
        step: true,
        error: true,
        createdAt: true,
      },
    }).catch(() => null);

    // 3. Query PluginInstallation
    const installation = await prisma.pluginInstallation.findFirst({
      where: {
        tenantId: canonicalTenantId,
      },
      select: {
        id: true,
        pluginId: true,
        status: true,
        planId: true,
        statusReason: true,
      },
    });

    // 4. Query RestaurantOS runtime for authoritative tenant health and status
    const runtimeUrl =
      process.env.RESTAURANTOS_RUNTIME_URL ||
      process.env.RESTAURANT_STORE_URL ||
      'http://127.0.0.1:4010';
    const platformToken =
      process.env.RESTAURANTOS_PLATFORM_TOKEN ||
      process.env.ORBITOX_RUNTIME_TOKEN ||
      (process.env.NODE_ENV !== 'production' ? 'test_platform_token_secret_key_1234567890123456' : undefined);

    let runtimeTenant: any = null;
    let runtimeHealth = 'UNKNOWN';
    if (platformToken) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(
          new URL(`/internal/tenants/${encodeURIComponent(project.slug)}`, runtimeUrl).toString(),
          {
            headers: { Authorization: `Bearer ${platformToken}` },
            cache: 'no-store',
            signal: controller.signal,
          },
        );
        clearTimeout(timeout);
        if (res.ok) {
          const json = await res.json();
          runtimeTenant = json.tenant;
          runtimeHealth = runtimeTenant?.health || (runtimeTenant ? 'HEALTHY' : 'OFFLINE');
        } else if (res.status === 404) {
          runtimeHealth = 'NOT_PROVISIONED';
        }
      } catch {
        runtimeHealth = 'OFFLINE';
      }
    }

    // 5. Query server-side checklist state
    const checklist = await getChecklist(canonicalTenantId);

    // 6. Authoritative Activation Gates:
    // Gate 1: Org mapped - project belongs to valid organization and caller has OWNER/ADMIN role
    const orgMapped = Boolean(project.organizationId && (role === 'OWNER' || role === 'ADMIN'));

    // Gate 2: Subscription active - billing subscription exists and status is strictly 'active'
    const subscriptionActive = Boolean(subscription && subscription.status === 'active');

    // Gate 3: Plugin installation active - plugin installation exists and status is strictly 'ACTIVE'
    const pluginActive = Boolean(installation && installation.status === 'ACTIVE');

    // Gate 4: Provisioning saga completed - no active/failed saga, latest saga status is 'COMPLETED' or runtime tenant established
    const sagaCompleted = Boolean(
      (!activeOp && runtimeTenant && (runtimeTenant.status === 'ACTIVE' || runtimeTenant.status === 'active')) ||
      (activeOp && activeOp.status === 'COMPLETED')
    );

    // Gate 5: Runtime tenant provisioned - runtimeTenant exists and is ACTIVE
    const runtimeProvisioned = Boolean(
      runtimeTenant && (runtimeTenant.status === 'ACTIVE' || runtimeTenant.status === 'active')
    );

    // Gate 6: Runtime health - runtimeHealth is strictly HEALTHY
    const runtimeHealthy = runtimeHealth === 'HEALTHY';

    // Authoritative Single Live Activation Predicate: All 6 gates must strictly pass
    const isLive = Boolean(
      orgMapped &&
      subscriptionActive &&
      pluginActive &&
      sagaCompleted &&
      runtimeProvisioned &&
      runtimeHealthy
    );

    const isAwaitingWebhook = Boolean(
      subscription?.status === 'authenticated' ||
      (!isLive && subscription?.status === 'created')
    );

    return NextResponse.json(
      {
        ok: true,
        isLive,
        isAwaitingWebhook,
        gates: {
          orgMapped,
          subscriptionActive,
          pluginActive,
          sagaCompleted,
          runtimeProvisioned,
          runtimeHealthy,
        },
        subscription: {
          id: subscription?.razorpaySubscriptionId || null,
          status: subscription?.status || 'none',
          planId: subscription?.razorpayPlanId || null,
          currentStart: subscription?.currentStart?.toISOString() || null,
          currentEnd: subscription?.currentEnd?.toISOString() || null,
          cancelAtPeriodEnd: Boolean(subscription?.cancelAtPeriodEnd),
          awaitingWebhook: isAwaitingWebhook,
        },
        provisioning: {
          status: activeOp?.status || (runtimeTenant ? 'COMPLETED' : 'NOT_PROVISIONED'),
          operationId: activeOp?.id || null,
          step: activeOp?.step || null,
        },
        runtime: {
          status: runtimeTenant?.status || (activeOp ? 'PROVISIONING' : 'NOT_PROVISIONED'),
          health: runtimeHealth,
        },
        installation: installation
          ? {
              status: installation.status,
              planId: installation.planId,
            }
          : null,
        checklist: {
          completedCount: checklist.completedCount,
          totalCount: checklist.totalCount,
          allCompleted: checklist.allCompleted,
          items: checklist.items,
        },
      },
      { headers: noStoreHeaders() },
    );
  },
  { write: false, allowMfaSetup: true },
);
