import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';
import { mapDbError, errorBody, HttpError } from '@/lib/db-errors';
import { getPhiKeyRing } from '@/lib/phi-crypto';
import { readPatientForPurpose, admitPatient, dischargePatient, Purpose, PhiField } from '@/lib/hms-repository';

export const GET = withHospitalGuard(async (req: NextRequest, context: { params: Promise<{ id: string }> }, authContext) => {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const purpose = (searchParams.get('purpose') as Purpose) || 'TREATMENT';
    const fieldsParam = searchParams.get('fields');
    const fields: PhiField[] = fieldsParam
      ? (fieldsParam.split(',') as PhiField[])
      : ['name', 'phone', 'dateOfBirth', 'allergies', 'emergencyContact'];
    const ring = getPhiKeyRing();

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      return await readPatientForPurpose(tx, ring, {
        patientId: id,
        actorId: authContext.sub || 'staff_system',
        purpose,
        fields,
        requestId: authContext.requestId,
      });
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
});

export const POST = withHospitalGuard(async (req: NextRequest, context: { params: Promise<{ id: string }> }, authContext) => {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action'); // 'admit' | 'discharge'
    const body = await req.json().catch(() => ({}));
    const ring = getPhiKeyRing();

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      if (action === 'admit') {
        return await admitPatient(tx, {
          patientId: id,
          bedId: body.bedId,
          staffId: body.staffId || authContext.sub || 'staff_admin',
          notes: body.notes,
          ring,
        });
      } else if (action === 'discharge') {
        if (!body.admissionId) {
          // Find the active open admission for this patient
          const { rows } = await tx.query<{ id: string }>(
            `SELECT "id" FROM "HmsAdmission" WHERE "patientId" = $1 AND "dischargedAt" IS NULL LIMIT 1`,
            [id]
          );
          if (!rows[0]) throw new HttpError(404, 'OPEN_ADMISSION_NOT_FOUND');
          await dischargePatient(tx, rows[0].id);
          return { discharged: true, admissionId: rows[0].id };
        }
        await dischargePatient(tx, body.admissionId);
        return { discharged: true, admissionId: body.admissionId };
      }
      throw new HttpError(422, 'INVALID_INPUT', 'Unknown action');
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
});

export const PATCH = withHospitalGuard(async (req: NextRequest, context: { params: Promise<{ id: string }> }, authContext) => {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      const { rows } = await tx.query(
        `UPDATE "HmsPatient"
         SET "triageLevel" = COALESCE($2, "triageLevel"),
             "ageBand" = COALESCE($3, "ageBand"),
             "gender" = COALESCE($4, "gender"),
             "bloodGroup" = COALESCE($5, "bloodGroup"),
             "updatedAt" = now()
         WHERE "id" = $1
         RETURNING "id", "mrn", "triageLevel", "ageBand", "gender", "bloodGroup", "updatedAt"`,
        [id, body.triageLevel ?? null, body.ageBand ?? null, body.gender ?? null, body.bloodGroup ?? null]
      );
      if (!rows[0]) throw new HttpError(404, 'PATIENT_NOT_FOUND');
      return rows[0];
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
});
