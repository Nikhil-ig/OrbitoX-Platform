import { NextRequest, NextResponse } from 'next/server';
import { safeProxyOrFallback } from '../_init';
import { hospitalStore } from '../_store';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';

export const GET = withHospitalGuard(async (req: NextRequest, _routeContext, authContext) => {
  return safeProxyOrFallback(
    req,
    '/api/hospital/patients',
    () => hospitalStore.getPatients(),
    {},
    authContext
  );
});

export const POST = withHospitalGuard(async (req: NextRequest, _routeContext, authContext) => {
  try {
    const body = await req.json();
    return safeProxyOrFallback(
      req,
      '/api/hospital/patients',
      () => hospitalStore.addPatient(body),
      {
        method: 'POST',
        body,
      },
      authContext
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Invalid request body' },
      { status: 400 }
    );
  }
});
