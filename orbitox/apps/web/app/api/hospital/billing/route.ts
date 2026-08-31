import { NextRequest, NextResponse } from 'next/server';
import { ORBITOX_BACKEND_URL } from '../_init';

export async function GET(req: NextRequest) {
  try {
    const contextId = req.headers.get('x-context-id') || '';
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');
    const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : '';

    const res = await fetch(`${ORBITOX_BACKEND_URL}/api/hospital/billing${query}`, {
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

    // Route: /api/hospital/billing/discharge
    const res = await fetch(`${ORBITOX_BACKEND_URL}/api/hospital/billing/discharge`, {
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
