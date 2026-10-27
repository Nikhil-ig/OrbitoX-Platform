import * as crypto from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import {
    EnvironmentQuotaPolicyRecord,
    KeyLifecycleState,
    PackageInstallationRecord,
    PackageVersionRecord,
    PlatformApiKeyRecord,
    PlatformCredentialRecord,
    PlatformOrganization,
    PlatformPackageCatalogItem,
    PlatformProject,
    ProjectDomainRecord,
    ProjectEnvironment,
} from '@orbitox/types';
import {
    CreateKeyInput,
    CreateProjectInput,
    PLAN_DEFAULT_QUOTAS,
    PLAN_DEFAULT_RATE_LIMITS,
    CredentialVault,
    PlatformKeyEngine,
    PlatformRepository,
} from '@orbitox-io/plugin-engine';

type AsyncMethods<T> = {
    [Key in keyof T as T[Key] extends (...args: any[]) => any ? Key : never]: T[Key] extends (
        ...args: infer Args
    ) => infer Result
    ? (...args: Args) => Promise<Awaited<Result>>
    : never;
};

export interface PlatformAuthorizationLookup {
    key: PlatformApiKeyRecord | null;
    project: PlatformProject | null;
    environment: ProjectEnvironment | null;
    queryCount: number;
    source: 'prisma' | 'legacy';
}

export interface PlatformAdminAuditInput {
    action: string;
    entityType: string;
    entityId?: string;
    actorId?: string;
    actorEmail?: string;
    organizationId?: string;
    projectId?: string;
    environmentId?: string;
    ipAddress?: string;
    requestId?: string;
    reason?: string;
    metadata?: Prisma.InputJsonValue;
}

export interface PlatformAdminAuditIntentInput extends PlatformAdminAuditInput {
    organizationId: string;
    projectId: string;
}

export type AsyncPlatformRepository = AsyncMethods<typeof PlatformRepository> & {
    isPrismaBacked(): boolean;
    authorizeApiKey(rawSecret: string): Promise<PlatformAuthorizationLookup>;
    recordPlatformAdminAudit(event: PlatformAdminAuditInput): Promise<string>;
    createPlatformAdminAuditIntent(event: PlatformAdminAuditIntentInput): Promise<string>;
    setProjectUsageWithAuditIntent(
        projectId: string,
        organizationId: string,
        monthlyApiCalls: number,
        intentId: string,
    ): Promise<PlatformProject | undefined>;
    resolvePlatformAdminAuditIntentFailure(
        intentId: string,
        organizationId: string,
        projectId: string,
        reason: string,
    ): Promise<void>;
    findVerifiedDomain(domainName: string): Promise<ProjectDomainRecord | undefined>;
};

type DatabaseClient = PrismaClient;
type RawRow = Record<string, any>;

function dateString(value: Date | string | null | undefined): string | undefined {
    if (value === null || value === undefined) return undefined;
    return value instanceof Date ? value.toISOString() : value;
}

function safeNumber(value: number | bigint | null | undefined, fallback = 0): number {
    if (value === null || value === undefined) return fallback;
    const converted = typeof value === 'bigint' ? Number(value) : value;
    if (!Number.isSafeInteger(converted)) throw new Error('Database counter exceeds the safe integer range.');
    return converted;
}

function toOrganization(row: RawRow): PlatformOrganization {
    return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        billingEmail: row.billingEmail,
        complianceTier: row.complianceTier,
        status: row.status,
        createdAt: dateString(row.createdAt)!,
        updatedAt: dateString(row.updatedAt)!,
    };
}

function toProject(row: RawRow): PlatformProject {
    return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        organizationId: row.organizationId,
        businessModel: row.businessModel,
        planTier: row.planTier,
        plan: row.plan || row.planTier,
        status: row.status,
        enabledServices: row.enabledServices || [],
        apiCallQuota: row.apiCallQuota === null ? undefined : safeNumber(row.apiCallQuota),
        monthlyApiCalls: safeNumber(row.monthlyApiCalls),
        rateLimitPerMin: row.rateLimitPerMin ?? undefined,
        technicalLead: row.technicalLead,
        contactEmail: row.contactEmail,
        createdAt: dateString(row.createdAt)!,
        updatedAt: dateString(row.updatedAt)!,
    };
}

function toEnvironment(row: RawRow): ProjectEnvironment {
    return {
        id: row.id,
        projectId: row.projectId || row.environment?.projectId,
        slug: row.slug,
        name: row.name,
        type: row.type,
        isProduction: row.isProduction,
        status: row.status,
        description: row.description ?? undefined,
        requireMtls: row.requireMtls,
        strictIpAllowlist: row.strictIpAllowlist,
        enforceFourEyes: row.enforceFourEyes,
        createdAt: dateString(row.createdAt)!,
        updatedAt: dateString(row.updatedAt)!,
    };
}

function toKey(row: RawRow): PlatformApiKeyRecord {
    return {
        id: row.id,
        keyId: row.keyId,
        name: row.name,
        environmentId: row.environmentId,
        projectId: row.projectId || row.environment?.projectId,
        keyType: row.keyType,
        keyPrefix: row.keyPrefix,
        secretFingerprint: row.secretFingerprint,
        authVerifier: row.authVerifier,
        maskedDisplay: row.maskedDisplay,
        status: row.status,
        capabilities: row.capabilities || [],
        ipAllowlist: row.ipAllowlist || [],
        rateLimitPerMin: row.rateLimitPerMin,
        tenantScope: row.tenantScope || [],
        riskScore: row.riskScore,
        riskLevel: row.riskLevel,
        riskFactors: row.riskFactors || [],
        issuedAt: dateString(row.issuedAt)!,
        activatedAt: dateString(row.activatedAt)!,
        expiresAt: dateString(row.expiresAt),
        lastUsedAt: dateString(row.lastUsedAt),
        lastUsedIp: row.lastUsedIp ?? undefined,
        lastUsedRegion: row.lastUsedRegion ?? undefined,
        compromisedAt: dateString(row.compromisedAt),
        revokedAt: dateString(row.revokedAt),
        revokeReason: row.revokeReason ?? undefined,
        createdBy: row.createdBy,
        version: row.version,
    };
}

