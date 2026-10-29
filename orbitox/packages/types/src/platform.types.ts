/**
 * 🪐 OrbitoX Platform Control Center Domain Contracts & Types
 * Definitive normalized models for Platform Organizations, Projects,
 * Environments, Machine Credentials, External Secret Vault, and Extensions.
 */

export type ComplianceTier = 'STANDARD' | 'HIPAA' | 'SOC2' | 'PCI_DSS' | 'ISO27001';

export type BusinessModelType =
  | 'O2O2B2B2C'
  | 'HEALTHCARE_NETWORK'
  | 'D2C'
  | 'B2B_SAAS'
  | 'FRANCHISE_RETAIL'
  | 'MARKETPLACE';

export type PlanTier = 'starter' | 'growth' | 'pro' | 'enterprise' | 'hyperscale';

export type ProjectLifecycleStatus =
  | 'PROVISIONING'
  | 'ACTIVE'
  | 'DEGRADED'
  | 'THROTTLED'
  | 'SUSPENDED'
  | 'ARCHIVED'
  | 'DEPROVISIONING';

export type EnvironmentType =
  | 'DEVELOPMENT'
  | 'STAGING'
  | 'PRODUCTION'
  | 'SANDBOX'
  | 'DISASTER_RECOVERY';

export type EnvironmentStatus = 'ACTIVE' | 'FROZEN' | 'MAINTENANCE' | 'DECOMMISSIONED';

export type KeyType =
  | 'PLATFORM_ROOT'
  | 'PROJECT_SCOPED'
  | 'SERVICE_MACHINE'
  | 'INTEGRATION_PARTNER'
  | 'CICD_AUTOMATION'
  | 'READ_ONLY'
  | 'EMERGENCY_ELEVATED';

export type KeyLifecycleState =
  | 'PRE_ACTIVE'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'COMPROMISED'
  | 'REVOKED'
  | 'DESTROYED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface StructuredRiskFactor {
  code: string;
  weight: number;
  message: string;
}

export interface KeyRiskEvaluation {
  score: number; // 0 to 100
  level: RiskLevel;
  factors: StructuredRiskFactor[];
}

export type CredentialHealth =
  | 'HEALTHY'
  | 'EXPIRING_SOON'
  | 'EXPIRED'
  | 'FAILED_VALIDATION'
  | 'ROTATION_PENDING';

export type PackageInstallationStatus =
  | 'ACTIVE'
  | 'UPGRADING'
  | 'SUSPENDED'
  | 'SECURITY_BLOCKED';

export type DomainVerificationStatus = 'PENDING_DNS' | 'VERIFIED' | 'FAILED';
export type TlsCertificateStatus = 'PENDING' | 'ISSUED' | 'RENEWING' | 'FAILED';

// ─────────────────────────────────────────────────────────────
// 1. ROOT HIERARCHY
// ─────────────────────────────────────────────────────────────

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
  planLabel?: string;
  status: ProjectLifecycleStatus;
  enabledServices?: string[];
  apiCallQuota?: number;
  monthlyApiCalls?: number;
  currentBillingPeriod?: string;
  previousMonthlyApiCalls?: number;
  rateLimitPerMin?: number;
  customDomain?: string;
  storageQuotaGb?: number;
  technicalLead: string;
  contactEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectEnvironment {
  id: string;
  projectId: string;
  slug: string; // 'development', 'staging', 'production'
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

// ─────────────────────────────────────────────────────────────
// 2. MACHINE CREDENTIALS (API KEYS)
// ─────────────────────────────────────────────────────────────

export interface PlatformApiKeyRecord {
  id: string;
  keyId: string; // Public correlation handle: key_live_01j7x4
  name: string;
  environmentId: string;
  projectId: string;
  keyType: KeyType;
  keyPrefix: string; // e.g. orb_live_proj_
  secretFingerprint: string; // SHA-256(rawSecret).hex (first 16 chars)
  authVerifier: string; // HMAC-SHA-256(pepper, rawSecret).hex
  verifierPepperId?: string; // Active pepper ID at key creation (for rotation tracking)
  maskedDisplay: string; // orb_live_••••••••0zE
  status: KeyLifecycleState;
  capabilities: string[];
  ipAllowlist: string[];
  rateLimitPerMin: number;
  tenantScope?: string[]; // Specific tenant IDs allowed; if empty, matches bound project

  riskScore: number; // 0 to 100
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

// ─────────────────────────────────────────────────────────────
// 3. EXTERNAL SECRETS (CREDENTIAL VAULT)
// ─────────────────────────────────────────────────────────────

export interface EncryptedCredentialEnvelope {
  version: number;
  kekIdentifier: string;
  encryptedDek: string;
  initializationVector: string; // 96-bit Base64 IV
  authenticationTag: string; // 128-bit Base64 GCM Auth Tag
  encryptedCiphertext: string; // AES-256-GCM Encrypted Secret Payload
  secretFingerprint: string; // SHA-256(plaintext).hex
}

export interface PlatformCredentialRecord {
  id: string;
  name: string;
  provider: string; // stripe, aws_s3, meta, twilio, redis, postgres
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

// ─────────────────────────────────────────────────────────────
// 4. PACKAGES & SUPPLY CHAIN
// ─────────────────────────────────────────────────────────────

export interface PlatformPackageCatalogItem {
  id: string;
  packageId: string; // e.g. @orbitox/restaurant
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

// ─────────────────────────────────────────────────────────────
// 5. DOMAINS, QUOTAS & RATE LIMITS
// ─────────────────────────────────────────────────────────────

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
