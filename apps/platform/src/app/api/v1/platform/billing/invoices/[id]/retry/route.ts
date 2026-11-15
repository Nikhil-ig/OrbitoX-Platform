import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { retryInvoicePayment } from '@/server/billing/billing-service';

const noStore = { 'Cache-Control': 'no-store' };

export const dynamic = 'force-dynamic';

export const POST = withOperatorAuth<{ params: Promise<{ id: string }> }>(
  async (_request: NextRequest, session, context) => {
    try {
      const { id } = await context.params;
      const result = await retryInvoicePayment(id, session);
      return NextResponse.json({ success: true, data: result }, { headers: noStore });
    } catch (err: any) {
      const isNotFound = err.message?.includes('NOT_FOUND');
      return NextResponse.json(
        { success: false, error: { message: err.message || 'Failed to retry payment' } },
        { status: isNotFound ? 404 : 500, headers: noStore }
      );
    }
  },
  { write: true }
);

