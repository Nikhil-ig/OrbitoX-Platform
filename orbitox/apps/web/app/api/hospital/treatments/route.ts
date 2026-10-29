import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';
import { mapDbError, errorBody, HttpError } from '@/lib/db-errors';

export const GET = withHospitalGuard(async (_req: NextRequest, _routeContext, authContext) => {
  try {
    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      const { rows } = await tx.query(
        `SELECT "id", "patientId", "orderedById", "testCode" as "code", "status", "orderedAt", "resultedAt"
         FROM "HmsLabOrder"
         ORDER BY "orderedAt" DESC
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

    if (!body.patientId || !body.code) {
      throw new HttpError(422, 'INVALID_INPUT', 'patientId and code are required');
    }

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      const id = body.id || `trt_${Date.now().toString(36)}`;
      const orderedById = body.orderedById || authContext.sub || 'staff_doctor';

      const { rows } = await tx.query(
        `INSERT INTO "HmsLabOrder" ("id", "patientId", "orderedById", "testCode", "status")
         VALUES ($1, $2, $3, $4, 'ORDERED')
         RETURNING "id", "patientId", "orderedById", "testCode" as "code", "status", "orderedAt"`,
        [id, body.patientId, orderedById, body.code]
      );
      return rows[0];
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
});

export const PATCH = withHospitalGuard(async (req: NextRequest, _routeContext, authContext) => {
  try {
    const body = await req.json();
    const { treatmentId, action } = body;

    if (!treatmentId) throw new HttpError(422, 'INVALID_INPUT', 'treatmentId required');

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      const newStatus = action === 'start' ? 'IN_PROGRESS' : action === 'complete' ? 'RESULTED' : 'IN_PROGRESS';
      const { rows } = await tx.query(
        `UPDATE "HmsLabOrder"
         SET "status" = $2
         WHERE "id" = $1
         RETURNING "id", "status"`,
        [treatmentId, newStatus]
      );
      if (!rows[0]) throw new HttpError(404, 'REFERENCE_NOT_FOUND', 'Treatment not found');
      return rows[0];
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
});
