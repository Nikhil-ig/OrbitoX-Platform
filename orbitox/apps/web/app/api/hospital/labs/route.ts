import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';
import { mapDbError, errorBody, HttpError } from '@/lib/db-errors';

export const GET = withHospitalGuard(async (req: NextRequest, _routeContext, authContext) => {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      let query = `SELECT "id", "patientId", "orderedById", "testCode", "status", "orderedAt", "resultedAt", "verifiedAt"
                   FROM "HmsLabOrder"`;
      const params: any[] = [];
      if (patientId) {
        params.push(patientId);
        query += ` WHERE "patientId" = $1`;
      }
      query += ` ORDER BY "orderedAt" DESC LIMIT 50`;

      const { rows } = await tx.query(query, params);
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

    if (!body.patientId || !body.testCode) {
      throw new HttpError(422, 'INVALID_INPUT', 'patientId and testCode are required');
    }

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      const id = body.id || `lab_${Date.now().toString(36)}`;
      const orderedById = body.orderedById || authContext.sub || 'staff_doctor';

      const { rows } = await tx.query(
        `INSERT INTO "HmsLabOrder" ("id", "patientId", "orderedById", "testCode", "status")
         VALUES ($1, $2, $3, $4, 'ORDERED')
         RETURNING "id", "patientId", "orderedById", "testCode", "status", "orderedAt"`,
        [id, body.patientId, orderedById, body.testCode]
      );
      return rows[0];
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
});
