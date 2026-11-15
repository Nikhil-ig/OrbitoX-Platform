import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { listBillingInvoices } from '@/server/billing/billing-service';

const noStore = { 'Cache-Control': 'no-store' };

export const dynamic = 'force-dynamic';

export const GET = withOperatorAuth(
  async (request: NextRequest, session) => {
    try {
      const { searchParams } = request.nextUrl;
      const search = searchParams.get('search') || undefined;
      const status = searchParams.get('status') || undefined;
      const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1;
      const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 20;

      const result = await listBillingInvoices({ search, status, page, limit }, session);
      return NextResponse.json({ success: true, data: result }, { headers: noStore });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: { message: err.message || 'Failed to list billing invoices' } },
        { status: 500, headers: noStore }
      );
    }
  }
);

