import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/server/db/tenant-db';
import { prisma } from '@/server/db/prisma';
import { unlockStaffCredential } from '@/server/auth/hms-auth';
import { mapDbError, errorBody, HttpError } from '@/server/db/db-errors';
import { resolveClientIp } from '@/app/api/v1/_lib/ip-guard';
import { platformRepository } from '@/server/db/platform-repository';

export const POST = withHospitalGuard(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  authContext
) => {
  try {
    const { id } = await params;
    const clientIp = resolveClientIp(req.headers);

    const result = await withTenantTx(prisma, authContext.tenantId, async (tx) => {
      return unlockStaffCredential(tx, id);
    });

    try {
      await platformRepository.recordPlatformAdminAudit({
        action: 'hms.security.account_unlocked',
        entityType: 'HmsStaff',
        entityId: id,
        organizationId: authContext.tenantId,
        actorId: (authContext as any).actorId || authContext.sub || 'platform-admin',
        ipAddress: clientIp,
        requestId: authContext.requestId,
        reason: 'Hospital admin manually unlocked staff credential',
        metadata: {
          tenantId: authContext.tenantId,
          staffId: id,
          unlockedBy: authContext.sub || 'platform-admin',
        },
      });
    } catch (auditErr) {
      console.error('[HMS Security] Failed to record unlock audit event:', auditErr);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
}, { adminOnly: true, sensitive: true });
