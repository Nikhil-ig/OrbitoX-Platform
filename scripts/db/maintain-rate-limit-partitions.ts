import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.MAINTENANCE_DATABASE_URL;
if (!databaseUrl) throw new Error('MAINTENANCE_DATABASE_URL is required.');

const connectionUrl = new URL(databaseUrl);
connectionUrl.searchParams.set('connect_timeout', '3');
connectionUrl.searchParams.set('pool_timeout', '5');
connectionUrl.searchParams.set('socket_timeout', '10');

const prisma = new PrismaClient({ datasources: { db: { url: connectionUrl.toString() } } });

async function main(): Promise<void> {
    await prisma.$queryRaw`SELECT public.maintain_platform_rate_limit_partitions(3, 14)::TEXT AS result`;
    const [status] = await prisma.$queryRaw<Array<{ ready: boolean; runway_days: number }>>`
        SELECT public.platform_rate_limit_partitions_ready(3) AS ready,
                     public.platform_rate_limit_partition_runway_days() AS runway_days
  `;
    if (!status?.ready)
        throw new Error('Rate-limit partition horizon is not ready after maintenance.');
    if (status.runway_days < 14) {
        throw new Error(`Partition maintenance restored only ${status.runway_days} future UTC days.`);
    }
    console.log(`Rate-limit partitions maintained; ${status.runway_days} future UTC days are ready.`);
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => prisma.$disconnect());
