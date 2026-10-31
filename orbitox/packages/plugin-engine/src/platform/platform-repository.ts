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
  PluginInstallationRecord,
  PluginInstallationStatus,
  ProvisionPluginInstallationInput,
} from '@orbitox/types';
import { PlatformKeyEngine, GeneratedKeyResult } from '../security/platform-key-engine';
import { CredentialVault } from '../security/credential-vault';
import {
  PluginCatalogueItem,
  PlanCatalogueRecord,
  SEED_PLUGINS,
  SEED_PLANS,
  assertValidInstallationTransition,
} from './plan-catalogue';

export interface PlatformOutboxRecord {
  id: string;
  tenantId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, any>;
  status: 'PENDING' | 'SENT' | 'FAILED';
  retryCount: number;
  lastError?: string;
  createdAt: string;
  dispatchedAt?: string;
}

export const PLAN_DEFAULT_QUOTAS: Record<string, number> = {
  starter: 100000,
  growth: 1000000,
  pro: 5000000,
  enterprise: 25000000,
  hyperscale: 100000000,
};

export const PLAN_DEFAULT_RATE_LIMITS: Record<string, number> = {
  starter: 60,
  growth: 300,
  pro: 1200,
  enterprise: 6000,
  hyperscale: 30000,
};

const TENANT_RE = /^org\/[a-zA-Z0-9_-]+\/project\/[a-zA-Z0-9_-]+\/environment\/[a-zA-Z0-9_-]+$/;

export function canonicalizePluginId(pluginId: string): string {
  const trimmed = (pluginId || '').trim();
  if (trimmed === 'restaurant' || trimmed === '@orbitox-io/restaurant' || trimmed === '@orbitox/restaurant') {
    return '@orbitox/restaurant';
  }
  if (trimmed === 'crm' || trimmed === '@orbitox-io/crm' || trimmed === '@orbitox/crm') {
    return '@orbitox/crm';
  }
  if (trimmed === 'pos' || trimmed === '@orbitox-io/pos' || trimmed === '@orbitox/pos') {
    return '@orbitox/pos';
  }
  if (
    trimmed === 'hms' ||
    trimmed === '@orbitox-io/hms' ||
    trimmed === '@orbitox/hms' ||
    trimmed === 'hospital' ||
    trimmed === '@orbitox-io/hospital' ||
    trimmed === '@orbitox/hospital'
  ) {
    return '@orbitox/hms';
  }
  return trimmed;
}

export interface CreateProjectInput {
  name: string;
  slug?: string;
  organizationId: string;
  businessModel: string;
  planTier: string;
  plan?: string;
  technicalLead: string;
  contactEmail: string;
  initialPackages?: string[];
  enabledServices?: string[];
  plugins?: Array<{ pluginId: string; planId?: string; config?: Record<string, any> }>;
  apiCallQuota?: number;
  rateLimitPerMin?: number;
  status?: ProjectLifecycleStatus;
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
  pluginInstallations?: PluginInstallationRecord[];
  plugins?: PluginCatalogueItem[];
  plans?: PlanCatalogueRecord[];
  outboxMessages?: PlatformOutboxRecord[];
  domains: ProjectDomainRecord[];
  quotaPolicies: EnvironmentQuotaPolicyRecord[];
  rateLimitPolicies: EnvironmentRateLimitPolicyRecord[];
  auditLogs: Array<Record<string, any>>;
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
  private static pluginInstallations: PluginInstallationRecord[] = [];
  private static plugins: PluginCatalogueItem[] = [];
  private static plans: PlanCatalogueRecord[] = [];
  private static outboxMessages: PlatformOutboxRecord[] = [];
  private static domains: ProjectDomainRecord[] = [];
  private static quotaPolicies: EnvironmentQuotaPolicyRecord[] = [];
  private static rateLimitPolicies: EnvironmentRateLimitPolicyRecord[] = [];
  private static auditLogs: Array<Record<string, any>> = [];

  private static initialized = false;
  private static initializing = false;
  private static persistenceEnabled = true;
  private static dataDir: string | null = null;
  private static filePath: string | null = null;
  private static saveTimeout: NodeJS.Timeout | null = null;
  private static shutdownFlushHandlersRegistered = false;

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
    if (this.initialized || this.initializing) return;
    this.initializing = true;
    this.registerShutdownFlushHandlers();