function toQuotaPolicy(row: RawRow): EnvironmentQuotaPolicyRecord {
    return {
        id: row.id,
        environmentId: row.environmentId,
        monthlyCallLimit: safeNumber(row.monthlyCallLimit),
        monthlyCallsUsed: safeNumber(row.monthlyCallsUsed),
        storageQuotaGb: row.storageQuotaGb,
        storageUsedGb: row.storageUsedGb,
        warningThreshold: row.warningThreshold,
        projectedExhaustionDays: row.projectedExhaustionDays ?? undefined,
        updatedAt: dateString(row.updatedAt)!,
    };
}

function toCredential(row: RawRow): PlatformCredentialRecord {
    return {
        id: row.id,
        name: row.name,
        provider: row.provider,
        environmentId: row.environmentId,
        projectId: row.projectId || row.environment?.projectId,
        envelope: {
            version: row.envelopeVersion,
            kekIdentifier: row.kekIdentifier,
            encryptedDek: row.encryptedDek,
            dekIv: row.dekIv,
            dekTag: row.dekTag,
            initializationVector: row.initializationVector,
            authenticationTag: row.authenticationTag,
            encryptedCiphertext: row.encryptedCiphertext,
            secretFingerprint: row.secretFingerprint,
        } as any,
        secretFingerprint: row.secretFingerprint,
        maskedDisplay: row.maskedDisplay,
        health: row.health,
        lastRotatedAt: dateString(row.lastRotatedAt)!,
        nextRotationDueAt: dateString(row.nextRotationDueAt)!,
        lastValidatedAt: dateString(row.lastValidatedAt),
        validationError: row.validationError ?? undefined,
        ownerEmail: row.ownerEmail,
        createdAt: dateString(row.createdAt)!,
        updatedAt: dateString(row.updatedAt)!,
    };
}

function toPackage(row: RawRow): PlatformPackageCatalogItem {
    return {
        id: row.id,
        packageId: row.packageId,
        name: row.name,
        category: row.category,
        publisher: row.publisher,
        currentStableVersion: row.currentStableVersion,
        signingPublicKeyPem: row.signingPublicKeyPem,
        isCore: row.isCore,
        createdAt: dateString(row.createdAt)!,
        updatedAt: dateString(row.updatedAt)!,
    };
}

function toPackageVersion(row: RawRow): PackageVersionRecord {
    return {
        id: row.id,
        packageId: row.packageId,
        version: row.version,
        tarballSha256: row.tarballSha256,
        manifestHash: row.manifestHash,
        signerId: row.signerId,
        signature: row.signature,
        minPlatformVersion: row.minPlatformVersion,
        releaseNotes: row.releaseNotes ?? undefined,
        releasedAt: dateString(row.releasedAt)!,
    };
}

function toInstallation(row: RawRow): PackageInstallationRecord {
    return {
        id: row.id,
        environmentId: row.environmentId,
        packageId: row.packageId,
        installedVersionId: row.installedVersionId,
        status: row.status,
        configOverrides: (row.configOverrides || {}) as Record<string, any>,
        installedAt: dateString(row.installedAt)!,
        updatedAt: dateString(row.updatedAt)!,
    };
}

function toDomain(row: RawRow): ProjectDomainRecord {
    return {
        id: row.id,
        environmentId: row.environmentId,
        domainName: row.domainName,
        isApex: row.isApex,
        verificationStatus: row.verificationStatus,
        cnameTarget: row.cnameTarget,
        tlsCertificateStatus: row.tlsCertificateStatus,
        sslExpiresAt: dateString(row.sslExpiresAt),
        strictLicenseToken: row.strictLicenseToken ?? undefined,
        edgeLatencyMs: row.edgeLatencyMs,
        createdAt: dateString(row.createdAt)!,
        verifiedAt: dateString(row.verifiedAt),
    };
}

function toDatabaseProjectData(input: Partial<PlatformProject> & Record<string, any>): Prisma.PlatformProjectUpdateInput {
    const data: Prisma.PlatformProjectUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.organizationId !== undefined) data.organization = { connect: { id: input.organizationId } };
    if (input.businessModel !== undefined) data.businessModel = input.businessModel;
    if (input.planTier !== undefined) data.planTier = input.planTier;
    if (input.plan !== undefined) {
        data.plan = input.plan;
        data.planTier = input.plan;
    }
    if (input.status !== undefined) data.status = String(input.status).toUpperCase() as Prisma.EnumPlatformProjectStatusFieldUpdateOperationsInput['set'];
    if (input.enabledServices !== undefined) data.enabledServices = input.enabledServices;
    if (input.apiCallQuota !== undefined) data.apiCallQuota = BigInt(input.apiCallQuota);
    if (input.rateLimitPerMin !== undefined) data.rateLimitPerMin = input.rateLimitPerMin;
    if (input.technicalLead !== undefined) data.technicalLead = input.technicalLead;
    if (input.contactEmail !== undefined) data.contactEmail = input.contactEmail;
    if (input.monthlyApiCalls !== undefined) data.monthlyApiCalls = BigInt(input.monthlyApiCalls);
    return data;
}

