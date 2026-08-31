import { NextRequest, NextResponse } from 'next/server';
import { ORBITOX_BACKEND_URL } from '../../../../_init';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const res = await fetch(`${ORBITOX_BACKEND_URL}/api/hospital/security/staff/${id}/toggle-duty`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-staff-id': req.headers.get('x-staff-id') || 'admin_root_01',
        'x-context-id': req.headers.get('x-context-id') || 'apollo-global'
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 502 });
  }
}
