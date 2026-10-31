import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { createPrismaPlatformRepository } from '../lib/platform-repository';

const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const runtimeUrl = process.env.APP_DATABASE_URL;
const auditUrl = process.env.PLATFORM_AUDIT_DATABASE_URL;
const maintenanceUrl = process.env.MAINTENANCE_DATABASE_URL;
if (!databaseUrl || !runtimeUrl || !auditUrl || !maintenanceUrl) {
    throw new Error('TEST_DATABASE_URL (or DATABASE_URL), APP_DATABASE_URL, PLATFORM_AUDIT_DATABASE_URL, and MAINTENANCE_DATABASE_URL are required.');
}

function boundedUrl(connectionString: string): string {
    const url = new URL(connectionString);
    url.searchParams.set('connect_timeout', '3');
    url.searchParams.set('pool_timeout', '5');
    url.searchParams.set('socket_timeout', '10');
    return url.toString();
}

const owner = new PrismaClient({ datasources: { db: { url: boundedUrl(databaseUrl) } } });
const runtime = new PrismaClient({ datasources: { db: { url: boundedUrl(runtimeUrl) } } });
const audit = new PrismaClient({ datasources: { db: { url: boundedUrl(auditUrl) } } });
const maintenance = new PrismaClient({ datasources: { db: { url: boundedUrl(maintenanceUrl) } } });
const repository = createPrismaPlatformRepository(runtime, audit);
const suffix = randomUUID();
const organizationSlug = `step2-${suffix}`;
const runtimeAuditId = `step2-runtime-audit-${suffix}`;
const passed: string[] = [];
let organizationId: string | undefined;
let projectId: string | undefined;
let platformAuditId: string | undefined;
const auditIntentIds: string[] = [];
const previousRepositoryMode = process.env.ORBITOX_PLATFORM_REPOSITORY;
const previousAdminToken = process.env.ORBITOX_ADMIN_TOKEN;
const previousServerPepper = process.env.ORBITOX_SERVER_PEPPER;
const previousCrmPlugin = process.env.ORBITOX_ENABLE_CRM_PLUGIN;

function pass(name: string): void {
    passed.push(name);
    console.log(`PASS ${name}`);
}

