'use client';

import React, { useEffect, useState } from 'react';
import { usePlatform } from '../components/PlatformContext';
import { tokens } from '../components/tokens';

export default function PlatformApprovalsPage() {
  const { openInspector, refreshTrigger, triggerRefresh } = usePlatform();
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [operatorRole, setOperatorRole] = useState('SECURITY_ADMIN');
  const [comments, setComments] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/v1/platform/approvals');
        const json = await res.json();
        if (json.success) setRequests(json.data.requests || []);
      } catch (err) {
        console.error('Failed to load approvals:', err);
      }
    }
    loadData();
  }, [refreshTrigger]);

  const handleAction = async (requestId: string, stageId: string, action: 'APPROVE' | 'REJECT') => {
    setProcessing(true);
    try {
      const res = await fetch('/api/v1/platform/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          stageId,
          action,
          comments: comments || 'Reviewed and authorized.',
          operatorRoles: [operatorRole],
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSelectedReq(null);
        setComments('');
        triggerRefresh();
      } else {
        alert(`Action failed: ${json.error?.message}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const pending = requests.filter((r) => r.status === 'PENDING');
  const past = requests.filter((r) => r.status !== 'PENDING');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1200px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: tokens.typography.size.xxl, fontWeight: tokens.typography.weight.bold, color: tokens.colors.text.primary, margin: 0, letterSpacing: '-0.02em' }}>
          Approvals
        </h1>
        <p style={{ fontSize: tokens.typography.size.base, color: tokens.colors.text.secondary, margin: '4px 0 0 0' }}>
          Four-Eyes multi-operator authorization queue for high-impact platform actions.
        </p>
      </div>

      {/* Pending Queue */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, color: tokens.colors.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Pending Sign-Off ({pending.length})
        </div>

        <div
          style={{
            backgroundColor: tokens.colors.bg.surface,
            border: `1px solid ${tokens.colors.border.subtle}`,
            borderRadius: tokens.radius.md,
            overflow: 'hidden',
          }}
        >
          {pending.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: tokens.colors.text.muted, fontSize: tokens.typography.size.base }}>
              No actions currently pending approval.
            </div>
          ) : (
            pending.map((req, idx) => (
              <div
                key={req.id}
                style={{
                  padding: '16px 20px',
                  borderBottom: idx < pending.length - 1 ? `1px solid ${tokens.colors.border.subtle}` : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: tokens.colors.status.warning }} />
                    <span style={{ fontSize: tokens.typography.size.base, fontWeight: tokens.typography.weight.medium, color: tokens.colors.text.primary }}>
                      {req.policyId?.replace('policy_', '').replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.text.muted, marginTop: '4px' }}>
                    Target: {req.entityType} ({req.entityId}) · Requested by {req.requestedBy}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setSelectedReq(req)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: tokens.radius.sm,
                      backgroundColor: tokens.colors.bg.surfaceHover,
                      border: `1px solid ${tokens.colors.border.default}`,
                      color: tokens.colors.text.primary,
                      fontSize: tokens.typography.size.xs,
                      cursor: 'pointer',
                    }}
                  >
                    Review & Act
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Past Completed */}
      {past.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, color: tokens.colors.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Completed Approvals ({past.length})
          </div>

          <div
            style={{
              backgroundColor: tokens.colors.bg.surface,
              border: `1px solid ${tokens.colors.border.subtle}`,
              borderRadius: tokens.radius.md,
              overflow: 'hidden',
            }}
          >
            {past.map((req, idx) => (
              <div
                key={req.id}
                style={{
                  padding: '14px 20px',
                  borderBottom: idx < past.length - 1 ? `1px solid ${tokens.colors.border.subtle}` : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: tokens.typography.size.base, color: tokens.colors.text.primary }}>
                    {req.policyId?.replace('policy_', '').replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.text.muted, marginTop: '2px' }}>
                    Target: {req.entityId} · Signer: {req.stages?.[0]?.approvedBy || 'System'}
                  </div>
                </div>

                <span style={{ fontSize: tokens.typography.size.xs, color: req.status === 'APPROVED' ? tokens.colors.status.healthy : tokens.colors.status.danger }}>
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Review Modal */}
      {selectedReq && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: tokens.colors.bg.surfaceRaised,
              border: `1px solid ${tokens.colors.border.strong}`,
              borderRadius: tokens.radius.lg,
              boxShadow: tokens.shadow.modal,
              width: '100%',
              maxWidth: '480px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: tokens.typography.size.lg, fontWeight: tokens.typography.weight.bold, color: tokens.colors.text.primary, margin: 0 }}>
                Review Quorum Approval
              </h2>
              <button
                onClick={() => setSelectedReq(null)}
                style={{ background: 'transparent', border: 'none', color: tokens.colors.text.muted, fontSize: '16px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.text.secondary }}>
              Operation: <span style={{ color: tokens.colors.text.primary, fontWeight: tokens.typography.weight.medium }}>{selectedReq.policyId}</span>
              <br />
              Target: <span style={{ fontFamily: tokens.typography.fontFamily.mono, color: tokens.colors.text.primary }}>{selectedReq.entityType} ({selectedReq.entityId})</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: tokens.typography.size.xs, color: tokens.colors.text.secondary, marginBottom: '4px' }}>
                Signer Role
              </label>
              <select
                value={operatorRole}
                onChange={(e) => setOperatorRole(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: tokens.colors.bg.input,
                  border: `1px solid ${tokens.colors.border.default}`,
                  borderRadius: tokens.radius.sm,
                  color: tokens.colors.text.primary,
                  fontSize: tokens.typography.size.base,
                  outline: 'none',
                }}
              >
                <option value="SECURITY_ADMIN">Security Admin</option>
                <option value="PLATFORM_SUPERADMIN">Platform SuperAdmin</option>
                <option value="INFRA_LEAD">Infrastructure Lead</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: tokens.typography.size.xs, color: tokens.colors.text.secondary, marginBottom: '4px' }}>
                Audit Note / Verification Reason
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Reviewed and authorized change..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: tokens.colors.bg.input,
                  border: `1px solid ${tokens.colors.border.default}`,
                  borderRadius: tokens.radius.sm,
                  color: tokens.colors.text.primary,
                  fontSize: tokens.typography.size.base,
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button
                disabled={processing}
                onClick={() => handleAction(selectedReq.id, selectedReq.stages[0]?.stageId || 'stage_1', 'REJECT')}
                style={{
                  padding: '7px 12px',
                  borderRadius: tokens.radius.sm,
                  backgroundColor: 'transparent',
                  border: `1px solid ${tokens.colors.status.danger}`,
                  color: tokens.colors.status.danger,
                  fontSize: tokens.typography.size.base,
                  cursor: 'pointer',
                }}
              >
                Reject
              </button>
              <button
                disabled={processing}
                onClick={() => handleAction(selectedReq.id, selectedReq.stages[0]?.stageId || 'stage_1', 'APPROVE')}
                style={{
                  padding: '7px 14px',
                  borderRadius: tokens.radius.sm,
                  backgroundColor: tokens.colors.text.primary,
                  color: tokens.colors.text.inverted,
                  fontWeight: tokens.typography.weight.semibold,
                  fontSize: tokens.typography.size.base,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {processing ? 'Processing...' : 'Authorize Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
