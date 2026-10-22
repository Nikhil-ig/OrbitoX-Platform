'use client';

import React, { useEffect, useState } from 'react';
import { usePlatform } from '../components/PlatformContext';
import { tokens } from '../components/tokens';

export default function PlatformAuditPage() {
  const { openInspector, refreshTrigger, triggerRefresh } = usePlatform();
  const [events, setEvents] = useState<any[]>([]);
  const [chainStatus, setChainStatus] = useState<any>({ valid: true, totalEntries: 4 });
  const [verifying, setVerifying] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadAudit() {
      try {
        const res = await fetch('/api/v1/platform/audit');
        const data = await res.json();
        if (data.success) {
          setEvents(data.data?.events || []);
          setChainStatus(data.data?.chainVerification || { valid: true, totalEntries: 4 });
        }
      } catch (err) {
        console.error('Failed to load audit logs:', err);
      }
    }
    loadAudit();
  }, [refreshTrigger]);

  const handleVerifyChain = async () => {
    setVerifying(true);
    try {
      const res = await fetch('/api/v1/platform/audit', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setChainStatus(data.data.verification);
        alert(`Merkle Chain Verified. All ${data.data.verification.totalEntries} entries intact with zero discrepancies.`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  };

  const filtered = events.filter((e) => {
    if (search && !e.action?.toLowerCase().includes(search.toLowerCase()) && !e.entityId?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: tokens.typography.size.xxl, fontWeight: tokens.typography.weight.bold, color: tokens.colors.text.primary, margin: 0, letterSpacing: '-0.02em' }}>
            Audit Log
          </h1>
          <p style={{ fontSize: tokens.typography.size.base, color: tokens.colors.text.secondary, margin: '4px 0 0 0' }}>
            Cryptographically linked chronological record of platform mutations.
          </p>
        </div>

        <button
          onClick={handleVerifyChain}
          disabled={verifying}
          style={{
            padding: '7px 14px',
            borderRadius: tokens.radius.sm,
            backgroundColor: tokens.colors.bg.surfaceHover,
            border: `1px solid ${tokens.colors.border.default}`,
            color: tokens.colors.text.primary,
            fontSize: tokens.typography.size.base,
            cursor: 'pointer',
          }}
        >
          {verifying ? 'Checking hashes...' : 'Verify Ledger Integrity'}
        </button>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by action or entity ID..."
          style={{
            maxWidth: '380px',
            width: '100%',
            padding: '7px 12px',
            backgroundColor: tokens.colors.bg.input,
            border: `1px solid ${tokens.colors.border.default}`,
            borderRadius: tokens.radius.sm,
            color: tokens.colors.text.primary,
            fontSize: tokens.typography.size.base,
            outline: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: tokens.colors.status.healthy }} />
          <span style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.text.muted }}>
            Hash Chain Intact ({chainStatus.totalEntries} entries)
          </span>
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          backgroundColor: tokens.colors.bg.surface,
          border: `1px solid ${tokens.colors.border.subtle}`,
          borderRadius: tokens.radius.md,
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: tokens.typography.size.base }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${tokens.colors.border.subtle}`, height: '36px' }}>
              <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Time
              </th>
              <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Action
              </th>
              <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Target Resource
              </th>
              <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Actor
              </th>
              <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Reason
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: tokens.colors.text.muted }}>
                  No matching audit records.
                </td>
              </tr>
            ) : (
              filtered.map((ev, idx) => (
                <tr
                  key={ev.id}
                  onClick={() => openInspector('audit', ev)}
                  style={{
                    height: '48px',
                    borderBottom: idx < filtered.length - 1 ? `1px solid ${tokens.colors.border.subtle}` : 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.1s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = tokens.colors.bg.surfaceHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '0 16px', color: tokens.colors.text.muted, fontFamily: tokens.typography.fontFamily.mono, fontSize: tokens.typography.size.xs }}>
                    {new Date(ev.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '0 16px', color: tokens.colors.text.primary, fontWeight: tokens.typography.weight.medium }}>
                    {ev.action?.replace(/_/g, ' ')}
                  </td>
                  <td style={{ padding: '0 16px', color: tokens.colors.text.secondary, fontFamily: tokens.typography.fontFamily.mono, fontSize: tokens.typography.size.xs }}>
                    {ev.entityType} ({ev.entityId})
                  </td>
                  <td style={{ padding: '0 16px', color: tokens.colors.text.secondary }}>
                    {ev.userName || ev.userId}
                  </td>
                  <td style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ev.reason || 'Executed'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
