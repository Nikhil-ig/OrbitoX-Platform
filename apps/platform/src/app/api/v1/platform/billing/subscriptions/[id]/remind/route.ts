import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { sendGraceReminder } from '@/server/billing/billing-service';

const noStore = { 'Cache-Control': 'no-store' };

export const POST = withOperatorAuth<{ params: Promise<{ id: string }> }>(
  async (_request: NextRequest, session, context) => {
    try {
      const { id } = await context.params;
      const result = await sendGraceReminder(id, session);
      return NextResponse.json({ success: true, data: result }, { headers: noStore });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: { message: err.message || 'Failed to dispatch grace reminder' } },
        { status: 500, headers: noStore }
      );
    }
  },
  { write: true }
);
