import { NextRequest, NextResponse } from 'next/server';
import { authenticatedHospitalFetch } from '../../_init';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';

export const GET = withHospitalGuard(async (_req: NextRequest, _routeContext, authContext) => {
  try {
    const res = await authenticatedHospitalFetch('/api/hospital/security/session', authContext, {
      cache: 'no-store'
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 502 });
  }
}, { adminOnly: true, sensitive: true });
