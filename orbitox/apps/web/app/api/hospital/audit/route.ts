import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/lib/tenant-db';
import { mapDbError, errorBody } from '@/lib/db-errors';
import { PrismaClient } from '@prisma/client';

const globalForAudit = globalThis as typeof globalThis & { hmsAuditPrisma?: PrismaClient };

function getAuditClient(): PrismaClient {
  if (globalForAudit.hmsAuditPrisma) return globalForAudit.hmsAuditPrisma;
  const auditDbUrl = process.env.HMS_AUDIT_DATABASE_URL?.trim();
  if (!auditDbUrl) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'HMS_AUDIT_DATABASE_URL is not set: Hospital audit requires dedicated hms_audit_reader role connection.',
      );
    }
    // In development/test only, fallback to restricted APP_DATABASE_URL, NEVER to owner DATABASE_URL
    const fallbackUrl = process.env.APP_DATABASE_URL?.trim();
    if (!fallbackUrl) {
      throw new Error('HMS_AUDIT_DATABASE_URL (or APP_DATABASE_URL in development) is required for audit client.');
    }
    const client = new PrismaClient({ datasources: { db: { url: fallbackUrl } } });
    if ((process.env.NODE_ENV as string) !== 'production') globalForAudit.hmsAuditPrisma = client;
    return client;
  }
  const client = new PrismaClient({ datasources: { db: { url: auditDbUrl } } });
  if ((process.env.NODE_ENV as string) !== 'production') globalForAudit.hmsAuditPrisma = client;
  return client;
}

export const GET = withHospitalGuard(async (_req: NextRequest, _routeContext, authContext) => {
  try {
    const auditClient = getAuditClient();
    const logs = await withTenantTx(auditClient, authContext.tenantId, async (tx) => {
      if (!tx.prisma) throw new Error('Prisma client required on TenantTx');
      const rows = await tx.prisma.hmsPhiAccessLog.findMany({
        where: {
          tenantId: tx.tenantId,
        },
        orderBy: { seq: 'desc' },
        take: 50,
      });

      return rows.map((r) => ({
        ...r,
        seq: r.seq.toString(),
      }));
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (err: any) {
    const apiErr = mapDbError(err);
    return NextResponse.json(errorBody(apiErr, authContext.requestId), { status: apiErr.status });
  }
}, { adminOnly: true, sensitive: true });
