import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth } from '@/lib/customer-auth';
import {
  canCustomerDashboardAction,
  getCustomerOrganizationRole,
  noStoreHeaders,
} from '@/lib/customer-dashboard';
import { mapDbError } from '@/lib/db-errors';
import {
  cancelOrganizationDeletion,
  getOrganizationDeletionStatusForOwner,
  scheduleOrganizationDeletion,
} from '@/lib/data-rights/service';

type RouteContext = { params: Promise<{ organizationId: string }> };

export const GET = withCustomerAuth<RouteContext>(async (_request, session, context) => {
  const { organizationId } = await context.params;
  const res = await getOrganizationDeletionStatusForOwner({
    organizationId,
    userId: session.userId,
  });

  if (res.kind === 'not_found') {
    return NextResponse.json({ ok: false, error: 'ORGANIZATION_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  }
  if (res.kind === 'forbidden') {
    return NextResponse.json({ ok: false, error: 'DELETION_READ_FORBIDDEN' }, { status: 403, headers: noStoreHeaders() });
  }

  return NextResponse.json({ ok: true, request: res.request }, { headers: noStoreHeaders() });
}, { write: false });

export const POST = withCustomerAuth<RouteContext>(async (request: NextRequest, session, context) => {
  const { organizationId } = await context.params;
  const role = await getCustomerOrganizationRole(organizationId, session.userId);
  if (!role) {
    return NextResponse.json({ ok: false, error: 'ORGANIZATION_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  }
  if (!canCustomerDashboardAction(role, 'requestDeletion')) {
    return NextResponse.json({ ok: false, error: 'DELETION_REQUEST_FORBIDDEN' }, { status: 403, headers: noStoreHeaders() });
  }

  const body: unknown = await request.json().catch(() => null);
  const reason =
    body && typeof body === 'object' && !Array.isArray(body) && typeof (body as Record<string, unknown>).reason === 'string'
      ? ((body as Record<string, unknown>).reason as string).trim().slice(0, 500)
      : undefined;

  try {
    const deletion = await scheduleOrganizationDeletion({
      organizationId,
      requestedByUserId: session.userId,
      actorEmail: session.email,
      reason,
    });
    return NextResponse.json({ ok: true, request: deletion }, { status: 202, headers: noStoreHeaders() });
  } catch (err: unknown) {
    const mapped = mapDbError(err);
    return NextResponse.json({ ok: false, error: mapped.code }, { status: mapped.status, headers: noStoreHeaders() });
  }
}, { write: true, reauth: true });

export const DELETE = withCustomerAuth<RouteContext>(async (_request: NextRequest, session, context) => {
  const { organizationId } = await context.params;
  const role = await getCustomerOrganizationRole(organizationId, session.userId);
  if (!role) {
    return NextResponse.json({ ok: false, error: 'ORGANIZATION_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  }
  if (!canCustomerDashboardAction(role, 'cancelDeletion')) {
    return NextResponse.json({ ok: false, error: 'DELETION_CANCEL_FORBIDDEN' }, { status: 403, headers: noStoreHeaders() });
  }

  try {
    const cancelled = await cancelOrganizationDeletion({
      organizationId,
      actorUserId: session.userId,
      actorEmail: session.email,
    });
    return NextResponse.json({ ok: true, request: cancelled }, { headers: noStoreHeaders() });
  } catch (err: unknown) {
    const mapped = mapDbError(err);
    return NextResponse.json({ ok: false, error: mapped.code }, { status: mapped.status, headers: noStoreHeaders() });
  }
}, { write: true, reauth: true });
