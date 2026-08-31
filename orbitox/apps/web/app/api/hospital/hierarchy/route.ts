import { NextRequest, NextResponse } from 'next/server';
import { ORBITOX_BACKEND_URL } from '../_init';

export async function GET() {
  try {
    const res = await fetch(`${ORBITOX_BACKEND_URL}/api/hospital/hierarchy`, {
      cache: 'no-store'
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${ORBITOX_BACKEND_URL}/api/hospital/contexts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 502 });
  }
}