function buildKey(input: CreateKeyInput, environment: RawRow): { record: PlatformApiKeyRecord; rawSecret: string } {
    const environmentName = environment.isProduction
        ? 'production'
        : environment.slug === 'staging'
            ? 'staging'
            : 'development';
    const generated = PlatformKeyEngine.generateKey(environmentName);
    const issuedAt = new Date();
    const expiresAt = input.expiresInDays
        ? new Date(issuedAt.getTime() + input.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined;
    const risk = PlatformKeyEngine.calculateRiskScore({
        isProduction: environment.isProduction,
        capabilities: input.capabilities,
        expiresAt: expiresAt?.toISOString(),
        issuedAt: issuedAt.toISOString(),
        lastUsedAt: null,
        ipAllowlist: input.ipAllowlist,
    });
    return {
        rawSecret: generated.rawSecret,
        record: {
            id: `key_${crypto.randomUUID()}`,
            keyId: `key_${environmentName}_${crypto.randomUUID()}`,
            name: input.name,
            environmentId: input.environmentId,
            projectId: input.projectId,
            keyType: input.keyType || 'PROJECT_SCOPED',
            keyPrefix: generated.keyPrefix,
            secretFingerprint: generated.secretFingerprint,
            authVerifier: generated.authVerifier,
            maskedDisplay: generated.maskedDisplay,
            status: 'ACTIVE',
            capabilities: input.capabilities,
            ipAllowlist: input.ipAllowlist || [],
            rateLimitPerMin: input.rateLimitPerMin || 1200,
            tenantScope: input.tenantScope || [],
            riskScore: risk.score,
            riskLevel: risk.level,
            riskFactors: risk.factors,
            issuedAt: issuedAt.toISOString(),
            activatedAt: issuedAt.toISOString(),
            expiresAt: expiresAt?.toISOString(),
            createdBy: input.createdBy,
            version: 1,
        },
    };
}

function toKeyCreateData(key: PlatformApiKeyRecord): Prisma.PlatformApiKeyCreateInput {
    return {
        id: key.id,
        keyId: key.keyId,
        name: key.name,
        keyType: key.keyType,
        keyPrefix: key.keyPrefix,
        secretFingerprint: key.secretFingerprint,
        authVerifier: key.authVerifier,
        maskedDisplay: key.maskedDisplay,
        status: key.status,
        capabilities: key.capabilities,
        ipAllowlist: key.ipAllowlist,
        rateLimitPerMin: key.rateLimitPerMin,
        tenantScope: key.tenantScope || [],
        riskScore: key.riskScore,
        riskLevel: key.riskLevel,
        riskFactors: key.riskFactors as unknown as Prisma.InputJsonValue,
        issuedAt: new Date(key.issuedAt),
        activatedAt: new Date(key.activatedAt),
        expiresAt: key.expiresAt ? new Date(key.expiresAt) : undefined,
        createdBy: key.createdBy,
        version: key.version,
        environment: { connect: { id: key.environmentId } },
    };
}

function makeProjectData(input: CreateProjectInput, slug: string, projectId: string): Prisma.PlatformProjectCreateInput {
    const plan = (input.plan || input.planTier || 'starter').toLowerCase();
    const services = input.enabledServices || input.initialPackages || [];
    const quota = input.apiCallQuota || PLAN_DEFAULT_QUOTAS[plan] || 100000;
    const rateLimit = input.rateLimitPerMin || PLAN_DEFAULT_RATE_LIMITS[plan] || 60;
    const now = new Date();
    const makeEnvironment = (environment: {
        id: string;
        slug: string;
        name: string;
        type: 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT';
        isProduction: boolean;
    }): Prisma.ProjectEnvironmentCreateWithoutProjectInput => ({
        ...environment,
        status: 'ACTIVE',
        requireMtls: false,
        strictIpAllowlist: false,
        enforceFourEyes: environment.isProduction,
        createdAt: now,
        updatedAt: now,
        ...(environment.isProduction
            ? {
                quotaPolicy: {
                    create: {
                        id: `quota_${environment.id}`,
                        monthlyCallLimit: 10000000n,
                        monthlyCallsUsed: 0n,
                        storageQuotaGb: 500,
                        storageUsedGb: 0,
                        warningThreshold: 80,
                    },
                },
            }
            : {}),
    });

    return {
        id: projectId,
        slug,
        name: input.name,
        businessModel: input.businessModel,
        planTier: plan,
        plan,
        enabledServices: services,
        apiCallQuota: BigInt(quota),
        monthlyApiCalls: 0n,
        rateLimitPerMin: rateLimit,
        status: String(input.status || 'ACTIVE').toUpperCase() as Prisma.EnumPlatformProjectStatusFieldUpdateOperationsInput['set'],
        technicalLead: input.technicalLead,
        contactEmail: input.contactEmail,
        createdAt: now,
        updatedAt: now,
        organization: { connect: { id: input.organizationId } },
        environments: {
            create: [
                makeEnvironment({
                    id: `env_${projectId}_prod`,
                    slug: 'production',
                    name: 'Production Main',
                    type: 'PRODUCTION',
                    isProduction: true,
                }),
                makeEnvironment({
                    id: `env_${projectId}_stage`,
                    slug: 'staging',
                    name: 'Staging QA',
                    type: 'STAGING',
                    isProduction: false,
                }),
                makeEnvironment({
                    id: `env_${projectId}_dev`,
                    slug: 'development',
                    name: 'Development Sandbox',
                    type: 'DEVELOPMENT',
                    isProduction: false,
                }),
            ],
        },
    };
}

export function createPrismaPlatformRepository(client: PrismaClient, adminAuditClient: PrismaClient) {
    const mapProject = (row: RawRow | null): PlatformProject | undefined => (row ? toProject(row) : undefined);
    const mapKey = (row: RawRow | null): PlatformApiKeyRecord | undefined => (row ? toKey(row) : undefined);

    async function getEnvironment(id: string): Promise<RawRow | null> {
        return client.projectEnvironment.findUnique({ where: { id } });
    }

    return {
        async listOrganizations(): Promise<PlatformOrganization[]> {
            return (await client.platformOrganization.findMany({ orderBy: { createdAt: 'asc' } })).map(toOrganization);
        },
        async getOrganization(idOrSlug: string): Promise<PlatformOrganization | undefined> {
            const row = await client.platformOrganization.findFirst({ where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] } });
            return row ? toOrganization(row) : undefined;
        },
        async createOrganization(input: { slug: string; name: string; billingEmail: string; complianceTier?: any }): Promise<PlatformOrganization> {
            const now = new Date();
            const row = await client.platformOrganization.create({
                data: {
                    id: `org_${crypto.randomUUID()}`,
                    slug: input.slug,
                    name: input.name,
                    billingEmail: input.billingEmail,
                    complianceTier: input.complianceTier || 'STANDARD',
                    status: 'ACTIVE',
                    createdAt: now,
                    updatedAt: now,
                },
            });
            return toOrganization(row);
        },
        async updateOrganization(idOrSlug: string, updates: Partial<PlatformOrganization>): Promise<PlatformOrganization | undefined> {
            const existing = await client.platformOrganization.findFirst({ where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] } });
            if (!existing) return undefined;
            const row = await client.platformOrganization.update({ where: { id: existing.id }, data: updates });
            return toOrganization(row);
        },
        async listProjects(filter?: { organizationId?: string; status?: any }): Promise<PlatformProject[]> {
            const rows = await client.platformProject.findMany({
                where: {
                    ...(filter?.organizationId ? { organizationId: filter.organizationId } : {}),
                    ...(filter?.status ? { status: String(filter.status).toUpperCase() as any } : {}),
                },
                orderBy: { createdAt: 'asc' },
            });
            return rows.map(toProject);
        },
        async getProject(idOrSlug: string): Promise<PlatformProject | undefined> {
            if (typeof idOrSlug !== 'string' || idOrSlug.trim() === '') return undefined;
            const row = await client.platformProject.findFirst({ where: { OR: [{ id: idOrSlug }, { slug: idOrSlug.toLowerCase() }] } });
            return mapProject(row);
        },
        async createProject(input: CreateProjectInput): Promise<{ project: PlatformProject; environments: ProjectEnvironment[] }> {
            const suppliedSlug = input.slug?.trim() || '';
            const suppliedSlugIsValid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(suppliedSlug);
            const slugSource = suppliedSlugIsValid ? suppliedSlug : input.name;
            const baseSlug = slugSource.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            if (!baseSlug) throw new Error('Project name must produce a valid slug.');
            const slugExists = async (slug: string) => Boolean(await client.platformProject.findUnique({ where: { slug } }));
            if (suppliedSlugIsValid && (await slugExists(baseSlug))) throw new Error(`Project slug "${baseSlug}" is already in use.`);
            let slug = baseSlug;
            if (!suppliedSlugIsValid) {
                let suffix = 2;
                while (await slugExists(slug)) slug = `${baseSlug}-${suffix++}`;
            }
            const projectId = `proj_${crypto.randomUUID()}`;
            let row;
            try {
                row = await client.platformProject.create({
                    data: makeProjectData(input, slug, projectId),
                    include: { environments: { orderBy: { slug: 'asc' } } },
                });
            } catch (error) {
                if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                    throw new Error(`Project slug "${slug}" is already in use.`);
                }
                throw error;
            }
            return { project: toProject(row), environments: row.environments.map(toEnvironment) };
        },
        async updateProject(projectId: string, updates: Partial<PlatformProject>): Promise<PlatformProject | undefined> {
            const existing = await client.platformProject.findFirst({ where: { OR: [{ id: projectId }, { slug: projectId.toLowerCase() }] } });
            if (!existing) return undefined;
            if (updates.slug !== undefined && updates.slug !== existing.slug) throw new Error('Project slug is immutable after creation.');
            const row = await client.platformProject.update({ where: { id: existing.id }, data: toDatabaseProjectData(updates as any) });
            return toProject(row);
        },
        async deleteProject(projectId: string): Promise<boolean> {
            const result = await client.platformProject.deleteMany({ where: { OR: [{ id: projectId }, { slug: projectId }] } });
            return result.count > 0;
        },
        async incrementProjectUsage(projectId: string, amount = 1): Promise<number> {
            const rows = await client.$queryRaw<Array<{ monthlyApiCalls: bigint }>>`
        UPDATE "PlatformProject"
        SET "monthlyApiCalls" = "monthlyApiCalls" + ${BigInt(amount)}, "updatedAt" = NOW()
        WHERE "id" = ${projectId} OR "slug" = ${projectId}
        RETURNING "monthlyApiCalls"
      `;
            return safeNumber(rows[0]?.monthlyApiCalls);
        },
        async reserveProjectUsage(projectId: string, monthlyQuota = Number.POSITIVE_INFINITY): Promise<number | undefined> {
            const rows = Number.isFinite(monthlyQuota)
                ? await client.$queryRaw<Array<{ monthlyApiCalls: bigint }>>`
            UPDATE "PlatformProject"
            SET "monthlyApiCalls" = "monthlyApiCalls" + 1, "updatedAt" = NOW()
            WHERE ("id" = ${projectId} OR "slug" = ${projectId})
              AND "monthlyApiCalls" < ${BigInt(monthlyQuota)}
            RETURNING "monthlyApiCalls"
          `
                : await client.$queryRaw<Array<{ monthlyApiCalls: bigint }>>`
            UPDATE "PlatformProject"
            SET "monthlyApiCalls" = "monthlyApiCalls" + 1, "updatedAt" = NOW()
            WHERE "id" = ${projectId} OR "slug" = ${projectId}
            RETURNING "monthlyApiCalls"
          `;
            return rows.length ? safeNumber(rows[0]!.monthlyApiCalls) : undefined;
        },
        async releaseProjectUsage(projectId: string, amount = 1): Promise<number> {
            const rows = await client.$queryRaw<Array<{ monthlyApiCalls: bigint }>>`
        UPDATE "PlatformProject"
        SET "monthlyApiCalls" = GREATEST(0, "monthlyApiCalls" - ${BigInt(amount)}), "updatedAt" = NOW()
        WHERE "id" = ${projectId} OR "slug" = ${projectId}
        RETURNING "monthlyApiCalls"
      `;
            return safeNumber(rows[0]?.monthlyApiCalls);
        },
        async setProjectUsage(projectId: string, monthlyApiCalls: number): Promise<PlatformProject | undefined> {
            if (!Number.isSafeInteger(monthlyApiCalls) || monthlyApiCalls < 0) throw new Error('monthlyApiCalls must be a non-negative safe integer.');
            const existing = await client.platformProject.findFirst({ where: { OR: [{ id: projectId }, { slug: projectId }] } });
            if (!existing) return undefined;
            return toProject(await client.platformProject.update({ where: { id: existing.id }, data: { monthlyApiCalls: BigInt(monthlyApiCalls) } }));
        },
        async setProjectUsageWithAuditIntent(
            projectId: string,
            organizationId: string,
            monthlyApiCalls: number,
            intentId: string,
        ): Promise<PlatformProject | undefined> {
            if (!Number.isSafeInteger(monthlyApiCalls) || monthlyApiCalls < 0) throw new Error('monthlyApiCalls must be a non-negative safe integer.');
            return client.$transaction(async (transaction) => {
                const rows = await transaction.$queryRaw<RawRow[]>`
                    UPDATE "PlatformProject"
                    SET "monthlyApiCalls" = ${BigInt(monthlyApiCalls)}, "updatedAt" = NOW()
                    WHERE "id" = ${projectId} AND "organizationId" = ${organizationId}
                    RETURNING *
                `;
                const scope = `org/${organizationId}/project/${projectId}/environment/platform-admin`;
                await transaction.$queryRaw`SELECT set_config('app.current_tenant_id', ${scope}, true)`;
                const resolution = rows.length
                    ? 'COMMITTED'
                    : 'FAILED';
                const resolved = await transaction.$queryRaw<Array<{ resolve_platform_audit_intent: boolean }>>`
                    SELECT public.resolve_platform_audit_intent(
                        ${intentId}, ${resolution}, ${rows.length ? null : 'Project no longer exists.'}
                    ) AS resolve_platform_audit_intent
                `;
                if (!resolved[0]?.resolve_platform_audit_intent) {
                    throw new Error('Audit intent could not be resolved in the usage transaction.');
                }
                return rows[0] ? toProject(rows[0]) : undefined;
            });
        },
        async resolvePlatformAdminAuditIntentFailure(
            intentId: string,
            organizationId: string,
            projectId: string,
            reason: string,
        ): Promise<void> {
            const scope = `org/${organizationId}/project/${projectId}/environment/platform-admin`;
            await client.$transaction(async (transaction) => {
                await transaction.$queryRaw`SELECT set_config('app.current_tenant_id', ${scope}, true)`;
                await transaction.$queryRaw`
                    SELECT public.resolve_platform_audit_intent(${intentId}, 'FAILED', ${reason})
                `;
            });
        },
        async resetMonthlyProjectUsage(): Promise<number> {
            const rows = await client.$queryRaw<Array<{ id: string }>>`
        UPDATE "PlatformProject" SET "monthlyApiCalls" = 0, "updatedAt" = NOW()
        WHERE "monthlyApiCalls" <> 0 RETURNING "id"
      `;
            return rows.length;
        },
        async listEnvironments(projectId?: string): Promise<ProjectEnvironment[]> {
            const rows = await client.projectEnvironment.findMany({
                where: projectId ? { projectId } : undefined,
                orderBy: [{ projectId: 'asc' }, { slug: 'asc' }],
            });
            return rows.map(toEnvironment);
        },
        async getEnvironment(idOrSlug: string, projectId?: string): Promise<ProjectEnvironment | undefined> {
            const row = await client.projectEnvironment.findFirst({
                where: projectId
                    ? { projectId, OR: [{ id: idOrSlug }, { slug: idOrSlug }] }
                    : { id: idOrSlug },
            });
            return row ? toEnvironment(row) : undefined;
        },
        async listApiKeys(filter?: { environmentId?: string; projectId?: string; status?: KeyLifecycleState }): Promise<PlatformApiKeyRecord[]> {
            const rows = await client.platformApiKey.findMany({
                where: {
                    ...(filter?.environmentId ? { environmentId: filter.environmentId } : {}),
                    ...(filter?.projectId ? { environment: { projectId: filter.projectId } } : {}),
                    ...(filter?.status ? { status: filter.status } : {}),
                },
                include: { environment: { select: { projectId: true } } },
                orderBy: { issuedAt: 'desc' },
            });
            return rows.map(toKey);
        },
        async getApiKey(idOrKeyId: string): Promise<PlatformApiKeyRecord | undefined> {
            return mapKey(await client.platformApiKey.findFirst({
                where: { OR: [{ id: idOrKeyId }, { keyId: idOrKeyId }] },
                include: { environment: { select: { projectId: true } } },
            }));
        },
        async findKeyByRawSecret(rawSecret: string, serverPepper?: string): Promise<PlatformApiKeyRecord | undefined> {
            const verifier = PlatformKeyEngine.computeAuthVerifier(rawSecret, serverPepper);
            return mapKey(await client.platformApiKey.findUnique({
                where: { authVerifier: verifier },
                include: { environment: { select: { projectId: true } } },
            }));
        },
        async authorizeApiKey(rawSecret: string): Promise<PlatformAuthorizationLookup> {
            const verifier = PlatformKeyEngine.computeAuthVerifier(rawSecret);
            const rows = await client.$queryRaw<Array<{ key_data: RawRow; project_data: RawRow; environment_data: RawRow }>>`
        SELECT to_jsonb(k) AS key_data,
               to_jsonb(p) AS project_data,
               to_jsonb(e) AS environment_data
        FROM "PlatformApiKey" k
        JOIN "ProjectEnvironment" e ON e."id" = k."environmentId"
        JOIN "PlatformProject" p ON p."id" = e."projectId"
        WHERE k."authVerifier" = ${verifier}
        LIMIT 1
      `;
            const row = rows[0];
            return {
                key: row ? toKey({ ...row.key_data, environment: row.environment_data }) : null,
                project: row ? toProject(row.project_data) : null,
                environment: row ? toEnvironment(row.environment_data) : null,
                queryCount: 1,
                source: 'prisma',
            };
        },
        async createApiKey(input: CreateKeyInput, serverPepper?: string): Promise<{ keyRecord: PlatformApiKeyRecord; rawSecret: string }> {
            const environment = await getEnvironment(input.environmentId);
            if (!environment || environment.projectId !== input.projectId) throw new Error('API key environment does not belong to the requested project.');
            const generated = buildKey(input, environment);
            if (serverPepper) {
                generated.record.authVerifier = PlatformKeyEngine.computeAuthVerifier(generated.rawSecret, serverPepper);
            }
            await client.platformApiKey.create({ data: toKeyCreateData(generated.record) });
            return { keyRecord: generated.record, rawSecret: generated.rawSecret };
        },
        async rotateApiKey(keyId: string, options: { graceWindowDays?: number; operatorEmail: string }): Promise<{ replacementKey: PlatformApiKeyRecord; replacementRawSecret: string } | undefined> {
            return client.$transaction(async (transaction) => {
                const locked = await transaction.$queryRaw<Array<{ key_data: RawRow; environment_data: RawRow }>>`
          SELECT to_jsonb(k) AS key_data, to_jsonb(e) AS environment_data
          FROM "PlatformApiKey" k
          JOIN "ProjectEnvironment" e ON e."id" = k."environmentId"
          WHERE k."id" = ${keyId} OR k."keyId" = ${keyId}
                    FOR UPDATE OF k
        `;
                const lockedRow = locked[0];
                if (!lockedRow) return undefined;
                const environment = lockedRow.environment_data;
                const oldKey = toKey({ ...lockedRow.key_data, environment });
                const replacement = buildKey(
                    {
                        name: `${oldKey.name} (Rotated Replacement)`,
                        environmentId: oldKey.environmentId,
                        projectId: oldKey.projectId,
                        keyType: oldKey.keyType,
                        capabilities: oldKey.capabilities,
                        ipAllowlist: oldKey.ipAllowlist,
                        rateLimitPerMin: oldKey.rateLimitPerMin,
                        tenantScope: oldKey.tenantScope,
                        createdBy: options.operatorEmail,
                    },
                    environment,
                );
                await transaction.platformApiKey.create({ data: toKeyCreateData(replacement.record) });
                const oldUpdate = options.graceWindowDays && options.graceWindowDays > 0
                    ? { expiresAt: new Date(Date.now() + options.graceWindowDays * 86400000) }
                    : { status: 'SUSPENDED' as const };
                await transaction.platformApiKey.update({
                    where: { id: oldKey.id },
                    data: {
                        ...oldUpdate,
                        revokeReason: `Rotated in favor of replacement key [${replacement.record.keyId}]`,
                    },
                });
                return { replacementKey: replacement.record, replacementRawSecret: replacement.rawSecret };
            });
        },
        async setKeyStatus(keyId: string, status: KeyLifecycleState, reason?: string): Promise<PlatformApiKeyRecord | undefined> {
            const existing = await client.platformApiKey.findFirst({ where: { OR: [{ id: keyId }, { keyId }] } });
            if (!existing) return undefined;
            const row = await client.platformApiKey.update({
                where: { id: existing.id },
                data: {
                    status,
                    ...(reason ? { revokeReason: reason } : {}),
                    ...(status === 'COMPROMISED' ? { compromisedAt: new Date() } : {}),
                    ...(status === 'REVOKED' ? { revokedAt: new Date() } : {}),
                },
                include: { environment: { select: { projectId: true } } },
            });
            return toKey(row);
        },
        async recordKeyUsage(keyId: string, clientIp?: string): Promise<void> {
            await client.platformApiKey.updateMany({
                where: { OR: [{ id: keyId }, { keyId }] },
                data: { lastUsedAt: new Date(), ...(clientIp ? { lastUsedIp: clientIp } : {}) },
            });
        },
        async listCredentials(filter?: { environmentId?: string; projectId?: string }): Promise<PlatformCredentialRecord[]> {
            const rows = await client.platformCredential.findMany({
                where: {
                    ...(filter?.environmentId ? { environmentId: filter.environmentId } : {}),
                    ...(filter?.projectId ? { environment: { projectId: filter.projectId } } : {}),
                },
                include: { environment: { select: { projectId: true } } },
                orderBy: { createdAt: 'desc' },
            });
            return rows.map(toCredential);
        },
        async getCredential(id: string): Promise<PlatformCredentialRecord | undefined> {
            const row = await client.platformCredential.findUnique({
                where: { id },
                include: { environment: { select: { projectId: true } } },
            });
            return row ? toCredential(row) : undefined;
        },
        async createCredential(input: {
            name: string;
            provider: string;
            environmentId: string;
            projectId: string;
            plaintextSecret: string;
            ownerEmail: string;
            rotationIntervalDays?: number;
        }): Promise<PlatformCredentialRecord> {
            const environment = await getEnvironment(input.environmentId);
            if (!environment || environment.projectId !== input.projectId) throw new Error('Credential environment does not belong to the requested project.');
            const envelope = CredentialVault.encryptSecret(input.plaintextSecret);
            const now = new Date();
            const row = await client.platformCredential.create({
                data: {
                    id: `cred_${crypto.randomUUID()}`,
                    name: input.name,
                    provider: input.provider,
                    environment: { connect: { id: input.environmentId } },
                    envelopeVersion: envelope.version,
                    kekIdentifier: envelope.kekIdentifier,
                    encryptedDek: envelope.encryptedDek,
                    dekIv: envelope.dekIv,
                    dekTag: envelope.dekTag,
                    initializationVector: envelope.initializationVector,
                    authenticationTag: envelope.authenticationTag,
                    encryptedCiphertext: envelope.encryptedCiphertext,
                    secretFingerprint: envelope.secretFingerprint,
                    maskedDisplay: CredentialVault.maskSecret(input.plaintextSecret),
                    health: 'HEALTHY',
                    lastRotatedAt: now,
                    nextRotationDueAt: new Date(now.getTime() + (input.rotationIntervalDays || 90) * 86400000),
                    ownerEmail: input.ownerEmail,
                },
                include: { environment: { select: { projectId: true } } },
            });
            return toCredential(row);
        },
        async decryptCredential(id: string): Promise<string> {
            const row = await client.platformCredential.findUnique({ where: { id } });
            if (!row) throw new Error(`Credential [${id}] not found.`);
            return CredentialVault.decryptSecret({
                version: row.envelopeVersion,
                kekIdentifier: row.kekIdentifier,
                encryptedDek: row.encryptedDek,
                dekIv: row.dekIv,
                dekTag: row.dekTag,
                initializationVector: row.initializationVector,
                authenticationTag: row.authenticationTag,
                encryptedCiphertext: row.encryptedCiphertext,
                secretFingerprint: row.secretFingerprint,
            } as any);
        },
        async listPackages(): Promise<PlatformPackageCatalogItem[]> {
            return (await client.platformPackage.findMany({ orderBy: { name: 'asc' } })).map(toPackage);
        },
        async getPackage(packageId: string): Promise<PlatformPackageCatalogItem | undefined> {
            const row = await client.platformPackage.findFirst({ where: { OR: [{ packageId }, { id: packageId }] } });
            return row ? toPackage(row) : undefined;
        },
        async listPackageVersions(packageId: string): Promise<PackageVersionRecord[]> {
            return (await client.packageVersion.findMany({ where: { packageId }, orderBy: { releasedAt: 'desc' } })).map(toPackageVersion);
        },
        async listInstallations(environmentId?: string): Promise<PackageInstallationRecord[]> {
            return (await client.packageInstallation.findMany({
                where: environmentId ? { environmentId } : undefined,
                orderBy: { installedAt: 'desc' },
            })).map(toInstallation);
        },
        async installPackage(
            environmentId: string,
            packageId: string,
            versionId: string,
            configOverrides: Record<string, any> = {},
        ): Promise<PackageInstallationRecord> {
            const pkg = await client.platformPackage.findFirst({ where: { OR: [{ packageId }, { id: packageId }] } });
            if (!pkg) throw new Error(`Package [${packageId}] not found.`);
            const storedVersion = await client.packageVersion.findFirst({
                where: { id: versionId, packageId: pkg.packageId },
                select: { id: true },
            });
            if (!storedVersion) throw new Error(`Package version [${versionId}] not found for ${pkg.packageId}.`);
            const row = await client.packageInstallation.upsert({
                where: { environmentId_packageId: { environmentId, packageId: pkg.packageId } },
                create: {
                    id: `install_${crypto.randomUUID()}`,
                    environmentId,
                    packageId: pkg.packageId,
                    installedVersionId: storedVersion.id,
                    status: 'ACTIVE',
                    configOverrides,
                },
                update: { installedVersionId: storedVersion.id, status: 'ACTIVE', configOverrides },
            });
            return toInstallation(row);
        },
        async listDomains(environmentId?: string): Promise<ProjectDomainRecord[]> {
            return (await client.projectDomain.findMany({
                where: environmentId ? { environmentId } : undefined,
                orderBy: { createdAt: 'desc' },
            })).map(toDomain);
        },
        async findVerifiedDomain(domainName: string): Promise<ProjectDomainRecord | undefined> {
            const row = await client.projectDomain.findFirst({
                where: { domainName: domainName.toLowerCase(), verificationStatus: 'VERIFIED' },
                orderBy: { createdAt: 'desc' },
            });
            return row ? toDomain(row) : undefined;
        },
        async registerDomain(input: { environmentId: string; domainName: string; isApex?: boolean }): Promise<ProjectDomainRecord> {
            const now = new Date();
            const row = await client.projectDomain.create({
                data: {
                    id: `dom_${crypto.randomUUID()}`,
                    environmentId: input.environmentId,
                    domainName: input.domainName.toLowerCase(),
                    isApex: input.isApex || false,
                    verificationStatus: 'VERIFIED',
                    cnameTarget: 'cname.orbitox.io',
                    tlsCertificateStatus: 'ISSUED',
                    sslExpiresAt: new Date(now.getTime() + 85 * 86400000),
                    edgeLatencyMs: 8,
                    createdAt: now,
                    verifiedAt: now,
                },
            });
            return toDomain(row);
        },
        async removeDomain(idOrDomainName: string): Promise<boolean> {
            const result = await client.projectDomain.deleteMany({
                where: { OR: [{ id: idOrDomainName }, { domainName: idOrDomainName.toLowerCase() }] },
            });
            return result.count > 0;
        },
        async getQuotaPolicy(environmentId: string): Promise<EnvironmentQuotaPolicyRecord | undefined> {
            const row = await client.environmentQuotaPolicy.findUnique({ where: { environmentId } });
            return row ? toQuotaPolicy(row) : undefined;
        },
        async updateQuotaPolicy(environmentId: string, updates: Partial<EnvironmentQuotaPolicyRecord>): Promise<EnvironmentQuotaPolicyRecord | undefined> {
            const existing = await client.environmentQuotaPolicy.findUnique({ where: { environmentId } });
            if (!existing) return undefined;
            const row = await client.environmentQuotaPolicy.update({
                where: { environmentId },
                data: {
                    ...(updates.monthlyCallLimit !== undefined ? { monthlyCallLimit: BigInt(updates.monthlyCallLimit) } : {}),
                    ...(updates.monthlyCallsUsed !== undefined ? { monthlyCallsUsed: BigInt(updates.monthlyCallsUsed) } : {}),
                    ...(updates.storageQuotaGb !== undefined ? { storageQuotaGb: updates.storageQuotaGb } : {}),
                    ...(updates.storageUsedGb !== undefined ? { storageUsedGb: updates.storageUsedGb } : {}),
                    ...(updates.warningThreshold !== undefined ? { warningThreshold: updates.warningThreshold } : {}),
                    ...(updates.projectedExhaustionDays !== undefined ? { projectedExhaustionDays: updates.projectedExhaustionDays } : {}),
                },
            });
            return toQuotaPolicy(row);
        },
        async recordCall(environmentId: string): Promise<void> {
            await client.environmentQuotaPolicy.updateMany({
                where: { environmentId },
                data: { monthlyCallsUsed: { increment: 1n } },
            });
        },
        async recordAuditEvent(event: Record<string, any>): Promise<Record<string, any>> {
            await this.recordPlatformAdminAudit({
                action: event.action || 'platform.audit',
                entityType: event.entityType || 'PLATFORM',
                entityId: event.entityId,
                actorId: event.actor,
                projectId: event.projectId,
                environmentId: event.environmentId,
                reason: event.reason,
                metadata: event as Prisma.InputJsonValue,
            });
            return { id: `audit_${crypto.randomUUID()}`, createdAt: new Date().toISOString(), ...event };
        },
        async recordPlatformAdminAudit(event: PlatformAdminAuditInput): Promise<string> {
            const id = `audit_${crypto.randomUUID()}`;
            const auditClient = adminAuditClient;
            await auditClient.$executeRaw`
        INSERT INTO "PlatformAuditEvent" (
          "id", "actorId", "actorEmail", "action", "entityType", "entityId",
          "organizationId", "projectId", "environmentId", "ipAddress", "requestId",
          "reason", "metadata", "occurredAt"
        ) VALUES (
          ${id}, ${event.actorId || null}, ${event.actorEmail || null}, ${event.action},
          ${event.entityType}, ${event.entityId || null}, ${event.organizationId || null},
          ${event.projectId || null}, ${event.environmentId || null}, ${event.ipAddress || null},
          ${event.requestId || null}, ${event.reason || null},
          ${JSON.stringify(event.metadata || {})}::jsonb, NOW()
        )
      `;
            return id;
        },
        async createPlatformAdminAuditIntent(event: PlatformAdminAuditIntentInput): Promise<string> {
            const id = `audit_${crypto.randomUUID()}`;
            await adminAuditClient.$executeRaw`
                INSERT INTO "PlatformAuditEvent" (
                    "id", "actorId", "actorEmail", "action", "entityType", "entityId",
                    "organizationId", "projectId", "environmentId", "ipAddress", "requestId",
                    "reason", "metadata", "status", "occurredAt"
                ) VALUES (
                    ${id}, ${event.actorId || null}, ${event.actorEmail || null}, ${event.action},
                    ${event.entityType}, ${event.entityId || null}, ${event.organizationId},
                    ${event.projectId}, ${event.environmentId || null}, ${event.ipAddress || null},
                    ${event.requestId || null}, ${event.reason || null},
                    ${JSON.stringify(event.metadata || {})}::jsonb, 'PENDING', NOW()
                )
            `;
            return id;
        },
    };
}

