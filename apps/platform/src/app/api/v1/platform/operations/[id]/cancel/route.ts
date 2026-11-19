import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { provisioningService } from '@/server/provisioning/provisioning-service';

export const POST = withOperatorAuth<{ params: Promise<{ id: string }> }>(
  async (request: NextRequest, session, context) => {
    try {
      const { id } = await context.params;
      const body = await request.json().catch(() => ({}));
      const reason = body?.reason;

      const updated = await provisioningService.cancelOperation(id, reason, {
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
      const message = error.message || 'Failed to cancel operation';
      const isInput = message.includes('REASON_TOO_SHORT') || message.includes('INVALID_STATE');
      const isAuth = message.includes('REAUTH');
      const isNotFound = message.includes('NOT_FOUND');

      let status = 500;
      if (isNotFound) status = 404;
      else if (isAuth) status = 401;
      else if (isInput) status = 400;

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'OPERATION_CANCEL_FAILED',
            message,
          },
        },
        { status }
      );
    }
  },
  { write: true, reauth: true }
);
