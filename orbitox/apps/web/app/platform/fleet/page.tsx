'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { FleetConnection, FleetProject, FleetSnapshot } from '@orbitox/external-project-engine';
import styles from './fleet.module.css';

const POLL_MS = 10_000;

type ConnectionFilter = 'ALL' | FleetConnection;
type SortField = 'name' | 'connection' | 'revision' | 'lastSeen' | 'envs' | 'plugins' | 'commands' | 'attention';
type SortDirection = 'asc' | 'desc';

const CONNECTION_LABEL: Record<FleetConnection, string> = {
  ONLINE: 'Online',
  STALE: 'Stale',
  OFFLINE: 'Offline',
  NEVER_CONNECTED: 'Never connected',
};

const ATTENTION_LABEL: Record<string, string> = {
  OFFLINE: 'Offline',
  STALE: 'Late heartbeat',
  NEVER_CONNECTED: 'Never connected',
  OUT_OF_SYNC: 'Out of sync',
  FAILED_COMMAND: 'Failed command',
};

function pillClass(c: FleetConnection): string {
  switch (c) {
    case 'ONLINE': return styles.pillOnline!;
    case 'STALE': return styles.pillStale!;
    case 'OFFLINE': return styles.pillOffline!;
    default: return styles.pillNever!;
  }
}

function dotClass(c: FleetConnection): string {
  switch (c) {
    case 'ONLINE': return styles.dotOnline!;
    case 'STALE': return styles.dotStale!;
    case 'OFFLINE': return styles.dotOffline!;
    default: return styles.dotNever!;
  }
}

