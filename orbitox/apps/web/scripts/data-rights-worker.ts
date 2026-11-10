import { PrismaClient } from '@prisma/client';
import { createObjectStoreFromEnv } from '../lib/data-rights/object-store';
import {
  processDueOrganizationDeletions,
  processExportJobs,
  purgeExpiredExports,
} from '../lib/data-rights/service';

async function main(): Promise<void> {
  if ((process.env.ORBITOX_PLATFORM_REPOSITORY || 'prisma') !== 'prisma') {
    throw new Error('Data-rights worker requires ORBITOX_PLATFORM_REPOSITORY=prisma.');
  }

  // Fail closed at worker startup if ObjectStore configuration is missing/invalid.
  const objectStore = createObjectStoreFromEnv(process.env);

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
      throw new Error('Data-rights worker requires orbitox_runtime and orbitox_maintenance database roles.');
    }

    const exportsRes = await processExportJobs({
      runtimePrisma: runtime,
      maintenancePrisma: maintenance,
      objectStore,
    });
    const purgeRes = await purgeExpiredExports({
      maintenancePrisma: maintenance,
      objectStore,
    });
    const deletionRes = await processDueOrganizationDeletions({ maintenancePrisma: maintenance });

    console.info(
      JSON.stringify({
        event: 'data_rights.worker_sweep_complete',
        exportsProcessed: exportsRes.processed,
        exportsSucceeded: exportsRes.succeeded,
        exportsFailed: exportsRes.failed,
        purgedJobs: purgeRes.purgedJobs,
        deletionsProcessed: deletionRes.processed,
        deletionsCompleted: deletionRes.completed,
      }),
    );
  } finally {
    await Promise.all([runtime.$disconnect(), maintenance.$disconnect()]);
  }
}

main().catch((error: unknown) => {
  console.error('Data-rights worker failed.', error);
  process.exitCode = 1;
});
