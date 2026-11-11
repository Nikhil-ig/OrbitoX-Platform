import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/server/db/tenant-db';
import { prisma } from '@/server/db/prisma';
import { mapDbError, errorBody, HttpError } from '@/server/db/db-errors';
import { assertPatientActive } from '@/server/hospital/hms-repository';
import { getPhiKeyRing, seal } from '@/server/hospital/phi-crypto';

export const POST = withHospitalGuard(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  authContext
) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const ring = getPhiKeyRing();

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      const orderRes = await tx.query<{ patientId: string }>(
        `SELECT "patientId" FROM "HmsLabOrder" WHERE "id" = $1`,
        [id]
      );
      if (!orderRes.rows[0]) throw new HttpError(404, 'REFERENCE_NOT_FOUND', 'Lab order not found');
      await assertPatientActive(tx, orderRes.rows[0].patientId);

      if (body.action === 'verify') {
        const verifierId = body.verifierId || authContext.sub || 'staff_verifier';
        const { rows } = await tx.query(
          `UPDATE "HmsLabOrder"
           SET "status" = 'VERIFIED',
               "verifiedById" = $2,
               "verifiedAt" = now()
           WHERE "id" = $1
           RETURNING "id", "status", "resultedById", "verifiedById", "verifiedAt"`,
          [id, verifierId]
        );
        if (!rows[0]) throw new HttpError(404, 'REFERENCE_NOT_FOUND', 'Lab order not found');
        return rows[0];
      }

      // Enter result
      if (!body.result) throw new HttpError(422, 'INVALID_INPUT', 'result is required');
      const actorId = body.resultEnteredById || authContext.sub || 'staff_tech';
      const sealedResult = seal(ring, String(body.result), {
        tenantId: tx.tenantId,
        column: 'result',
        rowId: id,
      });

      const { rows } = await tx.query(
        `UPDATE "HmsLabOrder"
         SET "status" = 'RESULTED',
             "resultSealed" = $2,
             "resultedById" = $3,
             "updatedAt" = now()
         WHERE "id" = $1
         RETURNING "id", "status", "resultedById", "updatedAt"`,
        [id, sealedResult, actorId]
      );
      if (!rows[0]) throw new HttpError(404, 'REFERENCE_NOT_FOUND', 'Lab order not found');
      return rows[0];
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
});
