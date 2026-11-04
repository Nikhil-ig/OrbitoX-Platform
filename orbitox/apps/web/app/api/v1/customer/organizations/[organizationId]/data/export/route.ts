import { NextResponse } from 'next/server';
import { withCustomerAuth } from '@/lib/customer-auth';
import { canCustomerDashboardAction, getCustomerOrganizationRole, noStoreHeaders } from '@/lib/customer-dashboard';

type RouteContext = { params: Promise<{ organizationId: string }> };

export const POST = withCustomerAuth<RouteContext>(async (_request, session, context) => {
  const { organizationId } = await context.params;
  const role = await getCustomerOrganizationRole(organizationId, session.userId);
  if (!role) return NextResponse.json({ ok: false, error: 'ORGANIZATION_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  if (!canCustomerDashboardAction(role, 'requestExport')) {
    return NextResponse.json({ ok: false, error: 'EXPORT_REQUEST_FORBIDDEN' }, { status: 403, headers: noStoreHeaders() });
  }
  return NextResponse.json({ ok: false, error: 'DATA_EXPORT_NOT_IMPLEMENTED' }, { status: 501, headers: noStoreHeaders() });
}, { write: true });
