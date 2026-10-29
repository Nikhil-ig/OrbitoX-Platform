import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';
import { mapDbError, errorBody, HttpError } from '@/lib/db-errors';
import { getPhiKeyRing, seal } from '@/lib/phi-crypto';

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
      if (body.action === 'verify') {
        const verifierId = body.verifierId || authContext.sub || 'staff_verifier';
        const { rows } = await tx.query(
          `UPDATE "HmsLabOrder"
           SET "status" = 'VERIFIED',
               "verifiedById" = $2,
               "verifiedAt" = now()
           WHERE "id" = $1
           RETURNING "id", "status", "resultEnteredById", "verifiedById", "verifiedAt"`,
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
             "resultEnteredById" = $3,
             "resultedAt" = now()
         WHERE "id" = $1
         RETURNING "id", "status", "resultEnteredById", "resultedAt"`,
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
