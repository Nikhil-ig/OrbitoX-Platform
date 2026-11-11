import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';
import { mapDbError, errorBody, HttpError } from '@/lib/db-errors';
import { bookAppointment } from '@/lib/hms-repository';

export const GET = withHospitalGuard(async (req: NextRequest, _routeContext, authContext) => {
  try {
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get('doctorId');
    const patientId = searchParams.get('patientId');

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      let query = `SELECT "id", "patientId", "doctorId", lower("slot") as "start", upper("slot") as "end", "status", "reasonSealed"
                   FROM "HmsAppointment"`;
      const params: any[] = [];
      if (doctorId) {
        params.push(doctorId);
        query += ` WHERE "doctorId" = $${params.length}`;
      } else if (patientId) {
        params.push(patientId);
        query += ` WHERE "patientId" = $${params.length}`;
      }
      query += ` ORDER BY lower("slot") ASC LIMIT 50`;

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

    if (!body.patientId || !body.doctorId || !body.start || !body.end) {
      throw new HttpError(422, 'INVALID_INPUT', 'patientId, doctorId, start and end are required');
    }

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      return await bookAppointment(tx, {
        patientId: body.patientId,
        doctorId: body.doctorId,
        start: new Date(body.start),
        end: new Date(body.end),
      });
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
});
