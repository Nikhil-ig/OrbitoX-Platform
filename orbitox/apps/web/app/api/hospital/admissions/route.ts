import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';
import { mapDbError, errorBody, HttpError } from '@/lib/db-errors';
import { getPhiKeyRing } from '@/lib/phi-crypto';
import { admitPatient, dischargePatient } from '@/lib/hms-repository';

export const GET = withHospitalGuard(async (_req: NextRequest, _routeContext, authContext) => {
  try {
    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      const { rows } = await tx.query(
        `SELECT a."id", a."patientId", a."bedId", a."attendingStaffId", a."admittedAt", a."dischargedAt",
                b."label" as "bedLabel"
         FROM "HmsAdmission" a
         LEFT JOIN "HmsBed" b ON b."tenantId" = a."tenantId" AND b."id" = a."bedId"
         ORDER BY a."admittedAt" DESC
         LIMIT 50`
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
    const ring = getPhiKeyRing();

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      if (body.action === 'discharge' && body.admissionId) {
        await dischargePatient(tx, body.admissionId);
        return { discharged: true, admissionId: body.admissionId };
      }

      if (!body.patientId || !body.bedId) {
        throw new HttpError(422, 'INVALID_INPUT', 'patientId and bedId are required');
      }

      return await admitPatient(tx, {
        patientId: body.patientId,
        bedId: body.bedId,
        staffId: body.staffId || authContext.sub || 'staff_system',
        notes: body.notes,
        ring,
      });
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
});
