import { Prisma, PrismaClient } from '@prisma/client';

export const REQUIRED_PLATFORM_MIGRATIONS = [
  '20261027000000_orbitox_phase2_full_baseline',
  '20261027000100_orbitox_phase2_step1_security',
  '20261027000200_orbitox_phase2_step1_review',
] as const;

const globalForPrisma = globalThis as typeof globalThis & { platformPrisma?: PrismaClient };

const prisma = globalForPrisma.platformPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.platformPrisma = prisma;

export async function assertPlatformDatabaseReady(
  client: PrismaClient = prisma,
  requiredMigrations: readonly string[] = REQUIRED_PLATFORM_MIGRATIONS,
): Promise<void> {
  await client.$queryRaw`SELECT 1`;

  const applied = await client.$queryRaw<Array<{ migration_name: string }>>(Prisma.sql`
    SELECT migration_name
    FROM "_prisma_migrations"
    WHERE migration_name IN (${Prisma.join(requiredMigrations)})
      AND finished_at IS NOT NULL
      AND rolled_back_at IS NULL
  `);

  const appliedMigrations = new Set(applied.map((row) => row.migration_name));
  if (requiredMigrations.some((migration) => !appliedMigrations.has(migration))) {
    throw new Error('The platform database is not at the required migration version.');
  }

  const [partitionStatus] = await client.$queryRaw<Array<{ ready: boolean }>>`
        SELECT public.platform_rate_limit_partitions_ready(3) AS ready
  `;
  if (!partitionStatus?.ready) throw new Error('Rate-limit partition runway is below 3 days.');
}
