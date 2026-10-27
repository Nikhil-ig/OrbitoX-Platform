import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { createHealthHandler } from '../lib/health-route-handler';
import { assertPlatformDatabaseReady } from '../lib/platform-database-readiness';

const databaseUrl = process.env.APP_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('APP_DATABASE_URL or DATABASE_URL is required.');

const connectionUrl = new URL(databaseUrl);
connectionUrl.searchParams.set('connect_timeout', '2');
connectionUrl.searchParams.set('pool_timeout', '3');
connectionUrl.searchParams.set('socket_timeout', '5');

const prisma = new PrismaClient({ datasources: { db: { url: connectionUrl.toString() } } });
const timeout = setTimeout(() => {
    console.error('FAIL health check exceeded the 15-second outage deadline.');
    process.exit(1);
}, 15_000);

createHealthHandler(() => assertPlatformDatabaseReady(prisma))()
    .then((response) => {
        assert.equal(response.status, 503, 'health must fail closed while PostgreSQL is stopped');
        console.log('PASS health returns 503 while PostgreSQL is unavailable');
    })
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
        clearTimeout(timeout);
    });
