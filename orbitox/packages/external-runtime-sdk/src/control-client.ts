/**
 * 🪐 Control Client & Bridge Runner
 * Used by external projects to communicate with the OrbitoX Platform Control Plane.
 */

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
  ApiRegistryClient,
  RuntimeClient,
  HealthClient,
  AuditClient,
  EventClient,
} from './clients';

export interface ControlClientOptions {
  manifest: OrbitoxProjectManifest;
  controlPlaneUrl?: string;
  runtimePort?: number;
  apiKey?: string;
  onConfigUpdated?: (newConfig: SignedRuntimeConfiguration) => void;
  onCommandReceived?: (command: ControlCommand) => Promise<{ success: boolean; result?: any; error?: string }>;
}

export class ControlClient {
  public readonly manifest: OrbitoxProjectManifest;
  public readonly controlPlaneUrl: string;
  public readonly runtimePort: number;
  public readonly apiKey?: string;

  public readonly project: ProjectClient;
  public readonly config: ConfigurationClient;
  public readonly features: FeatureClient;
  public readonly entitlements: EntitlementClient;
  public readonly apis: ApiRegistryClient;
  public readonly runtime: RuntimeClient;
  public readonly health: HealthClient;
  public readonly audit: AuditClient;
  public readonly events: EventClient;

  private controlSessionId: string | null = null;
  private currentConfig: SignedRuntimeConfiguration | null = null;
  private appliedRevision = 1;
  private desiredRevision = 1;
  private heartbeatTimer: any = null;
  private commandPollTimer: any = null;
  private onConfigUpdated?: (newConfig: SignedRuntimeConfiguration) => void;
  private onCommandReceived?: (command: ControlCommand) => Promise<{ success: boolean; result?: any; error?: string }>;

  constructor(options: ControlClientOptions) {
    this.manifest = options.manifest;
    this.controlPlaneUrl = options.controlPlaneUrl || options.manifest.platformController.controlPlaneUrl || 'http://localhost:3005';
    this.runtimePort = options.runtimePort || options.manifest.runtime.defaultPort;
    this.apiKey = options.apiKey;
    this.onConfigUpdated = options.onConfigUpdated;
    this.onCommandReceived = options.onCommandReceived;

    const clientConfig = {
      controlPlaneUrl: this.controlPlaneUrl,
      projectId: this.manifest.projectId,
      apiKey: this.apiKey,
    };

    this.project = new ProjectClient(clientConfig);
    this.config = new ConfigurationClient(clientConfig);
    this.features = new FeatureClient(clientConfig);
    this.entitlements = new EntitlementClient(clientConfig);
    this.apis = new ApiRegistryClient(clientConfig);
    this.runtime = new RuntimeClient(clientConfig);
    this.health = new HealthClient(clientConfig);
    this.audit = new AuditClient(clientConfig);
    this.events = new EventClient();
  }

  /**
   * Register this external runtime with OrbitoX Control Plane
   */
  async registerRuntime(): Promise<RuntimeRegistrationResponse> {
    const payload: RuntimeRegistrationPayload = {
      projectId: this.manifest.projectId,
      slug: this.manifest.slug,
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

    if (this.currentConfig) {
      this.features.setFeatures(this.currentConfig.features);
      this.entitlements.setEntitlements(this.currentConfig.entitlements);
      if (this.onConfigUpdated) {
        this.onConfigUpdated(this.currentConfig);
      }
    }

    this.startHeartbeat();
    this.startCommandPolling();
    return data;
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
    this.currentConfig = signedConfig;

    if (signedConfig.revisionNumber && signedConfig.revisionNumber !== this.appliedRevision) {
      this.appliedRevision = signedConfig.revisionNumber;
      await this.config.acknowledgeRevision(this.appliedRevision, this.manifest.projectId, 'SUCCESS');
    }

    this.features.setFeatures(signedConfig.features);
    this.entitlements.setEntitlements(signedConfig.entitlements);

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
}
