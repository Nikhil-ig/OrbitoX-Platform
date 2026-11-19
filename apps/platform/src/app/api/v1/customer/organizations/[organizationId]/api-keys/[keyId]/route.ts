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

export const DELETE = withCustomerAuth<RouteContext>(async (_request: NextRequest, session, context) => {
  const { organizationId, keyId } = await context.params;
  const role = await getCustomerOrganizationRole(organizationId, session.userId);
  if (!role) return NextResponse.json({ ok: false, error: 'ORGANIZATION_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  if (!canCustomerDashboardAction(role, 'revokeApiKey')) {
    return NextResponse.json({ ok: false, error: 'API_KEY_REVOCATION_FORBIDDEN' }, { status: 403, headers: noStoreHeaders() });
  }
  const key = await prisma.platformApiKey.findFirst({
    where: {
      OR: [{ id: keyId }, { keyId }],
      environment: { project: { organizationId } },
    },
    select: { id: true, environmentId: true, environment: { select: { projectId: true } } },
  });
  if (!key) return NextResponse.json({ ok: false, error: 'API_KEY_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  const revoked = await platformRepository.setKeyStatus(key.id, 'REVOKED', 'Revoked by organization owner.');
  if (!revoked) return NextResponse.json({ ok: false, error: 'API_KEY_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  await platformRepository.recordPlatformAdminAudit({
    action: 'customer.organization.api_key_revoked',
    entityType: 'PlatformApiKey',
    entityId: key.id,
    organizationId,
    projectId: key.environment.projectId,
    environmentId: key.environmentId,
    actorId: session.userId,
    actorEmail: session.email,
  });
  return NextResponse.json({ ok: true }, { headers: noStoreHeaders() });
}, { write: true, reauth: true });
