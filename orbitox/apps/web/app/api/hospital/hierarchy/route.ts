import { NextRequest, NextResponse } from 'next/server';
import { authenticatedHospitalFetch } from '../_init';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';

export const GET = withHospitalGuard(async (_req: NextRequest, _routeContext, authContext) => {
  try {
    const res = await authenticatedHospitalFetch('/api/hospital/hierarchy', authContext, {
      cache: 'no-store'
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 502 });
  }
});

export const POST = withHospitalGuard(async (req: NextRequest, _routeContext, authContext) => {
  try {
    const body = await req.json();
    const res = await authenticatedHospitalFetch('/api/hospital/contexts', authContext, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 502 });
  }
});
