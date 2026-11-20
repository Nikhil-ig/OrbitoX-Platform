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

export const POST = withCustomerAuth<RouteContext>(
  async (request: NextRequest, session, context) => {
    const { tenantId: rawParam } = await context.params;
    const project = await resolveProject(rawParam);
    if (!project) {
      return NextResponse.json(
        { ok: false, error: 'PROJECT_NOT_FOUND', message: 'Restaurant project not found.' },
        { status: 404, headers: noStoreHeaders() },
      );
    }

    const role = await getCustomerOrganizationRole(project.organizationId, session.userId);
    if (!role || (role !== 'OWNER' && role !== 'ADMIN' && role !== 'MEMBER')) {
      return NextResponse.json(
        { ok: false, error: 'UNAUTHORIZED_FOR_ORGANIZATION', message: 'Staff credentials required to settle table bill.' },
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
    const rawBody = JSON.stringify(body);

    const bridgeKeys = getDefaultBridgeKeys();
    const pathWithQuery = '/api/restaurant/tables/settle';
    const signedHeaders = signBridgeRequest(bridgeKeys, {
      method: 'POST',
      pathWithQuery,
      tenantId: canonicalTenantId,
      principal: { sub: session.userId, scopes: ['tenant:admin', 'tables:settle'] },
      body: rawBody,
    });

    try {
      const res = await fetch(new URL(pathWithQuery, runtimeUrl).toString(), {
        method: 'POST',
        headers: {
          ...signedHeaders,
          'Content-Type': 'application/json',
          ...(body.idempotencyKey ? { 'x-idempotency-key': body.idempotencyKey } : {}),
        },
        body: rawBody,
        signal: AbortSignal.timeout(6000),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return NextResponse.json(
          { ok: false, error: json.error || json.code || 'SETTLEMENT_FAILED', message: json.message || 'Table settlement failed on runtime.' },
          { status: res.status, headers: noStoreHeaders() },
        );
      }

      return NextResponse.json(
        { ok: true, ...json },
        { status: 200, headers: noStoreHeaders() },
      );
    } catch (err: any) {
      return NextResponse.json(
        { ok: false, error: 'SERVICE_UNAVAILABLE', message: 'RestaurantOS runtime backend is currently unreachable.' },
        { status: 503, headers: noStoreHeaders() },
      );
    }
  },
  { write: true },
);
