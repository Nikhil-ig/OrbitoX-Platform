import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';
import { mapDbError, errorBody, HttpError } from '@/lib/db-errors';

export const PATCH = withHospitalGuard(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, authContext) => {
  try {
    const { id } = await params;
    const body = await req.json();

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      const { rows } = await tx.query(
        `UPDATE "HmsAppointment"
         SET "status" = COALESCE($2, "status"),
             "reasonSealed" = COALESCE($3, "reasonSealed")
         WHERE "id" = $1
         RETURNING "id", "patientId", "doctorId", "status", "reasonSealed"`,
        [id, body.status ?? null, body.reasonSealed ?? body.reason ?? null]
      );
      if (!rows[0]) throw new HttpError(404, 'REFERENCE_NOT_FOUND', 'Appointment not found');
      return rows[0];
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
});

export const DELETE = withHospitalGuard(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }, authContext) => {
  try {
    const { id } = await params;

    // Runtime role does not DELETE clinical rows (I8); soft-cancel appointment by setting status = 'CANCELLED'
    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      const { rows } = await tx.query(
        `UPDATE "HmsAppointment"
         SET "status" = 'CANCELLED'
         WHERE "id" = $1
         RETURNING "id", "status"`,
        [id]
      );
      if (!rows[0]) throw new HttpError(404, 'REFERENCE_NOT_FOUND', 'Appointment not found');
      return rows[0];
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
});
