import { NextRequest, NextResponse } from 'next/server';
import { ORBITOX_BACKEND_URL } from '../_init';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const contextId = req.headers.get('x-context-id') || body.bedId || '';
    const res = await fetch(`${ORBITOX_BACKEND_URL}/api/hospital/admissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(contextId ? { 'x-context-id': contextId } : {})
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 502 });
  }
}
