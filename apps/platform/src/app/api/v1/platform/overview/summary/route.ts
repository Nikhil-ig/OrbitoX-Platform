import { NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { getOverviewSummary } from '@/server/overview/overview-service';

const noStore = { 'Cache-Control': 'no-store' };

export const GET = withOperatorAuth(async (_request, session) => {
  try {
    const summary = await getOverviewSummary(session);
    return NextResponse.json({ success: true, data: summary }, { headers: noStore });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to fetch overview summary' } },
      { status: 500, headers: noStore }
    );
  }
});

