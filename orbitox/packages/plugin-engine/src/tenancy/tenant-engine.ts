import { AsyncLocalStorage } from 'async_hooks';
import { createOrbitoX, OrbitoXApp, OrbitoXPluginDefinition } from '../client';

export type DomainStatus = 'ACTIVE' | 'PENDING_DNS' | 'SUSPENDED' | 'EXPIRED';
export type TenantTier = 'starter' | 'growth' | 'pro' | 'enterprise';

export interface TenantConfig {
  tenantId: string;
  name?: string;
  domain?: string;
  subdomain?: string;
  tier?: TenantTier;
  status?: DomainStatus;
  license?: string;
  features?: string[];
  metadata?: Record<string, any>;
  customPlugins?: OrbitoXPluginDefinition[];
}

export interface MultiTenantEngineOptions {
  /**
   * Static domain/subdomain mapping:
   * e.g. { 'apollo.orbito.com': { tenantId: 'apollo', name: 'Apollo Hospitals', tier: 'enterprise' } }
   */
  domains?: Record<string, TenantConfig>;

  /**
   * Root wildcard domain for automatic subdomains (e.g. 'orbito.com')
   * An incoming request for 'apollo.orbito.com' automatically maps to tenant 'apollo'.
   */
  wildcardRootDomain?: string;

  /**
   * Async database / Redis lookup function for dynamic multi-tenant domain resolution
   */
  resolveTenant?: (host: string) => Promise<TenantConfig | null | undefined> | TenantConfig | null | undefined;

  /**
   * Global plugins to mount for all tenants
   */
  plugins?: OrbitoXPluginDefinition[];

  /**
   * RSA Public Key PEM for cryptographic license verification
   */
  publicKey?: string;

  /**
   * Enforce strict cryptographic license check on every custom domain
   */
  strictSecurity?: boolean;

  /**
   * In-Memory TTL Cache duration in milliseconds (default: 300,000 ms = 5 mins)
   */
  cacheTtlMs?: number;

  /**
   * Fallback default tenant config if domain is unknown (e.g. during local testing)
   */
  defaultTenant?: TenantConfig;

  /**
   * Dual-engine cluster mode:
   * - 'standalone': Single node, zero external dependencies, in-memory local invalidation
   * - 'distributed': Multi-server cluster mesh, broadcasts invalidations across Redis pub/sub
   * - 'auto': Auto-detects Redis presence or CLUSTER_MODE env var
   */
  clusterMode?: 'standalone' | 'distributed' | 'auto';

  /**
   * Optional cluster invalidation publisher (e.g., Redis Pub/Sub client)
   */
  broadcastInvalidation?: (domain?: string) => Promise<void> | void;

  /**
   * Optional cluster invalidation subscriber hook
   */
  listenInvalidation?: (handler: (domain?: string) => void) => void;
}

export interface ActiveTenantSession {
  tenant: TenantConfig;
  app: OrbitoXApp;
  domain: string;
  hasFeature: (featureName: string) => boolean;
  isTier: (targetTier: TenantTier) => boolean;
  scopeData: <T extends Record<string, any>>(data: T) => T & { tenantId: string };
}

interface CacheEntry {
  config: TenantConfig;
  expiresAt: number;
}

// 🛡️ Global AsyncLocalStorage for Zero-Boilerplate Tenant Context Propagation
const tenantStorage = new AsyncLocalStorage<ActiveTenantSession>();

/**
 * Retrieves the currently active tenant session from any asynchronous execution context
 */
export function getActiveTenant(): ActiveTenantSession | undefined {
  return tenantStorage.getStore();
}

/**
 * 🪐 MultiTenantEngine — Enterprise Multi-Tenancy, High-Performance TTL Caching & Custom Domain Router
 * Supports BOTH Single-Server (Standalone) and Multi-Server (Clustered Mesh) topologies.
 */
export class MultiTenantEngine {
  private readonly tenantAppCache = new Map<string, OrbitoXApp>();
  private readonly domainResolutionCache = new Map<string, CacheEntry>();
  private readonly cacheTtlMs: number;
  public readonly clusterMode: 'standalone' | 'distributed';

  constructor(private readonly options: MultiTenantEngineOptions = {}) {
    this.cacheTtlMs = options.cacheTtlMs ?? 5 * 60 * 1000; // Default 5 mins TTL

    const isDistributed =
      options.clusterMode === 'distributed' ||
      (options.clusterMode !== 'standalone' &&
        (typeof process !== 'undefined' &&
          (process.env?.CLUSTER_MODE === 'distributed' ||
            process.env?.ORBITOX_DEPLOYMENT_MODE === 'distributed' ||
            Boolean(process.env?.REDIS_URL))));

    this.clusterMode = isDistributed ? 'distributed' : 'standalone';

    // Hook up cluster-wide invalidation subscriber if provided
    if (options.listenInvalidation) {
      try {
        options.listenInvalidation((domain?: string) => {
          this.invalidateLocalCache(domain);
        });
      } catch (err) {
        console.warn('[OrbitoX MultiTenantEngine] Failed to bind cluster listener, continuing in local mode:', err);
      }
    }
  }

