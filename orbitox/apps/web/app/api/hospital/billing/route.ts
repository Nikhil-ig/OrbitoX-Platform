import { NextRequest, NextResponse } from 'next/server';
import { safeProxyOrFallback } from '../_init';
import { hospitalStore } from '../_store';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';

export const GET = withHospitalGuard(async (req: NextRequest, _routeContext, authContext) => {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get('patientId') || undefined;
  const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : '';

  return safeProxyOrFallback(
    req,
    `/api/hospital/billing${query}`,
    () => {
      const invoices = hospitalStore.getInvoices(patientId);
      const stats = hospitalStore.getFinancialStats();
      return { invoices, stats };
    },
    {},
    authContext
  );
});

export const POST = withHospitalGuard(async (req: NextRequest, _routeContext, authContext) => {
  try {
    const body = await req.json();
    return safeProxyOrFallback(
      req,
      '/api/hospital/billing/discharge',
      () => ({
        success: true,
        message: 'Patient billing cleared and insurance adjudicated successfully.',
        transactionId: `tx-${Date.now()}`,
      }),
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
