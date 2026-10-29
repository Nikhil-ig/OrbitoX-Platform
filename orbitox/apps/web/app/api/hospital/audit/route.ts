import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { prisma } from '@/lib/prisma';
import { mapDbError, errorBody } from '@/lib/db-errors';

export const GET = withHospitalGuard(async (_req: NextRequest, _routeContext, authContext) => {
  try {
    const events = await prisma.platformAuditEvent.findMany({
      where: {
        ...(authContext.projectId ? { projectId: authContext.projectId } : {}),
      },
      orderBy: { occurredAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ success: true, data: events });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
}, { adminOnly: true, sensitive: true });
