import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  PlatformOrganization,
  PlatformProject,
  ProjectEnvironment,
  PlatformApiKeyRecord,
  PlatformCredentialRecord,
  PlatformPackageCatalogItem,
  PackageVersionRecord,
  PackageInstallationRecord,
  ProjectDomainRecord,
  EnvironmentQuotaPolicyRecord,
  EnvironmentRateLimitPolicyRecord,
  ProjectLifecycleStatus,
  KeyLifecycleState,
  CredentialHealth,
  PackageInstallationStatus,
  KeyType,
} from '@orbitox/types';
import { PlatformKeyEngine, GeneratedKeyResult } from '../security/platform-key-engine';
import { CredentialVault } from '../security/credential-vault';

export interface CreateProjectInput {
  name: string;
  slug?: string;
  organizationId: string;
  businessModel: string;
  planTier: string;
  technicalLead: string;
  contactEmail: string;
  initialPackages?: string[];
}

export interface CreateKeyInput {
  name: string;
  environmentId: string;
  projectId: string;
  keyType?: KeyType;
  capabilities: string[];
  ipAllowlist?: string[];
  rateLimitPerMin?: number;
  tenantScope?: string[];
  expiresInDays?: number;
  createdBy: string;
}

export interface CreateCredentialInput {
  name: string;
  provider: string;
  environmentId: string;
  projectId: string;
  plaintextSecret: string;
  ownerEmail: string;
  rotationIntervalDays?: number;
}

export interface PlatformRepositoryStoreData {
  organizations: PlatformOrganization[];
  projects: PlatformProject[];
  environments: ProjectEnvironment[];
  apiKeys: PlatformApiKeyRecord[];
  credentials: PlatformCredentialRecord[];
  packages: PlatformPackageCatalogItem[];
  packageVersions: PackageVersionRecord[];
  packageInstallations: PackageInstallationRecord[];
  domains: ProjectDomainRecord[];
  quotaPolicies: EnvironmentQuotaPolicyRecord[];
  rateLimitPolicies: EnvironmentRateLimitPolicyRecord[];
}

export class PlatformRepository {
  private static organizations: PlatformOrganization[] = [];
  private static projects: PlatformProject[] = [];
  private static environments: ProjectEnvironment[] = [];
  private static apiKeys: PlatformApiKeyRecord[] = [];
  private static credentials: PlatformCredentialRecord[] = [];
  private static packages: PlatformPackageCatalogItem[] = [];
  private static packageVersions: PackageVersionRecord[] = [];
  private static packageInstallations: PackageInstallationRecord[] = [];
  private static domains: ProjectDomainRecord[] = [];
  private static quotaPolicies: EnvironmentQuotaPolicyRecord[] = [];
  private static rateLimitPolicies: EnvironmentRateLimitPolicyRecord[] = [];

  private static initialized = false;
  private static persistenceEnabled = true;
  private static dataDir: string | null = null;
  private static filePath: string | null = null;
  private static saveTimeout: NodeJS.Timeout | null = null;

  public static setPersistenceEnabled(enabled: boolean): void {
    this.persistenceEnabled = enabled;
  }

  public static setDataDir(dir: string): void {
    if (!dir) {
      this.dataDir = null;
      this.filePath = null;
      return;
    }
    this.dataDir = dir;
    this.filePath = path.join(dir, 'platform-repository-store.json');
    if (this.initialized) {
      this.reloadFromDisk();
    }
  }

  public static getFilePath(): string {
    this.resolveDataPaths();
    return this.filePath!;
  }

  private static resolveDataPaths(): void {
    if (this.filePath) return;

    const candidates = [
      process.env.ORBITOX_DATA_DIR?.trim(),
      path.resolve(process.cwd(), 'orbitox/data'),
      path.resolve(process.cwd(), 'data'),
      path.resolve(process.cwd(), '../../data'),
      path.resolve(__dirname, '../../../../data'),
    ].filter(Boolean) as string[];

    let resolvedDir: string = candidates[0] || path.resolve(process.cwd(), 'data');
    for (const cand of candidates) {
      if (fs.existsSync(cand) || cand.includes('data')) {
        resolvedDir = cand;
        break;
      }
    }

    if (!fs.existsSync(resolvedDir)) {
      try {
        fs.mkdirSync(resolvedDir, { recursive: true });
      } catch {
        resolvedDir = path.resolve(process.cwd(), '.orbitox_state');
        if (!fs.existsSync(resolvedDir)) fs.mkdirSync(resolvedDir, { recursive: true });
      }
    }

    this.dataDir = resolvedDir;
    this.filePath = path.join(resolvedDir, 'platform-repository-store.json');
  }

