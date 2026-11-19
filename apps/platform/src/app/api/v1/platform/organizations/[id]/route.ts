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
