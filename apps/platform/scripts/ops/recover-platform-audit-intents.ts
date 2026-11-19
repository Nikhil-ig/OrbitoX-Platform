import { PrismaClient } from '@prisma/client';

const maintenanceUrl = process.env.MAINTENANCE_DATABASE_URL;
if (!maintenanceUrl) throw new Error('MAINTENANCE_DATABASE_URL is required.');

function positiveInteger(value: string | undefined, fallback: number, name: string, maximum: number): number {
    if (value === undefined) return fallback;
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
        throw new Error(`${name} must be an integer between 1 and ${maximum}.`);
    }
    return parsed;
}

const staleAfterSeconds = positiveInteger(process.env.AUDIT_INTENT_STALE_AFTER_SECONDS, 120, 'AUDIT_INTENT_STALE_AFTER_SECONDS', 86400);
const batchSize = positiveInteger(process.env.AUDIT_INTENT_RECOVERY_BATCH_SIZE, 100, 'AUDIT_INTENT_RECOVERY_BATCH_SIZE', 1000);
const maintenance = new PrismaClient({ datasources: { db: { url: maintenanceUrl } } });

async function main(): Promise<void> {
    const staleBefore = new Date(Date.now() - staleAfterSeconds * 1000);
    const rows = await maintenance.$queryRaw<Array<{ recovered: number }>>`
        SELECT public.recover_stale_platform_audit_intents(${staleBefore}, ${batchSize}::INTEGER) AS recovered
    `;
    console.log(`Recovered ${rows[0]?.recovered || 0} stale platform audit intents.`);
}

main()
    .catch((error) => {
        console.error('Platform audit intent recovery failed.', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await maintenance.$disconnect();
    });
