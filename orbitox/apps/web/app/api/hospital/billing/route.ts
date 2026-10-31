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
      let query = `SELECT "id", "patientId", "currency", "totalMinor"::text as "totalMinor", "paidMinor"::text as "paidMinor", "status", "createdAt"
                   FROM "HmsInvoice"`;
      const params: any[] = [];
      if (patientId) {
        params.push(patientId);
        query += ` WHERE "patientId" = $1`;
      }
      query += ` ORDER BY "createdAt" DESC LIMIT 50`;

      const { rows: invoices } = await tx.query(query, params);

      const { rows: statsRows } = await tx.query<{ totalInvoiced: string; totalPaid: string }>(
        `SELECT COALESCE(SUM("totalMinor"), 0)::text as "totalInvoiced",
                COALESCE(SUM("paidMinor"), 0)::text as "totalPaid"
         FROM "HmsInvoice"`
      );

      return {
        invoices,
        stats: statsRows[0] || { totalInvoiced: '0', totalPaid: '0' },
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

    if (!body.patientId || body.totalMinor == null) {
      throw new HttpError(422, 'INVALID_INPUT', 'patientId and totalMinor are required');
    }

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      const id = body.id || `inv_${Date.now().toString(36)}`;
      const totalMinor = BigInt(body.totalMinor);

      const { rows } = await tx.query(
        `INSERT INTO "HmsInvoice" ("id", "patientId", "totalMinor")
         VALUES ($1, $2, $3::bigint)
         RETURNING "id", "patientId", "totalMinor"::text as "totalMinor", "paidMinor"::text as "paidMinor", "status", "createdAt"`,
        [id, body.patientId, totalMinor.toString()]
      );
      return rows[0];
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
});
