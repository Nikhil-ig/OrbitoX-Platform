import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth } from '@/lib/customer-auth';
import {
  canCustomerDashboardAction,
  getCustomerOrganizationRole,
  noStoreHeaders,
} from '@/lib/customer-dashboard';
import { prisma } from '@/lib/prisma';
import { platformRepository } from '@/lib/platform-repository';

type RouteContext = { params: Promise<{ organizationId: string; userId: string }> };

export const DELETE = withCustomerAuth<RouteContext>(async (
  request: NextRequest,
  session,
  context,
) => {
  const { organizationId, userId } = await context.params;
  const actorRole = await getCustomerOrganizationRole(organizationId, session.userId);
  if (!actorRole) {
    return NextResponse.json({ ok: false, error: 'ORGANIZATION_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  }
  if (!canCustomerDashboardAction(actorRole, 'removeMember')) {
    return NextResponse.json({ ok: false, error: 'MEMBER_REMOVAL_FORBIDDEN' }, { status: 403, headers: noStoreHeaders() });
  }
  const target = await prisma.customerMembership.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    select: { role: true },
  });
  if (!target) return NextResponse.json({ ok: false, error: 'MEMBER_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  if (target.role === 'OWNER' && actorRole !== 'OWNER') {
    return NextResponse.json({ ok: false, error: 'ONLY_OWNER_CAN_REMOVE_OWNER' }, { status: 403, headers: noStoreHeaders() });
  }
  try {
    await prisma.customerMembership.delete({
      where: { organizationId_userId: { organizationId, userId } },
    });
  } catch (error) {
    if (isLastOwnerViolation(error)) {
      return NextResponse.json({ ok: false, error: 'LAST_OWNER_REQUIRED' }, { status: 409, headers: noStoreHeaders() });
    }
    throw error;
  }
  await platformRepository.recordPlatformAdminAudit({
    action: 'customer.organization.member_removed',
    entityType: 'CustomerMembership',
    entityId: userId,
    organizationId,
    actorId: session.userId,
    actorEmail: session.email,
    metadata: { removedUserId: userId },
  });
  return NextResponse.json({ ok: true }, { headers: noStoreHeaders() });
}, { write: true });

function isLastOwnerViolation(error: unknown): boolean {
  return error instanceof Error && error.message.includes('CustomerMembership_last_owner');
}
