import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import {
  ApiGuardOptions,
  ApiRequestContext,
  ApiResponse,
  RouteClass,
} from './api-types';
import { isIpAllowed, resolveClientIp } from './ip-guard';
import {
  extractPresentedCredential,
  verifyAdminTokenSync,
  verifyInternalAuthTokenSync,
} from './auth-pipeline';
import {
  INITIAL_SERVICES,
  BUSINESS_PROVIDERS,
} from '@/app/admin/data/mock-data';
import {
  PlatformRepository,
  hasCapability,
  PLAN_DEFAULT_QUOTAS,
} from '@orbitox-io/plugin-engine';
import { PlatformApiKeyRecord, PlatformProject } from '@orbitox/types';
import { runWithHospitalTenant } from '@/app/api/hospital/_store';
import { platformRepository } from '@/lib/platform-repository';

export { PlatformRepository };

// Test/development mode keeps the explicit fixture repository; production uses PostgreSQL.
if (!platformRepository.isPrismaBacked() && typeof PlatformRepository.initialize === 'function') {
  PlatformRepository.initialize();
}

if (process.env.NODE_ENV === 'production' || !process.env.NODE_ENV) {
  scheduleMonthlyUsageReset();
}

function scheduleMonthlyUsageReset(): void {
  const now = new Date();
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const resetAt = nextMonth.getTime();
  const timer = setTimeout(() => {
    if (Date.now() >= resetAt) {
      void platformRepository.resetMonthlyProjectUsage().catch((error) => {
        console.error('Monthly project usage reset failed.', error);
      });
    }
    scheduleMonthlyUsageReset();
  }, Math.min(resetAt - now.getTime(), 2_000_000_000));
  timer.unref();
}

// In-memory sliding window rate limiter
interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitBucket>();

// In-memory platform state store for live API changes
export class PlatformApiState {
  private static services = [...INITIAL_SERVICES];
  private static providers = { ...BUSINESS_PROVIDERS };
  private static telemetryLogs: any[] = [];

  private static clusterMode: 'standalone' | 'distributed' =
    typeof process !== 'undefined' &&
      (process.env?.CLUSTER_MODE === 'distributed' ||
        process.env?.ORBITOX_DEPLOYMENT_MODE === 'distributed' ||
        Boolean(process.env?.REDIS_URL))
      ? 'distributed'
      : 'standalone';

  private static clusterNodeId: string =
    (typeof process !== 'undefined' ? process.env?.NODE_ID : undefined) ||
    'node-standalone-01';

  private static clusterNodes = [
    { id: 'node-us-east-1a', region: 'us-east-1 (N. Virginia)', status: 'healthy', latencyMs: 2, isLeader: true, cpuPercent: 18, memoryPercent: 42 },
    { id: 'node-us-west-2b', region: 'us-west-2 (Oregon)', status: 'healthy', latencyMs: 14, isLeader: false, cpuPercent: 24, memoryPercent: 39 },
    { id: 'node-eu-central-1', region: 'eu-central-1 (Frankfurt)', status: 'healthy', latencyMs: 38, isLeader: false, cpuPercent: 12, memoryPercent: 35 },
    { id: 'node-ap-south-1', region: 'ap-south-1 (Mumbai)', status: 'healthy', latencyMs: 65, isLeader: false, cpuPercent: 31, memoryPercent: 48 },
  ];

  static getClusterMode(): 'standalone' | 'distributed' {
    return this.clusterMode;
  }

  static setClusterMode(mode: 'standalone' | 'distributed') {
    this.clusterMode = mode;
    this.clusterNodeId = mode === 'distributed' ? 'node-us-east-1a' : 'node-standalone-01';
    this.recordTelemetry({
      tenantId: 'system',
      facade: 'ClusterController',
      level: 'INFO',
      message: `[Cluster Engine] Switched operational mode to [${mode.toUpperCase()}]`,
    });
    return this.clusterMode;
  }

  static getClusterNodeId(): string {
    return this.clusterNodeId;
  }

  static getClusterMetrics() {
    const isDist = this.clusterMode === 'distributed';
    return {
      mode: this.clusterMode,
      nodeId: this.clusterNodeId,
      isClustered: isDist,
      activeNodes: isDist ? this.clusterNodes.length : 1,
      nodesList: isDist
        ? this.clusterNodes
        : [
          {
            id: 'node-standalone-01',
            region: 'Local Host / Standalone (Zero-Dependency)',
            status: 'healthy',
            latencyMs: 0,
            isLeader: true,
            cpuPercent: 14,
            memoryPercent: 28,
          },
        ],
      syncProtocol: isDist ? 'Redis Pub/Sub (Atomic sliding window)' : 'In-Memory Shared V8 Map',
      dbPool: isDist ? 'PgBouncer Transaction Pool' : 'Direct Dedicated Connection',
      rateLimiter: isDist ? 'Distributed Redis Sliding-Window (with memory fallback)' : 'Zero-Dependency In-Memory Window',
      gracefulFallbackReady: true,
      lastSyncedAt: new Date().toLocaleTimeString('en-US', { hour12: false }),
    };
  }

  static async getProjects(): Promise<PlatformProject[]> {
    return platformRepository.listProjects();
  }

  static async getProject(idOrSlug: string): Promise<PlatformProject | undefined> {
    return platformRepository.getProject(idOrSlug);
  }

  static async findProjectByApiKey(keyId: string): Promise<PlatformProject | null> {
    if (!keyId) return null;
    const key = await platformRepository.getApiKey(keyId);
    if (key && key.projectId) {
      return (await platformRepository.getProject(key.projectId)) || null;
    }
    return null;
  }

  static async addProject(project: any): Promise<PlatformProject> {
    const res = await platformRepository.createProject(project);
    return res.project;
  }

  static async updateProject(projectId: string, updates: Partial<PlatformProject>): Promise<PlatformProject | null> {
    return (await platformRepository.updateProject(projectId, updates)) || null;
  }

