import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { provisioningService } from '@/server/provisioning/provisioning-service';

export const GET = withOperatorAuth<{ params: Promise<{ id: string }> }>(
  async (_request: NextRequest, _session, context) => {
    try {
      const { id } = await context.params;
      const op = await provisioningService.getOperation(id);
      if (!op) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'OPERATION_NOT_FOUND',
              message: `Provisioning operation "${id}" not found.`,
            },
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: op,
      });
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'OPERATION_FETCH_FAILED',
            message: error.message || 'Failed to fetch provisioning operation details.',
          },
        },
        { status: 500 }
      );
    }
  }
);
