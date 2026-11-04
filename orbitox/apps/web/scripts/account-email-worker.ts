import { PrismaClient } from '@prisma/client';
import { processAccountEmailBatch } from '../lib/account-email-worker';

async function main(): Promise<void> {
  const databaseUrl = process.env.OUTBOX_RELAY_DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error('OUTBOX_RELAY_DATABASE_URL is required.');
  const database = new PrismaClient({ datasourceUrl: databaseUrl });
  try {
    const roles = await database.$queryRaw<Array<{ role: string }>>`SELECT current_user AS role`;
    if (roles[0]?.role !== 'orbitox_outbox_relay') {
      throw new Error('Account email worker must connect as orbitox_outbox_relay.');
    }
    const result = await processAccountEmailBatch(database);
    console.info(JSON.stringify({ event: 'account_email.batch_complete', ...result }));
  } finally {
    await database.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Account email worker failed.', error);
  process.exitCode = 1;
});
