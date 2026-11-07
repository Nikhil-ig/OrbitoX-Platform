import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';
import { mapDbError, errorBody, HttpError } from '@/lib/db-errors';
import { dischargePatient } from '@/lib/hms-repository';

export const PATCH = withHospitalGuard(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, authContext) => {
  try {
    const { id } = await params;
    const body = await req.json();

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      const { rows } = await tx.query(
        `UPDATE "HmsBed"
         SET "serviceState" = COALESCE($2, "serviceState"),
             "dailyRateMinor" = COALESCE($3, "dailyRateMinor")
         WHERE "id" = $1
         RETURNING "id", "wardId", "label", "dailyRateMinor", "serviceState"`,
        [id, body.serviceState ?? null, body.dailyRateMinor != null ? BigInt(body.dailyRateMinor).toString() : null]
      );
      if (!rows[0]) throw new HttpError(404, 'REFERENCE_NOT_FOUND', 'Bed not found');
      return rows[0];
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
});

export const POST = withHospitalGuard(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, authContext) => {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'turnover';

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      if (action === 'discharge') {
        const { rows } = await tx.query<{ id: string }>(
          `SELECT "id" FROM "HmsAdmission" WHERE "bedId" = $1 AND "dischargedAt" IS NULL LIMIT 1`,
          [id]
        );
        if (!rows[0]) throw new HttpError(404, 'OPEN_ADMISSION_NOT_FOUND', 'No active admission on this bed');
        await dischargePatient(tx, rows[0].id);
        return { success: true, discharged: true, admissionId: rows[0].id };
      }

      // Turnover / service toggle
      const { rows } = await tx.query(
        `UPDATE "HmsBed"
         SET "serviceState" = CASE WHEN "serviceState" = 'IN_SERVICE' THEN 'MAINTENANCE' ELSE 'IN_SERVICE' END
         WHERE "id" = $1
         RETURNING "id", "serviceState"`,
        [id]
      );
      if (!rows[0]) throw new HttpError(404, 'REFERENCE_NOT_FOUND', 'Bed not found');
      return rows[0];
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
});
