import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.$queryRaw`SELECT public.maintain_platform_rate_limit_partitions(3, 14)`;
  const [status] = await prisma.$queryRaw<Array<{ ready: boolean }>>`
    SELECT public.platform_rate_limit_partitions_ready(14) AS ready
  `;
  if (!status?.ready)
    throw new Error('Rate-limit partition horizon is not ready after maintenance.');
  console.log('Rate-limit partitions maintained; 14-day write horizon is ready.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
