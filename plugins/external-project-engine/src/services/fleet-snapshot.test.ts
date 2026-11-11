import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFleetSnapshot, ONLINE_WINDOW_MS, STALE_WINDOW_MS } from './fleet-snapshot.ts';

const NOW = Date.parse('2026-10-23T12:00:00.000Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();

function project(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    slug: id.replace('project_', ''),
    name: `Project ${id}`,
    manifest: {},
    status: 'ACTIVE',
    localPath: '',
    activeRevisionNumber: 5,
    desiredRevisionNumber: 5,
    syncStatus: 'IN_SYNC',
    createdAt: ago(1_000_000),
    updatedAt: ago(1_000),
    ...over,
  } as any;
}

function session(id: string, heartbeatAgoMs: number, over: Record<string, unknown> = {}) {
  return {
    controlSessionId: `s_${id}`,
    projectId: id,
    slug: id,
    runtimeUrl: `http://${id}.example`,
    runtimePort: 4010,
    status: 'HEALTHY',
    registeredAt: ago(9_000_000),
    lastHeartbeatAt: ago(heartbeatAgoMs),
    activeConfigVersion: 1,
    appliedRevision: 5,
    desiredRevision: 5,
    syncStatus: 'IN_SYNC',
    declaredApis: [{}, {}],
    capabilities: [],
    metrics: { pid: 1, uptimeSeconds: 120, memoryMb: 64 },
    ...over,
  } as any;
}

const empty = { environments: {}, plugins: {}, commands: [] as any[], audits: [] as any[] };

test('classifies connection by heartbeat age at the exact window edges', () => {
  const snap = buildFleetSnapshot(
    {
      projects: [project('a'), project('b'), project('c'), project('d'), project('e')],
      sessions: {
        a: session('a', 5_000),
        b: session('b', ONLINE_WINDOW_MS), // boundary: still online
        c: session('c', ONLINE_WINDOW_MS + 1), // just past: stale
        d: session('d', STALE_WINDOW_MS + 1), // offline
        // e: no session
      },
      ...empty,
    },
    NOW,
  );
  const byId = Object.fromEntries(snap.projects.map((p) => [p.id, p.connection]));
  assert.deepEqual(byId, { a: 'ONLINE', b: 'ONLINE', c: 'STALE', d: 'OFFLINE', e: 'NEVER_CONNECTED' });
  assert.equal(snap.summary.total, 5);
  assert.equal(snap.summary.online, 2);
  assert.equal(snap.summary.neverConnected, 1);
});

test('reports real heartbeat age and null when never connected', () => {
  const snap = buildFleetSnapshot({ projects: [project('a'), project('b')], sessions: { a: session('a', 12_000) }, ...empty }, NOW);
  assert.equal(snap.projects.find((p) => p.id === 'a')!.lastSeenSecondsAgo, 12);
  assert.equal(snap.projects.find((p) => p.id === 'b')!.lastSeenSecondsAgo, null);
  assert.equal(snap.projects.find((p) => p.id === 'b')!.lastHeartbeatAt, null);
});

test('flags revision drift and out-of-sync', () => {
  const snap = buildFleetSnapshot(
    { projects: [project('a')], sessions: { a: session('a', 1_000, { desiredRevision: 9, appliedRevision: 5, syncStatus: 'OUT_OF_SYNC' }) }, ...empty },
    NOW,
  );
  const p = snap.projects[0]!;
  assert.equal(p.revisionDrift, 4);
  assert.ok(p.attention.includes('OUT_OF_SYNC'));
  assert.equal(snap.summary.outOfSync, 1);
});

test('counts queued/failed commands and surfaces the most recent one', () => {
  const cmd = (commandId: string, status: string, issuedAgoMs: number, projectId = 'a') =>
    ({ commandId, projectId, action: 'refresh_cache', status, issuedBy: 'admin', issuedAt: ago(issuedAgoMs) }) as any;
  const snap = buildFleetSnapshot(
    {
      projects: [project('a')],
      sessions: { a: session('a', 1_000) },
      ...empty,
      commands: [cmd('1', 'COMPLETED', 9000), cmd('2', 'QUEUED', 3000), cmd('3', 'FAILED', 5000), cmd('4', 'DISPATCHED', 2000), cmd('x', 'FAILED', 1, 'other')],
    },
    NOW,
  );
  const p = snap.projects[0]!;
  assert.equal(p.commands.queued, 2);
  assert.equal(p.commands.failed, 1);
  assert.equal(p.commands.last!.status, 'DISPATCHED');
  assert.ok(p.attention.includes('FAILED_COMMAND'));
});

test('a healthy, fully synced project has no attention flags', () => {
  const snap = buildFleetSnapshot({ projects: [project('a')], sessions: { a: session('a', 1_000) }, ...empty }, NOW);
  assert.deepEqual(snap.projects[0]!.attention, []);
  assert.equal(snap.summary.needsAttention, 0);
});

test('sorts problems first, then most recently seen', () => {
  const snap = buildFleetSnapshot(
    {
      projects: [project('healthy'), project('offline'), project('never'), project('stale')],
      sessions: { healthy: session('healthy', 1_000), offline: session('offline', STALE_WINDOW_MS * 3), stale: session('stale', 60_000) },
      ...empty,
    },
    NOW,
  );
  assert.deepEqual(
    snap.projects.map((p) => p.id),
    ['offline', 'never', 'stale', 'healthy'],
  );
});

test('filters by text and connection but keeps the summary fleet-wide', () => {
  const input = {
    projects: [project('a', { name: 'Alpha Bistro' }), project('b', { name: 'Beta Clinic' })],
    sessions: { a: session('a', 1_000), b: session('b', STALE_WINDOW_MS * 2) },
    ...empty,
  };
  const byText = buildFleetSnapshot(input, NOW, { q: 'bistro' });
  assert.deepEqual(byText.projects.map((p) => p.id), ['a']);
  assert.equal(byText.summary.total, 2, 'summary must not shrink when filtering');

  const byConn = buildFleetSnapshot(input, NOW, { connection: 'OFFLINE' });
  assert.deepEqual(byConn.projects.map((p) => p.id), ['b']);

  const attn = buildFleetSnapshot(input, NOW, { attentionOnly: true });
  assert.deepEqual(attn.projects.map((p) => p.id), ['b']);
});

test('tolerates missing/garbage timestamps and empty fleets', () => {
  const snap = buildFleetSnapshot({ projects: [project('a')], sessions: { a: session('a', 0, { lastHeartbeatAt: 'not-a-date' }) }, ...empty }, NOW);
  assert.equal(snap.projects[0]!.connection, 'NEVER_CONNECTED');
  const none = buildFleetSnapshot({ projects: [], sessions: {}, ...empty }, NOW);
  assert.equal(none.summary.total, 0);
  assert.deepEqual(none.projects, []);
});
