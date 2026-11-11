import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const runtimeDatabaseUrl = process.env.APP_DATABASE_URL;

describe('S3-5: Audit Role-Permission Security & Metadata Immutability', () => {
    if (!databaseUrl || !runtimeDatabaseUrl) {
        it.skip('skips audit role permissions test when database credentials are not provided', () => {});
        return;
    }

    const adminPrisma = new PrismaClient({ datasourceUrl: databaseUrl });
    const runtimePrisma = new PrismaClient({ datasourceUrl: runtimeDatabaseUrl });

    it('proves orbitox_audit_resolver can UPDATE only status, failureReason, and metadata; rejects action/actor/entity columns', async () => {
        const testId = `audit-test-${randomUUID()}`;
        const orgId = `org-${randomUUID()}`;
        const projId = `proj-${randomUUID()}`;

        // Create initial PENDING audit event
        await adminPrisma.$executeRawUnsafe(`
            INSERT INTO public."PlatformAuditEvent" (
                "id", "action", "actorId", "entityType", "entityId", "organizationId", "projectId", "status", "metadata"
            ) VALUES (
                '${testId}', 'project.usage.test', 'admin-actor', 'PLATFORM_PROJECT_USAGE', '${projId}', '${orgId}', '${projId}', 'PENDING', '{"initial": true}'::jsonb
            );
        `);

        try {
            // 1. Authorized column updates succeed under orbitox_audit_resolver
            await adminPrisma.$transaction(async (tx) => {
                await tx.$executeRawUnsafe(`SET LOCAL ROLE orbitox_audit_resolver;`);
                await tx.$executeRawUnsafe(`
                    UPDATE public."PlatformAuditEvent"
                    SET "status" = 'COMMITTED',
                        "failureReason" = 'None',
                        "metadata" = '{"initial": true, "resolved": true}'::jsonb
                    WHERE "id" = '${testId}';
                `);
            });

            // 2. Unauthorized column updates MUST throw permission denied errors
            const forbiddenColumns = [
                'action',
                'actorId',
                'actorEmail',
                'entityType',
                'entityId',
                'organizationId',
                'projectId',
                'environmentId',
                'ipAddress',
                'requestId',
                'reason',
                'occurredAt',
                'id',
            ];

            for (const col of forbiddenColumns) {
                await assert.rejects(
                    async () => {
                        await adminPrisma.$transaction(async (tx) => {
                            await tx.$executeRawUnsafe(`SET LOCAL ROLE orbitox_audit_resolver;`);
                            const val = col === 'occurredAt' ? 'NOW()' : "'tampered-value'";
                            await tx.$executeRawUnsafe(`
                                UPDATE public."PlatformAuditEvent"
                                SET "${col}" = ${val}
                                WHERE "id" = '${testId}';
                            `);
                        });
                    },
                    (err: any) => {
                        return (
                            err.message.includes('permission denied') ||
                            err.message.includes('must be owner') ||
                            err.code === '42501'
                        );
                    },
                    `orbitox_audit_resolver must NOT be allowed to update column "${col}"`
                );
            }
        } finally {
            await adminPrisma.$executeRawUnsafe(`DELETE FROM public."PlatformAuditEvent" WHERE "id" = '${testId}';`);
        }
    });

    it('proves resolve_platform_audit_intent cannot act on COMMITTED or FAILED rows', async () => {
        const orgId = `org-${randomUUID()}`;
        const projId = `proj-${randomUUID()}`;
        const committedId = `audit-committed-${randomUUID()}`;
        const failedId = `audit-failed-${randomUUID()}`;

        await adminPrisma.$executeRawUnsafe(`
            INSERT INTO public."PlatformAuditEvent" (
                "id", "action", "actorId", "entityType", "entityId", "organizationId", "projectId", "status", "metadata"
            ) VALUES
            ('${committedId}', 'project.usage.test', 'admin', 'PLATFORM_PROJECT_USAGE', '${projId}', '${orgId}', '${projId}', 'COMMITTED', '{"val": 1}'::jsonb),
            ('${failedId}', 'project.usage.test', 'admin', 'PLATFORM_PROJECT_USAGE', '${projId}', '${orgId}', '${projId}', 'FAILED', '{"val": 2}'::jsonb);
        `);

        try {
            // Set active tenant scope
            await runtimePrisma.$executeRawUnsafe(
                `SELECT set_config('app.current_tenant_id', 'org/${orgId}/project/${projId}/environment/production', false);`
            );

            // Attempt to resolve already COMMITTED row
            const res1 = await runtimePrisma.$queryRaw<Array<{ resolve_platform_audit_intent: boolean }>>`
                SELECT public.resolve_platform_audit_intent(${committedId}, 'FAILED', 'Attempt to tamper committed row', 999) AS resolve_platform_audit_intent;
            `;
            assert.equal(res1[0]?.resolve_platform_audit_intent, false, 'Must return false when targeting COMMITTED row');

            // Verify row was NOT modified
            const check1 = await adminPrisma.$queryRaw<Array<{ status: string }>>`
                SELECT "status" FROM public."PlatformAuditEvent" WHERE "id" = ${committedId};
            `;
            assert.equal(check1[0]?.status, 'COMMITTED');

            // Attempt to resolve already FAILED row
            const res2 = await runtimePrisma.$queryRaw<Array<{ resolve_platform_audit_intent: boolean }>>`
                SELECT public.resolve_platform_audit_intent(${failedId}, 'COMMITTED', NULL, 888) AS resolve_platform_audit_intent;
            `;
            assert.equal(res2[0]?.resolve_platform_audit_intent, false, 'Must return false when targeting FAILED row');

            const check2 = await adminPrisma.$queryRaw<Array<{ status: string }>>`
                SELECT "status" FROM public."PlatformAuditEvent" WHERE "id" = ${failedId};
            `;
            assert.equal(check2[0]?.status, 'FAILED');
        } finally {
            await adminPrisma.$executeRawUnsafe(`DELETE FROM public."PlatformAuditEvent" WHERE "id" IN ('${committedId}', '${failedId}');`);
        }
    });

    it('proves resolve_platform_audit_intent cannot overwrite an existing previousValue in metadata', async () => {
        const orgId = `org-${randomUUID()}`;
        const projId = `proj-${randomUUID()}`;
        const preservedId = `audit-preserved-${randomUUID()}`;
        const newId = `audit-new-${randomUUID()}`;

        // Row 1: has existing previousValue: 42
        // Row 2: lacks previousValue
        await adminPrisma.$executeRawUnsafe(`
            INSERT INTO public."PlatformAuditEvent" (
                "id", "action", "actorId", "entityType", "entityId", "organizationId", "projectId", "status", "metadata"
            ) VALUES
            ('${preservedId}', 'project.usage.reset', 'admin', 'PLATFORM_PROJECT_USAGE', '${projId}', '${orgId}', '${projId}', 'PENDING', '{"previousValue": 42, "newValue": 0}'::jsonb),
            ('${newId}', 'project.usage.reset', 'admin', 'PLATFORM_PROJECT_USAGE', '${projId}', '${orgId}', '${projId}', 'PENDING', '{"newValue": 0}'::jsonb);
        `);

        try {
            await runtimePrisma.$executeRawUnsafe(
                `SELECT set_config('app.current_tenant_id', 'org/${orgId}/project/${projId}/environment/production', false);`
            );

            // 1. Resolve row 1 with conflicting previous_value = 999. It MUST keep 42.
            const res1 = await runtimePrisma.$queryRaw<Array<{ resolve_platform_audit_intent: boolean }>>`
                SELECT public.resolve_platform_audit_intent(${preservedId}, 'COMMITTED', NULL, 999) AS resolve_platform_audit_intent;
            `;
            assert.equal(res1[0]?.resolve_platform_audit_intent, true);

            const row1 = await adminPrisma.$queryRaw<Array<{ metadata: any }>>`
                SELECT "metadata" FROM public."PlatformAuditEvent" WHERE "id" = ${preservedId};
            `;
            assert.equal(row1[0]?.metadata?.previousValue, 42, 'Existing previousValue: 42 must NOT be overwritten by 999');

            // 2. Resolve row 2 which lacked previousValue. It MUST record 250.
            const res2 = await runtimePrisma.$queryRaw<Array<{ resolve_platform_audit_intent: boolean }>>`
                SELECT public.resolve_platform_audit_intent(${newId}, 'COMMITTED', NULL, 250) AS resolve_platform_audit_intent;
            `;
            assert.equal(res2[0]?.resolve_platform_audit_intent, true);

            const row2 = await adminPrisma.$queryRaw<Array<{ metadata: any }>>`
                SELECT "metadata" FROM public."PlatformAuditEvent" WHERE "id" = ${newId};
            `;
            assert.equal(row2[0]?.metadata?.previousValue, 250, 'Missing previousValue must be populated with 250');
        } finally {
            await adminPrisma.$executeRawUnsafe(`DELETE FROM public."PlatformAuditEvent" WHERE "id" IN ('${preservedId}', '${newId}');`);
            await adminPrisma.$disconnect();
            await runtimePrisma.$disconnect();
        }
    });
});
