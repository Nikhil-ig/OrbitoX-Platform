import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { dataRightsConsoleService } from '@/server/data-rights/data-rights-console-service';

export const dynamic = 'force-dynamic';

export const GET = withOperatorAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const kind = searchParams.get('kind') || undefined;
    const search = searchParams.get('search') || undefined;

    const [summary, requests] = await Promise.all([
      dataRightsConsoleService.getSummary(),
      dataRightsConsoleService.listRequests({ kind, search }),
    ]);

    return NextResponse.json({
      summary,
      requests,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch data rights overview' },
      { status: 500 },
    );
  }
});

export const POST = withOperatorAuth(
  async (req: NextRequest, session) => {
    try {
      const body = await req.json().catch(() => ({}));
      const { type, organizationId, reason } = body;

      if (!type || !organizationId) {
        return NextResponse.json(
          { error: 'Missing required fields: type and organizationId' },
          { status: 400 },
        );
      }

      if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
        return NextResponse.json(
          { error: 'Justification reason must be at least 5 characters.' },
          { status: 400 },
        );
      }

      const result = await dataRightsConsoleService.createRequest(
        {
          type,
          organizationId,
          reason,
        },
        session,
      );

      return NextResponse.json(result, { status: 201 });
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || 'Failed to create data rights request' },
        { status: 500 },
      );
    }
  },
  { write: true },
);
