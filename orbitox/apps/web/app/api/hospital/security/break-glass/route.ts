import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/lib/tenant-db';
import { prisma } from '@/lib/prisma';
import { mapDbError, errorBody, HttpError } from '@/lib/db-errors';

export const POST = withHospitalGuard(async (req: NextRequest, _routeContext, authContext) => {
  try {
    const body = await req.json();

    if (!body.staffId || !body.patientId || !body.reason) {
      throw new HttpError(422, 'INVALID_INPUT', 'staffId, patientId and reason are required');
    }
    if (body.reason.length < 20) {
      throw new HttpError(422, 'INVALID_INPUT', 'Break-glass reason must be at least 20 characters');
    }

    const data = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      const id = body.id || `bg_${Date.now().toString(36)}`;
      const durationHours = Math.min(Math.max(1, body.durationHours || 1), 4);

      const { rows } = await tx.query(
        `INSERT INTO "HmsBreakGlassGrant" ("id", "staffId", "patientId", "reason", "expiresAt")
         VALUES ($1, $2, $3, $4, now() + ($5 || ' hours')::interval)
         RETURNING "id", "staffId", "patientId", "reason", "grantedAt", "expiresAt"`,
        [id, body.staffId, body.patientId, body.reason, durationHours.toString()]
      );

      // Alert hospital admin on every break-glass access
      await tx.query(
        `INSERT INTO "TenantOutbox" ("topic", "payload")
         VALUES ($1, $2::jsonb)`,
        [
          'hospital.security.break_glass_alert',
          JSON.stringify({
            grantId: id,
            staffId: body.staffId,
            patientId: body.patientId,
            reason: body.reason,
            durationHours,
            alert: 'SECURITY_BREAK_GLASS_ACCESSED',
            at: new Date().toISOString(),
          }),
        ]
      );

      return rows[0];
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
}, { adminOnly: true, sensitive: true });
