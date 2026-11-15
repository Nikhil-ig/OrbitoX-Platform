import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { getBillingSummary } from '@/server/billing/billing-service';

const noStore = { 'Cache-Control': 'no-store' };

export const dynamic = 'force-dynamic';

export const GET = withOperatorAuth(
  async (_request: NextRequest, session) => {
    try {
      const summary = await getBillingSummary(session);
      return NextResponse.json({ success: true, data: summary }, { headers: noStore });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: { message: err.message || 'Failed to fetch billing summary' } },
        { status: 500, headers: noStore }
      );
    }
  }
);

