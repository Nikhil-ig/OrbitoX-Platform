import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth } from '@/lib/customer-auth';
import { getCustomerOrganizationRole, noStoreHeaders } from '@/lib/customer-dashboard';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ organizationId: string }> };

export const GET = withCustomerAuth<RouteContext>(async (_request, session, context) => {
  const { organizationId } = await context.params;
  if (!await getCustomerOrganizationRole(organizationId, session.userId)) {
    return NextResponse.json({ ok: false, error: 'ORGANIZATION_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  }
  const members = await prisma.customerMembership.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'asc' },
    select: {
      userId: true,
      role: true,
      createdAt: true,
      user: { select: { email: true, emailVerifiedAt: true } },
    },
  });
  return NextResponse.json({
    ok: true,
    members: members.map(({ userId, role, createdAt, user }) => ({
      userId,
      email: user.email,
      emailVerified: user.emailVerifiedAt !== null,
      role,
      createdAt,
    })),
  }, { headers: noStoreHeaders() });
}, { write: false });

export const PATCH = withCustomerAuth<RouteContext>(async (request: NextRequest, session, context) => {
  const { organizationId } = await context.params;
  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body) || typeof body.userId !== 'string' || typeof body.role !== 'string') {
    return NextResponse.json({ ok: false, error: 'INVALID_MEMBER_UPDATE' }, { status: 422, headers: noStoreHeaders() });
  }
  const actorRole = await getCustomerOrganizationRole(organizationId, session.userId);
  if (!actorRole) return NextResponse.json({ ok: false, error: 'ORGANIZATION_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  if (!['OWNER', 'ADMIN'].includes(actorRole)) {
    return NextResponse.json({ ok: false, error: 'MEMBER_ROLE_CHANGE_FORBIDDEN' }, { status: 403, headers: noStoreHeaders() });
  }
  if (!['ADMIN', 'MEMBER', 'BILLING'].includes(body.role)) {
    return NextResponse.json({ ok: false, error: 'INVALID_MEMBER_ROLE' }, { status: 422, headers: noStoreHeaders() });
  }
  const target = await prisma.customerMembership.findUnique({
    where: { organizationId_userId: { organizationId, userId: body.userId } },
    select: { role: true },
  });
  if (!target) return NextResponse.json({ ok: false, error: 'MEMBER_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  if (target.role === 'OWNER') {
    return NextResponse.json({ ok: false, error: 'OWNERSHIP_TRANSFER_REQUIRED' }, { status: 409, headers: noStoreHeaders() });
  }
  await prisma.customerMembership.update({
    where: { organizationId_userId: { organizationId, userId: body.userId } },
    data: { role: body.role as 'ADMIN' | 'MEMBER' | 'BILLING' },
  });
  return NextResponse.json({ ok: true }, { headers: noStoreHeaders() });
}, { write: true });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
