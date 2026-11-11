import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';
import { mapDbError, errorBody, HttpError } from '@/lib/db-errors';
import { getPhiKeyRing, seal, blindIndex } from '@/lib/phi-crypto';

export const GET = withHospitalGuard(async (_req: NextRequest, _routeContext, authContext) => {
  try {
    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      const { rows } = await tx.query(
        `SELECT "id", "role", "departmentId", "status", "onDuty"
         FROM "HmsStaff"
         ORDER BY "id" ASC`
      );
      return rows;
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
}, { adminOnly: true, sensitive: true });

export const POST = withHospitalGuard(async (req: NextRequest, _routeContext, authContext) => {
  try {
    const body = await req.json();
    const ring = getPhiKeyRing();

    if (!body.name || !body.email || !body.role) {
      throw new HttpError(422, 'INVALID_INPUT', 'name, email and role are required');
    }

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      const id = body.id || `staff_${Date.now().toString(36)}`;
      const nameSealed = seal(ring, body.name, {
        tenantId: tx.tenantId,
        column: 'name',
        rowId: id,
      });
      const emailBlind = blindIndex(ring, body.email, 'email', tx.tenantId, 'email');

      const { rows } = await tx.query(
        `INSERT INTO "HmsStaff" ("id", "nameSealed", "emailBlind", "role", "departmentId", "status", "onDuty")
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING "id", "role", "departmentId", "status", "onDuty"`,
        [id, nameSealed, emailBlind, body.role, body.departmentId ?? null, body.status ?? 'ACTIVE', body.onDuty ?? false]
      );
      return rows[0];
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
}, { adminOnly: true, sensitive: true });
