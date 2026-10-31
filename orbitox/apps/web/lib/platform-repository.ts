import * as crypto from 'crypto';
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
    PluginInstallationRecord,
    PluginInstallationStatus,
    ProjectDomainRecord,
    ProjectEnvironment,
    ProvisionPluginInstallationInput,
} from '@orbitox/types';
import {
    CreateKeyInput,
    CreateProjectInput,
    PLAN_DEFAULT_QUOTAS,
    PLAN_DEFAULT_RATE_LIMITS,
    CredentialVault,
    PlatformKeyEngine,
    PlatformRepository,
    canonicalizePluginId,
    PluginCatalogueItem,
    PlanCatalogueRecord,
    PlatformOutboxRecord,
    SEED_PLUGINS,
    SEED_PLANS,
    assertValidInstallationTransition,
    InvalidStateTransitionError,
} from '@orbitox-io/plugin-engine';
import { TENANT_RE } from '@orbitox-io/bridge';
import { loadPepperRing, activeVerifier, candidateVerifiers } from './pepper';

export type { PlatformProject };
import { isSamplePackage } from './sample-plugins';

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

export class PlatformRateLimitPartitionExhaustedError extends Error {
    readonly code = 'RATE_LIMIT_PARTITION_EXHAUSTED';
    constructor(message = 'Platform rate limit table partition runway exhausted') {
        super(message);
        this.name = 'PlatformRateLimitPartitionExhaustedError';
    }
}

export function getCurrentBillingPeriod(date = new Date()): string {
    return date.toISOString().slice(0, 7);
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
        periodKey?: string,
    ): Promise<PlatformProject | undefined>;
    resolvePlatformAdminAuditIntentFailure(
        intentId: string,
        organizationId: string,
        projectId: string,
        reason: string,
    ): Promise<void>;
    findVerifiedDomain(domainName: string): Promise<ProjectDomainRecord | undefined>;
    incrementProjectUsage(projectId: string, amount?: number): Promise<number>;
    recordBillableCall(projectId: string, amount?: number): Promise<number | undefined>;
    reserveProjectUsage(projectId: string, monthlyQuota?: number, periodKey?: string): Promise<number | undefined>;
    releaseProjectUsage(projectId: string, amount?: number, periodKey?: string): Promise<number>;
    incrementRateLimit(
        scopeType: 'project' | 'key' | 'ip',
        scopeId: string,
        limit: number,
        windowSeconds?: number,
        customWindowStart?: Date
    ): Promise<{
        allowed: boolean;
        currentCount: number;
        limit: number;
        remaining: number;
        resetSeconds: number;
    }>;
    checkRateLimits(
        scopes: Array<{ scopeType: 'project' | 'key' | 'ip'; scopeId: string; limit: number }>,
        windowSeconds?: number,
        customWindowStart?: Date
    ): Promise<{
        allowed: boolean;
        exceededScope?: { scopeType: string; scopeId: string; limit: number; currentCount: number };
        limit: number;
        remaining: number;
        resetSeconds: number;
    }>;
    getApiKeyPepperDistribution(): Promise<Record<string, number>>;
    listPluginInstallations(tenantId?: string): Promise<PluginInstallationRecord[]>;
    getPluginInstallation(tenantId: string, pluginId: string): Promise<PluginInstallationRecord | undefined>;
    provisionPluginInstallation(input: ProvisionPluginInstallationInput): Promise<PluginInstallationRecord>;
    updatePluginInstallationStatus(tenantId: string, pluginId: string, status: PluginInstallationStatus | string): Promise<PluginInstallationRecord>;
    uninstallPluginInstallation(tenantId: string, pluginId: string): Promise<PluginInstallationRecord>;
    reactivatePluginInstallation(
        tenantId: string,
        pluginId: string,
        adminActor?: { actorId?: string; actorEmail?: string; reason?: string }
    ): Promise<PluginInstallationRecord>;
    changePluginInstallationPlan(
        tenantId: string,
        pluginId: string,
        newPlanId: string
    ): Promise<PluginInstallationRecord>;
    checkQuotaUsage(
        tenantId: string,
        pluginId: string,
        quotaKey: string,
        currentCount: number,
        requestedIncrement?: number
    ): Promise<{ allowed: boolean; limit?: number; currentCount: number; remaining?: number; reason?: string }>;
    listPlugins(): Promise<PluginCatalogueItem[]>;
    getPlugin(pluginId: string): Promise<PluginCatalogueItem | undefined>;
    listPlans(pluginId?: string): Promise<PlanCatalogueRecord[]>;
    getPlan(planId: string): Promise<PlanCatalogueRecord | undefined>;
    createPlan(input: any): Promise<PlanCatalogueRecord>;
    updatePlan(planId: string, updates: any): Promise<PlanCatalogueRecord>;
    ensurePlanCatalogueSeeded(): Promise<void>;
    listOutboxMessages(status?: string): Promise<PlatformOutboxRecord[]>;
    recordOutboxMessage(input: {
        tenantId: string;
        eventType: string;
        aggregateType: string;
        aggregateId: string;
        payload: Record<string, any>;
    }): Promise<PlatformOutboxRecord>;
    updateOutboxMessage(
        id: string,
        updates: { status?: 'PENDING' | 'DISPATCHED' | 'FAILED'; retryCount?: number; lastError?: string; dispatchedAt?: Date }
    ): Promise<void>;
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
        currentBillingPeriod: row.currentBillingPeriod ?? undefined,
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
        verifierPepperId: row.verifierPepperId ?? undefined,
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

function toPluginInstallation(row: RawRow): PluginInstallationRecord {
    return {
        id: row.id,
        tenantId: row.tenantId,
        pluginId: row.pluginId,
        runtimeTenantId: row.runtimeTenantId,
        status: row.status,
        entitlementRevision: row.entitlementRevision,
        planId: row.planId ?? undefined,
        config: (row.config || {}) as Record<string, any>,
        createdAt: dateString(row.createdAt)!,
        updatedAt: dateString(row.updatedAt)!,
    };
}

function toPlan(row: RawRow): PlanCatalogueRecord {
    return {
        id: row.id,
        planId: row.planId,
        pluginId: row.pluginId,
        name: row.name,
        description: row.description ?? undefined,
        tier: row.tier,
        priceMinor: row.priceMinor,
        currency: row.currency,
        billingInterval: row.billingInterval,
        gracePeriodDays: row.gracePeriodDays,
        suspensionGraceDays: row.suspensionGraceDays,
        status: row.status,
        features: (row.features || []).map((f: RawRow) => ({
            featureKey: f.featureKey,
            description: f.description ?? undefined,
            enabled: Boolean(f.enabled),
        })),
        quotas: (row.quotas || []).map((q: RawRow) => ({
            quotaKey: q.quotaKey,
            limit: q.limit,
            window: q.window,
            unit: q.unit,
        })),
        createdAt: dateString(row.createdAt)!,
        updatedAt: dateString(row.updatedAt)!,
    };
}

