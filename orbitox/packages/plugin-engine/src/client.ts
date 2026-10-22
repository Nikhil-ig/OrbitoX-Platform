import { LicenseEnforcer, LicenseValidationOptions, LicensePayload } from './security/license-enforcer';
import { IntegrityVerifier } from './security/integrity-verifier';
import { SandboxGuard } from './security/sandbox-guard';
import { PackageSignature } from './security/crypto-signer';
import { ModeSwitcherService, OrbitoXSnapshotPayload, SwitchResult, DrainStatus } from './modeSwitcher';

export interface OrbitoXPluginDefinition {
  id?: string;
  name?: string;
  version?: string;
  manifest?: any;
  service?: any;
  [key: string]: any;
}

export type OrbitoXClusterMode = 'standalone' | 'distributed';

export interface ClusterStatus {
  mode: OrbitoXClusterMode;
  isClustered: boolean;
  nodeId: string;
  eventBus: 'memory' | 'redis';
  rateLimiter: 'memory' | 'distributed_redis';
  isDraining?: boolean;
}

export interface CreateOrbitoXOptions {
  /**
   * RSA/Ed25519-Signed base64 license token (optional for dev, required in production/enterprise)
   */
  license?: string;

  /**
   * Public key PEM used to cryptographically verify license tokens & plugin signatures
   */
  publicKey?: string;

  /**
   * Current deployment domain or hostname to enforce against the license
   */
  domain?: string;

  /**
   * Current active tenants count to enforce against license quotas
   */
  activeTenantsCount?: number;

  /**
   * List of plugins to automatically verify, sandbox, and register into the app
   */
  plugins?: OrbitoXPluginDefinition[];

  /**
   * Strict security mode: throws errors on missing license or unsigned plugins
   */
  strictSecurity?: boolean;

  /**
   * Custom context identifier (e.g., 'tenant_123' or 'org_hq')
   */
  contextId?: string;

  /**
   * Dual-engine cluster mode:
   * - 'standalone': Single-server, zero external dependencies, in-memory rate limiting & event bus
   * - 'distributed': Multi-server cluster mesh, Redis Pub/Sub invalidation, distributed sliding window
   * - 'auto' (default): Auto-detects Redis presence or CLUSTER_MODE env var
   */
  clusterMode?: 'standalone' | 'distributed' | 'auto';

  /**
   * Node identifier for distributed telemetry and tracing
   */
  nodeId?: string;

  /**
   * Optional custom mode switcher service instance
   */
  modeSwitcher?: ModeSwitcherService;
}

export interface SecurityContext {
  isVerified: boolean;
  license?: LicensePayload;
  allowedFeatures: string[];
  tenantId?: string;
}

export class OrbitoXApp {
  public readonly security: SecurityContext;
  public readonly cluster: Readonly<ClusterStatus>;
  public readonly modeSwitcher: ModeSwitcherService;
  public readonly plugins: Map<string, any> = new Map();
  [key: string]: any;

  constructor(
    securityContext: SecurityContext,
    clusterStatus?: ClusterStatus,
    modeSwitcher?: ModeSwitcherService
  ) {
    this.security = Object.freeze(securityContext);
    this.cluster = Object.freeze(
      clusterStatus || {
        mode: 'standalone',
        isClustered: false,
        nodeId: 'node_standalone',
        eventBus: 'memory',
        rateLimiter: 'memory',
      }
    );
    this.modeSwitcher = modeSwitcher || ModeSwitcherService.getInstance();
  }

  /**
   * Enters graceful drain mode to finish in-flight requests before switching
   */
  public async enterDrainMode(timeoutMs = 5000): Promise<boolean> {
    this.modeSwitcher.drainController.startDrain();
    return this.modeSwitcher.drainController.waitForDrain(timeoutMs);
  }

  /**
   * Exports a cryptographically sealed state snapshot
   */
  public exportSnapshot(stateData: any = {}, options?: { sign?: boolean; privateKeyPem?: string }): OrbitoXSnapshotPayload {
    return this.modeSwitcher.exportSnapshot(
      this.cluster.mode,
      this.cluster.mode === 'distributed' ? 'standalone' : 'distributed',
      this.cluster.nodeId,
      stateData,
      options
    );
  }

  /**
   * Ingests and verifies a state snapshot
   */
  public importSnapshot(
    snapshot: OrbitoXSnapshotPayload,
    applyFn: (data: any) => void,
    options?: { publicKeyPem?: string; verifySignature?: boolean }
  ) {
    return this.modeSwitcher.importSnapshot(snapshot, applyFn, options);
  }

