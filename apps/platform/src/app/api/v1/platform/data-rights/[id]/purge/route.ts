import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { dataRightsConsoleService } from '@/server/data-rights/data-rights-console-service';

export const dynamic = 'force-dynamic';

export const POST = withOperatorAuth(
  async (req: NextRequest, session, context) => {
    try {
      const { id } = await (context as any).params;
      if (!id) {
        return NextResponse.json({ error: 'Missing request ID' }, { status: 400 });
      }

      const body = await req.json().catch(() => ({}));
      const reason = body?.reason || body?.justification;

      if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
        return NextResponse.json(
          { error: 'Justification reason must be at least 5 characters.' },
          { status: 400 },
        );
      }

      const result = await dataRightsConsoleService.executeHardPurge(id, reason.trim(), session);
      return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || 'Failed to execute hard purge' },
        { status: 500 },
      );
    }
  },
  { write: true, reauth: true },
);
