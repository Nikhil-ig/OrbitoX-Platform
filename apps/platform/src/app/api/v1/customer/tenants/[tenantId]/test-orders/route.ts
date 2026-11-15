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
        OR: [{ slug: decodedParam }, { id: decodedParam }],
      },
      include: { environments: true },
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

    // 2. Authorize customer membership in the owning organization (OWNER or ADMIN only)
    const role = await getCustomerOrganizationRole(project.organizationId, session.userId);
    if (!role || (role !== 'OWNER' && role !== 'ADMIN')) {
      return NextResponse.json(
        { ok: false, error: 'UNAUTHORIZED_FOR_ORGANIZATION', message: 'Only restaurant owners or administrators can place preview test orders.' },
        { status: 403, headers: noStoreHeaders() },
      );
    }

    const canonicalTenantId =
      project.environments.find((e) => e.isProduction)?.id
        ? `org/${project.organizationId}/project/${project.id}/environment/${project.environments.find((e) => e.isProduction)!.id}`
        : `tenant_${project.slug}`;

    const runtimeUrl =
      process.env.RESTAURANTOS_RUNTIME_URL ||
      process.env.RESTAURANT_STORE_URL ||
      'http://127.0.0.1:4010';

    const body = await request.json().catch(() => ({}));
    const orderPayload = {
      ...body,
      isTest: true,
    };
    const bodyStr = JSON.stringify(orderPayload);

    // Sign bridge request
    const bridgeKeys = getDefaultBridgeKeys();
    const pathWithQuery = '/api/restaurant/orders';
    const signedHeaders = signBridgeRequest(bridgeKeys, {
      method: 'POST',
      pathWithQuery,
      tenantId: canonicalTenantId,
      principal: { sub: session.userId, scopes: ['preview:test-order', 'ADMIN'] },
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
