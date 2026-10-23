import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import {
  ApiGuardOptions,
  ApiRequestContext,
  ApiResponse,
} from './api-types';
import {
  INITIAL_SERVICES,
  INITIAL_API_KEYS,
  BUSINESS_PROVIDERS,
  INITIAL_CLIENT_PROJECTS,
  ClientProject,
} from '@/app/admin/data/mock-data';
import {
  PlatformRepository,
  PlatformKeyEngine,
  hasCapability,
} from '@orbitox-io/plugin-engine';
import { PlatformApiKeyRecord } from '@orbitox/types';
import {
  setDrainChecker,
  setRequestTracker,
  listApiKeys,
  getApiKey,
  registerApiKey,
  rotateKey,
  revokeKey,
} from './guard';

export * from './guard';
export { withApiGuard } from './guard';

// Ensure PlatformRepository defaults are seeded
if (typeof PlatformRepository !== 'undefined' && typeof PlatformRepository.initialize === 'function') {
  PlatformRepository.initialize();
}

function isIpAllowed(clientIp: string, allowlist?: string[]): boolean {
  if (!allowlist || allowlist.length === 0) return true;
  if (allowlist.includes('*') || allowlist.includes('0.0.0.0/0')) return true;
  const normClient = clientIp === '::1' ? '127.0.0.1' : clientIp;

  return allowlist.some((rule) => {
    const trimmed = rule.trim();
    if (trimmed === normClient || trimmed === clientIp) return true;
    if (trimmed.endsWith('/32')) {
      const single = trimmed.replace('/32', '');
      return single === normClient || single === clientIp;
    }
    if (trimmed.includes('/')) {
      const parts = trimmed.split('/');
      if (parts.length === 2 && parts[0] && parts[1]) {
        const subnet = parts[0];
        const mask = parseInt(parts[1], 10);
        const subParts = subnet.split('.').map(Number);
        const ipParts = normClient.split('.').map(Number);
        if (subParts.length === 4 && ipParts.length === 4 && !isNaN(mask)) {
          if (mask === 24) {
            return subParts[0] === ipParts[0] && subParts[1] === ipParts[1] && subParts[2] === ipParts[2];
          }
          if (mask === 16) {
            return subParts[0] === ipParts[0] && subParts[1] === ipParts[1];
          }
          if (mask === 8) {
            return subParts[0] === ipParts[0];
          }
        }
      }
    }
    return false;
  });
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
  private static apiKeys = [...INITIAL_API_KEYS];
  private static providers = { ...BUSINESS_PROVIDERS };
  private static projects: ClientProject[] = [...INITIAL_CLIENT_PROJECTS];
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

  static getProjects() {
    return this.projects;
  }

  static getProject(idOrSlug: string) {
    return this.projects.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
  }

  static findProjectByApiKey(keyOrPrefix: string) {
    if (!keyOrPrefix) return null;
    return this.projects.find(
      (p) =>
        p.primaryApiKeyId === keyOrPrefix ||
        (p.primaryApiKeyPrefix && keyOrPrefix.startsWith(p.primaryApiKeyPrefix))
    );
  }

  static addProject(project: ClientProject) {
    this.projects = [project, ...this.projects];
    return project;
  }

  static updateProject(projectId: string, updates: Partial<ClientProject>) {
    const idx = this.projects.findIndex((p) => p.id === projectId || p.slug === projectId);
    if (idx !== -1) {
      this.projects[idx] = { ...this.projects[idx]!, ...updates };
      return this.projects[idx];
    }
    return null;
  }

  static deleteProject(projectId: string) {
    this.projects = this.projects.filter((p) => p.id !== projectId && p.slug !== projectId);
    return true;
  }

  static recordProjectCall(projectIdOrSlug: string) {
    const p = this.projects.find((proj) => proj.id === projectIdOrSlug || proj.slug === projectIdOrSlug);
    if (p) {
      p.monthlyApiCalls = (p.monthlyApiCalls || 0) + 1;
      p.lastActiveAt = 'Just now';
      return p;
    }
    return null;
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

  static getApiKeys(): any[] {
    const fromRegistry = listApiKeys();
    if (fromRegistry.length > 0) {
      return fromRegistry;
    }
    return this.apiKeys;
  }

  static findApiKey(keyId: string): any {
    if (!keyId) return null;
    const fromRegistry = getApiKey(keyId);
    if (fromRegistry) {
      const { authVerifier, ...safe } = fromRegistry;
      return safe;
    }
    const direct = this.apiKeys.find((k) => k.id === keyId || (k as any).keyId === keyId);
    if (direct) {
      const { authVerifier, ...safe } = direct as any;
      return safe;
    }
    return null;
  }

  static addApiKey(key: any) {
    this.apiKeys = [key, ...this.apiKeys];
    return key;
  }

  static rotateApiKey(keyId: string) {
    const rotated = rotateKey(keyId);
    if (rotated) {
      return rotated.record;
    }
    const idx = this.apiKeys.findIndex((k) => k.id === keyId);
    if (idx !== -1) {
      const old = this.apiKeys[idx]!;
      const entropy = crypto.randomBytes(4).toString('hex');
      const newKey: any = {
        ...old,
        id: `key-${Date.now()}`,
        maskedKey: `orb_live_••••••••••••••••••••${entropy}`,
        createdAt: 'Just now',
        lastUsedAt: 'Never',
      };
      this.apiKeys[idx] = newKey;
      return newKey;
    }
    return null;
  }

  static revokeApiKey(keyId: string) {
    revokeKey(keyId);
    const key = this.apiKeys.find((k) => k.id === keyId);
    if (key) {
      key.status = 'revoked';
      return key;
    }
    return null;
  }

  static toggleApiKey(keyId: string) {
    const key = this.apiKeys.find((k) => k.id === keyId);
    if (key) {
      key.status = key.status === 'active' ? 'blocked' : 'active';
      return key;
    }
    return null;
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

  static exportSnapshot(targetMode?: 'standalone' | 'distributed') {
    const data = {
      projects: this.projects,
      apiKeys: this.apiKeys,
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
        snapshotId: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        sourceMode: this.clusterMode,
        targetMode: targetMode || (this.clusterMode === 'distributed' ? 'standalone' : 'distributed'),
        sourceNodeId: this.clusterNodeId,
        checksum: hash,
        stats: {
          projectsCount: this.projects.length,
          apiKeysCount: this.apiKeys.length,
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

  static importSnapshot(snapshot: any) {
    if (!snapshot || !snapshot.data) {
      throw new Error('Invalid snapshot format: missing data payload');
    }
    const { data, metadata } = snapshot;

    if (Array.isArray(data.projects)) this.projects = [...data.projects];
    if (Array.isArray(data.apiKeys)) this.apiKeys = [...data.apiKeys];
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
      message: `[State Ingest] Ingested snapshot [${metadata?.snapshotId || 'custom'}] — Restored ${this.projects.length} projects, ${this.apiKeys.length} keys, ${this.services.length} services.`,
    });

    return {
      success: true,
      stats: metadata?.stats || {
        projectsCount: this.projects.length,
        apiKeysCount: this.apiKeys.length,
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
      snapshot = this.exportSnapshot(targetMode);
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
      this.importSnapshot(snapshot);
    }

    // 6. Release drain lock
    if (autoDrain) {
      this.stopDrain();
    }

    const durationMs = Date.now() - startTime;
    const receipt = {
      snapshotId: snapshot?.metadata?.snapshotId || `snap_switch_${Date.now()}`,
      itemsTransferred: {
        projects: this.projects.length,
        apiKeys: this.apiKeys.length,
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
          ? `Engine seamlessly switched to [STANDALONE SINGLE NODE]. State transferred with 0 data loss (${this.projects.length} projects, ${this.apiKeys.length} API keys preserved).`
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
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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

// Register drain & telemetry hooks with modular guard
setDrainChecker(() => PlatformApiState.isDrainActive());
setRequestTracker({
  track: () => PlatformApiState.trackRequest(),
  untrack: () => PlatformApiState.untrackRequest(),
});
