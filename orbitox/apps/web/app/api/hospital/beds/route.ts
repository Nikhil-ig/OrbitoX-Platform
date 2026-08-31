import { NextRequest, NextResponse } from 'next/server';
import { ORBITOX_BACKEND_URL } from '../_init';

export async function GET(req: NextRequest) {
  try {
    const contextId = req.headers.get('x-context-id') || '';
    const res = await fetch(`${ORBITOX_BACKEND_URL}/api/hospital/beds`, {
      headers: contextId ? { 'x-context-id': contextId } : {},
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
    const contextId = req.headers.get('x-context-id') || '';
    const res = await fetch(`${ORBITOX_BACKEND_URL}/api/hospital/beds`, {
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