  /**
   * Resolves a tenant configuration from a domain/hostname string with High-Speed In-Memory TTL Caching
   */
  public async resolve(hostname: string): Promise<TenantConfig | null> {
    const cleanHost = hostname.split(':')[0]!.toLowerCase().trim();
    const now = Date.now();

    // 1. Check in-memory TTL cache (sub-millisecond fast path)
    const cached = this.domainResolutionCache.get(cleanHost);
    if (cached && cached.expiresAt > now) {
      return cached.config;
    }

    let resolved: TenantConfig | null = null;

    // 2. Direct match in static domain mapping
    if (this.options.domains && this.options.domains[cleanHost]) {
      resolved = {
        tier: 'growth',
        status: 'ACTIVE',
        ...this.options.domains[cleanHost]!,
        domain: cleanHost,
      };
    }

    // 3. Wildcard root domain check (e.g. 'client.orbito.com' -> 'client')
    if (!resolved && this.options.wildcardRootDomain) {
      const root = this.options.wildcardRootDomain.toLowerCase();
      if (cleanHost.endsWith(`.${root}`)) {
        const subdomain = cleanHost.slice(0, -(root.length + 1));
        if (subdomain && !subdomain.includes('.')) {
          resolved = {
            tenantId: `tenant_${subdomain}`,
            name: `${subdomain.charAt(0).toUpperCase() + subdomain.slice(1)} Tenant`,
            domain: cleanHost,
            subdomain,
            tier: 'growth',
            status: 'ACTIVE',
          };
        }
      }
    }

    // 4. Dynamic async resolver (Database / Redis)
    if (!resolved && this.options.resolveTenant) {
      const dynamicConfig = await this.options.resolveTenant(cleanHost);
      if (dynamicConfig) {
        resolved = {
          tier: 'starter',
          status: 'ACTIVE',
          ...dynamicConfig,
          domain: cleanHost,
        };
      }
    }

    // 5. Default fallback if configured
    if (!resolved && this.options.defaultTenant) {
      resolved = {
        tier: 'starter',
        status: 'ACTIVE',
        ...this.options.defaultTenant,
        domain: cleanHost,
      };
    }

    if (resolved) {
      // Store in memory TTL cache
      this.domainResolutionCache.set(cleanHost, {
        config: resolved,
        expiresAt: now + this.cacheTtlMs,
      });
    }

    return resolved;
  }

  /**
   * Invalidates local V8 cache only without triggering remote pub/sub broadcast
   */
  public invalidateLocalCache(domain?: string): void {
    if (domain) {
      const cleanHost = domain.split(':')[0]!.toLowerCase().trim();
      this.domainResolutionCache.delete(cleanHost);
    } else {
      this.domainResolutionCache.clear();
      this.tenantAppCache.clear();
    }
  }

  /**
   * Clears the domain resolution cache and broadcasts invalidation across the cluster if in distributed mode
   */
  public async invalidateCache(domain?: string): Promise<void> {
    this.invalidateLocalCache(domain);

    if (this.clusterMode === 'distributed' && this.options.broadcastInvalidation) {
      try {
        await this.options.broadcastInvalidation(domain);
      } catch (err) {
        console.warn('[OrbitoX MultiTenantEngine] Cluster invalidation broadcast failed, fallback to local TTL:', err);
      }
    }
  }

  /**
   * Returns current engine cluster metrics and cached tenant counts
   */
  public getClusterStatus() {
    return {
      mode: this.clusterMode,
      isDistributed: this.clusterMode === 'distributed',
      cachedDomainsCount: this.domainResolutionCache.size,
      cachedAppsCount: this.tenantAppCache.size,
      cacheTtlMs: this.cacheTtlMs,
      invalidationProtocol:
        this.clusterMode === 'distributed'
          ? 'Redis Pub/Sub (orbitox:cache:invalidation)'
          : 'Local V8 Memory',
    };
  }

  /**
   * Gets or initializes an isolated OrbitoXApp runtime for a specific tenant
   */
  public async getAppForTenant(tenant: TenantConfig): Promise<OrbitoXApp> {
    const cacheKey = `${tenant.tenantId}_${tenant.domain || 'default'}`;

    if (this.tenantAppCache.has(cacheKey)) {
      return this.tenantAppCache.get(cacheKey)!;
    }

    const allPlugins = [
      ...(this.options.plugins || []),
      ...(tenant.customPlugins || []),
    ];

    const app = await createOrbitoX({
      contextId: tenant.tenantId,
      domain: tenant.domain,
      license: tenant.license,
      publicKey: this.options.publicKey,
      strictSecurity: this.options.strictSecurity,
      plugins: allPlugins,
    });

    this.tenantAppCache.set(cacheKey, app);
    return app;
  }

