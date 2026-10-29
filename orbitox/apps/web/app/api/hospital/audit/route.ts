import { NextRequest, NextResponse } from 'next/server';
import { withHospitalGuard } from '@/app/api/_lib/route-auth';
import { withTenantTx } from '@/lib/tenant-db';
import { mapDbError, errorBody } from '@/lib/db-errors';
import { PrismaClient } from '@prisma/client';

const globalForAudit = globalThis as typeof globalThis & { hmsAuditPrisma?: PrismaClient };

function getAuditClient(): PrismaClient {
  if (globalForAudit.hmsAuditPrisma) return globalForAudit.hmsAuditPrisma;
  const auditDbUrl =
    process.env.PLATFORM_AUDIT_DATABASE_URL ||
    process.env.APP_DATABASE_URL ||
    process.env.DATABASE_URL;
  const client = new PrismaClient({
    ...(auditDbUrl ? { datasources: { db: { url: auditDbUrl } } } : {}),
  });
  if (process.env.NODE_ENV !== 'production') globalForAudit.hmsAuditPrisma = client;
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
