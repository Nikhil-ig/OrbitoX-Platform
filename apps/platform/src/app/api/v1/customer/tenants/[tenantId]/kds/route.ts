import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth } from '@/server/auth/customer-auth';
import { noStoreHeaders, getCustomerOrganizationRole } from '@/server/organizations/customer-dashboard';
import { prisma } from '@/server/db/prisma';
import { signBridgeRequest, getDefaultBridgeKeys } from '@orbitox-io/bridge';

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
      principal: { sub: session.userId, scopes: ['preview:kds:read'] },
    });

    try {
      const res = await fetch(new URL(pathWithQuery, runtimeUrl).toString(), {
        headers: signedHeaders,
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        return NextResponse.json(
          { ok: false, error: json.error || json.code || 'RUNTIME_ERROR', message: json.message || `Runtime returned status ${res.status}` },
          { status: res.status, headers: noStoreHeaders() },
        );
      }
      const json = await res.json();
      return NextResponse.json({ ok: true, tasks: json.tasks || json.data || [] }, { status: 200, headers: noStoreHeaders() });
    } catch {
      return NextResponse.json(
        { ok: false, error: 'RUNTIME_UNAVAILABLE', message: 'Restaurant runtime is temporarily unreachable.' },
        { status: 503, headers: noStoreHeaders() },
      );
    }
  },
  { write: false, allowMfaSetup: true },
);

export const POST = withCustomerAuth<RouteContext>(
  async (request: NextRequest, session, context) => {
    const { tenantId: rawParam } = await context.params;
    const project = await resolveProject(rawParam);
    if (!project) {
      return NextResponse.json({ ok: false, error: 'PROJECT_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
    }

    const role = await getCustomerOrganizationRole(project.organizationId, session.userId);
    if (!role || (role !== 'OWNER' && role !== 'ADMIN')) {
      return NextResponse.json(
        { ok: false, error: 'UNAUTHORIZED_FOR_ORGANIZATION', message: 'Only restaurant owners or administrators can manage kitchen display tasks in preview.' },
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
          error: 'TEST_TASKS_ONLY_IN_PREVIEW',
          message: 'Preview KDS actions are only permitted for restaurants in PREVIEW status.',
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
    const taskId = body.taskId;
    if (!taskId) {
      return NextResponse.json({ ok: false, error: 'TASK_ID_REQUIRED' }, { status: 400, headers: noStoreHeaders() });
    }

    const bridgeKeys = getDefaultBridgeKeys();
    const pathWithQuery = `/api/restaurant/kds/bump`;

    const sendBump = async (targetStatus?: string) => {
      const payloadObj: any = { taskId };
      if (targetStatus) {
        payloadObj.status = targetStatus;
      }
      const payloadStr = JSON.stringify(payloadObj);
      const signedHeaders = signBridgeRequest(bridgeKeys, {
        method: 'POST',
        pathWithQuery,
        tenantId: canonicalTenantId,
        principal: { sub: session.userId, scopes: ['preview:kds:bump'] },
        body: payloadStr,
      });

      const res = await fetch(new URL(pathWithQuery, runtimeUrl).toString(), {
        method: 'POST',
        headers: { ...signedHeaders, 'Content-Type': 'application/json' },
        body: payloadStr,
        signal: AbortSignal.timeout(3000),
      });
      const json = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, json };
    };

    try {
      let bumpRes = await sendBump();
      if (!bumpRes.ok) {
        return NextResponse.json(
          { ok: false, error: bumpRes.json?.error || 'BUMP_FAILED', result: bumpRes.json },
          { status: bumpRes.status, headers: noStoreHeaders() },
        );
      }

      // If task transitioned to IN_PROGRESS and caller intends READY (default for preview showcase action), advance to READY
      const desiredStatus = body.status || body.targetStatus || 'READY';
      if (desiredStatus === 'READY' && bumpRes.json?.data?.status === 'IN_PROGRESS') {
        bumpRes = await sendBump();
      }

      return NextResponse.json({ ok: bumpRes.ok, result: bumpRes.json }, { status: bumpRes.status, headers: noStoreHeaders() });
    } catch {
      return NextResponse.json({ ok: false, error: 'RUNTIME_UNAVAILABLE' }, { status: 503, headers: noStoreHeaders() });
    }
  },
  { write: true, allowMfaSetup: true },
);
