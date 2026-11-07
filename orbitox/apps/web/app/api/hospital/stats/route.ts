import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';
import { mapDbError, errorBody } from '@/lib/db-errors';

export const GET = withHospitalGuard(async (_req: NextRequest, _routeContext, authContext) => {
  try {
    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      const { rows: patientCount } = await tx.query<{ count: string }>(
        `SELECT COUNT(*)::text as "count" FROM "HmsPatient"`
      );
      const { rows: admissionCount } = await tx.query<{ count: string }>(
        `SELECT COUNT(*)::text as "count" FROM "HmsAdmission" WHERE "dischargedAt" IS NULL`
      );
      const { rows: bedStats } = await tx.query<{ total: string; occupied: string; maintenance: string }>(
        `SELECT COUNT(*)::text as "total",
                COUNT(a."id")::text as "occupied",
                COUNT(CASE WHEN b."serviceState" = 'MAINTENANCE' THEN 1 END)::text as "maintenance"
         FROM "HmsBed" b
         LEFT JOIN "HmsAdmission" a ON a."tenantId" = b."tenantId" AND a."bedId" = b."id" AND a."dischargedAt" IS NULL`
      );
      const { rows: pendingLabs } = await tx.query<{ count: string }>(
        `SELECT COUNT(*)::text as "count" FROM "HmsLabOrder" WHERE "status" IN ('ORDERED', 'IN_PROGRESS')`
      );

      const totalBeds = parseInt(bedStats[0]?.total || '0', 10);
      const occupiedBeds = parseInt(bedStats[0]?.occupied || '0', 10);
      const maintenanceBeds = parseInt(bedStats[0]?.maintenance || '0', 10);
      const availableBeds = Math.max(0, totalBeds - occupiedBeds - maintenanceBeds);

      return {
        totalPatients: parseInt(patientCount[0]?.count || '0', 10),
        activeAdmissions: parseInt(admissionCount[0]?.count || '0', 10),
        totalBeds,
        occupiedBeds,
        availableBeds,
        pendingLabs: parseInt(pendingLabs[0]?.count || '0', 10),
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
});
