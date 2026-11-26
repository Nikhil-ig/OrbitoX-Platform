import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard, HMS_STAFF_SESSION_COOKIE } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/server/db/tenant-db';
import { prisma } from '@/server/db/prisma';
import { mapDbError, errorBody, HttpError } from '@/server/db/db-errors';
import { assertPatientActive } from '@/server/hospital/hms-repository';
import { getPhiKeyRing, open } from '@/server/hospital/phi-crypto';
import { verifyStaffSession } from '@/server/auth/hms-auth';

export const GET = withHospitalGuard(async (req: NextRequest, _routeContext, authContext) => {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');
    const ring = getPhiKeyRing();

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      let query = `SELECT l."id", l."patientId", p."mrn" as "patientMrn", p."processingStatus" as "patientProcessingStatus",
                          l."orderedById", l."testType", l."status", l."resultSealed",
                          l."resultedById", l."verifiedById", l."verifiedAt", l."updatedAt"
                   FROM "HmsLabOrder" l
                   LEFT JOIN "HmsPatient" p ON p."tenantId" = l."tenantId" AND p."id" = l."patientId"
                   WHERE l."tenantId" = $1`;
      const params: any[] = [tx.tenantId];
      if (patientId) {
        params.push(patientId);
        query += ` AND l."patientId" = $2`;
      }
      query += ` ORDER BY l."updatedAt" DESC LIMIT 50`;

      const { rows } = await tx.query<any>(query, params);
      return rows.map((row) => {
        let result: string | null = null;
        if (row.resultSealed && row.patientProcessingStatus !== 'RESTRICTED') {
          try {
            result = open(ring, row.resultSealed, {
              tenantId: tx.tenantId,
              column: 'result',
              rowId: row.id,
            });
          } catch {
            result = null;
          }
        }
        return {
          ...row,
          result,
          patientName: row.patientMrn || row.patientId,
        };
      });
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

    const testType = body.testType || body.testCode;
    if (!body.patientId || !testType) {
      throw new HttpError(422, 'INVALID_INPUT', 'patientId and testType are required');
    }

    const staffToken =
      req.headers.get('x-staff-session') ||
      req.headers.get('x-staff-token') ||
      req.cookies.get(HMS_STAFF_SESSION_COOKIE)?.value;

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      await assertPatientActive(tx, body.patientId);

      let orderedById: string | null = null;
      if (staffToken) {
        try {
          const verified = await verifyStaffSession(tx, staffToken);
          orderedById = verified.actor.staffId;
        } catch {
          throw new HttpError(401, 'STAFF_IDENTITY_REQUIRED', 'Valid staff session is required to order lab tests.');
        }
      } else {
        const candidateId =
          typeof body.orderedById === 'string' && body.orderedById.trim()
            ? body.orderedById.trim()
            : authContext.sub?.trim() || '';
        if (candidateId) {
          const { rows: staffRows } = await tx.query<{ id: string }>(
            `SELECT "id" FROM "HmsStaff" WHERE "id" = $1 AND "tenantId" = $2 LIMIT 1`,
            [candidateId, tx.tenantId]
          );
          orderedById = staffRows[0]?.id || null;
        }
      }

      if (!orderedById) {
        throw new HttpError(401, 'STAFF_IDENTITY_REQUIRED', 'Authenticated staff identity is required to order lab tests.');
      }

      const id = body.id || `lab_${Date.now().toString(36)}`;

      const { rows } = await tx.query(
        `INSERT INTO "HmsLabOrder" ("id", "patientId", "orderedById", "testType", "status")
         VALUES ($1, $2, $3, $4, 'ORDERED')
         RETURNING "id", "patientId", "orderedById", "testType", "status", "updatedAt"`,
        [id, body.patientId, orderedById, testType]
      );
      return rows[0];
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
});
