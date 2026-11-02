import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';
import { mapDbError, errorBody } from '@/lib/db-errors';
import { getPhiKeyRing } from '@/lib/phi-crypto';
import { findPatientIdsByPhone, createPatient } from '@/lib/hms-repository';
import { idempotent } from '@/lib/idempotency';

const injected503Keys = new Set<string>();

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

    const patientQuota = authContext.grant?.quotas?.patients?.limit ?? body.quotaLimit;
    const idempotencyKey = req.headers.get('idempotency-key') || req.headers.get('x-idempotency-key') || undefined;

    const result = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      if (idempotencyKey) {
        const idemRes = await idempotent(tx, 'hospital.patient.create', idempotencyKey, body, async () => {
          const patient = await createPatient(
            tx,
            ring,
            {
              mrn: body.mrn || `MRN-${Date.now().toString(36).toUpperCase()}`,
              name: body.name,
              phone: body.phone,
              dateOfBirth: body.dateOfBirth,
              ageBand: body.ageBand,
              gender: body.gender,
              bloodGroup: body.bloodGroup,
              allergies: body.allergies,
              emergencyContact: body.emergencyContact,
            },
            patientQuota
          );
          return { status: 201, body: patient };
        });
        return idemRes.body;
      }

      return await createPatient(
        tx,
        ring,
        {
          mrn: body.mrn || `MRN-${Date.now().toString(36).toUpperCase()}`,
          name: body.name,
          phone: body.phone,
          dateOfBirth: body.dateOfBirth,
          ageBand: body.ageBand,
          gender: body.gender,
          bloodGroup: body.bloodGroup,
          allergies: body.allergies,
          emergencyContact: body.emergencyContact,
        },
        patientQuota
      );
    });

    // Test fault injection hook (NODE_ENV === 'test' only)
    if (process.env.NODE_ENV === 'test' && req.headers.get('x-test-inject-post-commit-503') === 'once') {
      if (idempotencyKey && !injected503Keys.has(idempotencyKey)) {
        injected503Keys.add(idempotencyKey);
        return NextResponse.json(
          { error: 'SERVICE_UNAVAILABLE', message: 'Injected 503 fault after commit' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
});
