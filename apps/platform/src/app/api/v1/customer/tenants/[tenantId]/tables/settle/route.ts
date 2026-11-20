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
    if (!body.tableId && !body.tableNumber) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_REQUEST', message: 'Table identifier (tableId or tableNumber) is required.' },
        { status: 400, headers: noStoreHeaders() },
      );
    }
    if (typeof body.amountMinor !== 'number' || body.amountMinor < 0) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_AMOUNT', message: 'A non-negative settlement amount is required.' },
        { status: 400, headers: noStoreHeaders() },
      );
    }

    const rawBody = JSON.stringify(body);
    const bridgeKeys = getDefaultBridgeKeys();

    // Verify table on runtime before settlement dispatch
    try {
      const verifyHeaders = signBridgeRequest(bridgeKeys, {
        method: 'GET',
        pathWithQuery: '/api/restaurant/tables',
        tenantId: canonicalTenantId,
        principal: { sub: session.userId, scopes: ['tenant:admin', 'tables:read'] },
      });
      const verifyRes = await fetch(new URL('/api/restaurant/tables', runtimeUrl).toString(), {
        headers: verifyHeaders,
        signal: AbortSignal.timeout(3000),
      }).catch(() => null);

      if (verifyRes && verifyRes.ok) {
        const verifyData = await verifyRes.json().catch(() => ({}));
        if (Array.isArray(verifyData.tables)) {
          const match = verifyData.tables.find(
            (t: any) => String(t.id) === String(body.tableId) || t.number === body.tableNumber,
          );
          if (match && match.status === 'AVAILABLE') {
            return NextResponse.json(
              { ok: false, error: 'TABLE_ALREADY_AVAILABLE', message: `Table ${body.tableNumber || body.tableId} is already available and has no open bill.` },
              { status: 409, headers: noStoreHeaders() },
            );
          }
        }
      }
    } catch {
      // Continue to settlement dispatch
    }

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
