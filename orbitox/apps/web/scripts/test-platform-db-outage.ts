import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
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

async function main(): Promise<void> {
    const healthResponse = await createHealthHandler(() => assertPlatformDatabaseReady(prisma))();
    assert.equal(healthResponse.status, 503, 'health must fail closed while PostgreSQL is stopped');
    console.log('PASS health returns 503 while PostgreSQL is unavailable');

    process.env.ORBITOX_PLATFORM_REPOSITORY = 'prisma';
    process.env.ORBITOX_SERVER_PEPPER = 'test_outage_server_pepper_32_chars';
    const { withApiGuard } = await import('../app/api/v1/_lib/api-guard');
    let protectedHandlerInvoked = false;
    const protectedRoute = withApiGuard(
        { serviceId: 'crm', serviceName: 'CRM Service' },
        async () => {
            protectedHandlerInvoked = true;
            return NextResponse.json({ success: true });
        },
    );
    const protectedResponse = await protectedRoute(new NextRequest('http://localhost/api/v1/crm/leads', {
        headers: { 'x-api-key': 'orb_live_outage_test_key_that_is_not_validated' },
    }));
    assert.equal(protectedResponse.status, 503, 'protected route must return 503 when credential lookup is unavailable');
    assert.equal((await protectedResponse.json()).error?.code, 'AUTHENTICATION_UNAVAILABLE');
    assert.equal(protectedHandlerInvoked, false, 'protected route handler must not run during a database outage');
    console.log('PASS protected API returns 503 and does not invoke its handler while PostgreSQL is unavailable');
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
        clearTimeout(timeout);
    });
