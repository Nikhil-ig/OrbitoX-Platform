import { NextRequest, NextResponse } from 'next/server';
import { safeProxyOrFallback } from '../../_init';
import { hospitalStore } from '../../_store';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';

export const GET = withHospitalGuard(async (req: NextRequest, _routeContext, authContext) => {
  const searchParams = req.nextUrl.searchParams.toString();
  const upstreamPath = `/api/hospital/security/staff${searchParams ? `?${searchParams}` : ''}`;

  return safeProxyOrFallback(
    req,
    upstreamPath,
    () => hospitalStore.getStaff(),
      {},
      authContext
  );
}, { adminOnly: true, sensitive: true });

export const POST = withHospitalGuard(async (req: NextRequest, _routeContext, authContext) => {
  try {
    const body = await req.json();
    return safeProxyOrFallback(
      req,
      '/api/hospital/security/staff',
      () => hospitalStore.getStaff(),
      {
        method: 'POST',
        body,
      },
      authContext
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}, { adminOnly: true, sensitive: true });
