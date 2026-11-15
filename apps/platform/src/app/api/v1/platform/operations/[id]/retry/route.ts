import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { provisioningService } from '@/server/provisioning/provisioning-service';

export const POST = withOperatorAuth<{ params: Promise<{ id: string }> }>(
  async (_request: NextRequest, session, context) => {
    try {
      const { id } = await context.params;
      const updated = await provisioningService.retryOperation(id, {
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
      const message = error.message || 'Failed to retry operation';
      const isInput = message.includes('INVALID_STATE');
      const isLocked = message.includes('RETRY_LOCKED');
      const isNotFound = message.includes('NOT_FOUND');

      let status = 500;
      if (isNotFound) status = 404;
      else if (isLocked) status = 409;
      else if (isInput) status = 400;

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'OPERATION_RETRY_FAILED',
            message,
          },
        },
        { status }
      );
    }
  },
  { write: true }
);
