import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/server/db/tenant-db';
import { prisma } from '@/server/db/prisma';
import { mapDbError, errorBody } from '@/server/db/db-errors';
import { getPhiKeyRing } from '@/server/hospital/phi-crypto';
import { findPatientIdsByPhone, createPatient, generateMrn } from '@/server/hospital/hms-repository';
import { idempotent } from '@/server/db/idempotency';

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
         WHERE "processingStatus" = 'ACTIVE'
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
    // Entitlement grant enforcement verification: grant must exist
    if (!authContext.grant) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Signed entitlement grant missing; enforcement did not run.',
          },
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const ring = getPhiKeyRing();

    // Use signed grant only. Never read limits from request body.
    const patientQuota = typeof authContext.grant.quotas?.patients?.limit === 'number'
      ? authContext.grant.quotas.patients.limit
      : undefined;
    const idempotencyKey = req.headers.get('idempotency-key') || req.headers.get('x-idempotency-key') || undefined;

    const result = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      const patientInput = {
        mrn: body.mrn || generateMrn(),
        name: body.name,
        phone: body.phone,
        dateOfBirth: body.dateOfBirth,
        ageBand: body.ageBand,
        gender: body.gender,
        bloodGroup: body.bloodGroup,
        allergies: body.allergies,
        emergencyContact: body.emergencyContact,
      };

      if (idempotencyKey) {
        const idemRes = await idempotent(tx, 'hospital.patient.create', idempotencyKey, body, async () => {
          const patient = await createPatient(
            tx,
            ring,
            patientInput,
            patientQuota
          );
          return { status: 201, body: patient };
        });
        return idemRes.body;
      }

      return await createPatient(
        tx,
        ring,
        patientInput,
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
