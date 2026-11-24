import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth } from '@/server/auth/customer-auth';
import { noStoreHeaders, getCustomerOrganizationRole } from '@/server/organizations/customer-dashboard';
import { prisma } from '@/server/db/prisma';

type RouteContext = { params: Promise<{ tenantId: string }> };

export const GET = withCustomerAuth<RouteContext>(
  async (_request: NextRequest, session, context) => {
    const { tenantId: rawParam } = await context.params;
    const decodedParam = decodeURIComponent(rawParam).trim();

    // 1. Resolve project by slug, id, or canonical tenantId
    let project = await prisma.platformProject.findFirst({
      where: {
        OR: [
          { slug: decodedParam },
          { id: decodedParam },
          { slug: decodedParam.replace(/^tenant_/, '') },
        ],
      },
      include: {
        environments: true,
      },
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

    if (!project) {
      return NextResponse.json(
        { ok: false, error: 'PROJECT_NOT_FOUND', message: 'Restaurant project not found.' },
        { status: 404, headers: noStoreHeaders() },
      );
    }

    // 2. Authorize customer membership in the owning organization
    const role = await getCustomerOrganizationRole(project.organizationId, session.userId);
    if (!role) {
      return NextResponse.json(
        { ok: false, error: 'UNAUTHORIZED_FOR_ORGANIZATION', message: 'You do not have access to this restaurant.' },
        { status: 403, headers: noStoreHeaders() },
      );
    }

    const org = await prisma.platformOrganization.findUnique({
      where: { id: project.organizationId },
      select: { id: true, name: true, slug: true, city: true, businessCategory: true, gstin: true },
    });

    // 3. Query RestaurantOS runtime for live tenant status, tables, and menu
    const runtimeUrl =
      process.env.RESTAURANTOS_RUNTIME_URL ||
      process.env.RESTAURANT_STORE_URL ||
      'http://127.0.0.1:4010';
    const platformToken =
      process.env.RESTAURANTOS_PLATFORM_TOKEN ||
      process.env.ORBITOX_RUNTIME_TOKEN ||
      (process.env.NODE_ENV !== 'production' ? 'test_platform_token_secret_key_1234567890123456' : undefined);

    if (!platformToken) {
      return NextResponse.json(
        { ok: false, error: 'SERVICE_UNAVAILABLE', message: 'Runtime authentication token is not configured.' },
        { status: 503, headers: noStoreHeaders() },
      );
    }

    let runtimeTenant: any = null;
    let activeOp: any = null;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
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
      } else if (res.status === 404) {
        // Runtime does not have this tenant. Check if provisioning saga is actively in progress.
        activeOp = await (prisma as any).platformOperation.findFirst({
          where: {
            organizationId: project.organizationId,
            status: { in: ['PROVISIONING', 'RUNNING', 'PENDING'] },
            OR: [
              { tenantId: { contains: project.slug } },
              { tenantId: { contains: project.id } },
            ],
          },
          orderBy: { createdAt: 'desc' },
        }).catch(() => null);
      } else {
        return NextResponse.json(
          { ok: false, error: 'RUNTIME_ERROR', message: 'Failed to fetch tenant status from restaurant runtime.' },
          { status: 502, headers: noStoreHeaders() },
        );
      }
    } catch {
      // P1.2: Runtime is offline or unreachable - fail closed with 503
      return NextResponse.json(
        { ok: false, error: 'SERVICE_UNAVAILABLE', message: 'RestaurantOS runtime is temporarily unreachable.' },
        { status: 503, headers: noStoreHeaders() },
      );
    }

    const reqHost = _request.headers.get('host') || '';
    const isDevHost = reqHost.includes('localhost') || reqHost.includes('127.0.0.1') || process.env.NODE_ENV !== 'production';
    const configuredUrl = process.env.ORBITOX_PUBLIC_BASE_URL;
    let baseDomain = isDevHost ? 'localhost:4010' : 'orbitox.io';
    if (configuredUrl && !isDevHost) {
      try {
        baseDomain = new URL(configuredUrl).hostname;
      } catch { }
    }
    const subdomainUrl = isDevHost ? `http://${project.slug}.localhost:4010` : `https://${project.slug}.${baseDomain}`;
    let sampleTable = runtimeTenant?.sampleTableLocator || null;
    if (sampleTable && isDevHost && sampleTable.locator) {
      sampleTable = {
        ...sampleTable,
        dinerUrl: `http://${project.slug}.localhost:4010/dine/${sampleTable.locator}`,
      };
    }

    const rawStatus = String(runtimeTenant?.status || '').toUpperCase();
    const previewExpiresAt = runtimeTenant?.previewExpiresAt || null;
    const hasValidExpiry = Boolean(
      previewExpiresAt &&
      !isNaN(new Date(previewExpiresAt).getTime()) &&
      new Date(previewExpiresAt).getTime() > Date.now()
    );
    const isExpired = Boolean(
      !previewExpiresAt ||
      isNaN(new Date(previewExpiresAt).getTime()) ||
      new Date(previewExpiresAt).getTime() <= Date.now()
    );

    let lifecycleStatus = 'PREVIEW';
    if (!runtimeTenant) {
      lifecycleStatus = activeOp ? 'PROVISIONING' : 'NOT_PROVISIONED';
    } else if (rawStatus === 'ACTIVE') {
      lifecycleStatus = 'ACTIVE';
    } else if (rawStatus === 'SUSPENDED') {
      lifecycleStatus = 'SUSPENDED';
    } else if (rawStatus === 'CANCELLED') {
      lifecycleStatus = 'CANCELLED';
    } else if (rawStatus === 'PREVIEW') {
      lifecycleStatus = isExpired ? 'EXPIRED' : 'PREVIEW';
    } else {
      lifecycleStatus = rawStatus || 'NOT_PROVISIONED';
    }

    const isPreviewActive = rawStatus === 'PREVIEW' && hasValidExpiry;
    const restaurantProvisioned = Boolean(
      runtimeTenant && runtimeTenant.status && runtimeTenant.status !== 'NOT_FOUND'
    );

    return NextResponse.json(
      {
        ok: true,
        ...(activeOp ? { status: 'PROVISIONING', restaurantProvisioned: false, message: 'Restaurant provisioning is currently in progress.' } : {}),
        preview: {
          restaurant: {
            id: project.id,
            slug: project.slug,
            name: project.name,
            status: lifecycleStatus,
            plan: project.plan,
            planTier: project.planTier,
            previewExpiresAt,
            subdomainUrl,
            city: org?.city || 'Bengaluru',
            organization: org,
          },
          tables: {
            totalCount: runtimeTenant?.tableCount ?? 0,
            sampleTable,
          },
          menu: {
            categoriesCount: runtimeTenant?.categoriesCount ?? 0,
            categories: runtimeTenant?.categories ?? [],
            itemsCount: runtimeTenant?.menuItemsCount ?? 0,
            items: runtimeTenant?.menuItems ?? [],
            sampleItemsCount: runtimeTenant?.sampleItemsCount ?? 0,
            hasSampleMenu: runtimeTenant?.hasSampleMenu ?? false,
          },
          brand: {
            templateId: runtimeTenant?.brandConfig?.activeTemplateId || 'saffron',
            primaryColor: runtimeTenant?.brandConfig?.primaryColor || '#FB923C',
            accentColor: runtimeTenant?.brandConfig?.accentColor || '#FB923C',
          },
          checklist: {
            accountVerified: true,
            organizationCreated: true,
            restaurantProvisioned,
            previewActive: isPreviewActive,
            paymentGatewayConnected: false,
            customDomainConfigured: false,
          },
          actions: {
            dinerPreviewUrl: sampleTable?.dinerUrl || null,
            kdsUrl: `${subdomainUrl}/kds`,
            tablesUrl: `${subdomainUrl}/tables`,
            testOrderEndpoint: `${runtimeUrl}/api/restaurant/orders`,
          },
        },
      },
      { status: 200, headers: noStoreHeaders() },
    );
  },
  { write: false, allowMfaSetup: true },
);
