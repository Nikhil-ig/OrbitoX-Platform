import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';
import { mapDbError, errorBody, HttpError } from '@/lib/db-errors';

export const GET = withHospitalGuard(async (_req: NextRequest, _routeContext, authContext) => {
  try {
    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      const { rows } = await tx.query(
        `SELECT b."id", b."wardId", b."label", b."dailyRateMinor", b."serviceState",
                w."name" as "wardName",
                a."id" as "admissionId", a."patientId",
                CASE
                  WHEN a."id" IS NOT NULL THEN 'occupied'
                  WHEN b."serviceState" = 'MAINTENANCE' THEN 'maintenance'
                  ELSE 'available'
                END as "status"
         FROM "HmsBed" b
         LEFT JOIN "HmsWard" w ON w."tenantId" = b."tenantId" AND w."id" = b."wardId"
         LEFT JOIN "HmsAdmission" a ON a."tenantId" = b."tenantId" AND a."bedId" = b."id" AND a."dischargedAt" IS NULL
         ORDER BY b."label"`
      );
      return rows;
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
});

export const POST = withHospitalGuard(async (req: NextRequest, _routeContext, authContext) => {
  try {
    const body = await req.json();

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      if (!body.wardId || !body.label) {
        throw new HttpError(422, 'INVALID_INPUT', 'wardId and label are required');
      }
      const id = body.id || `bed_${Date.now().toString(36)}`;
      const dailyRate = BigInt(body.dailyRateMinor || body.dailyRate || 0);
      const serviceState = body.serviceState || 'IN_SERVICE';

      const { rows } = await tx.query(
        `INSERT INTO "HmsBed" ("id", "wardId", "label", "dailyRateMinor", "serviceState")
         VALUES ($1, $2, $3, $4, $5)
         RETURNING "id", "wardId", "label", "dailyRateMinor", "serviceState"`,
        [id, body.wardId, body.label, dailyRate.toString(), serviceState]
      );
      return rows[0];
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
});
