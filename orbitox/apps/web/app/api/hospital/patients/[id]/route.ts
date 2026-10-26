import { NextRequest, NextResponse } from 'next/server';
import { authenticatedHospitalFetch } from '../../_init';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';

export const PATCH = withHospitalGuard(async (req: NextRequest, context: { params: Promise<{ id: string }> }, authContext) => {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const res = await authenticatedHospitalFetch(`/api/hospital/patients/${id}`, authContext, {
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

export const POST = withHospitalGuard(async (req: NextRequest, context: { params: Promise<{ id: string }> }, authContext) => {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action'); // 'admit' | 'discharge'
    const body = await req.json().catch(() => ({}));
    let url = `/api/hospital/patients/${id}`;
    if (action === 'admit') url += '/admit';
    else if (action === 'discharge') url += '/discharge';

    const res = await authenticatedHospitalFetch(url, authContext, {
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

export const DELETE = withHospitalGuard(async (_req: NextRequest, context: { params: Promise<{ id: string }> }, authContext) => {
  try {
    const { id } = await context.params;
    const res = await authenticatedHospitalFetch(`/api/hospital/patients/${id}`, authContext, {
      method: 'DELETE',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 502 });
  }
});
