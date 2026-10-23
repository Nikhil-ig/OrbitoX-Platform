'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FleetConnection, FleetProject, FleetSnapshot } from '@orbitox/external-project-engine';
import styles from './fleet.module.css';

const POLL_MS = 10_000;

type ConnectionFilter = 'ALL' | FleetConnection;

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

function dotClass(status: string): string {
  if (status === 'ONLINE') return styles.dotOnline!;
  if (status === 'DEGRADED') return styles.dotStale!;
  return styles.dotOffline!;
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
});

await orbitox.registerRuntime(); // registers this project and starts heartbeats`;

export default function FleetPage() {
  const [snapshot, setSnapshot] = useState<FleetSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [connection, setConnection] = useState<ConnectionFilter>('ALL');
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [syncOnly, setSyncOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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

  // Live updates: poll while the tab is visible, refresh immediately when it returns.
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

  const visible = useMemo<FleetProject[]>(() => {
    if (!snapshot) return [];
    const needle = query.trim().toLowerCase();
    return snapshot.projects.filter((p) => {
      if (connection !== 'ALL' && p.connection !== connection) return false;
      if (attentionOnly && p.attention.length === 0) return false;
      if (syncOnly && !p.attention.includes('OUT_OF_SYNC')) return false;
      if (needle && !`${p.name} ${p.slug} ${p.id}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [snapshot, query, connection, attentionOnly, syncOnly]);

  const s = snapshot?.summary;
  const filtersActive = query.trim() !== '' || connection !== 'ALL' || attentionOnly || syncOnly;
  const resetFilters = () => { setQuery(''); setConnection('ALL'); setAttentionOnly(false); setSyncOnly(false); };

  const cards: Array<{ key: string; label: string; value: number | undefined; tone?: string; apply: () => void; active: boolean }> = [
    { key: 'all', label: 'Projects', value: s?.total, apply: resetFilters, active: !filtersActive },
    { key: 'online', label: 'Online', value: s?.online, tone: styles.good, apply: () => { resetFilters(); setConnection('ONLINE'); }, active: connection === 'ONLINE' },
    { key: 'attn', label: 'Needs attention', value: s?.needsAttention, tone: s && s.needsAttention > 0 ? styles.warn : undefined, apply: () => { resetFilters(); setAttentionOnly(true); }, active: attentionOnly && !syncOnly },
    { key: 'sync', label: 'Out of sync', value: s?.outOfSync, tone: s && s.outOfSync > 0 ? styles.warn : undefined, apply: () => { resetFilters(); setSyncOnly(true); }, active: syncOnly },
    { key: 'off', label: 'Offline', value: s?.offline, tone: s && s.offline > 0 ? styles.bad : undefined, apply: () => { resetFilters(); setConnection('OFFLINE'); }, active: connection === 'OFFLINE' },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Fleet</h1>
          <p className={styles.subtitle}>Every project connected to this control plane, live.</p>
        </div>
        <div className={styles.meta}>
          {snapshot && <span>Updated {new Date(snapshot.generatedAt).toLocaleTimeString()}</span>}
          <button type="button" className={styles.btn} onClick={() => void load()}>Refresh</button>
        </div>
      </header>

      {error && <div className={styles.error} role="alert">{error}</div>}

      <section className={styles.cards} aria-label="Fleet summary" aria-live="polite">
        {cards.map((c) => (
          <button key={c.key} type="button" className={`${styles.card} ${c.active ? styles.cardActive : ''}`} onClick={c.apply}>
            <div className={styles.cardLabel}>{c.label}</div>
            <div className={`${styles.cardValue} ${c.tone ?? ''}`}>{loading && !s ? '–' : c.value ?? 0}</div>
          </button>
        ))}
      </section>

      <div className={styles.filters}>
        <input
          className={styles.input}
          type="search"
          placeholder="Search by name or slug…"
          aria-label="Search projects"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className={styles.select} aria-label="Filter by connection" value={connection} onChange={(e) => setConnection(e.target.value as ConnectionFilter)}>
          <option value="ALL">All connections</option>
          <option value="ONLINE">Online</option>
          <option value="STALE">Stale</option>
          <option value="OFFLINE">Offline</option>
          <option value="NEVER_CONNECTED">Never connected</option>
        </select>
        <label className={styles.check}>
          <input type="checkbox" checked={attentionOnly} onChange={(e) => setAttentionOnly(e.target.checked)} />
          Needs attention only
        </label>
        {filtersActive && (
          <button type="button" className={styles.btn} onClick={resetFilters}>
            Clear filters
          </button>
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
                <th scope="col">Project</th>
                <th scope="col">Connection</th>
                <th scope="col">Revision</th>
                <th scope="col">Last seen</th>
                <th scope="col">Environments</th>
                <th scope="col">Plugins</th>
                <th scope="col">Commands</th>
                <th scope="col">Attention</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => {
                const isOpen = expanded === p.id;
                return (
                  <React.Fragment key={p.id}>
                    <tr
                      className={styles.row}
                      tabIndex={0}
                      aria-expanded={isOpen}
                      onClick={() => setExpanded(isOpen ? null : p.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(isOpen ? null : p.id); }
                      }}
                    >
                      <td>
                        <span className={styles.projectName}>{p.name}</span>
                        <span className={styles.slug}>{p.slug}</span>
                      </td>
                      <td><span className={`${styles.pill} ${pillClass(p.connection)}`}>{CONNECTION_LABEL[p.connection]}</span></td>
                      <td className={styles.num}>
                        {p.appliedRevision} / {p.desiredRevision}
                        {p.revisionDrift > 0 && <span className={styles.warn}> (−{p.revisionDrift})</span>}
                      </td>
                      <td className={styles.num}>{formatAgo(p.lastSeenSecondsAgo)}</td>
                      <td>
                        {p.environments.length === 0 ? <span className={styles.dim}>—</span> : (
                          <span className={styles.envs} title={p.environments.map((e) => `${e.name}: ${e.status}`).join('\n')}>
                            {p.environments.map((e) => <span key={e.name} className={`${styles.dot} ${dotClass(e.status)}`} />)}
                            <span className={styles.dim}>{p.environments.length}</span>
                          </span>
                        )}
                      </td>
                      <td className={styles.num}>{p.plugins.enabled}</td>
                      <td className={styles.num}>
                        {p.commands.queued} queued
                        {p.commands.failed > 0 && <span className={styles.bad}> · {p.commands.failed} failed</span>}
                      </td>
                      <td>
                        {p.attention.length === 0 ? <span className={styles.dim}>—</span> : (
                          <span className={styles.flags}>
                            {p.attention.map((a) => (
                              <span key={a} className={`${styles.flag} ${a === 'STALE' || a === 'OUT_OF_SYNC' ? styles.flagWarn : ''}`}>{ATTENTION_LABEL[a] ?? a}</span>
                            ))}
                          </span>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className={styles.detail}>
                        <td colSpan={8}>
                          <div className={styles.detailGrid}>
                            <div>
                              <div className={styles.detailLabel}>Runtime</div>
                              <div className={`${styles.detailValue} ${styles.mono}`}>{p.runtime.url ?? 'not connected'}</div>
                              <ul className={styles.detailList}>
                                <li>Uptime: {formatUptime(p.runtime.uptimeSeconds)}</li>
                                <li>Memory: {p.runtime.memoryMb === null ? '—' : `${p.runtime.memoryMb} MB`}</li>
                                <li>Declared APIs: {p.runtime.declaredApis}</li>
                              </ul>
                            </div>
                            <div>
                              <div className={styles.detailLabel}>Environments</div>
                              {p.environments.length === 0 ? <div className={styles.dim}>None configured</div> : (
                                <ul className={styles.detailList}>
                                  {p.environments.map((e) => (
                                    <li key={e.name}><span className={`${styles.dot} ${dotClass(e.status)}`} /> {e.name} · {e.status.toLowerCase()}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <div>
                              <div className={styles.detailLabel}>Enabled plugins</div>
                              {p.plugins.enabledNames.length === 0 ? <div className={styles.dim}>None</div> : (
                                <ul className={styles.detailList}>{p.plugins.enabledNames.map((n) => <li key={n}>{n}</li>)}</ul>
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