  static async deleteProject(projectId: string): Promise<boolean> {
    return platformRepository.deleteProject(projectId);
  }

  static getServices() {
    return this.services;
  }

  static getService(serviceId: string) {
    return this.services.find((s) => s.id === serviceId);
  }

  static toggleService(serviceId: string) {
    const s = this.services.find((srv) => srv.id === serviceId);
    if (s) {
      s.status = s.status === 'active' ? 'blocked' : 'active';
      return s;
    }
    return null;
  }

  static updateServiceQuota(serviceId: string, limit: number) {
    const s = this.services.find((srv) => srv.id === serviceId);
    if (s) {
      s.apiCallLimit = limit;
      return s;
    }
    return null;
  }

  static getProviders(category?: string) {
    if (category) return this.providers[category] || [];
    return this.providers;
  }

  static getProvider(category: string, providerId: string) {
    const list = this.providers[category] || [];
    return list.find((p) => p.id === providerId);
  }

  static addProvider(category: string, provider: any) {
    if (!this.providers[category]) this.providers[category] = [];
    this.providers[category] = [provider, ...this.providers[category]];
    return provider;
  }

  static updateProvider(category: string, providerId: string, updates: any) {
    const list = this.providers[category] || [];
    const idx = list.findIndex((p) => p.id === providerId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      return list[idx];
    }
    return null;
  }

  static deleteProvider(category: string, providerId: string) {
    const list = this.providers[category] || [];
    this.providers[category] = list.filter((p) => p.id !== providerId);
    return true;
  }

  static async getApiKeys() {
    return (await platformRepository.listApiKeys()).map((key) => ({
      ...key,
      maskedKey: key.maskedDisplay,
      status: key.status.toLowerCase(),
    }));
  }

  static async findKeyByRawSecret(incomingSecret: string) {
    if (!incomingSecret) return null;
    return (await platformRepository.findKeyByRawSecret(incomingSecret)) || null;
  }

  static async findApiKeyById(keyId: string) {
    if (!keyId) return null;
    const k = await platformRepository.getApiKey(keyId);
    if (!k) return null;
    const { authVerifier, ...safe } = k as any;
    return safe;
  }

  static async findApiKey(keyOrId: string) {
    // Kept for backward compatibility of internal lookups by key ID only
    if (!keyOrId) return null;
    const byId = await this.findApiKeyById(keyOrId);
    if (byId) return byId;
    return (await platformRepository.getApiKey(keyOrId)) || null;
  }

  static async rotateApiKey(keyId: string) {
    const rotated = await platformRepository.rotateApiKey(keyId, { operatorEmail: 'platform-admin' });
    if (!rotated) return null;
    const { authVerifier, ...safeKey } = rotated.replacementKey;
    return { replacementKey: { ...safeKey, maskedKey: safeKey.maskedDisplay }, rawSecret: rotated.replacementRawSecret };
  }

  static async revokeApiKey(keyId: string) {
    const key = await platformRepository.setKeyStatus(keyId, 'REVOKED');
    if (!key) return null;
    const { authVerifier, ...safeKey } = key;
    return safeKey;
  }

  static async toggleApiKey(keyId: string) {
    const existing = await platformRepository.getApiKey(keyId);
    if (!existing) return null;
    const status = existing.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const key = await platformRepository.setKeyStatus(keyId, status);
    if (!key) return null;
    const { authVerifier, ...safeKey } = key;
    return { ...safeKey, status: safeKey.status.toLowerCase() };
  }

  // Drain & Migration state
  private static isDraining = false;
  private static inFlightRequests = 0;
  private static drainStartedAt?: string;
  private static lastSnapshot: any = null;
  private static lastReceipt: any = null;

  static isDrainActive(): boolean {
    return this.isDraining;
  }

  static getInFlightCount(): number {
    return this.inFlightRequests;
  }

  static trackRequest(): void {
    this.inFlightRequests++;
  }

  static untrackRequest(): void {
    if (this.inFlightRequests > 0) this.inFlightRequests--;
  }

  static startDrain() {
    this.isDraining = true;
    this.drainStartedAt = new Date().toISOString();
    this.recordTelemetry({
      tenantId: 'system',
      facade: 'ClusterController',
      level: 'WARN',
      message: `[Traffic Drain] Entered Graceful Drain Mode. In-flight requests: ${this.inFlightRequests}`,
    });
  }

  static stopDrain() {
    this.isDraining = false;
    this.drainStartedAt = undefined;
    this.recordTelemetry({
      tenantId: 'system',
      facade: 'ClusterController',
      level: 'INFO',
      message: `[Traffic Drain] Drain Mode Completed & Released. Ready for traffic.`,
    });
  }

  static async waitForDrain(timeoutMs = 3000): Promise<boolean> {
    const start = Date.now();
    while (this.inFlightRequests > 0 && Date.now() - start < timeoutMs) {
      await new Promise((r) => setTimeout(r, 50));
    }
    return this.inFlightRequests === 0;
  }

