import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import {
  getTenantDetail,
  updateTenant,
  updateTenantCustomDomain,
  deleteTenant,
} from '@/server/tenants/tenants-service';

const noStore = { 'Cache-Control': 'no-store' };

export const GET = withOperatorAuth<{ params: Promise<{ id: string }> }>(
  async (_request: NextRequest, session, context) => {
    try {
      const { id } = await context.params;
      const detail = await getTenantDetail(id, session);
      if (!detail) {
        return NextResponse.json(
          { success: false, error: { message: `Tenant ${id} not found` } },
          { status: 404, headers: noStore },
        );
      }
      return NextResponse.json({ success: true, data: detail }, { headers: noStore });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: { message: err.message || 'Failed to fetch tenant' } },
        { status: 500, headers: noStore },
      );
    }
  },
);

export const PATCH = withOperatorAuth<{ params: Promise<{ id: string }> }>(
  async (request: NextRequest, session, context) => {
    try {
      const { id } = await context.params;
      const body = await request.json().catch(() => ({}));

      if (body.name || body.planTier) {
        const updates: { name?: string; planTier?: string; customDomain?: string } = {};
        if (body.name) updates.name = body.name.trim();
        if (body.planTier) updates.planTier = body.planTier.trim().toLowerCase();
        if (body.customDomain) updates.customDomain = body.customDomain.trim().toLowerCase();

        const res = await updateTenant(id, updates, session);
        return NextResponse.json({ success: true, data: res.tenant }, { headers: noStore });
      }

      if (body.customDomain) {
        const res = await updateTenantCustomDomain(
          id,
          { customDomain: body.customDomain, operatorEmail: session.email },
          session,
        );
        return NextResponse.json({ success: true, data: res }, { headers: noStore });
      }

      return NextResponse.json(
        { success: false, error: { message: 'No valid update fields provided (name, planTier, or customDomain required)' } },
        { status: 400, headers: noStore },
      );
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: { message: err.message || 'Failed to update tenant' } },
        { status: 500, headers: noStore },
      );
    }
  },
  { write: true },
);

export const DELETE = withOperatorAuth<{ params: Promise<{ id: string }> }>(
  async (request: NextRequest, session, context) => {
    try {
      const { id } = await context.params;
      const body = await request.json().catch(() => ({}));
      const reason = body.reason || 'Operator decommissioned tenant environment';

      const res = await deleteTenant(id, { reason }, session);
      return NextResponse.json({ success: true, data: res }, { headers: noStore });
    } catch (err: any) {
      const isReauth = err.message?.includes('STEP_UP_REAUTH');
      const isReason = err.message?.includes('INVALID_JUSTIFICATION');
      const status = isReauth ? 403 : isReason ? 400 : 500;
      return NextResponse.json(
        { success: false, error: { message: err.message || 'Failed to delete tenant' } },
        { status, headers: noStore },
      );
    }
  },
  { write: true },
);
