import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../../../_lib/api-guard';
import { withTenantTx } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';
import { mapDbError, errorBody, HttpError } from '@/lib/db-errors';

export const POST = withApiGuard(
  {
    serviceId: 'hms',
    serviceName: 'Hospital Management System',
  },
  async (req: NextRequest, ctx) => {
    try {
      const body = await req.json();
      const { patientId, newTriageLevel, reason } = body;

      if (!patientId || typeof newTriageLevel !== 'number' || newTriageLevel < 1 || newTriageLevel > 5) {
        throw new HttpError(422, 'INVALID_INPUT', 'patientId and newTriageLevel (1-5) are required');
      }

      const updated = await withTenantTx(prisma, ctx.tenantId, async (tx) => {
        const { rows } = await tx.query(
          `UPDATE "HmsPatient"
           SET "triageLevel" = $2,
               "updatedAt" = now()
           WHERE "id" = $1
           RETURNING "id", "mrn", "triageLevel", "updatedAt"`,
          [patientId, newTriageLevel]
        );
        if (!rows[0]) throw new HttpError(404, 'PATIENT_NOT_FOUND', `Patient ${patientId} not found`);
        return rows[0];
      });

      PlatformApiState.recordTelemetry({
        tenantId: ctx.tenantId,
        facade: 'EventsFacade',
        level: newTriageLevel <= 2 ? 'WARN' : 'INFO',
        message: `Triage state machine advanced for [${updated.mrn}] to Level ${newTriageLevel}. Reason: ${reason || 'Clinical re-evaluation'}`,
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: `Triage state machine transitioned patient ${updated.mrn} to Level ${newTriageLevel}.`,
      });
    } catch (err: any) {
      const apiErr = mapDbError(err);
      return NextResponse.json(errorBody(apiErr, ctx.requestId), { status: apiErr.status });
    }
  }
);
