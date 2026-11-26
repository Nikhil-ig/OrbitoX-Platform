import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/server/db/tenant-db';
import { prisma } from '@/server/db/prisma';
import { mapDbError, errorBody, HttpError } from '@/server/db/db-errors';
import { dischargePatient } from '@/server/hospital/hms-repository';

export const PATCH = withHospitalGuard(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, authContext) => {
  try {
    const { id } = await params;
    const body = await req.json();

    const rawStateInput = body.serviceState ?? body.status;
    let normalizedServiceState: 'IN_SERVICE' | 'MAINTENANCE' | null = null;
    if (rawStateInput !== undefined && rawStateInput !== null && String(rawStateInput).trim() !== '') {
      const upper = String(rawStateInput).trim().toUpperCase();
      if (upper === 'IN_SERVICE' || upper === 'AVAILABLE') {
        normalizedServiceState = 'IN_SERVICE';
      } else if (upper === 'MAINTENANCE' || upper === 'SANITIZING') {
        normalizedServiceState = 'MAINTENANCE';
      } else {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_INPUT', message: 'serviceState must be IN_SERVICE or MAINTENANCE.' } },
          { status: 422 },
        );
      }
    }

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      const { rows } = await tx.query(
        `UPDATE "HmsBed"
         SET "serviceState" = COALESCE($2, "serviceState"),
             "dailyRateMinor" = COALESCE($3, "dailyRateMinor")
         WHERE "id" = $1 AND "tenantId" = $4
         RETURNING "id", "wardId", "label", "dailyRateMinor", "serviceState"`,
        [id, normalizedServiceState, body.dailyRateMinor != null ? BigInt(body.dailyRateMinor).toString() : null, tx.tenantId]
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

      // Turnover sets bed IN_SERVICE explicitly when ?action=turnover; otherwise toggles
      const rawActionParam = searchParams.get('action');
      const { rows } = await tx.query(
        rawActionParam === 'turnover'
          ? `UPDATE "HmsBed"
             SET "serviceState" = 'IN_SERVICE'
             WHERE "id" = $1 AND "tenantId" = $2
             RETURNING "id", "serviceState"`
          : `UPDATE "HmsBed"
             SET "serviceState" = CASE WHEN "serviceState" = 'IN_SERVICE' THEN 'MAINTENANCE' ELSE 'IN_SERVICE' END
             WHERE "id" = $1 AND "tenantId" = $2
             RETURNING "id", "serviceState"`,
        [id, tx.tenantId]
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
