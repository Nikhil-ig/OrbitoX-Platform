import { PrismaClient } from '@prisma/client';
import { sweepBillingGrace } from '@/server/billing/billing-grace-sweep';

async function main(): Promise<void> {
  const nodeEnv = process.env.NODE_ENV || 'production';
  const repositoryMode = process.env.ORBITOX_PLATFORM_REPOSITORY || 'prisma';
  if (repositoryMode !== 'prisma') {
    throw new Error('Billing grace sweep requires ORBITOX_PLATFORM_REPOSITORY=prisma.');
  }
  const runtimeUrl = process.env.APP_DATABASE_URL?.trim();
  const maintenanceUrl = process.env.MAINTENANCE_DATABASE_URL?.trim();
  if (!runtimeUrl || !maintenanceUrl) {
    throw new Error('APP_DATABASE_URL and MAINTENANCE_DATABASE_URL are required.');
  }
  const runtime = new PrismaClient({ datasourceUrl: runtimeUrl });
  const maintenance = new PrismaClient({ datasourceUrl: maintenanceUrl });
  try {
    const roles = await Promise.all([
      runtime.$queryRaw<Array<{ role: string }>>`SELECT current_user AS role`,
      maintenance.$queryRaw<Array<{ role: string }>>`SELECT current_user AS role`,
    ]);
    if (roles[0]?.[0]?.role !== 'orbitox_runtime' || roles[1]?.[0]?.role !== 'orbitox_maintenance') {
      throw new Error('Billing grace sweep requires runtime and maintenance database roles.');
    }
    const result = await sweepBillingGrace(runtime, maintenance);
    console.info(JSON.stringify({ event: 'billing.grace_sweep_complete', ...result }));
  } finally {
    await Promise.all([runtime.$disconnect(), maintenance.$disconnect()]);
  }
}

main().catch((error: unknown) => {
  console.error('Billing grace sweep failed.', error);
  process.exitCode = 1;
});
