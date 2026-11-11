import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth } from '@/server/auth/customer-auth';
import {
  canCustomerDashboardAction,
  getCustomerOrganizationRole,
  noStoreHeaders,
} from '@/server/organizations/customer-dashboard';
import { platformRepository } from '@/server/db/platform-repository';
import { prisma } from '@/server/db/prisma';

type RouteContext = { params: Promise<{ organizationId: string }> };

export const GET = withCustomerAuth<RouteContext>(async (_request, session, context) => {
  const { organizationId } = await context.params;
  if (!await getCustomerOrganizationRole(organizationId, session.userId)) {
    return NextResponse.json({ ok: false, error: 'ORGANIZATION_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  }
  const projects = await prisma.platformProject.findMany({
    where: { organizationId },
    select: { id: true },
  });
  const keys = (await Promise.all(projects.map((project) =>
    platformRepository.listApiKeys({ projectId: project.id }),
  ))).flat();
  return NextResponse.json({
    ok: true,
    keys: keys.map((key) => ({
      id: key.id,
      keyId: key.keyId,
      name: key.name,
      maskedDisplay: key.maskedDisplay,
      status: key.status,
      capabilities: key.capabilities,
      environmentId: key.environmentId,
      projectId: key.projectId,
      expiresAt: key.expiresAt,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.issuedAt,
    })),
  }, { headers: noStoreHeaders() });
}, { write: false });

export const POST = withCustomerAuth<RouteContext>(async (request: NextRequest, session, context) => {
  const { organizationId } = await context.params;
  const role = await getCustomerOrganizationRole(organizationId, session.userId);
  if (!role) return NextResponse.json({ ok: false, error: 'ORGANIZATION_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  if (!canCustomerDashboardAction(role, 'createApiKey')) {
    return NextResponse.json({ ok: false, error: 'API_KEY_CREATE_FORBIDDEN' }, { status: 403, headers: noStoreHeaders() });
  }
  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body) || !isString(body.environmentId) || !isString(body.name)) {
    return NextResponse.json({ ok: false, error: 'INVALID_API_KEY_INPUT' }, { status: 422, headers: noStoreHeaders() });
  }
  const environment = await prisma.projectEnvironment.findFirst({
    where: { id: body.environmentId, project: { organizationId } },
    select: {
      id: true,
      slug: true,
      project: { select: { id: true, slug: true, organizationId: true } },
    },
  });
  if (!environment) return NextResponse.json({ ok: false, error: 'ENVIRONMENT_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  const tenantId = `org/${organizationId}/project/${environment.project.id}/environment/${environment.id}`;
  const capabilities = Array.isArray(body.capabilities) &&
      body.capabilities.every((value) => typeof value === 'string' && value.length <= 100)
    ? body.capabilities as string[]
    : ['read'];
  try {
    const created = await platformRepository.createApiKey({
      name: body.name.slice(0, 100),
      environmentId: environment.id,
      projectId: environment.project.id,
      keyType: 'PROJECT_SCOPED',
      capabilities,
      tenantScope: [tenantId],
      createdBy: session.userId,
    });
    await platformRepository.recordPlatformAdminAudit({
      action: 'customer.organization.api_key_created',
      entityType: 'PlatformApiKey',
      entityId: created.keyRecord.id,
      organizationId,
      projectId: environment.project.id,
      environmentId: environment.id,
      actorId: session.userId,
      actorEmail: session.email,
      metadata: { keyId: created.keyRecord.keyId, maskedDisplay: created.keyRecord.maskedDisplay },
    });
    return NextResponse.json({
      ok: true,
      key: {
        id: created.keyRecord.id,
        keyId: created.keyRecord.keyId,
        name: created.keyRecord.name,
        maskedDisplay: created.keyRecord.maskedDisplay,
        status: created.keyRecord.status,
        environmentId: created.keyRecord.environmentId,
      },
      secret: created.rawSecret,
    }, { status: 201, headers: noStoreHeaders() });
  } catch (error) {
    console.error('Unable to create customer API key.', error);
    return NextResponse.json({ ok: false, error: 'API_KEY_CREATE_FAILED' }, { status: 503, headers: noStoreHeaders() });
  }
}, { write: true });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
