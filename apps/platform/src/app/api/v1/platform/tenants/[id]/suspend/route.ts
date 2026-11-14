import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { suspendTenant } from '@/server/tenants/tenants-service';

const noStore = { 'Cache-Control': 'no-store' };

export const POST = withOperatorAuth<{ params: Promise<{ id: string }> }>(
  async (request: NextRequest, session, context) => {
    try {
      const { id } = await context.params;
      const body = await request.json().catch(() => ({}));
      const reason = body.reason?.trim();

      if (!reason) {
        return NextResponse.json(
          { success: false, error: { message: 'A valid reason is required for tenant suspension.' } },
          { status: 400, headers: noStore }
        );
      }

      const requestId = request.headers.get('x-request-id') || `req_suspend_${Date.now()}`;
      const result = await suspendTenant(
        id,
        {
          reason,
          operatorEmail: session.email,
          requestId,
        },
        session
      );

      return NextResponse.json({ success: true, data: result }, { headers: noStore });
    } catch (err: any) {
      const status = err.message?.includes('not exist') ? 404 : 500;
      return NextResponse.json(
        { success: false, error: { message: err.message || 'Failed to suspend tenant' } },
        { status, headers: noStore }
      );
    }
  },
  { write: true }
);
