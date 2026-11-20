import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { resolveUnknownEvent } from '@/server/billing/billing-service';

const noStore = { 'Cache-Control': 'no-store' };

export const POST = withOperatorAuth<{ params: Promise<{ id: string }> }>(
  async (request: NextRequest, session, context) => {
    try {
      const { id } = await context.params;
      const body = await request.json().catch(() => ({}));
      const resolution = body.resolution || 'Operator reviewed and marked handled';

      const result = await resolveUnknownEvent(id, { resolution }, session);
      return NextResponse.json({ success: true, data: result }, { headers: noStore });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: { message: err.message || 'Failed to resolve unknown event' } },
        { status: 500, headers: noStore }
      );
    }
  },
  { write: true }
);
