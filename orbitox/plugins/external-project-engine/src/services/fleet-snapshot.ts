import type {
  ExternalProjectRecord,
  RuntimeSessionRecord,
  EnvironmentRecord,
  PlatformPluginRecord,
  ProjectAuditEntry,
} from '../types';
import type { ControlCommand } from '@orbitox/external-runtime-sdk';

/**
 * Fleet view: one honest, real-data snapshot of every project connected to the
 * control plane. Nothing here is estimated or mocked - connection state comes
 * from heartbeat age, drift from desired vs. applied revision, activity from the
 * command queue and audit trail.
 */

/** A runtime is ONLINE if it reported within this window. */
export const ONLINE_WINDOW_MS = 30_000;
/** Between ONLINE and this age it is STALE (late heartbeat); beyond it, OFFLINE. */
export const STALE_WINDOW_MS = 5 * 60_000;

export type FleetConnection = 'ONLINE' | 'STALE' | 'OFFLINE' | 'NEVER_CONNECTED';

/** Highest-priority issue first; a project can have several. */
export type FleetAttention = 'OFFLINE' | 'STALE' | 'OUT_OF_SYNC' | 'FAILED_COMMAND' | 'NEVER_CONNECTED' | 'USAGE_LIMIT_EXCEEDED';

export interface FleetProject {
  id: string;
  slug: string;
  name: string;
  status: ExternalProjectRecord['status'];
  connection: FleetConnection;
  syncStatus: ExternalProjectRecord['syncStatus'];
  desiredRevision: number;
  appliedRevision: number;
  /** How many revisions the runtime is behind the control plane. */
  revisionDrift: number;
  lastHeartbeatAt: string | null;
  /** Seconds since the last heartbeat, or null if it never connected. */
  lastSeenSecondsAgo: number | null;
  runtime: {
    url: string | null;
    uptimeSeconds: number | null;
    memoryMb: number | null;
    declaredApis: number;
  };
  environments: Array<{ name: string; status: EnvironmentRecord['status']; url: string }>;
  plugins: { enabled: number; installed: number; enabledNames: string[] };
  commands: { queued: number; failed: number; last: { action: string; status: string; issuedAt: string } | null };
  lastActivity: { at: string; action: string; actor: string; status: string } | null;
  attention: FleetAttention[];
  createdAt: string;
  updatedAt: string;
}

export interface FleetSummary {
  total: number;
  online: number;
  stale: number;
  offline: number;
  neverConnected: number;
  outOfSync: number;
  needsAttention: number;
}

export interface FleetSnapshot {
  generatedAt: string;
  summary: FleetSummary;
  projects: FleetProject[];
}

export interface FleetInput {
  projects: ExternalProjectRecord[];
  sessions: Record<string, RuntimeSessionRecord | undefined>;
  environments: Record<string, EnvironmentRecord[] | undefined>;
  plugins: Record<string, PlatformPluginRecord[] | undefined>;
  commands: ControlCommand[];
  audits: ProjectAuditEntry[];
}

export interface FleetQuery {
  /** Case-insensitive match on name, slug or id. */
  q?: string;
  connection?: FleetConnection;
  /** Only projects with at least one attention flag. */
  attentionOnly?: boolean;
}

const ATTENTION_ORDER: FleetAttention[] = ['OFFLINE', 'NEVER_CONNECTED', 'STALE', 'USAGE_LIMIT_EXCEEDED', 'OUT_OF_SYNC', 'FAILED_COMMAND'];

function ts(value: string | undefined | null): number {
  if (!value) return 0;
  const n = Date.parse(value);
  return Number.isNaN(n) ? 0 : n;
}

function classify(session: RuntimeSessionRecord | undefined, nowMs: number): { connection: FleetConnection; ageMs: number | null } {
  if (!session || !session.lastHeartbeatAt) return { connection: 'NEVER_CONNECTED', ageMs: null };
  const lastMs = ts(session.lastHeartbeatAt);
  if (lastMs === 0) return { connection: 'NEVER_CONNECTED', ageMs: null };
  const ageMs = Math.max(0, nowMs - lastMs);
  if (ageMs <= ONLINE_WINDOW_MS) return { connection: 'ONLINE', ageMs };
  if (ageMs <= STALE_WINDOW_MS) return { connection: 'STALE', ageMs };
  return { connection: 'OFFLINE', ageMs };
}

