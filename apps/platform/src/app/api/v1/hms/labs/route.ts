import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../../_lib/api-guard';
import { withTenantTx } from '@/server/db/tenant-db';
import { prisma } from '@/server/db/prisma';
import { mapDbError, errorBody, HttpError } from '@/server/db/db-errors';
import { verifyStaffSession } from '@/server/auth/hms-auth';
import { assertPatientActive } from '@/server/hospital/hms-repository';

export const GET = withApiGuard(
  {
    serviceId: 'hms',
    serviceName: 'Hospital Management System',
  },
  async (req: NextRequest, ctx) => {
    try {
      const { searchParams } = new URL(req.url);
      const patientId = searchParams.get('patientId');

      const data = await withTenantTx(prisma, ctx.tenantId, async (tx) => {
        let query = `SELECT "id", "patientId", "orderedById", "testType", "status", "resultSealed", "resultedById", "verifiedById", "verifiedAt", "updatedAt"
                     FROM "HmsLabOrder"`;
        const params: any[] = [];
        if (patientId) {
          params.push(patientId);
          query += ` WHERE "patientId" = $1`;
        }
        query += ` ORDER BY "updatedAt" DESC LIMIT 50`;

        const { rows } = await tx.query(query, params);
        return rows;
      });

      return NextResponse.json({
        success: true,
        data,
        meta: { total: data.length },
      });
    } catch (err: any) {
      const apiErr = mapDbError(err);
      return NextResponse.json(errorBody(apiErr, ctx.requestId), { status: apiErr.status });
    }
  }
);

export const POST = withApiGuard(
  {
    serviceId: 'hms',
    serviceName: 'Hospital Management System',
  },
  async (req: NextRequest, ctx) => {
    try {
      const body = await req.json();
      const testType = body.testType || body.testCode;
      if (!body.patientId || !testType) {
        throw new HttpError(422, 'INVALID_INPUT', 'patientId and testType are required');
      }

      const staffToken = req.headers.get('x-staff-session') || req.headers.get('x-staff-token');
      const lab = await withTenantTx(prisma, ctx.tenantId, async (tx) => {
        let orderedById: string;
        if (staffToken) {
          try {
            const verified = await verifyStaffSession(tx, staffToken);
            orderedById = verified.actor.staffId;
          } catch {
            throw new HttpError(401, 'STAFF_IDENTITY_REQUIRED', 'Valid staff session (x-staff-session) is required to order lab tests.');
          }
        } else if (ctx.sub?.trim()) {
          const { rows: staffRows } = await tx.query<{ id: string }>(
            `SELECT "id" FROM "HmsStaff" WHERE "id" = $1 LIMIT 1`,
            [ctx.sub.trim()]
          );
          if (!staffRows[0]) {
            throw new HttpError(401, 'STAFF_IDENTITY_REQUIRED', 'Authenticated staff identity does not match an active staff member.');
          }
          orderedById = staffRows[0].id;
        } else {
          throw new HttpError(401, 'STAFF_IDENTITY_REQUIRED', 'Authenticated staff identity is required; orderedById cannot be supplied in request body.');
        }

        await assertPatientActive(tx, body.patientId);
        const id = body.id || `lab_${Date.now().toString(36)}`;

        const { rows } = await tx.query(
          `INSERT INTO "HmsLabOrder" ("id", "patientId", "orderedById", "testType", "status")
           VALUES ($1, $2, $3, $4, 'ORDERED')
           RETURNING "id", "patientId", "orderedById", "testType", "status", "updatedAt"`,
          [id, body.patientId, orderedById, testType]
        );
        return rows[0];
      });

      PlatformApiState.recordTelemetry({
        tenantId: ctx.tenantId,
        facade: 'EventsFacade',
        level: 'INFO',
        message: `Ordered lab diagnostic [${lab.testType}] for patient [${lab.patientId}].`,
      });

      return NextResponse.json({
        success: true,
        data: lab,
      }, { status: 201 });
    } catch (err: any) {
      const apiErr = mapDbError(err);
      return NextResponse.json(errorBody(apiErr, ctx.requestId), { status: apiErr.status });
    }
  }
);
