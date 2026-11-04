import { NextResponse } from 'next/server';
import { withCustomerAuth } from '@/lib/customer-auth';
import { getCustomerOrganizationRole, noStoreHeaders } from '@/lib/customer-dashboard';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ organizationId: string }> };

const customerAuditActions = [
  'customer.organization.',
  'customer.tenant.',
  'customer.member.',
  'billing.subscription.',
] as const;

export const GET = withCustomerAuth<RouteContext>(async (request, session, context) => {
  const { organizationId } = await context.params;
  if (!await getCustomerOrganizationRole(organizationId, session.userId)) {
    return NextResponse.json({ ok: false, error: 'ORGANIZATION_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  }
  const cursor = request.nextUrl.searchParams.get('before');
  const rows = await prisma.platformAuditEvent.findMany({
    where: {
      organizationId,
      OR: customerAuditActions.map((prefix) => ({ action: { startsWith: prefix } })),
      ...(cursor ? { occurredAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: { occurredAt: 'desc' },
    take: 100,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      status: true,
      occurredAt: true,
    },
  });
  return NextResponse.json({ ok: true, events: rows }, { headers: noStoreHeaders() });
}, { write: false });
