import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';
import { mapDbError, errorBody, HttpError } from '@/lib/db-errors';

export const GET = withHospitalGuard(async (_req: NextRequest, _routeContext, authContext) => {
  try {
    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      const { rows: departments } = await tx.query(
        `SELECT "id", "name", "createdAt" FROM "HmsDepartment" ORDER BY "name" ASC`
      );
      const { rows: wards } = await tx.query(
        `SELECT "id", "departmentId", "name" FROM "HmsWard" ORDER BY "name" ASC`
      );
      const { rows: beds } = await tx.query(
        `SELECT b."id", b."wardId", b."label", b."dailyRateMinor", b."serviceState",
                a."id" as "admissionId", a."patientId"
         FROM "HmsBed" b
         LEFT JOIN "HmsAdmission" a ON a."tenantId" = b."tenantId" AND a."bedId" = b."id" AND a."dischargedAt" IS NULL
         ORDER BY b."label" ASC`
      );

      return {
        departments: departments.map((d: any) => ({
          ...d,
          wards: wards
            .filter((w: any) => w.departmentId === d.id)
            .map((w: any) => ({
              ...w,
              beds: beds.filter((b: any) => b.wardId === w.id),
            })),
        })),
      };
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

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      if (body.type === 'ward') {
        if (!body.departmentId || !body.name) throw new HttpError(422, 'INVALID_INPUT', 'departmentId and name required');
        const id = body.id || `ward_${Date.now().toString(36)}`;
        const { rows } = await tx.query(
          `INSERT INTO "HmsWard" ("id", "departmentId", "name") VALUES ($1, $2, $3) RETURNING "id", "departmentId", "name"`,
          [id, body.departmentId, body.name]
        );
        return rows[0];
      } else {
        // default: department
        if (!body.name) throw new HttpError(422, 'INVALID_INPUT', 'name required');
        const id = body.id || `dept_${Date.now().toString(36)}`;
        const { rows } = await tx.query(
          `INSERT INTO "HmsDepartment" ("id", "name") VALUES ($1, $2) RETURNING "id", "name", "createdAt"`,
          [id, body.name]
        );
        return rows[0];
      }
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
});
