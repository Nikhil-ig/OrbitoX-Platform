import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';
import { mapDbError, errorBody } from '@/lib/db-errors';
import { getPhiKeyRing } from '@/lib/phi-crypto';
import { findPatientIdsByPhone, createPatient } from '@/lib/hms-repository';

export const GET = withHospitalGuard(async (req: NextRequest, _routeContext, authContext) => {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');
    const ring = getPhiKeyRing();

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      if (phone) {
        return await findPatientIdsByPhone(tx, ring, phone);
      }
      const { rows } = await tx.query(
        `SELECT "id", "mrn", "ageBand", "gender", "bloodGroup", "triageLevel", "createdAt"
         FROM "HmsPatient"
         ORDER BY "createdAt" DESC
         LIMIT 50`
      );
      return rows;
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
});

export const POST = withHospitalGuard(async (req: NextRequest, _routeContext, authContext) => {
  try {
    const body = await req.json();
    const ring = getPhiKeyRing();

    const result = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      return await createPatient(tx, ring, {
        mrn: body.mrn || `MRN-${Date.now().toString(36).toUpperCase()}`,
        name: body.name,
        phone: body.phone,
        dateOfBirth: body.dateOfBirth,
        ageBand: body.ageBand,
        gender: body.gender,
        bloodGroup: body.bloodGroup,
        allergies: body.allergies,
        emergencyContact: body.emergencyContact,
      });
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
});
