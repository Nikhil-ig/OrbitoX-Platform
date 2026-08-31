import { NextRequest, NextResponse } from 'next/server';
import { ORBITOX_BACKEND_URL } from '../../_init';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const contextId = req.headers.get('x-context-id') || '';
    const res = await fetch(`${ORBITOX_BACKEND_URL}/api/hospital/appointments/${id}`, {
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

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const contextId = req.headers.get('x-context-id') || '';
    const res = await fetch(`${ORBITOX_BACKEND_URL}/api/hospital/appointments/${id}`, {
      method: 'DELETE',
      headers: contextId ? { 'x-context-id': contextId } : {}
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 502 });
  }
}
