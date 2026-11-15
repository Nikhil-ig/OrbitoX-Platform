import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { markInvoicePaid } from '@/server/billing/billing-service';

const noStore = { 'Cache-Control': 'no-store' };

export const dynamic = 'force-dynamic';

export const POST = withOperatorAuth<{ params: Promise<{ id: string }> }>(
  async (request: NextRequest, session, context) => {
    try {
      const { id } = await context.params;
      const body = await request.json().catch(() => ({}));
      const reason = body.reason?.trim();

      if (!reason || reason.length < 5) {
        return NextResponse.json(
          { success: false, error: { message: 'A valid reason of at least 5 characters is required to mark an invoice as paid.' } },
          { status: 400, headers: noStore }
        );
      }

      const result = await markInvoicePaid(id, { reason }, session);
      return NextResponse.json({ success: true, data: result }, { headers: noStore });
    } catch (err: any) {
      const isReauth = err.message?.includes('STEP_UP_REAUTH_REQUIRED');
      const isMinLen = err.message?.includes('INVALID_REASON');
      const isNotFound = err.message?.includes('NOT_FOUND');
      const status = isReauth ? 403 : isMinLen ? 400 : isNotFound ? 404 : 500;
      return NextResponse.json(
        { success: false, error: { message: err.message || 'Failed to mark invoice as paid' } },
        { status, headers: noStore }
      );
    }
  },
  { write: true, reauth: true }
);

