import { NextRequest, NextResponse } from 'next/server';
import { authenticatedHospitalFetch } from '../../_init';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';

export const PATCH = withHospitalGuard(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, authContext) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const res = await authenticatedHospitalFetch(`/api/hospital/beds/${id}`, authContext, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 502 });
  }
});

export const POST = withHospitalGuard(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, authContext) => {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'turnover';

    const endpoint = action === 'discharge' ? `/api/hospital/beds/${id}/discharge` : `/api/hospital/beds/${id}/turnover`;

    const res = await authenticatedHospitalFetch(endpoint, authContext, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 502 });
  }
});
