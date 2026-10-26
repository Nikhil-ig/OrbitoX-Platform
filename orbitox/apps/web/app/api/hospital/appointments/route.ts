import { NextRequest, NextResponse } from 'next/server';
import { safeProxyOrFallback } from '../_init';
import { hospitalStore } from '../_store';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';

export const GET = withHospitalGuard(async (req: NextRequest, _routeContext, authContext) => {
  return safeProxyOrFallback(
    req,
    '/api/hospital/appointments',
    () => hospitalStore.getAppointments(),
    {},
    authContext
  );
});

export const POST = withHospitalGuard(async (req: NextRequest, _routeContext, authContext) => {
  try {
    const body = await req.json();
    return safeProxyOrFallback(
      req,
      '/api/hospital/appointments',
      () => hospitalStore.addAppointment(body),
      {
        method: 'POST',
        body,
      },
      authContext
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
});
