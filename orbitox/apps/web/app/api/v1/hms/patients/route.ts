import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../../_lib/api-guard';
import { withTenantTx } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';
import { mapDbError, errorBody } from '@/lib/db-errors';
import { getPhiKeyRing } from '@/lib/phi-crypto';
import { createPatient } from '@/lib/hms-repository';

export const GET = withApiGuard(
  {
    serviceId: 'hms',
    serviceName: 'Hospital Management System',
  },
  async (req: NextRequest, ctx) => {
    try {
      const data = await withTenantTx(prisma, ctx.tenantId, async (tx) => {
        const { rows } = await tx.query(
          `SELECT "id", "mrn", "ageBand", "gender", "bloodGroup", "triageLevel", "createdAt"
           FROM "HmsPatient"
           ORDER BY "createdAt" DESC
           LIMIT 50`
        );
        return rows;
      });

      return NextResponse.json({
        success: true,
        data,
        meta: {
          tenantId: ctx.tenantId,
          serviceId: 'hms',
          total: data.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      const apiErr = mapDbError(err);
      return NextResponse.json(errorBody(apiErr, ctx.requestId), { status: apiErr.status });
    }
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
          { status: 422 }
        );
      }
      const ring = getPhiKeyRing();

      const newPatient = await withTenantTx(prisma, ctx.tenantId, async (tx) => {
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

      PlatformApiState.recordTelemetry({
        tenantId: ctx.tenantId,
        facade: 'EventsFacade',
        level: 'INFO',
        message: `Registered patient (${newPatient.id}) with MRN ${newPatient.mrn}.`,
      });

      return NextResponse.json({
        success: true,
        data: newPatient,
        message: `Patient registered successfully.`,
      }, { status: 201 });
    } catch (err: any) {
      const apiErr = mapDbError(err);
      return NextResponse.json(errorBody(apiErr, ctx.requestId), { status: apiErr.status });
    }
  }
);
