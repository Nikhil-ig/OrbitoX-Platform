import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth } from '@/server/auth/customer-auth';
import { noStoreHeaders, getCustomerOrganizationRole } from '@/server/organizations/customer-dashboard';
import { prisma } from '@/server/db/prisma';
import { signBridgeRequest, getDefaultBridgeKeys } from '@orbitox-io/bridge';

type RouteContext = { params: Promise<{ tenantId: string }> };

export const POST = withCustomerAuth<RouteContext>(
  async (request: NextRequest, session, context) => {
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

    if (!project) {
      return NextResponse.json(
        { ok: false, error: 'PROJECT_NOT_FOUND', message: 'Restaurant project not found.' },
        { status: 404, headers: noStoreHeaders() },
      );
    }

    // 2. Authorize customer membership in the owning organization (OWNER or ADMIN only)
    const role = await getCustomerOrganizationRole(project.organizationId, session.userId);
    if (!role || (role !== 'OWNER' && role !== 'ADMIN')) {
      return NextResponse.json(
        { ok: false, error: 'UNAUTHORIZED_FOR_ORGANIZATION', message: 'Only restaurant owners or administrators can place preview test orders.' },
        { status: 403, headers: noStoreHeaders() },
      );
    }

    const runtimeUrl =
      process.env.RESTAURANTOS_RUNTIME_URL ||
      process.env.RESTAURANT_STORE_URL ||
      'http://127.0.0.1:4010';
    const platformToken =
      process.env.RESTAURANTOS_PLATFORM_TOKEN ||
      process.env.ORBITOX_RUNTIME_TOKEN ||
      (process.env.NODE_ENV !== 'production' ? 'test_platform_token_secret_key_1234567890123456' : undefined);

    // P0.2: Query authoritative RestaurantOS runtime to verify tenant status and preview expiry
    let runtimeTenant: any = null;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(
        new URL(`/internal/tenants/${encodeURIComponent(project.slug)}`, runtimeUrl).toString(),
        {
          headers: platformToken ? { Authorization: `Bearer ${platformToken}` } : {},
          cache: 'no-store',
          signal: controller.signal,
        },
      );
      clearTimeout(timeout);
      if (!res.ok) {
        if (res.status === 404) {
          return NextResponse.json(
            { ok: false, error: 'TENANT_NOT_FOUND', message: 'Restaurant tenant has not been provisioned in runtime.' },
            { status: 404, headers: noStoreHeaders() },
          );
        }
        return NextResponse.json(
          { ok: false, error: 'RUNTIME_ERROR', message: 'Failed to verify tenant status with restaurant runtime.' },
          { status: 502, headers: noStoreHeaders() },
        );
      }
      const json = await res.json();
      runtimeTenant = json.tenant;
    } catch {
      return NextResponse.json(
        { ok: false, error: 'RUNTIME_UNAVAILABLE', message: 'Restaurant runtime is temporarily unreachable.' },
        { status: 503, headers: noStoreHeaders() },
      );
    }

    const tenantStatus = String(runtimeTenant?.status || '').toLowerCase();
    if (tenantStatus !== 'preview') {
      return NextResponse.json(
        {
          ok: false,
          error: 'TEST_ORDERS_ONLY_IN_PREVIEW',
          message: 'Test orders are only permitted for restaurants in PREVIEW status.',
        },
        { status: 403, headers: noStoreHeaders() },
      );
    }

    if (runtimeTenant?.previewExpiresAt) {
      const expiry = new Date(runtimeTenant.previewExpiresAt).getTime();
      if (!isNaN(expiry) && expiry <= Date.now()) {
        return NextResponse.json(
          {
            ok: false,
            error: 'PREVIEW_EXPIRED',
            message: 'The preview period for this restaurant has expired.',
          },
          { status: 403, headers: noStoreHeaders() },
        );
      }
    }

    const canonicalTenantId =
      project.environments.find((e) => e.isProduction)?.id
        ? `org/${project.organizationId}/project/${project.id}/environment/${project.environments.find((e) => e.isProduction)!.id}`
        : `tenant_${project.slug}`;

    const body = await request.json().catch(() => ({}));
    const orderPayload = {
      ...body,
      isTest: true,
    };
    const bodyStr = JSON.stringify(orderPayload);

    // Sign bridge request with strictly 'preview:test-order' scope
    const bridgeKeys = getDefaultBridgeKeys();
    const pathWithQuery = '/api/restaurant/orders';
    const signedHeaders = signBridgeRequest(bridgeKeys, {
      method: 'POST',
      pathWithQuery,
      tenantId: canonicalTenantId,
      principal: { sub: session.userId, scopes: ['preview:test-order'] },
      body: bodyStr,
    });

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(new URL(pathWithQuery, runtimeUrl).toString(), {
        method: 'POST',
        headers: {
          ...signedHeaders,
          'Content-Type': 'application/json',
          'x-orbitox-test-order': 'true',
        },
        body: bodyStr,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return NextResponse.json(
          { ok: false, error: json.code || 'TEST_ORDER_FAILED', message: json.message || 'Failed to submit test order to restaurant runtime.' },
          { status: res.status, headers: noStoreHeaders() },
        );
      }

      return NextResponse.json(
        {
          ok: true,
          order: json,
          isTest: true,
        },
        { status: 201, headers: noStoreHeaders() },
      );
    } catch (err: any) {
      return NextResponse.json(
        { ok: false, error: 'RUNTIME_UNAVAILABLE', message: 'Restaurant runtime is temporarily unreachable.' },
        { status: 503, headers: noStoreHeaders() },
      );
    }
  },
  { write: true, allowMfaSetup: true },
);