  /**
   * Builds an active tenant session with feature guards, tier helpers, and data scoping
   */
  public createSession(tenant: TenantConfig, app: OrbitoXApp, domain: string): ActiveTenantSession {
    const sessionTier = tenant.tier || 'growth';
    const tierRanks: Record<TenantTier, number> = {
      starter: 1,
      growth: 2,
      pro: 3,
      enterprise: 4,
    };

    return {
      tenant,
      app,
      domain,
      hasFeature: (featureName: string) => {
        if (tenant.features && tenant.features.length > 0) {
          if (tenant.features.includes('*')) return true;
          return tenant.features.includes(featureName);
        }
        if (app.security.allowedFeatures.includes('*')) return true;
        return app.security.allowedFeatures.includes(featureName);
      },

      isTier: (targetTier: TenantTier) => {
        return (tierRanks[sessionTier] || 0) >= (tierRanks[targetTier] || 0);
      },
      scopeData: <T extends Record<string, any>>(data: T): T & { tenantId: string } => {
        return {
          ...data,
          tenantId: tenant.tenantId, // Always enforce tenant isolation
        };
      },
    };
  }

  /**
   * Runs an asynchronous function inside the execution context of a specific tenant
   */
  public async runWithTenant<T>(hostname: string, callback: (session: ActiveTenantSession) => Promise<T>): Promise<T> {
    const tenant = await this.resolve(hostname);
    if (!tenant) {
      throw new Error(`MultiTenantEngine: Unauthorized or unmapped custom domain: "${hostname}"`);
    }

    if (tenant.status === 'SUSPENDED') {
      throw new Error(`MultiTenantEngine: Tenant account "${tenant.name || tenant.tenantId}" is currently SUSPENDED.`);
    }

    const app = await this.getAppForTenant(tenant);
    const session = this.createSession(tenant, app, hostname);

    return tenantStorage.run(session, () => callback(session));
  }

  /**
   * ⚡ 1-Line Express / Connect HTTP Middleware
   * Automatically resolves custom domain & tenant and attaches `req.tenant`, `req.app`, and `req.session`
   */
  public middleware() {
    return async (req: any, res: any, next: any) => {
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
      try {
        const tenant = await this.resolve(host);
        if (!tenant) {
          return res.status(404).json({
            error: 'Custom domain not recognized or inactive.',
            domain: host,
          });
        }

        if (tenant.status === 'SUSPENDED') {
          return res.status(403).json({
            error: 'Tenant Account Suspended',
            message: `Tenant "${tenant.name || tenant.tenantId}" has been suspended. Please contact platform support.`,
          });
        }

        const app = await this.getAppForTenant(tenant);
        const session = this.createSession(tenant, app, host);

        // Attach to standard request object
        req.tenant = tenant;
        req.app = app;
        req.orbitox = app;
        req.tenantSession = session;

        // Wrap execution in AsyncLocalStorage so all child async calls have access
        tenantStorage.run(session, () => next());
      } catch (err: any) {
        return res.status(500).json({
          error: 'MultiTenant Resolution Error',
          message: err.message,
        });
      }
    };
  }

  /**
   * 🔒 Feature Guard Middleware — Restricts API endpoints to tenants with specific feature entitlements
   */
  public requireFeature(featureName: string) {
    return (req: any, res: any, next: any) => {
      const session = req.tenantSession || getActiveTenant();
      if (!session || !session.hasFeature(featureName)) {
        return res.status(403).json({
          error: 'Feature Not Entitled',
          message: `The feature "${featureName}" is not enabled for your current tenant tier.`,
          feature: featureName,
        });
      }
      next();
    };
  }

  /**
   * 🏆 Tier Guard Middleware — Restricts API endpoints to a minimum tier (e.g. 'pro' or 'enterprise')
   */
  public requireTier(minimumTier: TenantTier) {
    return (req: any, res: any, next: any) => {
      const session = req.tenantSession || getActiveTenant();
      if (!session || !session.isTier(minimumTier)) {
        return res.status(403).json({
          error: 'Tier Upgrade Required',
          message: `This endpoint requires the "${minimumTier}" tier or higher. Current tier: "${session?.tenant.tier || 'starter'}".`,
          requiredTier: minimumTier,
        });
      }
      next();
    };
  }
}

/**
 * 🚀 1-Line Factory for Smart Multi-Tenancy & Custom Domains
 */
export function createMultiTenantEngine(options: MultiTenantEngineOptions = {}): MultiTenantEngine {
  return new MultiTenantEngine(options);
}
