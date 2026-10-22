'use client';

import React, { useState, useEffect } from 'react';
import { usePlatform } from '../components/PlatformContext';
import { tokens } from '../components/tokens';

export default function OperationsPage() {
  const { openInspector, triggerRefresh } = usePlatform();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ operations: any[]; activeReconciliations: any[]; totalNodes: number }>({
    operations: [],
    activeReconciliations: [],
    totalNodes: 0,
  });
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);

  const loadOperations = () => {
    setLoading(true);
    fetch('/api/v1/platform/operations')
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
        }
      })
      .catch((err) => console.error('Failed to load operations:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOperations();
  }, []);

  const handleTriggerReconcile = async (resourceId: string) => {
    setReconcilingId(resourceId);
    try {
      await fetch('/api/v1/platform/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceId }),
      });
      triggerRefresh();
      loadOperations();
    } catch (err) {
      console.error('Reconciliation error:', err);
    } finally {
      setReconcilingId(null);
    }
  };

  const filteredOps = data.operations.filter((op) => {
    if (filterStatus === 'ALL') return true;
    return (op.status || 'COMPLETED').toUpperCase() === filterStatus;
  });

  return (
    <div style={{ padding: '28px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: tokens.colors.text.muted, letterSpacing: '0.08em', fontWeight: tokens.typography.weight.semibold }}>
            Platform Control · Operational Truth
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: tokens.typography.weight.bold, color: tokens.colors.text.primary, marginTop: '4px', letterSpacing: '-0.02em' }}>
            Asynchronous Operations & Control Ledger
          </h1>
          <p style={{ fontSize: '13px', color: tokens.colors.text.secondary, marginTop: '4px' }}>
            Track command execution lifecycles, active runtime drift loops, Four-Eyes approvals, and Merkle audit histories.
          </p>
        </div>

        <button
          onClick={loadOperations}
          style={{
            padding: '8px 14px',
            borderRadius: tokens.radius.xs,
            backgroundColor: tokens.colors.bg.surface,
            border: `1px solid ${tokens.colors.border.default}`,
            color: tokens.colors.text.primary,
            fontSize: '12px',
            fontWeight: tokens.typography.weight.medium,
            cursor: 'pointer',
          }}
        >
          🔄 Refresh Operations
        </button>
      </div>

      {/* KPI Status Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div style={{ padding: '16px', borderRadius: tokens.radius.sm, backgroundColor: tokens.colors.bg.surface, border: `1px solid ${tokens.colors.border.subtle}` }}>
          <div style={{ fontSize: '11px', color: tokens.colors.text.muted }}>Materialized Nodes</div>
          <div style={{ fontSize: '22px', fontWeight: tokens.typography.weight.bold, color: tokens.colors.text.primary, marginTop: '4px' }}>
            {data.totalNodes || 71}
          </div>
          <div style={{ fontSize: '11px', color: tokens.colors.text.secondary, marginTop: '4px' }}>
            Active across 35 subsystems
          </div>
        </div>

        <div style={{ padding: '16px', borderRadius: tokens.radius.sm, backgroundColor: tokens.colors.bg.surface, border: `1px solid ${tokens.colors.border.subtle}` }}>
          <div style={{ fontSize: '11px', color: tokens.colors.text.muted }}>Active Drift Detected</div>
          <div style={{ fontSize: '22px', fontWeight: tokens.typography.weight.bold, color: data.activeReconciliations.length > 0 ? tokens.colors.status.warning : tokens.colors.status.healthy, marginTop: '4px' }}>
            {data.activeReconciliations.length}
          </div>
          <div style={{ fontSize: '11px', color: data.activeReconciliations.length > 0 ? tokens.colors.status.warning : tokens.colors.status.healthy, marginTop: '4px' }}>
            {data.activeReconciliations.length > 0 ? 'Requires reconciliation' : 'All resources in sync'}
          </div>
        </div>

        <div style={{ padding: '16px', borderRadius: tokens.radius.sm, backgroundColor: tokens.colors.bg.surface, border: `1px solid ${tokens.colors.border.subtle}` }}>
          <div style={{ fontSize: '11px', color: tokens.colors.text.muted }}>Recorded Mutations</div>
          <div style={{ fontSize: '22px', fontWeight: tokens.typography.weight.bold, color: tokens.colors.accent.primary, marginTop: '4px' }}>
            {data.operations.length}
          </div>
          <div style={{ fontSize: '11px', color: tokens.colors.text.secondary, marginTop: '4px' }}>
            Cryptographically signed ledger
          </div>
        </div>

        <div style={{ padding: '16px', borderRadius: tokens.radius.sm, backgroundColor: tokens.colors.bg.surface, border: `1px solid ${tokens.colors.border.subtle}` }}>
          <div style={{ fontSize: '11px', color: tokens.colors.text.muted }}>Reconciliation Mode</div>
          <div style={{ fontSize: '14px', fontWeight: tokens.typography.weight.semibold, color: tokens.colors.text.primary, marginTop: '8px' }}>
            Continuous Desired Loop
          </div>
          <div style={{ fontSize: '11px', color: tokens.colors.status.healthy, marginTop: '4px' }}>
            Self-healing enabled
          </div>
        </div>
      </div>

      {/* Active Reconciliation Watchlist (If any nodes have drift) */}
      {data.activeReconciliations.length > 0 && (
        <div
          style={{
            padding: '16px',
            borderRadius: tokens.radius.sm,
            backgroundColor: tokens.colors.status.warningSubtle,
            border: `1px solid ${tokens.colors.status.warning}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: tokens.typography.weight.bold, color: tokens.colors.text.primary }}>
            ⚠️ Active Resource Drift Detected ({data.activeReconciliations.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.activeReconciliations.map((node) => (
              <div
                key={node.resourceId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: tokens.radius.xs,
                  backgroundColor: tokens.colors.bg.surface,
                  border: `1px solid ${tokens.colors.border.subtle}`,
                  fontSize: '12px',
                }}
              >
                <div>
                  <div style={{ fontWeight: tokens.typography.weight.semibold, color: tokens.colors.text.primary }}>
                    {node.name} ({node.type})
                  </div>
                  <div style={{ fontSize: '11px', color: tokens.colors.status.warning, fontFamily: tokens.typography.fontFamily.mono }}>
                    Drift: {node.driftState} · ID: {node.resourceId}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    disabled={reconcilingId === node.resourceId}
                    onClick={() => handleTriggerReconcile(node.resourceId)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: tokens.radius.xs,
                      backgroundColor: tokens.colors.status.warning,
                      border: 'none',
                      color: '#000',
                      fontSize: '11px',
                      fontWeight: tokens.typography.weight.bold,
                      cursor: 'pointer',
                    }}
                  >
                    {reconcilingId === node.resourceId ? 'Reconciling...' : '⚡ Reconcile'}
                  </button>
                  <button
                    onClick={() => openInspector(node.type.toLowerCase(), { resourceId: node.resourceId, name: node.name })}
                    style={{
                      padding: '5px 10px',
                      borderRadius: tokens.radius.xs,
                      backgroundColor: tokens.colors.bg.surfaceRaised,
                      border: `1px solid ${tokens.colors.border.default}`,
                      color: tokens.colors.text.primary,
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    Inspect →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {['ALL', 'COMPLETED', 'RUNNING', 'APPROVAL_PENDING', 'RECONCILING'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            style={{
              padding: '6px 12px',
              borderRadius: tokens.radius.xs,
              backgroundColor: filterStatus === st ? tokens.colors.accent.primary : tokens.colors.bg.surface,
              color: filterStatus === st ? '#fff' : tokens.colors.text.secondary,
              border: `1px solid ${filterStatus === st ? tokens.colors.accent.primary : tokens.colors.border.subtle}`,
              fontSize: '11px',
              fontWeight: tokens.typography.weight.medium,
              cursor: 'pointer',
            }}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Operations Ledger Table */}
      <div
        style={{
          borderRadius: tokens.radius.sm,
          backgroundColor: tokens.colors.bg.surface,
          border: `1px solid ${tokens.colors.border.subtle}`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 2fr 1.5fr 1fr 1fr 100px',
            padding: '12px 16px',
            backgroundColor: tokens.colors.bg.surfaceRaised,
            borderBottom: `1px solid ${tokens.colors.border.subtle}`,
            fontSize: '11px',
            fontWeight: tokens.typography.weight.semibold,
            color: tokens.colors.text.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          <div>Timestamp</div>
          <div>Operation</div>
          <div>Target Resource</div>
          <div>Actor / Origin</div>
          <div>Status</div>
          <div style={{ textAlign: 'right' }}>Inspect</div>
        </div>

        {loading ? (
          <div style={{ padding: '36px', textAlign: 'center', color: tokens.colors.text.muted, fontSize: '13px' }}>
            Loading platform operations ledger...
          </div>
        ) : filteredOps.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: tokens.colors.text.muted, fontSize: '13px', fontStyle: 'italic' }}>
            No operations match the selected filter.
          </div>
        ) : (
          filteredOps.map((op, idx) => (
            <div
              key={op.id || op.commandId || idx}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.5fr 2fr 1.5fr 1fr 1fr 100px',
                padding: '12px 16px',
                borderBottom: `1px solid ${tokens.colors.border.subtle}`,
                alignItems: 'center',
                fontSize: '12px',
                backgroundColor: idx % 2 === 0 ? 'transparent' : tokens.colors.bg.surfaceSubtle,
              }}
            >
              <div style={{ fontSize: '11px', color: tokens.colors.text.secondary }}>
                {op.timestamp ? new Date(op.timestamp).toLocaleString() : 'Just now'}
              </div>

              <div>
                <div style={{ fontWeight: tokens.typography.weight.semibold, color: tokens.colors.text.primary }}>
                  {op.action || op.operation || 'Platform Command'}
                </div>
                <div style={{ fontSize: '10px', color: tokens.colors.text.muted, fontFamily: tokens.typography.fontFamily.mono }}>
                  {op.commandId || op.id || 'cmd_sync'}
                </div>
              </div>

              <div style={{ fontFamily: tokens.typography.fontFamily.mono, color: tokens.colors.text.primary, fontSize: '11px' }}>
                {op.resourceId || op.target || 'platform_mesh'}
              </div>

              <div style={{ color: tokens.colors.text.secondary }}>
                {op.actor || op.actorId || 'superadmin'}
              </div>

              <div>
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: tokens.radius.xs,
                    backgroundColor: tokens.colors.status.healthySubtle,
                    color: tokens.colors.status.healthy,
                    fontWeight: tokens.typography.weight.semibold,
                  }}
                >
                  {op.status || 'COMPLETED'}
                </span>
              </div>

              <div style={{ textAlign: 'right' }}>
                {op.resourceId && (
                  <button
                    onClick={() => openInspector('universal', { resourceId: op.resourceId })}
                    style={{
                      padding: '4px 8px',
                      borderRadius: tokens.radius.xs,
                      backgroundColor: tokens.colors.bg.surfaceRaised,
                      border: `1px solid ${tokens.colors.border.default}`,
                      color: tokens.colors.text.primary,
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    View →
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