  public static initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.resolveDataPaths();

    if (this.persistenceEnabled && this.filePath && fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed: PlatformRepositoryStoreData = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.organizations) && parsed.organizations.length > 0) {
          this.organizations = parsed.organizations || [];
          this.projects = parsed.projects || [];
          this.environments = parsed.environments || [];
          this.apiKeys = parsed.apiKeys || [];
          this.credentials = parsed.credentials || [];
          this.packages = parsed.packages || [];
          this.packageVersions = parsed.packageVersions || [];
          this.packageInstallations = parsed.packageInstallations || [];
          this.domains = parsed.domains || [];
          this.quotaPolicies = parsed.quotaPolicies || [];
          this.rateLimitPolicies = parsed.rateLimitPolicies || [];
          return;
        }
      } catch (err) {
        console.error('[PlatformRepository] Error reading persistent store, re-seeding defaults:', err);
      }
    }

    this.seedDefaults();
    if (this.persistenceEnabled) {
      this.saveImmediate();
    }
  }

  public static reloadFromDisk(): void {
    this.resolveDataPaths();
    if (this.filePath && fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed: PlatformRepositoryStoreData = JSON.parse(raw);
        this.organizations = parsed.organizations || [];
        this.projects = parsed.projects || [];
        this.environments = parsed.environments || [];
        this.apiKeys = parsed.apiKeys || [];
        this.credentials = parsed.credentials || [];
        this.packages = parsed.packages || [];
        this.packageVersions = parsed.packageVersions || [];
        this.packageInstallations = parsed.packageInstallations || [];
        this.domains = parsed.domains || [];
        this.quotaPolicies = parsed.quotaPolicies || [];
        this.rateLimitPolicies = parsed.rateLimitPolicies || [];
      } catch (err) {
        console.error('[PlatformRepository] Failed to reload store from disk:', err);
      }
    }
  }

  public static saveDebounced(): void {
    if (!this.persistenceEnabled) return;
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saveImmediate();
    }, 150);
  }

  public static saveImmediate(): void {
    if (!this.persistenceEnabled) return;
    this.resolveDataPaths();
    if (!this.filePath) return;

    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const payload: PlatformRepositoryStoreData = {
        organizations: this.organizations,
        projects: this.projects,
        environments: this.environments,
        apiKeys: this.apiKeys,
        credentials: this.credentials,
        packages: this.packages,
        packageVersions: this.packageVersions,
        packageInstallations: this.packageInstallations,
        domains: this.domains,
        quotaPolicies: this.quotaPolicies,
        rateLimitPolicies: this.rateLimitPolicies,
      };

      const tempPath = `${this.filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.filePath);
    } catch (err) {
      console.error('[PlatformRepository] Failed to write persistent store to disk:', err);
    }
  }

  public static resetForTesting(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.organizations = [];
    this.projects = [];
    this.environments = [];
    this.apiKeys = [];
    this.credentials = [];
    this.packages = [];
    this.packageVersions = [];
    this.packageInstallations = [];
    this.domains = [];
    this.quotaPolicies = [];
    this.rateLimitPolicies = [];
    this.initialized = false;
  }

  // ─────────────────────────────────────────────────────────────
  // ORGANIZATIONS
  // ─────────────────────────────────────────────────────────────

  static listOrganizations(): PlatformOrganization[] {
    this.initialize();
    return [...this.organizations];
  }

  static getOrganization(idOrSlug: string): PlatformOrganization | undefined {
    this.initialize();
    return this.organizations.find((o) => o.id === idOrSlug || o.slug === idOrSlug);
  }

  static createOrganization(input: { slug: string; name: string; billingEmail: string; complianceTier?: any }): PlatformOrganization {
    this.initialize();
    const org: PlatformOrganization = {
      id: `org_${input.slug.replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`,
      slug: input.slug,
      name: input.name,
      billingEmail: input.billingEmail,
      complianceTier: input.complianceTier || 'STANDARD',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.organizations.push(org);
    this.saveDebounced();
    return org;
  }

  static updateOrganization(idOrSlug: string, updates: Partial<PlatformOrganization>): PlatformOrganization | undefined {
    this.initialize();
    const idx = this.organizations.findIndex((o) => o.id === idOrSlug || o.slug === idOrSlug);
    if (idx !== -1) {
      this.organizations[idx] = {
        ...this.organizations[idx]!,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.saveDebounced();
      return this.organizations[idx];
    }
    return undefined;
  }

  // ─────────────────────────────────────────────────────────────
  // PROJECTS & ENVIRONMENTS
  // ─────────────────────────────────────────────────────────────

  static listProjects(filter?: { organizationId?: string; status?: ProjectLifecycleStatus }): PlatformProject[] {
    this.initialize();
    return this.projects.filter((p) => {
      if (filter?.organizationId && p.organizationId !== filter.organizationId) return false;
      if (filter?.status && p.status !== filter.status) return false;
      return true;
    });
  }

  static getProject(idOrSlug: string): PlatformProject | undefined {
    this.initialize();
    return this.projects.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
  }

  static createProject(input: CreateProjectInput): { project: PlatformProject; environments: ProjectEnvironment[] } {
    this.initialize();
    const slug = (input.slug || input.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')).replace(/^-|-$/g, '');
    const projectId = `proj_${slug}_${Date.now().toString(36)}`;

    const project: PlatformProject = {
      id: projectId,
      slug,
      name: input.name,
      organizationId: input.organizationId,
      businessModel: input.businessModel as any,
      planTier: input.planTier as any,
      status: 'ACTIVE',
      technicalLead: input.technicalLead,
      contactEmail: input.contactEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.projects.push(project);

    // Automatically provision default environments: production, staging, development
    const prodEnv: ProjectEnvironment = {
      id: `env_${projectId}_prod`,
      projectId,
      slug: 'production',
      name: 'Production Main',
      type: 'PRODUCTION',
      isProduction: true,
      status: 'ACTIVE',
      requireMtls: false,
      strictIpAllowlist: false,
      enforceFourEyes: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const stgEnv: ProjectEnvironment = {
      id: `env_${projectId}_stage`,
      projectId,
      slug: 'staging',
      name: 'Staging QA',
      type: 'STAGING',
      isProduction: false,
      status: 'ACTIVE',
      requireMtls: false,
      strictIpAllowlist: false,
      enforceFourEyes: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const devEnv: ProjectEnvironment = {
      id: `env_${projectId}_dev`,
      projectId,
      slug: 'development',
      name: 'Development Sandbox',
      type: 'DEVELOPMENT',
      isProduction: false,
      status: 'ACTIVE',
      requireMtls: false,
      strictIpAllowlist: false,
      enforceFourEyes: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.environments.push(prodEnv, stgEnv, devEnv);

    // Initial Quota Policies
    this.quotaPolicies.push({
      id: `quota_${prodEnv.id}`,
      environmentId: prodEnv.id,
      monthlyCallLimit: 10000000,
      monthlyCallsUsed: 0,
      storageQuotaGb: 500,
      storageUsedGb: 0,
      warningThreshold: 80,
      updatedAt: new Date().toISOString(),
    });

    // Install initial packages in production
    if (input.initialPackages && input.initialPackages.length > 0) {
      for (const pkgId of input.initialPackages) {
        const pkg = this.packages.find((p) => p.packageId === pkgId);
        const ver = this.packageVersions.find((v) => v.packageId === pkgId);
        if (pkg && ver) {
          this.packageInstallations.push({
            id: `install_${prodEnv.id}_${pkgId.replace(/[^a-z0-9]/g, '_')}`,
            environmentId: prodEnv.id,
            packageId: pkgId,
            installedVersionId: ver.id,
            status: 'ACTIVE',
            configOverrides: {},
            installedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    this.saveDebounced();
    return { project, environments: [prodEnv, stgEnv, devEnv] };
  }

  static updateProject(projectId: string, updates: Partial<PlatformProject>): PlatformProject | undefined {
    this.initialize();
    const idx = this.projects.findIndex((p) => p.id === projectId || p.slug === projectId);
    if (idx !== -1) {
      this.projects[idx] = { ...this.projects[idx]!, ...updates, updatedAt: new Date().toISOString() };
      this.saveDebounced();
      return this.projects[idx];
    }
    return undefined;
  }

  static deleteProject(projectId: string): boolean {
    this.initialize();
    const initialLen = this.projects.length;
    this.projects = this.projects.filter((p) => p.id !== projectId && p.slug !== projectId);
    if (this.projects.length !== initialLen) {
      this.saveDebounced();
      return true;
    }
    return false;
  }

  static listEnvironments(projectId?: string): ProjectEnvironment[] {
    this.initialize();
    if (projectId) {
      return this.environments.filter((e) => e.projectId === projectId);
    }
    return [...this.environments];
  }

  static getEnvironment(idOrSlug: string, projectId?: string): ProjectEnvironment | undefined {
    this.initialize();
    return this.environments.find((e) => {
      if (e.id === idOrSlug) return true;
      if (projectId && e.projectId === projectId && e.slug === idOrSlug) return true;
      return false;
    });
  }

  // ─────────────────────────────────────────────────────────────
  // API KEYS (MACHINE CREDENTIALS)
  // ─────────────────────────────────────────────────────────────

  static listApiKeys(filter?: {
    environmentId?: string;
    projectId?: string;
    status?: KeyLifecycleState;
  }): PlatformApiKeyRecord[] {
    this.initialize();
    return this.apiKeys
      .filter((k) => {
        if (filter?.environmentId && k.environmentId !== filter.environmentId) return false;
        if (filter?.projectId && k.projectId !== filter.projectId) return false;
        if (filter?.status && k.status !== filter.status) return false;
        return true;
      })
      .map((k) => {
        // Dynamically compute real-time risk score
        const risk = PlatformKeyEngine.calculateRiskScore({
          isProduction: k.keyPrefix.includes('live'),
          capabilities: k.capabilities,
          expiresAt: k.expiresAt,
          issuedAt: k.issuedAt,
          lastUsedAt: k.lastUsedAt,
          ipAllowlist: k.ipAllowlist,
        });
        return {
          ...k,
          riskScore: risk.score,
          riskLevel: risk.level,
          riskFactors: risk.factors,
        };
      });
  }

  static getApiKey(idOrKeyId: string): PlatformApiKeyRecord | undefined {
    this.initialize();
    const k = this.apiKeys.find((key) => key.id === idOrKeyId || key.keyId === idOrKeyId);
    if (!k) return undefined;
    const risk = PlatformKeyEngine.calculateRiskScore({
      isProduction: k.keyPrefix.includes('live'),
      capabilities: k.capabilities,
      expiresAt: k.expiresAt,
      issuedAt: k.issuedAt,
      lastUsedAt: k.lastUsedAt,
      ipAllowlist: k.ipAllowlist,
    });
    return { ...k, riskScore: risk.score, riskLevel: risk.level, riskFactors: risk.factors };
  }

  static findKeyByRawSecret(incomingSecret: string, serverPepper?: string): PlatformApiKeyRecord | undefined {
    this.initialize();
    for (const key of this.apiKeys) {
      if (key.status !== 'ACTIVE') continue;
      if (PlatformKeyEngine.verifySecret(incomingSecret, key.authVerifier, serverPepper)) {
        return key;
      }
    }
    return undefined;
  }

  static createApiKey(input: CreateKeyInput, serverPepper?: string): { keyRecord: PlatformApiKeyRecord; rawSecret: string } {
    this.initialize();
    const env = this.getEnvironment(input.environmentId);
    const envName = env?.isProduction ? 'production' : env?.slug === 'staging' ? 'staging' : 'development';

    const generated: GeneratedKeyResult = PlatformKeyEngine.generateKey(envName, serverPepper);

    const now = new Date();
    const expiresAt = input.expiresInDays
      ? new Date(now.getTime() + input.expiresInDays * 24 * 3600 * 1000).toISOString()
      : undefined;

    const risk = PlatformKeyEngine.calculateRiskScore({
      isProduction: env?.isProduction,
      capabilities: input.capabilities,
      expiresAt,
      issuedAt: now.toISOString(),
      lastUsedAt: null,
      ipAllowlist: input.ipAllowlist,
    });

    const keyRecord: PlatformApiKeyRecord = {
      id: `key_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      keyId: generated.keyId,
      name: input.name,
      environmentId: input.environmentId,
      projectId: input.projectId,
      keyType: (input.keyType as any) || 'PROJECT_SCOPED',
      keyPrefix: generated.keyPrefix,
      secretFingerprint: generated.secretFingerprint,
      authVerifier: generated.authVerifier,
      maskedDisplay: generated.maskedDisplay,
      status: 'ACTIVE',
      capabilities: input.capabilities,
      ipAllowlist: input.ipAllowlist || [],
      rateLimitPerMin: input.rateLimitPerMin || 1200,
      tenantScope: input.tenantScope,
      riskScore: risk.score,
      riskLevel: risk.level,
      riskFactors: risk.factors,
      issuedAt: now.toISOString(),
      activatedAt: now.toISOString(),
      expiresAt,
      createdBy: input.createdBy,
      version: 1,
    };

    this.apiKeys.push(keyRecord);
    this.saveDebounced();

    return { keyRecord, rawSecret: generated.rawSecret };
  }

  static rotateApiKey(
    keyId: string,
    options: { graceWindowDays?: number; operatorEmail: string }
  ): { replacementKey: PlatformApiKeyRecord; replacementRawSecret: string } | undefined {
    this.initialize();
    const oldKey = this.getApiKey(keyId);
    if (!oldKey) return undefined;

    // 1. Generate Replacement Key with identical parameters
    const created = this.createApiKey(
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
      }
    );

    // 2. Set grace period on old key or mark suspended
    const oldIdx = this.apiKeys.findIndex((k) => k.id === oldKey.id);
    if (oldIdx !== -1) {
      if (options.graceWindowDays && options.graceWindowDays > 0) {
        this.apiKeys[oldIdx]!.expiresAt = new Date(Date.now() + options.graceWindowDays * 24 * 3600 * 1000).toISOString();
      } else {
        this.apiKeys[oldIdx]!.status = 'SUSPENDED';
      }
      this.apiKeys[oldIdx]!.revokeReason = `Rotated in favor of replacement key [${created.keyRecord.keyId}]`;
      this.saveDebounced();
    }

    return { replacementKey: created.keyRecord, replacementRawSecret: created.rawSecret };
  }

  static setKeyStatus(keyId: string, status: KeyLifecycleState, reason?: string): PlatformApiKeyRecord | undefined {
    this.initialize();
    const idx = this.apiKeys.findIndex((k) => k.id === keyId || k.keyId === keyId);
    if (idx !== -1) {
      this.apiKeys[idx]!.status = status;
      if (reason) this.apiKeys[idx]!.revokeReason = reason;
      if (status === 'COMPROMISED') this.apiKeys[idx]!.compromisedAt = new Date().toISOString();
      if (status === 'REVOKED') this.apiKeys[idx]!.revokedAt = new Date().toISOString();
      this.saveDebounced();
      return this.apiKeys[idx];
    }
    return undefined;
  }

  static recordKeyUsage(keyId: string, clientIp?: string): void {
    this.initialize();
    const idx = this.apiKeys.findIndex((k) => k.id === keyId || k.keyId === keyId);
    if (idx !== -1) {
      this.apiKeys[idx]!.lastUsedAt = new Date().toISOString();
      if (clientIp) {
        this.apiKeys[idx]!.lastUsedIp = clientIp;
      }
      this.saveDebounced();
    }
  }

  // ─────────────────────────────────────────────────────────────
  // CREDENTIAL VAULT (ENVELOPE ENCRYPTED SECRETS)
  // ─────────────────────────────────────────────────────────────

  static listCredentials(filter?: { environmentId?: string; projectId?: string }): PlatformCredentialRecord[] {
    this.initialize();
    return this.credentials.filter((c) => {
      if (filter?.environmentId && c.environmentId !== filter.environmentId) return false;
      if (filter?.projectId && c.projectId !== filter.projectId) return false;
      return true;
    });
  }

  static getCredential(id: string): PlatformCredentialRecord | undefined {
    this.initialize();
    return this.credentials.find((c) => c.id === id);
  }

  static createCredential(input: CreateCredentialInput): PlatformCredentialRecord {
    this.initialize();
    const envelope = CredentialVault.encryptSecret(input.plaintextSecret);
    const masked = CredentialVault.maskSecret(input.plaintextSecret);

    const now = new Date();
    const intervalDays = input.rotationIntervalDays || 90;
    const nextRotation = new Date(now.getTime() + intervalDays * 24 * 3600 * 1000);

    const cred: PlatformCredentialRecord = {
      id: `cred_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      name: input.name,
      provider: input.provider,
      environmentId: input.environmentId,
      projectId: input.projectId,
      envelope,
      secretFingerprint: envelope.secretFingerprint,
      maskedDisplay: masked,
      health: 'HEALTHY',
      lastRotatedAt: now.toISOString(),
      nextRotationDueAt: nextRotation.toISOString(),
      ownerEmail: input.ownerEmail,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    this.credentials.push(cred);
    this.saveDebounced();
    return cred;
  }

  static decryptCredential(id: string): string {
    this.initialize();
    const cred = this.getCredential(id);
    if (!cred) throw new Error(`Credential [${id}] not found.`);
    return CredentialVault.decryptSecret(cred.envelope as any);
  }

  // ─────────────────────────────────────────────────────────────
  // PACKAGES & SUPPLY CHAIN
  // ─────────────────────────────────────────────────────────────

  static listPackages(): PlatformPackageCatalogItem[] {
    this.initialize();
    return [...this.packages];
  }

  static getPackage(packageId: string): PlatformPackageCatalogItem | undefined {
    this.initialize();
    return this.packages.find((p) => p.packageId === packageId || p.id === packageId);
  }

  static listPackageVersions(packageId: string): PackageVersionRecord[] {
    this.initialize();
    return this.packageVersions.filter((v) => v.packageId === packageId);
  }

  static listInstallations(environmentId?: string): PackageInstallationRecord[] {
    this.initialize();
    if (environmentId) {
      return this.packageInstallations.filter((i) => i.environmentId === environmentId);
    }
    return [...this.packageInstallations];
  }

  static installPackage(
    environmentId: string,
    packageId: string,
    versionId: string,
    configOverrides: Record<string, any> = {}
  ): PackageInstallationRecord {
    this.initialize();
    const existingIdx = this.packageInstallations.findIndex(
      (i) => i.environmentId === environmentId && i.packageId === packageId
    );

    const record: PackageInstallationRecord = {
      id: existingIdx !== -1 ? this.packageInstallations[existingIdx]!.id : `inst_${crypto.randomUUID()}`,
      environmentId,
      packageId,
      installedVersionId: versionId,
      status: 'ACTIVE',
      configOverrides,
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existingIdx !== -1) {
      this.packageInstallations[existingIdx] = record;
    } else {
      this.packageInstallations.push(record);
    }

    this.saveDebounced();
    return record;
  }

  // ─────────────────────────────────────────────────────────────
  // DOMAINS
  // ─────────────────────────────────────────────────────────────

  static listDomains(environmentId?: string): ProjectDomainRecord[] {
    this.initialize();
    if (environmentId) {
      return this.domains.filter((d) => d.environmentId === environmentId);
    }
    return [...this.domains];
  }

  static registerDomain(input: { environmentId: string; domainName: string; isApex?: boolean }): ProjectDomainRecord {
    this.initialize();
    const domain: ProjectDomainRecord = {
      id: `dom_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      environmentId: input.environmentId,
      domainName: input.domainName.toLowerCase(),
      isApex: input.isApex || false,
      verificationStatus: 'VERIFIED', // Default verified in dev/standalone
      cnameTarget: 'cname.orbitox.io',
      tlsCertificateStatus: 'ISSUED',
      sslExpiresAt: new Date(Date.now() + 85 * 24 * 3600 * 1000).toISOString(),
      edgeLatencyMs: 8,
      createdAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
    };
    this.domains.push(domain);
    this.saveDebounced();
    return domain;
  }

  static removeDomain(idOrDomainName: string): boolean {
    this.initialize();
    const initialLen = this.domains.length;
    this.domains = this.domains.filter((d) => d.id !== idOrDomainName && d.domainName !== idOrDomainName.toLowerCase());
    if (this.domains.length !== initialLen) {
      this.saveDebounced();
      return true;
    }
    return false;
  }

  // ─────────────────────────────────────────────────────────────
  // QUOTAS & TELEMETRY MIGRATION
  // ─────────────────────────────────────────────────────────────

  static getQuotaPolicy(environmentId: string): EnvironmentQuotaPolicyRecord | undefined {
    this.initialize();
    return this.quotaPolicies.find((q) => q.environmentId === environmentId);
  }

  static updateQuotaPolicy(environmentId: string, updates: Partial<EnvironmentQuotaPolicyRecord>): EnvironmentQuotaPolicyRecord | undefined {
    this.initialize();
    const idx = this.quotaPolicies.findIndex((q) => q.environmentId === environmentId);
    if (idx !== -1) {
      this.quotaPolicies[idx] = {
        ...this.quotaPolicies[idx]!,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.saveDebounced();
      return this.quotaPolicies[idx];
    }
    return undefined;
  }

  static recordCall(environmentId: string): void {
    this.initialize();
    const q = this.quotaPolicies.find((pol) => pol.environmentId === environmentId);
    if (q) {
      q.monthlyCallsUsed += 1;
      q.updatedAt = new Date().toISOString();
      this.saveDebounced();
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SEED DEFAULTS
  // ─────────────────────────────────────────────────────────────

  private static seedDefaults(): void {
    // 1. Organizations
    const orgOmni = this.createOrganization({
      slug: 'omnilogistics',
      name: 'OmniLogistics Platform Corp',
      billingEmail: 'billing@omnideliver.global',
      complianceTier: 'SOC2',
    });

    const orgMednet = this.createOrganization({
      slug: 'mednet-trust',
      name: 'MedNet Regional Healthcare Trust',
      billingEmail: 'treasury@mednet.health',
      complianceTier: 'HIPAA',
    });

    const orgAura = this.createOrganization({
      slug: 'aura-luxury',
      name: 'Aura Luxury Brands Ltd',
      billingEmail: 'finance@aura-luxury.com',
      complianceTier: 'PCI_DSS',
    });

    // 2. Packages Catalog
    const corePackages = [
      { id: 'pkg_restaurant', packageId: '@orbitox/restaurant', name: 'Restaurant & Kitchen OS', category: 'Hospitality', publisher: 'OrbitoX Core Labs', version: '2.2.0' },
      { id: 'pkg_pos', packageId: '@orbitox/pos', name: 'Point of Sale (POS)', category: 'Retail', publisher: 'OrbitoX Core Labs', version: '1.4.0' },
      { id: 'pkg_commerce', packageId: '@orbitox/commerce', name: 'Commerce & Store Engine', category: 'Commerce', publisher: 'OrbitoX Core Labs', version: '2.1.0' },
      { id: 'pkg_crm', packageId: '@orbitox/crm', name: 'CRM & Deal Pipeline', category: 'Sales', publisher: 'OrbitoX Core Labs', version: '1.0.1' },
      { id: 'pkg_finance', packageId: '@orbitox/finance', name: 'Finance & Ledger Engine', category: 'Finance', publisher: 'OrbitoX Core Labs', version: '2.0.0' },
      { id: 'pkg_inventory', packageId: '@orbitox/inventory', name: 'Inventory & Stock Logistics', category: 'Supply Chain', publisher: 'OrbitoX Core Labs', version: '1.5.0' },
      { id: 'pkg_hms', packageId: '@orbitox/hms', name: 'Hospital Management System (HMS)', category: 'Healthcare', publisher: 'OrbitoX Clinical Group', version: '2.4.0' },
      { id: 'pkg_hrms', packageId: '@orbitox/hrms', name: 'HRMS & Workforce Suite', category: 'HR', publisher: 'OrbitoX Core Labs', version: '1.2.0' },
      { id: 'pkg_school', packageId: '@orbitox/school', name: 'School & Campus OS', category: 'Education', publisher: 'OrbitoX Academy', version: '1.1.0' },
    ];

    for (const p of corePackages) {
      this.packages.push({
        id: p.id,
        packageId: p.packageId,
        name: p.name,
        category: p.category,
        publisher: p.publisher,
        currentStableVersion: p.version,
        signingPublicKeyPem: '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAOrbitoXCoreSignedKey2026MasterNodeMeshRelease=\n-----END PUBLIC KEY-----',
        isCore: true,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      });

      this.packageVersions.push({
        id: `ver_${p.id}_${p.version.replace(/\./g, '_')}`,
        packageId: p.packageId,
        version: p.version,
        tarballSha256: crypto.createHash('sha256').update(p.packageId + p.version).digest('hex'),
        manifestHash: crypto.createHash('sha256').update('manifest_' + p.packageId).digest('hex'),
        signerId: 'orbitox-release-mesh-certified',
        signature: 'ed25519_cert_sig_' + crypto.randomBytes(16).toString('hex'),
        minPlatformVersion: '1.0.0',
        releaseNotes: `Production certified release ${p.version}`,
        releasedAt: '2026-09-15T00:00:00Z',
      });
    }

    // 3. Projects
    const omni = this.createProject({
      name: 'OmniDeliver Global Network',
      slug: 'omnideliver',
      organizationId: orgOmni.id,
      businessModel: 'O2O2B2B2C',
      planTier: 'hyperscale',
      technicalLead: 'Sophia Martinez, VP Infrastructure',
      contactEmail: 'platform@omnideliver.global',
      initialPackages: ['@orbitox/restaurant', '@orbitox/pos', '@orbitox/commerce', '@orbitox/crm', '@orbitox/finance', '@orbitox/inventory'],
    });

    const mednet = this.createProject({
      name: 'MedNet Health Alliance',
      slug: 'mednet-health',
      organizationId: orgMednet.id,
      businessModel: 'HEALTHCARE_NETWORK',
      planTier: 'enterprise',
      technicalLead: 'Dr. Michael Chen, Chief Medical Informaticist',
      contactEmail: 'security@mednet.health',
      initialPackages: ['@orbitox/hms', '@orbitox/inventory', '@orbitox/finance', '@orbitox/hrms'],
    });

    const aura = this.createProject({
      name: 'Aura Luxury Brands',
      slug: 'aura-luxury',
      organizationId: orgAura.id,
      businessModel: 'D2C',
      planTier: 'growth',
      technicalLead: 'Alexander Vance, Head of Engineering',
      contactEmail: 'devops@aura-luxury.com',
      initialPackages: ['@orbitox/commerce', '@orbitox/crm', '@orbitox/inventory'],
    });

    // 4. Domains
    const omniProd = omni.environments.find((e) => e.slug === 'production');
    if (omniProd) {
      this.registerDomain({ environmentId: omniProd.id, domainName: 'api.omnideliver.global', isApex: false });
    }

    const mednetProd = mednet.environments.find((e) => e.slug === 'production');
    if (mednetProd) {
      this.registerDomain({ environmentId: mednetProd.id, domainName: 'portal.mednet.health', isApex: false });
    }

    // 5. Initial Keys
    if (omniProd) {
      this.createApiKey({
        name: 'OmniDeliver Primary Gateway Key',
        environmentId: omniProd.id,
        projectId: omni.project.id,
        keyType: 'PROJECT_SCOPED',
        capabilities: ['restaurant.orders.read', 'restaurant.orders.create', 'restaurant.kds.fire', 'pos.checkout.process'],
        ipAllowlist: ['198.51.100.0/24'],
        rateLimitPerMin: 10000,
        createdBy: 'admin@omnideliver.global',
      });
    }

    if (mednetProd) {
      this.createApiKey({
        name: 'MedNet Inpatient Triage Feed',
        environmentId: mednetProd.id,
        projectId: mednet.project.id,
        keyType: 'SERVICE_MACHINE',
        capabilities: ['hms.patients.read', 'hms.triage.execute', 'hms.beds.allocate'],
        ipAllowlist: ['203.0.113.42/32'],
        rateLimitPerMin: 4000,
        createdBy: 'sysadmin@mednet.health',
      });
    }

    // 6. Initial External Credentials
    if (omniProd) {
      this.createCredential({
        name: 'Stripe Corporate Live Gateway',
        provider: 'stripe',
        environmentId: omniProd.id,
        projectId: omni.project.id,
        plaintextSecret: 'sandbox_omni_stripe_mock_token_94812',
        ownerEmail: 'finance@omnideliver.global',
      });
    }
  }
}
