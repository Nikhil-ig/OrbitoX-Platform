import { PrismaClient } from '@prisma/client';
import { processMcpAuditOutboxBatch } from '@/server/provisioning/webhook-emitter';
import { reconcileStaleMcpExecutions } from '@/server/ai/mcp-governance-service';
import { recordPlatformAdminAuditWithClient } from '@/server/db/platform-repository';

async function main(): Promise<void> {
  if ((process.env.ORBITOX_PLATFORM_REPOSITORY || 'prisma') !== 'prisma') {
    throw new Error('MCP governance worker requires ORBITOX_PLATFORM_REPOSITORY=prisma.');
  }

  const outboxUrl = process.env.OUTBOX_RELAY_DATABASE_URL?.trim();
  const auditUrl =
    process.env.PLATFORM_ADMIN_AUDIT_DATABASE_URL?.trim() ||
    process.env.PLATFORM_AUDIT_DATABASE_URL?.trim();
  const maintenanceUrl = process.env.MAINTENANCE_DATABASE_URL?.trim();

  if (!outboxUrl || !auditUrl || !maintenanceUrl) {
    throw new Error(
      'OUTBOX_RELAY_DATABASE_URL, PLATFORM_ADMIN_AUDIT_DATABASE_URL, and MAINTENANCE_DATABASE_URL are required.',
    );
  }

  const outboxDb = new PrismaClient({ datasourceUrl: outboxUrl });
  const auditDb = new PrismaClient({ datasourceUrl: auditUrl });
  const maintenanceDb = new PrismaClient({ datasourceUrl: maintenanceUrl });

  try {
    const roles = await Promise.all([
      outboxDb.$queryRaw<Array<{ role: string }>>`SELECT current_user AS role`,
      auditDb.$queryRaw<Array<{ role: string }>>`SELECT current_user AS role`,
      maintenanceDb.$queryRaw<Array<{ role: string }>>`SELECT current_user AS role`,
    ]);

    if (
      roles[0]?.[0]?.role !== 'orbitox_outbox_relay' ||
      roles[1]?.[0]?.role !== 'orbitox_platform_admin_audit' ||
      roles[2]?.[0]?.role !== 'orbitox_maintenance'
    ) {
      throw new Error(
        `MCP governance worker requires restricted database roles (got outbox=${roles[0]?.[0]?.role}, audit=${roles[1]?.[0]?.role}, maintenance=${roles[2]?.[0]?.role}).`,
      );
    }

    const recordAudit = (evt: any) => recordPlatformAdminAuditWithClient(auditDb, evt);
    const outboxResult = await processMcpAuditOutboxBatch({
      limit: 50,
      prismaClient: outboxDb,
      recordAudit,
    });
    const reconcilerResult = await reconcileStaleMcpExecutions({
      maintenancePrisma: maintenanceDb,
      deps: { recordAudit },
    });

    console.info(
      JSON.stringify({
        event: 'mcp.governance_worker_complete',
        outbox: outboxResult,
        reconciler: reconcilerResult,
        timestamp: new Date().toISOString(),
      }),
    );
  } finally {
    await Promise.all([outboxDb.$disconnect(), auditDb.$disconnect(), maintenanceDb.$disconnect()]);
  }
}

main().catch((error: unknown) => {
  console.error('MCP governance worker failed.', error);
  process.exitCode = 1;
});