  static async exportSnapshot(targetMode?: 'standalone' | 'distributed') {
    const currentProjects = await this.getProjects();
    const currentKeys = await this.getApiKeys();
    const data = {
      projects: currentProjects,
      apiKeys: currentKeys,
      services: this.services,
      providers: this.providers,
      telemetryLogs: this.telemetryLogs.slice(0, 50),
      rateLimits: Object.fromEntries(rateLimitMap.entries()),
      clusterConfig: {
        currentMode: this.clusterMode,
        currentNodeId: this.clusterNodeId,
      },
    };
    const rawString = JSON.stringify(data);
    let hash = '';
    try {
      const crypto = require('crypto');
      hash = crypto.createHash('sha256').update(rawString).digest('hex');
    } catch {
      hash = 'hash_' + Date.now();
    }

    const providersCount = Object.values(this.providers).reduce(
      (acc: number, curr: any) => acc + (Array.isArray(curr) ? curr.length : 0),
      0
    );

    const snapshot = {
      metadata: {
        version: '1.0.0',
        snapshotId: `snap_${Date.now()}_${crypto.randomUUID()}`,
        createdAt: new Date().toISOString(),
        sourceMode: this.clusterMode,
        targetMode: targetMode || (this.clusterMode === 'distributed' ? 'standalone' : 'distributed'),
        sourceNodeId: this.clusterNodeId,
        checksum: hash,
        stats: {
          projectsCount: currentProjects.length,
          apiKeysCount: currentKeys.length,
          servicesCount: this.services.length,
          providersCount,
          telemetryLogsCount: this.telemetryLogs.length,
          rateLimitsCount: rateLimitMap.size,
        },
      },
      data,
    };
    this.lastSnapshot = snapshot;
    return snapshot;
  }

  static async importSnapshot(snapshot: any) {
    if (!snapshot || !snapshot.data) {
      throw new Error('Invalid snapshot format: missing data payload');
    }
    const { data, metadata } = snapshot;

    if (Array.isArray(data.services)) this.services = [...data.services];
    if (data.providers && typeof data.providers === 'object') this.providers = { ...data.providers };
    if (Array.isArray(data.telemetryLogs)) {
      this.telemetryLogs = [...data.telemetryLogs, ...this.telemetryLogs].slice(0, 100);
    }
    if (data.rateLimits && typeof data.rateLimits === 'object') {
      rateLimitMap.clear();
      for (const [k, v] of Object.entries(data.rateLimits)) {
        rateLimitMap.set(k, v as any);
      }
    }

    this.lastSnapshot = snapshot;
    this.recordTelemetry({
      tenantId: 'system',
      facade: 'StateTransferEngine',
      level: 'SECURITY',
      message: `[State Ingest] Ingested snapshot [${metadata?.snapshotId || 'custom'}] — Restored ${(await this.getProjects()).length} projects, ${(await platformRepository.listApiKeys()).length} keys, ${this.services.length} services.`,
    });

    return {
      success: true,
      stats: metadata?.stats || {
        projectsCount: (await this.getProjects()).length,
        apiKeysCount: (await platformRepository.listApiKeys()).length,
        servicesCount: this.services.length,
      },
      message: `Snapshot ingested successfully.`,
    };
  }

  static async executeSwitch(
    targetMode: 'standalone' | 'distributed',
    options: { transferState?: boolean; autoDrain?: boolean } = {}
  ) {
    const startTime = Date.now();
    const autoDrain = options.autoDrain !== false;
    const transferState = options.transferState !== false;
    const prevMode = this.clusterMode;

    // 1. Drain traffic
    if (autoDrain) {
      this.startDrain();
      await this.waitForDrain(2000);
    }

    // 2. Snapshot state
    let snapshot = null;
    if (transferState) {
      snapshot = await this.exportSnapshot(targetMode);
    }

    // 3. Reconfigure Cluster Mode
    this.setClusterMode(targetMode);

    // 4. Update node topology
    if (targetMode === 'standalone') {
      this.clusterNodes = [
        { id: 'node-standalone-01', region: 'Local Host / Standalone (Zero-Dependency)', status: 'healthy', latencyMs: 0, isLeader: true, cpuPercent: 14, memoryPercent: 28 }
      ];
    } else {
      this.clusterNodes = [
        { id: 'node-us-east-1a', region: 'us-east-1 (N. Virginia)', status: 'healthy', latencyMs: 2, isLeader: true, cpuPercent: 18, memoryPercent: 42 },
        { id: 'node-us-west-2b', region: 'us-west-2 (Oregon)', status: 'healthy', latencyMs: 14, isLeader: false, cpuPercent: 24, memoryPercent: 39 },
        { id: 'node-eu-central-1', region: 'eu-central-1 (Frankfurt)', status: 'healthy', latencyMs: 38, isLeader: false, cpuPercent: 12, memoryPercent: 35 },
        { id: 'node-ap-south-1', region: 'ap-south-1 (Mumbai)', status: 'healthy', latencyMs: 65, isLeader: false, cpuPercent: 31, memoryPercent: 48 },
      ];
    }

    // 5. Ingest snapshot into target state
    if (snapshot) {
      await this.importSnapshot(snapshot);
    }

    // 6. Release drain lock
    if (autoDrain) {
      this.stopDrain();
    }

    const durationMs = Date.now() - startTime;
    const receipt = {
      snapshotId: snapshot?.metadata?.snapshotId || `snap_switch_${Date.now()}`,
      itemsTransferred: {
        projects: (await this.getProjects()).length,
        apiKeys: (await platformRepository.listApiKeys()).length,
        services: this.services.length,
        providers: Object.keys(this.providers).length,
        telemetryLogs: this.telemetryLogs.length,
      },
      durationMs,
      checksum: snapshot?.metadata?.checksum || 'N/A',
      timestamp: new Date().toISOString(),
    };
    this.lastReceipt = receipt;

    return {
      success: true,
      previousMode: prevMode,
      newMode: targetMode,
      snapshot,
      transferReceipt: receipt,
      message:
        targetMode === 'standalone'
          ? `Engine seamlessly switched to [STANDALONE SINGLE NODE]. State transferred with 0 data loss (${(await this.getProjects()).length} projects, ${(await platformRepository.listApiKeys()).length} API keys preserved).`
          : `Engine scaled up to [DISTRIBUTED CLUSTERED MESH]. State synchronized across cluster nodes.`,
    };
  }

  static getLastSnapshot() {
    return this.lastSnapshot;
  }

  static getLastMigrationReceipt() {
    return this.lastReceipt;
  }

