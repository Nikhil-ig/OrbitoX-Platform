'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { FleetConnection, FleetAttention, FleetProject } from '@orbitox/external-project-engine';
import styles from './overview.module.css';

const POLL_MS = 10_000;

interface OverviewSummary {
  total: number;
  online: number;
  stale: number;
  offline: number;
  neverConnected: number;
  outOfSync: number;
  needsAttention: number;
}

interface AuditActivity {
  id: string;
  projectId: string;
  projectName: string;
  projectSlug: string;
  timestamp: string;
  actor: string;
  action: string;
  status: string;
  details?: any;
}

interface OverviewData {
  summary: OverviewSummary;
  needsAttention: FleetProject[];
  recentActivity: AuditActivity[];
  generatedAt: string;
}

const ATTENTION_META: Record<FleetAttention, { label: string; tone: string }> = {
  OFFLINE: { label: 'Offline', tone: styles.tagDanger! },
  FAILED_COMMAND: { label: 'Failed command', tone: styles.tagDanger! },
  OUT_OF_SYNC: { label: 'Out of sync', tone: styles.tagWarning! },
  STALE: { label: 'Late heartbeat', tone: styles.tagWarning! },
  NEVER_CONNECTED: { label: 'Never connected', tone: styles.tag! },
};

function formatAgo(timestamp: string | null | undefined): string {
  if (!timestamp) return '—';
  const ms = Date.parse(timestamp);
  if (Number.isNaN(ms)) return '—';
  const diff = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function connectionDot(c: FleetConnection) {
  switch (c) {
    case 'ONLINE': return styles.dotOnline!;
    case 'STALE': return styles.dotStale!;
    case 'OFFLINE': return styles.dotOffline!;
    default: return styles.dotNever!;
  }
}

function connectionPill(c: FleetConnection) {
  switch (c) {
    case 'ONLINE': return styles.pillOnline!;
    case 'STALE': return styles.pillStale!;
    case 'OFFLINE': return styles.pillOffline!;
    default: return styles.pillNever!;
  }
}

const CONNECTION_LABEL: Record<FleetConnection, string> = {
  ONLINE: 'Online',
  STALE: 'Stale',
  OFFLINE: 'Offline',
  NEVER_CONNECTED: 'Never connected',
};

export default function PlatformOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch('/api/v1/overview', { signal: controller.signal, cache: 'no-store' });
      if (!res.ok) {
        throw new Error(res.status === 401 ? 'Not authorised. Sign in with the admin token.' : `Request failed (${res.status})`);
      }
      const body = (await res.json()) as { success: boolean; data?: OverviewData; error?: { message?: string } };
      if (!body.success || !body.data) throw new Error(body.error?.message ?? 'Unexpected response');
      setData(body.data);
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
    const tick = () => {
      if (document.visibilityState === 'visible') void load();
    };
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
      abortRef.current?.abort();
    };
  }, [load]);

  const s = data?.summary;

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Overview</h1>
          <p className={styles.subtitle}>Unified control plane health, operational alerts, and audit trail.</p>
        </div>
        <div className={styles.actions}>
          {data && <span className={styles.metaText}>Updated {new Date(data.generatedAt).toLocaleTimeString()}</span>}
          <button type="button" className={styles.btn} onClick={() => void load()}>
            Refresh
          </button>
          <Link href="/platform/connect" className={`${styles.btn} ${styles.btnPrimary}`}>
            + Connect Project
          </Link>
        </div>
      </header>

      {error && <div className={styles.tagDanger} role="alert" style={{ padding: '12px 16px', borderRadius: '8px' }}>{error}</div>}

      {/* Fleet Summary Cards */}
      <section className={styles.cards} aria-label="Fleet status summary" aria-live="polite">
        <Link href="/platform/fleet" className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Total Fleet</span>
            <span className={`${styles.dot} ${styles.dotOnline}`} />
          </div>
          <div className={styles.cardValue}>{loading && !s ? '–' : s?.total ?? 0}</div>
        </Link>

        <Link href="/platform/fleet?connection=ONLINE" className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Online</span>
            <span className={`${styles.dot} ${styles.dotOnline}`} />
          </div>
          <div className={`${styles.cardValue} ${styles.good}`}>{loading && !s ? '–' : s?.online ?? 0}</div>
        </Link>

        <Link href="/platform/fleet?attention=1" className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Needs Attention</span>
            <span className={`${styles.dot} ${styles.dotStale}`} />
          </div>
          <div className={`${styles.cardValue} ${s && s.needsAttention > 0 ? styles.warn : ''}`}>
            {loading && !s ? '–' : s?.needsAttention ?? 0}
          </div>
        </Link>

        <Link href="/platform/fleet?connection=STALE" className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Stale (Late)</span>
            <span className={`${styles.dot} ${styles.dotStale}`} />
          </div>
          <div className={`${styles.cardValue} ${s && s.stale > 0 ? styles.warn : ''}`}>
            {loading && !s ? '–' : s?.stale ?? 0}
          </div>
        </Link>

        <Link href="/platform/fleet?connection=OFFLINE" className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Offline</span>
            <span className={`${styles.dot} ${styles.dotOffline}`} />
          </div>
          <div className={`${styles.cardValue} ${s && s.offline > 0 ? styles.bad : ''}`}>
            {loading && !s ? '–' : s?.offline ?? 0}
          </div>
        </Link>

        <Link href="/platform/fleet?connection=NEVER_CONNECTED" className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Never Connected</span>
            <span className={`${styles.dot} ${styles.dotNever}`} />
          </div>
          <div className={styles.cardValue}>{loading && !s ? '–' : s?.neverConnected ?? 0}</div>
        </Link>
      </section>

      {/* Needs Attention Section */}
      <section className={styles.section} aria-labelledby="attention-heading">
        <div className={styles.sectionHeader}>
          <h2 id="attention-heading" className={styles.sectionTitle}>
            <span>⚠️ Needs Attention</span>
            {data && data.needsAttention.length > 0 && (
              <span className={`${styles.pill} ${styles.pillOffline}`}>{data.needsAttention.length} issues</span>
            )}
          </h2>
          <Link href="/platform/fleet?attention=1" className={styles.btn}>
            View in Fleet →
          </Link>
        </div>

        {loading && !data ? (
          <div className={styles.tableWrap} aria-busy="true">
            <div className={styles.skeletonBox}>
              {[0, 1, 2].map((i) => <div key={i} className={styles.skeleton} />)}
            </div>
          </div>
        ) : data && data.needsAttention.length === 0 ? (
          <div className={styles.emptyCard}>
            <h3 className={styles.emptyTitle}>All systems operational</h3>
            <p className={styles.emptyDesc}>No projects are reporting errors, drift, or late heartbeats.</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Project</th>
                  <th scope="col">Status</th>
                  <th scope="col">Issues</th>
                  <th scope="col">Revision Drift</th>
                  <th scope="col">Last Heartbeat</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {data?.needsAttention.map((p) => (
                  <tr key={p.id}>
                    <td data-label="Project">
                      <Link href={`/platform/projects/${p.id}`} className={styles.projectLink}>
                        {p.name}
                      </Link>
                      <span className={styles.slug}>{p.slug}</span>
                    </td>
                    <td data-label="Status">
                      <span className={`${styles.pill} ${connectionPill(p.connection)}`}>
                        <span className={`${styles.dot} ${connectionDot(p.connection)}`} />
                        {CONNECTION_LABEL[p.connection]}
                      </span>
                    </td>
                    <td data-label="Issues">
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {p.attention.map((att) => {
                          const meta = ATTENTION_META[att] ?? { label: att, tone: styles.tag! };
                          return (
                            <span key={att} className={`${styles.tag} ${meta.tone}`}>
                              {meta.label}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td data-label="Revision Drift" className={styles.num}>
                      {p.appliedRevision} / {p.desiredRevision}
                      {p.revisionDrift > 0 && <span className={styles.warn}> (−{p.revisionDrift})</span>}
                    </td>
                    <td data-label="Last Heartbeat" className={styles.num}>
                      {formatAgo(p.lastHeartbeatAt)}
                    </td>
                    <td data-label="Action">
                      <Link href={`/platform/projects/${p.id}`} className={styles.btn}>
                        Inspect →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent Activity Feed */}
      <section className={styles.section} aria-labelledby="activity-heading">
        <div className={styles.sectionHeader}>
          <h2 id="activity-heading" className={styles.sectionTitle}>
            <span>📋 Recent Fleet Activity</span>
          </h2>
          <Link href="/platform/audit" className={styles.btn}>
            Full Audit Trail →
          </Link>
        </div>

        {loading && !data ? (
          <div className={styles.tableWrap} aria-busy="true">
            <div className={styles.skeletonBox}>
              {[0, 1, 2, 3].map((i) => <div key={i} className={styles.skeleton} />)}
            </div>
          </div>
        ) : data && data.recentActivity.length === 0 ? (
          <div className={styles.emptyCard}>
            <h3 className={styles.emptyTitle}>No activity recorded yet</h3>
            <p className={styles.emptyDesc}>Audit events will appear here as runtimes connect and execute commands.</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">Project</th>
                  <th scope="col">Action</th>
                  <th scope="col">Actor</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.recentActivity.map((act) => (
                  <tr key={act.id}>
                    <td data-label="Time" className={styles.num} title={new Date(act.timestamp).toLocaleString()}>
                      {formatAgo(act.timestamp)}
                    </td>
                    <td data-label="Project">
                      <Link href={`/platform/projects/${act.projectId}`} className={styles.projectLink}>
                        {act.projectName}
                      </Link>
                    </td>
                    <td data-label="Action">
                      <span className={styles.tag}>{act.action}</span>
                    </td>
                    <td data-label="Actor" style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                      {act.actor}
                    </td>
                    <td data-label="Status">
                      <span
                        className={`${styles.tag} ${
                          act.status === 'SUCCESS' || act.status === 'COMPLETED'
                            ? styles.tagSuccess
                            : act.status === 'FAILED'
                            ? styles.tagDanger
                            : styles.tag
                        }`}
                      >
                        {act.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
