import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { organizationService } from '@/server/organizations/organization-service';

export const PUT = withOperatorAuth<{ params: Promise<{ id: string }> }>(
  async (request: NextRequest, session, context) => {
    try {
      const { id } = await context.params;
      const body = await request.json().catch(() => ({}));
      const planTier = body?.planTier;

      if (!planTier) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_REQUEST',
              message: 'planTier is required.',
            },
          },
          { status: 400 }
        );
      }

      const updated = await organizationService.updateOrgPlan(id, planTier, {
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
      const message = error.message || 'Failed to update organization plan';
      const isNotFound = message.includes('NOT_FOUND');
      const isInput = message.includes('INVALID_PLAN_TIER') || message.includes('INVALID_REQUEST');

      let status = 500;
      if (isNotFound) status = 404;
      else if (isInput) status = 400;

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PLAN_UPDATE_FAILED',
            message,
          },
        },
        { status }
      );
    }
  },
  { write: true }
);