function formatAgo(seconds: number | null): string {
  if (seconds === null) return '—';
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatUptime(seconds: number | null): string {
  if (seconds === null) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const CONNECT_SNIPPET = `import { ControlClient } from '@orbitox/external-runtime-sdk';
import manifest from './orbitox.manifest.json';

const orbitox = new ControlClient({
  manifest,
  controlPlaneUrl: process.env.ORBITOX_BACKEND_URL,
  apiKey: process.env.ORBITOX_RUNTIME_TOKEN,
});

await orbitox.registerRuntime(); // registers this project and starts heartbeats`;

function FleetSkeleton() {
  return (
    <div className={styles.page} aria-busy="true">
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Fleet</h1>
          <p className={styles.subtitle}>Every project connected to this control plane, live.</p>
        </div>
      </header>
      <div className={styles.tableWrap}>
        <div className={styles.skeletonBox}>
          {[0, 1, 2, 3].map((i) => <div key={i} className={styles.skeleton} />)}
        </div>
      </div>
    </div>
  );
}

function FleetPageContent() {
  const searchParams = useSearchParams();

  // Initialize filters and sort from URL query string
  const initialQuery = searchParams.get('q') || '';
  const initialConn = (searchParams.get('connection')?.toUpperCase() as ConnectionFilter) || 'ALL';
  const initialAttn = searchParams.get('attention') === '1' || searchParams.get('attention') === 'true';
  const initialSync = searchParams.get('sync') === '1' || searchParams.get('sync') === 'true';
  const initialSort = (searchParams.get('sort') as SortField) || 'attention';
  const initialDir = (searchParams.get('dir') as SortDirection) || 'asc';

  const [snapshot, setSnapshot] = useState<FleetSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState(initialQuery);
  const [connection, setConnection] = useState<ConnectionFilter>(initialConn);
  const [attentionOnly, setAttentionOnly] = useState(initialAttn);
  const [syncOnly, setSyncOnly] = useState(initialSync);
  const [sortField, setSortField] = useState<SortField>(initialSort);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialDir);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);
  const [isIssuingBulk, setIsIssuingBulk] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Sync state to URL query string without reloading page
  const syncToUrl = useCallback((q: string, conn: ConnectionFilter, attn: boolean, sync: boolean, sort: SortField, dir: SortDirection) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (conn !== 'ALL') params.set('connection', conn);
    if (attn) params.set('attention', '1');
    if (sync) params.set('sync', '1');
    if (sort !== 'attention') params.set('sort', sort);
    if (dir !== 'asc') params.set('dir', dir);

    const qs = params.toString();
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, []);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch('/api/v1/fleet', { signal: controller.signal, cache: 'no-store' });
      if (!res.ok) {
        throw new Error(res.status === 401 ? 'Not authorised. Sign in with the admin token.' : `Request failed (${res.status})`);
      }
      const body = (await res.json()) as { success: boolean; data?: FleetSnapshot; error?: { message?: string } };
      if (!body.success || !body.data) throw new Error(body.error?.message ?? 'Unexpected response');
      setSnapshot(body.data);
      setError(null);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const tick = () => { if (document.visibilityState === 'visible') void load(); };
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
      abortRef.current?.abort();
    };
  }, [load]);

  // Update query string whenever filters change
  const handleQueryChange = (val: string) => {
    setQuery(val);
    syncToUrl(val, connection, attentionOnly, syncOnly, sortField, sortDirection);
  };
  const handleConnectionChange = (val: ConnectionFilter) => {
    setConnection(val);
    syncToUrl(query, val, attentionOnly, syncOnly, sortField, sortDirection);
  };
  const handleAttentionChange = (val: boolean) => {
    setAttentionOnly(val);
    syncToUrl(query, connection, val, syncOnly, sortField, sortDirection);
  };
  const handleSort = (field: SortField) => {
    let newDir: SortDirection = 'asc';
    if (sortField === field) {
      newDir = sortDirection === 'asc' ? 'desc' : 'asc';
    }
    setSortField(field);
    setSortDirection(newDir);
    syncToUrl(query, connection, attentionOnly, syncOnly, field, newDir);
  };

  const resetFilters = () => {
    setQuery('');
    setConnection('ALL');
    setAttentionOnly(false);
    setSyncOnly(false);
    syncToUrl('', 'ALL', false, false, sortField, sortDirection);
  };

  // Filtered and sorted projects
  const visible = useMemo<FleetProject[]>(() => {
    if (!snapshot) return [];
    const needle = query.trim().toLowerCase();
    const filtered = snapshot.projects.filter((p) => {
      if (connection !== 'ALL' && p.connection !== connection) return false;
      if (attentionOnly && p.attention.length === 0) return false;
      if (syncOnly && !p.attention.includes('OUT_OF_SYNC')) return false;
      if (needle && !`${p.name} ${p.slug} ${p.id}`.toLowerCase().includes(needle)) return false;
      return true;
    });

    const connOrder: Record<FleetConnection, number> = {
      OFFLINE: 0,
      STALE: 1,
      NEVER_CONNECTED: 2,
      ONLINE: 3,
    };

    return filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'connection':
          comparison = (connOrder[a.connection] ?? 9) - (connOrder[b.connection] ?? 9);
          break;
        case 'revision':
          comparison = a.appliedRevision - b.appliedRevision;
          break;
        case 'lastSeen': {
          const sa = a.lastSeenSecondsAgo ?? Number.MAX_SAFE_INTEGER;
          const sb = b.lastSeenSecondsAgo ?? Number.MAX_SAFE_INTEGER;
          comparison = sa - sb;
          break;
        }
        case 'envs':
          comparison = a.environments.length - b.environments.length;
          break;
        case 'plugins':
          comparison = a.plugins.enabled - b.plugins.enabled;
          break;
        case 'commands':
          comparison = a.commands.queued - b.commands.queued;
          break;
        case 'attention':
        default:
          comparison = b.attention.length - a.attention.length;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [snapshot, query, connection, attentionOnly, syncOnly, sortField, sortDirection]);

  // Bulk command execution
  const handleBulkHealthCheck = async (targetIds?: string[]) => {
    const targets = targetIds ?? (selectedIds.size > 0 ? Array.from(selectedIds) : visible.map((p) => p.id));
    if (targets.length === 0) return;

    setIsIssuingBulk(true);
    setBulkStatus(`Dispatching health checks to ${targets.length} project(s)…`);

    let succeeded = 0;
    let failed = 0;

    for (const id of targets) {
      try {
        const res = await fetch(`/api/v1/projects/${id}/commands`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'ISSUE', commandAction: 'run_health_check' }),
        });
        if (res.ok) succeeded++;
        else failed++;
      } catch {
        failed++;
      }
    }

    setIsIssuingBulk(false);
    setSelectedIds(new Set());
    setBulkStatus(`Dispatched health checks: ${succeeded} queued, ${failed} failed.`);
    void load();
    setTimeout(() => setBulkStatus(null), 5000);
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(visible.map((p) => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const s = snapshot?.summary;
  const filtersActive = query.trim() !== '' || connection !== 'ALL' || attentionOnly || syncOnly;

  const cards = [
    { key: 'all', label: 'Total Fleet', value: s?.total, apply: resetFilters, active: !filtersActive },
    { key: 'online', label: 'Online', value: s?.online, tone: styles.good, apply: () => { setConnection('ONLINE'); syncToUrl(query, 'ONLINE', attentionOnly, syncOnly, sortField, sortDirection); }, active: connection === 'ONLINE' },
    { key: 'attn', label: 'Needs Attention', value: s?.needsAttention, tone: s && s.needsAttention > 0 ? styles.warn : undefined, apply: () => { setAttentionOnly(true); syncToUrl(query, connection, true, syncOnly, sortField, sortDirection); }, active: attentionOnly && !syncOnly },
    { key: 'sync', label: 'Out of Sync', value: s?.outOfSync, tone: s && s.outOfSync > 0 ? styles.warn : undefined, apply: () => { setSyncOnly(true); syncToUrl(query, connection, attentionOnly, true, sortField, sortDirection); }, active: syncOnly },
    { key: 'off', label: 'Offline', value: s?.offline, tone: s && s.offline > 0 ? styles.bad : undefined, apply: () => { setConnection('OFFLINE'); syncToUrl(query, 'OFFLINE', attentionOnly, syncOnly, sortField, sortDirection); }, active: connection === 'OFFLINE' },
  ];

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Fleet</h1>
          <p className={styles.subtitle}>Every project connected to this control plane, live.</p>
        </div>
        <div className={styles.meta}>
          {snapshot && <span className={styles.dim}>Updated {new Date(snapshot.generatedAt).toLocaleTimeString()}</span>}
          <button type="button" className={styles.btn} onClick={() => void load()}>
            Refresh
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => void handleBulkHealthCheck()}
            disabled={isIssuingBulk || visible.length === 0}
          >
            Run Health Check on Visible ({visible.length})
          </button>
        </div>
      </header>

      {error && <div className={styles.error} role="alert">{error}</div>}

      {/* Summary Filter Cards */}
      <section className={styles.cards} aria-label="Fleet summary" aria-live="polite">
        {cards.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`${styles.card} ${c.active ? styles.cardActive : ''}`}
            onClick={c.apply}
          >
            <div className={styles.cardLabel}>{c.label}</div>
            <div className={`${styles.cardValue} ${c.tone ?? ''}`}>{loading && !s ? '–' : c.value ?? 0}</div>
          </button>
        ))}
      </section>

      {/* Controls & Filter Bar */}
      <div className={styles.controlsBar}>
        <div className={styles.filters}>
          <input
            className={styles.input}
            type="search"
            placeholder="Search by name, slug or ID…"
            aria-label="Search projects"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
          />
          <select
            className={styles.select}
            aria-label="Filter by connection"
            value={connection}
            onChange={(e) => handleConnectionChange(e.target.value as ConnectionFilter)}
          >
            <option value="ALL">All connections</option>
            <option value="ONLINE">Online</option>
            <option value="STALE">Stale</option>
            <option value="OFFLINE">Offline</option>
            <option value="NEVER_CONNECTED">Never connected</option>
          </select>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={attentionOnly}
              onChange={(e) => handleAttentionChange(e.target.checked)}
            />
            Needs attention only
          </label>
          {filtersActive && (
            <button type="button" className={styles.btn} onClick={resetFilters}>
              Clear filters
            </button>
          )}
        </div>

        {selectedIds.size > 0 && (
          <div className={styles.bulkBar} role="status">
            <div className={styles.bulkInfo}>
              <span>✓ {selectedIds.size} project(s) selected</span>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => void handleBulkHealthCheck(Array.from(selectedIds))}
                disabled={isIssuingBulk}
              >
                Run Health Check on Selected
              </button>
            </div>
            <button type="button" className={styles.btn} onClick={() => setSelectedIds(new Set())}>
              Deselect All
            </button>
          </div>
        )}

        {bulkStatus && (
          <div className={`${styles.banner} ${styles.bannerSuccess}`} role="alert">
            <span>{bulkStatus}</span>
            <button type="button" className={styles.btn} onClick={() => setBulkStatus(null)}>✕</button>
          </div>
        )}
      </div>

      {loading && !snapshot ? (
        <div className={styles.tableWrap} aria-busy="true">
          <div className={styles.skeletonBox}>
            {[0, 1, 2, 3].map((i) => <div key={i} className={styles.skeleton} />)}
          </div>
        </div>
      ) : snapshot && snapshot.summary.total === 0 ? (
        <section className={styles.state}>
          <h2 className={styles.stateTitle}>No projects connected yet</h2>
          <p className={styles.stateText}>
            Add the SDK to any app and register it. It will appear here within seconds and report its health, revision and activity.
          </p>
          <pre className={styles.code}>{CONNECT_SNIPPET}</pre>
        </section>
      ) : visible.length === 0 ? (
        <section className={styles.state}>
          <h2 className={styles.stateTitle}>No projects match these filters</h2>
          <p className={styles.stateText}>Try a different search or clear the filters.</p>
        </section>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col" style={{ width: '36px' }}>
                  <input
                    type="checkbox"
                    aria-label="Select all visible projects"
                    checked={visible.length > 0 && selectedIds.size === visible.length}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                  />
                </th>
                <th scope="col" aria-sort={sortField === 'name' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className={styles.sortBtn} onClick={() => handleSort('name')}>
                    Project {sortIndicator('name')}
                  </button>
                </th>
                <th scope="col" aria-sort={sortField === 'connection' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className={styles.sortBtn} onClick={() => handleSort('connection')}>
                    Connection {sortIndicator('connection')}
                  </button>
                </th>
                <th scope="col" aria-sort={sortField === 'revision' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className={styles.sortBtn} onClick={() => handleSort('revision')}>
                    Revision {sortIndicator('revision')}
                  </button>
                </th>
                <th scope="col" aria-sort={sortField === 'lastSeen' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className={styles.sortBtn} onClick={() => handleSort('lastSeen')}>
                    Last seen {sortIndicator('lastSeen')}
                  </button>
                </th>
                <th scope="col" aria-sort={sortField === 'envs' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className={styles.sortBtn} onClick={() => handleSort('envs')}>
                    Envs {sortIndicator('envs')}
                  </button>
                </th>
                <th scope="col" aria-sort={sortField === 'plugins' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className={styles.sortBtn} onClick={() => handleSort('plugins')}>
                    Plugins {sortIndicator('plugins')}
                  </button>
                </th>
                <th scope="col" aria-sort={sortField === 'commands' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className={styles.sortBtn} onClick={() => handleSort('commands')}>
                    Commands {sortIndicator('commands')}
                  </button>
                </th>
                <th scope="col" aria-sort={sortField === 'attention' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className={styles.sortBtn} onClick={() => handleSort('attention')}>
                    Attention {sortIndicator('attention')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => {
                const isOpen = expanded === p.id;
                const isChecked = selectedIds.has(p.id);
                return (
                  <React.Fragment key={p.id}>
                    <tr
                      className={styles.row}
                      tabIndex={0}
                      aria-expanded={isOpen}
                      onClick={() => setExpanded(isOpen ? null : p.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setExpanded(isOpen ? null : p.id);
                        }
                      }}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${p.name}`}
                          checked={isChecked}
                          onChange={() => toggleSelectOne(p.id)}
                        />
                      </td>
                      <td data-label="Project">
                        <Link
                          href={`/platform/projects/${p.id}`}
                          className={styles.projectLink}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {p.name}
                        </Link>
                        <span className={styles.slug}>{p.slug}</span>
                      </td>
                      <td data-label="Connection">
                        <span className={`${styles.pill} ${pillClass(p.connection)}`}>
                          <span className={`${styles.dot} ${dotClass(p.connection)}`} />
                          {CONNECTION_LABEL[p.connection]}
                        </span>
                      </td>
                      <td data-label="Revision" className={styles.num}>
                        {p.appliedRevision} / {p.desiredRevision}
                        {p.revisionDrift > 0 && <span className={styles.warn}> (−{p.revisionDrift})</span>}
                      </td>
                      <td data-label="Last seen" className={styles.num}>{formatAgo(p.lastSeenSecondsAgo)}</td>
                      <td data-label="Envs">
                        {p.environments.length === 0 ? <span className={styles.dim}>—</span> : (
                          <span className={styles.envs} title={p.environments.map((e) => `${e.name}: ${e.status}`).join('\n')}>
                            {p.environments.map((e) => (
                              <span
                                key={e.name}
                                className={`${styles.dot} ${e.status === 'ONLINE' ? styles.dotOnline : styles.dotOffline}`}
                              />
                            ))}
                            <span className={styles.dim}>{p.environments.length}</span>
                          </span>
                        )}
                      </td>
                      <td data-label="Plugins" className={styles.num}>{p.plugins.enabled}</td>
                      <td data-label="Commands" className={styles.num}>
                        {p.commands.queued} queued
                        {p.commands.failed > 0 && <span className={styles.bad}> · {p.commands.failed} failed</span>}
                      </td>
                      <td data-label="Attention">
                        {p.attention.length === 0 ? <span className={styles.dim}>—</span> : (
                          <span className={styles.flags}>
                            {p.attention.map((a) => (
                              <span
                                key={a}
                                className={`${styles.flag} ${a === 'STALE' || a === 'OUT_OF_SYNC' ? styles.flagWarn : ''}`}
                              >
                                {ATTENTION_LABEL[a] ?? a}
                              </span>
                            ))}
                          </span>
                        )}
                      </td>
                    </tr>

                    {isOpen && (
                      <tr className={styles.detail}>
                        <td colSpan={9}>
                          <div className={styles.detailGrid}>
                            <div>
                              <div className={styles.detailLabel}>Runtime</div>
                              <div className={`${styles.detailValue} ${styles.mono}`}>{p.runtime.url ?? 'not connected'}</div>
                              <ul className={styles.detailList}>
                                <li>Uptime: {formatUptime(p.runtime.uptimeSeconds)}</li>
                                <li>Memory: {p.runtime.memoryMb === null ? '—' : `${p.runtime.memoryMb} MB`}</li>
                                <li>Declared APIs: {p.runtime.declaredApis}</li>
                              </ul>
                              <div style={{ marginTop: '10px' }}>
                                <Link
                                  href={`/platform/projects/${p.id}`}
                                  className={`${styles.btn} ${styles.btnPrimary}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Open Project Detail →
                                </Link>
                              </div>
                            </div>
                            <div>
                              <div className={styles.detailLabel}>Environments</div>
                              {p.environments.length === 0 ? <div className={styles.dim}>None configured</div> : (
                                <ul className={styles.detailList}>
                                  {p.environments.map((e) => (
                                    <li key={e.name}>
                                      <span className={`${styles.dot} ${e.status === 'ONLINE' ? styles.dotOnline : styles.dotOffline}`} />{' '}
                                      {e.name} · {e.status.toLowerCase()}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <div>
                              <div className={styles.detailLabel}>Enabled plugins</div>
                              {p.plugins.enabledNames.length === 0 ? <div className={styles.dim}>None</div> : (
                                <ul className={styles.detailList}>
                                  {p.plugins.enabledNames.map((n) => <li key={n}>{n}</li>)}
                                </ul>
                              )}
                            </div>
                            <div>
                              <div className={styles.detailLabel}>Recent activity</div>
                              <ul className={styles.detailList}>
                                <li>
                                  Last command:{' '}
                                  {p.commands.last ? `${p.commands.last.action} (${p.commands.last.status.toLowerCase()})` : '—'}
                                </li>
                                <li>
                                  Last audit event:{' '}
                                  {p.lastActivity ? `${p.lastActivity.action} by ${p.lastActivity.actor}` : '—'}
                                </li>
                                <li className={styles.mono}>ID: {p.id}</li>
                              </ul>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function FleetPage() {
  return (
    <React.Suspense fallback={<FleetSkeleton />}>
      <FleetPageContent />
    </React.Suspense>
  );
}
