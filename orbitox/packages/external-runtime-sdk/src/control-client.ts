/**
 * 🪐 Control Client & Bridge Runner
 * Used by external projects to communicate with the OrbitoX Platform Control Plane.
 */

import * as crypto from 'crypto';
import {
  OrbitoxProjectManifest,
  SignedRuntimeConfiguration,
  ConfigurationRevision,
  RuntimeRegistrationPayload,
  RuntimeRegistrationResponse,
  RuntimeHeartbeatReport,
  RuntimeAuditReport,
  ControlCommand,
  CentralQuoteRequest,
  CentralQuoteResponse,
} from './types';
import {
  ProjectClient,
  ConfigurationClient,
  FeatureClient,
  EntitlementClient,
  BillingClient,
  ApiRegistryClient,
  RuntimeClient,
  HealthClient,
  AuditClient,
  EventClient,
  ClientConfig,
} from './clients';

export interface ControlClientOptions {
  manifest: OrbitoxProjectManifest;
  controlPlaneUrl?: string;
  runtimePort?: number;
  apiKey?: string;
  pinnedPublicKeys?: Record<string, crypto.KeyObject | string>;
  trustedKeys?: Record<string, crypto.KeyObject | string>;
  onConfigUpdated?: (newConfig: SignedRuntimeConfiguration) => void;
  onCommandReceived?: (command: ControlCommand) => Promise<{ success: boolean; result?: any; error?: string }>;
}

export class ControlClient {
  public readonly manifest: OrbitoxProjectManifest;
  public readonly controlPlaneUrl: string;
  public readonly runtimePort: number;
  public apiKey?: string;

  public readonly project: ProjectClient;
  public readonly config: ConfigurationClient;
  public readonly features: FeatureClient;
  public readonly entitlements: EntitlementClient;
  public readonly billing: BillingClient;
  public readonly apis: ApiRegistryClient;
  public readonly runtime: RuntimeClient;
  public readonly health: HealthClient;
  public readonly audit: AuditClient;
  public readonly events: EventClient;

  private clientConfig: ClientConfig;
  private controlSessionId: string | null = null;
  private currentConfig: SignedRuntimeConfiguration | null = null;
  private appliedRevision = 1;
  private desiredRevision = 1;
  private heartbeatTimer: any = null;
  private commandPollTimer: any = null;
  private onConfigUpdated?: (newConfig: SignedRuntimeConfiguration) => void;
  private onCommandReceived?: (command: ControlCommand) => Promise<{ success: boolean; result?: any; error?: string }>;

  public pinnedPublicKeys: Record<string, crypto.KeyObject> = {};

  constructor(options: ControlClientOptions) {
    this.manifest = options.manifest;
    this.controlPlaneUrl = options.controlPlaneUrl || options.manifest.platformController.controlPlaneUrl || 'http://localhost:3005';
    this.runtimePort = options.runtimePort || options.manifest.runtime.defaultPort;
    this.apiKey = options.apiKey;
    this.onConfigUpdated = options.onConfigUpdated;
    this.onCommandReceived = options.onCommandReceived;

    const rawKeys = options.pinnedPublicKeys || options.trustedKeys;
    if (rawKeys) {
      this.setPinnedPublicKeys(rawKeys);
    }

    this.clientConfig = {
      controlPlaneUrl: this.controlPlaneUrl,
      projectId: this.manifest.projectId,
      apiKey: this.apiKey,
    };

    this.project = new ProjectClient(this.clientConfig);
    this.config = new ConfigurationClient(this.clientConfig);
    this.features = new FeatureClient(this.clientConfig);
    this.entitlements = new EntitlementClient(this.clientConfig);
    this.billing = new BillingClient(this.clientConfig);
    this.apis = new ApiRegistryClient(this.clientConfig);
    this.runtime = new RuntimeClient(this.clientConfig);
    this.health = new HealthClient(this.clientConfig);
    this.audit = new AuditClient(this.clientConfig);
    this.events = new EventClient();
  }

  public setPinnedPublicKeys(keys: Record<string, crypto.KeyObject | string>): void {
    this.pinnedPublicKeys = {};
    for (const [kid, val] of Object.entries(keys)) {
      if (typeof val === 'string') {
        this.pinnedPublicKeys[kid] = crypto.createPublicKey(val);
      } else {
        this.pinnedPublicKeys[kid] = val;
      }
    }
  }

