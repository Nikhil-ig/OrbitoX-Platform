import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard, HMS_STAFF_SESSION_COOKIE } from '@/app/api/_lib/route-auth';
import { withTenantTx, TenantTx } from '@/server/db/tenant-db';
import { prisma } from '@/server/db/prisma';
import { mapDbError, errorBody, HttpError } from '@/server/db/db-errors';
import { assertPatientActive } from '@/server/hospital/hms-repository';
import { getPhiKeyRing, seal } from '@/server/hospital/phi-crypto';
import { verifyStaffSession } from '@/server/auth/hms-auth';

async function resolveVerifiedLabActor(
  tx: TenantTx,
  staffToken: string | undefined,
  explicitStaffId: unknown,
  authSub: string | undefined,
  actionLabel: string,
): Promise<string> {
  if (staffToken) {
    try {
      const verified = await verifyStaffSession(tx, staffToken);
      return verified.actor.staffId;
    } catch {
      throw new HttpError(401, 'STAFF_IDENTITY_REQUIRED', `Valid staff session is required to ${actionLabel}.`);
    }
  }
  const candidate =
    typeof explicitStaffId === 'string' && explicitStaffId.trim()
      ? explicitStaffId.trim()
      : authSub?.trim() || '';
  if (candidate) {
    const { rows } = await tx.query<{ id: string }>(
      `SELECT "id" FROM "HmsStaff" WHERE "id" = $1 LIMIT 1`,
      [candidate]
    );
    if (rows[0]) return rows[0].id;
  }
  throw new HttpError(401, 'STAFF_IDENTITY_REQUIRED', `Authenticated staff identity is required to ${actionLabel}.`);
}

export const POST = withHospitalGuard(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  authContext
) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const ring = getPhiKeyRing();
    const staffToken =
      req.headers.get('x-staff-session') ||
      req.headers.get('x-staff-token') ||
      req.cookies.get(HMS_STAFF_SESSION_COOKIE)?.value;

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      const orderRes = await tx.query<{ patientId: string; status: string }>(
        `SELECT "patientId", "status" FROM "HmsLabOrder" WHERE "id" = $1 AND "tenantId" = $2`,
        [id, tx.tenantId]
      );
      if (!orderRes.rows[0]) throw new HttpError(404, 'REFERENCE_NOT_FOUND', 'Lab order not found');
      await assertPatientActive(tx, orderRes.rows[0].patientId);

      if (body.action === 'verify') {
        const verifierId = await resolveVerifiedLabActor(
          tx,
          staffToken,
          body.verifierId,
          authContext.sub,
          'verify lab results',
        );
        const { rows } = await tx.query(
          `UPDATE "HmsLabOrder"
           SET "status" = 'VERIFIED',
               "verifiedById" = $2,
               "verifiedAt" = now()
           WHERE "id" = $1 AND "tenantId" = $3
           RETURNING "id", "status", "resultedById", "verifiedById", "verifiedAt"`,
          [id, verifierId, tx.tenantId]
        );
        if (!rows[0]) throw new HttpError(404, 'REFERENCE_NOT_FOUND', 'Lab order not found');
        return rows[0];
      }

      // Progress through state machine if currently ORDERED or COLLECTED
      const currentStatus = orderRes.rows[0].status;
      if (currentStatus === 'ORDERED') {
        await tx.query(
          `UPDATE "HmsLabOrder" SET "status" = 'COLLECTED' WHERE "id" = $1 AND "tenantId" = $2`,
          [id, tx.tenantId]
        );
        await tx.query(
          `UPDATE "HmsLabOrder" SET "status" = 'PROCESSING' WHERE "id" = $1 AND "tenantId" = $2`,
          [id, tx.tenantId]
        );
      } else if (currentStatus === 'COLLECTED') {
        await tx.query(
          `UPDATE "HmsLabOrder" SET "status" = 'PROCESSING' WHERE "id" = $1 AND "tenantId" = $2`,
          [id, tx.tenantId]
        );
      }

      // Enter result
      const resultInput = body.result ?? body.resultSummary ?? body.numericValue;
      if (resultInput === undefined || resultInput === null || String(resultInput).trim() === '') {
        throw new HttpError(422, 'INVALID_INPUT', 'result (or resultSummary) is required');
      }
      const resultText =
        body.unit && typeof body.resultSummary !== 'string' && body.numericValue !== undefined
          ? `${resultInput} ${String(body.unit).trim()}`
          : String(resultInput).trim();
      const actorId = await resolveVerifiedLabActor(
        tx,
        staffToken,
        body.resultEnteredById,
        authContext.sub,
        'enter lab results',
      );
      const sealedResult = seal(ring, resultText, {
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
         WHERE "id" = $1 AND "tenantId" = $4
         RETURNING "id", "status", "resultedById", "updatedAt"`,
        [id, sealedResult, actorId, tx.tenantId]
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
