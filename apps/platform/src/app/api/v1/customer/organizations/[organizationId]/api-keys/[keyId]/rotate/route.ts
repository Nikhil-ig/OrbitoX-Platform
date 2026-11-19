import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth } from '@/server/auth/customer-auth';
import {
  canCustomerDashboardAction,
  getCustomerOrganizationRole,
  noStoreHeaders,
} from '@/server/organizations/customer-dashboard';
import { platformRepository } from '@/server/db/platform-repository';
import { prisma } from '@/server/db/prisma';

type RouteContext = { params: Promise<{ organizationId: string; keyId: string }> };

export const POST = withCustomerAuth<RouteContext>(async (request: NextRequest, session, context) => {
  const { organizationId, keyId } = await context.params;
  const role = await getCustomerOrganizationRole(organizationId, session.userId);
  if (!role) return NextResponse.json({ ok: false, error: 'ORGANIZATION_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  if (!canCustomerDashboardAction(role, 'rotateApiKey')) {
    return NextResponse.json({ ok: false, error: 'API_KEY_ROTATION_FORBIDDEN' }, { status: 403, headers: noStoreHeaders() });
  }
  const key = await prisma.platformApiKey.findFirst({
    where: {
      OR: [{ id: keyId }, { keyId }],
      environment: { project: { organizationId } },
    },
    select: { id: true, environmentId: true, environment: { select: { projectId: true } } },
  });
  if (!key) return NextResponse.json({ ok: false, error: 'API_KEY_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  const body: unknown = await request.json().catch(() => ({}));
  const graceWindowDays = isRecord(body) && typeof body.graceWindowDays === 'number'
    ? body.graceWindowDays
    : 7;
  if (!Number.isInteger(graceWindowDays) || graceWindowDays < 1 || graceWindowDays > 30) {
    return NextResponse.json({ ok: false, error: 'INVALID_GRACE_WINDOW' }, { status: 422, headers: noStoreHeaders() });
  }
  const rotated = await platformRepository.rotateApiKey(key.id, {
    graceWindowDays,
    operatorEmail: session.email,
  });
  if (!rotated) return NextResponse.json({ ok: false, error: 'API_KEY_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  await platformRepository.recordPlatformAdminAudit({
    action: 'customer.organization.api_key_rotated',
    entityType: 'PlatformApiKey',
    entityId: rotated.replacementKey.id,
    organizationId,
    projectId: key.environment.projectId,
    environmentId: key.environmentId,
    actorId: session.userId,
    actorEmail: session.email,
    metadata: {
      replacementKeyId: rotated.replacementKey.keyId,
      graceWindowDays,
    },
  });
  return NextResponse.json({
    ok: true,
    key: {
      id: rotated.replacementKey.id,
      keyId: rotated.replacementKey.keyId,
      name: rotated.replacementKey.name,
      maskedDisplay: rotated.replacementKey.maskedDisplay,
      status: rotated.replacementKey.status,
    },
    secret: rotated.replacementRawSecret,
  }, { headers: noStoreHeaders() });
}, { write: true });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
