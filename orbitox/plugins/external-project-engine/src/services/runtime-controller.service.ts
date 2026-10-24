import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  SignedRuntimeConfiguration,
  ConfigurationRevision,
  ControlCommand,
  RuntimeRegistrationPayload,
  RuntimeRegistrationResponse,
  RuntimeHeartbeatReport,
  RuntimeAuditReport,
  OrbitoxProjectManifest,
} from '@orbitox/external-runtime-sdk';
import type {
  RuntimeSessionRecord,
  ProjectAuditEntry,
  ExternalProjectRecord,
  PlatformPluginRecord,
  EnvironmentRecord,
} from '../types';
import { PersistentControlStore } from './control-store.service';
import { PersistentUsageStore } from './usage-store.service';

/** Registration problem with an HTTP-style status the API layer can return as-is. */
export class RuntimeRegistrationError extends Error {
  public readonly code: 'INVALID_PAYLOAD' | 'REGISTRATION_NOT_ALLOWED';
  public readonly status: 400 | 403;

  constructor(
    code: 'INVALID_PAYLOAD' | 'REGISTRATION_NOT_ALLOWED',
    message: string,
    status: 400 | 403,
  ) {
    super(message);
    this.name = 'RuntimeRegistrationError';
    this.code = code;
    this.status = status;
  }
}

import {
  generateProjectKey,
  hashProjectKey,
  verifyProjectKey as verifyKeyHelper,
  evaluateProjectAccess,
  safeTimingEqual,
  ProjectAccessParams,
  ProjectAccessResult,
} from './project-keys';

export type { ProjectAccessParams, ProjectAccessResult };

const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,63}$/;

export class RuntimeControllerService {
  private static store: PersistentControlStore = PersistentControlStore.getInstance();
  private store: PersistentControlStore = PersistentControlStore.getInstance();
  private static cachedSigningKey: string | null = null;

  /**
   * HMAC key that signs every config/command sent to client runtimes.
   * - Set ORBITOX_CONTROL_SECRET (min 32 chars) in every real deployment.
   * - Production refuses to start signing without it.
   * - In development a random key is generated once and kept (0600) next to the
   *   control-plane data, so restarts keep working without a hardcoded secret.
   */
  private static get secretSigningKey(): string {
    if (this.cachedSigningKey) return this.cachedSigningKey;

    const isProduction = process.env.NODE_ENV === 'production';
    const fromEnv = process.env.ORBITOX_CONTROL_SECRET?.trim();

    if (fromEnv) {
      if (isProduction && fromEnv.length < 32) {
        throw new Error('ORBITOX_CONTROL_SECRET must be at least 32 characters in production.');
      }
      this.cachedSigningKey = fromEnv;
      return fromEnv;
    }

    if (isProduction) {
      throw new Error('ORBITOX_CONTROL_SECRET is required in production. Generate one with: openssl rand -hex 32');
    }

    const keyFile = path.join(this.store.getDataDir(), '.control_secret');
    try {
      if (fs.existsSync(keyFile)) {
        const existing = fs.readFileSync(keyFile, 'utf-8').trim();
        if (existing.length >= 32) {
          this.cachedSigningKey = existing;
          return existing;
        }
      }
      const generated = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(keyFile, generated, { encoding: 'utf-8', mode: 0o600 });
      this.cachedSigningKey = generated;
      return generated;
    } catch {
      // Read-only disk in dev: fall back to a per-process key.
      this.cachedSigningKey = crypto.randomBytes(32).toString('hex');
      return this.cachedSigningKey;
    }
  }
  private static initialized = false;

  constructor() {
    RuntimeControllerService.initialize();
  }

  public static initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Demo data is for local development only. Production starts empty: real projects
    // appear when they register. Set ORBITOX_SEED_DEMO=true to force it on (or =false to force it off).
    const seedFlag = process.env.ORBITOX_SEED_DEMO?.trim().toLowerCase();
    const seedDemo = seedFlag ? seedFlag === 'true' : process.env.NODE_ENV !== 'production';