  /**
   * Verifies configuration signature against pinned Ed25519 public keys.
   */
  public verifyConfigSignature(config: SignedRuntimeConfiguration): boolean {
    if (!config || !config.signature || typeof config.signature !== 'string') {
      return false;
    }

    const keys = Object.values(this.pinnedPublicKeys);
    if (keys.length === 0) {
      // If no keys pinned, only accept if requireSignedConfig is not set to true
      return !this.manifest.platformController?.requireSignedConfig;
    }

    const sig = config.signature.trim();

    // 1. Compact JWS token format: header.payload.signature
    if (sig.includes('.')) {
      const parts = sig.split('.');
      const p0 = parts[0];
      const p1 = parts[1];
      const p2 = parts[2];
      if (parts.length === 3 && p0 && p1 && p2) {
        try {
          const header = JSON.parse(Buffer.from(p0, 'base64url').toString('utf8'));
          if (header.alg !== 'EdDSA') return false;
          const targetKey = header.kid ? this.pinnedPublicKeys[header.kid] : undefined;
          const candidateKeys = targetKey ? [targetKey] : keys;
          for (const k of candidateKeys) {
            const ok = crypto.verify(
              null,
              Buffer.from(`${p0}.${p1}`),
              k,
              Buffer.from(p2, 'base64url')
            );
            if (ok) return true;
          }
        } catch {
          return false;
        }
      }
    }

    // 2. Detached Ed25519 signature format (hex or base64)
    let sigBuffer: Buffer;
    try {
      sigBuffer = /^[0-9a-fA-F]+$/.test(sig) ? Buffer.from(sig, 'hex') : Buffer.from(sig, 'base64');
    } catch {
      return false;
    }

    const candidatePayloads = [
      `${config.projectId}:${config.configVersion}:${config.revisionNumber || 1}:${config.issuedAt}`,
      `${config.projectId}:${config.configVersion}:${config.revisionNumber || 1}:${config.issuedAt}:${JSON.stringify(config.desiredState || {})}`,
    ];

    for (const p of candidatePayloads) {
      const pBuf = Buffer.from(p, 'utf8');
      for (const k of keys) {
        try {
          if (crypto.verify(null, pBuf, k, sigBuffer)) {
            return true;
          }
        } catch {}
      }
    }

    return false;
  }

  /**
   * Register this external runtime with OrbitoX Control Plane
   */
  async registerRuntime(): Promise<RuntimeRegistrationResponse> {
    const payload: RuntimeRegistrationPayload = {
      projectId: this.manifest.projectId,
      slug: this.manifest.slug,
      name: this.manifest.name,
      projectType: this.manifest.type,
      runtimeUrl: `http://localhost:${this.runtimePort}`,
      runtimePort: this.runtimePort,
      version: this.manifest.version,
      declaredApis: this.manifest.apis,
      capabilities: this.manifest.capabilities,
      appliedRevision: this.appliedRevision,
      processMetrics: {
        pid: typeof process !== 'undefined' ? process.pid : 0,
        uptimeSeconds: Math.floor(typeof process !== 'undefined' ? process.uptime() : 0),
        memoryMb: typeof process !== 'undefined' ? Math.round(process.memoryUsage().heapUsed / 1024 / 1024) : 0,
      },
    };

    const res = await fetch(`${this.controlPlaneUrl}/api/v1/projects/${this.manifest.projectId}/bridge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({ action: 'REGISTER', payload }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to register with Control Plane: ${res.status} ${errText}`);
    }

    const data: RuntimeRegistrationResponse = await res.json();
    this.controlSessionId = data.controlSessionId;
    this.currentConfig = data.signedConfig;
    this.desiredRevision = data.desiredRevision || 1;
    this.appliedRevision = this.desiredRevision;

    if (data.projectKey) {
      this.apiKey = data.projectKey;
      this.clientConfig.apiKey = data.projectKey;
    }

    if (this.currentConfig) {
      this.features.setFeatures(this.currentConfig.features);
      this.entitlements.setEntitlements(this.currentConfig.entitlements);
      if (this.onConfigUpdated) {
        this.onConfigUpdated(this.currentConfig);
      }
    }

    try {
      await this.entitlements.fetchEntitlements();
    } catch {}

