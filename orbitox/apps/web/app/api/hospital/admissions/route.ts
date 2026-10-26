import { NextRequest, NextResponse } from 'next/server';
import { safeProxyOrFallback } from '../_init';
import { hospitalStore } from '../_store';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';

export const POST = withHospitalGuard(async (req: NextRequest, _routeContext, authContext) => {
  try {
    const body = await req.json();
    return safeProxyOrFallback(
      req,
      '/api/hospital/admissions',
      () => {
        // Fallback: Admit patient to bed in hospitalStore
        if (body.patientId) {
          const updated = hospitalStore.updatePatient(body.patientId, {
            status: 'admitted',
            bedId: body.bedId,
            bedLabel: body.bedLabel,
            triageLevel: body.triageLevel,
            admittedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
          });
          return { success: true, patient: updated };
        } else {
          const newPatient = hospitalStore.addPatient({
            ...body,
            status: 'admitted',
            admittedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
          });
          return { success: true, patient: newPatient };
        }
      },
      {
        method: 'POST',
        body,
      },
      authContext
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
});
