import { AsyncLocalStorage } from 'async_hooks';
import { createOrbitoX, OrbitoXApp, OrbitoXPluginDefinition } from '../client';
import { LicenseEnforcer } from '../security/license-enforcer';

export interface TenantConfig {
  tenantId: string;
  name?: string;
  domain?: string;
  subdomain?: string;
  license?: string;
  metadata?: Record<string, any>;
  customPlugins?: OrbitoXPluginDefinition[];
}

export interface MultiTenantEngineOptions {
  /**
   * Static domain/subdomain mapping:
   * e.g. { 'apollo.orbito.com': { tenantId: 'apollo', name: 'Apollo Hospitals' } }
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
   * Fallback default tenant config if domain is unknown (e.g. during local testing)
   */
  defaultTenant?: TenantConfig;
}

export interface ActiveTenantSession {
  tenant: TenantConfig;
  app: OrbitoXApp;
  domain: string;
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
 * 🪐 MultiTenantEngine — Enterprise Multi-Tenancy & Custom Domain Router
 */
export class MultiTenantEngine {
  private readonly tenantAppCache = new Map<string, OrbitoXApp>();

  constructor(private readonly options: MultiTenantEngineOptions = {}) {}

  /**
   * Resolves a tenant configuration from a domain/hostname string
   */
  public async resolve(hostname: string): Promise<TenantConfig | null> {
    const cleanHost = hostname.split(':')[0]!.toLowerCase().trim();

    // 1. Direct match in static domain mapping
    if (this.options.domains && this.options.domains[cleanHost]) {
      return { ...this.options.domains[cleanHost]!, domain: cleanHost };
    }

    // 2. Wildcard root domain check (e.g. 'client.orbito.com' -> 'client')
    if (this.options.wildcardRootDomain) {
      const root = this.options.wildcardRootDomain.toLowerCase();
      if (cleanHost.endsWith(`.${root}`)) {
        const subdomain = cleanHost.slice(0, -(root.length + 1));
        if (subdomain && !subdomain.includes('.')) {
          return {
            tenantId: `tenant_${subdomain}`,
            name: `${subdomain.charAt(0).toUpperCase() + subdomain.slice(1)} Tenant`,
            domain: cleanHost,
            subdomain,
          };
        }
      }
    }

    // 3. Dynamic async resolver (Database / Redis)
    if (this.options.resolveTenant) {
      const dynamicConfig = await this.options.resolveTenant(cleanHost);
      if (dynamicConfig) {
        return { ...dynamicConfig, domain: cleanHost };
      }
    }

    // 4. Default fallback if configured
    if (this.options.defaultTenant) {
      return { ...this.options.defaultTenant, domain: cleanHost };
    }

    return null;
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
   * Runs an asynchronous function inside the execution context of a specific tenant
   */
  public async runWithTenant<T>(hostname: string, callback: (session: ActiveTenantSession) => Promise<T>): Promise<T> {
    const tenant = await this.resolve(hostname);
    if (!tenant) {
      throw new Error(`MultiTenantEngine: Unauthorized or unmapped custom domain: "${hostname}"`);
    }

    const app = await this.getAppForTenant(tenant);
    const session: ActiveTenantSession = { tenant, app, domain: hostname };

    return tenantStorage.run(session, () => callback(session));
  }

  /**
   * ⚡ 1-Line Express / Connect HTTP Middleware
   * Automatically resolves custom domain & tenant and attaches `req.tenant` and `req.app`
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

        const app = await this.getAppForTenant(tenant);
        const session: ActiveTenantSession = { tenant, app, domain: host };

        // Attach to standard request object
        req.tenant = tenant;
        req.app = app;
        req.orbitox = app;

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
}

/**
 * 🚀 1-Line Factory for Multi-Tenancy & Custom Domains
 *
 * @example
 * ```typescript
 * import { createMultiTenantEngine } from '@orbitox-io/plugin-engine';
 * import * as crm from '@orbitox-io/crm';
 *
 * const engine = createMultiTenantEngine({
 *   wildcardRootDomain: 'orbito.com',
 *   domains: {
 *     'portal.apollohospitals.com': { tenantId: 'apollo', name: 'Apollo Hospitals' }
 *   },
 *   plugins: [crm]
 * });
 *
 * app.use(engine.middleware());
 * ```
 */
export function createMultiTenantEngine(options: MultiTenantEngineOptions = {}): MultiTenantEngine {
  return new MultiTenantEngine(options);
}
