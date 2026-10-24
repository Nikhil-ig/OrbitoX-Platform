'use client';

import React, { useCallback, useEffect, useRef, useState, use } from 'react';
import Link from 'next/link';
import type { FleetConnection } from '@orbitox/external-project-engine';
import styles from './project-detail.module.css';

interface ProjectDetailData {
  id: string;
  name: string;
  slug: string;
  status: string;
  connection: FleetConnection;
  lastSeenSecondsAgo: number | null;
  lastHeartbeatAt: string | null;
  registeredAt: string | null;
  desiredRevision: number;
  appliedRevision: number;
  revisionDrift: number;
  syncStatus: string;
  runtime: {
    url: string | null;
    port: number | null;
    version: string;
    uptimeSeconds: number | null;
    memoryMb: number | null;
    pid: number | null;
    declaredApis: string[];
    capabilities: string[];
  };
  manifest: any;
  environments: Array<{ name: string; status: string; url: string }>;
  plugins: Array<{ name: string; enabled: boolean; installed: boolean }>;
  revisions: Array<{ revisionId: string; revisionNumber: number; timestamp: string }>;
  commandsCount: { total: number; queued: number; failed: number };
  lastActivity: { timestamp: string; action: string; actor: string; status: string } | null;
  attention: string[];
}

interface CommandItem {
  commandId: string;
  action: string;
  status: string;
  issuedAt: string;
  completedAt?: string;
  issuer: string;
  result?: any;
  error?: string;
}

interface ActivityItem {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  status: string;
  details?: any;
}

