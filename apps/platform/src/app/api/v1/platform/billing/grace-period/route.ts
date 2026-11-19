import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { updateGracePeriod } from '@/server/billing/billing-service';

const noStore = { 'Cache-Control': 'no-store' };

export const dynamic = 'force-dynamic';

export const PUT = withOperatorAuth(
  async (request: NextRequest, session) => {
    try {
      const body = await request.json().catch(() => ({}));
      const planId = body.planId?.trim();
      const gracePeriodDays = Number(body.gracePeriodDays);
      const reason = body.reason?.trim();

      if (!planId) {
        return NextResponse.json(
          { success: false, error: { message: 'Plan ID is required.' } },
          { status: 400, headers: noStore }
        );
      }

      if (!gracePeriodDays || gracePeriodDays < 1) {
        return NextResponse.json(
          { success: false, error: { message: 'Grace period must be at least 1 day.' } },
          { status: 400, headers: noStore }
        );
      }

      if (!reason || reason.length < 5) {
        return NextResponse.json(
          { success: false, error: { message: 'A valid reason of at least 5 characters is required to update grace period policy.' } },
          { status: 400, headers: noStore }
        );
      }

      const result = await updateGracePeriod(planId, { gracePeriodDays, reason }, session);
      return NextResponse.json({ success: true, data: result }, { headers: noStore });
    } catch (err: any) {
      const isReauth = err.message?.includes('STEP_UP_REAUTH_REQUIRED');
      const isMinLen = err.message?.includes('INVALID_REASON');
      const status = isReauth ? 403 : isMinLen ? 400 : 500;
      return NextResponse.json(
        { success: false, error: { message: err.message || 'Failed to update grace period policy' } },
        { status, headers: noStore }
      );
    }
  },
  { write: true, reauth: true }
);

