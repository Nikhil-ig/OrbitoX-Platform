import { NextRequest, NextResponse } from 'next/server';
import { authenticatedHospitalFetch } from '../../../../_init';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';

export const POST = withHospitalGuard(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  authContext
) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const res = await authenticatedHospitalFetch(`/api/hospital/security/staff/${id}/toggle-duty`, authContext, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 502 });
  }
}, { adminOnly: true, sensitive: true });