let runtimeClient: PrismaClient | undefined;
let auditClient: PrismaClient | undefined;
let prismaRepository: ReturnType<typeof createPrismaPlatformRepository> | undefined;

function prismaIsRequired(): boolean {
    const repositoryMode = process.env.ORBITOX_PLATFORM_REPOSITORY;
    if (repositoryMode === 'json') {
        if (process.env.NODE_ENV === 'production' || !process.env.NODE_ENV) {
            throw new Error('JSON platform repository mode is only allowed with NODE_ENV explicitly set outside production.');
        }
        return false;
    }
    if (repositoryMode && repositoryMode !== 'prisma') {
        throw new Error(`Unsupported ORBITOX_PLATFORM_REPOSITORY mode: ${repositoryMode}`);
    }
    return true;
}

function getPrismaRepository(): ReturnType<typeof createPrismaPlatformRepository> {
    if (prismaRepository) return prismaRepository;
    const runtimeUrl = process.env.APP_DATABASE_URL || (!prismaIsRequired() ? process.env.DATABASE_URL : undefined);
    const auditUrl = process.env.PLATFORM_AUDIT_DATABASE_URL;
    if (!runtimeUrl) throw new Error('DATABASE_URL is required for the platform repository.');
    if (!auditUrl) throw new Error('PLATFORM_AUDIT_DATABASE_URL is required for platform-admin audit writes.');
    runtimeClient = new PrismaClient({ datasources: { db: { url: runtimeUrl } } });
    auditClient = new PrismaClient({ datasources: { db: { url: auditUrl } } });
    prismaRepository = createPrismaPlatformRepository(runtimeClient, auditClient);
    return prismaRepository;
}

