import { NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { getOverviewAlerts } from '@/server/overview/overview-service';

const noStore = { 'Cache-Control': 'no-store' };

export const GET = withOperatorAuth(async (_request, session) => {
  try {
    const alerts = await getOverviewAlerts(session);
    return NextResponse.json({ success: true, data: alerts }, { headers: noStore });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to fetch alerts' } },
      { status: 500, headers: noStore }
    );
  }
});