    const existingProject = this.store.getProject('project_restaurant_os');
    if (seedDemo && !existingProject) {
      // Seed default restaurant-os external project
      const restaurantProject: ExternalProjectRecord = {
        id: 'project_restaurant_os',
        slug: 'restaurant-os',
        name: 'OrbitoX RestaurantOS (Independent Runtime)',
        status: 'ACTIVE',
        localPath: 'projects/external-os/restaurant-os',
        activeRevisionNumber: 1,
        desiredRevisionNumber: 1,
        syncStatus: 'IN_SYNC',
        createdAt: '2026-10-08T18:00:00.000Z',
        updatedAt: new Date().toISOString(),
        manifest: {
          projectId: 'project_restaurant_os',
          slug: 'restaurant-os',
          name: 'OrbitoX RestaurantOS (Independent Runtime)',
          type: 'restaurant-os',
          version: '1.0.0',
          runtime: {
            type: 'standalone',
            entrypoint: 'src/server.ts',
            defaultPort: 4010,
            healthEndpoint: '/health',
          },
          enabledPlugins: ['@orbitox/pos', '@orbitox/realtime', '@orbitox/billing'],
          enabledFeatures: ['dine_qr', 'dag_prep_scheduler', 'companion_join', 'realtime_kds', 'mcp_copilot'],
          apis: [
            { name: 'restaurant.quote', route: '/api/restaurant/quote', method: 'POST', version: 'v1.0.0', requiresAuth: false, scopes: ['pos.quote'], rateLimitPerMin: 300, description: 'Deterministic pricing quote' },
            { name: 'restaurant.orders', route: '/api/restaurant/orders', method: 'POST', version: 'v1.0.0', requiresAuth: true, scopes: ['pos.orders.write'], rateLimitPerMin: 120, description: 'Idempotent order submission' },
            { name: 'restaurant.kds', route: '/api/restaurant/kds', method: 'GET', version: 'v1.0.0', requiresAuth: true, scopes: ['kitchen.read'], rateLimitPerMin: 600, description: 'Kitchen station queue stream' },
            { name: 'restaurant.menu', route: '/api/restaurant/menu', method: 'GET', version: 'v1.0.0', requiresAuth: false, scopes: ['diner.public'], rateLimitPerMin: 1000, description: 'Public menu catalog' },
            { name: 'restaurant.sessions', route: '/api/restaurant/sessions/join', method: 'POST', version: 'v1.0.0', requiresAuth: false, scopes: ['diner.join'], rateLimitPerMin: 200, description: 'Diner session seating' },
            { name: 'restaurant.tables', route: '/api/restaurant/qr/:locator', method: 'GET', version: 'v1.0.0', requiresAuth: false, scopes: ['diner.public'], rateLimitPerMin: 1200, description: 'Table discovery' },
          ],
          planReferences: ['plan_restaurant_growth'],
          environmentMetadata: {
            defaultEnvironment: 'production',
            supportedEnvironments: ['development', 'staging', 'production'],
          },
          platformController: {
            controlPlaneUrl: 'http://localhost:3005',
            syncIntervalSeconds: 10,
            requireSignedConfig: true,
          },
          capabilities: ['CONTROL_BRIDGE_V1', 'SIGNED_CONFIG_V1', 'CENTRAL_QUOTES_V1', 'REALTIME_TELEMETRY_V1'],
          customMetadata: { businessModel: 'O2O2B2B2C' },
        },
      };

      this.store.saveProject(restaurantProject);

      const initialDesired = {
        features: {
          dine_qr: true,
          dag_prep_scheduler: true,
          companion_join: true,
          realtime_kds: true,
          mcp_copilot: true,
        },
        entitlements: {
          tables: { limit: 50, used: 0, enforced: true },
          monthlyOrders: { limit: 15000, used: 0, enforced: true },
        },
        apiPolicies: {
          'restaurant.quote': { rateLimit: 300, allowedScopes: ['pos.quote', 'diner.public'] },
          'restaurant.orders': { rateLimit: 120, allowedScopes: ['pos.orders.write', 'diner.order'] },
        },
        customConfig: {
          brandColor: '#FF7A1A',
          taxBasisPoints: 500, // 5% GST
          serviceFeeBasisPoints: 0,
        },
      };

      this.store.saveDesiredState(restaurantProject.id, initialDesired);

      // Seed initial revision
      const initialRevision: ConfigurationRevision = {
        revisionId: 'rev_initial_001',
        revisionNumber: 1,
        projectId: restaurantProject.id,
        status: 'APPLIED',
        createdBy: 'system:bootstrap',
        createdAt: '2026-10-08T18:00:00.000Z',
        appliedAt: '2026-10-08T18:00:05.000Z',
        desiredState: initialDesired,
        diff: {
          added: ['features', 'entitlements', 'apiPolicies', 'customConfig'],
          modified: [],
          removed: [],
          summary: 'Initial baseline system configuration revision',
        },
        validationResult: { isValid: true },
        runtimeAcknowledgement: {
          runtimeId: 'standalone:4010',
          appliedRevision: 1,
          acknowledgedAt: '2026-10-08T18:00:10.000Z',
          status: 'SUCCESS',
        },
      };
      this.store.saveRevision(restaurantProject.id, initialRevision);

      // Seed Platform Plugins
      const plugins: PlatformPluginRecord[] = [
        {
          id: '@orbitox/pos',
          name: 'OrbitoX POS & Order Engine',
          version: '2.2.0',
          description: 'High-throughput kitchen, floor, and counter point-of-sale orchestration.',
          category: 'Operations',
          capabilities: ['Orders', 'Tables', 'KDS', 'Quotes', 'Payments'],
          dependencies: ['@orbitox/realtime'],
          apis: ['restaurant.orders', 'restaurant.quote', 'restaurant.tables'],
          installed: true,
          enabled: true,
          configuration: { maxSplitBills: 8, autoPrintKds: true },
          schema: {
            maxSplitBills: { type: 'number', default: 8, title: 'Max Split Bills per Session' },
            autoPrintKds: { type: 'boolean', default: true, title: 'Auto-Route to Kitchen Station' },
          },
        },
        {
          id: '@orbitox/realtime',
          name: 'OrbitoX Realtime Streamer',
          version: '1.4.0',
          description: 'SSE & WebSocket message bus for station tickets and diner status updates.',
          category: 'Infrastructure',
          capabilities: ['WebSockets', 'Ticket Broadcaster', 'Heartbeat Stream'],
          dependencies: [],
          apis: ['restaurant.kds'],
          installed: true,
          enabled: true,
          configuration: { heartbeatIntervalMs: 5000, channelPrefix: 'pos:table:' },
          schema: {
            heartbeatIntervalMs: { type: 'number', default: 5000, title: 'Heartbeat Interval (ms)' },
          },
        },
        {
          id: '@orbitox/billing',
          name: 'OrbitoX Central Billing & Tax Engine',
          version: '2.0.0',
          description: 'Deterministic minor-unit invoicing, GST/VAT compliance, and tip calculation.',
          category: 'Commerce',
          capabilities: ['Deterministic Invoicing', 'Tax Compliance', 'Discounts'],
          dependencies: [],
          apis: ['restaurant.quote'],
          installed: true,
          enabled: true,
          configuration: { taxBasisPoints: 500, defaultCurrency: 'INR' },
          schema: {
            taxBasisPoints: { type: 'number', default: 500, title: 'Tax Rate (Basis Points e.g. 500 = 5%)' },
          },
        },
        {
          id: '@orbitox/mcp',
          name: 'OrbitoX AI / MCP Server Copilot',
          version: '1.1.0',
          description: 'Model Context Protocol governance and autonomous operational copilot.',
          category: 'AI & Automation',
          capabilities: ['Kitchen Load Analyzer', 'Dynamic Menu Pricing', 'Automated Prep SLAs'],
          dependencies: [],
          apis: [],
          installed: true,
          enabled: true,
          configuration: { actionLevel: 1, maxDailyPrompts: 1000 },
          schema: {
            actionLevel: { type: 'number', default: 1, title: 'Action Authorization Level (1=Read, 2=Mutate)' },
          },
        },
        {
          id: '@orbitox/crm',
          name: 'OrbitoX CRM & Guest Loyalty',
          version: '1.0.1',
          description: 'Guest lifecycle, diner session history, and VIP perks management.',
          category: 'Growth',
          capabilities: ['Guest Profiles', 'Loyalty Points', 'Session Memory'],
          dependencies: [],
          apis: ['restaurant.sessions'],
          installed: false,
          enabled: false,
          configuration: { loyaltyEarnRatePercent: 5 },
        },
      ];
      this.store.savePlugins(restaurantProject.id, plugins);

      // Seed Environments
      const envs: EnvironmentRecord[] = [
        {
          id: 'env_local',
          projectId: restaurantProject.id,
          name: 'local',
          url: 'http://localhost:4010',
          status: 'ONLINE',
          variables: { NODE_ENV: 'development', RUNTIME_PORT: '4010' },
          secrets: { CONTROL_PLANE_SECRET: '<managed:ORBITOX_CONTROL_SECRET>' },
        },
        {
          id: 'env_prod',
          projectId: restaurantProject.id,
          name: 'production',
          url: 'https://restaurant.orbitox.io',
          status: 'ONLINE',
          variables: { NODE_ENV: 'production', CLUSTER_REGION: 'ap-south-1' },
          secrets: { CONTROL_PLANE_SECRET: '<managed:ORBITOX_CONTROL_SECRET>' },
          lastDeployedAt: '2026-10-08T18:00:00.000Z',
        },
      ];
      this.store.saveEnvironments(restaurantProject.id, envs);
    }
  }

  // --- Project Management ---
  public registerProject(record: ExternalProjectRecord): void {
    RuntimeControllerService.initialize();
    this.store.saveProject(record);
    if (!this.store.getDesiredState(record.id) || Object.keys(this.store.getDesiredState(record.id)).length === 0) {
      const initialDesired = {
        features: {
          dine_qr: true,
          dag_prep_scheduler: true,
          companion_join: true,
          realtime_kds: true,
          mcp_tools: true,
        },
        entitlements: {
          tables: { limit: 50, used: 12, enforced: true },
          monthlyOrders: { limit: 15000, used: 2420, enforced: true },
        },
        apiPolicies: {
          'restaurant.quote': { rateLimit: 300, allowedScopes: ['pos.quote', 'diner.public'] },
          'restaurant.orders': { rateLimit: 120, allowedScopes: ['pos.orders.write', 'diner.order'] },
        },
        customConfig: {
          brandColor: '#FF7A1A',
          taxBasisPoints: 500,
          serviceFeeBasisPoints: 0,
        },
      };
      this.store.saveDesiredState(record.id, initialDesired);
    }
  }

  public getProject(projectId: string): ExternalProjectRecord | undefined {
    RuntimeControllerService.initialize();
    return this.store.getProject(projectId);
  }

  public listProjects(): ExternalProjectRecord[] {
    RuntimeControllerService.initialize();
    return Object.values(this.store.getProjects());
  }

  // --- Revisions & Desired State Lifecycle ---
  public getDesiredState(projectId: string): any {
    RuntimeControllerService.initialize();
    return this.store.getDesiredState(projectId);
  }

  public listRevisions(projectId: string): ConfigurationRevision[] {
    RuntimeControllerService.initialize();
    return this.store.getRevisions(projectId);
  }

  public createDraftRevision(
    projectId: string,
    desiredState: any,
    createdBy = 'admin@orbitox.io'
  ): ConfigurationRevision {
    RuntimeControllerService.initialize();
    const current = this.store.getDesiredState(projectId) || {};
    const revisions = this.store.getRevisions(projectId);
    const nextNum = (revisions[0]?.revisionNumber || 1) + 1;
    const revisionId = `rev_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    const diff = this.computeDiff(current, desiredState);

    const revision: ConfigurationRevision = {
      revisionId,
      revisionNumber: nextNum,
      projectId,
      status: 'DRAFT',
      createdBy,
      createdAt: new Date().toISOString(),
      desiredState,
      diff,
      validationResult: { isValid: true },
    };

    this.store.saveRevision(projectId, revision);
    return revision;
  }

  public applyRevision(projectId: string, revisionId: string): { success: boolean; revision: ConfigurationRevision; signedConfig: SignedRuntimeConfiguration } {
    RuntimeControllerService.initialize();
    const revisions = this.store.getRevisions(projectId);
    const rev = revisions.find((r) => r.revisionId === revisionId);
    if (!rev) throw new Error(`Revision ${revisionId} not found`);

    rev.status = 'APPLYING';
    rev.appliedAt = new Date().toISOString();

    // Update authoritative desired state
    this.store.saveDesiredState(projectId, rev.desiredState);

    // Update project state
    const proj = this.store.getProject(projectId);
    if (proj) {
      proj.desiredRevisionNumber = rev.revisionNumber;
      proj.syncStatus = proj.activeRevisionNumber === rev.revisionNumber ? 'IN_SYNC' : 'OUT_OF_SYNC';
      proj.updatedAt = new Date().toISOString();
      this.store.saveProject(proj);
    }

    this.store.saveRevision(projectId, rev);

    this.recordAudit({
      id: `aud_${Date.now()}`,
      projectId,
      timestamp: new Date().toISOString(),
      actor: 'platform:admin',
      action: 'REVISION_APPLIED',
      status: 'SUCCESS',
      resourceId: revisionId,
      details: { revisionNumber: rev.revisionNumber, diff: rev.diff?.summary },
    });

    const signedConfig = this.generateSignedConfiguration(projectId);

    return { success: true, revision: rev, signedConfig };
  }

  public acknowledgeAppliedRevision(
    projectId: string,
    runtimeId: string,
    appliedRevisionNumber: number,
    status: 'SUCCESS' | 'ERROR' = 'SUCCESS',
    error?: string
  ): void {
    RuntimeControllerService.initialize();
    const revisions = this.store.getRevisions(projectId);
    const rev = revisions.find((r) => r.revisionNumber === appliedRevisionNumber);
    if (rev) {
      rev.status = status === 'SUCCESS' ? 'APPLIED' : 'FAILED';
      rev.runtimeAcknowledgement = {
        runtimeId,
        appliedRevision: appliedRevisionNumber,
        acknowledgedAt: new Date().toISOString(),
        status,
        error,
      };
      this.store.saveRevision(projectId, rev);
    }

    const proj = this.store.getProject(projectId);
    if (proj && status === 'SUCCESS') {
      proj.activeRevisionNumber = appliedRevisionNumber;
      proj.syncStatus = proj.desiredRevisionNumber === appliedRevisionNumber ? 'IN_SYNC' : 'OUT_OF_SYNC';
      this.store.saveProject(proj);
    }
  }

  public updateDesiredState(projectId: string, delta: Record<string, any>, applyImmediately = true): SignedRuntimeConfiguration {
    RuntimeControllerService.initialize();
    const current = this.store.getDesiredState(projectId) || {};
    const updated = {
      ...current,
      ...delta,
      features: { ...(current.features || {}), ...(delta.features || {}) },
      entitlements: { ...(current.entitlements || {}), ...(delta.entitlements || {}) },
      apiPolicies: { ...(current.apiPolicies || {}), ...(delta.apiPolicies || {}) },
      customConfig: { ...(current.customConfig || {}), ...(delta.customConfig || {}) },
    };

    if (applyImmediately) {
      const draft = this.createDraftRevision(projectId, updated);
      this.applyRevision(projectId, draft.revisionId);
    } else {
      this.createDraftRevision(projectId, updated);
    }

    return this.generateSignedConfiguration(projectId);
  }

  private computeDiff(oldState: any, newState: any): { added: string[]; modified: string[]; removed: string[]; summary: string } {
    const oldKeys = Object.keys(oldState || {});
    const newKeys = Object.keys(newState || {});
    const added = newKeys.filter((k) => !oldKeys.includes(k));
    const removed = oldKeys.filter((k) => !newKeys.includes(k));
    const modified = newKeys.filter(
      (k) => oldKeys.includes(k) && JSON.stringify(oldState[k]) !== JSON.stringify(newState[k])
    );

    const summary = `${added.length} added, ${modified.length} modified, ${removed.length} removed`;
    return { added, modified, removed, summary };
  }

  /**
   * Creates the project record for a runtime that registers for the first time.
   * Whether the caller is allowed to do this is decided at the API edge (runtime token);
   * here we validate the identity fields so garbage can never be stored.
   */
  private autoRegisterProject(payload: RuntimeRegistrationPayload): ExternalProjectRecord {
    if (!ID_PATTERN.test(payload.projectId ?? '')) {
      throw new RuntimeRegistrationError('INVALID_PAYLOAD', 'projectId must be 3-64 characters: letters, digits, "-" or "_".', 400);
    }
    if (!ID_PATTERN.test(payload.slug ?? '')) {
      throw new RuntimeRegistrationError('INVALID_PAYLOAD', 'slug must be 3-64 characters: letters, digits, "-" or "_".', 400);
    }
    const name = (payload.name ?? payload.slug).toString().trim().slice(0, 120) || payload.slug;
    const now = new Date().toISOString();

    const record: ExternalProjectRecord = {
      id: payload.projectId,
      slug: payload.slug,
      name,
      manifest: {
        projectId: payload.projectId,
        slug: payload.slug,
        name,
        type: (payload.projectType as ExternalProjectRecord['manifest']['type']) ?? 'custom-os',
        version: payload.version || '0.0.0',
        runtime: { type: 'standalone', entrypoint: '', defaultPort: payload.runtimePort, healthEndpoint: '/health' },
        enabledPlugins: [],
        enabledFeatures: [],
        apis: payload.declaredApis ?? [],
        planReferences: [],
        environmentMetadata: { defaultEnvironment: 'local', supportedEnvironments: ['local'] },
        platformController: { controlPlaneUrl: '', syncIntervalSeconds: 15, requireSignedConfig: false },
        capabilities: payload.capabilities ?? [],
      },
      status: 'CONNECTED',
      localPath: '',
      activeRevisionNumber: 1,
      desiredRevisionNumber: 1,
      syncStatus: 'IN_SYNC',
      createdAt: now,
      updatedAt: now,
    };
    this.store.saveProject(record);
    this.recordAudit({
      id: `aud_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      projectId: record.id,
      timestamp: now,
      actor: `runtime:${record.slug}`,
      action: 'PROJECT_AUTO_REGISTERED',
      status: 'SUCCESS',
      details: { runtimeUrl: payload.runtimeUrl, version: payload.version },
    });
    return record;
  }

  // --- Handshake & Telemetry ---
  public handleRegistration(payload: RuntimeRegistrationPayload): RuntimeRegistrationResponse {
    RuntimeControllerService.initialize();
    const controlSessionId = `ctrl_sess_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;

    let proj = this.store.getProject(payload.projectId);

    // A runtime we have never seen: register it as a tracked project, instead of
    // pretending success while leaving it invisible to the control plane.
    if (!proj) {
      proj = this.autoRegisterProject(payload);
    }

    const desiredRev = proj?.desiredRevisionNumber || 1;
    const appliedRev = payload.appliedRevision || desiredRev;

    const session: RuntimeSessionRecord = {
      controlSessionId,
      projectId: payload.projectId,
      slug: payload.slug,
      runtimeUrl: payload.runtimeUrl,
      runtimePort: payload.runtimePort,
      status: 'HEALTHY',
      registeredAt: new Date().toISOString(),
      lastHeartbeatAt: new Date().toISOString(),
      activeConfigVersion: 1,
      appliedRevision: appliedRev,
      desiredRevision: desiredRev,
      syncStatus: appliedRev === desiredRev ? 'IN_SYNC' : 'OUT_OF_SYNC',
      declaredApis: payload.declaredApis,
      capabilities: payload.capabilities,
      metrics: {
        pid: payload.processMetrics?.pid || 0,
        uptimeSeconds: payload.processMetrics?.uptimeSeconds || 0,
        memoryMb: payload.processMetrics?.memoryMb || 0,
      },
    };

    this.store.saveSession(session);

    let newlyIssuedKey: string | undefined;
    if (proj) {
      if (!proj.projectKeyHash) {
        newlyIssuedKey = generateProjectKey();
        proj.projectKeyHash = hashProjectKey(newlyIssuedKey);
      }
      proj.status = 'CONNECTED';
      proj.activeRevisionNumber = appliedRev;
      proj.syncStatus = session.syncStatus;
      proj.runtimeSession = session;
      this.store.saveProject(proj);
    }

    this.recordAudit({
      id: `aud_${Date.now()}`,
      projectId: payload.projectId,
      timestamp: new Date().toISOString(),
      actor: `runtime:${payload.slug}`,
      action: 'RUNTIME_REGISTERED',
      status: 'SUCCESS',
      details: { runtimeUrl: payload.runtimeUrl, port: payload.runtimePort, appliedRevision: appliedRev },
    });

    const signedConfig = this.generateSignedConfiguration(payload.projectId);

    return {
      success: true,
      registeredId: payload.projectId,
      controlSessionId,
      signedConfig,
      desiredRevision: desiredRev,
      platformTime: new Date().toISOString(),
      ...(newlyIssuedKey ? { projectKey: newlyIssuedKey } : {}),
    };
  }

  public handleHeartbeat(report: RuntimeHeartbeatReport): void {
    RuntimeControllerService.initialize();
    const session = this.store.getSession(report.projectId);
    const proj = this.store.getProject(report.projectId);

    if (session) {
      session.status = report.status === 'CRITICAL' ? 'DEGRADED' : report.status;
      session.lastHeartbeatAt = new Date().toISOString();
      session.activeConfigVersion = report.activeConfigVersion;
      session.appliedRevision = report.appliedRevision || session.appliedRevision;
      session.syncStatus = (proj?.desiredRevisionNumber === session.appliedRevision) ? 'IN_SYNC' : 'OUT_OF_SYNC';
      session.metrics.memoryMb = report.memoryUsageMb;
      session.metrics.uptimeSeconds = report.uptimeSeconds;
      this.store.saveSession(session);
    }

    if (proj && report.appliedRevision) {
      proj.activeRevisionNumber = report.appliedRevision;
      proj.syncStatus = (proj.desiredRevisionNumber === report.appliedRevision) ? 'IN_SYNC' : 'OUT_OF_SYNC';
      this.store.saveProject(proj);
    }
  }

  // --- Controlled Commands ---
  public issueCommand(
    projectId: string,
    action: ControlCommand['action'],
    parameters: Record<string, any> = {},
    issuedBy = 'platform:admin'
  ): ControlCommand {
    RuntimeControllerService.initialize();
    const commandId = `cmd_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const cmd: ControlCommand = {
      commandId,
      projectId,
      action,
      parameters,
      status: 'QUEUED',
      issuedBy,
      issuedAt: new Date().toISOString(),
    };

    this.store.saveCommand(cmd);

    this.recordAudit({
      id: `aud_${Date.now()}`,
      projectId,
      timestamp: new Date().toISOString(),
      actor: issuedBy,
      action: `COMMAND_ISSUED:${action}`,
      status: 'SUCCESS',
      resourceId: commandId,
      details: parameters,
    });

    return cmd;
  }

  public getCommands(projectId?: string): ControlCommand[] {
    RuntimeControllerService.initialize();
    return this.store.getCommands(projectId);
  }

  public completeCommand(commandId: string, result?: Record<string, any>, error?: string): void {
    RuntimeControllerService.initialize();
    const cmds = this.store.getCommands();
    const cmd = cmds.find((c: any) => c.commandId === commandId);
    if (cmd) {
      cmd.status = error ? 'FAILED' : 'COMPLETED';
      cmd.completedAt = new Date().toISOString();
      cmd.result = result;
      cmd.error = error;
      this.store.saveCommand(cmd);

      this.recordAudit({
        id: `aud_${Date.now()}`,
        projectId: cmd.projectId,
        timestamp: new Date().toISOString(),
        actor: 'runtime:executor',
        action: `COMMAND_COMPLETED:${cmd.action}`,
        status: error ? 'FAILED' : 'SUCCESS',
        resourceId: commandId,
        details: { result, error },
      });
    }
  }

  // --- Platform Plugins ---
  public getPlugins(projectId: string): PlatformPluginRecord[] {
    RuntimeControllerService.initialize();
    return this.store.getPlugins(projectId);
  }

  public updatePlugin(
    projectId: string,
    pluginId: string,
    updates: { enabled?: boolean; configuration?: Record<string, any> }
  ): PlatformPluginRecord {
    RuntimeControllerService.initialize();
    const plugins = this.store.getPlugins(projectId);
    const plugin = plugins.find((p: any) => p.id === pluginId);
    if (!plugin) throw new Error(`Plugin ${pluginId} not found`);

    if (updates.enabled !== undefined) plugin.enabled = updates.enabled;
    if (updates.configuration !== undefined) {
      plugin.configuration = { ...plugin.configuration, ...updates.configuration };
    }

    this.store.savePlugins(projectId, plugins);

    // Apply configuration change revision
    const currentDesired = this.store.getDesiredState(projectId) || {};
    const updatedDesired = {
      ...currentDesired,
      pluginsConfig: {
        ...(currentDesired.pluginsConfig || {}),
        [pluginId]: plugin.configuration,
      },
    };
    this.updateDesiredState(projectId, updatedDesired, true);

    return plugin;
  }

  // --- Environments ---
  public getEnvironments(projectId: string): EnvironmentRecord[] {
    RuntimeControllerService.initialize();
    return this.store.getEnvironments(projectId);
  }

  public updateEnvironment(projectId: string, env: EnvironmentRecord): void {
    RuntimeControllerService.initialize();
    const envs = this.store.getEnvironments(projectId);
    const idx = envs.findIndex((e: any) => e.id === env.id);
    if (idx >= 0) envs[idx] = env;
    else envs.push(env);
    this.store.saveEnvironments(projectId, envs);
  }

  // --- Audit Trail ---
  public recordAudit(entry: ProjectAuditEntry): void {
    RuntimeControllerService.initialize();
    this.store.saveAudit(entry);
  }

  public getAudits(projectId?: string): ProjectAuditEntry[] {
    RuntimeControllerService.initialize();
    return this.store.getAudits(projectId);
  }

  public getSession(projectId: string): RuntimeSessionRecord | undefined {
    RuntimeControllerService.initialize();
    return this.store.getSession(projectId);
  }

  // --- Signed Configuration Generator ---
  public generateSignedConfiguration(projectId: string): SignedRuntimeConfiguration {
    RuntimeControllerService.initialize();
    const state = this.store.getDesiredState(projectId) || {};
    const proj = this.store.getProject(projectId);
    const revisions = this.store.getRevisions(projectId);
    const activeRev = revisions[0];

    const configVersion = Date.now();
    const revisionNumber = proj?.desiredRevisionNumber || 1;
    const revisionId = activeRev?.revisionId || 'rev_1';
    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const payloadToSign = `${projectId}:${configVersion}:${revisionNumber}:${issuedAt}:${JSON.stringify(state)}`;
    const signature = crypto.createHmac('sha256', RuntimeControllerService.secretSigningKey).update(payloadToSign).digest('hex');

    return {
      configVersion,
      revisionNumber,
      revisionId,
      issuedAt,
      expiresAt,
      signature,
      projectId,
      environment: 'production',
      features: state.features || { dine_qr: true, dag_prep_scheduler: true, companion_join: true, realtime_kds: true },
      entitlements: this.resolveLiveEntitlements(projectId, state),
      apiPolicies: state.apiPolicies || {
        'restaurant.quote': { rateLimit: 300, allowedScopes: ['pos.quote', 'diner.public'] },
        'restaurant.orders': { rateLimit: 120, allowedScopes: ['pos.orders.write', 'diner.order'] },
      },
      mcpTools: [
        { name: 'restaurant.get_kitchen_load', actionLevel: 1, enabled: true },
        { name: 'restaurant.get_sales', actionLevel: 1, enabled: true },
        { name: 'restaurant.toggle_item_availability', actionLevel: 2, enabled: true },
        { name: 'restaurant.bump_task', actionLevel: 2, enabled: true },
      ],
      desiredState: state.customConfig || {},
    };
  }

  private resolveLiveEntitlements(
    projectId: string,
    state: any
  ): Record<string, { limit: number; used: number; enforced: boolean }> {
    const usageStore = PersistentUsageStore.getInstance();
    const usageRecords = usageStore.getProjectUsage(projectId);
    const overrides = state.entitlements || {};

    const defaultLimits: Record<string, { limit: number; enforced: boolean }> = {
      tables: { limit: 50, enforced: true },
      monthlyOrders: { limit: 15000, enforced: true },
      kdsScreens: { limit: 5, enforced: true },
      api_calls: { limit: 100000, enforced: true },
    };

    const allKeys = new Set<string>([
      ...Object.keys(defaultLimits),
      ...Object.keys(overrides),
      ...Object.keys(usageRecords),
    ]);

    const result: Record<string, { limit: number; used: number; enforced: boolean }> = {};
    for (const key of allKeys) {
      const override = overrides[key];
      const fallback = defaultLimits[key];
      const limit = typeof override?.limit === 'number' ? override.limit : (fallback?.limit ?? Infinity);
      const enforced = typeof override?.enforced === 'boolean' ? override.enforced : (fallback?.enforced ?? false);
      const used = usageRecords[key]?.count ?? 0;
      result[key] = { limit, used, enforced };
    }
    return result;
  }

  public verifyProjectKey(projectId: string, presentedKey: string): boolean {
    if (!presentedKey || typeof presentedKey !== 'string') return false;
    const proj = this.store.getProject(projectId);
    if (!proj || !proj.projectKeyHash) return false;
    return verifyKeyHelper(presentedKey, proj.projectKeyHash);
  }

  public verifyProjectAccess(params: ProjectAccessParams): ProjectAccessResult {
    RuntimeControllerService.initialize();
    const proj = this.store.getProject(params.projectId);
    return evaluateProjectAccess({
      ...params,
      projectKeyHash: proj?.projectKeyHash,
    });
  }
}


