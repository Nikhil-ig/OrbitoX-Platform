import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';
import { mapDbError, errorBody } from '@/lib/db-errors';

export const POST = withHospitalGuard(async (req: NextRequest, _routeContext, authContext) => {
  try {
    const body = await req.json();

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      await tx.query(
        `INSERT INTO "TenantOutbox" ("topic", "payload") VALUES ($1, $2::jsonb)`,
        ['hms.telemetry', JSON.stringify({ ...body, receivedAt: new Date().toISOString() })]
      );
      return { success: true, recorded: true };
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
}, { adminOnly: true, sensitive: true });
