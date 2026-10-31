/**
 * 🪐 OrbitoX Platform Control Center Domain Contracts & Types
 * Definitive normalized models for Platform Organizations, Projects,
 * Environments, Machine Credentials, External Secret Vault, and Extensions.
 */
export type ComplianceTier = 'STANDARD' | 'HIPAA' | 'SOC2' | 'PCI_DSS' | 'ISO27001';
export type BusinessModelType = 'O2O2B2B2C' | 'HEALTHCARE_NETWORK' | 'D2C' | 'B2B_SAAS' | 'FRANCHISE_RETAIL' | 'MARKETPLACE';
export type PlanTier = 'starter' | 'growth' | 'pro' | 'enterprise' | 'hyperscale';
export type ProjectLifecycleStatus = 'PROVISIONING' | 'ACTIVE' | 'DEGRADED' | 'SUSPENDED' | 'ARCHIVED' | 'DEPROVISIONING';
export type EnvironmentType = 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION' | 'SANDBOX' | 'DISASTER_RECOVERY';
export type EnvironmentStatus = 'ACTIVE' | 'FROZEN' | 'MAINTENANCE' | 'DECOMMISSIONED';
export type KeyType = 'PLATFORM_ROOT' | 'PROJECT_SCOPED' | 'SERVICE_MACHINE' | 'INTEGRATION_PARTNER' | 'CICD_AUTOMATION' | 'READ_ONLY' | 'EMERGENCY_ELEVATED';
export type KeyLifecycleState = 'PRE_ACTIVE' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'COMPROMISED' | 'REVOKED' | 'DESTROYED';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export interface StructuredRiskFactor {
    code: string;
    weight: number;
    message: string;
}
export interface KeyRiskEvaluation {
    score: number;
    level: RiskLevel;
    factors: StructuredRiskFactor[];
}
export type CredentialHealth = 'HEALTHY' | 'EXPIRING_SOON' | 'EXPIRED' | 'FAILED_VALIDATION' | 'ROTATION_PENDING';
export type PackageInstallationStatus = 'ACTIVE' | 'UPGRADING' | 'SUSPENDED' | 'SECURITY_BLOCKED';
export type DomainVerificationStatus = 'PENDING_DNS' | 'VERIFIED' | 'FAILED';
export type TlsCertificateStatus = 'PENDING' | 'ISSUED' | 'RENEWING' | 'FAILED';
export interface PlatformOrganization {
    id: string;
    slug: string;
    name: string;
    billingEmail: string;
    complianceTier: ComplianceTier;
    status: 'ACTIVE' | 'SUSPENDED' | 'DELINQUENT';
    createdAt: string;
    updatedAt: string;
}
export interface PlatformProject {
    id: string;
    slug: string;
    name: string;
    organizationId: string;
    businessModel: BusinessModelType;
    planTier: PlanTier;
    plan?: string;
    status: ProjectLifecycleStatus;
    enabledServices?: string[];
    apiCallQuota?: number;
    monthlyApiCalls?: number;
    currentBillingPeriod?: string;
    previousMonthlyApiCalls?: number;
    rateLimitPerMin?: number;
    technicalLead: string;
    contactEmail: string;
    createdAt: string;
    updatedAt: string;
}
export interface ProjectEnvironment {
    id: string;
    projectId: string;
    slug: string;
    name: string;
    type: EnvironmentType;
    isProduction: boolean;
    status: EnvironmentStatus;
    description?: string;
    requireMtls: boolean;
    strictIpAllowlist: boolean;
    enforceFourEyes: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface PlatformApiKeyRecord {
    id: string;
    keyId: string;
    name: string;
    environmentId: string;
    projectId: string;
    keyType: KeyType;
    keyPrefix: string;
    secretFingerprint: string;
    authVerifier: string;
    verifierPepperId?: string;
    maskedDisplay: string;
    status: KeyLifecycleState;
    capabilities: string[];
    ipAllowlist: string[];
    rateLimitPerMin: number;
    tenantScope?: string[];
    riskScore: number;
    riskLevel: RiskLevel;
    riskFactors: StructuredRiskFactor[];
    issuedAt: string;
    activatedAt: string;
    expiresAt?: string;
    lastUsedAt?: string;
    lastUsedIp?: string;
    lastUsedRegion?: string;
    compromisedAt?: string;
    revokedAt?: string;
    revokeReason?: string;
    createdBy: string;
    version: number;
}
export interface EncryptedCredentialEnvelope {
    version: number;
    kekIdentifier: string;
    encryptedDek: string;
    initializationVector: string;
    authenticationTag: string;
    encryptedCiphertext: string;
    secretFingerprint: string;
}
export interface PlatformCredentialRecord {
    id: string;
    name: string;
    provider: string;
    environmentId: string;
    projectId: string;
    envelope: EncryptedCredentialEnvelope;
    secretFingerprint: string;
    maskedDisplay: string;
    health: CredentialHealth;
    lastRotatedAt: string;
    nextRotationDueAt: string;
    lastValidatedAt?: string;
    validationError?: string;
    ownerEmail: string;
    createdAt: string;
    updatedAt: string;
}
export interface PlatformPackageCatalogItem {
    id: string;
    packageId: string;
    name: string;
    category: string;
    publisher: string;
    currentStableVersion: string;
    signingPublicKeyPem: string;
    isCore: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface PackageVersionRecord {
    id: string;
    packageId: string;
    version: string;
    tarballSha256: string;
    manifestHash: string;
    signerId: string;
    signature: string;
    minPlatformVersion: string;
    releaseNotes?: string;
    releasedAt: string;
}
export interface PackageInstallationRecord {
    id: string;
    environmentId: string;
    packageId: string;
    installedVersionId: string;
    status: PackageInstallationStatus;
    configOverrides: Record<string, any>;
    installedAt: string;
    updatedAt: string;
}
export interface ProjectDomainRecord {
    id: string;
    environmentId: string;
    domainName: string;
    isApex: boolean;
    verificationStatus: DomainVerificationStatus;
    cnameTarget: string;
    tlsCertificateStatus: TlsCertificateStatus;
    sslExpiresAt?: string;
    strictLicenseToken?: string;
    edgeLatencyMs: number;
    createdAt: string;
    verifiedAt?: string;
}
export interface EnvironmentQuotaPolicyRecord {
    id: string;
    environmentId: string;
    monthlyCallLimit: number;
    monthlyCallsUsed: number;
    storageQuotaGb: number;
    storageUsedGb: number;
    warningThreshold: number;
    projectedExhaustionDays?: number;
    updatedAt: string;
}
export interface EnvironmentRateLimitPolicyRecord {
    id: string;
    environmentId: string;
    requestsPerMinute: number;
    requestsPerSecondBurst: number;
    slidingWindowType: 'ATOMIC_REDIS' | 'IN_MEMORY_RAM' | 'HYBRID_REDIS_RAM';
    updatedAt: string;
}
//# sourceMappingURL=platform.types.d.ts.map