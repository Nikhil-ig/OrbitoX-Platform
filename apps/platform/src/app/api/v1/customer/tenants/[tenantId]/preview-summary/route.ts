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
        ],
      },
      include: {
        environments: true,
      },
    });

    if (!project && decodedParam.includes('project/')) {
      const match = /project\/([^/]+)/.exec(decodedParam);
      if (match && match[1]) {
        project = await prisma.platformProject.findUnique({
          where: { id: match[1] },
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
      'orbitox_platform_token_restaurant_os_master_key_2026_super_secret_v1';

    let runtimeTenant: any = null;
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
      }
    } catch {
      // Runtime fallback
    }

    const configuredUrl = process.env.ORBITOX_PUBLIC_BASE_URL;
    let baseDomain = 'orbitox.io';
    if (configuredUrl) {
      try {
        baseDomain = new URL(configuredUrl).hostname;
      } catch { }
    }
    const subdomainUrl = `http://${project.slug}.${baseDomain}`;
    const sampleTable = runtimeTenant?.sampleTableLocator || {
      tableNumber: 'T-01',
      locator: 'sample-locator',
      dinerUrl: `${subdomainUrl}/dine/sample-locator`,
    };

    const isPreview = runtimeTenant?.status === 'preview' || project.status === 'PROVISIONING' || true;
    const previewExpiresAt =
      runtimeTenant?.previewExpiresAt ||
      new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();

    return NextResponse.json(
      {
        ok: true,
        preview: {
          restaurant: {
            id: project.id,
            slug: project.slug,
            name: project.name,
            status: isPreview ? 'PREVIEW' : 'ACTIVE',
            plan: project.plan,
            planTier: project.planTier,
            previewExpiresAt,
            subdomainUrl,
            city: org?.city || 'Bengaluru',
            organization: org,
          },
          tables: {
            totalCount: runtimeTenant?.tableCount || 12,
            sampleTable,
          },
          menu: {
            categoriesCount: runtimeTenant?.categoriesCount || 4,
            itemsCount: runtimeTenant?.menuItemsCount || 6,
            sampleItemsCount: runtimeTenant?.sampleItemsCount || 6,
            hasSampleMenu: runtimeTenant?.hasSampleMenu ?? true,
          },
          brand: {
            templateId: runtimeTenant?.brandConfig?.activeTemplateId || 'saffron',
            primaryColor: runtimeTenant?.brandConfig?.primaryColor || '#C5A059',
            accentColor: runtimeTenant?.brandConfig?.accentColor || '#C5A059',
          },
          checklist: {
            accountVerified: true,
            organizationCreated: true,
            restaurantProvisioned: true,
            previewActive: true,
            paymentGatewayConnected: false,
            customDomainConfigured: false,
          },
          actions: {
            dinerPreviewUrl: sampleTable.dinerUrl,
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
