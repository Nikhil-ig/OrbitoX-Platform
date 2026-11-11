import { NextRequest, NextResponse } from 'next/server';
import type { ErasureMode, PrincipalRef } from '@orbitox-io/plugin-engine';
import { withCustomerAuth } from '@/lib/customer-auth';
import {
  canCustomerDashboardAction,
  getCustomerOrganizationRole,
  noStoreHeaders,
} from '@/lib/customer-dashboard';
import { mapDbError } from '@/lib/db-errors';
import { executePrincipalDataRightsRequest } from '@/lib/data-rights/service';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{
    organizationId: string;
    projectId: string;
    environmentId: string;
  }>;
};

export const POST = withCustomerAuth<RouteContext>(async (request: NextRequest, session, context) => {
  const { organizationId, projectId, environmentId } = await context.params;
  const role = await getCustomerOrganizationRole(organizationId, session.userId);
  if (!role) {
    return NextResponse.json({ ok: false, error: 'ORGANIZATION_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  }
  if (!canCustomerDashboardAction(role, 'principalDataRights')) {
    return NextResponse.json({ ok: false, error: 'PRINCIPAL_DSR_FORBIDDEN' }, { status: 403, headers: noStoreHeaders() });
  }

  const envRecord = await prisma.projectEnvironment.findFirst({
    where: {
      id: environmentId,
      projectId,
      project: { organizationId },
    },
    select: { id: true, projectId: true },
  });
  if (!envRecord) {
    return NextResponse.json({ ok: false, error: 'TENANT_ENVIRONMENT_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  }

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: 'INVALID_REQUEST_BODY' }, { status: 422, headers: noStoreHeaders() });
  }
  const obj = body as Record<string, unknown>;
  const pluginId = typeof obj.pluginId === 'string' ? obj.pluginId.trim() : '';
  const action = obj.action;
  const reason = typeof obj.reason === 'string' ? obj.reason.trim() : '';
  const principal =
    obj.principal && typeof obj.principal === 'object' && !Array.isArray(obj.principal)
      ? (obj.principal as PrincipalRef)
      : null;

  if (
    !pluginId ||
    !principal ||
    !reason ||
    (action !== 'export' && action !== 'correct' && action !== 'erase')
  ) {
    return NextResponse.json({ ok: false, error: 'INVALID_PRINCIPAL_DSR_INPUT' }, { status: 422, headers: noStoreHeaders() });
  }

  const mode =
    obj.mode === 'DELETE' || obj.mode === 'RESTRICT'
      ? (obj.mode as ErasureMode)
      : undefined;
  const fields =
    obj.fields && typeof obj.fields === 'object' && !Array.isArray(obj.fields)
      ? (obj.fields as Record<string, unknown>)
      : undefined;

  const tenantId = `org/${organizationId}/project/${projectId}/environment/${environmentId}`;
  try {
    const result = await executePrincipalDataRightsRequest({
      tenantId,
      pluginId,
      action,
      principal,
      ...(fields ? { patch: { fields } } : {}),
      ...(mode ? { mode } : {}),
      context: {
        actorId: session.userId,
        actorEmail: session.email,
        reason,
      },
    });
    return NextResponse.json({ ok: true, result }, { headers: noStoreHeaders() });
  } catch (err: unknown) {
    const mapped = mapDbError(err);
    return NextResponse.json({ ok: false, error: mapped.code }, { status: mapped.status, headers: noStoreHeaders() });
  }
}, { write: true, reauth: true });