    try {
      this.resolveDataPaths();
      const loaded = this.persistenceEnabled ? this.loadPersistedStore() : false;
      if (!loaded) {
        this.seedDefaults();
        this.repairDuplicateProjectSlugs();
        if (this.persistenceEnabled) this.saveDurable();
      } else {
        this.repairDuplicateProjectSlugs();
      }
      this.initialized = true;
    } finally {
      this.initializing = false;
    }
  }

  private static loadPersistedStore(): boolean {
    this.resolveDataPaths();
    const filePath = this.filePath!;
    this.cleanupStaleTempFiles(filePath);
    const backupPath = `${filePath}.bak`;
    const initializedPath = `${filePath}.initialized`;

    if (fs.existsSync(filePath)) {
      try {
        const missingOptionalCollections: string[] = [];
        const store = this.parseStoreData(fs.readFileSync(filePath, 'utf-8'), (name) => missingOptionalCollections.push(name));
        this.hydrateStore(store);
        if (missingOptionalCollections.length > 0) {
          this.logLegacyStoreMigration(missingOptionalCollections);
          this.saveDurable();
        }
        this.writeInitializedMarker(initializedPath);
        return true;
      } catch (primaryError) {
        if (!fs.existsSync(backupPath)) {
          throw new Error(`[PlatformRepository] Persistent store is corrupt and no previous good copy exists at ${backupPath}.`, {
            cause: primaryError,
          });
        }
        const missingOptionalCollections: string[] = [];
        const backup = this.parseStoreData(fs.readFileSync(backupPath, 'utf-8'), (name) => missingOptionalCollections.push(name));
        this.hydrateStore(backup);
        console.error(`[PlatformRepository] Primary store is corrupt; recovered the previous good copy from ${backupPath}.`);
        if (missingOptionalCollections.length > 0) this.logLegacyStoreMigration(missingOptionalCollections);
        this.writeAtomicFile(filePath, JSON.stringify(backup, null, 2));
        this.writeInitializedMarker(initializedPath);
        return true;
      }
    }

    if (fs.existsSync(backupPath)) {
      const missingOptionalCollections: string[] = [];
      const backup = this.parseStoreData(fs.readFileSync(backupPath, 'utf-8'), (name) => missingOptionalCollections.push(name));
      this.hydrateStore(backup);
      console.error(`[PlatformRepository] Primary store is missing; recovered the previous good copy from ${backupPath}.`);
      if (missingOptionalCollections.length > 0) this.logLegacyStoreMigration(missingOptionalCollections);
      this.writeAtomicFile(filePath, JSON.stringify(backup, null, 2));
      this.writeInitializedMarker(initializedPath);
      return true;
    }

    if (fs.existsSync(initializedPath)) {
      throw new Error(`[PlatformRepository] Persistent store is missing and no previous good copy exists at ${filePath}. Startup aborted.`);
    }

    return false;
  }

  private static cleanupStaleTempFiles(filePath: string): void {
    const dir = path.dirname(filePath);
    const primaryPrefix = `${path.basename(filePath)}.tmp.`;
    const backupPrefix = `${path.basename(filePath)}.bak.tmp.`;

    for (const name of fs.readdirSync(dir)) {
      const prefix = name.startsWith(primaryPrefix) ? primaryPrefix : name.startsWith(backupPrefix) ? backupPrefix : null;
      if (!prefix) continue;
      const pid = Number(name.slice(prefix.length).split('.')[0]);
      if (!Number.isSafeInteger(pid) || pid <= 0) continue;

      let stale = pid > 0x7fffffff;
      if (!stale) {
        try {
          process.kill(pid, 0);
        } catch (error) {
          stale = (error as NodeJS.ErrnoException).code === 'ESRCH';
        }
      }

      if (stale) {
        try {
          fs.unlinkSync(path.join(dir, name));
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            console.error(`[PlatformRepository] Failed to remove stale temporary file ${path.join(dir, name)}:`, error);
          }
        }
      }
    }
  }

  private static parseStoreData(raw: string, onMissingOptionalCollection?: (name: string) => void): PlatformRepositoryStoreData {
    const parsed = JSON.parse(raw);
    const requiredCollections = [
      'organizations',
      'projects',
      'environments',
      'apiKeys',
      'credentials',
      'packages',
      'packageVersions',
      'packageInstallations',
      'domains',
      'quotaPolicies',
      'rateLimitPolicies',
    ];
    const optionalCollections = ['auditLogs', 'pluginInstallations', 'plugins', 'plans', 'outboxMessages'];
    if (!parsed || requiredCollections.some((collection) => !Array.isArray(parsed[collection])) || parsed.organizations.length === 0) {
      throw new Error('Persistent store is empty or has an invalid schema.');
    }
    for (const collection of optionalCollections) {
      if (parsed[collection] === undefined) onMissingOptionalCollection?.(collection);
      else if (!Array.isArray(parsed[collection])) throw new Error('Persistent store is empty or has an invalid schema.');
    }
    return {
      organizations: parsed.organizations,
      projects: parsed.projects,
      environments: parsed.environments,
      apiKeys: parsed.apiKeys,
      credentials: parsed.credentials,
      packages: parsed.packages,
      packageVersions: parsed.packageVersions,
      packageInstallations: parsed.packageInstallations,
      pluginInstallations: parsed.pluginInstallations ?? [],
      plugins: parsed.plugins && parsed.plugins.length > 0 ? parsed.plugins : [...SEED_PLUGINS],
      plans: parsed.plans && parsed.plans.length > 0 ? parsed.plans : [...SEED_PLANS],
      outboxMessages: parsed.outboxMessages ?? [],
      domains: parsed.domains,
      quotaPolicies: parsed.quotaPolicies,
      rateLimitPolicies: parsed.rateLimitPolicies,
      auditLogs: parsed.auditLogs ?? [],
    };
  }

  private static logLegacyStoreMigration(collections: string[]): void {
    console.warn(
      `[PlatformRepository] Legacy store is missing optional collection(s) ${collections.join(', ')}; defaulting to empty and upgrading the store.`
    );
  }

  private static hydrateStore(parsed: PlatformRepositoryStoreData): void {
    this.organizations = parsed.organizations;
    this.projects = parsed.projects;
    this.environments = parsed.environments;
    this.apiKeys = parsed.apiKeys;
    this.credentials = parsed.credentials;
    this.packages = parsed.packages;
    this.packageVersions = parsed.packageVersions;
    this.packageInstallations = parsed.packageInstallations;
    this.pluginInstallations = parsed.pluginInstallations ?? [];
    this.plugins = parsed.plugins && parsed.plugins.length > 0 ? parsed.plugins : [...SEED_PLUGINS];
    this.plans = parsed.plans && parsed.plans.length > 0 ? parsed.plans : [...SEED_PLANS];
    this.outboxMessages = parsed.outboxMessages ?? [];
    this.domains = parsed.domains;
    this.quotaPolicies = parsed.quotaPolicies;
    this.rateLimitPolicies = parsed.rateLimitPolicies;
    this.auditLogs = parsed.auditLogs;
  }

  public static reloadFromDisk(): void {
    this.resolveDataPaths();
    if (!this.loadPersistedStore()) throw new Error('[PlatformRepository] Persistent store is missing. Startup aborted.');
    this.repairDuplicateProjectSlugs();
  }

  public static assertPersistenceHealthy(): void {
    this.initialize();
    if (!this.persistenceEnabled) return;
    this.resolveDataPaths();

    const candidates = [this.filePath!, `${this.filePath}.bak`];
    for (const candidate of candidates) {
      try {
        this.parseStoreData(fs.readFileSync(candidate, 'utf-8'));
        return;
      } catch {
        continue;
      }
    }

    throw new Error('[PlatformRepository] No valid persistent store or previous good copy is available.');
  }

  private static repairDuplicateProjectSlugs(): void {
    const seenSlugs = new Set<string>();
    const repairs: string[] = [];
    for (const project of this.projects) {
      const originalSlug = project.slug;
      const normalizedSlug = originalSlug.toLowerCase();
      if (!seenSlugs.has(normalizedSlug)) {
        seenSlugs.add(normalizedSlug);
        continue;
      }

      let suffix = 2;
      let repairedSlug = `${originalSlug}-${suffix}`;
      while (seenSlugs.has(repairedSlug.toLowerCase())) repairedSlug = `${originalSlug}-${++suffix}`;
      project.slug = repairedSlug;
      project.updatedAt = new Date().toISOString();
      seenSlugs.add(repairedSlug.toLowerCase());
      for (const key of this.apiKeys) {
        if (key.projectId === project.id && key.tenantScope?.includes(originalSlug)) {
          key.tenantScope = [repairedSlug];
        }
      }
      repairs.push(`${originalSlug} -> ${repairedSlug} (${project.id})`);
    }
    if (repairs.length > 0) {
      console.error(`[PlatformRepository] Repaired duplicate project slugs: ${repairs.join('; ')}`);
      this.saveImmediate();
    }
  }

  public static saveDebounced(): void {
    if (!this.persistenceEnabled || this.initializing) return;
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saveImmediate();
    }, 150);
  }

  public static flushPendingWrites(): void {
    if (!this.saveTimeout) return;
    clearTimeout(this.saveTimeout);
    this.saveTimeout = null;
    this.saveImmediate();
  }

  private static registerShutdownFlushHandlers(): void {
    if (this.shutdownFlushHandlersRegistered || typeof process === 'undefined') return;
    this.shutdownFlushHandlersRegistered = true;
    const flush = () => this.flushPendingWrites();
    process.once('beforeExit', flush);
    process.once('SIGTERM', flush);
    process.once('SIGINT', flush);
    process.once('exit', flush);
  }

  public static saveImmediate(): void {
    try {
      this.saveDurable();
    } catch (err) {
      console.error('[PlatformRepository] Failed to write persistent store to disk:', err);
    }
  }

  public static saveDurable(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    if (!this.persistenceEnabled) return;
    this.resolveDataPaths();
    if (!this.filePath) return;

    const payload: PlatformRepositoryStoreData = {
      organizations: this.organizations,
      projects: this.projects,
      environments: this.environments,
      apiKeys: this.apiKeys,
      credentials: this.credentials,
      packages: this.packages,
      packageVersions: this.packageVersions,
      packageInstallations: this.packageInstallations,
      pluginInstallations: this.pluginInstallations,
      plugins: this.plugins,
      plans: this.plans,
      outboxMessages: this.outboxMessages,
      domains: this.domains,
      quotaPolicies: this.quotaPolicies,
      rateLimitPolicies: this.rateLimitPolicies,
      auditLogs: this.auditLogs,
    };

    const serialized = JSON.stringify(payload, null, 2);
    const backupPath = `${this.filePath}.bak`;
    if (fs.existsSync(this.filePath)) {
      const previous = fs.readFileSync(this.filePath, 'utf-8');
      this.parseStoreData(previous);
      this.writeAtomicFile(backupPath, previous);
    }
    this.writeAtomicFile(this.filePath, serialized);
    this.writeInitializedMarker(`${this.filePath}.initialized`);
  }

  private static writeInitializedMarker(markerPath: string): void {
    if (!fs.existsSync(markerPath)) this.writeAtomicFile(markerPath, 'initialized\n');
  }

  private static writeAtomicFile(targetPath: string, contents: string): void {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tempPath = `${targetPath}.tmp.${process.pid}.${crypto.randomBytes(6).toString('hex')}`;
    let fd: number | undefined;
    try {
      fd = fs.openSync(tempPath, 'wx', 0o600);
      fs.writeFileSync(fd, contents, 'utf-8');
      fs.fsyncSync(fd);
      fs.closeSync(fd);
      fd = undefined;
      fs.renameSync(tempPath, targetPath);
      const dirFd = fs.openSync(dir, 'r');
      try {
        fs.fsyncSync(dirFd);
      } finally {
        fs.closeSync(dirFd);
      }
    } catch (err) {
      if (fd !== undefined) fs.closeSync(fd);
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // A completed rename leaves no temporary file to clean up.
      }
      throw err;
    }
  }

  private static persistCriticalChange(): void {
    if (this.initializing) return;
    if (!this.persistenceEnabled) {
      throw new Error('[PlatformRepository] Persistent storage is required for critical state changes.');
    }
    this.saveDurable();
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
    this.pluginInstallations = [];
    this.plugins = [];
    this.plans = [];
    this.outboxMessages = [];
    this.domains = [];
    this.quotaPolicies = [];
    this.rateLimitPolicies = [];
    this.auditLogs = [];
    this.initialized = false;
    this.initializing = false;
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
    this.persistCriticalChange();
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
      if (updates.status !== undefined || updates.complianceTier !== undefined) this.persistCriticalChange();
      else this.saveDebounced();
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
    const lookupSlug = idOrSlug.toLowerCase();
    return this.projects.find((p) => p.id === idOrSlug || p.slug.toLowerCase() === lookupSlug);
  }

  static createProject(input: CreateProjectInput): { project: PlatformProject; environments: ProjectEnvironment[] } {
    this.initialize();
    const suppliedSlug = input.slug?.trim() || '';
    const suppliedSlugIsValid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(suppliedSlug);
    const slugSource = suppliedSlugIsValid ? suppliedSlug : input.name;
    const baseSlug = slugSource.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!baseSlug) throw new Error('Project name must produce a valid slug.');

    const slugExists = (candidate: string) =>
      this.projects.some((project) => project.slug.toLowerCase() === candidate.toLowerCase());
    if (suppliedSlugIsValid && slugExists(baseSlug)) {
      throw new Error(`Project slug "${baseSlug}" is already in use.`);
    }

    let slug = baseSlug;
    if (!suppliedSlugIsValid) {
      let suffix = 2;
      while (slugExists(slug)) slug = `${baseSlug}-${suffix++}`;
    }
    const projectId = `proj_${slug}_${Date.now().toString(36)}`;

    const planKey = (input.plan || input.planTier || 'starter').toLowerCase();
    const enabledServices = input.enabledServices || input.initialPackages || [];
    const quota = input.apiCallQuota || PLAN_DEFAULT_QUOTAS[planKey] || 100000;
    const rateLimit = input.rateLimitPerMin || PLAN_DEFAULT_RATE_LIMITS[planKey] || 60;

    const project: PlatformProject = {
      id: projectId,
      slug,
      name: input.name,
      organizationId: input.organizationId,
      businessModel: input.businessModel as any,
      planTier: planKey as any,
      plan: planKey,
      enabledServices,
      apiCallQuota: quota,
      monthlyApiCalls: 0,
      rateLimitPerMin: rateLimit,
      status: input.status || 'ACTIVE',
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

    // Part A: Organization resolution (No org_default. Refuse if not resolved)
    const org = this.organizations.find((o) => o.id === input.organizationId || o.slug === input.organizationId);
    if (!org) {
      throw new Error(`Organization "${input.organizationId}" not found. Cannot provision tenant without a valid organization.`);
    }
    const orgSlug = org.slug;
    const canonicalTenantId = TENANT_RE.test(slug)
      ? slug
      : `org/${orgSlug}/project/${slug}/environment/production`;

    // Part A: Create PluginInstallation rows ONLY from an explicit entitlement or plan
    // Remove the businessModel guessing; a business type never grants a plugin.
    if (input.plugins && input.plugins.length > 0) {
      for (const p of input.plugins) {
        const canonical = canonicalizePluginId(p.pluginId);
        this.provisionPluginInstallation({
          tenantId: canonicalTenantId,
          pluginId: canonical,
          runtimeTenantId: canonicalTenantId,
          status: (input.status as any) || 'ACTIVE',
          planId: p.planId || planKey,
          config: p.config || {},
        });
      }
    }

    this.persistCriticalChange();
    return { project, environments: [prodEnv, stgEnv, devEnv] };
  }

  static updateProject(projectId: string, updates: Partial<PlatformProject>): PlatformProject | undefined {
    this.initialize();
    const idx = this.projects.findIndex((p) => p.id === projectId || p.slug.toLowerCase() === projectId.toLowerCase());
    if (idx !== -1) {
      if (updates.slug !== undefined && updates.slug !== this.projects[idx]!.slug) {
        throw new Error('Project slug is immutable after creation.');
      }
      this.projects[idx] = { ...this.projects[idx]!, ...updates, updatedAt: new Date().toISOString() };

      if (updates.status) {
        const projSlug = this.projects[idx]!.slug;
        const projId = this.projects[idx]!.id;
        for (const inst of this.pluginInstallations) {
          if (inst.tenantId === projSlug || inst.tenantId === projId) {
            inst.status = updates.status;
            inst.updatedAt = new Date().toISOString();
          }
        }
      }

      const durableFields: Array<keyof PlatformProject> = [
        'status',
        'planTier',
        'plan',
        'enabledServices',
        'apiCallQuota',
        'rateLimitPerMin',
      ];
      if (durableFields.some((field) => updates[field] !== undefined)) this.persistCriticalChange();
      else this.saveDebounced();
      return this.projects[idx];
    }
    return undefined;
  }

  static deleteProject(projectId: string): boolean {
    this.initialize();
    const initialLen = this.projects.length;
    this.projects = this.projects.filter((p) => p.id !== projectId && p.slug !== projectId);
    if (this.projects.length !== initialLen) {
      this.persistCriticalChange();
      return true;
    }
    return false;
  }

  static incrementProjectUsage(projectId: string, amount: number = 1): number {
    this.initialize();
    const proj = this.projects.find((p) => p.id === projectId || p.slug === projectId);
    if (proj) {
      proj.monthlyApiCalls = (proj.monthlyApiCalls || 0) + amount;
      this.saveDebounced();
      return proj.monthlyApiCalls;
    }
    return 0;
  }

  static reserveProjectUsage(projectId: string, monthlyQuota: number = Number.POSITIVE_INFINITY): number | undefined {
    this.initialize();
    const project = this.projects.find((item) => item.id === projectId || item.slug === projectId);
    if (!project) return undefined;

    const currentUsage = project.monthlyApiCalls || 0;
    if (currentUsage >= monthlyQuota) return undefined;

    project.monthlyApiCalls = currentUsage + 1;
    this.saveDebounced();
    return project.monthlyApiCalls;
  }

  static releaseProjectUsage(projectId: string, amount: number = 1): number {
    this.initialize();
    const project = this.projects.find((item) => item.id === projectId || item.slug === projectId);
    if (!project) return 0;

    project.monthlyApiCalls = Math.max(0, (project.monthlyApiCalls || 0) - amount);
    this.saveDebounced();
    return project.monthlyApiCalls;
  }

  static setProjectUsage(projectId: string, monthlyApiCalls: number): PlatformProject | undefined {
    this.initialize();
    if (!Number.isSafeInteger(monthlyApiCalls) || monthlyApiCalls < 0) {
      throw new Error('monthlyApiCalls must be a non-negative safe integer.');
    }
    const project = this.projects.find((item) => item.id === projectId || item.slug === projectId);
    if (!project) return undefined;
    project.monthlyApiCalls = monthlyApiCalls;
    project.updatedAt = new Date().toISOString();
    this.saveImmediate();
    return project;
  }

  static resetMonthlyProjectUsage(): number {
    this.initialize();
    let resetCount = 0;
    for (const project of this.projects) {
      if ((project.monthlyApiCalls || 0) !== 0) resetCount++;
      project.monthlyApiCalls = 0;
      project.updatedAt = new Date().toISOString();
    }
    this.saveImmediate();
    return resetCount;
  }

  static recordAuditEvent(event: Record<string, any>): Record<string, any> {
    this.initialize();
    const record = {
      id: `audit_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      ...event,
    };
    this.auditLogs = [record, ...this.auditLogs].slice(0, 10000);
    this.saveImmediate();
    return record;
  }

  static listAuditEvents(filter?: { projectId?: string }): Array<Record<string, any>> {
    this.initialize();
    return this.auditLogs.filter((event) => !filter?.projectId || event.projectId === filter.projectId);
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
      if (PlatformKeyEngine.verifySecret(incomingSecret, key.authVerifier, serverPepper)) {
        return key;
      }
    }
    return undefined;
  }

  private static buildApiKey(input: CreateKeyInput, serverPepper?: string): { keyRecord: PlatformApiKeyRecord; rawSecret: string } {
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

    return { keyRecord, rawSecret: generated.rawSecret };
  }

  static createApiKey(input: CreateKeyInput, serverPepper?: string): { keyRecord: PlatformApiKeyRecord; rawSecret: string } {
    this.initialize();
    const created = this.buildApiKey(input, serverPepper);
    this.apiKeys.push(created.keyRecord);
    this.persistCriticalChange();
    return created;
  }

  static rotateApiKey(
    keyId: string,
    options: { graceWindowDays?: number; operatorEmail: string }
  ): { replacementKey: PlatformApiKeyRecord; replacementRawSecret: string } | undefined {
    this.initialize();
    const oldKey = this.getApiKey(keyId);
    if (!oldKey) return undefined;

    // 1. Generate Replacement Key with identical parameters
    const created = this.buildApiKey(
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
    this.apiKeys.push(created.keyRecord);

    // 2. Set grace period on old key or mark suspended
    const oldIdx = this.apiKeys.findIndex((k) => k.id === oldKey.id);
    if (oldIdx !== -1) {
      if (options.graceWindowDays && options.graceWindowDays > 0) {
        this.apiKeys[oldIdx]!.expiresAt = new Date(Date.now() + options.graceWindowDays * 24 * 3600 * 1000).toISOString();
      } else {
        this.apiKeys[oldIdx]!.status = 'SUSPENDED';
      }
      this.apiKeys[oldIdx]!.revokeReason = `Rotated in favor of replacement key [${created.keyRecord.keyId}]`;
    }

    this.persistCriticalChange();

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
      this.persistCriticalChange();
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
    this.persistCriticalChange();
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

    const canonical = canonicalizePluginId(packageId);
    if (canonical === '@orbitox/restaurant' || canonical === '@orbitox/hms') {
      const env = this.environments.find((e) => e.id === environmentId);
      const proj = env ? this.projects.find((p) => p.id === env.projectId) : undefined;
      const org = proj ? this.organizations.find((o) => o.id === proj.organizationId) : undefined;
      if (!org) {
        throw new Error(
          `Organization for project "${proj?.slug || environmentId}" could not be resolved. Cannot provision installation without a valid organization.`
        );
      }
      const orgSlug = org.slug;
      const slug = proj?.slug || environmentId;
      const canonicalTenantId = `org/${orgSlug}/project/${slug}/environment/${env?.slug || 'production'}`;
      this.provisionPluginInstallation({
        tenantId: canonicalTenantId,
        pluginId: canonical,
        runtimeTenantId: canonicalTenantId,
        status: 'ACTIVE',
        planId: proj?.plan || proj?.planTier,
      });
    }

    this.saveDebounced();
    return record;
  }

  // ─────────────────────────────────────────────────────────────
  // PLUGIN INSTALLATIONS (Canonical tenantId, Entitlement Engine)
  // ─────────────────────────────────────────────────────────────

  static listPluginInstallations(tenantId?: string): PluginInstallationRecord[] {
    this.initialize();
    if (tenantId) {
      let lookup = tenantId.trim();
      if (!TENANT_RE.test(lookup)) {
        const proj = this.getProject(lookup);
        const org = proj ? this.getOrganization(proj.organizationId) : undefined;
        if (proj && org) lookup = `org/${org.slug}/project/${proj.slug}/environment/production`;
      }
      return this.pluginInstallations.filter((p) => p.tenantId === lookup);
    }
    return [...this.pluginInstallations];
  }

  static getPluginInstallation(tenantId: string, pluginId: string): PluginInstallationRecord | undefined {
    this.initialize();
    const canonical = canonicalizePluginId(pluginId);
    const targetTenantId = tenantId?.trim();
    let resolvedTenantId = targetTenantId;
    if (!TENANT_RE.test(targetTenantId)) {
      const proj = this.getProject(targetTenantId);
      const org = proj ? this.getOrganization(proj.organizationId) : undefined;
      if (proj && org) {
        resolvedTenantId = `org/${org.slug}/project/${proj.slug}/environment/production`;
      }
    }
    // Requirement 4: Look installations up by tenantId only, and remove the OR runtimeTenantId match
    return this.pluginInstallations.find(
      (p) =>
        (p.tenantId === targetTenantId || p.tenantId === resolvedTenantId) &&
        (canonicalizePluginId(p.pluginId) === canonical ||
          p.pluginId === pluginId ||
          p.pluginId === canonical.replace(/^@orbitox\//, ''))
    );
  }

  static provisionPluginInstallation(input: ProvisionPluginInstallationInput): PluginInstallationRecord {
    this.initialize();
    const tenantId = input.tenantId?.trim();
    const pluginId = canonicalizePluginId(input.pluginId);
    let runtimeTenantId = input.runtimeTenantId?.trim();

    if (!tenantId) throw new Error('Field "tenantId" is required for plugin installation.');
    if (!pluginId) throw new Error('Field "pluginId" is required for plugin installation.');

    if (!runtimeTenantId) {
      if (TENANT_RE.test(tenantId)) {
        runtimeTenantId = tenantId;
      } else {
        const proj = this.getProject(tenantId);
        const org = proj ? this.getOrganization(proj.organizationId) : undefined;
        if (proj && org) {
          runtimeTenantId = `org/${org.slug}/project/${proj.slug}/environment/production`;
        }
      }
    }

    if (!runtimeTenantId || !TENANT_RE.test(runtimeTenantId)) {
      throw new Error(
        `Target runtime tenant ID "${runtimeTenantId}" is not in canonical format (org/{org}/project/{proj}/environment/{env}).`
      );
    }

    // Anti-claim protection: check if another tenant already claimed this runtimeTenantId for this plugin
    const existingClaim = this.pluginInstallations.find(
      (p) =>
        canonicalizePluginId(p.pluginId) === pluginId &&
        p.runtimeTenantId === runtimeTenantId &&
        p.tenantId !== tenantId
    );
    if (existingClaim) {
      const err = new Error(
        `Runtime tenant "${runtimeTenantId}" for plugin "${pluginId}" is already claimed by tenant "${existingClaim.tenantId}".`
      );
      (err as any).code = 'RUNTIME_TENANT_ALREADY_CLAIMED';
      throw err;
    }

    const existingIdx = this.pluginInstallations.findIndex(
      (p) => p.tenantId === tenantId && canonicalizePluginId(p.pluginId) === pluginId
    );

    if (existingIdx !== -1) {
      const existing = this.pluginInstallations[existingIdx]!;

      // Part A 5: Never overwrite an existing runtimeTenantId
      if (existing.runtimeTenantId && existing.runtimeTenantId !== runtimeTenantId) {
        throw new Error(
          `Cannot overwrite existing runtimeTenantId "${existing.runtimeTenantId}" with "${runtimeTenantId}".`
        );
      }

      // Part A 5: Never turn ARCHIVED back to ACTIVE through provisioning
      if (existing.status === 'ARCHIVED') {
        const err = new Error(
          `Cannot re-activate ARCHIVED plugin installation for tenant "${tenantId}". Re-activation requires an explicit, audited admin action.`
        );
        (err as any).code = 'ARCHIVED_RESURRECTION_REFUSED';
        throw err;
      }

      const targetStatus = (input.status as any) || existing.status;
      assertValidInstallationTransition(existing.status, targetStatus);
      const revision = (input.entitlementRevision ?? existing.entitlementRevision) + (targetStatus !== existing.status ? 1 : 0);

      const record: PluginInstallationRecord = {
        ...existing,
        runtimeTenantId,
        status: targetStatus,
        entitlementRevision: revision,
        planId: input.planId !== undefined ? input.planId : existing.planId,
        config: input.config || existing.config,
        updatedAt: new Date().toISOString(),
      };
      this.pluginInstallations[existingIdx] = record;

      this.recordOutboxMessage({
        tenantId,
        eventType: 'entitlement.updated',
        aggregateType: 'PluginInstallation',
        aggregateId: record.id,
        payload: {
          tenantId,
          pluginId,
          planId: record.planId,
          status: record.status,
          revision: record.entitlementRevision,
        },
      });

      this.saveDebounced();
      return record;
    }

    const targetStatus = (input.status as any) || 'ACTIVE';

    const record: PluginInstallationRecord = {
      id: `pinst_${crypto.randomUUID()}`,
      tenantId,
      pluginId,
      runtimeTenantId,
      status: targetStatus,
      entitlementRevision: input.entitlementRevision ?? 1,
      planId: input.planId ?? null,
      config: input.config || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.pluginInstallations.push(record);

    this.recordOutboxMessage({
      tenantId,
      eventType: 'entitlement.updated',
      aggregateType: 'PluginInstallation',
      aggregateId: record.id,
      payload: {
        tenantId,
        pluginId,
        planId: record.planId,
        status: record.status,
        revision: record.entitlementRevision,
      },
    });

    this.saveDebounced();
    return record;
  }

  static updatePluginInstallationStatus(
    tenantId: string,
    pluginId: string,
    status: PluginInstallationStatus | string
  ): PluginInstallationRecord {
    this.initialize();
    const canonical = canonicalizePluginId(pluginId);
    const existing = this.getPluginInstallation(tenantId, canonical);
    if (!existing) {
      throw new Error(`Plugin installation for tenant "${tenantId}" and plugin "${canonical}" not found.`);
    }

    assertValidInstallationTransition(existing.status, status);

    const updated: PluginInstallationRecord = {
      ...existing,
      status,
      entitlementRevision: existing.entitlementRevision + 1,
      updatedAt: new Date().toISOString(),
    };
    const idx = this.pluginInstallations.findIndex((p) => p.id === existing.id);
    if (idx !== -1) {
      this.pluginInstallations[idx] = updated;
    }

    this.recordOutboxMessage({
      tenantId: existing.tenantId,
      eventType: 'entitlement.updated',
      aggregateType: 'PluginInstallation',
      aggregateId: updated.id,
      payload: {
        tenantId: existing.tenantId,
        pluginId: canonical,
        planId: updated.planId,
        status: updated.status,
        revision: updated.entitlementRevision,
      },
    });

    this.saveDebounced();
    return updated;
  }

  static uninstallPluginInstallation(tenantId: string, pluginId: string): PluginInstallationRecord {
    this.initialize();
    const canonical = canonicalizePluginId(pluginId);
    const existing = this.getPluginInstallation(tenantId, canonical);
    if (!existing) {
      throw new Error(`Plugin installation for tenant "${tenantId}" and plugin "${canonical}" not found.`);
    }

    assertValidInstallationTransition(existing.status, 'ARCHIVED');

    const updated: PluginInstallationRecord = {
      ...existing,
      status: 'ARCHIVED',
      entitlementRevision: existing.entitlementRevision + 1,
      updatedAt: new Date().toISOString(),
    };
    const idx = this.pluginInstallations.findIndex((p) => p.id === existing.id);
    if (idx !== -1) {
      this.pluginInstallations[idx] = updated;
    }

    this.recordOutboxMessage({
      tenantId: existing.tenantId,
      eventType: 'entitlement.updated',
      aggregateType: 'PluginInstallation',
      aggregateId: updated.id,
      payload: {
        tenantId: existing.tenantId,
        pluginId: canonical,
        planId: updated.planId,
        status: updated.status,
        revision: updated.entitlementRevision,
      },
    });

    this.saveDebounced();
    return updated;
  }

  static reactivatePluginInstallation(
    tenantId: string,
    pluginId: string,
    options: { actorId?: string; actorEmail?: string; reason: string }
  ): PluginInstallationRecord {
    this.initialize();
    const canonical = canonicalizePluginId(pluginId);
    const existing = this.getPluginInstallation(tenantId, canonical);
    if (!existing) {
      throw new Error(`Plugin installation for tenant "${tenantId}" and plugin "${canonical}" not found.`);
    }
    if (existing.status !== 'ARCHIVED') {
      throw new Error(`Only ARCHIVED installations can be reactivated. Current status is "${existing.status}".`);
    }

    assertValidInstallationTransition(existing.status, 'ACTIVE', true);

    const updated: PluginInstallationRecord = {
      ...existing,
      status: 'ACTIVE',
      entitlementRevision: existing.entitlementRevision + 1,
      updatedAt: new Date().toISOString(),
    };
    const idx = this.pluginInstallations.findIndex((p) => p.id === existing.id);
    if (idx !== -1) {
      this.pluginInstallations[idx] = updated;
    }

    this.recordOutboxMessage({
      tenantId: existing.tenantId,
      eventType: 'entitlement.updated',
      aggregateType: 'PluginInstallation',
      aggregateId: updated.id,
      payload: {
        tenantId: existing.tenantId,
        pluginId: canonical,
        planId: updated.planId,
        status: updated.status,
        revision: updated.entitlementRevision,
        reactivatedBy: options?.actorEmail || options?.actorId || 'platform_admin',
        reason: options?.reason,
      },
    });

    this.recordAuditEvent({
      action: 'PLUGIN_INSTALLATION_REACTIVATED',
      entityType: 'PluginInstallation',
      entityId: updated.id,
      actorId: options.actorId || 'platform_admin',
      actorEmail: options.actorEmail,
      reason: options.reason,
      metadata: {
        tenantId: existing.tenantId,
        pluginId: canonical,
        revision: updated.entitlementRevision,
      },
    });

    this.persistCriticalChange();
    return updated;
  }

  static changePluginInstallationPlan(
    tenantId: string,
    pluginId: string,
    newPlanId: string
  ): PluginInstallationRecord {
    this.initialize();
    const canonical = canonicalizePluginId(pluginId);
    const existing = this.getPluginInstallation(tenantId, canonical);
    if (!existing) {
      throw new Error(`Plugin installation for tenant "${tenantId}" and plugin "${canonical}" not found.`);
    }

    const plan = this.getPlan(newPlanId);
    if (!plan) {
      throw new Error(`Plan "${newPlanId}" does not exist in the plan catalogue.`);
    }

    const updated: PluginInstallationRecord = {
      ...existing,
      planId: newPlanId,
      entitlementRevision: existing.entitlementRevision + 1,
      updatedAt: new Date().toISOString(),
    };
    const idx = this.pluginInstallations.findIndex((p) => p.id === existing.id);
    if (idx !== -1) {
      this.pluginInstallations[idx] = updated;
    }

    this.recordOutboxMessage({
      tenantId: existing.tenantId,
      eventType: 'entitlement.updated',
      aggregateType: 'PluginInstallation',
      aggregateId: updated.id,
      payload: {
        tenantId: existing.tenantId,
        pluginId: canonical,
        planId: newPlanId,
        status: updated.status,
        revision: updated.entitlementRevision,
      },
    });

    this.saveDebounced();
    return updated;
  }

  static checkQuotaUsage(
    tenantId: string,
    pluginId: string,
    quotaKey: string,
    currentCount: number,
    requestedIncrement = 1
  ): { allowed: boolean; limit: number; current: number; reason?: string } {
    this.initialize();
    const canonical = canonicalizePluginId(pluginId);
    const existing = this.getPluginInstallation(tenantId, canonical);
    if (!existing || !existing.planId) {
      return { allowed: true, limit: -1, current: currentCount };
    }

    const plan = this.getPlan(existing.planId);
    if (!plan) {
      return { allowed: true, limit: -1, current: currentCount };
    }

    const quota = plan.quotas.find((q) => q.quotaKey === quotaKey);
    if (!quota || quota.limit === -1) {
      return { allowed: true, limit: -1, current: currentCount };
    }

    if (requestedIncrement === 0) {
      return { allowed: true, limit: quota.limit, current: currentCount };
    }

    if (currentCount + requestedIncrement > quota.limit) {
      return {
        allowed: false,
        limit: quota.limit,
        current: currentCount,
        reason: `QUOTA_EXCEEDED: Quota limit of ${quota.limit} for "${quotaKey}" would be exceeded (current: ${currentCount}, requested: +${requestedIncrement}). Writes blocked, reads permitted.`,
      };
    }

    return { allowed: true, limit: quota.limit, current: currentCount };
  }

  // ─────────────────────────────────────────────────────────────
  // PLAN CATALOGUE (Part B)
  // ─────────────────────────────────────────────────────────────

  static listPlugins(): PluginCatalogueItem[] {
    this.initialize();
    return [...this.plugins];
  }

  static getPlugin(pluginId: string): PluginCatalogueItem | undefined {
    this.initialize();
    const canonical = canonicalizePluginId(pluginId);
    return this.plugins.find((p) => p.pluginId === canonical || p.pluginId === pluginId);
  }

  static listPlans(pluginId?: string): PlanCatalogueRecord[] {
    this.initialize();
    if (pluginId) {
      const canonical = canonicalizePluginId(pluginId);
      return this.plans.filter((p) => p.pluginId === canonical || p.pluginId === pluginId);
    }
    return [...this.plans];
  }

  static getPlan(planId: string): PlanCatalogueRecord | undefined {
    this.initialize();
    return this.plans.find((p) => p.planId === planId);
  }

  static createPlan(input: PlanCatalogueRecord): PlanCatalogueRecord {
    this.initialize();
    const existing = this.plans.find((p) => p.planId === input.planId);
    if (existing) {
      throw new Error(`Plan "${input.planId}" already exists.`);
    }
    const plan: PlanCatalogueRecord = {
      ...input,
      id: input.id || `plan_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.plans.push(plan);
    this.persistCriticalChange();
    return plan;
  }

  static updatePlan(planId: string, updates: Partial<PlanCatalogueRecord>): PlanCatalogueRecord {
    this.initialize();
    const idx = this.plans.findIndex((p) => p.planId === planId);
    if (idx === -1) {
      throw new Error(`Plan "${planId}" not found.`);
    }
    const updated: PlanCatalogueRecord = {
      ...this.plans[idx]!,
      ...updates,
      planId: this.plans[idx]!.planId,
      updatedAt: new Date().toISOString(),
    };
    this.plans[idx] = updated;

    // Requirement: A plan change bumps the revision of every affected installation
    for (const inst of this.pluginInstallations) {
      if (inst.planId === planId) {
        inst.entitlementRevision += 1;
        inst.updatedAt = new Date().toISOString();
        this.recordOutboxMessage({
          tenantId: inst.tenantId,
          eventType: 'entitlement.updated',
          aggregateType: 'PluginInstallation',
          aggregateId: inst.id,
          payload: {
            tenantId: inst.tenantId,
            pluginId: inst.pluginId,
            planId: inst.planId,
            status: inst.status,
            revision: inst.entitlementRevision,
            reason: 'plan.updated',
          },
        });
      }
    }

    this.persistCriticalChange();
    return updated;
  }

  static ensurePlanCatalogueSeeded(): void {
    this.initialize();
    for (const p of SEED_PLUGINS) {
      const idx = this.plugins.findIndex((plug) => plug.pluginId === p.pluginId);
      if (idx !== -1) {
        this.plugins[idx] = { ...p, id: this.plugins[idx]!.id };
      } else {
        this.plugins.push(p);
      }
    }
    for (const pl of SEED_PLANS) {
      const idx = this.plans.findIndex((plan) => plan.planId === pl.planId);
      if (idx !== -1) {
        this.plans[idx] = { ...pl, id: this.plans[idx]!.id };
      } else {
        this.plans.push(pl);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // OUTBOX MESSAGES (Part C)
  // ─────────────────────────────────────────────────────────────

  static listOutboxMessages(filter?: { tenantId?: string; status?: string }): PlatformOutboxRecord[] {
    this.initialize();
    return this.outboxMessages.filter((m) => {
      if (filter?.tenantId && m.tenantId !== filter.tenantId) return false;
      if (filter?.status && m.status !== filter.status) return false;
      return true;
    });
  }

  static recordOutboxMessage(input: {
    tenantId: string;
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    payload: Record<string, any>;
  }): PlatformOutboxRecord {
    this.initialize();
    const message: PlatformOutboxRecord = {
      id: `outbox_${crypto.randomUUID()}`,
      tenantId: input.tenantId,
      eventType: input.eventType,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      payload: input.payload,
      status: 'PENDING',
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.outboxMessages.push(message);
    return message;
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
      this.persistCriticalChange();
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
