import { NextRequest, NextResponse } from 'next/server';
import { safeProxyOrFallback } from '../_init';
import { hospitalStore } from '../_store';

export async function GET(req: NextRequest) {
  const contextId = req.headers.get('x-context-id') || '';
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
      '/api/hospital/billing/discharge',
      () => ({
        success: true,
        message: 'Patient billing cleared and insurance adjudicated successfully.',
        transactionId: `tx-${Date.now()}`,
      }),
      {
        method: 'POST',
        body,
      }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