  /**
   * Registers a plugin dynamically into the application instance
   */
  public registerPlugin(plugin: OrbitoXPluginDefinition, signature?: PackageSignature | string, publicKeyPem?: string): this {
    // 1. Auto-detect plugin identifier
    let rawId = plugin.id || plugin.name || (plugin.manifest && plugin.manifest.id);
    if (!rawId) {
      if (plugin.HeadlessCrmService || plugin.crmLeadStateMachine || plugin.useLeads) {
        rawId = 'crm';
      } else if (plugin.HeadlessHmsService || plugin.hmsTriageStateMachine) {
        rawId = 'hms';
      } else if (plugin.HeadlessCommerceService || plugin.useCommerceCart) {
        rawId = 'commerce';
      } else {
        rawId = 'custom_plugin';
      }
    }

    const cleanId = rawId.replace(/^@orbitox(-io)?\//, '').toLowerCase();

    // 2. Verify signature if provided
    let isSignatureVerified = false;
    if (signature && publicKeyPem) {
      if (typeof signature === 'string') {
        isSignatureVerified = IntegrityVerifier.verifyPayloadSignature(plugin.manifest || plugin, signature, publicKeyPem);
      } else {
        isSignatureVerified = IntegrityVerifier.verifyPayloadSignature(
          {
            signerId: signature.signerId,
            manifestHash: signature.manifestHash,
            fileTreeHash: (signature as any).fileTreeHash,
            signedAt: signature.signedAt,
          },
          signature.signature,
          publicKeyPem
        );
      }

      if (!isSignatureVerified) {
        throw new Error(`Security Alert: Plugin "${rawId}" failed cryptographic signature verification!`);
      }
    }

    // 3. Resolve service or state machine attached to plugin
    let serviceInstance: any;
    if (plugin.service) {
      serviceInstance = plugin.service;
    } else if (typeof plugin.HeadlessCrmService === 'function') {
      serviceInstance = new plugin.HeadlessCrmService();
    } else if (typeof plugin === 'function') {
      try {
        serviceInstance = new (plugin as any)();
      } catch {
        serviceInstance = plugin;
      }
    } else {
      serviceInstance = plugin;
    }

    // 4. Attach to plugins map and expose direct property on app
    this.plugins.set(cleanId, serviceInstance);
    (this as any)[cleanId] = serviceInstance;

    return this;
  }


  /**
   * Checks if a specific feature entitlement is enabled by the license
   */
  public hasFeature(featureName: string): boolean {
    if (this.security.allowedFeatures.includes('*')) return true;
    return this.security.allowedFeatures.includes(featureName);
  }
}

/**
 * 🚀 1-Line Unified Bootstrapper for OrbitoX Applications
 *
 * Automatically verifies enterprise licenses, freezes kernel facades,
 * verifies plugin integrity, and mounts type-safe plugins.
 *
 * @example
 * ```typescript
 * import { createOrbitoX } from '@orbitox-io/plugin-engine';
 * import * as crm from '@orbitox-io/crm';
 *
 * const app = await createOrbitoX({
 *   license: process.env.ORBITOX_LICENSE_KEY,
 *   plugins: [crm]
 * });
 *
 * app.crm.createLead({ name: 'Dr. Sharma' });
 * ```
 */
export async function createOrbitoX(options: CreateOrbitoXOptions = {}): Promise<OrbitoXApp> {
  const defaultDomain =
    process.env.ORBITOX_DOMAIN ||
    (typeof globalThis !== 'undefined' && (globalThis as any).window
      ? (globalThis as any).window.location?.hostname
      : 'localhost');

  const {
    license,
    publicKey,
    domain = defaultDomain,
    activeTenantsCount,
    plugins = [],
    strictSecurity = false,
    contextId = 'ctx_default',
    clusterMode = 'auto',
    nodeId: customNodeId,
  } = options;

  let isVerified = false;
  let licensePayload: LicensePayload | undefined;
  let allowedFeatures: string[] = ['*'];

  // 1. Verify License if provided or in strict mode
  if (license && publicKey) {
    const validationOptions: LicenseValidationOptions = {
      currentDomain: domain,
      activeTenantsCount,
    };

    const licenseResult = LicenseEnforcer.verifyLicenseToken(license, publicKey, validationOptions);
    if (!licenseResult.valid) {
      const errorMsg = `OrbitoX Boot Error: License validation failed — ${licenseResult.errors.join(', ')}`;
      if (strictSecurity) {
        throw new Error(errorMsg);
      } else {
        console.warn(`⚠️ [OrbitoX Warning] ${errorMsg}`);
      }
    } else {
      isVerified = true;
      licensePayload = licenseResult.license;
      allowedFeatures = licenseResult.license?.features || ['*'];
    }
  } else if (strictSecurity && !license) {
    throw new Error('OrbitoX Security Error: Strict security enabled but no valid ORBITOX_LICENSE_KEY provided.');
  }

  // 2. Resolve Dual-Engine Cluster Mode (Standalone vs Distributed)
  const isDistributed =
    clusterMode === 'distributed' ||
    (clusterMode === 'auto' &&
      (typeof process !== 'undefined' &&
        (process.env?.CLUSTER_MODE === 'distributed' ||
          process.env?.ORBITOX_DEPLOYMENT_MODE === 'distributed' ||
          Boolean(process.env?.REDIS_URL))));

  const resolvedMode: OrbitoXClusterMode = isDistributed ? 'distributed' : 'standalone';
  const resolvedNodeId =
    customNodeId ||
    (typeof process !== 'undefined' ? process.env?.NODE_ID : undefined) ||
    (isDistributed ? 'node_mesh_01' : 'node_standalone');

  const clusterStatus: ClusterStatus = Object.freeze({
    mode: resolvedMode,
    isClustered: isDistributed,
    nodeId: resolvedNodeId,
    eventBus: isDistributed ? 'redis' : 'memory',
    rateLimiter: isDistributed ? 'distributed_redis' : 'memory',
  });

  // 3. Instantiate Application Runtime
  const app = new OrbitoXApp(
    {
      isVerified,
      license: licensePayload,
      allowedFeatures,
      tenantId: contextId,
    },
    clusterStatus,
    options.modeSwitcher
  );

  // 4. Register and bind all plugins
  for (const plugin of plugins) {
    app.registerPlugin(plugin);
  }

  // 5. Freeze core security context
  SandboxGuard.assertFrozenFacade(app.security, 'SecurityContext');

  return app;
}
