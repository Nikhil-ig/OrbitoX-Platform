import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { securityConsoleService } from '@/server/security/security-console-service';

export const dynamic = 'force-dynamic';

export const POST = withOperatorAuth(
  async (req: NextRequest, session, context) => {
    try {
      const { id } = await (context as any).params;
      if (!id) {
        return NextResponse.json({ error: 'Missing key ID' }, { status: 400 });
      }

      const body = await req.json().catch(() => ({}));
      const reason = body?.reason || 'Rotated via Operator Console';

      const result = await securityConsoleService.rotateApiKey(
        id,
        {
          graceWindowHours: body?.graceWindowHours || 24,
          reason,
        },
        session,
      );

      return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || 'Failed to rotate API key' },
        { status: 500 },
      );
    }
  },
  { write: true },
);