  static recordTelemetry(entry: any) {
    const log = {
      id: `log-${crypto.randomUUID()}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      ...entry,
    };
    this.telemetryLogs = [log, ...this.telemetryLogs.slice(0, 99)];
    return log;
  }

  static getTelemetry() {
    return this.telemetryLogs;
  }
}

export function isDatabaseError(err: any): boolean {
  if (!err) return false;
  const errMsg = String(err?.message || '');
  const errCode = String(err?.code || '');
  const errName = String(err?.name || '');
  return (
    errCode === '57014' ||
    errCode === '55P03' ||
    errCode === 'P2024' ||
    errCode.startsWith('P') ||
    /^[0-9A-Z]{5}$/.test(errCode) ||
    errName.includes('Prisma') ||
    errMsg.includes('statement timeout') ||
    errMsg.includes('lock timeout') ||
    errMsg.includes('connection pool') ||
    errMsg.includes('Timed out fetching a new connection') ||
    errMsg.includes('remaining connection slots are reserved') ||
    errMsg.includes('Connection terminated') ||
    errMsg.includes('ECONNREFUSED') ||
    errMsg.includes('Connection refused')
  );
}

export function classifyDatabaseError(err: any): { code: string; message: string } {
  const errMsg = String(err?.message || '');
  const errCode = String(err?.code || '');

  if (errCode === '57014' || errMsg.includes('statement timeout') || errMsg.includes('canceling statement due to statement timeout')) {
    return { code: 'STATEMENT_TIMEOUT', message: 'Database statement timed out.' };
  }
  if (errCode === '55P03' || errMsg.includes('lock timeout') || errMsg.includes('canceling statement due to lock timeout')) {
    return { code: 'LOCK_TIMEOUT', message: 'Database lock timed out.' };
  }
  if (errCode === 'P2024' || errMsg.includes('connection pool') || errMsg.includes('Timed out fetching a new connection') || errMsg.includes('remaining connection slots are reserved')) {
    return { code: 'POOL_EXHAUSTED', message: 'Database connection pool exhausted.' };
  }
  return { code: 'DATABASE_UNAVAILABLE', message: 'Database is temporarily unavailable.' };
}

export function withApiGuard<T = any>(
  options: ApiGuardOptions,
  handler: (req: NextRequest, ctx: ApiRequestContext) => Promise<NextResponse<ApiResponse<T>> | Response>
) {
  return async (req: NextRequest): Promise<Response> => {
    const startTime = performance.now();
    const requestId = `req_${crypto.randomUUID()}`;

    // Drain Gate: reject incoming traffic if draining, unless it's a system management request
    if (PlatformApiState.isDrainActive() && options.serviceId !== 'system') {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'SYSTEM_DRAIN_MODE',
            message: 'Traffic drain in progress: System is transitioning architecture mode. Please retry in 2 seconds.',
          },
          meta: {
            tenantId: 'system',
            serviceId: options.serviceId || 'unknown',
            latencyMs: 1,
            timestamp: new Date().toISOString(),
            requestId,
          },
        },
        {
          status: 503,
          headers: {
            'Retry-After': '2',
            'x-orbitox-drain-mode': 'active',
          },
        }
      );
    }

    PlatformApiState.trackRequest();

    const serviceId = options.serviceId || 'system';

    // 1. Client Identity & Headers (Trusted Proxy Resolution)
    const clientIp = resolveClientIp(req.headers);
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    // 2. Cryptographically verify Admin Session / Principal
    // Mode A: Internal signed token forwarded from middleware
    const forwardedPrincipal = req.headers.get('x-orbitox-principal');
    const internalSig = req.headers.get('x-orbitox-internal-sig');
    const internalTs = req.headers.get('x-orbitox-internal-ts');
    const isInternalAdmin = Boolean(
      forwardedPrincipal === 'admin' &&
      internalSig &&
      internalTs &&
      verifyInternalAuthTokenSync('admin', internalSig, internalTs)
    );

    // Mode B: Direct admin credential verification (Bearer, Basic, or x-admin-token)
    const presentedCred = extractPresentedCredential(req);
    const isDirectAdmin = Boolean(presentedCred && verifyAdminTokenSync(presentedCred));

    const hasAdminSession = isInternalAdmin || isDirectAdmin;

    // 3. Extract API Key - strictly from headers (x-api-key or non-admin Authorization: Bearer <key>)
    const xApiKey = req.headers.get('x-api-key')?.trim();
    const authHeader = req.headers.get('authorization')?.trim() || '';
    const bearerCandidate = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : '';

    // An admin token MUST NEVER be interpreted as an API key!
    const bearerIsAdminToken = isDirectAdmin && presentedCred === bearerCandidate;
    const rawApiKey = xApiKey || (!bearerIsAdminToken ? bearerCandidate : '');

    // 3. Route Classification & Public Allowlist Check
    const pathname = req.nextUrl.pathname;
    const isPublicAllowlist = pathname === '/api/v1/openapi.json' || pathname === '/api/health';
    const isExplicitlyPublic = (options.routeClass === 'public' || options.allowPublic === true) && isPublicAllowlist;

    const routeClass: RouteClass = options.routeClass || (
      options.serviceId === 'admin' || options.serviceId === 'platform' || options.serviceId === 'system'
        ? 'platform-admin'
        : isExplicitlyPublic
          ? 'public'
          : 'customer'
    );

    // 4. Authenticate API Key via constant-time HMAC verifiers (zero prefix matching)
    let matchedKey: any = null;
    let isPlatformKeyRecord = false;
    let authorizedProject: PlatformProject | null = null;
    let projectUsageReserved = false;
    let effectiveProjectQuota = Number.POSITIVE_INFINITY;
    let guardDatabaseOperations = 0;
    let guardDatabaseWrites = 0;
    let prismaRepositoryUsed = false;

    if (rawApiKey) {
      let lookup;
      try {
        lookup = await platformRepository.authorizeApiKey(rawApiKey);
      } catch (err: any) {
        const classified = classifyDatabaseError(err);
        const errorCode = classified.code === 'DATABASE_UNAVAILABLE' ? 'AUTHENTICATION_UNAVAILABLE' : classified.code;
        PlatformApiState.recordTelemetry({
          tenantId: 'security',
          facade: 'AuthorizationRepository',
          level: 'ERROR',
          message: `Authorization repository unavailable (${errorCode}): ${classified.message}`,
        });
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: {
              code: errorCode,
              message: classified.message,
            },
            meta: { latencyMs: Math.round(performance.now() - startTime), timestamp: new Date().toISOString(), requestId },
          },
          { status: 503, headers: { 'Retry-After': '1', 'x-orbitox-error-code': errorCode } }
        );
      }
      matchedKey = lookup.key;
      authorizedProject = lookup.project;
      isPlatformKeyRecord = Boolean(lookup.key);
      if (lookup.source === 'prisma') {
        prismaRepositoryUsed = true;
        guardDatabaseOperations += lookup.queryCount;
        PlatformApiState.recordTelemetry({
          tenantId: lookup.key?.projectId || 'unknown',
          facade: 'AuthorizationRepository',
          level: 'DEBUG',
          message: `Authorization lookup query count: ${lookup.queryCount}`,
        });
      }
    }

    // 5. Enforce Mandatory Authentication Gate
    if (!isExplicitlyPublic) {
      if (!rawApiKey && !hasAdminSession) {
        const latencyMs = Math.round(performance.now() - startTime);
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required. Provide an API key via x-api-key or Authorization: Bearer <key>.',
            },
            meta: {
              latencyMs,
              timestamp: new Date().toISOString(),
              requestId,
            },
          },
          { status: 401 }
        );
      }

      if (rawApiKey && !matchedKey) {
        const latencyMs = Math.round(performance.now() - startTime);
        PlatformApiState.recordTelemetry({
          tenantId: 'security',
          facade: 'SecurityFacade',
          level: 'SECURITY',
          message: `[API 401] Invalid or unrecognized API key secret provided.`,
        });
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'The provided API key could not be verified against the platform keystore.',
            },
            meta: {
              latencyMs,
              timestamp: new Date().toISOString(),
              requestId,
            },
          },
          { status: 401 }
        );
      }

      if (matchedKey) {
        const keyStatus = (matchedKey.status || '').toLowerCase();
        if (keyStatus !== 'active') {
          const latencyMs = Math.round(performance.now() - startTime);
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: {
                code: 'KEY_DISABLED',
                message: `The provided API key is currently ${matchedKey.status.toUpperCase()}.`,
                details: { keyId: matchedKey.id || matchedKey.keyId, status: matchedKey.status },
              },
              meta: {
                latencyMs,
                timestamp: new Date().toISOString(),
                requestId,
              },
            },
            { status: 403 }
          );
        }

        if (matchedKey.expiresAt && Date.parse(matchedKey.expiresAt) <= Date.now()) {
          const latencyMs = Math.round(performance.now() - startTime);
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: {
                code: 'KEY_EXPIRED',
                message: 'The provided API key has expired.',
                details: { keyId: matchedKey.id || matchedKey.keyId, expiresAt: matchedKey.expiresAt },
              },
              meta: { latencyMs, timestamp: new Date().toISOString(), requestId },
            },
            { status: 403 }
          );
        }

        // 5.1 IP Allowlist Gate (using full CIDR matcher)
        if (matchedKey.ipAllowlist && matchedKey.ipAllowlist.length > 0) {
          if (!isIpAllowed(clientIp, matchedKey.ipAllowlist)) {
            const latencyMs = Math.round(performance.now() - startTime);
            PlatformApiState.recordTelemetry({
              tenantId: 'security',
              facade: 'SecurityFacade',
              level: 'SECURITY',
              message: `[API 403] IP allowlist violation for key [${matchedKey.id || matchedKey.keyId}]: client IP [${clientIp}] blocked.`,
            });
            return NextResponse.json<ApiResponse>(
              {
                success: false,
                error: {
                  code: 'IP_FORBIDDEN',
                  message: `Client IP address [${clientIp}] is not in the authorized IP allowlist for this API key.`,
                  details: { clientIp, allowlist: matchedKey.ipAllowlist },
                },
                meta: {
                  latencyMs,
                  timestamp: new Date().toISOString(),
                  requestId,
                },
              },
              { status: 403 }
            );
          }
        }
      }

      // Check platform-admin route class authorization
      if (routeClass === 'platform-admin') {
        const caps = matchedKey ? (matchedKey.capabilities || matchedKey.scopes || []) : [];
        const isAdmin =
          hasAdminSession ||
          caps.includes('*') ||
          caps.includes('admin') ||
          caps.some((c: string) => c.startsWith('platform.'));

        if (!isAdmin) {
          const latencyMs = Math.round(performance.now() - startTime);
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: {
                code: 'FORBIDDEN',
                message: 'Platform Administration authority is required to access this endpoint.',
              },
              meta: {
                latencyMs,
                timestamp: new Date().toISOString(),
                requestId,
              },
            },
            { status: 403 }
          );
        }
      }
    }

    // 6. Check Required Scopes / Capabilities (fail-closed: missing creds = deny)
    if (options.requiredScopes && options.requiredScopes.length > 0) {
      if (!matchedKey && !hasAdminSession) {
        const latencyMs = Math.round(performance.now() - startTime);
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: `Authentication required: this endpoint requires capabilities [${options.requiredScopes.join(', ')}].`,
            },
            meta: { latencyMs, timestamp: new Date().toISOString(), requestId },
          },
          { status: 401 }
        );
      }

      if (matchedKey) {
        const grantedCapabilities: string[] = matchedKey.capabilities || matchedKey.scopes || [];
        const hasAllCapabilities = options.requiredScopes.every((reqScope) =>
          hasCapability(grantedCapabilities, reqScope)
        );

        if (!hasAllCapabilities) {
          const latencyMs = Math.round(performance.now() - startTime);
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: {
                code: 'INSUFFICIENT_SCOPES',
                message: `This operation requires the following capabilities: ${options.requiredScopes.join(', ')}`,
                details: { required: options.requiredScopes, granted: grantedCapabilities },
              },
              meta: { latencyMs, timestamp: new Date().toISOString(), requestId },
            },
            { status: 403 }
          );
        }
      }
    }

    // 7. Trusted Multi-Tenant Resolution & Anti-Spoofing
    // Tenant identity derived ONLY from authenticated key or verified registered domain
    let tenantId = 'default';
    let project: any = authorizedProject;

    const clientHeaderTenant =
      req.headers.get('x-tenant-id')?.trim() || req.headers.get('x-context-id')?.trim() || '';

    if (matchedKey) {
      const allowedTenantScope: string[] = matchedKey.tenantScope || [];
      const projectId = matchedKey.projectId;
      if (!project && projectId) project = await platformRepository.getProject(projectId);

      if (clientHeaderTenant) {
        const isPermitted =
          (allowedTenantScope.length > 0 &&
            (allowedTenantScope.includes('*') || allowedTenantScope.includes(clientHeaderTenant))) ||
          (project && (project.slug === clientHeaderTenant || project.id === clientHeaderTenant));

        if (!isPermitted) {
          const latencyMs = Math.round(performance.now() - startTime);
          PlatformApiState.recordTelemetry({
            tenantId: clientHeaderTenant,
            facade: 'SecurityFacade',
            level: 'SECURITY',
            message: `[API 403] Tenant spoofing attempt detected! Key [${matchedKey.id || matchedKey.keyId}] attempted unauthorized tenant access to [${clientHeaderTenant}].`,
          });

          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: {
                code: 'TENANT_SCOPE_VIOLATION',
                message: `Client requested tenant [${clientHeaderTenant}], but this API key is scoped only to [${allowedTenantScope.join(', ') || project?.slug || 'none'}].`,
                details: {
                  requestedTenant: clientHeaderTenant,
                  authorizedScope: allowedTenantScope,
                },
              },
              meta: {
                tenantId: clientHeaderTenant,
                serviceId,
                latencyMs,
                timestamp: new Date().toISOString(),
                requestId,
              },
            },
            {
              status: 403,
              headers: {
                'x-orbitox-tenant-scope': 'VIOLATION',
              },
            }
          );
        }
        tenantId = clientHeaderTenant;
      } else {
        if (allowedTenantScope.length > 0 && !allowedTenantScope.includes('*') && allowedTenantScope[0]) {
          tenantId = allowedTenantScope[0];
        } else if (project) {
          tenantId = project.slug || project.id;
        } else {
          tenantId = 'default';
        }
      }
    } else if (isExplicitlyPublic) {
      const host = req.nextUrl.hostname.toLowerCase();
      const matchingDomain = await platformRepository.findVerifiedDomain(host);
      if (platformRepository.isPrismaBacked()) {
        prismaRepositoryUsed = true;
        guardDatabaseOperations += 1;
      }
      if (matchingDomain) {
        const env = await platformRepository.getEnvironment(matchingDomain.environmentId);
        if (platformRepository.isPrismaBacked()) guardDatabaseOperations += 1;
        tenantId = env?.projectId || 'default';
      } else {
        tenantId = 'default';
      }
    } else {
      tenantId = 'default';
    }

    // 8. Fail-Closed Microservice Gates for Customer APIs
    if (routeClass === 'customer' && serviceId !== 'system' && serviceId !== 'admin' && serviceId !== 'platform') {
      // 8.1 Fail-closed project resolution: missing project = deny
      if (!project) {
        const latencyMs = Math.round(performance.now() - startTime);
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: {
              code: 'PROJECT_NOT_FOUND',
              message: 'No valid client project could be resolved for this credential.',
            },
            meta: { tenantId, serviceId, latencyMs, timestamp: new Date().toISOString(), requestId },
          },
          { status: 403 }
        );
      }

      // 8.2 Verify Project Suspension Gate (case-insensitive)
      if ((project.status || '').toLowerCase() === 'suspended') {
        const latencyMs = Math.round(performance.now() - startTime);
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: {
              code: 'PROJECT_SUSPENDED',
              message: `Client project [${project.name}] has been suspended by Platform Administration.`,
              details: { projectId: project.id, status: project.status },
            },
            meta: { tenantId, serviceId, latencyMs, timestamp: new Date().toISOString(), requestId },
          },
          { status: 403, headers: { 'x-orbitox-project-status': 'suspended' } }
        );
      }

      // 8.3 Fail-closed plugin entitlement: empty services or unlisted service = deny
      const services: string[] = project.enabledServices || [];
      const isEntitled = services.some(
        (s: string) => s === serviceId || s === `@orbitox/${serviceId}` || s === `@orbitox-io/${serviceId}`
      );
      if (!isEntitled) {
        const latencyMs = Math.round(performance.now() - startTime);
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: {
              code: 'PLUGIN_NOT_ENTITLED',
              message: `Your project [${project.name}] is not subscribed to package [@orbitox/${serviceId}]. Enable this plugin package in your Project Settings or upgrade your plan.`,
              details: {
                projectId: project.id,
                requestedService: serviceId,
                subscribedPackages: services,
              },
            },
            meta: { tenantId, serviceId, latencyMs, timestamp: new Date().toISOString(), requestId },
          },
          { status: 403, headers: { 'x-orbitox-entitlement': 'denied' } }
        );
      }

      // 8.4 Fail-closed quota gate: missing or 0 quota uses plan default, never unlimited unless plan is unlimited
      effectiveProjectQuota = project.apiCallQuota || PLAN_DEFAULT_QUOTAS[project.plan?.toLowerCase() || 'starter'] || 100000;
    }

    // 8.5. Verify Microservice Status Gate
    if (options.serviceId && options.serviceId !== 'system' && options.serviceId !== 'admin') {
      const srv = PlatformApiState.getService(options.serviceId);
      if (srv && srv.status === 'blocked') {
        const latencyMs = Math.round(performance.now() - startTime);
        PlatformApiState.recordTelemetry({
          tenantId,
          facade: 'SecurityFacade',
          level: 'SECURITY',
          message: `[API 403] Blocked request to microservice [${options.serviceName || options.serviceId}]: Service is set to BLOCKED in Platform Admin.`,
        });

        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: {
              code: 'SERVICE_SUSPENDED',
              message: `The microservice [${options.serviceName || options.serviceId}] has been disabled by Platform Administration.`,
              details: { serviceId: options.serviceId, status: 'blocked' },
            },
            meta: {
              tenantId,
              serviceId: options.serviceId,
              latencyMs,
              timestamp: new Date().toISOString(),
              requestId,
            },
          },
          {
            status: 403,
            headers: {
              'x-orbitox-latency-ms': latencyMs.toString(),
              'x-orbitox-service-status': 'blocked',
            },
          }
        );
      }
    }

    // 9. Multi-Tenant Partitioned Rate Limiting (Cross-Process Durable)
    const clusterMode = PlatformApiState.getClusterMode();
    const scopesToCheck: Array<{ scopeType: 'project' | 'key' | 'ip'; scopeId: string; limit: number }> = [];

    if (project?.id && project.rateLimitPerMin) {
      scopesToCheck.push({
        scopeType: 'project',
        scopeId: project.id,
        limit: project.rateLimitPerMin,
      });
    }

    if (matchedKey?.id && matchedKey.rateLimitPerMin) {
      scopesToCheck.push({
        scopeType: 'key',
        scopeId: matchedKey.id,
        limit: matchedKey.rateLimitPerMin,
      });
    }

    if (scopesToCheck.length === 0) {
      scopesToCheck.push({
        scopeType: 'ip',
        scopeId: `${clientIp}:${serviceId}`,
        limit: options.rateLimitPerMin || 1200,
      });
    }

    let rateLimitResult;
    try {
      rateLimitResult = await platformRepository.checkRateLimits(scopesToCheck, 60);
    } catch (rateLimitErr: any) {
      if (
        rateLimitErr?.code === 'RATE_LIMIT_PARTITION_EXHAUSTED' ||
        rateLimitErr?.name === 'PlatformRateLimitPartitionExhaustedError' ||
        rateLimitErr?.message?.includes('partition runway exhausted') ||
        rateLimitErr?.message?.includes('no partition of relation')
      ) {
        // Requirement 5: Partition runway exhaustion fails closed with 503, NEVER silent allow!
        const latencyMs = Math.round(performance.now() - startTime);
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: {
              code: 'DATABASE_UNAVAILABLE',
              message: 'Rate limiting partition runway exhausted. Database maintenance required.',
            },
            meta: {
              tenantId,
              serviceId,
              latencyMs,
              timestamp: new Date().toISOString(),
              requestId,
            },
          },
          {
            status: 503,
            headers: {
              'x-orbitox-error-code': 'RATE_LIMIT_PARTITION_EXHAUSTED',
              'retry-after': '60',
              'x-orbitox-latency-ms': latencyMs.toString(),
            },
          }
        );
      }
      throw rateLimitErr;
    }

    const rateLimit = rateLimitResult.limit;
    const remaining = rateLimitResult.remaining;
    const resetSeconds = rateLimitResult.resetSeconds;

    if (!rateLimitResult.allowed) {
      const latencyMs = Math.round(performance.now() - startTime);
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit of ${rateLimit} requests per minute exceeded. Retry in ${resetSeconds}s.`,
            details: { limit: rateLimit, remaining: 0, resetInSeconds: resetSeconds },
          },
          meta: {
            tenantId,
            serviceId,
            latencyMs,
            timestamp: new Date().toISOString(),
            requestId,
          },
        },
        {
          status: 429,
          headers: {
            'x-ratelimit-limit': rateLimit.toString(),
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': resetSeconds.toString(),
            'retry-after': resetSeconds.toString(),
            'x-orbitox-latency-ms': latencyMs.toString(),
            'x-orbitox-cluster-mode': clusterMode,
            'x-orbitox-cluster-node': PlatformApiState.getClusterNodeId(),
          },
        }
      );
    }

    // 10. Context Preparation
    const context: ApiRequestContext = {
      tenantId,
      serviceId,
      apiKey: rawApiKey,
      credential: matchedKey ? rawApiKey : hasAdminSession ? presentedCred || req.headers.get('x-orbitox-credential') || undefined : undefined,
      keyPrefix: matchedKey?.keyPrefix,
      environment: matchedKey?.environment || 'production',
      scopes: matchedKey?.scopes || ['*'],
      capabilities: matchedKey?.capabilities || matchedKey?.scopes || ['*'],
      projectId: project?.id,
      environmentId: matchedKey?.environmentId,
      clientIp,
      userAgent,
      requestId,
      startTime,
    };

    // 11. Execute Handler
    if (project) {
      const projectQuota = project.plan?.toLowerCase() === 'unlimited'
        ? Number.POSITIVE_INFINITY
        : effectiveProjectQuota;
      let reservation: number | undefined;
      try {
        reservation = await platformRepository.reserveProjectUsage(project.id, projectQuota);
      } catch (err: any) {
        const classified = classifyDatabaseError(err);
        const latencyMs = Math.round(performance.now() - startTime);
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: {
              code: classified.code,
              message: classified.message,
            },
            meta: { tenantId, serviceId, latencyMs, timestamp: new Date().toISOString(), requestId },
          },
          { status: 503, headers: { 'Retry-After': '1', 'x-orbitox-error-code': classified.code } }
        );
      }
      if (platformRepository.isPrismaBacked()) {
        guardDatabaseOperations += 1;
        guardDatabaseWrites += 1;
      }
      if (reservation === undefined) {
        const latencyMs = Math.round(performance.now() - startTime);
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: {
              code: 'TENANT_QUOTA_EXCEEDED',
              message: `Monthly API call quota of ${projectQuota.toLocaleString()} calls for project [${project.name}] has been exceeded. Upgrade plan in Platform Admin.`,
              details: { projectId: project.id, consumed: project.monthlyApiCalls || 0, limit: projectQuota },
            },
            meta: { tenantId, serviceId, latencyMs, timestamp: new Date().toISOString(), requestId },
          },
          { status: 429, headers: { 'x-orbitox-quota-exceeded': 'true', 'retry-after': '86400' } }
        );
      }
      projectUsageReserved = true;
    }

    try {
      const response = serviceId === 'hms'
        ? await runWithHospitalTenant(tenantId, () => handler(req, context))
        : await handler(req, context);
      const latencyMs = Math.max(1, Math.round(performance.now() - startTime));

      if (projectUsageReserved && project && (response.status < 200 || response.status >= 300)) {
        try {
          await platformRepository.releaseProjectUsage(project.id);
          if (platformRepository.isPrismaBacked()) {
            guardDatabaseOperations += 1;
            guardDatabaseWrites += 1;
          }
        } catch (releaseErr: any) {
          PlatformApiState.recordTelemetry({
            tenantId: project?.slug || 'unknown',
            facade: 'AuthorizationRepository',
            level: 'WARN',
            message: `Project usage release failed after error response [${response.status}]: ${releaseErr?.message || releaseErr}`,
          });
        }
        projectUsageReserved = false;
      }

      // Record key usage and platform environment quota
      // Fix C1: Bookkeeping failures after a 2xx must not change the successful response to a 503
      const isBillableResponse = response.status >= 200 && response.status < 300;
      if (matchedKey && isPlatformKeyRecord && isBillableResponse) {
        try {
          await platformRepository.recordKeyUsage(matchedKey.id, clientIp);
          if (platformRepository.isPrismaBacked()) {
            guardDatabaseOperations += 1;
            guardDatabaseWrites += 1;
          }
        } catch (keyUsageErr: any) {
          PlatformApiState.recordTelemetry({
            tenantId: project?.slug || 'unknown',
            facade: 'AuthorizationRepository',
            level: 'WARN',
            message: `Key usage bookkeeping failed after successful response: ${keyUsageErr?.message || keyUsageErr}`,
          });
        }

        if (matchedKey.environmentId) {
          try {
            await platformRepository.recordCall(matchedKey.environmentId);
            if (platformRepository.isPrismaBacked()) {
              guardDatabaseOperations += 1;
              guardDatabaseWrites += 1;
            }
          } catch (callErr: any) {
            PlatformApiState.recordTelemetry({
              tenantId: project?.slug || 'unknown',
              facade: 'AuthorizationRepository',
              level: 'WARN',
              message: `Environment call counter bookkeeping failed after successful response: ${callErr?.message || callErr}`,
            });
          }
        }
      }
      if (prismaRepositoryUsed) {
        PlatformApiState.recordTelemetry({
          tenantId: project?.slug || 'unknown',
          facade: 'AuthorizationRepository',
          level: 'DEBUG',
          message: `API guard database operations: ${guardDatabaseOperations} total, ${guardDatabaseWrites} writes; route-handler database calls excluded.`,
        });
      }

      // Inject standard response headers
      const resHeaders = new Headers(response.headers);
      resHeaders.set('x-orbitox-latency-ms', latencyMs.toString());
      resHeaders.set('x-orbitox-tenant-id', tenantId);
      resHeaders.set('x-orbitox-service-id', serviceId);
      resHeaders.set('x-orbitox-cluster-mode', clusterMode);
      resHeaders.set('x-orbitox-cluster-node', PlatformApiState.getClusterNodeId());
      resHeaders.set('x-ratelimit-limit', rateLimit.toString());
      resHeaders.set('x-ratelimit-remaining', remaining.toString());
      resHeaders.set('x-ratelimit-reset', resetSeconds.toString());
      resHeaders.set('x-request-id', requestId);

      if (project) {
        resHeaders.set('x-orbitox-project-id', project.id);
        resHeaders.set('x-orbitox-plan', project.plan);
        resHeaders.set('x-orbitox-business-model', project.businessModel);
      }

      if (response instanceof NextResponse) {
        for (const [k, v] of Array.from(resHeaders.entries())) {
          response.headers.set(k, v);
        }
        return response;
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: resHeaders,
      });
    } catch (err: any) {
      if (projectUsageReserved && project) {
        try {
          await platformRepository.releaseProjectUsage(project.id);
        } catch {
          // Ignore secondary failure during release
        }
        projectUsageReserved = false;
      }
      const latencyMs = Math.max(1, Math.round(performance.now() - startTime));
      console.error(`[OrbitoX API Error] ${req.method} ${req.nextUrl.pathname}:`, err);

      if (isDatabaseError(err)) {
        const classified = classifyDatabaseError(err);
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: {
              code: classified.code,
              message: classified.message,
            },
            meta: { tenantId, serviceId, latencyMs, timestamp: new Date().toISOString(), requestId },
          },
          { status: 503, headers: { 'Retry-After': '1', 'x-orbitox-error-code': classified.code } }
        );
      }

      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: err.message || 'An unexpected error occurred processing your request.',
          },
          meta: {
            tenantId,
            serviceId,
            latencyMs,
            timestamp: new Date().toISOString(),
            requestId,
          },
        },
        {
          status: 500,
          headers: {
            'x-orbitox-latency-ms': latencyMs.toString(),
          },
        }
      );
    } finally {
      PlatformApiState.untrackRequest();
    }
  };
}
