import { NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { getOverviewTelemetry } from '@/server/overview/overview-service';

const noStore = { 'Cache-Control': 'no-store' };

export const GET = withOperatorAuth(async (_request, session) => {
  try {
    const telemetry = await getOverviewTelemetry(session);
    return NextResponse.json({ success: true, data: telemetry }, { headers: noStore });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to fetch telemetry' } },
      { status: 500, headers: noStore }
    );
  }
});

