import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../../_lib/api-guard';
import { withTenantTx } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';
import { mapDbError, errorBody, HttpError } from '@/lib/db-errors';
import { admitPatient, dischargePatient } from '@/lib/hms-repository';

export const GET = withApiGuard(
  {
    serviceId: 'hms',
    serviceName: 'Hospital Management System',
  },
  async (req: NextRequest, ctx) => {
    try {
      const { searchParams } = new URL(req.url);
      const wardId = searchParams.get('wardId');

      const { beds, total, available, occupied } = await withTenantTx(prisma, ctx.tenantId, async (tx) => {
        let query = `SELECT b."id", b."wardId", b."label", b."dailyRateMinor", b."serviceState",
                            a."id" as "admissionId", a."patientId",
                            CASE
                              WHEN a."id" IS NOT NULL THEN 'occupied'
                              WHEN b."serviceState" = 'MAINTENANCE' THEN 'maintenance'
                              ELSE 'available'
                            END as "status"
                     FROM "HmsBed" b
                     LEFT JOIN "HmsAdmission" a ON a."tenantId" = b."tenantId" AND a."bedId" = b."id" AND a."dischargedAt" IS NULL`;
        const params: any[] = [];
        if (wardId) {
          params.push(wardId);
          query += ` WHERE b."wardId" = $1`;
        }
        query += ` ORDER BY b."label" ASC`;

        const { rows } = await tx.query(query, params);
        const avail = rows.filter((b: any) => b.status === 'available').length;
        const occ = rows.filter((b: any) => b.status === 'occupied').length;

        return { beds: rows, total: rows.length, available: avail, occupied: occ };
      });

      return NextResponse.json({
        success: true,
        data: beds,
        meta: {
          total,
          available,
          occupied,
          occupancyRate: total > 0 ? `${Math.round((occupied / total) * 100)}%` : '0%',
          tenantId: ctx.tenantId,
        },
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
      const { bedId, patientId, action } = body;

      if (!bedId) {
        throw new HttpError(422, 'INVALID_INPUT', 'bedId is required');
      }

      const result = await withTenantTx(prisma, ctx.tenantId, async (tx) => {
        if (action === 'discharge' || !patientId) {
          const { rows } = await tx.query<{ id: string }>(
            `SELECT "id" FROM "HmsAdmission" WHERE "bedId" = $1 AND "dischargedAt" IS NULL LIMIT 1`,
            [bedId]
          );
          if (rows[0]) {
            await dischargePatient(tx, rows[0].id);
          }
          return { bedId, status: 'available' };
        }

        const admission = await admitPatient(tx, {
          patientId,
          bedId,
          staffId: ctx.sub || 'staff_system',
        });
        return { bedId, patientId, admissionId: admission.id, status: 'occupied' };
      });

      PlatformApiState.recordTelemetry({
        tenantId: ctx.tenantId,
        facade: 'EventsFacade',
        level: 'INFO',
        message: `Bed allocation updated for [${bedId}]: status=${result.status}`,
      });

      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      const apiErr = mapDbError(err);
      return NextResponse.json(errorBody(apiErr, ctx.requestId), { status: apiErr.status });
    }
  }
);
