import { NextRequest, NextResponse } from 'next/server';
import { ORBITOX_BACKEND_URL } from '../_init';

export async function POST(req: NextRequest) {
  try {
    const res = await fetch(`${ORBITOX_BACKEND_URL}/api/hospital/reset-seed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 502 });
  }
}
