import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { resumeTenant } from '@/server/tenants/tenants-service';

const noStore = { 'Cache-Control': 'no-store' };

export const POST = withOperatorAuth<{ params: Promise<{ id: string }> }>(
  async (request: NextRequest, session, context) => {
    try {
      const { id } = await context.params;
      const body = await request.json().catch(() => ({}));
      const reason = body.reason?.trim() || 'Operator manual reactivation';

      const requestId = request.headers.get('x-request-id') || `req_resume_${Date.now()}`;
      const result = await resumeTenant(
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
        { success: false, error: { message: err.message || 'Failed to resume tenant' } },
        { status, headers: noStore }
      );
    }
  },
  { write: true }
);

