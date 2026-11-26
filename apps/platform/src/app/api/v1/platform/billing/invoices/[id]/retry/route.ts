import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { retryInvoicePayment } from '@/server/billing/billing-service';

const noStore = { 'Cache-Control': 'no-store' };

export const dynamic = 'force-dynamic';

export const POST = withOperatorAuth<{ params: Promise<{ id: string }> }>(
  async (request: NextRequest, session, context) => {
    try {
      const { id } = await context.params;
      const idempotencyKey = request.headers.get('idempotency-key') || undefined;
      const result = await retryInvoicePayment(id, session, idempotencyKey);
      return NextResponse.json({ success: true, data: result }, { headers: noStore });
    } catch (err: any) {
      const msg = err?.message || 'Failed to retry payment';
      const isNotFound = msg.includes('INVOICE_NOT_FOUND') || msg.includes('NOT_FOUND');
      const isConflict = msg.includes('INVALID_INVOICE_STATE') || msg.includes('UNSUPPORTED_RETRY_STATE');
      const status = isNotFound ? 404 : isConflict ? 409 : 500;
      return NextResponse.json(
        { success: false, error: { message: msg } },
        { status, headers: noStore },
      );
    }
  },
  { write: true },
);