/** Pure: builds the snapshot from plain data. Deterministic for a given `nowMs`. */
export function buildFleetSnapshot(input: FleetInput, nowMs: number = Date.now(), query: FleetQuery = {}): FleetSnapshot {
  const lastCommandByProject = new Map<string, ControlCommand>();
  const queuedByProject = new Map<string, number>();
  const failedByProject = new Map<string, number>();
  for (const cmd of input.commands) {
    const prev = lastCommandByProject.get(cmd.projectId);
    if (!prev || ts(cmd.issuedAt) > ts(prev.issuedAt)) lastCommandByProject.set(cmd.projectId, cmd);
    if (cmd.status === 'QUEUED' || cmd.status === 'DISPATCHED') {
      queuedByProject.set(cmd.projectId, (queuedByProject.get(cmd.projectId) ?? 0) + 1);
    }
    if (cmd.status === 'FAILED') failedByProject.set(cmd.projectId, (failedByProject.get(cmd.projectId) ?? 0) + 1);
  }

  const lastAuditByProject = new Map<string, ProjectAuditEntry>();
  for (const audit of input.audits) {
    const prev = lastAuditByProject.get(audit.projectId);
    if (!prev || ts(audit.timestamp) > ts(prev.timestamp)) lastAuditByProject.set(audit.projectId, audit);
  }

  let projects: FleetProject[] = input.projects.map((p) => {
    const session = input.sessions[p.id] ?? p.runtimeSession;
    const { connection, ageMs } = classify(session, nowMs);
    const plugins = input.plugins[p.id] ?? [];
    const lastCmd = lastCommandByProject.get(p.id);
    const lastAudit = lastAuditByProject.get(p.id);
    const failed = failedByProject.get(p.id) ?? 0;
    const syncStatus = session?.syncStatus ?? p.syncStatus;
    const desired = session?.desiredRevision ?? p.desiredRevisionNumber;
    const applied = session?.appliedRevision ?? p.activeRevisionNumber;

    const attention: FleetAttention[] = [];
    if (connection === 'OFFLINE') attention.push('OFFLINE');
    if (connection === 'NEVER_CONNECTED') attention.push('NEVER_CONNECTED');
    if (connection === 'STALE') attention.push('STALE');
    if (syncStatus === 'OUT_OF_SYNC' || desired > applied) attention.push('OUT_OF_SYNC');
    if (failed > 0) attention.push('FAILED_COMMAND');

    const exceededAudit = input.audits.find((a) => a.projectId === p.id && a.action === 'USAGE_LIMIT_EXCEEDED');
    if (exceededAudit) {
      const resetAudit = input.audits.find(
        (a) => a.projectId === p.id && a.action === 'USAGE_COUNTER_RESET' && ts(a.timestamp) > ts(exceededAudit.timestamp)
      );
      if (!resetAudit) {
        attention.push('USAGE_LIMIT_EXCEEDED');
      }
    }

    attention.sort((a, b) => ATTENTION_ORDER.indexOf(a) - ATTENTION_ORDER.indexOf(b));

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      status: p.status,
      connection,
      syncStatus,
      desiredRevision: desired,
      appliedRevision: applied,
      revisionDrift: Math.max(0, desired - applied),
      lastHeartbeatAt: session?.lastHeartbeatAt ?? null,
      lastSeenSecondsAgo: ageMs === null ? null : Math.round(ageMs / 1000),
      runtime: {
        url: session?.runtimeUrl ?? null,
        uptimeSeconds: session?.metrics?.uptimeSeconds ?? null,
        memoryMb: session?.metrics?.memoryMb ?? null,
        declaredApis: session?.declaredApis?.length ?? 0,
      },
      environments: (input.environments[p.id] ?? []).map((e) => ({ name: e.name, status: e.status, url: e.url })),
      plugins: {
        enabled: plugins.filter((x) => x.enabled).length,
        installed: plugins.filter((x) => x.installed).length,
        enabledNames: plugins.filter((x) => x.enabled).map((x) => x.name),
      },
      commands: {
        queued: queuedByProject.get(p.id) ?? 0,
        failed,
        last: lastCmd ? { action: lastCmd.action, status: lastCmd.status, issuedAt: lastCmd.issuedAt } : null,
      },
      lastActivity: lastAudit
        ? { at: lastAudit.timestamp, action: lastAudit.action, actor: lastAudit.actor, status: lastAudit.status }
        : null,
      attention,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  });

  // Summary reflects the whole fleet, before any filtering.
  const summary: FleetSummary = {
    total: projects.length,
    online: projects.filter((p) => p.connection === 'ONLINE').length,
    stale: projects.filter((p) => p.connection === 'STALE').length,
    offline: projects.filter((p) => p.connection === 'OFFLINE').length,
    neverConnected: projects.filter((p) => p.connection === 'NEVER_CONNECTED').length,
    outOfSync: projects.filter((p) => p.attention.includes('OUT_OF_SYNC')).length,
    needsAttention: projects.filter((p) => p.attention.length > 0).length,
  };

  const needle = query.q?.trim().toLowerCase();
  if (needle) {
    projects = projects.filter(
      (p) => p.name.toLowerCase().includes(needle) || p.slug.toLowerCase().includes(needle) || p.id.toLowerCase().includes(needle),
    );
  }
  if (query.connection) projects = projects.filter((p) => p.connection === query.connection);
  if (query.attentionOnly) projects = projects.filter((p) => p.attention.length > 0);

  // Problems first (most severe flag), then most recently seen, then name.
  projects.sort((a, b) => {
    const sa = a.attention.length ? ATTENTION_ORDER.indexOf(a.attention[0]!) : ATTENTION_ORDER.length;
    const sb = b.attention.length ? ATTENTION_ORDER.indexOf(b.attention[0]!) : ATTENTION_ORDER.length;
    if (sa !== sb) return sa - sb;
    const seenA = a.lastSeenSecondsAgo ?? Number.MAX_SAFE_INTEGER;
    const seenB = b.lastSeenSecondsAgo ?? Number.MAX_SAFE_INTEGER;
    if (seenA !== seenB) return seenA - seenB;
    return a.name.localeCompare(b.name);
  });

  return { generatedAt: new Date(nowMs).toISOString(), summary, projects };
}
