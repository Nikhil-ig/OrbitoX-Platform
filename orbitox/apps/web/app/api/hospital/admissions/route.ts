import { NextRequest, NextResponse } from 'next/server';
import { safeProxyOrFallback } from '../_init';
import { hospitalStore } from '../_store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const contextId = req.headers.get('x-context-id') || body.bedId || '';

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
        headers: contextId ? { 'x-context-id': contextId } : undefined,
      }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
