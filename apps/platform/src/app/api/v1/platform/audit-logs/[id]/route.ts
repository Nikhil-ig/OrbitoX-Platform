import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { auditConsoleService } from '@/server/audit/audit-console-service';

export const dynamic = 'force-dynamic';

export const GET = withOperatorAuth(
  async (_req: NextRequest, _session, context: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await context.params;
      const event = await auditConsoleService.getAuditEventById(id);

      if (!event) {
        return NextResponse.json({ error: 'Audit event not found' }, { status: 404 });
      }

      return NextResponse.json({ event });
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || 'Failed to fetch audit event' },
        { status: 500 },
      );
    }
  },
);
