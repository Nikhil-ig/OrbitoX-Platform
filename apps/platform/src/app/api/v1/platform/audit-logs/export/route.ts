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

    const csvContent = await auditConsoleService.exportAuditLogsCsv({
      category,
      search,
      entityId,
      actor,
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `orbitox-audit-log-${timestamp}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to export audit logs to CSV' },
      { status: 500 },
    );
  }
});

