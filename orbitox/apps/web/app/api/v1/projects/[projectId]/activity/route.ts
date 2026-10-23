import { NextRequest, NextResponse } from 'next/server';
import { PersistentControlStore } from '@orbitox/external-project-engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/projects/{projectId}/activity
 * Paginated audit trail timeline for a project.
 * Query: ?page=1&limit=15
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const store = PersistentControlStore.getInstance();

    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '15', 10)));

    const audits = store.getAudits(projectId);
    const total = audits.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const items = audits.slice(offset, offset + limit);

    return NextResponse.json(
      {
        success: true,
        data: {
          items,
          pagination: {
            page,
            limit,
            total,
            totalPages,
          },
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: { code: 'INTERNAL', message } }, { status: 500 });
  }
}
