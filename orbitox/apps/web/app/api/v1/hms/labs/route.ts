import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../../_lib/api-guard';
import { hospitalStore } from '@/app/api/hospital/_store';

export const GET = withApiGuard(
  {
    serviceId: 'hms',
    serviceName: 'Hospital Management System',
  },
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId') || undefined;
    const labs = hospitalStore.getLabs(patientId);

    return NextResponse.json({
      success: true,
      data: labs,
      meta: { total: labs.length },
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
      const lab = hospitalStore.addLab(body);

      PlatformApiState.recordTelemetry({
        tenantId: ctx.tenantId,
        facade: 'EventsFacade',
        level: 'INFO',
        message: `Ordered lab diagnostic [${lab.testType}] for patient [${lab.patientName}].`,
      });

      return NextResponse.json({
        success: true,
        data: lab,
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: err.message } },
        { status: 400 }
      );
    }
  }
);
