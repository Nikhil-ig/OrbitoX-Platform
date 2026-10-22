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
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search')?.toLowerCase();

    let patients = hospitalStore.getPatients();

    if (status && status !== 'all') {
      patients = patients.filter((p) => p.status === status);
    }
    if (category && category !== 'all') {
      patients = patients.filter((p) => p.category === category);
    }
    if (search) {
      patients = patients.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.id.toLowerCase().includes(search) ||
          p.diagnosis.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      success: true,
      data: patients,
      meta: {
        tenantId: ctx.tenantId,
        serviceId: 'hms',
        total: patients.length,
        timestamp: new Date().toISOString(),
      },
    });
  }
);

export const POST = withApiGuard(
  {
    serviceId: 'hms',
    serviceName: 'Hospital Management System',
    requiredScopes: ['write', 'hms.patients.write'],
  },
  async (req: NextRequest, ctx) => {
    try {
      const body = await req.json();
      if (!body.name) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_INPUT', message: 'Patient name is required.' } },
          { status: 400 }
        );
      }

      const newPatient = hospitalStore.addPatient({
        ...body,
        contextId: ctx.tenantId,
      });

      PlatformApiState.recordTelemetry({
        tenantId: ctx.tenantId,
        facade: 'EventsFacade',
        level: 'INFO',
        message: `Registered patient [${newPatient.name}] (${newPatient.id}) into HMS Triage Level ${newPatient.triageLevel}.`,
      });

      return NextResponse.json({
        success: true,
        data: newPatient,
        message: `Patient ${newPatient.name} registered successfully.`,
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: err.message } },
        { status: 400 }
      );
    }
  }
);
