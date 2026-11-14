import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { getTenantDetail, updateTenantCustomDomain } from '@/server/tenants/tenants-service';

const noStore = { 'Cache-Control': 'no-store' };

export const GET = withOperatorAuth<{ params: Promise<{ id: string }> }>(
  async (_request: NextRequest, session, context) => {
    try {
      const { id } = await context.params;
      const detail = await getTenantDetail(id, session);
      if (!detail) {
        return NextResponse.json(
          { success: false, error: { message: `Tenant ${id} not found` } },
          { status: 404, headers: noStore }
        );
      }
      return NextResponse.json({ success: true, data: detail }, { headers: noStore });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: { message: err.message || 'Failed to fetch tenant' } },
        { status: 500, headers: noStore }
      );
    }
  }
);

export const PATCH = withOperatorAuth<{ params: Promise<{ id: string }> }>(
  async (request: NextRequest, session, context) => {
    try {
      const { id } = await context.params;
      const body = await request.json().catch(() => ({}));
      if (!body.customDomain) {
        return NextResponse.json(
          { success: false, error: { message: 'customDomain is required' } },
          { status: 400, headers: noStore }
        );
      }
      const res = await updateTenantCustomDomain(
        id,
        { customDomain: body.customDomain, operatorEmail: session.email },
        session
      );
      return NextResponse.json({ success: true, data: res }, { headers: noStore });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: { message: err.message || 'Failed to update tenant domain' } },
        { status: 500, headers: noStore }
      );
    }
  },
  { write: true }
);
