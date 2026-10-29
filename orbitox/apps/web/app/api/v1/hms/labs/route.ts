import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../../_lib/api-guard';
import { withTenantTx } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';
import { mapDbError, errorBody, HttpError } from '@/lib/db-errors';

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
      if (!body.patientId || !body.testCode) {
        throw new HttpError(422, 'INVALID_INPUT', 'patientId and testCode are required');
      }

      const lab = await withTenantTx(prisma, ctx.tenantId, async (tx) => {
        const id = body.id || `lab_${Date.now().toString(36)}`;
        const orderedById = body.orderedById || ctx.sub || 'staff_doctor';

        const { rows } = await tx.query(
          `INSERT INTO "HmsLabOrder" ("id", "patientId", "orderedById", "testCode", "status")
           VALUES ($1, $2, $3, $4, 'ORDERED')
           RETURNING "id", "patientId", "orderedById", "testCode", "status", "orderedAt"`,
          [id, body.patientId, orderedById, body.testCode]
        );
        return rows[0];
      });

      PlatformApiState.recordTelemetry({
        tenantId: ctx.tenantId,
        facade: 'EventsFacade',
        level: 'INFO',
        message: `Ordered lab diagnostic [${lab.testCode}] for patient [${lab.patientId}].`,
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