const CONNECTION_LABEL: Record<FleetConnection, string> = {
  ONLINE: 'Online',
  STALE: 'Stale',
  OFFLINE: 'Offline',
  NEVER_CONNECTED: 'Never connected',
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

function formatAgo(timestampOrSeconds: string | number | null): string {
  if (timestampOrSeconds === null) return '—';
  let diff = 0;
  if (typeof timestampOrSeconds === 'number') {
    diff = timestampOrSeconds;
  } else {
    const ms = Date.parse(timestampOrSeconds);
    if (Number.isNaN(ms)) return '—';
    diff = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  }
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatUptime(seconds: number | null): string {
  if (seconds === null) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.projectId;

  const [project, setProject] = useState<ProjectDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'commands' | 'activity' | 'config' | 'billing'>('overview');

  // Billing state
  const [billingPlans, setBillingPlans] = useState<any[]>([]);
  const [currentPlanRefs, setCurrentPlanRefs] = useState<string[]>([]);
  const [entitlements, setEntitlements] = useState<Record<string, { limit: number; used: number; enforced: boolean }>>({});
  const [selectedQuotePlan, setSelectedQuotePlan] = useState<string>('plan_restaurant_growth');
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [customDiscount, setCustomDiscount] = useState<number>(0);
  const [computedQuote, setComputedQuote] = useState<any | null>(null);
  const [computingQuote, setComputingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Commands state
  const [commands, setCommands] = useState<CommandItem[]>([]);
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);
  const [isIssuing, setIsIssuing] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);

  // Activity state
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotalPages, setActivityTotalPages] = useState(1);
  const [activityTotal, setActivityTotal] = useState(0);

  // Copy feedback
  const [copiedManifest, setCopiedManifest] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const loadProject = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch(`/api/v1/projects/${projectId}`, { signal: controller.signal, cache: 'no-store' });
      if (!res.ok) {
        throw new Error(res.status === 404 ? 'Project not found.' : `Request failed (${res.status})`);
      }
      const body = await res.json();
      if (!body.success || !body.data) throw new Error(body.error?.message ?? 'Unexpected response');
      setProject(body.data);
      setError(null);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadCommands = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/commands`, { cache: 'no-store' });
      const body = await res.json();
      if (body.success && Array.isArray(body.commands)) {
        setCommands(body.commands);
      }
    } catch {}
  }, [projectId]);

  const loadActivity = useCallback(async (page: number) => {
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/activity?page=${page}&limit=12`, { cache: 'no-store' });
      const body = await res.json();
      if (body.success && body.data) {
        setActivities(body.data.items || []);
        setActivityPage(body.data.pagination.page);
        setActivityTotalPages(body.data.pagination.totalPages);
        setActivityTotal(body.data.pagination.total);
      }
    } catch {}
  }, [projectId]);

  const loadBilling = useCallback(async () => {
    try {
      const [plansRes, entRes] = await Promise.all([
        fetch(`/api/v1/projects/${projectId}/plans`, { cache: 'no-store' }),
        fetch(`/api/v1/projects/${projectId}/entitlements`, { cache: 'no-store' }),
      ]);
      const plansData = await plansRes.json();
      if (plansData.success) {
        setBillingPlans(plansData.availablePlans || []);
        setCurrentPlanRefs(plansData.currentPlanReferences || []);
        if (plansData.availablePlans?.length > 0) {
          setSelectedQuotePlan((prev) => prev || plansData.availablePlans[0].id);
        }
      }
      const entData = await entRes.json();
      if (entData.success && entData.entitlements) {
        setEntitlements(entData.entitlements);
      }
    } catch {}
  }, [projectId]);

  useEffect(() => {
    void loadProject();
    void loadCommands();
    void loadActivity(activityPage);
    void loadBilling();

    const tick = () => {
      if (document.visibilityState === 'visible') {
        void loadProject();
        void loadCommands();
        void loadBilling();
      }
    };
    const id = window.setInterval(tick, 5000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
      abortRef.current?.abort();
    };
  }, [loadProject, loadCommands, loadActivity, loadBilling, activityPage]);

  const handleComputeQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setComputingQuote(true);
    setQuoteError(null);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/quotes/compute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedQuotePlan,
          addons: selectedAddons,
          customDiscountPercent: Number(customDiscount) || 0,
        }),
      });
      const data = await res.json();
      if (data.success && data.quote) {
        setComputedQuote(data.quote);
      } else {
        setQuoteError(data.error || 'Failed to compute quote');
      }
    } catch (e: any) {
      setQuoteError(e.message);
    } finally {
      setComputingQuote(false);
    }
  };

  const handleToggleAddon = (addonId: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  };

  // Command execution
  const handleIssueCommand = async (commandAction: string, parameters = {}) => {
    setIsIssuing(true);
    setCommandFeedback(null);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/commands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ISSUE', commandAction, parameters }),
      });
      const body = await res.json();
      if (body.success) {
        setCommandFeedback(`Command "${commandAction}" issued (ID: ${body.command?.commandId}).`);
        void loadCommands();
        void loadProject();
      } else {
        setCommandFeedback(`Failed: ${body.error?.message || body.error}`);
      }
    } catch (e: any) {
      setCommandFeedback(`Error: ${e.message}`);
    } finally {
      setIsIssuing(false);
      setShowRestartModal(false);
      setTimeout(() => setCommandFeedback(null), 6000);
    }
  };

  const handleCopyManifest = () => {
    if (!project?.manifest) return;
    navigator.clipboard.writeText(JSON.stringify(project.manifest, null, 2));
    setCopiedManifest(true);
    setTimeout(() => setCopiedManifest(false), 2000);
  };

  if (loading && !project) {
    return (
      <div className={styles.page} aria-busy="true">
        <Link href="/platform/fleet" className={styles.backLink}>← Back to Fleet</Link>
        <div className={styles.card} style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--ui-text-muted)', fontSize: '14px' }}>Loading project details…</div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className={styles.page}>
        <Link href="/platform/fleet" className={styles.backLink}>← Back to Fleet</Link>
        <div className={styles.card}>
          <h2 style={{ margin: 0, color: 'var(--ui-danger)' }}>Failed to load project</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--ui-text-secondary)' }}>{error ?? 'Project not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Back Link */}
      <Link href="/platform/fleet" className={styles.backLink}>
        ← Back to Fleet
      </Link>

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{project.name}</h1>
            <span className={`${styles.pill} ${pillClass(project.connection)}`}>
              <span className={`${styles.dot} ${dotClass(project.connection)}`} />
              {CONNECTION_LABEL[project.connection]}
            </span>
            {project.revisionDrift > 0 && (
              <span className={`${styles.tag} ${styles.tagWarning}`}>
                Drift: −{project.revisionDrift} revs
              </span>
            )}
          </div>
          <div className={styles.subRow}>
            <span className={styles.mono}>Slug: {project.slug}</span>
            <span>·</span>
            <span className={styles.mono}>ID: {project.id}</span>
            <span>·</span>
            <span>
              Heartbeat: {project.lastHeartbeatAt ? formatAgo(project.lastHeartbeatAt) : 'never'}
            </span>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btn}
            onClick={() => void handleIssueCommand('run_health_check')}
            disabled={isIssuing}
          >
            Run Health Check
          </button>
          <button
            type="button"
            className={styles.btn}
            onClick={() => void handleIssueCommand('refresh_cache')}
            disabled={isIssuing}
          >
            Refresh Cache
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnDanger}`}
            onClick={() => setShowRestartModal(true)}
            disabled={isIssuing}
          >
            Restart Runtime…
          </button>
        </div>
      </header>

      {commandFeedback && (
        <div className={`${styles.tag} ${styles.tagSuccess}`} style={{ padding: '10px 14px', borderRadius: '8px' }} role="status">
          {commandFeedback}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className={styles.tabsBar} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'overview'}
          className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'commands'}
          className={`${styles.tabBtn} ${activeTab === 'commands' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('commands')}
        >
          Commands ({commands.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'activity'}
          className={`${styles.tabBtn} ${activeTab === 'activity' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          Activity ({activityTotal})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'config'}
          className={`${styles.tabBtn} ${activeTab === 'config' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('config')}
        >
          Config & Manifest
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'billing'}
          className={`${styles.tabBtn} ${activeTab === 'billing' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('billing')}
        >
          Billing & Quotas
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className={styles.grid3}>
            {/* Revision Drift Card */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>Configuration Revision</div>
              <div className={styles.metricValue}>
                {project.appliedRevision} <span style={{ fontSize: '18px', color: 'var(--ui-text-muted)' }}>/ {project.desiredRevision}</span>
              </div>
              <div className={styles.infoList}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Applied</span>
                  <span className={styles.infoVal}>rev {project.appliedRevision}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Desired</span>
                  <span className={styles.infoVal}>rev {project.desiredRevision}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Sync Status</span>
                  <span className={styles.infoVal}>
                    <span className={`${styles.tag} ${project.revisionDrift > 0 ? styles.tagWarning : styles.tagSuccess}`}>
                      {project.syncStatus}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Runtime Telemetry Card */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>Runtime Health</div>
              <div className={styles.metricValue}>
                {project.connection === 'ONLINE' ? '100%' : project.connection === 'STALE' ? 'Degraded' : 'Offline'}
              </div>
              <div className={styles.infoList}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Runtime URL</span>
                  <span className={`${styles.infoVal} ${styles.mono}`}>{project.runtime.url ?? 'Not connected'}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Uptime</span>
                  <span className={styles.infoVal}>{formatUptime(project.runtime.uptimeSeconds)}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Memory Usage</span>
                  <span className={styles.infoVal}>{project.runtime.memoryMb !== null ? `${project.runtime.memoryMb} MB` : '—'}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Process PID</span>
                  <span className={`${styles.infoVal} ${styles.mono}`}>{project.runtime.pid ?? '—'}</span>
                </div>
              </div>
            </div>

            {/* App Metadata Card */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>Application Spec</div>
              <div className={styles.metricValue}>v{project.runtime.version}</div>
              <div className={styles.infoList}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Declared APIs</span>
                  <span className={styles.infoVal}>{project.runtime.declaredApis.length} endpoints</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Capabilities</span>
                  <span className={styles.infoVal}>{project.runtime.capabilities.length} active</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Registered At</span>
                  <span className={styles.infoVal}>{project.registeredAt ? new Date(project.registeredAt).toLocaleDateString() : '—'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.grid2}>
            {/* Capabilities Card */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>Declared Capabilities</div>
              {project.runtime.capabilities.length === 0 ? (
                <div style={{ color: 'var(--ui-text-muted)', fontSize: '13px' }}>No explicit capabilities declared by runtime.</div>
              ) : (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {project.runtime.capabilities.map((cap) => (
                    <span key={cap} className={styles.tag}>
                      {cap}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Environments Card */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>Environments</div>
              {project.environments.length === 0 ? (
                <div style={{ color: 'var(--ui-text-muted)', fontSize: '13px' }}>No separate environments configured.</div>
              ) : (
                <div className={styles.infoList}>
                  {project.environments.map((env) => (
                    <div key={env.name} className={styles.infoRow}>
                      <span className={styles.infoLabel}>
                        <span className={`${styles.dot} ${env.status === 'ONLINE' ? styles.dotOnline : styles.dotOffline}`} style={{ marginRight: '6px' }} />
                        {env.name}
                      </span>
                      <span className={`${styles.infoVal} ${styles.mono}`}>{env.url}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Enabled Plugins */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Enabled Plugins ({project.plugins.filter((p) => p.enabled).length})</div>
            {project.plugins.length === 0 ? (
              <div style={{ color: 'var(--ui-text-muted)', fontSize: '13px' }}>No plugins configured.</div>
            ) : (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {project.plugins.map((pl) => (
                  <span
                    key={pl.name}
                    className={`${styles.tag} ${pl.enabled ? styles.tagSuccess : ''}`}
                  >
                    {pl.name} {pl.enabled ? '✓' : '(disabled)'}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Commands */}
      {activeTab === 'commands' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '14px', color: 'var(--ui-text-secondary)' }}>
              Dispatch real commands to this runtime. The SDK polls and executes them automatically.
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={styles.btn}
                onClick={() => void handleIssueCommand('run_health_check')}
                disabled={isIssuing}
              >
                + Health Check
              </button>
              <button
                type="button"
                className={styles.btn}
                onClick={() => void handleIssueCommand('refresh_cache')}
                disabled={isIssuing}
              >
                + Refresh Cache
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnDanger}`}
                onClick={() => setShowRestartModal(true)}
                disabled={isIssuing}
              >
                + Restart Runtime…
              </button>
            </div>
          </div>

          {commands.length === 0 ? (
            <div className={styles.card} style={{ textAlign: 'center', padding: '36px' }}>
              <h3 style={{ margin: 0, color: 'var(--ui-text-primary)' }}>No commands issued yet</h3>
              <p style={{ margin: '6px 0 0', color: 'var(--ui-text-muted)', fontSize: '13px' }}>
                Issue a command using the buttons above to test execution and acknowledge loops.
              </p>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Command ID</th>
                    <th scope="col">Action</th>
                    <th scope="col">Status</th>
                    <th scope="col">Issued</th>
                    <th scope="col">Completed</th>
                    <th scope="col">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {commands.map((cmd) => (
                    <tr key={cmd.commandId}>
                      <td data-label="Command ID" className={styles.mono}>{cmd.commandId}</td>
                      <td data-label="Action">
                        <span className={styles.tag}>{cmd.action}</span>
                      </td>
                      <td data-label="Status">
                        <span
                          className={`${styles.tag} ${
                            cmd.status === 'COMPLETED'
                              ? styles.tagSuccess
                              : cmd.status === 'FAILED'
                              ? styles.tagDanger
                              : styles.tagWarning
                          }`}
                        >
                          {cmd.status}
                        </span>
                      </td>
                      <td data-label="Issued" className={styles.mono}>{formatAgo(cmd.issuedAt)}</td>
                      <td data-label="Completed" className={styles.mono}>
                        {cmd.completedAt ? formatAgo(cmd.completedAt) : '—'}
                      </td>
                      <td data-label="Result" className={styles.mono}>
                        {cmd.error ? (
                          <span style={{ color: 'var(--ui-danger)' }}>{cmd.error}</span>
                        ) : cmd.result ? (
                          <span style={{ color: 'var(--ui-success)' }}>
                            {JSON.stringify(cmd.result).slice(0, 45)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Activity Timeline */}
      {activeTab === 'activity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activities.length === 0 ? (
            <div className={styles.card} style={{ textAlign: 'center', padding: '36px' }}>
              <h3 style={{ margin: 0, color: 'var(--ui-text-primary)' }}>No audit events found</h3>
              <p style={{ margin: '6px 0 0', color: 'var(--ui-text-muted)', fontSize: '13px' }}>
                Events are recorded when the project is modified or commands are dispatched.
              </p>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Timestamp</th>
                    <th scope="col">Action</th>
                    <th scope="col">Actor</th>
                    <th scope="col">Status</th>
                    <th scope="col">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((act) => (
                    <tr key={act.id}>
                      <td data-label="Timestamp" className={styles.mono} title={new Date(act.timestamp).toLocaleString()}>
                        {formatAgo(act.timestamp)}
                      </td>
                      <td data-label="Action">
                        <span className={styles.tag}>{act.action}</span>
                      </td>
                      <td data-label="Actor" className={styles.mono}>{act.actor}</td>
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
                      <td data-label="Details" className={styles.mono}>
                        {act.details ? JSON.stringify(act.details).slice(0, 60) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Bar */}
              <div className={styles.pagination}>
                <span>
                  Page {activityPage} of {activityTotalPages} ({activityTotal} total events)
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                    disabled={activityPage <= 1}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={() => setActivityPage((p) => Math.min(activityTotalPages, p + 1))}
                    disabled={activityPage >= activityTotalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Config & Manifest */}
      {activeTab === 'config' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '14px', color: 'var(--ui-text-secondary)' }}>
              Read-only view of the manifest and declared APIs registered with the control plane.
            </div>
            <button type="button" className={styles.btn} onClick={handleCopyManifest}>
              {copiedManifest ? '✓ Copied to Clipboard' : 'Copy Manifest JSON'}
            </button>
          </div>

          <pre className={styles.codeBox}>
            {JSON.stringify(project.manifest, null, 2)}
          </pre>
        </div>
      )}

      {/* Tab 5: Billing & Quotas */}
      {activeTab === 'billing' && (
        <div className={styles.billingLayout}>
          {/* Column 1: Plan & Usage */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Current Active Plan Card */}
            <div className={styles.planOverviewCard}>
              <div className={styles.cardTitle}>Current Plan</div>
              {(() => {
                const activePlan = billingPlans.find((p) => currentPlanRefs.includes(p.id)) || billingPlans[0];
                if (!activePlan) {
                  return <div style={{ color: 'var(--ui-text-muted)', fontSize: '13px' }}>No plan assigned.</div>;
                }
                const formattedPrice = (Number(activePlan.basePriceMinor) / 100).toLocaleString('en-IN', {
                  style: 'currency',
                  currency: activePlan.currency || 'INR',
                  maximumFractionDigits: 0,
                });
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--ui-text-primary)' }}>{activePlan.name}</h3>
                      <span className={`${styles.tag} ${styles.tagSuccess}`} style={{ textTransform: 'capitalize' }}>
                        {activePlan.tier} tier
                      </span>
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--ui-text-primary)' }}>
                      {formattedPrice}{' '}
                      <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--ui-text-muted)' }}>
                        / {activePlan.billingInterval}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {activePlan.features?.map((f: string) => (
                        <span key={f} className={`${styles.tag} ${styles.tagNeutral}`}>
                          ✓ {f}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Live Usage & Entitlements Card */}
            <div className={styles.planOverviewCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className={styles.cardTitle}>Live Usage & Quotas</div>
                <span style={{ fontSize: '11px', color: 'var(--ui-text-muted)' }}>Auto-refreshed (5s)</span>
              </div>
              {Object.keys(entitlements).length === 0 ? (
                <div style={{ color: 'var(--ui-text-muted)', fontSize: '13px' }}>No quota counters active.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.entries(entitlements).map(([key, ent]) => {
                    const pct = ent.limit > 0 ? Math.min(100, Math.round((ent.used / ent.limit) * 100)) : 0;
                    const isExceeded = ent.used >= ent.limit && ent.enforced;
                    return (
                      <div key={key} className={styles.quotaItem}>
                        <div className={styles.quotaHeader}>
                          <div className={styles.quotaKey}>
                            <span className={styles.mono}>{key}</span>
                            <span
                              className={`${styles.tag} ${
                                ent.enforced
                                  ? isExceeded
                                    ? styles.tagDanger
                                    : styles.tagWarning
                                  : styles.tagNeutral
                              }`}
                            >
                              {ent.enforced ? (isExceeded ? 'Limit Exceeded' : 'Enforced') : 'Soft Limit'}
                            </span>
                          </div>
                          <span className={styles.quotaNumbers}>
                            <strong>{ent.used.toLocaleString()}</strong> / {ent.limit.toLocaleString()} ({pct}%)
                          </span>
                        </div>
                        <div className={styles.progressBarTrack}>
                          <div
                            className={`${styles.progressBarFill} ${
                              isExceeded ? styles.progressBarFillExceeded : ''
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Compute a Quote Form */}
          <div className={styles.quoteForm}>
            <div className={styles.cardTitle}>Compute a Quote</div>
            <div style={{ fontSize: '13px', color: 'var(--ui-text-secondary)', lineHeight: 1.4 }}>
              Simulate pricing, add-ons, and customized enterprise discounts for this project using the live quote engine.
            </div>

            <form onSubmit={handleComputeQuote} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Target Plan</label>
                <select
                  className={styles.formSelect}
                  value={selectedQuotePlan}
                  onChange={(e) => {
                    setSelectedQuotePlan(e.target.value);
                    setSelectedAddons([]);
                  }}
                >
                  {billingPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.tier}) — ₹{(Number(p.basePriceMinor) / 100).toLocaleString('en-IN')}/mo
                    </option>
                  ))}
                </select>
              </div>

              {/* Addons for selected plan */}
              {(() => {
                const currentSelected = billingPlans.find((p) => p.id === selectedQuotePlan);
                if (!currentSelected?.addons || currentSelected.addons.length === 0) return null;
                return (
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Available Add-ons</label>
                    <div className={styles.checkboxList}>
                      {currentSelected.addons.map((addon: any) => (
                        <label key={addon.id} className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={selectedAddons.includes(addon.id)}
                            onChange={() => handleToggleAddon(addon.id)}
                          />
                          <span>
                            {addon.name} (+₹{(Number(addon.priceMinor) / 100).toLocaleString('en-IN')})
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Custom Discount (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className={styles.formInput}
                  value={customDiscount}
                  onChange={(e) => setCustomDiscount(Math.max(0, Math.min(100, Number(e.target.value))))}
                />
              </div>

              <button
                type="submit"
                className={styles.btn}
                style={{ alignSelf: 'flex-start', marginTop: '4px' }}
                disabled={computingQuote}
              >
                {computingQuote ? 'Computing…' : 'Compute Live Quote'}
              </button>

              {quoteError && (
                <div className={`${styles.tag} ${styles.tagDanger}`} style={{ padding: '8px 12px' }}>
                  {quoteError}
                </div>
              )}

              {computedQuote && (
                <div className={styles.quoteResultCard}>
                  <div style={{ fontWeight: 600, color: 'var(--ui-text-primary)', marginBottom: '4px' }}>
                    Quote Calculation: {computedQuote.quoteId}
                  </div>
                  <div className={styles.quoteRow}>
                    <span style={{ color: 'var(--ui-text-muted)' }}>Base Subscription</span>
                    <span>₹{(Number(computedQuote.baseAmountMinor) / 100).toLocaleString('en-IN')}</span>
                  </div>
                  {Number(computedQuote.addonsAmountMinor) > 0 && (
                    <div className={styles.quoteRow}>
                      <span style={{ color: 'var(--ui-text-muted)' }}>Selected Add-ons</span>
                      <span>₹{(Number(computedQuote.addonsAmountMinor) / 100).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {Number(computedQuote.discountMinor) > 0 && (
                    <div className={styles.quoteRow}>
                      <span style={{ color: 'var(--ui-text-muted)' }}>Discount</span>
                      <span style={{ color: 'var(--ui-success, #22c55e)' }}>
                        -₹{(Number(computedQuote.discountMinor) / 100).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                  <div className={styles.quoteRow}>
                    <span style={{ color: 'var(--ui-text-muted)' }}>GST / Tax (18%)</span>
                    <span>₹{(Number(computedQuote.taxMinor) / 100).toLocaleString('en-IN')}</span>
                  </div>
                  <div className={styles.quoteTotalRow}>
                    <span>Estimated Total</span>
                    <span>
                      ₹{(Number(computedQuote.totalMinor) / 100).toLocaleString('en-IN')} / mo
                    </span>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Restart Runtime Confirmation Modal */}
      {showRestartModal && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="modal-restart-title">
          <div className={styles.modal}>
            <h2 id="modal-restart-title" className={styles.modalTitle}>Confirm Runtime Restart</h2>
            <p className={styles.modalText}>
              Are you sure you want to restart the runtime for <strong>{project.name}</strong>?
              This will issue an immediate <code>restart_runtime</code> command to the client process at{' '}
              <code>{project.runtime.url ?? 'connected runtime'}</code>. In-flight requests may terminate.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.btn}
                onClick={() => setShowRestartModal(false)}
                disabled={isIssuing}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnDanger}`}
                onClick={() => void handleIssueCommand('restart_runtime')}
                disabled={isIssuing}
              >
                {isIssuing ? 'Issuing…' : 'Yes, Restart Runtime'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
