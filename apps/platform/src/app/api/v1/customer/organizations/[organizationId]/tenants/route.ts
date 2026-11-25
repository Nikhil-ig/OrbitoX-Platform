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
  const envIds = projects.flatMap((project) => project.environments.map((e) => e.id));
  const [installations, subscriptions, verifiedDomains] = tenantIds.length
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
      prisma.projectDomain.findMany({
        where: { environmentId: { in: envIds }, verificationStatus: 'VERIFIED' },
        orderBy: { createdAt: 'desc' },
        select: { environmentId: true, domainName: true },
      }),
    ])
    : [[], [], []];

  const isProd = process.env.NODE_ENV === 'production';
  const configuredPublicOrigin =
    process.env.RESTAURANTOS_PUBLIC_URL?.trim() ||
    (!isProd ? (process.env.RESTAURANTOS_RUNTIME_URL?.trim() || process.env.RESTAURANT_STORE_URL?.trim() || 'http://localhost:4010') : '');

  function resolveLaunchTarget(
    project: { id: string; slug: string; status: string },
    env: { id: string; slug: string; name: string },
    tenantPlugins: Array<{ pluginId: string; status: string; statusReason: string | null }>,
    tenantId: string,
  ): { launchUrl: string | null; displayDomain: string; launchBlockedReason: string | null } {
    const isHospital = tenantPlugins.some((pl) => String(pl.pluginId || '').toLowerCase().includes('hms') || String(pl.pluginId || '').toLowerCase().includes('hospital'));
    const blockedPlugin = tenantPlugins.find((pl) => ['SUSPENDED', 'REVOKED', 'DEPROVISIONED', 'DISABLED'].includes(String(pl.status || '').toUpperCase()));
    if (project.status === 'SUSPENDED' || project.status === 'DEPROVISIONED' || blockedPlugin) {
      return {
        launchUrl: null,
        displayDomain: `${project.slug}.orbitox.io`,
        launchBlockedReason: blockedPlugin?.statusReason || `Workspace environment "${env.name}" is ${blockedPlugin?.status?.toLowerCase() || project.status.toLowerCase()}.`,
      };
    }

    const customDomain = verifiedDomains.find((d) => d.environmentId === env.id)?.domainName;
    if (customDomain) {
      const safeCustom = customDomain.replace(/^https?:\/\//, '');
      const proto = isProd ? 'https://' : (safeCustom.includes('localhost') || safeCustom.startsWith('127.0.0.1') ? 'http://' : 'https://');
      return {
        launchUrl: isHospital ? `${proto}${safeCustom}/hms?tenant=${encodeURIComponent(tenantId)}` : `${proto}${safeCustom}/`,
        displayDomain: safeCustom,
        launchBlockedReason: null,
      };
    }

    if (isHospital) {
      const hmsPath = `/hms?tenant=${encodeURIComponent(tenantId)}`;
      return {
        launchUrl: hmsPath,
        displayDomain: `${project.slug}.orbitox.io`,
        launchBlockedReason: null,
      };
    }

    if (!configuredPublicOrigin) {
      return {
        launchUrl: null,
        displayDomain: `${project.slug}.orbitox.io`,
        launchBlockedReason: 'Production storefront origin is not yet verified or configured.',
      };
    }

    try {
      const parsed = new URL(configuredPublicOrigin);
      const protocol = isProd ? 'https:' : parsed.protocol;
      if (isProd && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
        return {
          launchUrl: null,
          displayDomain: `${project.slug}.orbitox.io`,
          launchBlockedReason: 'Custom domain or public HTTPS host required for production launch.',
        };
      }
      const hostBase = parsed.hostname === '127.0.0.1' ? 'localhost' : parsed.hostname;
      const portSuffix = parsed.port ? `:${parsed.port}` : '';
      const tenantHost = hostBase === 'localhost'
        ? `${project.slug}.localhost${portSuffix}`
        : `${project.slug}.${hostBase}${portSuffix}`;
      return {
        launchUrl: `${protocol}//${tenantHost}/`,
        displayDomain: tenantHost,
        launchBlockedReason: null,
      };
    } catch {
      return {
        launchUrl: null,
        displayDomain: `${project.slug}.orbitox.io`,
        launchBlockedReason: 'Configured runtime origin is invalid.',
      };
    }
  }

  return NextResponse.json({
    ok: true,
    tenants: projects.flatMap((project) => project.environments.map((environment) => {
      const tenantId = `org/${organizationId}/project/${project.id}/environment/${environment.id}`;
      const tenantPlugins = installations.filter((item) => item.tenantId === tenantId);
      const target = resolveLaunchTarget(project, environment, tenantPlugins, tenantId);
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
        launchUrl: target.launchUrl,
        displayDomain: target.displayDomain,
        launchBlockedReason: target.launchBlockedReason,
        plugins: tenantPlugins.map((item) => {
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
}, { write: false, allowMfaSetup: true });

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
    const verifiedUser = await prisma.customerUser.findUnique({
      where: { id: session.userId },
      select: { name: true, email: true, phone: true },
    });

    const sanitizedPlugins = body.plugins.map((plugin) => {
      const cfg = { ...(plugin.config || {}) };
      const safeId = String(plugin.id).toLowerCase();
      if (safeId.includes('restaurant') || safeId.includes('pos')) {
        cfg.ownerName = verifiedUser?.name || session.email;
        cfg.ownerEmail = session.email;
        if (verifiedUser?.phone) {
          cfg.ownerPhone = verifiedUser.phone;
        }
        cfg.status = 'preview';
      }
      return {
        ...plugin,
        config: cfg,
      };
    });

    const operation = await provisioningSaga.startProvisioning({
      organizationId,
      name: body.name,
      slug: body.slug,
      environment: isNonEmptyString(body.environment) ? body.environment : undefined,
      plugins: sanitizedPlugins,
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
}, { write: true, allowMfaSetup: true });

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
