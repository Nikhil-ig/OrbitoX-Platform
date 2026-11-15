import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { organizationService } from '@/server/organizations/organization-service';

export const GET = withOperatorAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'ALL';
    const tier = searchParams.get('tier') || 'ALL';
    const query = searchParams.get('query') || undefined;

    const [summary, organizations] = await Promise.all([
      organizationService.getSummary(),
      organizationService.listOrganizations({ status, tier, query }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        summary,
        organizations,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ORGANIZATIONS_QUERY_FAILED',
          message: error.message || 'Failed to list organizations',
        },
      },
      { status: 500 }
    );
  }
});

export const POST = withOperatorAuth(
  async (request: NextRequest, session) => {
    try {
      const body = await request.json();
      const org = await organizationService.createOrganization(body, {
        id: session.id,
        email: session.email,
        role: session.role,
        reauthenticatedAt: session.reauthenticatedAt,
      });

      return NextResponse.json(
        {
          success: true,
          data: org,
        },
        { status: 201 }
      );
    } catch (error: any) {
      const message = error.message || 'Failed to create organization';
      const isConflict = message.includes('SLUG_CONFLICT');
      const isInput = message.includes('INVALID_REQUEST');

      let status = 500;
      if (isConflict) status = 409;
      else if (isInput) status = 400;

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ORGANIZATION_CREATE_FAILED',
            message,
          },
        },
        { status }
      );
    }
  },
  { write: true }
);
