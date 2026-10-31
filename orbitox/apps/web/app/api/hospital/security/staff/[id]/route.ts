import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';
import { mapDbError, errorBody, HttpError } from '@/lib/db-errors';

export const GET = withHospitalGuard(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  authContext
) => {
  try {
    const { id } = await params;

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      const { rows } = await tx.query(
        `SELECT "id", "role", "departmentId", "status", "onDuty"
         FROM "HmsStaff"
         WHERE "id" = $1`,
        [id]
      );
      if (!rows[0]) throw new HttpError(404, 'REFERENCE_NOT_FOUND', 'Staff member not found');
      return rows[0];
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
}, { adminOnly: true, sensitive: true });

export const PATCH = withHospitalGuard(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  authContext
) => {
  try {
    const { id } = await params;
    const body = await req.json();

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      const { rows } = await tx.query(
        `UPDATE "HmsStaff"
         SET "role" = COALESCE($2, "role"),
             "departmentId" = COALESCE($3, "departmentId"),
             "status" = COALESCE($4, "status"),
             "onDuty" = COALESCE($5, "onDuty")
         WHERE "id" = $1
         RETURNING "id", "role", "departmentId", "status", "onDuty"`,
        [id, body.role ?? null, body.departmentId ?? null, body.status ?? null, body.onDuty ?? null]
      );
      if (!rows[0]) throw new HttpError(404, 'REFERENCE_NOT_FOUND', 'Staff member not found');
      return rows[0];
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
}, { adminOnly: true, sensitive: true });
