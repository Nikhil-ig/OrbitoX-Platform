import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth } from '@/server/auth/customer-auth';
import {
  canCustomerDashboardAction,
  getCustomerOrganizationRole,
  noStoreHeaders,
} from '@/server/organizations/customer-dashboard';
import { consumeExportDownloadToken } from '@/server/data-rights/service';

type RouteContext = { params: Promise<{ organizationId: string }> };

export const POST = withCustomerAuth<RouteContext>(async (request: NextRequest, session, context) => {
  const { organizationId } = await context.params;
  const role = await getCustomerOrganizationRole(organizationId, session.userId);
  if (!role) {
    return NextResponse.json({ ok: false, error: 'ORGANIZATION_NOT_FOUND' }, { status: 404, headers: noStoreHeaders() });
  }
  if (!canCustomerDashboardAction(role, 'downloadExport')) {
    return NextResponse.json({ ok: false, error: 'EXPORT_DOWNLOAD_FORBIDDEN' }, { status: 403, headers: noStoreHeaders() });
  }

  const body: unknown = await request.json().catch(() => null);
  const rawToken =
    body && typeof body === 'object' && !Array.isArray(body) && typeof (body as Record<string, unknown>).token === 'string'
      ? ((body as Record<string, unknown>).token as string).trim()
      : '';

  if (!rawToken) {
    return NextResponse.json({ ok: false, error: 'EXPORT_TOKEN_REQUIRED' }, { status: 422, headers: noStoreHeaders() });
  }

  const download = await consumeExportDownloadToken({
    organizationId,
    rawToken,
    userId: session.userId,
  });

  if (!download.ok) {
    return NextResponse.json({ ok: false, error: download.error }, { status: download.status, headers: noStoreHeaders() });
  }

  return new NextResponse(new Uint8Array(download.buffer), {
    status: 200,
    headers: {
      ...noStoreHeaders(),
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="orbitox-export-${download.jobId}.zip"`,
      'Content-Length': String(download.buffer.length),
    },
  });
}, { write: true });