    this.startHeartbeat();
    this.startCommandPolling();
    return data;
  }

  /**
   * Synchronize entitlements with the latest quotas and live usage
   */
  async syncEntitlements(): Promise<Record<string, { limit: number; used: number; enforced: boolean }>> {
    return this.entitlements.fetchEntitlements();
  }

  /**
   * Fetch current desired-state signed configuration from the Control Plane
   */
  async fetchDesiredState(): Promise<SignedRuntimeConfiguration> {
    const res = await fetch(
      `${this.controlPlaneUrl}/api/v1/projects/${this.manifest.projectId}/bridge?session=${this.controlSessionId || ''}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch desired state from Control Plane: ${res.statusText}`);
    }

    const signedConfig: SignedRuntimeConfiguration = await res.json();

    // Verify config signature against pinned Ed25519 public keys before applying
    const isValid = this.verifyConfigSignature(signedConfig);
    if (!isValid) {
      console.error(
        `[RuntimeSDK] Configuration signature verification failed for project "${this.manifest.projectId}". Keeping last good config.`
      );
      if (this.currentConfig) {
        return this.currentConfig;
      }
      throw new Error(`INVALID_CONFIG_SIGNATURE: Unsigned or invalid signature for project ${this.manifest.projectId}`);
    }

    this.currentConfig = signedConfig;

    if (signedConfig.revisionNumber && signedConfig.revisionNumber !== this.appliedRevision) {
      this.appliedRevision = signedConfig.revisionNumber;
      await this.config.acknowledgeRevision(this.appliedRevision, this.manifest.projectId, 'SUCCESS');
    }

    this.features.setFeatures(signedConfig.features);
    this.entitlements.setEntitlements(signedConfig.entitlements);

    try {
      await this.entitlements.fetchEntitlements();
    } catch {}

    if (this.onConfigUpdated) {
      this.onConfigUpdated(signedConfig);
    }

    return signedConfig;
  }

  /**
   * Send heartbeat to Control Plane
   */
  async sendHeartbeat(): Promise<void> {
    if (!this.controlSessionId) return;

    const report: RuntimeHeartbeatReport = {
      projectId: this.manifest.projectId,
      controlSessionId: this.controlSessionId,
      status: 'HEALTHY',
      activeConnections: 1,
      memoryUsageMb: typeof process !== 'undefined' ? Math.round(process.memoryUsage().heapUsed / 1024 / 1024) : 0,
      uptimeSeconds: Math.floor(typeof process !== 'undefined' ? process.uptime() : 0),
      activeConfigVersion: this.currentConfig?.configVersion || 0,
      appliedRevision: this.appliedRevision,
      syncStatus: this.appliedRevision === this.desiredRevision ? 'IN_SYNC' : 'OUT_OF_SYNC',
      lastSyncAt: new Date().toISOString(),
    };

    try {
      const res = await fetch(`${this.controlPlaneUrl}/api/v1/projects/${this.manifest.projectId}/bridge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({ action: 'HEARTBEAT', payload: report }),
      });
      if (res.ok) {
        const body = await res.json();
        if (body.desiredRevision && body.desiredRevision > this.appliedRevision) {
          this.desiredRevision = body.desiredRevision;
          // Reconcile desired state
          await this.fetchDesiredState();
        }
      }
    } catch {
      // transient network error, retry on next interval
    }
  }

  /**
   * Poll for authorized control plane commands
   */
  async pollAndExecuteCommands(): Promise<void> {
    try {
      const commands = await this.runtime.pollPendingCommands();
      for (const cmd of commands) {
        if (this.onCommandReceived) {
          const outcome = await this.onCommandReceived(cmd);
          await this.runtime.completeCommand(
            cmd.commandId,
            outcome.result,
            outcome.success ? undefined : outcome.error
          );
        } else {
          // Default command handler
          await this.runtime.completeCommand(cmd.commandId, { executed: true, defaultHandled: true });
        }
      }
    } catch {
      // Ignore polling errors
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    const intervalSeconds = this.manifest.platformController.syncIntervalSeconds || 10;
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, intervalSeconds * 1000);
  }

  private startCommandPolling(): void {
    if (this.commandPollTimer) clearInterval(this.commandPollTimer);
    this.commandPollTimer = setInterval(() => {
      this.pollAndExecuteCommands();
    }, 5000);
  }

  stop(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.commandPollTimer) clearInterval(this.commandPollTimer);
  }

  getCurrentConfig(): SignedRuntimeConfiguration | null {
    return this.currentConfig;
  }

  getAppliedRevision(): number {
    return this.appliedRevision;
  }

  getDesiredRevision(): number {
    return this.desiredRevision;
  }

  getSessionId(): string | null {
    return this.controlSessionId;
  }

  getProjectKey(): string | undefined {
    return this.apiKey;
  }
}
