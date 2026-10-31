import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required.');

const connectionUrl = new URL(databaseUrl);
connectionUrl.searchParams.set('connect_timeout', '3');
connectionUrl.searchParams.set('pool_timeout', '5');
connectionUrl.searchParams.set('socket_timeout', '10');

const prisma = new PrismaClient({ datasources: { db: { url: connectionUrl.toString() } } });
const alertThresholdDays = 7;

async function main(): Promise<void> {
    const [status] = await prisma.$queryRaw<Array<{ runway_days: number }>>`
    SELECT public.platform_rate_limit_partition_runway_days() AS runway_days
  `;
    if (!status) throw new Error('Partition runway query returned no result.');
    if (status.runway_days < alertThresholdDays) {
        console.error(
            `ALERT rate_limit_partition_runway_days=${status.runway_days} threshold=${alertThresholdDays}`,
        );
        process.exitCode = 1;
        return;
    }
    console.log(
        `OK rate_limit_partition_runway_days=${status.runway_days} threshold=${alertThresholdDays}`,
    );
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => prisma.$disconnect());
