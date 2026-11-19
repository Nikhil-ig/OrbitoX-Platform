import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { organizationService } from '@/server/organizations/organization-service';

export const POST = withOperatorAuth<{ params: Promise<{ id: string }> }>(
  async (request: NextRequest, session, context) => {
    try {
      const { id } = await context.params;
      const body = await request.json().catch(() => ({}));
      const reason = body?.reason;

      const updated = await organizationService.archiveOrg(id, reason, {
        id: session.id,
        email: session.email,
        role: session.role,
        reauthenticatedAt: session.reauthenticatedAt,
      });

      return NextResponse.json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      const message = error.message || 'Failed to archive organization';
      const isNotFound = message.includes('NOT_FOUND');
      const isInput = message.includes('REASON_TOO_SHORT');
      const isReauth = message.includes('STEP_UP_REAUTH');

      let status = 500;
      if (isNotFound) status = 404;
      else if (isInput) status = 400;
      else if (isReauth) status = 403;

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ORGANIZATION_ARCHIVE_FAILED',
            message,
          },
        },
        { status }
      );
    }
  },
  { write: true, reauth: true }
);
