import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { createPrismaPlatformRepository } from '../lib/platform-repository';

const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const runtimeUrl = process.env.APP_DATABASE_URL;
const auditUrl = process.env.PLATFORM_AUDIT_DATABASE_URL;
if (!databaseUrl || !runtimeUrl || !auditUrl) {
    throw new Error('TEST_DATABASE_URL (or DATABASE_URL), APP_DATABASE_URL, and PLATFORM_AUDIT_DATABASE_URL are required.');
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
const repository = createPrismaPlatformRepository(runtime, audit);
const suffix = randomUUID();
const organizationSlug = `step2-${suffix}`;
const runtimeAuditId = `step2-runtime-audit-${suffix}`;
const passed: string[] = [];
let organizationId: string | undefined;
let projectId: string | undefined;
let platformAuditId: string | undefined;
const previousRepositoryMode = process.env.ORBITOX_PLATFORM_REPOSITORY;

function pass(name: string): void {
    passed.push(name);
    console.log(`PASS ${name}`);
}

async function main(): Promise<void> {
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
        if (platformAuditId) {
            await owner.$executeRaw`DELETE FROM "PlatformAuditEvent" WHERE "id" = ${platformAuditId}`.catch(() => undefined);
        }
        if (projectId) await owner.platformProject.delete({ where: { id: projectId } }).catch(() => undefined);
        if (organizationId) await owner.platformOrganization.delete({ where: { id: organizationId } }).catch(() => undefined);
        await Promise.all([owner.$disconnect(), runtime.$disconnect(), audit.$disconnect()]);
    });