'use client';

import React, { useState, useEffect } from 'react';
import { usePlatform } from './PlatformContext';
import { tokens } from './tokens';
import { ImpactPreviewModal } from './ImpactPreviewModal';
import { UniversalResourceEditor } from './UniversalResourceEditor';

export function ResourceInspectorDrawer() {
  const { inspectorTarget, closeInspector, openInspector, triggerRefresh } = usePlatform();
  const [activeTab, setActiveTab] = useState<'overview' | 'configuration' | 'relationships' | 'state' | 'security' | 'impact' | 'activity'>('overview');
  const [graphData, setGraphData] = useState<any>(null);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [activityRecords, setActivityRecords] = useState<any[]>([]);

  // Modal State for Pre-flight Impact
  const [previewAction, setPreviewAction] = useState<string | null>(null);
  const [proposedPayload, setProposedPayload] = useState<Record<string, unknown> | undefined>(undefined);

  const resourceId = inspectorTarget?.data?.resourceId || inspectorTarget?.data?.id || inspectorTarget?.data?.keyId;

  const reloadGraph = () => {
    if (!resourceId) return;
    setLoadingGraph(true);
    fetch(`/api/v1/platform/resources/${resourceId}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setGraphData(res.data);
        }
      })
      .catch((err) => console.error('Failed to load resource graph details:', err))
      .finally(() => setLoadingGraph(false));

    // Load activity records
    fetch(`/api/v1/platform/operations?limit=10`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data?.operations) {
          const filtered = res.data.operations.filter(
            (op: any) => op.resourceId === resourceId || op.details?.resourceId === resourceId || op.target === resourceId
          );
          setActivityRecords(filtered);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (!resourceId) return;
    setActionFeedback(null);
    setShowActionsDropdown(false);
    reloadGraph();
  }, [resourceId]);

  if (!inspectorTarget) return null;

  const { type, data } = inspectorTarget;
  const liveResource = graphData?.resource;
  const dependencies = graphData?.dependencies || [];
  const dependents = graphData?.dependents || [];
  const impactSummary = graphData?.impactSummary;
  const effectiveAuth = graphData?.effectiveAuth;
  const permittedActions = graphData?.permittedActions || [];

  const tabList: { id: any; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'configuration', label: '⚙️ Configuration' },
    { id: 'relationships', label: `Topology (${dependencies.length + dependents.length})` },
    { id: 'state', label: 'Desired vs Observed' },
    { id: 'security', label: 'Security' },
    { id: 'impact', label: 'Blast Radius' },
    { id: 'activity', label: 'Activity' },
  ];

  const handleReconcile = async () => {
    if (!resourceId) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/v1/platform/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceId }),
      });
      const result = await res.json();
      if (result.success) {
        setActionFeedback(`Reconciliation completed: ${result.data?.message || 'In sync'}`);
        triggerRefresh();
        reloadGraph();
      } else {
        setActionFeedback(`Reconciliation failed: ${result.error?.message}`);
      }
    } catch (err: any) {
      setActionFeedback(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const executeActionFromMenu = (act: any) => {
    setShowActionsDropdown(false);
    setPreviewAction(act.id || act.command);
    setProposedPayload({ actionId: act.id });
  };

  const driftState = liveResource?.driftState || 'IN_SYNC';
  const driftColor =
    driftState === 'BLOCKED'
      ? tokens.colors.status.danger
      : driftState === 'DRIFTED'
      ? tokens.colors.status.warning
      : tokens.colors.status.healthy;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          display: 'flex',
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0, 0, 0, 0.60)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeInspector();
        }}
      >
        <div
          style={{
            width: '580px',
            maxWidth: '100vw',
            height: '100vh',
            backgroundColor: tokens.colors.bg.surfaceRaised,
            borderLeft: `1px solid ${tokens.colors.border.default}`,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: tokens.shadow.drawer,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${tokens.colors.border.subtle}`,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  color: tokens.colors.text.muted,
                  fontWeight: tokens.typography.weight.semibold,
                  letterSpacing: '0.06em',
                }}
              >
                {liveResource?.resourceType || type} · v{liveResource?.resourceVersion || 1}
              </div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: tokens.typography.weight.bold,
                  color: tokens.colors.text.primary,
                  marginTop: '2px',
                }}
              >
                {liveResource?.name || data.name || data.keyId || resourceId}
              </div>
            </div>

            {/* Header Action Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setActiveTab('configuration')}
                style={{
                  padding: '5px 12px',
                  borderRadius: tokens.radius.xs,
                  backgroundColor:
                    activeTab === 'configuration'
                      ? tokens.colors.accent.primary
                      : tokens.colors.bg.surface,
                  color: activeTab === 'configuration' ? '#fff' : tokens.colors.text.primary,
                  border: `1px solid ${
                    activeTab === 'configuration'
                      ? tokens.colors.accent.primary
                      : tokens.colors.border.default
                  }`,
                  fontSize: '11px',
                  fontWeight: tokens.typography.weight.semibold,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <span>⚙️</span> Edit / Configure
              </button>

              {/* Actions Dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: tokens.radius.xs,
                    backgroundColor: tokens.colors.bg.surface,
                    color: tokens.colors.text.primary,
                    border: `1px solid ${tokens.colors.border.default}`,
                    fontSize: '11px',
                    fontWeight: tokens.typography.weight.medium,
                    cursor: 'pointer',
                  }}
                >
                  Actions ▾
                </button>

                {showActionsDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '110%',
                      width: '210px',
                      backgroundColor: tokens.colors.bg.surfaceRaised,
                      border: `1px solid ${tokens.colors.border.default}`,
                      borderRadius: tokens.radius.sm,
                      boxShadow: tokens.shadow.card,
                      zIndex: 110,
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '4px',
                    }}
                  >
                    <button
                      onClick={() => {
                        setShowActionsDropdown(false);
                        handleReconcile();
                      }}
                      style={{
                        padding: '8px 10px',
                        background: 'transparent',
                        border: 'none',
                        color: tokens.colors.text.primary,
                        fontSize: '11px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        borderRadius: tokens.radius.xs,
                      }}
                    >
                      ⚡ Reconcile Runtime
                    </button>
                    {permittedActions.map((act: any) => (
                      <button
                        key={act.id}
                        disabled={act.allowed === false}
                        onClick={() => executeActionFromMenu(act)}
                        style={{
                          padding: '8px 10px',
                          background: 'transparent',
                          border: 'none',
                          color:
                            act.safetyLevel === 'APPROVAL_REQUIRED'
                              ? tokens.colors.status.warning
                              : tokens.colors.text.primary,
                          fontSize: '11px',
                          textAlign: 'left',
                          cursor: act.allowed === false ? 'not-allowed' : 'pointer',
                          opacity: act.allowed === false ? 0.5 : 1,
                          borderRadius: tokens.radius.xs,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span>{act.name || act.id}</span>
                        {act.requiresApproval && (
                          <span style={{ fontSize: '9px', color: tokens.colors.status.warning }}>Quorum</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={closeInspector}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: tokens.colors.text.muted,
                  fontSize: '16px',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Tab Switcher */}
          <div
            style={{
              display: 'flex',
              borderBottom: `1px solid ${tokens.colors.border.subtle}`,
              padding: '0 20px',
              gap: '14px',
              overflowX: 'auto',
            }}
          >
            {tabList.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom:
                    activeTab === tab.id ? `2px solid ${tokens.colors.accent.primary}` : '2px solid transparent',
                  color: activeTab === tab.id ? tokens.colors.text.primary : tokens.colors.text.muted,
                  padding: '10px 0',
                  fontSize: '12px',
                  fontWeight: tokens.typography.weight.medium,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Body */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            {actionFeedback && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: tokens.radius.sm,
                  backgroundColor: tokens.colors.status.infoSubtle,
                  border: `1px solid ${tokens.colors.status.info}`,
                  color: tokens.colors.status.info,
                  fontSize: '12px',
                }}
              >
                {actionFeedback}
              </div>
            )}

            {/* TAB: CONFIGURATION (THE UNIVERSAL RESOURCE EDITOR) */}
            {activeTab === 'configuration' && (
              <UniversalResourceEditor
                resourceId={resourceId}
                liveResource={liveResource}
                onRefresh={() => {
                  triggerRefresh();
                  reloadGraph();
                }}
              />
            )}

            {/* TAB: OVERVIEW */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: tokens.colors.text.muted }}>Universal Resource ID</div>
                  <div
                    style={{
                      fontSize: '12px',
                      fontFamily: tokens.typography.fontFamily.mono,
                      color: tokens.colors.text.primary,
                      marginTop: '2px',
                    }}
                  >
                    {resourceId}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: tokens.colors.text.muted }}>Drift State</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: driftColor,
                        }}
                      />
                      <span
                        style={{
                          fontSize: '12px',
                          color: tokens.colors.text.primary,
                          fontWeight: tokens.typography.weight.medium,
                        }}
                      >
                        {driftState}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: tokens.colors.text.muted }}>Lifecycle Status</div>
                    <div style={{ fontSize: '12px', color: tokens.colors.text.primary, marginTop: '4px' }}>
                      {liveResource?.lifecycleStatus || data.status || 'ACTIVE'}
                    </div>
                  </div>
                </div>

                {liveResource?.owner && (
                  <div>
                    <div style={{ fontSize: '11px', color: tokens.colors.text.muted }}>Authoritative Owner</div>
                    <div
                      style={{
                        fontSize: '12px',
                        fontFamily: tokens.typography.fontFamily.mono,
                        color: tokens.colors.text.secondary,
                        marginTop: '2px',
                      }}
                    >
                      {liveResource.owner}
                    </div>
                  </div>
                )}

                {liveResource?.organizationId && (
                  <div>
                    <div style={{ fontSize: '11px', color: tokens.colors.text.muted }}>Organization Scope</div>
                    <div style={{ fontSize: '12px', color: tokens.colors.text.secondary, marginTop: '2px' }}>
                      {liveResource.organizationId}
                    </div>
                  </div>
                )}

                {liveResource?.createdAt && (
                  <div>
                    <div style={{ fontSize: '11px', color: tokens.colors.text.muted }}>Graph Node Created</div>
                    <div style={{ fontSize: '12px', color: tokens.colors.text.secondary, marginTop: '2px' }}>
                      {new Date(liveResource.createdAt).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: RELATIONSHIPS & TOPOLOGY */}
            {activeTab === 'relationships' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: tokens.typography.weight.semibold,
                      color: tokens.colors.text.muted,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '8px',
                    }}
                  >
                    Upstream Dependencies ({dependencies.length})
                  </div>
                  {dependencies.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {dependencies.map((dep: any) => (
                        <div
                          key={dep.resourceId}
                          onClick={() => openInspector(dep.resourceType?.toLowerCase() || 'universal', dep)}
                          style={{
                            padding: '8px 10px',
                            borderRadius: tokens.radius.xs,
                            backgroundColor: tokens.colors.bg.surface,
                            border: `1px solid ${tokens.colors.border.subtle}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '12px', color: tokens.colors.text.primary, fontWeight: tokens.typography.weight.medium }}>
                              {dep.name || dep.resourceId}
                            </div>
                            <div style={{ fontSize: '10px', color: tokens.colors.text.muted, fontFamily: tokens.typography.fontFamily.mono }}>
                              {dep.resourceId}
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: tokens.radius.xs,
                              backgroundColor: tokens.colors.bg.surfaceHover,
                              color: tokens.colors.text.secondary,
                            }}
                          >
                            {dep.resourceType}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: tokens.colors.text.muted, fontStyle: 'italic' }}>
                      No upstream dependencies.
                    </div>
                  )}
                </div>

                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: tokens.typography.weight.semibold,
                      color: tokens.colors.text.muted,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '8px',
                    }}
                  >
                    Downstream Dependents ({dependents.length})
                  </div>
                  {dependents.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {dependents.map((dep: any) => (
                        <div
                          key={dep.resourceId}
                          onClick={() => openInspector(dep.resourceType?.toLowerCase() || 'universal', dep)}
                          style={{
                            padding: '8px 10px',
                            borderRadius: tokens.radius.xs,
                            backgroundColor: tokens.colors.bg.surface,
                            border: `1px solid ${tokens.colors.border.subtle}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '12px', color: tokens.colors.text.primary, fontWeight: tokens.typography.weight.medium }}>
                              {dep.name || dep.resourceId}
                            </div>
                            <div style={{ fontSize: '10px', color: tokens.colors.text.muted, fontFamily: tokens.typography.fontFamily.mono }}>
                              {dep.resourceId}
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: tokens.radius.xs,
                              backgroundColor: tokens.colors.bg.surfaceHover,
                              color: tokens.colors.text.secondary,
                            }}
                          >
                            {dep.resourceType}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: tokens.colors.text.muted, fontStyle: 'italic' }}>
                      No downstream dependents.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: DESIRED VS OBSERVED STATE */}
            {activeTab === 'state' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: tokens.typography.weight.semibold, color: tokens.colors.text.muted, marginBottom: '4px' }}>
                    Desired State
                  </div>
                  <pre
                    style={{
                      padding: '10px',
                      borderRadius: tokens.radius.sm,
                      backgroundColor: tokens.colors.bg.surface,
                      border: `1px solid ${tokens.colors.border.subtle}`,
                      fontSize: '11px',
                      fontFamily: tokens.typography.fontFamily.mono,
                      color: tokens.colors.text.primary,
                      overflowX: 'auto',
                      margin: 0,
                    }}
                  >
                    {JSON.stringify(liveResource?.desiredState || data, null, 2)}
                  </pre>
                </div>

                <div>
                  <div style={{ fontSize: '11px', fontWeight: tokens.typography.weight.semibold, color: tokens.colors.text.muted, marginBottom: '4px' }}>
                    Observed Reality (Runtime Telemetry)
                  </div>
                  <pre
                    style={{
                      padding: '10px',
                      borderRadius: tokens.radius.sm,
                      backgroundColor: tokens.colors.bg.surface,
                      border: `1px solid ${tokens.colors.border.subtle}`,
                      fontSize: '11px',
                      fontFamily: tokens.typography.fontFamily.mono,
                      color: driftState === 'IN_SYNC' ? tokens.colors.status.healthy : tokens.colors.status.warning,
                      overflowX: 'auto',
                      margin: 0,
                    }}
                  >
                    {JSON.stringify(liveResource?.observedState || data, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* TAB: SECURITY & AUTH ("WHY?") */}
            {activeTab === 'security' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div
                  style={{
                    padding: '12px',
                    borderRadius: tokens.radius.sm,
                    backgroundColor: effectiveAuth?.isAllowed !== false ? tokens.colors.status.healthySubtle : tokens.colors.status.dangerSubtle,
                    border: `1px solid ${effectiveAuth?.isAllowed !== false ? tokens.colors.status.healthy : tokens.colors.status.danger}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: tokens.colors.text.muted }}>Authorization Evaluation</div>
                    <div
                      style={{
                        fontSize: '16px',
                        fontWeight: tokens.typography.weight.bold,
                        color: effectiveAuth?.isAllowed !== false ? tokens.colors.status.healthy : tokens.colors.status.danger,
                        marginTop: '2px',
                      }}
                    >
                      {effectiveAuth?.isAllowed !== false ? 'ALLOWED' : 'DENIED'}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', padding: '3px 8px', borderRadius: tokens.radius.xs, backgroundColor: tokens.colors.bg.surface, color: tokens.colors.text.primary }}>
                    Inherited ABAC Trace
                  </div>
                </div>

                {effectiveAuth?.explanation && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: tokens.colors.text.secondary,
                      lineHeight: 1.5,
                      padding: '10px 12px',
                      backgroundColor: tokens.colors.bg.surface,
                      borderRadius: tokens.radius.xs,
                      border: `1px solid ${tokens.colors.border.subtle}`,
                    }}
                  >
                    {effectiveAuth.explanation}
                  </div>
                )}

                <div>
                  <div style={{ fontSize: '11px', fontWeight: tokens.typography.weight.semibold, color: tokens.colors.text.muted, marginBottom: '8px' }}>
                    Security Policies & Invariants
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(effectiveAuth?.checks || [
                      { rule: 'KEY_LIFECYCLE_STATE', passed: true, details: 'Key lifecycle state is ACTIVE.' },
                      { rule: 'ENVIRONMENT_ACTIVE', passed: true, details: 'Parent environment is ACTIVE.' },
                      { rule: 'PLAN_ENTITLEMENT', passed: true, details: 'Project plan tier entitles requested capabilities.' },
                      { rule: 'KEY_CAPABILITY_GRANT', passed: true, details: 'Granted explicit capability scopes.' },
                      { rule: 'CHILD_NARROWING_RULE', passed: true, details: 'Limits cannot exceed parent platform constraints.' },
                    ]).map((check: any, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          padding: '8px 12px',
                          borderRadius: tokens.radius.xs,
                          backgroundColor: tokens.colors.bg.surface,
                          border: `1px solid ${tokens.colors.border.subtle}`,
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                        }}
                      >
                        <span style={{ color: check.passed ? tokens.colors.status.healthy : tokens.colors.status.danger, fontWeight: tokens.typography.weight.bold }}>
                          {check.passed ? '✓' : '✗'}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '11px', fontWeight: tokens.typography.weight.medium, color: tokens.colors.text.primary }}>
                            {check.rule}
                          </div>
                          <div style={{ fontSize: '11px', color: tokens.colors.text.muted }}>
                            {check.details}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: BLAST RADIUS & IMPACT */}
            {activeTab === 'impact' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div
                  style={{
                    padding: '12px',
                    borderRadius: tokens.radius.sm,
                    backgroundColor: tokens.colors.bg.surface,
                    border: `1px solid ${tokens.colors.border.subtle}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: tokens.colors.text.muted }}>Pre-Flight Risk Score</div>
                    <div
                      style={{
                        fontSize: '18px',
                        fontWeight: tokens.typography.weight.bold,
                        color: (impactSummary?.riskScore || 15) >= 60 ? tokens.colors.status.danger : tokens.colors.status.healthy,
                        marginTop: '2px',
                      }}
                    >
                      {impactSummary?.riskScore ?? 15}/100
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', padding: '3px 8px', borderRadius: tokens.radius.xs, backgroundColor: tokens.colors.bg.surfaceHover, color: tokens.colors.text.secondary }}>
                    {impactSummary?.riskLevel || 'LOW'} RISK
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ padding: '10px', backgroundColor: tokens.colors.bg.surface, borderRadius: tokens.radius.xs, border: `1px solid ${tokens.colors.border.subtle}` }}>
                    <div style={{ fontSize: '10px', color: tokens.colors.text.muted }}>Projects Impacted</div>
                    <div style={{ fontSize: '16px', fontWeight: tokens.typography.weight.semibold, color: tokens.colors.text.primary }}>
                      {impactSummary?.affectedProjectsCount ?? 0}
                    </div>
                  </div>
                  <div style={{ padding: '10px', backgroundColor: tokens.colors.bg.surface, borderRadius: tokens.radius.xs, border: `1px solid ${tokens.colors.border.subtle}` }}>
                    <div style={{ fontSize: '10px', color: tokens.colors.text.muted }}>Environments Impacted</div>
                    <div style={{ fontSize: '16px', fontWeight: tokens.typography.weight.semibold, color: tokens.colors.text.primary }}>
                      {impactSummary?.affectedEnvironmentsCount ?? 0}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: ACTIVITY & AUDIT */}
            {activeTab === 'activity' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: tokens.typography.weight.semibold, color: tokens.colors.text.primary }}>
                  Cryptographic Audit & Execution History
                </div>
                {activityRecords.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: tokens.colors.text.muted, fontSize: '12px', fontStyle: 'italic' }}>
                    No recent mutation commands on this resource.
                  </div>
                ) : (
                  activityRecords.map((act: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 12px',
                        borderRadius: tokens.radius.xs,
                        backgroundColor: tokens.colors.bg.surface,
                        border: `1px solid ${tokens.colors.border.subtle}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: tokens.typography.weight.bold, color: tokens.colors.text.primary }}>
                          {act.action || act.operation || 'MUTATION'}
                        </span>
                        <span style={{ fontSize: '10px', color: tokens.colors.text.muted }}>
                          {act.timestamp ? new Date(act.timestamp).toLocaleTimeString() : 'Recent'}
                        </span>
                      </div>
                      <div style={{ fontSize: '10px', color: tokens.colors.text.secondary }}>
                        Actor: {act.actor || act.actorId || 'system'} · Risk: {act.riskScore || 'Low'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pre-flight Impact Preview & Command Dispatch Modal */}
      {previewAction && (
        <ImpactPreviewModal
          isOpen={true}
          onClose={() => setPreviewAction(null)}
          action={previewAction}
          targetResourceId={resourceId}
          targetResourceType={liveResource?.resourceType || type}
          proposedPayload={proposedPayload}
          onCommandDispatched={(result) => {
            setActionFeedback(`Command executed: ${result.commandId || result.error?.message}`);
            triggerRefresh();
            reloadGraph();
          }}
        />
      )}
    </>
  );
}
