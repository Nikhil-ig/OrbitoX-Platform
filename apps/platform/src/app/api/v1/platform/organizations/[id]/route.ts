import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { organizationService } from '@/server/organizations/organization-service';

export const GET = withOperatorAuth<{ params: Promise<{ id: string }> }>(
  async (_request: NextRequest, _session, context) => {
    try {
      const { id } = await context.params;
      const org = await organizationService.getOrganization(id);

      if (!org) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: `Organization "${id}" not found.`,
            },
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: org,
      });
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ORGANIZATION_FETCH_FAILED',
            message: error.message || 'Failed to fetch organization details',
          },
        },
        { status: 500 }
      );
    }
  }
);

export const PATCH = withOperatorAuth<{ params: Promise<{ id: string }> }>(
  async (request: NextRequest, session, context) => {
    try {
      const { id } = await context.params;
      const body = await request.json().catch(() => ({}));

      const updated = await organizationService.updateOrganization(id, body, {
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
      const message = error.message || 'Failed to update organization';
      const isNotFound = message.includes('NOT_FOUND');
      const isInput = message.includes('INVALID_REQUEST');

      let status = 500;
      if (isNotFound) status = 404;
      else if (isInput) status = 400;

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ORGANIZATION_UPDATE_FAILED',
            message,
          },
        },
        { status }
      );
    }
  },
  { write: true }
);
