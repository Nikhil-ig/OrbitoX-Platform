import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { securityConsoleService } from '@/server/security/security-console-service';

export const dynamic = 'force-dynamic';

export const GET = withOperatorAuth(async () => {
  try {
    const overview = await securityConsoleService.getOverview();
    return NextResponse.json(overview);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch security overview' },
      { status: 500 },
    );
  }
});

export const POST = withOperatorAuth(
  async (req: NextRequest, session) => {
    try {
      const body = await req.json().catch(() => ({}));
      const { name, scopes, environmentId, ipAllowlist, rateLimitPerMin } = body;

      if (!name || typeof name !== 'string' || name.trim().length < 3) {
        return NextResponse.json(
          { error: 'API key name must be at least 3 characters.' },
          { status: 400 },
        );
      }

      const result = await securityConsoleService.createApiKey(
        {
          name: name.trim(),
          scopes: Array.isArray(scopes) ? scopes : ['orders:write'],
          environmentId,
          ipAllowlist,
          rateLimitPerMin,
        },
        session,
      );

      return NextResponse.json(result, { status: 201 });
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || 'Failed to create API key' },
        { status: 500 },
      );
    }
  },
  { write: true },
);
