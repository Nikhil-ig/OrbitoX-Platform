import { NextRequest, NextResponse } from 'next/server';
import { ORBITOX_BACKEND_URL } from '../../_init';

export async function GET(req: NextRequest) {
  try {
    const staffId = req.headers.get('x-staff-id') || 'admin_root_01';
    const res = await fetch(`${ORBITOX_BACKEND_URL}/api/hospital/security/session`, {
      headers: {
        'x-staff-id': staffId
      },
      cache: 'no-store'
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 502 });
  }
}