function toPluginRecord(row: RawRow): PluginCatalogueItem {
    return {
        id: row.id,
        pluginId: row.pluginId,
        name: row.name,
        description: row.description ?? undefined,
        version: row.version,
        status: row.status,
        createdAt: dateString(row.createdAt)!,
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
    if (input.currentBillingPeriod !== undefined) (data as any).currentBillingPeriod = input.currentBillingPeriod;
    return data;
}

function buildKey(input: CreateKeyInput, environment: RawRow, serverPepper?: string): { record: PlatformApiKeyRecord; rawSecret: string } {
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

    let authVerifier = generated.authVerifier;
    let verifierPepperId: string | undefined = undefined;
    if (serverPepper) {
        authVerifier = PlatformKeyEngine.computeAuthVerifier(generated.rawSecret, serverPepper);
    } else {
        try {
            const ring = loadPepperRing();
            const act = activeVerifier(ring, generated.rawSecret);
            authVerifier = act.verifier;
            verifierPepperId = act.pepperId;
        } catch {
            authVerifier = generated.authVerifier;
        }
    }

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
            authVerifier,
            verifierPepperId,
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
        verifierPepperId: key.verifierPepperId,
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
        currentBillingPeriod: getCurrentBillingPeriod(now),
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

export function createPrismaPlatformRepository(
    client: PrismaClient,
    adminAuditClient: PrismaClient,
    outboxRelayClient: PrismaClient = client
) {
    const mapProject = (row: RawRow | null): PlatformProject | undefined => (row ? toProject(row) : undefined);
    const mapKey = (row: RawRow | null): PlatformApiKeyRecord | undefined => (row ? toKey(row) : undefined);

    async function getEnvironment(id: string): Promise<RawRow | null> {
        return client.projectEnvironment.findUnique({ where: { id } });
    }

    const keyUsageThrottleMap = new Map<string, number>();
    const KEY_USAGE_THROTTLE_INTERVAL_MS = 1000;

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

            return await client.$transaction(async (tx) => {
                // Rule 3: No org_default. If the organisation cannot be resolved, refuse.
                const org = await tx.platformOrganization.findFirst({
                    where: { OR: [{ id: input.organizationId }, { slug: input.organizationId }] },
                });
                if (!org) {
                    throw new Error(`Organization "${input.organizationId}" cannot be resolved. (No org_default allowed)`);
                }

                const slugExists = async (checkSlug: string) =>
                    Boolean(await tx.platformProject.findUnique({ where: { slug: checkSlug } }));

                if (suppliedSlugIsValid && (await slugExists(baseSlug))) {
                    throw new Error(`Project slug "${baseSlug}" is already in use.`);
                }
                let slug = baseSlug;
                if (!suppliedSlugIsValid) {
                    let suffix = 2;
                    while (await slugExists(slug)) slug = `${baseSlug}-${suffix++}`;
                }

                const projectId = `proj_${crypto.randomUUID()}`;
                let row;
                try {
                    row = await tx.platformProject.create({
                        data: makeProjectData(input, slug, projectId),
                        include: { environments: { orderBy: { slug: 'asc' } } },
                    });
                } catch (error) {
                    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                        throw new Error(`Project slug "${slug}" is already in use.`);
                    }
                    throw error;
                }

                const canonicalTenantId = `org/${org.slug}/project/${slug}/environment/production`;

                // Rule 1: Create PluginInstallation rows ONLY from an explicit plugin/entitlement/plan request.
                // Remove businessModel guessing completely. A business type never grants a plugin.
                const pluginsToInstall: Array<{ pluginId: string; planId?: string; config?: Record<string, any> }> = [];
                if (input.plugins && Array.isArray(input.plugins)) {
                    for (const p of input.plugins) {
                        if (p && p.pluginId) {
                            pluginsToInstall.push({
                                pluginId: canonicalizePluginId(p.pluginId),
                                planId: p.planId || input.plan || input.planTier,
                                config: p.config || {},
                            });
                        }
                    }
                }

                // If caller provided explicit enabledServices or initialPackages containing known plugins
                const explicitPackages = [...(input.initialPackages || []), ...(input.enabledServices || [])];
                for (const pkg of explicitPackages) {
                    const canonical = canonicalizePluginId(pkg);
                    if (['@orbitox/restaurant', '@orbitox/hms', '@orbitox/crm', '@orbitox/pos'].includes(canonical)) {
                        if (!pluginsToInstall.some((p) => p.pluginId === canonical)) {
                            pluginsToInstall.push({
                                pluginId: canonical,
                                planId: input.plan || input.planTier || 'starter',
                                config: {},
                            });
                        }
                    }
                }

                // Rule 2: Create project and installations in ONE transaction. Delete every catch {} around installation writes.
                // A claim conflict or failure must surface.
                for (const item of pluginsToInstall) {
                    const existingClaim = await tx.pluginInstallation.findFirst({
                        where: {
                            pluginId: item.pluginId,
                            runtimeTenantId: canonicalTenantId,
                            NOT: { tenantId: canonicalTenantId },
                        },
                    });
                    if (existingClaim) {
                        const err = new Error(
                            `Runtime tenant "${canonicalTenantId}" for plugin "${item.pluginId}" is already claimed by tenant "${existingClaim.tenantId}".`
                        );
                        (err as any).code = 'RUNTIME_TENANT_ALREADY_CLAIMED';
                        throw err;
                    }

                    const installationId = `pinst_${crypto.randomUUID()}`;
                    const createdInstallation = await tx.pluginInstallation.create({
                        data: {
                            id: installationId,
                            tenantId: canonicalTenantId,
                            pluginId: item.pluginId,
                            runtimeTenantId: canonicalTenantId,
                            status: (input.status as any) || 'ACTIVE',
                            entitlementRevision: 1,
                            planId: item.planId ? item.planId.toLowerCase() : null,
                            config: item.config || {},
                        },
                    });

                    // Rule C: Write outbox row in the same transaction
                    await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${canonicalTenantId}, true)`;
                    await tx.platformOutboxMessage.create({
                        data: {
                            id: `outbox_${crypto.randomUUID()}`,
                            tenantId: canonicalTenantId,
                            eventType: 'entitlement.updated',
                            aggregateType: 'PluginInstallation',
                            aggregateId: createdInstallation.id,
                            payload: {
                                tenantId: canonicalTenantId,
                                pluginId: item.pluginId,
                                runtimeTenantId: canonicalTenantId,
                                status: (input.status as any) || 'ACTIVE',
                                planId: createdInstallation.planId,
                                entitlementRevision: 1,
                                updatedAt: new Date().toISOString(),
                            },
                            status: 'PENDING',
                            retryCount: 0,
                        },
                    });
                }

                return { project: toProject(row), environments: row.environments.map(toEnvironment) };
            });
        },
        async updateProject(projectId: string, updates: Partial<PlatformProject>): Promise<PlatformProject | undefined> {
            const existing = await client.platformProject.findFirst({ where: { OR: [{ id: projectId }, { slug: projectId.toLowerCase() }] } });
            if (!existing) return undefined;
            if (updates.slug !== undefined && updates.slug !== existing.slug) throw new Error('Project slug is immutable after creation.');
            const row = await client.platformProject.update({ where: { id: existing.id }, data: toDatabaseProjectData(updates as any) });

            if (updates.status) {
                await client.pluginInstallation.updateMany({
                    where: { OR: [{ tenantId: existing.slug }, { tenantId: existing.id }] },
                    data: { status: updates.status as any },
                }).catch(() => {});
            }

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
        async reserveProjectUsage(projectId: string, monthlyQuota = Number.POSITIVE_INFINITY, periodKey?: string): Promise<number | undefined> {
            const rows = Number.isFinite(monthlyQuota)
                ? await client.$queryRaw<Array<{ monthlyApiCalls: bigint; currentBillingPeriod: string }>>`
            WITH target AS (
              SELECT COALESCE(${periodKey || null}::text, to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM')) AS "period"
            )
            UPDATE "PlatformProject"
            SET 
              "monthlyApiCalls" = CASE 
                WHEN "PlatformProject"."currentBillingPeriod" IS NOT NULL AND "PlatformProject"."currentBillingPeriod" < target."period" THEN 1 
                ELSE "PlatformProject"."monthlyApiCalls" + 1 
              END,
              "currentBillingPeriod" = target."period",
              "updatedAt" = NOW()
            FROM target
            WHERE ("PlatformProject"."id" = ${projectId} OR "PlatformProject"."slug" = ${projectId})
              AND (
                -- Forward-only rollover: stored period is strictly older than target
                (
                  "PlatformProject"."currentBillingPeriod" IS NOT NULL 
                  AND "PlatformProject"."currentBillingPeriod" < target."period"
                  AND ${BigInt(monthlyQuota)} > 0
                )
                -- Same period (or initial period): standard quota gate
                OR (
                  ("PlatformProject"."currentBillingPeriod" IS NULL OR "PlatformProject"."currentBillingPeriod" = target."period")
                  AND "PlatformProject"."monthlyApiCalls" < ${BigInt(monthlyQuota)}
                )
              )
            RETURNING "PlatformProject"."monthlyApiCalls", "PlatformProject"."currentBillingPeriod"
          `
                : await client.$queryRaw<Array<{ monthlyApiCalls: bigint; currentBillingPeriod: string }>>`
            WITH target AS (
              SELECT COALESCE(${periodKey || null}::text, to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM')) AS "period"
            )
            UPDATE "PlatformProject"
            SET 
              "monthlyApiCalls" = CASE 
                WHEN "PlatformProject"."currentBillingPeriod" IS NOT NULL AND "PlatformProject"."currentBillingPeriod" < target."period" THEN 1 
                ELSE "PlatformProject"."monthlyApiCalls" + 1 
              END,
              "currentBillingPeriod" = target."period",
              "updatedAt" = NOW()
            FROM target
            WHERE ("PlatformProject"."id" = ${projectId} OR "PlatformProject"."slug" = ${projectId})
              AND (
                "PlatformProject"."currentBillingPeriod" IS NULL 
                OR "PlatformProject"."currentBillingPeriod" <= target."period"
              )
            RETURNING "PlatformProject"."monthlyApiCalls", "PlatformProject"."currentBillingPeriod"
          `;
            return rows.length ? safeNumber(rows[0]!.monthlyApiCalls) : undefined;
        },
        async releaseProjectUsage(projectId: string, amount = 1, periodKey?: string): Promise<number> {
            const rows = await client.$queryRaw<Array<{ monthlyApiCalls: bigint }>>`
        WITH target AS (
          SELECT COALESCE(${periodKey || null}::text, to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM')) AS "period"
        )
        UPDATE "PlatformProject"
        SET "monthlyApiCalls" = GREATEST(0, "monthlyApiCalls" - ${BigInt(amount)}), "updatedAt" = NOW()
        FROM target
        WHERE ("PlatformProject"."id" = ${projectId} OR "PlatformProject"."slug" = ${projectId})
          AND ("PlatformProject"."currentBillingPeriod" = target."period" OR "PlatformProject"."currentBillingPeriod" IS NULL)
        RETURNING "PlatformProject"."monthlyApiCalls"
      `;
            return safeNumber(rows[0]?.monthlyApiCalls);
        },
        async setProjectUsage(projectId: string, monthlyApiCalls: number, periodKey?: string): Promise<PlatformProject | undefined> {
            if (!Number.isSafeInteger(monthlyApiCalls) || monthlyApiCalls < 0) throw new Error('monthlyApiCalls must be a non-negative safe integer.');
            const existing = await client.platformProject.findFirst({ where: { OR: [{ id: projectId }, { slug: projectId }] } });
            if (!existing) return undefined;
            const targetPeriod = periodKey || getCurrentBillingPeriod();
            const row = await client.platformProject.update({
                where: { id: existing.id },
                data: {
                    monthlyApiCalls: BigInt(monthlyApiCalls),
                    currentBillingPeriod: targetPeriod,
                },
            });
            return toProject(row);
        },
        async setProjectUsageWithAuditIntent(
            projectId: string,
            organizationId: string,
            monthlyApiCalls: number,
            intentId: string,
            periodKey?: string,
        ): Promise<PlatformProject | undefined> {
            if (!Number.isSafeInteger(monthlyApiCalls) || monthlyApiCalls < 0) throw new Error('monthlyApiCalls must be a non-negative safe integer.');
            const targetPeriod = periodKey || getCurrentBillingPeriod();
            return client.$transaction(async (transaction) => {
                // Statement 1: Lock project row and capture its exact current value under FOR UPDATE
                const lockedRows = await transaction.$queryRaw<Array<{ id: string; monthlyApiCalls: bigint; currentBillingPeriod: string | null }>>`
                    SELECT "id", "monthlyApiCalls", "currentBillingPeriod"
                    FROM "PlatformProject"
                    WHERE "id" = ${projectId} AND "organizationId" = ${organizationId}
                    FOR UPDATE
                `;
                const lockedProject = lockedRows[0];
                if (!lockedProject) {
                    const scope = `org/${organizationId}/project/${projectId}/environment/platform-admin`;
                    await transaction.$queryRaw`SELECT set_config('app.current_tenant_id', ${scope}, true)`;
                    await transaction.$queryRaw`
                        SELECT public.resolve_platform_audit_intent(
                            ${intentId}, 'FAILED', 'Project no longer exists.'
                        )
                    `;
                    return undefined;
                }

                const previousMonthlyApiCalls = Number(lockedProject.monthlyApiCalls);

                // Statement 2: Update project usage row (now locked against concurrent writes)
                const rows = await transaction.$queryRaw<RawRow[]>`
                    UPDATE "PlatformProject"
                    SET "monthlyApiCalls" = ${BigInt(monthlyApiCalls)}, "currentBillingPeriod" = ${targetPeriod}, "updatedAt" = NOW()
                    WHERE "id" = ${projectId} AND "organizationId" = ${organizationId}
                    RETURNING *
                `;
                const scope = `org/${organizationId}/project/${projectId}/environment/platform-admin`;
                await transaction.$queryRaw`SELECT set_config('app.current_tenant_id', ${scope}, true)`;
                const resolved = await transaction.$queryRaw<Array<{ resolve_platform_audit_intent: boolean }>>`
                    SELECT public.resolve_platform_audit_intent(
                        ${intentId}, 'COMMITTED', NULL, ${BigInt(previousMonthlyApiCalls)}
                    ) AS resolve_platform_audit_intent
                `;
                if (!resolved[0]?.resolve_platform_audit_intent) {
                    throw new Error('Audit intent could not be resolved in the usage transaction.');
                }
                const project = rows[0] ? toProject(rows[0]) : undefined;
                if (project) {
                    project.previousMonthlyApiCalls = previousMonthlyApiCalls;
                }
                return project;
            });
        },
        async incrementRateLimit(
            scopeType: 'project' | 'key' | 'ip',
            scopeId: string,
            limit: number,
            windowSeconds = 60,
            customWindowStart?: Date
        ): Promise<{
            allowed: boolean;
            currentCount: number;
            limit: number;
            remaining: number;
            resetSeconds: number;
        }> {
            const windowMs = windowSeconds * 1000;
            const now = customWindowStart ? customWindowStart.getTime() : Date.now();
            const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
            const expiresAt = new Date(windowStart.getTime() + windowMs * 2);
            const resetSeconds = Math.max(1, Math.ceil((windowStart.getTime() + windowMs - now) / 1000));

            try {
                const rows = await client.$queryRaw<Array<{ requestCount: bigint }>>`
                    INSERT INTO "PlatformRateLimitBucket" ("scopeType", "scopeId", "windowStart", "requestCount", "expiresAt")
                    VALUES (${scopeType}, ${scopeId}, ${windowStart}, 1, ${expiresAt})
                    ON CONFLICT ("scopeType", "scopeId", "windowStart")
                    DO UPDATE SET "requestCount" = "PlatformRateLimitBucket"."requestCount" + 1
                    RETURNING "requestCount"
                `;
                const currentCount = Number(rows[0]?.requestCount || 1);
                const allowed = currentCount <= limit;
                const remaining = Math.max(0, limit - currentCount);
                return { allowed, currentCount, limit, remaining, resetSeconds };
            } catch (err: any) {
                if (
                    err?.code === '23514' ||
                    err?.message?.includes('no partition of relation') ||
                    err?.message?.includes('check constraint')
                ) {
                    throw new PlatformRateLimitPartitionExhaustedError(
                        `Platform rate limit table partition runway exhausted for window ${windowStart.toISOString()}: ${err.message}`
                    );
                }
                throw err;
            }
        },
        async decrementRateLimit(
            scopeType: 'project' | 'key' | 'ip',
            scopeId: string,
            windowSeconds = 60,
            customWindowStart?: Date
        ): Promise<void> {
            const now = customWindowStart || new Date();
            const windowMs = windowSeconds * 1000;
            const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
            await client.$queryRaw`
                UPDATE "PlatformRateLimitBucket"
                SET "requestCount" = GREATEST(0, "requestCount" - 1)
                WHERE "scopeType" = ${scopeType}::"PlatformRateLimitScope"
                  AND "scopeId" = ${scopeId}
                  AND "windowStart" = ${windowStart}
            `.catch(() => {});
        },
        async checkRateLimits(
            scopes: Array<{ scopeType: 'project' | 'key' | 'ip'; scopeId: string; limit: number }>,
            windowSeconds = 60,
            customWindowStart?: Date
        ): Promise<{
            allowed: boolean;
            exceededScope?: { scopeType: string; scopeId: string; limit: number; currentCount: number };
            limit: number;
            remaining: number;
            resetSeconds: number;
        }> {
            // Check in order of strictness: lowest limit checked first
            const sortedScopes = [...scopes].sort((a, b) => a.limit - b.limit);
            const incrementedScopes: Array<{ scopeType: 'project' | 'key' | 'ip'; scopeId: string }> = [];

            let minRemaining = Number.POSITIVE_INFINITY;
            let maxResetSeconds = 1;
            let effectiveLimit = 1200;

            for (const scope of sortedScopes) {
                const result = await this.incrementRateLimit(
                    scope.scopeType,
                    scope.scopeId,
                    scope.limit,
                    windowSeconds,
                    customWindowStart
                );
                incrementedScopes.push(scope);
                if (result.limit < effectiveLimit) effectiveLimit = result.limit;
                if (result.remaining < minRemaining) minRemaining = result.remaining;
                if (result.resetSeconds > maxResetSeconds) maxResetSeconds = result.resetSeconds;

                if (!result.allowed) {
                    // Compensation: revert any previously incremented scopes in this request
                    // so a rejected request does not consume other scopes' budgets unfairly
                    for (const prevScope of incrementedScopes) {
                        await this.decrementRateLimit(prevScope.scopeType, prevScope.scopeId, windowSeconds, customWindowStart);
                    }
                    return {
                        allowed: false,
                        exceededScope: {
                            scopeType: scope.scopeType,
                            scopeId: scope.scopeId,
                            limit: scope.limit,
                            currentCount: result.currentCount,
                        },
                        limit: scope.limit,
                        remaining: 0,
                        resetSeconds: result.resetSeconds,
                    };
                }
            }

            return {
                allowed: true,
                limit: Number.isFinite(effectiveLimit) ? effectiveLimit : 1200,
                remaining: Number.isFinite(minRemaining) ? minRemaining : 1200,
                resetSeconds: maxResetSeconds,
            };
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
            let verifiers: string[];
            if (serverPepper) {
                verifiers = [PlatformKeyEngine.computeAuthVerifier(rawSecret, serverPepper)];
            } else {
                try {
                    const ring = loadPepperRing();
                    verifiers = candidateVerifiers(ring, rawSecret).map((c) => c.verifier);
                } catch {
                    verifiers = [PlatformKeyEngine.computeAuthVerifier(rawSecret)];
                }
            }
            const rows = await client.platformApiKey.findMany({
                where: { authVerifier: { in: verifiers } },
                include: { environment: { select: { projectId: true } } },
                take: 2,
            });
            if (rows.length > 1) {
                throw new Error('verifier collision');
            }
            return rows[0] ? mapKey(rows[0]) : undefined;
        },
        async authorizeApiKey(rawSecret: string): Promise<PlatformAuthorizationLookup> {
            let verifiers: string[];
            try {
                const ring = loadPepperRing();
                verifiers = candidateVerifiers(ring, rawSecret).map((c) => c.verifier);
            } catch {
                verifiers = [PlatformKeyEngine.computeAuthVerifier(rawSecret)];
            }
            const rows = await client.$queryRaw<Array<{ key_data: RawRow; project_data: RawRow; environment_data: RawRow }>>`
        SELECT to_jsonb(k) AS key_data,
               to_jsonb(p) AS project_data,
               to_jsonb(e) AS environment_data
        FROM "PlatformApiKey" k
        JOIN "ProjectEnvironment" e ON e."id" = k."environmentId"
        JOIN "PlatformProject" p ON p."id" = e."projectId"
        WHERE k."authVerifier" = ANY(${verifiers}::text[])
        LIMIT 2
      `;
            if (rows.length > 1) {
                throw new Error('verifier collision');
            }
            const row = rows[0];
            return {
                key: row ? toKey({ ...row.key_data, environment: row.environment_data }) : null,
                project: row ? toProject(row.project_data) : null,
                environment: row ? toEnvironment(row.environment_data) : null,
                queryCount: 1,
                source: 'prisma',
            };
        },
        async getApiKeyPepperDistribution(): Promise<Record<string, number>> {
            const rows = await client.$queryRaw<Array<{ pepper_id: string | null; key_count: bigint }>>`
                SELECT COALESCE(k."verifierPepperId", 'legacy') AS pepper_id,
                       COUNT(*)::bigint AS key_count
                FROM "PlatformApiKey" k
                GROUP BY COALESCE(k."verifierPepperId", 'legacy')
            `;
            const report: Record<string, number> = {};
            for (const r of rows) {
                report[r.pepper_id || 'legacy'] = Number(r.key_count);
            }
            return report;
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
        async recordKeyUsage(keyId: string, clientIp?: string, force = false): Promise<void> {
            const now = Date.now();
            const lastWritten = keyUsageThrottleMap.get(keyId) || 0;
            const throttleDisabled = process.env.ORBITOX_DISABLE_KEY_USAGE_THROTTLE === 'true';
            if (!force && !throttleDisabled && (now - lastWritten < KEY_USAGE_THROTTLE_INTERVAL_MS)) {
                return; // Throttled / sampled: avoids hot-row lock contention on PlatformApiKey
            }
            keyUsageThrottleMap.set(keyId, now);
            await client.platformApiKey.updateMany({
                where: { OR: [{ id: keyId }, { keyId }] },
                data: { lastUsedAt: new Date(now), ...(clientIp ? { lastUsedIp: clientIp } : {}) },
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
            if (isSamplePackage(packageId)) {
                throw new Error(`Package [${packageId}] is not installable: sample-data plugin pending HospitalOS multi-tenant rebuild.`);
            }
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
        async listPluginInstallations(tenantId?: string): Promise<PluginInstallationRecord[]> {
            return (await client.pluginInstallation.findMany({
                where: tenantId ? { tenantId } : undefined,
                orderBy: { createdAt: 'desc' },
            })).map(toPluginInstallation);
        },
        async getPluginInstallation(tenantId: string, pluginId: string): Promise<PluginInstallationRecord | undefined> {
            const canonical = canonicalizePluginId(pluginId);
            const trimmedTenantId = (tenantId || '').trim();
            if (!trimmedTenantId) return undefined;

            let candidateTenantIds = [trimmedTenantId];
            if (!TENANT_RE.test(trimmedTenantId)) {
                const proj = await client.platformProject.findFirst({
                    where: { OR: [{ id: trimmedTenantId }, { slug: trimmedTenantId.toLowerCase() }] },
                    include: { organization: true },
                });
                if (proj && proj.organization) {
                    candidateTenantIds.push(`org/${proj.organization.slug}/project/${proj.slug}/environment/production`);
                }
            }

            const row = await client.pluginInstallation.findFirst({
                where: {
                    tenantId: { in: candidateTenantIds },
                    pluginId: { in: [canonical, pluginId, canonical.replace(/^@orbitox\//, '')] },
                },
            });
            return row ? toPluginInstallation(row) : undefined;
        },
        async provisionPluginInstallation(input: ProvisionPluginInstallationInput): Promise<PluginInstallationRecord> {
            const rawTenantId = input.tenantId?.trim();
            const pluginId = canonicalizePluginId(input.pluginId);
            const runtimeTenantId = input.runtimeTenantId?.trim();

            if (!rawTenantId) throw new Error('Field "tenantId" is required for plugin installation.');
            if (!pluginId) throw new Error('Field "pluginId" is required for plugin installation.');
            if (!runtimeTenantId || !TENANT_RE.test(runtimeTenantId)) {
                throw new Error(
                    `Target runtime tenant ID "${runtimeTenantId}" is not in canonical format (org/{org}/project/{proj}/environment/{env}).`
                );
            }

            return await client.$transaction(async (tx) => {
                const existing = await tx.pluginInstallation.findFirst({
                    where: {
                        tenantId: rawTenantId,
                        OR: [
                            { pluginId },
                            { pluginId: canonicalizePluginId(pluginId) },
                            { pluginId: canonicalizePluginId(pluginId).replace(/^@orbitox\//, '') },
                        ],
                    },
                });

                // Anti-claim protection: check if another tenant already claimed this runtimeTenantId for this plugin
                const existingClaim = await tx.pluginInstallation.findFirst({
                    where: {
                        pluginId,
                        runtimeTenantId,
                        NOT: { tenantId: rawTenantId },
                    },
                });
                if (existingClaim) {
                    const err = new Error(
                        `Runtime tenant "${runtimeTenantId}" for plugin "${pluginId}" is already claimed by tenant "${existingClaim.tenantId}".`
                    );
                    (err as any).code = 'RUNTIME_TENANT_ALREADY_CLAIMED';
                    throw err;
                }

                // Rule 5: Provisioning never overwrites an existing runtimeTenantId
                if (existing && existing.runtimeTenantId && existing.runtimeTenantId !== runtimeTenantId) {
                    throw new Error(
                        `Provisioning cannot overwrite existing runtimeTenantId "${existing.runtimeTenantId}" with "${runtimeTenantId}".`
                    );
                }

                const targetStatus = (input.status as any) || (existing ? existing.status : 'ACTIVE');

                // Rule 5: Provisioning never turns ARCHIVED back to ACTIVE
                if (existing && existing.status === 'ARCHIVED' && targetStatus !== 'ARCHIVED') {
                    const err = new Error(
                        `Provisioning cannot turn an ARCHIVED installation back to ${targetStatus}. Re-activation is an explicit, audited admin action.`
                    );
                    (err as any).code = 'ARCHIVED_RESURRECTION_REFUSED';
                    throw err;
                }

                if (existing && existing.status !== targetStatus) {
                    assertValidInstallationTransition(existing.status, targetStatus, false);
                }

                const nextRevision = existing ? existing.entitlementRevision + 1 : (input.entitlementRevision ?? 1);

                const row = await tx.pluginInstallation.upsert({
                    where: { tenantId_pluginId: { tenantId: rawTenantId, pluginId } },
                    create: {
                        id: `pinst_${crypto.randomUUID()}`,
                        tenantId: rawTenantId,
                        pluginId,
                        runtimeTenantId,
                        status: targetStatus,
                        entitlementRevision: nextRevision,
                        planId: input.planId || null,
                        config: input.config || {},
                    },
                    update: {
                        runtimeTenantId,
                        status: targetStatus,
                        entitlementRevision: nextRevision,
                        planId: input.planId !== undefined ? input.planId : undefined,
                        config: input.config !== undefined ? input.config : undefined,
                    },
                });

                await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${rawTenantId}, true)`;
                await tx.platformOutboxMessage.create({
                    data: {
                        id: `outbox_${crypto.randomUUID()}`,
                        tenantId: rawTenantId,
                        eventType: 'entitlement.updated',
                        aggregateType: 'PluginInstallation',
                        aggregateId: row.id,
                        payload: {
                            tenantId: rawTenantId,
                            pluginId,
                            runtimeTenantId,
                            status: targetStatus,
                            planId: row.planId,
                            entitlementRevision: row.entitlementRevision,
                            updatedAt: new Date().toISOString(),
                        },
                        status: 'PENDING',
                        retryCount: 0,
                    },
                });

                return toPluginInstallation(row);
            });
        },
        async updatePluginInstallationStatus(
            tenantId: string,
            pluginId: string,
            status: PluginInstallationStatus | string
        ): Promise<PluginInstallationRecord> {
            const canonical = canonicalizePluginId(pluginId);
            return await client.$transaction(async (tx) => {
                const existing = await tx.pluginInstallation.findFirst({
                    where: {
                        tenantId,
                        OR: [
                            { pluginId: canonical },
                            { pluginId },
                            { pluginId: canonical.replace(/^@orbitox\//, '') },
                        ],
                    },
                });
                if (!existing) {
                    throw new Error(`Plugin installation for tenant "${tenantId}" and plugin "${canonical}" not found.`);
                }

                assertValidInstallationTransition(existing.status, String(status), false);

                const row = await tx.pluginInstallation.update({
                    where: { id: existing.id },
                    data: {
                        status: status as any,
                        entitlementRevision: { increment: 1 },
                    },
                });

                await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
                await tx.platformOutboxMessage.create({
                    data: {
                        id: `outbox_${crypto.randomUUID()}`,
                        tenantId,
                        eventType: 'entitlement.updated',
                        aggregateType: 'PluginInstallation',
                        aggregateId: row.id,
                        payload: {
                            tenantId,
                            pluginId: canonical,
                            runtimeTenantId: row.runtimeTenantId,
                            status: row.status,
                            planId: row.planId,
                            entitlementRevision: row.entitlementRevision,
                            updatedAt: new Date().toISOString(),
                        },
                        status: 'PENDING',
                        retryCount: 0,
                    },
                });

                return toPluginInstallation(row);
            });
        },
        async uninstallPluginInstallation(
            tenantId: string,
            pluginId: string
        ): Promise<PluginInstallationRecord> {
            const canonical = canonicalizePluginId(pluginId);
            return await client.$transaction(async (tx) => {
                const existing = await tx.pluginInstallation.findFirst({
                    where: {
                        tenantId,
                        OR: [
                            { pluginId: canonical },
                            { pluginId },
                            { pluginId: canonical.replace(/^@orbitox\//, '') },
                        ],
                    },
                });
                if (!existing) {
                    throw new Error(`Plugin installation for tenant "${tenantId}" and plugin "${canonical}" not found.`);
                }

                assertValidInstallationTransition(existing.status, 'ARCHIVED', false);

                const row = await tx.pluginInstallation.update({
                    where: { id: existing.id },
                    data: {
                        status: 'ARCHIVED',
                        entitlementRevision: { increment: 1 },
                    },
                });

                await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
                await tx.platformOutboxMessage.create({
                    data: {
                        id: `outbox_${crypto.randomUUID()}`,
                        tenantId,
                        eventType: 'entitlement.updated',
                        aggregateType: 'PluginInstallation',
                        aggregateId: row.id,
                        payload: {
                            tenantId,
                            pluginId: canonical,
                            runtimeTenantId: row.runtimeTenantId,
                            status: 'ARCHIVED',
                            planId: row.planId,
                            entitlementRevision: row.entitlementRevision,
                            updatedAt: new Date().toISOString(),
                        },
                        status: 'PENDING',
                        retryCount: 0,
                    },
                });

                return toPluginInstallation(row);
            });
        },
        async reactivatePluginInstallation(
            tenantId: string,
            pluginId: string,
            adminActor?: { actorId?: string; actorEmail?: string; reason?: string }
        ): Promise<PluginInstallationRecord> {
            const canonical = canonicalizePluginId(pluginId);
            return await client.$transaction(async (tx) => {
                const existing = await tx.pluginInstallation.findFirst({
                    where: {
                        tenantId,
                        OR: [
                            { pluginId: canonical },
                            { pluginId },
                            { pluginId: canonical.replace(/^@orbitox\//, '') },
                        ],
                    },
                });
                if (!existing) {
                    throw new Error(`Plugin installation for tenant "${tenantId}" and plugin "${canonical}" not found.`);
                }
                if (existing.status !== 'ARCHIVED') {
                    throw new Error(`Only ARCHIVED plugin installations may be reactivated (current status is "${existing.status}").`);
                }

                assertValidInstallationTransition(existing.status, 'ACTIVE', true);

                const row = await tx.pluginInstallation.update({
                    where: { id: existing.id },
                    data: {
                        status: 'ACTIVE',
                        entitlementRevision: { increment: 1 },
                    },
                });

                await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
                await tx.platformOutboxMessage.create({
                    data: {
                        id: `outbox_${crypto.randomUUID()}`,
                        tenantId,
                        eventType: 'entitlement.updated',
                        aggregateType: 'PluginInstallation',
                        aggregateId: row.id,
                        payload: {
                            tenantId,
                            pluginId: canonical,
                            runtimeTenantId: row.runtimeTenantId,
                            status: 'ACTIVE',
                            planId: row.planId,
                            entitlementRevision: row.entitlementRevision,
                            reactivatedBy: adminActor?.actorEmail || adminActor?.actorId || 'platform-admin',
                            reason: adminActor?.reason || 'Administrative reactivation',
                            updatedAt: new Date().toISOString(),
                        },
                        status: 'PENDING',
                        retryCount: 0,
                    },
                });

                return toPluginInstallation(row);
            });
        },
        async changePluginInstallationPlan(
            tenantId: string,
            pluginId: string,
            newPlanId: string
        ): Promise<PluginInstallationRecord> {
            const canonical = canonicalizePluginId(pluginId);
            return await client.$transaction(async (tx) => {
                const existing = await tx.pluginInstallation.findFirst({
                    where: {
                        tenantId,
                        OR: [
                            { pluginId: canonical },
                            { pluginId },
                            { pluginId: canonical.replace(/^@orbitox\//, '') },
                        ],
                    },
                });
                if (!existing) {
                    throw new Error(`Plugin installation for tenant "${tenantId}" and plugin "${canonical}" not found.`);
                }

                const plan = await tx.plan.findUnique({ where: { planId: newPlanId } });
                if (!plan) {
                    throw new Error(`Plan "${newPlanId}" not found in Plan Catalogue.`);
                }

                const row = await tx.pluginInstallation.update({
                    where: { id: existing.id },
                    data: {
                        planId: newPlanId,
                        entitlementRevision: { increment: 1 },
                    },
                });

                await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
                await tx.platformOutboxMessage.create({
                    data: {
                        id: `outbox_${crypto.randomUUID()}`,
                        tenantId,
                        eventType: 'entitlement.updated',
                        aggregateType: 'PluginInstallation',
                        aggregateId: row.id,
                        payload: {
                            tenantId,
                            pluginId: canonical,
                            runtimeTenantId: row.runtimeTenantId,
                            status: row.status,
                            planId: newPlanId,
                            entitlementRevision: row.entitlementRevision,
                            action: 'plan.changed',
                            updatedAt: new Date().toISOString(),
                        },
                        status: 'PENDING',
                        retryCount: 0,
                    },
                });

                return toPluginInstallation(row);
            });
        },
        async checkQuotaUsage(
            tenantId: string,
            pluginId: string,
            quotaKey: string,
            currentCount: number,
            requestedIncrement = 1
        ): Promise<{ allowed: boolean; limit?: number; currentCount: number; remaining?: number; reason?: string }> {
            const canonical = canonicalizePluginId(pluginId);
            const row = await client.pluginInstallation.findFirst({
                where: {
                    tenantId,
                    OR: [
                        { pluginId: canonical },
                        { pluginId },
                        { pluginId: canonical.replace(/^@orbitox\//, '') },
                    ],
                },
            });
            if (!row) {
                return { allowed: false, currentCount, reason: 'NOT_INSTALLED' };
            }
            if (!row.planId) {
                return { allowed: false, currentCount, reason: 'NO_PLAN' };
            }
            if (row.status !== 'ACTIVE' && row.status !== 'READ_ONLY') {
                return { allowed: false, currentCount, reason: `INSTALLATION_${row.status}` };
            }
            if (row.status === 'READ_ONLY' && requestedIncrement > 0) {
                return { allowed: false, currentCount, reason: 'READ_ONLY' };
            }

            const quota = await client.planQuota.findUnique({
                where: { planId_quotaKey: { planId: row.planId, quotaKey } },
            });
            if (!quota) {
                return { allowed: true, currentCount };
            }

            // If it's a read (requestedIncrement === 0), it is always allowed
            if (requestedIncrement === 0) {
                return {
                    allowed: true,
                    limit: quota.limit,
                    currentCount,
                    remaining: Math.max(0, quota.limit - currentCount),
                };
            }

            if (currentCount + requestedIncrement > quota.limit) {
                return {
                    allowed: false,
                    limit: quota.limit,
                    currentCount,
                    remaining: Math.max(0, quota.limit - currentCount),
                    reason: `QUOTA_EXCEEDED: Quota "${quotaKey}" exceeded (current: ${currentCount}, limit: ${quota.limit}, requested: +${requestedIncrement}). Writes blocked, reads permitted.`,
                };
            }

            return {
                allowed: true,
                limit: quota.limit,
                currentCount,
                remaining: quota.limit - (currentCount + requestedIncrement),
            };
        },
        async listPlugins(): Promise<PluginCatalogueItem[]> {
            const rows = await client.plugin.findMany({ orderBy: { pluginId: 'asc' } });
            return rows.map(toPluginRecord);
        },
        async getPlugin(pluginId: string): Promise<PluginCatalogueItem | undefined> {
            const canonical = canonicalizePluginId(pluginId);
            const row = await client.plugin.findFirst({
                where: { OR: [{ pluginId: canonical }, { pluginId }] },
            });
            return row ? toPluginRecord(row) : undefined;
        },
        async listPlans(pluginId?: string): Promise<PlanCatalogueRecord[]> {
            const canonical = pluginId ? canonicalizePluginId(pluginId) : undefined;
            const rows = await client.plan.findMany({
                where: canonical ? { pluginId: canonical } : undefined,
                include: { features: true, quotas: true },
                orderBy: { priceMinor: 'asc' },
            });
            return rows.map(toPlan);
        },
        async getPlan(planId: string): Promise<PlanCatalogueRecord | undefined> {
            const row = await client.plan.findUnique({
                where: { planId },
                include: { features: true, quotas: true },
            });
            return row ? toPlan(row) : undefined;
        },
        async createPlan(input: {
            planId: string;
            pluginId: string;
            name: string;
            description?: string;
            tier?: string;
            priceMinor?: number;
            currency?: string;
            billingInterval?: string;
            gracePeriodDays?: number;
            suspensionGraceDays?: number;
            status?: string;
            features?: Array<{ featureKey: string; description?: string; enabled?: boolean }>;
            quotas?: Array<{ quotaKey: string; limit: number; window?: string; unit?: string }>;
        }): Promise<PlanCatalogueRecord> {
            const canonicalPlugin = canonicalizePluginId(input.pluginId);
            return await client.$transaction(async (tx) => {
                const planRow = await tx.plan.create({
                    data: {
                        id: `plan_${crypto.randomUUID()}`,
                        planId: input.planId,
                        pluginId: canonicalPlugin,
                        name: input.name,
                        description: input.description || null,
                        tier: input.tier || 'starter',
                        priceMinor: input.priceMinor ?? 0,
                        currency: input.currency || 'INR',
                        billingInterval: input.billingInterval || 'month',
                        gracePeriodDays: input.gracePeriodDays ?? 7,
                        suspensionGraceDays: input.suspensionGraceDays ?? 30,
                        status: input.status || 'ACTIVE',
                    },
                });

                if (input.features && Array.isArray(input.features)) {
                    for (const f of input.features) {
                        await tx.planFeature.create({
                            data: {
                                id: `pf_${crypto.randomUUID()}`,
                                planId: input.planId,
                                featureKey: f.featureKey,
                                description: f.description || null,
                                enabled: f.enabled !== undefined ? f.enabled : true,
                            },
                        });
                    }
                }

                if (input.quotas && Array.isArray(input.quotas)) {
                    for (const q of input.quotas) {
                        await tx.planQuota.create({
                            data: {
                                id: `pq_${crypto.randomUUID()}`,
                                planId: input.planId,
                                quotaKey: q.quotaKey,
                                limit: q.limit,
                                window: q.window || 'none',
                                unit: q.unit || 'records',
                            },
                        });
                    }
                }

                const created = await tx.plan.findUnique({
                    where: { planId: input.planId },
                    include: { features: true, quotas: true },
                });
                return toPlan(created!);
            });
        },
        async updatePlan(planId: string, updates: Partial<PlanCatalogueRecord>): Promise<PlanCatalogueRecord> {
            return await client.$transaction(async (tx) => {
                const existing = await tx.plan.findUnique({
                    where: { planId },
                    include: { features: true, quotas: true },
                });
                if (!existing) {
                    throw new Error(`Plan "${planId}" not found.`);
                }

                await tx.plan.update({
                    where: { planId },
                    data: {
                        name: updates.name !== undefined ? updates.name : undefined,
                        description: updates.description !== undefined ? updates.description : undefined,
                        tier: updates.tier !== undefined ? updates.tier : undefined,
                        priceMinor: updates.priceMinor !== undefined ? updates.priceMinor : undefined,
                        currency: updates.currency !== undefined ? updates.currency : undefined,
                        billingInterval: updates.billingInterval !== undefined ? updates.billingInterval : undefined,
                        gracePeriodDays: updates.gracePeriodDays !== undefined ? updates.gracePeriodDays : undefined,
                        suspensionGraceDays: updates.suspensionGraceDays !== undefined ? updates.suspensionGraceDays : undefined,
                        status: updates.status !== undefined ? updates.status : undefined,
                    },
                });

                if (updates.features && Array.isArray(updates.features)) {
                    for (const feat of updates.features) {
                        await tx.planFeature.upsert({
                            where: { planId_featureKey: { planId, featureKey: feat.featureKey } },
                            create: {
                                id: `pf_${crypto.randomUUID()}`,
                                planId,
                                featureKey: feat.featureKey,
                                description: feat.description || null,
                                enabled: feat.enabled !== undefined ? feat.enabled : true,
                            },
                            update: {
                                description: feat.description !== undefined ? feat.description : undefined,
                                enabled: feat.enabled !== undefined ? feat.enabled : undefined,
                            },
                        });
                    }
                }

                if (updates.quotas && Array.isArray(updates.quotas)) {
                    for (const quota of updates.quotas) {
                        await tx.planQuota.upsert({
                            where: { planId_quotaKey: { planId, quotaKey: quota.quotaKey } },
                            create: {
                                id: `pq_${crypto.randomUUID()}`,
                                planId,
                                quotaKey: quota.quotaKey,
                                limit: quota.limit,
                                window: quota.window || 'none',
                                unit: quota.unit || 'records',
                            },
                            update: {
                                limit: quota.limit !== undefined ? quota.limit : undefined,
                                window: quota.window !== undefined ? quota.window : undefined,
                                unit: quota.unit !== undefined ? quota.unit : undefined,
                            },
                        });
                    }
                }

                // Requirement Part B: A plan change bumps the revision of every affected installation.
                // Requirement Part C: writes an outbox row, in the same transaction.
                const affectedInstallations = await tx.pluginInstallation.findMany({
                    where: { planId },
                });

                for (const inst of affectedInstallations) {
                    const updatedInst = await tx.pluginInstallation.update({
                        where: { id: inst.id },
                        data: { entitlementRevision: { increment: 1 } },
                    });

                    await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${inst.tenantId}, true)`;
                    await tx.platformOutboxMessage.create({
                        data: {
                            id: `outbox_${crypto.randomUUID()}`,
                            tenantId: inst.tenantId,
                            eventType: 'entitlement.updated',
                            aggregateType: 'PluginInstallation',
                            aggregateId: inst.id,
                            payload: {
                                tenantId: inst.tenantId,
                                pluginId: inst.pluginId,
                                runtimeTenantId: inst.runtimeTenantId,
                                status: inst.status,
                                planId,
                                entitlementRevision: updatedInst.entitlementRevision,
                                reason: 'plan.updated',
                                updatedAt: new Date().toISOString(),
                            },
                            status: 'PENDING',
                            retryCount: 0,
                        },
                    });
                }

                const updated = await tx.plan.findUnique({
                    where: { planId },
                    include: { features: true, quotas: true },
                });
                return toPlan(updated!);
            });
        },
        async ensurePlanCatalogueSeeded(): Promise<void> {
            for (const p of SEED_PLUGINS) {
                await client.plugin.upsert({
                    where: { pluginId: p.pluginId },
                    create: {
                        id: `plug_${crypto.randomUUID()}`,
                        pluginId: p.pluginId,
                        name: p.name,
                        description: p.description || null,
                        version: p.version || '1.0.0',
                        status: p.status || 'ACTIVE',
                    },
                    update: {
                        name: p.name,
                        description: p.description || null,
                        version: p.version || '1.0.0',
                        status: p.status || 'ACTIVE',
                    },
                });
            }

            for (const pl of SEED_PLANS) {
                await client.plan.upsert({
                    where: { planId: pl.planId },
                    create: {
                        id: `plan_${crypto.randomUUID()}`,
                        planId: pl.planId,
                        pluginId: pl.pluginId,
                        name: pl.name,
                        description: pl.description || null,
                        tier: pl.tier,
                        priceMinor: pl.priceMinor,
                        currency: pl.currency,
                        billingInterval: pl.billingInterval,
                        gracePeriodDays: pl.gracePeriodDays,
                        suspensionGraceDays: pl.suspensionGraceDays,
                        status: pl.status,
                    },
                    update: {
                        name: pl.name,
                        description: pl.description || null,
                        tier: pl.tier,
                        priceMinor: pl.priceMinor,
                        currency: pl.currency,
                        billingInterval: pl.billingInterval,
                        gracePeriodDays: pl.gracePeriodDays,
                        suspensionGraceDays: pl.suspensionGraceDays,
                        status: pl.status,
                    },
                });

                for (const f of pl.features) {
                    await client.planFeature.upsert({
                        where: { planId_featureKey: { planId: pl.planId, featureKey: f.featureKey } },
                        create: {
                            id: `pf_${crypto.randomUUID()}`,
                            planId: pl.planId,
                            featureKey: f.featureKey,
                            description: f.description || null,
                            enabled: f.enabled,
                        },
                        update: {
                            description: f.description || null,
                            enabled: f.enabled,
                        },
                    });
                }

                for (const q of pl.quotas) {
                    await client.planQuota.upsert({
                        where: { planId_quotaKey: { planId: pl.planId, quotaKey: q.quotaKey } },
                        create: {
                            id: `pq_${crypto.randomUUID()}`,
                            planId: pl.planId,
                            quotaKey: q.quotaKey,
                            limit: q.limit,
                            window: q.window,
                            unit: q.unit,
                        },
                        update: {
                            limit: q.limit,
                            window: q.window,
                            unit: q.unit,
                        },
                    });
                }
            }
        },
        async listOutboxMessages(status?: string): Promise<PlatformOutboxRecord[]> {
            const rows = await outboxRelayClient.platformOutboxMessage.findMany({
                where: status ? { status: status as any } : undefined,
                orderBy: { createdAt: 'asc' },
            });
            return rows.map((r) => ({
                id: r.id,
                tenantId: r.tenantId,
                eventType: r.eventType,
                aggregateType: r.aggregateType,
                aggregateId: r.aggregateId,
                payload: (r.payload || {}) as Record<string, any>,
                status: r.status as any,
                retryCount: r.retryCount,
                lastError: r.lastError ?? undefined,
                createdAt: r.createdAt.toISOString(),
                dispatchedAt: r.dispatchedAt ? r.dispatchedAt.toISOString() : undefined,
            }));
        },
        async updateOutboxMessage(
            id: string,
            updates: { status?: 'PENDING' | 'DISPATCHED' | 'FAILED'; retryCount?: number; lastError?: string; dispatchedAt?: Date }
        ): Promise<void> {
            await outboxRelayClient.platformOutboxMessage.update({
                where: { id },
                data: {
                    status: updates.status,
                    retryCount: updates.retryCount,
                    lastError: updates.lastError,
                    dispatchedAt: updates.dispatchedAt,
                },
            });
        },
        async recordOutboxMessage(input: {
            tenantId: string;
            eventType: string;
            aggregateType: string;
            aggregateId: string;
            payload: Record<string, any>;
        }): Promise<PlatformOutboxRecord> {
            return client.$transaction(async (tx) => {
                await tx.$queryRaw`SELECT set_config('app.current_tenant_id', ${input.tenantId}, true)`;
                const row = await tx.platformOutboxMessage.create({
                    data: {
                        id: `outbox_${crypto.randomUUID()}`,
                        tenantId: input.tenantId,
                        eventType: input.eventType,
                        aggregateType: input.aggregateType,
                        aggregateId: input.aggregateId,
                        payload: input.payload,
                        status: 'PENDING',
                        retryCount: 0,
                    },
                });
                return {
                    id: row.id,
                    tenantId: row.tenantId,
                    eventType: row.eventType,
                    aggregateType: row.aggregateType,
                    aggregateId: row.aggregateId,
                    payload: (row.payload || {}) as Record<string, any>,
                    status: row.status as any,
                    retryCount: row.retryCount,
                    lastError: row.lastError ?? undefined,
                    createdAt: row.createdAt.toISOString(),
                    dispatchedAt: row.dispatchedAt ? row.dispatchedAt.toISOString() : undefined,
                };
            });
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

/**
 * S3-6 ARCHITECTURAL POLICY:
 * The legacy in-memory/JSON platform repository adapter relies on non-atomic read-modify-write
 * sequences for quota checks and usage increments. It is STRICTLY RESTRICTED to local development
 * and unit tests where concurrency guarantees are not required.
 *
 * In production or whenever NODE_ENV is unset/production, Prisma with PostgreSQL 16 is MANDATORY.
 * PostgreSQL executes atomic transactions with `FOR UPDATE` row locking to prevent race conditions.
 */
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

let outboxRelayClient: PrismaClient | null = null;

function getPrismaRepository(): ReturnType<typeof createPrismaPlatformRepository> {
    if (prismaRepository) return prismaRepository;
    const runtimeUrl = process.env.APP_DATABASE_URL || (!prismaIsRequired() ? process.env.DATABASE_URL : undefined);
    const auditUrl = process.env.PLATFORM_AUDIT_DATABASE_URL;
    const relayUrl = process.env.OUTBOX_RELAY_DATABASE_URL || runtimeUrl;
    if (!runtimeUrl) throw new Error('DATABASE_URL is required for the platform repository.');
    if (!auditUrl) throw new Error('PLATFORM_AUDIT_DATABASE_URL is required for platform-admin audit writes.');
    runtimeClient = new PrismaClient({ datasources: { db: { url: runtimeUrl } } });
    auditClient = new PrismaClient({ datasources: { db: { url: auditUrl } } });
    outboxRelayClient = relayUrl && relayUrl !== runtimeUrl
        ? new PrismaClient({ datasources: { db: { url: relayUrl } } })
        : runtimeClient;
    prismaRepository = createPrismaPlatformRepository(runtimeClient, auditClient, outboxRelayClient);
    return prismaRepository;
}

const jsonRateLimitBuckets = new Map<string, number>();

const extraMethods = {
    isPrismaBacked: () => prismaIsRequired(),
    authorizeApiKey: async (rawSecret: string): Promise<PlatformAuthorizationLookup> => {
        if (prismaIsRequired()) return getPrismaRepository().authorizeApiKey(rawSecret);
        const key = PlatformRepository.findKeyByRawSecret(rawSecret) || null;
        const project = key ? PlatformRepository.getProject(key.projectId) || null : null;
        const environment = key ? PlatformRepository.getEnvironment(key.environmentId) || null : null;
        return { key, project, environment, queryCount: 0, source: 'legacy' };
    },
    getApiKeyPepperDistribution: async (): Promise<Record<string, number>> => {
        if (prismaIsRequired()) return getPrismaRepository().getApiKeyPepperDistribution();
        return { legacy: PlatformRepository.listApiKeys().length };
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
        periodKey?: string,
    ): Promise<PlatformProject | undefined> => {
        if (prismaIsRequired()) return getPrismaRepository().setProjectUsageWithAuditIntent(projectId, organizationId, monthlyApiCalls, intentId, periodKey);
        const existing = await platformRepository.getProject(projectId);
        const previousMonthlyApiCalls = existing?.monthlyApiCalls ?? 0;
        const project = await platformRepository.setProjectUsage(projectId, monthlyApiCalls);
        if (project) {
            project.previousMonthlyApiCalls = previousMonthlyApiCalls;
            if (periodKey) (project as any).currentBillingPeriod = periodKey;
        }
        const event = PlatformRepository.listAuditEvents().find((item) => item.id === intentId);
        if (event) {
            event.status = project ? 'COMMITTED' : 'FAILED';
            event.failureReason = project ? undefined : 'Project no longer exists.';
            if (project) {
                event.metadata = { ...(event.metadata || {}), previousValue: previousMonthlyApiCalls };
            }
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
    listPluginInstallations: async (tenantId?: string): Promise<PluginInstallationRecord[]> => {
        if (prismaIsRequired()) return getPrismaRepository().listPluginInstallations(tenantId);
        return PlatformRepository.listPluginInstallations(tenantId);
    },
    getPluginInstallation: async (tenantId: string, pluginId: string): Promise<PluginInstallationRecord | undefined> => {
        if (prismaIsRequired()) return getPrismaRepository().getPluginInstallation(tenantId, pluginId);
        return PlatformRepository.getPluginInstallation(tenantId, pluginId);
    },
    provisionPluginInstallation: async (input: ProvisionPluginInstallationInput): Promise<PluginInstallationRecord> => {
        if (prismaIsRequired()) return getPrismaRepository().provisionPluginInstallation(input);
        return PlatformRepository.provisionPluginInstallation(input);
    },
    updatePluginInstallationStatus: async (
        tenantId: string,
        pluginId: string,
        status: PluginInstallationStatus | string
    ): Promise<PluginInstallationRecord> => {
        if (prismaIsRequired()) return getPrismaRepository().updatePluginInstallationStatus(tenantId, pluginId, status);
        return PlatformRepository.updatePluginInstallationStatus(tenantId, pluginId, status);
    },
    uninstallPluginInstallation: async (
        tenantId: string,
        pluginId: string
    ): Promise<PluginInstallationRecord> => {
        if (prismaIsRequired()) return getPrismaRepository().uninstallPluginInstallation(tenantId, pluginId);
        return PlatformRepository.uninstallPluginInstallation(tenantId, pluginId);
    },
    reactivatePluginInstallation: async (
        tenantId: string,
        pluginId: string,
        adminActor?: { actorId?: string; actorEmail?: string; reason?: string }
    ): Promise<PluginInstallationRecord> => {
        if (prismaIsRequired()) return getPrismaRepository().reactivatePluginInstallation(tenantId, pluginId, adminActor);
        return PlatformRepository.reactivatePluginInstallation(tenantId, pluginId, {
            actorId: adminActor?.actorId,
            actorEmail: adminActor?.actorEmail,
            reason: adminActor?.reason || 'Administrative reactivation',
        });
    },
    changePluginInstallationPlan: async (
        tenantId: string,
        pluginId: string,
        newPlanId: string
    ): Promise<PluginInstallationRecord> => {
        if (prismaIsRequired()) return getPrismaRepository().changePluginInstallationPlan(tenantId, pluginId, newPlanId);
        return PlatformRepository.changePluginInstallationPlan(tenantId, pluginId, newPlanId);
    },
    checkQuotaUsage: async (
        tenantId: string,
        pluginId: string,
        quotaKey: string,
        currentCount: number,
        requestedIncrement = 1
    ): Promise<{ allowed: boolean; limit?: number; currentCount: number; remaining?: number; reason?: string }> => {
        if (prismaIsRequired()) return getPrismaRepository().checkQuotaUsage(tenantId, pluginId, quotaKey, currentCount, requestedIncrement);
        const res = PlatformRepository.checkQuotaUsage(tenantId, pluginId, quotaKey, currentCount, requestedIncrement);
        return {
            allowed: res.allowed,
            limit: res.limit,
            currentCount: res.current,
            remaining: res.limit >= 0 ? Math.max(0, res.limit - (currentCount + requestedIncrement)) : undefined,
            reason: res.reason,
        };
    },
    listPlugins: async (): Promise<PluginCatalogueItem[]> => {
        if (prismaIsRequired()) return getPrismaRepository().listPlugins();
        return PlatformRepository.listPlugins();
    },
    getPlugin: async (pluginId: string): Promise<PluginCatalogueItem | undefined> => {
        if (prismaIsRequired()) return getPrismaRepository().getPlugin(pluginId);
        return PlatformRepository.getPlugin(pluginId);
    },
    listPlans: async (pluginId?: string): Promise<PlanCatalogueRecord[]> => {
        if (prismaIsRequired()) return getPrismaRepository().listPlans(pluginId);
        return PlatformRepository.listPlans(pluginId);
    },
    getPlan: async (planId: string): Promise<PlanCatalogueRecord | undefined> => {
        if (prismaIsRequired()) return getPrismaRepository().getPlan(planId);
        return PlatformRepository.getPlan(planId);
    },
    createPlan: async (input: any): Promise<PlanCatalogueRecord> => {
        if (prismaIsRequired()) return getPrismaRepository().createPlan(input);
        return PlatformRepository.createPlan(input);
    },
    updatePlan: async (planId: string, updates: any): Promise<PlanCatalogueRecord> => {
        if (prismaIsRequired()) return getPrismaRepository().updatePlan(planId, updates);
        return PlatformRepository.updatePlan(planId, updates);
    },
    ensurePlanCatalogueSeeded: async (): Promise<void> => {
        if (prismaIsRequired()) return getPrismaRepository().ensurePlanCatalogueSeeded();
        return PlatformRepository.ensurePlanCatalogueSeeded();
    },
    listOutboxMessages: async (status?: string): Promise<PlatformOutboxRecord[]> => {
        if (prismaIsRequired()) return getPrismaRepository().listOutboxMessages(status);
        return PlatformRepository.listOutboxMessages(status ? { status } : undefined);
    },
    recordOutboxMessage: async (input: any): Promise<PlatformOutboxRecord> => {
        if (prismaIsRequired()) return getPrismaRepository().recordOutboxMessage(input);
        return PlatformRepository.recordOutboxMessage(input);
    },
    updateOutboxMessage: async (id: string, updates: any): Promise<void> => {
        if (prismaIsRequired()) return getPrismaRepository().updateOutboxMessage(id, updates);
        return PlatformRepository.updateOutboxMessage(id, updates);
    },
    incrementProjectUsage: async (projectId: string, amount = 1): Promise<number> => {
        if (prismaIsRequired()) return getPrismaRepository().incrementProjectUsage(projectId, amount);
        const project = await platformRepository.getProject(projectId);
        const next = (project?.monthlyApiCalls || 0) + amount;
        await platformRepository.setProjectUsage(projectId, next);
        return next;
    },
    recordBillableCall: async (projectId: string, amount = 1): Promise<number | undefined> => {
        if (prismaIsRequired()) return getPrismaRepository().incrementProjectUsage(projectId, amount);
        const project = await platformRepository.getProject(projectId);
        const next = (project?.monthlyApiCalls || 0) + amount;
        await platformRepository.setProjectUsage(projectId, next);
        return next;
    },
    reserveProjectUsage: async (projectId: string, monthlyQuota = Number.POSITIVE_INFINITY, periodKey?: string): Promise<number | undefined> => {
        if (prismaIsRequired()) return getPrismaRepository().reserveProjectUsage(projectId, monthlyQuota, periodKey);
        PlatformRepository.initialize();
        const project = (PlatformRepository as any).projects.find((item: any) => item.id === projectId || item.slug === projectId);
        if (!project) return undefined;
        const currentPeriod = periodKey || getCurrentBillingPeriod();

        // Forward-only rule: reject older period requests (stale clock or late arrival)
        if (project.currentBillingPeriod && project.currentBillingPeriod > currentPeriod) {
            return undefined;
        }

        // Forward-only rollover (only when stored period is strictly older than target)
        if (project.currentBillingPeriod && project.currentBillingPeriod < currentPeriod) {
            if (monthlyQuota <= 0) return undefined;
            project.monthlyApiCalls = 1;
            project.currentBillingPeriod = currentPeriod;
            (PlatformRepository as any).saveDebounced();
            return 1;
        }

        const currentUsage = project.monthlyApiCalls || 0;
        if (currentUsage >= monthlyQuota) return undefined;
        project.monthlyApiCalls = currentUsage + 1;
        project.currentBillingPeriod = currentPeriod;
        (PlatformRepository as any).saveDebounced();
        return project.monthlyApiCalls;
    },
    releaseProjectUsage: async (projectId: string, amount = 1, periodKey?: string): Promise<number> => {
        if (prismaIsRequired()) return getPrismaRepository().releaseProjectUsage(projectId, amount, periodKey);
        PlatformRepository.initialize();
        const project = (PlatformRepository as any).projects.find((item: any) => item.id === projectId || item.slug === projectId);
        if (!project) return 0;
        project.monthlyApiCalls = Math.max(0, (project.monthlyApiCalls || 0) - amount);
        (PlatformRepository as any).saveDebounced();
        return project.monthlyApiCalls;
    },
    decrementRateLimit: async (
        scopeType: 'project' | 'key' | 'ip',
        scopeId: string,
        windowSeconds = 60,
        customWindowStart?: Date
    ) => {
        if (prismaIsRequired()) return getPrismaRepository().decrementRateLimit(scopeType, scopeId, windowSeconds, customWindowStart);
        const now = customWindowStart ? customWindowStart.getTime() : Date.now();
        const windowMs = windowSeconds * 1000;
        const windowStart = Math.floor(now / windowMs) * windowMs;
        const key = `${scopeType}:${scopeId}:${windowStart}`;
        const current = jsonRateLimitBuckets.get(key) || 0;
        if (current > 0) jsonRateLimitBuckets.set(key, current - 1);
    },
    incrementRateLimit: async (
        scopeType: 'project' | 'key' | 'ip',
        scopeId: string,
        limit: number,
        windowSeconds = 60,
        customWindowStart?: Date
    ) => {
        if (prismaIsRequired()) return getPrismaRepository().incrementRateLimit(scopeType, scopeId, limit, windowSeconds, customWindowStart);
        const now = customWindowStart ? customWindowStart.getTime() : Date.now();
        const windowMs = windowSeconds * 1000;
        const windowStart = Math.floor(now / windowMs) * windowMs;
        const key = `${scopeType}:${scopeId}:${windowStart}`;
        const current = (jsonRateLimitBuckets.get(key) || 0) + 1;
        jsonRateLimitBuckets.set(key, current);
        const allowed = current <= limit;
        const remaining = Math.max(0, limit - current);
        const resetSeconds = Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000));
        return { allowed, currentCount: current, limit, remaining, resetSeconds };
    },
    checkRateLimits: async (
        scopes: Array<{ scopeType: 'project' | 'key' | 'ip'; scopeId: string; limit: number }>,
        windowSeconds = 60,
        customWindowStart?: Date
    ) => {
        if (prismaIsRequired()) return getPrismaRepository().checkRateLimits(scopes, windowSeconds, customWindowStart);
        const sortedScopes = [...scopes].sort((a, b) => a.limit - b.limit);
        const incrementedScopes: Array<{ scopeType: 'project' | 'key' | 'ip'; scopeId: string }> = [];

        let minRemaining = Number.POSITIVE_INFINITY;
        let maxResetSeconds = 1;
        let effectiveLimit = 1200;

        for (const scope of sortedScopes) {
            const res = await extraMethods.incrementRateLimit(scope.scopeType, scope.scopeId, scope.limit, windowSeconds, customWindowStart);
            incrementedScopes.push(scope);
            if (res.limit < effectiveLimit) effectiveLimit = res.limit;
            if (res.remaining < minRemaining) minRemaining = res.remaining;
            if (res.resetSeconds > maxResetSeconds) maxResetSeconds = res.resetSeconds;
            if (!res.allowed) {
                for (const prevScope of incrementedScopes) {
                    await extraMethods.decrementRateLimit(prevScope.scopeType, prevScope.scopeId, windowSeconds, customWindowStart);
                }
                return {
                    allowed: false,
                    exceededScope: { scopeType: scope.scopeType, scopeId: scope.scopeId, limit: scope.limit, currentCount: res.currentCount },
                    limit: scope.limit,
                    remaining: 0,
                    resetSeconds: res.resetSeconds,
                };
            }
        }
        return {
            allowed: true,
            limit: Number.isFinite(effectiveLimit) ? effectiveLimit : 1200,
            remaining: Number.isFinite(minRemaining) ? minRemaining : 1200,
            resetSeconds: maxResetSeconds,
        };
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