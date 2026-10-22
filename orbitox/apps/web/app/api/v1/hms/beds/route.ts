import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../../_lib/api-guard';
import { hospitalStore } from '@/app/api/hospital/_store';

export const GET = withApiGuard(
  {
    serviceId: 'hms',
    serviceName: 'Hospital Management System',
  },
  async (req: NextRequest, ctx) => {
    const { searchParams } = new URL(req.url);
    const wardId = searchParams.get('wardId');
    const status = searchParams.get('status');

    let beds = hospitalStore.getBeds();

    if (wardId) beds = beds.filter((b) => b.wardId === wardId);
    if (status) beds = beds.filter((b) => b.status === status);

    const available = beds.filter((b) => b.status === 'available').length;
    const occupied = beds.filter((b) => b.status === 'occupied').length;

    return NextResponse.json({
      success: true,
      data: beds,
      meta: {
        total: beds.length,
        available,
        occupied,
        occupancyRate: `${Math.round((occupied / beds.length) * 100)}%`,
        tenantId: ctx.tenantId,
      },
    });
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
      const { bedId, patientId } = body;

      if (!bedId) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_INPUT', message: 'bedId is required.' } },
          { status: 400 }
        );
      }

      const patient = patientId ? hospitalStore.getPatientById(patientId) : null;
      const updated = hospitalStore.updateBed(bedId, {
        status: patientId ? 'occupied' : 'available',
        patientId,
        patientName: patient?.name,
      });

      if (patient && updated) {
        hospitalStore.updatePatient(patientId, {
          bedId,
          bedLabel: updated.label,
          status: 'admitted',
        });
      }

      PlatformApiState.recordTelemetry({
        tenantId: ctx.tenantId,
        facade: 'EventsFacade',
        level: 'INFO',
        message: `Bed allocation updated for [${updated?.label}]: status=${updated?.status}`,
      });

      return NextResponse.json({
        success: true,
        data: updated,
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: err.message } },
        { status: 400 }
      );
    }
  }
);
