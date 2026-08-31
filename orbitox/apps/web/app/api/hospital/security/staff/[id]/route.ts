import { NextRequest, NextResponse } from 'next/server';
import { ORBITOX_BACKEND_URL } from '../../../_init';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const res = await fetch(`${ORBITOX_BACKEND_URL}/api/hospital/security/staff/${id}`, {
      headers: {
        'x-staff-id': req.headers.get('x-staff-id') || 'admin_root_01',
        'x-context-id': req.headers.get('x-context-id') || 'apollo-global'
      },
      cache: 'no-store'
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 502 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const res = await fetch(`${ORBITOX_BACKEND_URL}/api/hospital/security/staff/${id}`, {
      method: 'PUT',
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const res = await fetch(`${ORBITOX_BACKEND_URL}/api/hospital/security/staff/${id}`, {
      method: 'PATCH',
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const res = await fetch(`${ORBITOX_BACKEND_URL}/api/hospital/security/staff/${id}`, {
      method: 'DELETE',
      headers: {
        'x-staff-id': req.headers.get('x-staff-id') || 'admin_root_01',
        'x-context-id': req.headers.get('x-context-id') || 'apollo-global'
      }
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 502 });
  }
}
