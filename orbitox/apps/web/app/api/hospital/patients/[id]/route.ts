import { NextRequest, NextResponse } from 'next/server';
import { ORBITOX_BACKEND_URL } from '../../_init';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const contextId = req.headers.get('x-context-id') || '';
    const res = await fetch(`${ORBITOX_BACKEND_URL}/api/hospital/patients/${id}`, {
      method: 'PATCH',
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

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action'); // 'admit' | 'discharge'
    const body = await req.json().catch(() => ({}));
    const contextId = req.headers.get('x-context-id') || '';

    let url = `${ORBITOX_BACKEND_URL}/api/hospital/patients/${id}`;
    if (action === 'admit') url += '/admit';
    else if (action === 'discharge') url += '/discharge';

    const res = await fetch(url, {
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

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const contextId = req.headers.get('x-context-id') || '';
    const res = await fetch(`${ORBITOX_BACKEND_URL}/api/hospital/patients/${id}`, {
      method: 'DELETE',
      headers: contextId ? { 'x-context-id': contextId } : {}
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 502 });
  }
}
