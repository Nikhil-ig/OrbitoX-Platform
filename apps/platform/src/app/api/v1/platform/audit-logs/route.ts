import { NextRequest, NextResponse } from 'next/server';
import { withOperatorAuth } from '@/server/auth/operator-auth';
import { auditConsoleService } from '@/server/audit/audit-console-service';

export const dynamic = 'force-dynamic';

export const GET = withOperatorAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;
    const entityId = searchParams.get('entityId') || undefined;
    const actor = searchParams.get('actor') || undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const pageSize = searchParams.get('pageSize')
      ? parseInt(searchParams.get('pageSize')!, 10)
      : 25;

    const result = await auditConsoleService.queryAuditLogs({
      category,
      search,
      entityId,
      actor,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to query audit logs' },
      { status: 500 },
    );
  }
});
