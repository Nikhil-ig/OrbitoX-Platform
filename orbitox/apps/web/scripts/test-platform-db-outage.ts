import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { createHealthHandler } from '../lib/health-route-handler';
import { assertPlatformDatabaseReady } from '../lib/platform-database-readiness';
import { createPrismaPlatformRepository } from '../lib/platform-repository';

const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const runtimeUrl = process.env.APP_DATABASE_URL;
const auditUrl = process.env.PLATFORM_AUDIT_DATABASE_URL;
if (!databaseUrl || !runtimeUrl || !auditUrl) {
    throw new Error('TEST_DATABASE_URL (or DATABASE_URL), APP_DATABASE_URL, and PLATFORM_AUDIT_DATABASE_URL are required.');
}

function boundedUrl(connectionString: string): string {
    const url = new URL(connectionString);
    url.searchParams.set('connect_timeout', '2');
    url.searchParams.set('pool_timeout', '3');
    url.searchParams.set('socket_timeout', '5');
    return url.toString();
}

const owner = new PrismaClient({ datasources: { db: { url: boundedUrl(databaseUrl) } } });
const runtime = new PrismaClient({ datasources: { db: { url: boundedUrl(runtimeUrl) } } });
const audit = new PrismaClient({ datasources: { db: { url: boundedUrl(auditUrl) } } });
const repository = createPrismaPlatformRepository(runtime, audit);
const suffix = randomUUID();
const previousMode = process.env.ORBITOX_PLATFORM_REPOSITORY;
const previousPepper = process.env.ORBITOX_SERVER_PEPPER;
const previousAdminToken = process.env.ORBITOX_ADMIN_TOKEN;
const previousCrmPlugin = process.env.ORBITOX_ENABLE_CRM_PLUGIN;
let organizationId: string | undefined;
let databaseStopped = false;
const timeout = setTimeout(() => {
    console.error('FAIL database outage/recovery checks exceeded the 45-second deadline.');
    process.exit(1);
}, 45_000);

function stopDatabase(): void {
    if (process.env.POSTGRES_CONTAINER) {
        execFileSync('docker', ['stop', process.env.POSTGRES_CONTAINER], { stdio: 'pipe' });
        return;
    }
    if (process.env.PGDATA) {
        const pgCtl = process.env.PG_CTL_PATH || 'pg_ctl';
        execFileSync(pgCtl, ['-D', process.env.PGDATA, '-m', 'fast', '-w', 'stop'], { stdio: 'pipe' });
        return;
    }
    throw new Error('POSTGRES_CONTAINER or PGDATA is required to stop PostgreSQL for the outage test.');
}

function startDatabase(): void {
    if (process.env.POSTGRES_CONTAINER) {
        execFileSync('docker', ['start', process.env.POSTGRES_CONTAINER], { stdio: 'pipe' });
        return;
    }
    if (process.env.PGDATA) {
        const pgCtl = process.env.PG_CTL_PATH || 'pg_ctl';
        const pgPort = process.env.PGPORT || '55433';
        const logFile = process.env.PG_LOG_FILE || `${process.env.PGDATA}/server.log`;
        execFileSync(pgCtl, ['-D', process.env.PGDATA, '-l', logFile, '-o', `-h 127.0.0.1 -p ${pgPort}`, '-w', 'start'], { stdio: 'pipe' });
        return;
    }
    throw new Error('POSTGRES_CONTAINER or PGDATA is required to restart PostgreSQL after the outage test.');
}

async function waitForDatabase(): Promise<void> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 20; attempt += 1) {
        try {
            await assertPlatformDatabaseReady(runtime);
            return;
        } catch (error) {
            lastError = error;
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
    }
    throw lastError || new Error('PostgreSQL did not recover within 10 seconds.');
}

