import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../../../_lib/api-guard';
import { hospitalStore } from '@/app/api/hospital/_store';

export const POST = withApiGuard(
  {
    serviceId: 'hms',
    serviceName: 'Hospital Management System',
  },
  async (req: NextRequest, ctx) => {
    try {
      const body = await req.json();
      const { patientId, newTriageLevel, reason } = body;

      if (!patientId || typeof newTriageLevel !== 'number') {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_INPUT', message: 'patientId and newTriageLevel (1-5) are required.' } },
          { status: 400 }
        );
      }

      const updated = hospitalStore.updatePatient(patientId, {
        triageLevel: newTriageLevel,
        clinicalNotes: reason
          ? `${hospitalStore.getPatientById(patientId)?.clinicalNotes || ''}\n[Triage Update]: ${reason}`
          : undefined,
      });

      if (!updated) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: `Patient ${patientId} not found.` } },
          { status: 404 }
        );
      }

      PlatformApiState.recordTelemetry({
        tenantId: ctx.tenantId,
        facade: 'EventsFacade',
        level: newTriageLevel <= 2 ? 'WARN' : 'INFO',
        message: `Triage state machine advanced for [${updated.name}] to Level ${newTriageLevel}. Reason: ${reason || 'Clinical re-evaluation'}`,
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: `Triage state machine transitioned patient ${updated.name} to Level ${newTriageLevel}.`,
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: err.message } },
        { status: 400 }
      );
    }
  }
);
