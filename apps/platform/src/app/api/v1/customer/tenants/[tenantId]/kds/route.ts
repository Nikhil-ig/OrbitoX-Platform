import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth } from '@/server/auth/customer-auth';
import { noStoreHeaders, getCustomerOrganizationRole } from '@/server/organizations/customer-dashboard';
import { prisma } from '@/server/db/prisma';
import { signBridgeRequest, getDefaultBridgeKeys } from '@orbitox-io/bridge';

type RouteContext = { params: Promise<{ tenantId: string }> };

export const GET = withCustomerAuth<RouteContext>(
  async (_request: NextRequest, session, context) => {
    const { tenantId: rawParam } = await context.params;
    const decodedParam = decodeURIComponent(rawParam).trim();

    let project = await prisma.platformProject.findFirst({
      where: { OR: [{ slug: decodedParam }, { id: decodedParam }] },
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

    const role = await getCustomerOrganizationRole(project.organizationId, session.userId);
    if (!role) {
      return NextResponse.json(
        { ok: false, error: 'UNAUTHORIZED_FOR_ORGANIZATION' },
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

    const bridgeKeys = getDefaultBridgeKeys();
    const pathWithQuery = '/api/restaurant/kds/tasks';
    const signedHeaders = signBridgeRequest(bridgeKeys, {
      method: 'GET',
      pathWithQuery,
      tenantId: canonicalTenantId,
      principal: { sub: session.userId, scopes: ['kds', 'ADMIN'] },
    });

    try {
      const res = await fetch(new URL(pathWithQuery, runtimeUrl).toString(), {
        headers: signedHeaders,
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) {
        return NextResponse.json({ ok: true, tasks: [] }, { status: 200, headers: noStoreHeaders() });
      }
      const json = await res.json();
      return NextResponse.json({ ok: true, tasks: json.tasks || json.data || [] }, { status: 200, headers: noStoreHeaders() });
    } catch {
      return NextResponse.json({ ok: true, tasks: [] }, { status: 200, headers: noStoreHeaders() });
    }
  },
  { write: false, allowMfaSetup: true },
);

export const POST = withCustomerAuth<RouteContext>(
  async (request: NextRequest, session, context) => {
    const { tenantId: rawParam } = await context.params;
    const decodedParam = decodeURIComponent(rawParam).trim();

    let project = await prisma.platformProject.findFirst({
      where: { OR: [{ slug: decodedParam }, { id: decodedParam }] },
      include: { environments: true },
    });
    if (!project) {
      return NextResponse.json({ ok: false, error: 'PROJECT_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
    }

    const role = await getCustomerOrganizationRole(project.organizationId, session.userId);
    if (!role) {
      return NextResponse.json({ ok: false, error: 'UNAUTHORIZED_FOR_ORGANIZATION' }, { status: 403, headers: noStoreHeaders() });
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
    const taskId = body.taskId;
    if (!taskId) {
      return NextResponse.json({ ok: false, error: 'TASK_ID_REQUIRED' }, { status: 400, headers: noStoreHeaders() });
    }

    const bridgeKeys = getDefaultBridgeKeys();
    const pathWithQuery = `/api/restaurant/kds/bump`;
    const payloadStr = JSON.stringify({ taskId });
    const signedHeaders = signBridgeRequest(bridgeKeys, {
      method: 'POST',
      pathWithQuery,
      tenantId: canonicalTenantId,
      principal: { sub: session.userId, scopes: ['kds', 'ADMIN'] },
      body: payloadStr,
    });

    try {
      const res = await fetch(new URL(pathWithQuery, runtimeUrl).toString(), {
        method: 'POST',
        headers: { ...signedHeaders, 'Content-Type': 'application/json' },
        body: payloadStr,
        signal: AbortSignal.timeout(3000),
      });
      const json = await res.json().catch(() => ({}));
      return NextResponse.json({ ok: res.ok, result: json }, { status: res.status, headers: noStoreHeaders() });
    } catch {
      return NextResponse.json({ ok: false, error: 'RUNTIME_UNAVAILABLE' }, { status: 503, headers: noStoreHeaders() });
    }
  },
  { write: true, allowMfaSetup: true },
);
