import { NextRequest, NextResponse } from 'next/server';
import { safeProxyOrFallback } from '../_init';
import { hospitalStore } from '../_store';

export async function GET(req: NextRequest) {
  const contextId = req.headers.get('x-context-id') || '';
  return safeProxyOrFallback(
    req,
    '/api/hospital/appointments',
    () => hospitalStore.getAppointments(),
    {
      headers: contextId ? { 'x-context-id': contextId } : undefined,
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return safeProxyOrFallback(
      req,
      '/api/hospital/appointments',
      () => hospitalStore.addAppointment(body),
      {
        method: 'POST',
        body,
      }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