async function main(): Promise<void> {
    process.env.ORBITOX_PLATFORM_REPOSITORY = 'prisma';
    process.env.ORBITOX_SERVER_PEPPER = `outage-pepper-${suffix}-32-characters`;
    process.env.ORBITOX_ADMIN_TOKEN = `outage-admin-${suffix}-32-characters`;
    process.env.ORBITOX_ENABLE_CRM_PLUGIN = 'true';
    const organization = await repository.createOrganization({
        slug: `outage-${suffix}`,
        name: `Outage test ${suffix}`,
        billingEmail: `outage-${suffix}@example.test`,
    });
    organizationId = organization.id;
    const created = await repository.createProject({
        name: `Outage test ${suffix}`,
        slug: `outage-${suffix}`,
        organizationId: organization.id,
        businessModel: 'B2B_SAAS',
        planTier: 'starter',
        plan: 'starter',
        technicalLead: 'Outage test',
        contactEmail: `outage-${suffix}@example.test`,
        enabledServices: ['crm'],
        apiCallQuota: 10,
    });
    const environment = created.environments.find((item) => item.slug === 'production');
    assert.ok(environment, 'outage fixture must have a production environment');
    const apiKey = await repository.createApiKey({
        name: `Outage key ${suffix}`,
        environmentId: environment.id,
        projectId: created.project.id,
        capabilities: ['crm:read'],
        tenantScope: [created.project.slug],
        createdBy: 'outage-test',
    });

    const { withApiGuard } = await import('../app/api/v1/_lib/api-guard');
    let protectedHandlerInvoked = false;
    const protectedRoute = withApiGuard(
        { serviceId: 'crm', serviceName: 'CRM Service' },
        async () => {
            protectedHandlerInvoked = true;
            return NextResponse.json({ success: true });
        },
    );
    const request = () => new NextRequest('http://localhost/api/v1/crm/leads', {
        headers: { 'x-api-key': apiKey.rawSecret },
    });

    await assertPlatformDatabaseReady(runtime);
    stopDatabase();
    databaseStopped = true;

    const healthResponse = await createHealthHandler(() => assertPlatformDatabaseReady(runtime))();
    assert.equal(healthResponse.status, 503, 'health must fail closed while PostgreSQL is stopped');
    console.log('PASS health returns 503 while PostgreSQL is unavailable');

    const protectedResponse = await protectedRoute(request());
    assert.equal(protectedResponse.status, 503, 'protected route must return 503 when credential lookup is unavailable');
    assert.equal((await protectedResponse.json()).error?.code, 'AUTHENTICATION_UNAVAILABLE');
    assert.equal(protectedHandlerInvoked, false, 'protected route handler must not run during a database outage');
    console.log('PASS protected API returns 503 and does not invoke its handler while PostgreSQL is unavailable');

    startDatabase();
    databaseStopped = false;
    await waitForDatabase();
    const recoveredResponse = await protectedRoute(request());
    assert.equal(recoveredResponse.status, 200, 'the same protected route must recover on the next request without process restart');
    assert.equal(protectedHandlerInvoked, true);
    console.log('PASS the next authenticated request succeeds after PostgreSQL recovers without restarting the web process');
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (databaseStopped) {
            try {
                startDatabase();
                await waitForDatabase();
            } catch (error) {
                console.error('Failed to restore PostgreSQL after outage test.', error);
            }
        }
        if (organizationId) await owner.platformOrganization.delete({ where: { id: organizationId } }).catch(() => undefined);
        await Promise.all([owner.$disconnect(), runtime.$disconnect(), audit.$disconnect()]);
        if (previousMode === undefined) delete process.env.ORBITOX_PLATFORM_REPOSITORY;
        else process.env.ORBITOX_PLATFORM_REPOSITORY = previousMode;
        if (previousPepper === undefined) delete process.env.ORBITOX_SERVER_PEPPER;
        else process.env.ORBITOX_SERVER_PEPPER = previousPepper;
        if (previousAdminToken === undefined) delete process.env.ORBITOX_ADMIN_TOKEN;
        else process.env.ORBITOX_ADMIN_TOKEN = previousAdminToken;
        if (previousCrmPlugin === undefined) delete process.env.ORBITOX_ENABLE_CRM_PLUGIN;
        else process.env.ORBITOX_ENABLE_CRM_PLUGIN = previousCrmPlugin;
        clearTimeout(timeout);
    });
