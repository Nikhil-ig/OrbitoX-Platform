import { NextRequest, NextResponse } from 'next/server';
import { safeProxyOrFallback } from '../../_init';
import { hospitalStore } from '../../_store';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams.toString();
  const upstreamPath = `/api/hospital/security/staff${searchParams ? `?${searchParams}` : ''}`;

  return safeProxyOrFallback(
    req,
    upstreamPath,
    () => hospitalStore.getStaff(),
    {
      headers: {
        'x-staff-id': req.headers.get('x-staff-id') || 'admin_root_01',
        'x-context-id': req.headers.get('x-context-id') || 'apollo-global',
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return safeProxyOrFallback(
      req,
      '/api/hospital/security/staff',
      () => hospitalStore.getStaff(),
      {
        method: 'POST',
        body,
        headers: {
          'x-staff-id': req.headers.get('x-staff-id') || 'admin_root_01',
          'x-context-id': req.headers.get('x-context-id') || 'apollo-global',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