const extraMethods = {
    isPrismaBacked: () => prismaIsRequired(),
    authorizeApiKey: async (rawSecret: string): Promise<PlatformAuthorizationLookup> => {
        if (prismaIsRequired()) return getPrismaRepository().authorizeApiKey(rawSecret);
        const key = PlatformRepository.findKeyByRawSecret(rawSecret) || null;
        const project = key ? PlatformRepository.getProject(key.projectId) || null : null;
        const environment = key ? PlatformRepository.getEnvironment(key.environmentId) || null : null;
        return { key, project, environment, queryCount: 0, source: 'legacy' };
    },
    recordPlatformAdminAudit: async (event: PlatformAdminAuditInput): Promise<string> => {
        if (prismaIsRequired()) return getPrismaRepository().recordPlatformAdminAudit(event);
        const auditId = `audit_${crypto.randomUUID()}`;
        PlatformRepository.recordAuditEvent({ ...event, id: auditId, status: 'COMMITTED' });
        return auditId;
    },
    createPlatformAdminAuditIntent: async (event: PlatformAdminAuditIntentInput): Promise<string> => {
        if (prismaIsRequired()) return getPrismaRepository().createPlatformAdminAuditIntent(event);
        const id = `audit_${crypto.randomUUID()}`;
        PlatformRepository.recordAuditEvent({ ...event, id, status: 'PENDING', failureReason: undefined });
        return id;
    },
    setProjectUsageWithAuditIntent: async (
        projectId: string,
        organizationId: string,
        monthlyApiCalls: number,
        intentId: string,
    ): Promise<PlatformProject | undefined> => {
        if (prismaIsRequired()) return getPrismaRepository().setProjectUsageWithAuditIntent(projectId, organizationId, monthlyApiCalls, intentId);
        const project = await platformRepository.setProjectUsage(projectId, monthlyApiCalls);
        const event = PlatformRepository.listAuditEvents().find((item) => item.id === intentId);
        if (event) {
            event.status = project ? 'COMMITTED' : 'FAILED';
            event.failureReason = project ? undefined : 'Project no longer exists.';
            PlatformRepository.saveImmediate();
        }
        return project;
    },
    resolvePlatformAdminAuditIntentFailure: async (
        intentId: string,
        organizationId: string,
        projectId: string,
        reason: string,
    ): Promise<void> => {
        if (prismaIsRequired()) return getPrismaRepository().resolvePlatformAdminAuditIntentFailure(intentId, organizationId, projectId, reason);
        const event = PlatformRepository.listAuditEvents().find((item) => item.id === intentId);
        if (!event || event.status !== 'PENDING') return;
        event.status = 'FAILED';
        event.failureReason = reason.slice(0, 1000);
        PlatformRepository.recordAuditEvent({
            action: 'platform.audit_intent.resolved',
            entityType: 'PLATFORM_AUDIT_INTENT',
            entityId: intentId,
            organizationId,
            projectId,
            metadata: { status: event.status, failureReason: event.failureReason },
        });
    },
    findVerifiedDomain: async (domainName: string): Promise<ProjectDomainRecord | undefined> => {
        if (prismaIsRequired()) return getPrismaRepository().findVerifiedDomain(domainName);
        return PlatformRepository.listDomains().find((domain) =>
            domain.verificationStatus === 'VERIFIED' && domain.domainName.toLowerCase() === domainName.toLowerCase()
        );
    },
};

export const platformRepository = new Proxy(Object.create(null), {
    get(_target, property: string | symbol) {
        if (property === 'then') return undefined;
        if (property in extraMethods) return extraMethods[property as keyof typeof extraMethods];
        if (prismaIsRequired()) {
            const method = getPrismaRepository()[property as keyof ReturnType<typeof createPrismaPlatformRepository>];
            if (typeof method === 'function') return method;
            throw new Error(`Platform repository method [${String(property)}] is not implemented by the Prisma adapter.`);
        }
        const legacyMember = (PlatformRepository as any)[property];
        if (typeof legacyMember === 'function') {
            return async (...args: unknown[]) => legacyMember.apply(PlatformRepository, args);
        }
        return legacyMember;
    },
}) as AsyncPlatformRepository;

export function closePlatformRepositoryClients(): Promise<void> {
    return Promise.all([runtimeClient?.$disconnect(), auditClient?.$disconnect()]).then(() => undefined);
}