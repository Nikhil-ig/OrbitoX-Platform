'use client';

import React, { useState, useEffect } from 'react';
import { tokens } from './tokens';

export interface ImpactPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: string;
  targetResourceId: string;
  targetResourceType?: string;
  proposedPayload?: Record<string, unknown>;
  onCommandDispatched?: (result: any) => void;
}

export function ImpactPreviewModal({
  isOpen,
  onClose,
  action,
  targetResourceId,
  targetResourceType,
  proposedPayload,
  onCommandDispatched,
}: ImpactPreviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [impactData, setImpactData] = useState<any>(null);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !targetResourceId) return;
    setLoading(true);
    setSimulationResult(null);
    setExecutionMessage(null);

    fetch('/api/v1/platform/impact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        targetResourceId,
        proposedPayload: proposedPayload || {},
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setImpactData(data.data);
        }
      })
      .catch((err) => console.error('Failed to calculate impact:', err))
      .finally(() => setLoading(false));
  }, [isOpen, action, targetResourceId, proposedPayload]);

  if (!isOpen) return null;

  const handleDryRunSimulation = async () => {
    setIsExecuting(true);
    setExecutionMessage(null);
    try {
      const res = await fetch('/api/v1/platform/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandId: `cmd_sim_${Date.now()}`,
          idempotencyKey: `idem_sim_${Date.now()}_${targetResourceId}`,
          resourceId: targetResourceId,
          operation: action,
          dryRun: true,
          desiredPayload: proposedPayload,
          actor: {
            userId: 'operator_preview',
            role: 'PlatformSuperAdmin',
          },
        }),
      });
      const data = await res.json();
      setSimulationResult(data);
    } catch (err: any) {
      setExecutionMessage(`Simulation error: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleConfirmDispatch = async () => {
    setIsExecuting(true);
    setExecutionMessage(null);
    try {
      const res = await fetch('/api/v1/platform/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandId: `cmd_live_${Date.now()}`,
          idempotencyKey: `idem_live_${Date.now()}_${targetResourceId}`,
          resourceId: targetResourceId,
          operation: action,
          dryRun: false,
          desiredPayload: proposedPayload,
          actor: {
            userId: 'operator_root',
            role: 'PlatformSuperAdmin',
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setExecutionMessage('Command executed successfully and state persisted.');
        if (onCommandDispatched) onCommandDispatched(data);
        setTimeout(() => onClose(), 1500);
      } else if (data.error?.code === 'APPROVAL_REQUIRED') {
        setExecutionMessage(`Four-Eyes Quorum Required: Request ${data.error.details?.approvalId} enqueued for dual sign-off.`);
        if (onCommandDispatched) onCommandDispatched(data);
      } else {
        setExecutionMessage(`Execution blocked: ${data.error?.message || 'Policy violation'}`);
      }
    } catch (err: any) {
      setExecutionMessage(`Dispatch error: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const riskScore = impactData?.riskScore ?? 0;
  const riskLevel = impactData?.riskLevel ?? 'LOW';
  const verdict = impactData?.verdict ?? 'PERMITTED';

  const riskColor =
    riskScore >= 70
      ? tokens.colors.status.danger
      : riskScore >= 40
      ? tokens.colors.status.warning
      : tokens.colors.status.healthy;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '560px',
          maxHeight: '90vh',
          backgroundColor: tokens.colors.bg.surfaceRaised,
          border: `1px solid ${tokens.colors.border.strong}`,
          borderRadius: tokens.radius.md,
          boxShadow: tokens.shadow.modal,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${tokens.colors.border.subtle}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontSize: tokens.typography.size.micro,
                fontWeight: tokens.typography.weight.semibold,
                color: tokens.colors.accent.brand,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Control Plane Brain · Pre-Flight Blast Radius
            </div>
            <div
              style={{
                fontSize: tokens.typography.size.lg,
                fontWeight: tokens.typography.weight.bold,
                color: tokens.colors.text.primary,
                marginTop: '2px',
              }}
            >
              Impact Simulation: {action}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: tokens.colors.text.muted,
              fontSize: '18px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
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
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: tokens.colors.text.muted }}>
              Calculating blast radius and DAG traversal...
            </div>
          ) : (
            <>
              {/* Target Resource Banner */}
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: tokens.colors.bg.surface,
                  border: `1px solid ${tokens.colors.border.default}`,
                  borderRadius: tokens.radius.sm,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: tokens.colors.text.muted }}>Target Resource</div>
                  <div
                    style={{
                      fontSize: '13px',
                      fontFamily: tokens.typography.fontFamily.mono,
                      color: tokens.colors.text.primary,
                      marginTop: '2px',
                    }}
                  >
                    {targetResourceId}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: tokens.radius.xs,
                    backgroundColor: tokens.colors.bg.surfaceHover,
                    color: tokens.colors.text.secondary,
                    border: `1px solid ${tokens.colors.border.subtle}`,
                  }}
                >
                  {targetResourceType || 'Universal Node'}
                </div>
              </div>

              {/* Risk Assessment Gauge */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    padding: '12px',
                    borderRadius: tokens.radius.sm,
                    backgroundColor: tokens.colors.bg.surface,
                    border: `1px solid ${tokens.colors.border.subtle}`,
                  }}
                >
                  <div style={{ fontSize: '11px', color: tokens.colors.text.muted }}>Risk Rating</div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: tokens.typography.weight.bold,
                      color: riskColor,
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {riskScore}/100
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: tokens.radius.xs,
                        backgroundColor: `${riskColor}15`,
                        color: riskColor,
                        fontWeight: tokens.typography.weight.semibold,
                      }}
                    >
                      {riskLevel}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    padding: '12px',
                    borderRadius: tokens.radius.sm,
                    backgroundColor: tokens.colors.bg.surface,
                    border: `1px solid ${tokens.colors.border.subtle}`,
                  }}
                >
                  <div style={{ fontSize: '11px', color: tokens.colors.text.muted }}>Dispatch Policy</div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: tokens.typography.weight.semibold,
                      color:
                        verdict === 'REQUIRES_APPROVAL'
                          ? tokens.colors.status.warning
                          : verdict === 'BLOCKED'
                          ? tokens.colors.status.danger
                          : tokens.colors.status.healthy,
                      marginTop: '6px',
                    }}
                  >
                    {verdict === 'REQUIRES_APPROVAL'
                      ? 'Four-Eyes Quorum Required'
                      : verdict === 'BLOCKED'
                      ? 'Action Strictly Blocked'
                      : 'Direct Execution Permitted'}
                  </div>
                </div>
              </div>

              {/* Direct & Transitive Blast Radius */}
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
                  Impacted Downstream Dependencies ({impactData?.directImpacts?.length || 0})
                </div>

                {impactData?.directImpacts && impactData.directImpacts.length > 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      maxHeight: '140px',
                      overflowY: 'auto',
                    }}
                  >
                    {impactData.directImpacts.map((dep: any) => (
                      <div
                        key={dep.resourceId}
                        style={{
                          padding: '8px 10px',
                          borderRadius: tokens.radius.xs,
                          backgroundColor: tokens.colors.bg.surface,
                          border: `1px solid ${tokens.colors.border.subtle}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '12px',
                        }}
                      >
                        <span style={{ color: tokens.colors.text.primary, fontWeight: tokens.typography.weight.medium }}>
                          {dep.name || dep.resourceId}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontFamily: tokens.typography.fontFamily.mono,
                            color: tokens.colors.text.muted,
                          }}
                        >
                          {dep.resourceType}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: tokens.colors.text.muted, fontStyle: 'italic' }}>
                    No cascading downstream impacts detected. Blast radius is strictly isolated to this resource.
                  </div>
                )}
              </div>

              {/* Suggested Mitigations */}
              {impactData?.suggestedMitigations && impactData.suggestedMitigations.length > 0 && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: tokens.radius.sm,
                    backgroundColor: tokens.colors.status.warningSubtle,
                    border: `1px solid ${tokens.colors.status.warning}`,
                    fontSize: '12px',
                    color: tokens.colors.status.warning,
                  }}
                >
                  <div style={{ fontWeight: tokens.typography.weight.semibold, marginBottom: '4px' }}>
                    Suggested Mitigations:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '16px' }}>
                    {impactData.suggestedMitigations.map((mit: string, i: number) => (
                      <li key={i}>{mit}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Simulation Result (if Dry-Run executed) */}
              {simulationResult && (
                <div
                  style={{
                    padding: '12px',
                    backgroundColor: tokens.colors.bg.surface,
                    border: `1px solid ${tokens.colors.accent.primaryBorder}`,
                    borderRadius: tokens.radius.sm,
                    fontSize: '12px',
                  }}
                >
                  <div
                    style={{
                      color: tokens.colors.accent.brand,
                      fontWeight: tokens.typography.weight.semibold,
                      marginBottom: '6px',
                    }}
                  >
                    Dry-Run Execution Plan Verified ({simulationResult.executionPlan?.length} Steps):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {simulationResult.executionPlan?.map((step: string, i: number) => (
                      <div key={i} style={{ color: tokens.colors.text.secondary, fontSize: '11px' }}>
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Execution Feedback Banner */}
              {executionMessage && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: tokens.radius.sm,
                    backgroundColor: tokens.colors.status.infoSubtle,
                    border: `1px solid ${tokens.colors.status.info}`,
                    color: tokens.colors.status.info,
                    fontSize: '12px',
                  }}
                >
                  {executionMessage}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: `1px solid ${tokens.colors.border.subtle}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: tokens.colors.bg.surface,
          }}
        >
          <button
            disabled={isExecuting || loading}
            onClick={handleDryRunSimulation}
            style={{
              padding: '6px 12px',
              borderRadius: tokens.radius.sm,
              backgroundColor: 'transparent',
              border: `1px solid ${tokens.colors.border.default}`,
              color: tokens.colors.text.secondary,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {isExecuting ? 'Simulating...' : 'Run Dry-Run Simulation'}
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '6px 12px',
                borderRadius: tokens.radius.sm,
                backgroundColor: 'transparent',
                border: `1px solid ${tokens.colors.border.subtle}`,
                color: tokens.colors.text.muted,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              disabled={isExecuting || loading || verdict === 'BLOCKED'}
              onClick={handleConfirmDispatch}
              style={{
                padding: '6px 14px',
                borderRadius: tokens.radius.sm,
                backgroundColor:
                  verdict === 'BLOCKED'
                    ? tokens.colors.bg.surfaceHover
                    : verdict === 'REQUIRES_APPROVAL'
                    ? tokens.colors.status.warning
                    : tokens.colors.accent.primary,
                border: 'none',
                color: verdict === 'REQUIRES_APPROVAL' ? '#000' : '#FFF',
                fontSize: '12px',
                fontWeight: tokens.typography.weight.medium,
                cursor: verdict === 'BLOCKED' ? 'not-allowed' : 'pointer',
              }}
            >
              {isExecuting
                ? 'Dispatching...'
                : verdict === 'REQUIRES_APPROVAL'
                ? 'Submit for Four-Eyes Quorum'
                : 'Confirm & Mutate Desired State'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
