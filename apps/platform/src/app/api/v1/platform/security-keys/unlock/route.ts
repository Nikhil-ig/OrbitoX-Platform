import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { securityConsoleService } from '@/server/security/security-console-service';

export const dynamic = 'force-dynamic';

export const POST = withOperatorAuth(
  async (req: NextRequest, session) => {
    try {
      const body = await req.json().catch(() => ({}));
      const { email, reason } = body;

      if (!email || typeof email !== 'string') {
        return NextResponse.json({ error: 'Operator email is required' }, { status: 400 });
      }

      if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
        return NextResponse.json(
          { error: 'Unlock justification reason must be at least 5 characters.' },
          { status: 400 },
        );
      }

      const result = await securityConsoleService.unlockOperator(email, reason.trim(), session);
      return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || 'Failed to unlock operator account' },
        { status: 500 },
      );
    }
  },
  { write: true },
);
