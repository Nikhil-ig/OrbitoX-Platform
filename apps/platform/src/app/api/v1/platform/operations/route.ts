import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { provisioningService } from '@/server/provisioning/provisioning-service';

export const GET = withOperatorAuth(async (request: NextRequest, session) => {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || undefined;
    const query = url.searchParams.get('query') || undefined;
    const organizationId = url.searchParams.get('organizationId') || undefined;

    const [summary, operations] = await Promise.all([
      provisioningService.getSummary(),
      provisioningService.listOperations({ status, query, organizationId }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        summary,
        operations,
      },
    });
  } catch (error: any) {
    const status = error.message?.includes('DATABASE_ERROR') ? 500 : 400;
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PROVISIONING_FETCH_FAILED',
          message: error.message || 'Failed to list provisioning operations',
        },
      },
      { status }
    );
  }
});

export const POST = withOperatorAuth(
  async (request: NextRequest, session) => {
    try {
      const body = await request.json();
      const operation = await provisioningService.createProvisioning(body, {
        id: session.id,
        email: session.email,
        role: session.role,
        reauthenticatedAt: session.reauthenticatedAt,
      });

      return NextResponse.json(
        {
          success: true,
          data: operation,
        },
        { status: 202 }
      );
    } catch (error: any) {
      const isInput = error.message?.includes('INVALID_REQUEST');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: isInput ? 'INVALID_REQUEST' : 'PROVISIONING_CREATE_FAILED',
            message: error.message || 'Failed to initiate tenant provisioning operation',
          },
        },
        { status: isInput ? 400 : 500 }
      );
    }
  },
  { write: true }
);
