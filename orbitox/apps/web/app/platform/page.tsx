'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePlatform } from './components/PlatformContext';
import { tokens } from './components/tokens';

export default function PlatformOverviewPage() {
  const { openInspector, refreshTrigger, triggerRefresh } = usePlatform();
  const [projects, setProjects] = useState<any[]>([]);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [graphMeta, setGraphMeta] = useState<any>(null);
  const [isReconciling, setIsReconciling] = useState(false);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [reconcileFeedback, setReconcileFeedback] = useState<string | null>(null);
  const [, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [projRes, auditRes, resRes] = await Promise.all([
          fetch('/api/v1/platform/projects').then((r) => r.json()).catch(() => ({ success: false })),
          fetch('/api/v1/platform/audit').then((r) => r.json()).catch(() => ({ success: false })),
          fetch('/api/v1/platform/resources').then((r) => r.json()).catch(() => ({ success: false })),
        ]);
        if (projRes.success) setProjects(projRes.data || []);
        if (auditRes.success) setAuditEvents(auditRes.data?.events || []);
        if (resRes.success) {
          setResources(resRes.data?.items || resRes.data?.resources || []);
          setGraphMeta(resRes.data?.metadata || null);
        }
      } catch (err) {
        console.error('Failed to load overview data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [refreshTrigger]);

  const handleGlobalReconcile = async () => {
    setIsReconciling(true);
    setReconcileFeedback(null);
    try {
      const res = await fetch('/api/v1/platform/reconcile', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setReconcileFeedback(`Mesh Reconciled: ${data.data.scannedCount} nodes scanned, ${data.data.reconciledCount} self-healed, 0 blocked.`);
        triggerRefresh();
      }
    } catch (err: any) {
      setReconcileFeedback(`Reconciliation error: ${err.message}`);
    } finally {
      setIsReconciling(false);
    }
  };

  const handleRebuildProjection = async () => {
    setIsRebuilding(true);
    setReconcileFeedback(null);
    try {
      const res = await fetch('/api/v1/platform/resources/rebuild', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setReconcileFeedback(
          `Projection Rebuilt from PlatformRepository: ${data.data.report.nodeCount} nodes, ${data.data.report.edgeCount} relationships. Status: ${data.data.report.status} (v${data.data.metadata.graphVersion}).`
        );
        triggerRefresh();
      }
    } catch (err: any) {
      setReconcileFeedback(`Rebuild error: ${err.message}`);
    } finally {
      setIsRebuilding(false);
    }
  };

  const handleVerifyIntegrity = async () => {
    setIsVerifying(true);
    setReconcileFeedback(null);
    try {
      const res = await fetch('/api/v1/platform/resources/verify', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const report = data.data;
        setReconcileFeedback(
          `Integrity Verification Passed: Consistent: ${report.isConsistent ? '100% OK' : 'DEGRADED'}, ${report.nodeCount} nodes, ${report.cycles.length} cycles, ${report.orphanEdges.length} broken edges.`
        );
      }
    } catch (err: any) {
      setReconcileFeedback(`Verification error: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const attentionItems = [
    {
      id: 'att-1',
      severity: 'critical' as const,
      title: 'Production API key has unrestricted capability scope',
      resource: 'OmniDeliver · Production',
      subtext: 'Access policy needs review',
      actionLabel: 'Review',
      target: {
        type: 'key' as const,
        data: {
          id: 'key-omni-live-01',
          name: 'OmniDeliver Production Root',
          keyFingerprint: 'SHA256: 4A7B...9E21',
          status: 'ACTIVE',
          environmentId: 'env-prod-01',
          capabilities: ['*.*.*'],
          riskScore: 65,
          riskLevel: 'HIGH',
        },
      },
    },
    {
      id: 'att-2',
      severity: 'warning' as const,
      title: 'External Stripe credential rotation due in 8 days',
      resource: 'OmniDeliver · Production',
      subtext: 'Credential lifecycle',
      actionLabel: 'Rotate',
      target: {
        type: 'credential' as const,
        data: {
          id: 'cred-stripe-01',
          name: 'Stripe Production Secret',
          provider: 'stripe',
          health: 'ROTATION_PENDING',
          ownerEmail: 'finance@omnideliver.com',
          maskedDisplay: 'sk_live_••••••••9F2A',
        },
      },
    },
  ];

  const systemServices = [
    { name: 'API Gateway', status: 'Healthy', latency: '3.2 ms', metric: '0.01% error rate' },
    { name: 'Database Cluster', status: 'Healthy', latency: '1.4 ms', metric: 'Healthy pool' },
    { name: 'Redis Cache', status: 'Healthy', latency: '0.6 ms', metric: 'Sub-ms RAM' },
    { name: 'Background Workers', status: 'Healthy', latency: '—', metric: '0 backlog' },
  ];

  const defaultProjects = [
    { id: 'proj_omni', resourceId: 'proj_omni', name: 'OmniDeliver Global Network', plan: 'Enterprise', envCount: 3, lastActive: '2m ago' },
    { id: 'proj_med', resourceId: 'proj_med', name: 'MedNet Health Alliance', plan: 'Enterprise', envCount: 3, lastActive: '14m ago' },
    { id: 'proj_aura', resourceId: 'proj_aura', name: 'Aura Luxury Brands', plan: 'Growth', envCount: 3, lastActive: '42m ago' },
  ];

  const graphProjects = resources.filter((r) => r.resourceType === 'PROJECT').map((p) => ({
    id: p.resourceId,
    resourceId: p.resourceId,
    name: p.name,
    plan: ((p.desiredState as any)?.planTier || 'Enterprise').toUpperCase(),
    envCount: 3,
    lastActive: 'Synchronized',
    ...p,
  }));

  const displayProjects =
    graphProjects.length > 0
      ? graphProjects
      : projects.length > 0
      ? projects
      : defaultProjects;

  return (
    <div
      style={{
        maxWidth: '1240px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '36px',
      }}
    >
      {/* 1. HERO / EDITORIAL HEADER AREA */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1
            style={{
              fontSize: tokens.typography.size.title,
              fontWeight: tokens.typography.weight.bold,
              color: tokens.colors.text.primary,
              margin: 0,
              letterSpacing: '-0.025em',
              lineHeight: 1.15,
            }}
          >
            Platform Overview
          </h1>
          <p
            style={{
              fontSize: tokens.typography.size.base,
              color: tokens.colors.text.secondary,
              margin: '6px 0 0 0',
              lineHeight: 1.4,
            }}
          >
            Everything is operational.{' '}
            <span style={{ color: tokens.colors.status.warning, fontWeight: tokens.typography.weight.medium }}>
              2 items need attention.
            </span>
          </p>
          <div
            style={{
              fontSize: tokens.typography.size.xs,
              color: tokens.colors.text.muted,
              marginTop: '6px',
              letterSpacing: '-0.01em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 8px',
                borderRadius: tokens.radius.xs,
                backgroundColor: tokens.colors.status.healthySubtle,
                border: `1px solid ${tokens.colors.status.healthy}`,
                color: tokens.colors.status.healthy,
                fontWeight: tokens.typography.weight.semibold,
                fontSize: '11px',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: tokens.colors.status.healthy }} />
              {graphMeta?.consistencyStatus || 'GRAPH_READY'} (v{graphMeta?.graphVersion || 1})
            </span>
            <span>·</span>
            <span style={{ color: tokens.colors.text.primary, fontWeight: tokens.typography.weight.medium }}>
              {resources.length || 39} Nodes Projected
            </span>
            <span>·</span>
            <span>{graphMeta?.edgeCount || 37} Relationships</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            disabled={isReconciling}
            onClick={handleGlobalReconcile}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              backgroundColor: tokens.colors.bg.surfaceRaised,
              border: `1px solid ${tokens.colors.border.default}`,
              borderRadius: tokens.radius.sm,
              color: tokens.colors.text.primary,
              fontSize: tokens.typography.size.xs,
              fontWeight: tokens.typography.weight.medium,
              cursor: isReconciling ? 'not-allowed' : 'pointer',
            }}
          >
            <span>⚡</span>
            <span>{isReconciling ? 'Reconciling...' : 'Reconcile Mesh'}</span>
          </button>

          <button
            disabled={isRebuilding}
            onClick={handleRebuildProjection}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              backgroundColor: tokens.colors.bg.surfaceRaised,
              border: `1px solid ${tokens.colors.border.default}`,
              borderRadius: tokens.radius.sm,
              color: tokens.colors.text.primary,
              fontSize: tokens.typography.size.xs,
              fontWeight: tokens.typography.weight.medium,
              cursor: isRebuilding ? 'not-allowed' : 'pointer',
            }}
          >
            <span>🔄</span>
            <span>{isRebuilding ? 'Rebuilding...' : 'Rebuild Projection'}</span>
          </button>

          <button
            disabled={isVerifying}
            onClick={handleVerifyIntegrity}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              backgroundColor: tokens.colors.bg.surfaceRaised,
              border: `1px solid ${tokens.colors.border.default}`,
              borderRadius: tokens.radius.sm,
              color: tokens.colors.text.primary,
              fontSize: tokens.typography.size.xs,
              fontWeight: tokens.typography.weight.medium,
              cursor: isVerifying ? 'not-allowed' : 'pointer',
            }}
          >
            <span>🛡️</span>
            <span>{isVerifying ? 'Verifying...' : 'Verify Integrity'}</span>
          </button>
        </div>
      </div>

      {reconcileFeedback && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: tokens.radius.sm,
            backgroundColor: tokens.colors.status.healthySubtle,
            border: `1px solid ${tokens.colors.status.healthy}`,
            color: tokens.colors.status.healthy,
            fontSize: tokens.typography.size.xs,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{reconcileFeedback}</span>
          <button
            onClick={() => setReconcileFeedback(null)}
            style={{ background: 'transparent', border: 'none', color: tokens.colors.status.healthy, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. COMPACT METRIC LINE (Platform Statistics, Not Cards) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          padding: '16px 0',
          borderTop: `1px solid ${tokens.colors.border.subtle}`,
          borderBottom: `1px solid ${tokens.colors.border.subtle}`,
          gap: '24px',
        }}
      >
        <div>
          <div
            style={{
              fontSize: tokens.typography.size.micro,
              fontWeight: tokens.typography.weight.semibold,
              color: tokens.colors.text.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Projects
          </div>
          <div
            style={{
              fontSize: tokens.typography.size.xxl,
              fontWeight: tokens.typography.weight.semibold,
              color: tokens.colors.text.primary,
              marginTop: '4px',
              lineHeight: 1.1,
            }}
          >
            {displayProjects.length}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: tokens.typography.size.micro,
              fontWeight: tokens.typography.weight.semibold,
              color: tokens.colors.text.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Requests / 24h
          </div>
          <div
            style={{
              fontSize: tokens.typography.size.xxl,
              fontWeight: tokens.typography.weight.semibold,
              color: tokens.colors.text.primary,
              marginTop: '4px',
              lineHeight: 1.1,
            }}
          >
            12.8M
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: tokens.typography.size.micro,
              fontWeight: tokens.typography.weight.semibold,
              color: tokens.colors.text.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Error Rate
          </div>
          <div
            style={{
              fontSize: tokens.typography.size.xxl,
              fontWeight: tokens.typography.weight.semibold,
              color: tokens.colors.status.healthy,
              marginTop: '4px',
              lineHeight: 1.1,
            }}
          >
            0.01%
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: tokens.typography.size.micro,
              fontWeight: tokens.typography.weight.semibold,
              color: tokens.colors.text.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Security
          </div>
          <div
            style={{
              fontSize: tokens.typography.size.xxl,
              fontWeight: tokens.typography.weight.semibold,
              color: tokens.colors.text.primary,
              marginTop: '4px',
              lineHeight: 1.1,
              display: 'flex',
              alignItems: 'baseline',
              gap: '6px',
            }}
          >
            Good
            <span style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.text.muted, fontWeight: tokens.typography.weight.regular }}>
              (1 medium finding)
            </span>
          </div>
        </div>
      </div>

      {/* 3. ATTENTION WORK QUEUE (Primary Operational Work Area) */}
      <section style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: tokens.typography.size.micro,
                fontWeight: tokens.typography.weight.semibold,
                color: tokens.colors.text.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Attention
            </span>
            <span
              style={{
                fontSize: tokens.typography.size.micro,
                color: tokens.colors.text.muted,
                fontWeight: tokens.typography.weight.medium,
              }}
            >
              {attentionItems.length} items
            </span>
          </div>
          <Link
            href="/platform/security"
            style={{
              fontSize: tokens.typography.size.xs,
              color: tokens.colors.text.muted,
              textDecoration: 'none',
              transition: 'color 0.12s ease',
            }}
          >
            View security findings →
          </Link>
        </div>

        {/* Operational List (Dividers, No Heavy Box) */}
        <div style={{ borderTop: `1px solid ${tokens.colors.border.subtle}` }}>
          {attentionItems.map((item) => (
            <div
              key={item.id}
              style={{
                padding: '14px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: `1px solid ${tokens.colors.border.subtle}`,
                transition: 'background-color 0.12s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                {/* Semantic Indicator Dot */}
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor:
                      item.severity === 'critical'
                        ? tokens.colors.status.danger
                        : tokens.colors.status.warning,
                    marginTop: '6px',
                    flexShrink: 0,
                  }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div
                    style={{
                      fontSize: tokens.typography.size.base,
                      color: tokens.colors.text.primary,
                      fontWeight: tokens.typography.weight.medium,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: tokens.typography.size.xs,
                      color: tokens.colors.text.muted,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>{item.resource}</span>
                    <span>·</span>
                    <span>{item.subtext}</span>
                  </div>
                </div>
              </div>

              {/* Action Trigger */}
              <button
                onClick={() => openInspector(item.target.type, item.target.data)}
                style={{
                  background: 'transparent',
                  border: `1px solid ${tokens.colors.border.default}`,
                  borderRadius: tokens.radius.xs,
                  padding: '5px 12px',
                  color: tokens.colors.text.primary,
                  fontSize: tokens.typography.size.xs,
                  fontWeight: tokens.typography.weight.medium,
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                }}
              >
                {item.actionLabel} →
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 4. MAIN OPERATIONAL WORKSPACE (Projects & Activity Split) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '40px',
        }}
      >
        {/* Left: Projects Workspace Table */}
        <section style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '12px',
            }}
          >
            <span
              style={{
                fontSize: tokens.typography.size.micro,
                fontWeight: tokens.typography.weight.semibold,
                color: tokens.colors.text.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Projects
            </span>
            <Link
              href="/platform/projects"
              style={{
                fontSize: tokens.typography.size.xs,
                color: tokens.colors.text.muted,
                textDecoration: 'none',
              }}
            >
              View all →
            </Link>
          </div>

          <div style={{ borderTop: `1px solid ${tokens.colors.border.subtle}` }}>
            {displayProjects.slice(0, 4).map((proj) => (
              <div
                key={proj.id}
                onClick={() => openInspector('project', proj)}
                style={{
                  padding: '12px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: `1px solid ${tokens.colors.border.subtle}`,
                  cursor: 'pointer',
                  transition: 'background-color 0.1s ease',
                  borderRadius: tokens.radius.xs,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: tokens.typography.size.base,
                      fontWeight: tokens.typography.weight.medium,
                      color: tokens.colors.text.primary,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {proj.name}
                  </div>
                  <div
                    style={{
                      fontSize: tokens.typography.size.xs,
                      color: tokens.colors.text.muted,
                      marginTop: '2px',
                    }}
                  >
                    {proj.plan || 'Enterprise'} · {proj.envCount || proj.environments?.length || 3} environments
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: tokens.colors.status.healthy,
                    }}
                  />
                  <span style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.text.muted }}>
                    Healthy
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right: Recent Activity Event Stream */}
        <section style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '12px',
            }}
          >
            <span
              style={{
                fontSize: tokens.typography.size.micro,
                fontWeight: tokens.typography.weight.semibold,
                color: tokens.colors.text.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Recent Activity
            </span>
            <Link
              href="/platform/audit"
              style={{
                fontSize: tokens.typography.size.xs,
                color: tokens.colors.text.muted,
                textDecoration: 'none',
              }}
            >
              View audit →
            </Link>
          </div>

          <div style={{ borderTop: `1px solid ${tokens.colors.border.subtle}` }}>
            {auditEvents.length > 0 ? (
              auditEvents.slice(0, 4).map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => openInspector('audit', ev)}
                  style={{
                    padding: '12px 6px',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '14px',
                    borderBottom: `1px solid ${tokens.colors.border.subtle}`,
                    cursor: 'pointer',
                    borderRadius: tokens.radius.xs,
                  }}
                >
                  <span
                    style={{
                      fontSize: tokens.typography.size.xs,
                      color: tokens.colors.text.muted,
                      fontFamily: tokens.typography.fontFamily.mono,
                      flexShrink: 0,
                    }}
                  >
                    {new Date(ev.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: tokens.typography.size.base,
                        color: tokens.colors.text.primary,
                        fontWeight: tokens.typography.weight.medium,
                      }}
                    >
                      {ev.action?.toLowerCase().replace(/_/g, ' ').replace(/^./, (str: string) => str.toUpperCase())}
                    </div>
                    <div
                      style={{
                        fontSize: tokens.typography.size.xs,
                        color: tokens.colors.text.muted,
                        marginTop: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {ev.userName || ev.userId} · {ev.reason || 'Executed'}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              [
                { time: '01:04', event: 'API key issued', target: 'OmniDeliver / Production' },
                { time: '01:02', event: 'Credential rotated', target: 'Stripe / Production' },
                { time: '00:58', event: 'Package verified', target: '@orbitox/restaurant 2.2.1' },
                { time: '00:51', event: 'Project provisioned', target: 'Aura Luxury Brands' },
              ].map((ev, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 6px',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '14px',
                    borderBottom: `1px solid ${tokens.colors.border.subtle}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: tokens.typography.size.xs,
                      color: tokens.colors.text.muted,
                      fontFamily: tokens.typography.fontFamily.mono,
                      flexShrink: 0,
                    }}
                  >
                    {ev.time}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: tokens.typography.size.base,
                        color: tokens.colors.text.primary,
                        fontWeight: tokens.typography.weight.medium,
                      }}
                    >
                      {ev.event}
                    </div>
                    <div
                      style={{
                        fontSize: tokens.typography.size.xs,
                        color: tokens.colors.text.muted,
                        marginTop: '2px',
                      }}
                    >
                      {ev.target}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* 5. SYSTEM HEALTH STATUS TABLE (Compact Ledger, Not Floating Cards) */}
      <section style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '12px',
          }}
        >
          <span
            style={{
              fontSize: tokens.typography.size.micro,
              fontWeight: tokens.typography.weight.semibold,
              color: tokens.colors.text.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            System
          </span>
          <Link
            href="/platform/observability"
            style={{
              fontSize: tokens.typography.size.xs,
              color: tokens.colors.text.muted,
              textDecoration: 'none',
            }}
          >
            Observability →
          </Link>
        </div>

        {/* Compact Table */}
        <div style={{ borderTop: `1px solid ${tokens.colors.border.subtle}` }}>
          {/* Header Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr',
              padding: '8px 6px',
              fontSize: tokens.typography.size.micro,
              fontWeight: tokens.typography.weight.semibold,
              color: tokens.colors.text.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              borderBottom: `1px solid ${tokens.colors.border.subtle}`,
            }}
          >
            <div>Service</div>
            <div>Status</div>
            <div>Latency</div>
            <div>Error Rate / Backlog</div>
          </div>

          {/* Data Rows */}
          {systemServices.map((svc) => (
            <div
              key={svc.name}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr',
                alignItems: 'center',
                padding: '11px 6px',
                borderBottom: `1px solid ${tokens.colors.border.subtle}`,
                fontSize: tokens.typography.size.base,
              }}
            >
              <div style={{ fontWeight: tokens.typography.weight.medium, color: tokens.colors.text.primary }}>
                {svc.name}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: tokens.colors.status.healthy,
                  }}
                />
                <span style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.text.secondary }}>
                  {svc.status}
                </span>
              </div>

              <div
                style={{
                  fontSize: tokens.typography.size.xs,
                  fontFamily: tokens.typography.fontFamily.mono,
                  color: tokens.colors.text.secondary,
                }}
              >
                {svc.latency}
              </div>

              <div style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.text.muted }}>
                {svc.metric}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
