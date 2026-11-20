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
        { ok: false, error: 'UNAUTHORIZED_FOR_ORGANIZATION', message: 'Access denied to this restaurant project.' },
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
    const pathWithQuery = '/api/restaurant/tables';
    const signedHeaders = signBridgeRequest(bridgeKeys, {
      method: 'GET',
      pathWithQuery,
      tenantId: canonicalTenantId,
      principal: { sub: session.userId, scopes: ['tenant:admin', 'tables:read'] },
    });

    try {
      const res = await fetch(new URL(pathWithQuery, runtimeUrl).toString(), {
        headers: signedHeaders,
        cache: 'no-store',
        signal: AbortSignal.timeout(4000),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        return NextResponse.json(
          { ok: false, error: json.error || 'RUNTIME_ERROR', message: json.message || `Runtime returned status ${res.status}` },
          { status: res.status, headers: noStoreHeaders() },
        );
      }

      const json = await res.json();
      return NextResponse.json(
        { ok: true, tables: json.tables || [] },
        { status: 200, headers: noStoreHeaders() },
      );
    } catch {
      return NextResponse.json(
        { ok: false, error: 'SERVICE_UNAVAILABLE', message: 'RestaurantOS runtime backend is currently unreachable.' },
        { status: 503, headers: noStoreHeaders() },
      );
    }
  },
  { write: false, allowMfaSetup: true },
);
