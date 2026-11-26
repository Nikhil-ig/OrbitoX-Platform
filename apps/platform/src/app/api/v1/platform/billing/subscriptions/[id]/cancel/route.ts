import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { cancelSubscription } from '@/server/billing/billing-service';

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
          { success: false, error: { message: 'A valid reason of at least 5 characters is required to cancel a subscription.' } },
          { status: 400, headers: noStore }
        );
      }

      const result = await cancelSubscription(id, { reason }, session);
      return NextResponse.json({ success: true, data: result }, { headers: noStore });
    } catch (err: any) {
      const msg = err?.message || 'Failed to cancel subscription';
      const isReauth = msg.includes('STEP_UP_REAUTH_REQUIRED');
      const isMinLen = msg.includes('INVALID_REASON');
      const isNotFound = msg.includes('SUBSCRIPTION_NOT_FOUND');
      const isConflict = msg.includes('INVALID_SUBSCRIPTION_STATE');
      const status = isReauth ? 403 : isMinLen ? 400 : isNotFound ? 404 : isConflict ? 409 : 500;
      return NextResponse.json(
        { success: false, error: { message: msg } },
        { status, headers: noStore }
      );
    }
  },
  { write: true, reauth: true }
);