async function main(): Promise<void> {
    process.env.ORBITOX_SERVER_PEPPER = `step2-server-pepper-${suffix}`;
    process.env.ORBITOX_ENABLE_CRM_PLUGIN = 'true';
    const organization = await repository.createOrganization({
        slug: organizationSlug,
        name: `Step 2 ${suffix}`,
        billingEmail: `step2-${suffix}@example.test`,
    });
    organizationId = organization.id;
    const created = await repository.createProject({
        name: `Step 2 ${suffix}`,
        slug: `step2-${suffix}`,
        organizationId: organization.id,
        businessModel: 'B2B_SAAS',
        planTier: 'starter',
        plan: 'starter',
        technicalLead: 'Step 2 test',
        contactEmail: `step2-${suffix}@example.test`,
        enabledServices: ['crm'],
        apiCallQuota: 2,
    });
    projectId = created.project.id;
    const environment = created.environments.find((item) => item.slug === 'production');
    assert.ok(environment, 'project creation must provision production environment');

    const apiKey = await repository.createApiKey({
        name: `Step 2 key ${suffix}`,
        environmentId: environment.id,
        projectId: created.project.id,
        capabilities: ['crm:read'],
        tenantScope: [created.project.slug],
        createdBy: 'step2-test',
    });
    assert.equal(apiKey.keyRecord.projectId, created.project.id);
    const listedKey = (await repository.listApiKeys({ projectId: created.project.id }))
        .find((key) => key.id === apiKey.keyRecord.id);
    assert.equal(listedKey?.projectId, created.project.id);
    assert.equal((await repository.getApiKey(apiKey.keyRecord.id))?.projectId, created.project.id);
    assert.equal((await repository.findKeyByRawSecret(apiKey.rawSecret))?.projectId, created.project.id);
    const authorized = await repository.authorizeApiKey(apiKey.rawSecret);
    assert.equal(authorized.key?.id, apiKey.keyRecord.id);
    assert.equal(authorized.key?.projectId, created.project.id);
    assert.equal(authorized.project?.id, created.project.id);
    assert.equal(authorized.environment?.id, environment.id);
    assert.equal(authorized.queryCount, 1);
    assert.equal(authorized.source, 'prisma');
    assert.equal(await repository.getProject(undefined as unknown as string), undefined);
    const unknown = await repository.authorizeApiKey(`invalid-${suffix}`);
    assert.equal(unknown.key, null);
    assert.equal(unknown.queryCount, 1);
    pass('one verifier query returns key, project, and environment; invalid keys fail closed');

    process.env.ORBITOX_PLATFORM_REPOSITORY = 'prisma';
    process.env.ORBITOX_ADMIN_TOKEN = `step2-admin-${suffix}`;
    const { withApiGuard, PlatformApiState } = await import('../app/api/v1/_lib/api-guard');
    const handler = withApiGuard(
        { serviceId: 'crm', serviceName: 'CRM Service' },
        async (_request, context) => NextResponse.json({ success: true, tenantId: context.tenantId }),
    );
    const response = await handler(new NextRequest('http://localhost/api/v1/crm/leads', {
        headers: { 'x-api-key': apiKey.rawSecret },
    }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-orbitox-project-id'), created.project.id);
    assert.ok(
        PlatformApiState.getTelemetry().some((event) => event.message === 'Authorization lookup query count: 1'),
    );
    assert.ok(
        PlatformApiState.getTelemetry().some((event) => event.message.includes('API guard database operations: 4 total, 3 writes')),
    );
    pass('real API guard reports four guard-owned operations: one lookup and three writes');

    const [{ GET: listKeys }, { GET: getKey }] = await Promise.all([
        import('../app/api/v1/platform/api-keys/route'),
        import('../app/api/v1/platform/api-keys/[id]/route'),
    ]);
    const adminHeaders = { authorization: `Bearer ${process.env.ORBITOX_ADMIN_TOKEN}` };
    const listResponse = await listKeys(new NextRequest(
        `http://localhost/api/v1/platform/api-keys?projectId=${created.project.id}`,
        { headers: adminHeaders },
    ));
    assert.equal(listResponse.status, 200);
    const listedRouteKey = (await listResponse.json() as any).data.find((item: any) => item.id === apiKey.keyRecord.id);
    assert.equal(listedRouteKey.projectId, created.project.id);
    const detailResponse = await getKey(
        new NextRequest(`http://localhost/api/v1/platform/api-keys/${apiKey.keyRecord.id}`, { headers: adminHeaders }),
    );
    assert.equal(detailResponse.status, 200);
    assert.equal((await detailResponse.json() as any).data.projectId, created.project.id);
    pass('platform key list and detail routes return 200 with the owning project id');

    const testDomain = `step2-${suffix}.example.test`;
    await repository.registerDomain({ environmentId: environment.id, domainName: testDomain });
    assert.equal((await repository.findVerifiedDomain(testDomain))?.environmentId, environment.id);
    assert.equal(await repository.findVerifiedDomain(`other-${testDomain}`), undefined);
    const publicHandler = withApiGuard(
        { serviceId: 'docs', serviceName: 'Public Documentation', routeClass: 'public', allowPublic: true },
        async (_request, context) => NextResponse.json({ tenantId: context.tenantId }),
    );
    const publicResponse = await publicHandler(new NextRequest(`https://${testDomain}/api/v1/openapi.json`));
    assert.equal(publicResponse.status, 200);
    assert.equal((await publicResponse.json()).tenantId, created.project.id);
    assert.ok(PlatformApiState.getTelemetry().some((event) =>
        event.message.includes('API guard database operations: 2 total, 0 writes')
    ));
    await runtime.projectDomain.update({ where: { domainName: testDomain }, data: { verificationStatus: 'PENDING_DNS' } });
    assert.equal(await repository.findVerifiedDomain(testDomain), undefined);
    pass('verified domain lookup matches only the requested host');

    await repository.setProjectUsage(created.project.id, 0);
    const firstReservation = await repository.reserveProjectUsage(created.project.id, 2);
    const secondReservation = await repository.reserveProjectUsage(created.project.id, 2);
    const exhaustedReservation = await repository.reserveProjectUsage(created.project.id, 2);
    assert.equal(firstReservation, 1);
    assert.equal(secondReservation, 2);
    assert.equal(exhaustedReservation, undefined);
    assert.equal(await repository.releaseProjectUsage(created.project.id), 1);
    pass('project quota reservations are atomic and release usage');

    const rotated = await repository.rotateApiKey(apiKey.keyRecord.id, { operatorEmail: 'step2-test' });
    assert.equal(rotated?.replacementKey.projectId, created.project.id);
    const listedReplacement = (await repository.listApiKeys({ projectId: created.project.id }))
        .find((key) => key.id === rotated?.replacementKey.id);
    assert.equal(listedReplacement?.projectId, created.project.id);
    pass('key list, get, secret lookup, authorization, and rotation preserve project identity');

    const revoked = await repository.setKeyStatus(apiKey.keyRecord.id, 'REVOKED', 'Step 2 test revoke');
    assert.equal(revoked?.status, 'REVOKED');
    assert.equal((await repository.authorizeApiKey(apiKey.rawSecret)).key?.status, 'REVOKED');
    pass('key revocation is persisted and immediately visible to authorization lookup');

    const committedIntentId = await repository.createPlatformAdminAuditIntent({
        action: 'project.usage.set',
        entityType: 'PLATFORM_PROJECT_USAGE',
        entityId: created.project.id,
        organizationId: organization.id,
        projectId: created.project.id,
        actorId: 'step2-test',
        metadata: { previousValue: 1, newValue: 5 },
    });
    auditIntentIds.push(committedIntentId);
    const usageAfterIntent = await repository.setProjectUsageWithAuditIntent(
        created.project.id,
        organization.id,
        5,
        committedIntentId,
    );
    assert.equal(usageAfterIntent?.monthlyApiCalls, 5);
    assert.equal((await owner.platformAuditEvent.findUnique({ where: { id: committedIntentId } }))?.status, 'COMMITTED');
    await assert.rejects(() => runtime.$executeRaw`
        UPDATE "PlatformAuditEvent" SET "status" = 'FAILED' WHERE "id" = ${committedIntentId}
    `);
    pass('usage mutation and COMMITTED audit status are atomic');

    const failedIntentId = await repository.createPlatformAdminAuditIntent({
        action: 'project.usage.reset',
        entityType: 'PLATFORM_PROJECT_USAGE',
        entityId: created.project.id,
        organizationId: organization.id,
        projectId: created.project.id,
        actorId: 'step2-test',
        metadata: { previousValue: 5, newValue: 0 },
    });
    auditIntentIds.push(failedIntentId);
    await assert.rejects(() => repository.setProjectUsageWithAuditIntent(
        `${created.project.id}-missing`,
        organization.id,
        0,
        failedIntentId,
    ));
    assert.equal((await owner.platformAuditEvent.findUnique({ where: { id: failedIntentId } }))?.status, 'PENDING');
    await repository.resolvePlatformAdminAuditIntentFailure(
        failedIntentId,
        organization.id,
        created.project.id,
        'Injected usage transaction failure.',
    );
    const failedIntent = await owner.platformAuditEvent.findUnique({ where: { id: failedIntentId } });
    assert.equal(failedIntent?.status, 'FAILED');
    assert.equal(failedIntent?.failureReason, 'Injected usage transaction failure.');
    assert.equal((await owner.platformProject.findUnique({ where: { id: created.project.id } }))?.monthlyApiCalls, 5n);
    pass('failed usage transaction rolls back and marks its intent FAILED');

    const crashedIntentId = await repository.createPlatformAdminAuditIntent({
        action: 'project.usage.reset',
        entityType: 'PLATFORM_PROJECT_USAGE',
        entityId: created.project.id,
        organizationId: organization.id,
        projectId: created.project.id,
        actorId: 'step2-test',
        metadata: { previousValue: 5, newValue: 0 },
    });
    auditIntentIds.push(crashedIntentId);
    await owner.platformAuditEvent.update({
        where: { id: crashedIntentId },
        data: { occurredAt: new Date(Date.now() - 60_000) },
    });
    const recovery = await maintenance.$queryRaw<Array<{ recovered: number }>>`
        SELECT public.recover_stale_platform_audit_intents(NOW(), 100) AS recovered
    `;
    assert.equal(recovery[0]?.recovered, 1);
    const recoveredIntent = await owner.platformAuditEvent.findUnique({ where: { id: crashedIntentId } });
    assert.equal(recoveredIntent?.status, 'FAILED');
    assert.match(recoveredIntent?.failureReason || '', /Recovered as interrupted/);
    pass('maintenance recovers a stale PENDING intent left by a process crash');

    platformAuditId = await repository.recordPlatformAdminAudit({
        action: 'ORGANIZATION_CREATED',
        entityType: 'PLATFORM_ORGANIZATION',
        entityId: organization.id,
        organizationId: organization.id,
        actorId: 'step2-test',
        reason: 'Platform-level event has no environment scope',
        metadata: { test: true },
    });
    const storedAudit = await owner.$queryRaw<Array<{ environmentId: string | null }>>`
    SELECT "environmentId" FROM "PlatformAuditEvent" WHERE "id" = ${platformAuditId}
  `;
    assert.equal(storedAudit[0]?.environmentId, null);
    await assert.rejects(() => runtime.$executeRaw`
    INSERT INTO "PlatformAuditEvent" ("id", "action", "entityType", "occurredAt")
    VALUES (${runtimeAuditId}, 'runtime.test', 'Test', NOW())
  `);
    await assert.rejects(() => audit.$queryRaw`
    SELECT "id" FROM "PlatformAuditEvent" WHERE "id" = ${platformAuditId}
  `);
    pass('organization-level audit uses insert-only admin role; runtime cannot insert unscoped events');

    console.log(
        `Step 2 repository checks: ${passed.length} passed, 0 failed; runtime=orbitox_runtime; audit=orbitox_platform_admin_audit; authorization_queries=1`,
    );
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (previousRepositoryMode === undefined) delete process.env.ORBITOX_PLATFORM_REPOSITORY;
        else process.env.ORBITOX_PLATFORM_REPOSITORY = previousRepositoryMode;
        if (previousAdminToken === undefined) delete process.env.ORBITOX_ADMIN_TOKEN;
        else process.env.ORBITOX_ADMIN_TOKEN = previousAdminToken;
        if (previousServerPepper === undefined) delete process.env.ORBITOX_SERVER_PEPPER;
        else process.env.ORBITOX_SERVER_PEPPER = previousServerPepper;
        if (previousCrmPlugin === undefined) delete process.env.ORBITOX_ENABLE_CRM_PLUGIN;
        else process.env.ORBITOX_ENABLE_CRM_PLUGIN = previousCrmPlugin;
        if (platformAuditId) {
            await owner.$executeRaw`DELETE FROM "PlatformAuditEvent" WHERE "id" = ${platformAuditId}`.catch(() => undefined);
        }
        if (auditIntentIds.length > 0) {
            await owner.platformAuditEvent.deleteMany({ where: { id: { in: auditIntentIds } } }).catch(() => undefined);
        }
        if (projectId) await owner.platformProject.delete({ where: { id: projectId } }).catch(() => undefined);
        if (organizationId) await owner.platformOrganization.delete({ where: { id: organizationId } }).catch(() => undefined);
        await Promise.all([owner.$disconnect(), runtime.$disconnect(), audit.$disconnect(), maintenance.$disconnect()]);
    });