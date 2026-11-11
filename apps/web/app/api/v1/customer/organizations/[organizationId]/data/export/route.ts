import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth } from '@/lib/customer-auth';
import {
  canCustomerDashboardAction,
  getCustomerOrganizationRole,
  noStoreHeaders,
} from '@/lib/customer-dashboard';
import { mapDbError } from '@/lib/db-errors';
import { requestOrganizationExport } from '@/lib/data-rights/service';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ organizationId: string }> };

export const GET = withCustomerAuth<RouteContext>(async (_request, session, context) => {
  const { organizationId } = await context.params;
  const role = await getCustomerOrganizationRole(organizationId, session.userId);
  if (!role) {
    return NextResponse.json({ ok: false, error: 'ORGANIZATION_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  }
  if (!canCustomerDashboardAction(role, 'requestExport')) {
    return NextResponse.json({ ok: false, error: 'EXPORT_READ_FORBIDDEN' }, { status: 403, headers: noStoreHeaders() });
  }

  const jobs = await prisma.dataRightsJob.findMany({
    where: { organizationId, kind: 'ORG_EXPORT' },
    orderBy: { createdAt: 'desc' },
    take: 25,
    select: {
      id: true,
      status: true,
      createdAt: true,
      startedAt: true,
      completedAt: true,
      expiresAt: true,
      purgedAt: true,
      lastError: true,
    },
  });

  return NextResponse.json({ ok: true, jobs }, { headers: noStoreHeaders() });
}, { write: false });

export const POST = withCustomerAuth<RouteContext>(async (_request: NextRequest, session, context) => {
  const { organizationId } = await context.params;
  const role = await getCustomerOrganizationRole(organizationId, session.userId);
  if (!role) {
    return NextResponse.json({ ok: false, error: 'ORGANIZATION_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  }
  if (!canCustomerDashboardAction(role, 'requestExport')) {
    return NextResponse.json({ ok: false, error: 'EXPORT_REQUEST_FORBIDDEN' }, { status: 403, headers: noStoreHeaders() });
  }

  try {
    const job = await requestOrganizationExport({
      organizationId,
      requestedByUserId: session.userId,
      actorEmail: session.email,
    });
    return NextResponse.json({ ok: true, job }, { status: 202, headers: noStoreHeaders() });
  } catch (err: unknown) {
    const mapped = mapDbError(err);
    return NextResponse.json({ ok: false, error: mapped.code }, { status: mapped.status, headers: noStoreHeaders() });
  }
}, { write: true, reauth: true });
