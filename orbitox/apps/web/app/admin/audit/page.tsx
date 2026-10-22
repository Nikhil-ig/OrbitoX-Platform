'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PlatformAuditTrailPage() {
  const [audits, setAudits] = useState<any[]>([]);
  const [filterAction, setFilterAction] = useState('');

  const loadAudits = async () => {
    try {
      const res = await fetch('/api/v1/projects/project_restaurant_os/audit');
      if (res.ok) {
        const json = await res.json();
        setAudits(json.audits || []);
      }
    } catch (err) {
      console.error('Failed to load audits:', err);
    }
  };

  useEffect(() => {
    loadAudits();
    const interval = setInterval(loadAudits, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = audits.filter(
    (a) => !filterAction || a.action.toLowerCase().includes(filterAction.toLowerCase()) || a.actor.toLowerCase().includes(filterAction.toLowerCase())
  );

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.4px', margin: 0 }}>
              Platform Audit Ledger & Telemetry
            </h1>
            <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 }}>
              Immutable
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#94A3B8', marginTop: '6px' }}>
            Cryptographically tamper-evident event stream capturing configuration revisions, handshakes, commands, and tenant actions.
          </p>
        </div>

        <input
          type="text"
          placeholder="Filter by action or actor..."
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          style={{
            padding: '10px 16px',
            background: '#101426',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#FFFFFF',
            fontSize: '13px',
            width: '260px',
          }}
        />
      </div>

      {/* Audit Log Table */}
      <div style={{ background: '#101426', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#0B0E1B', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#64748B', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>
              <th style={{ padding: '14px 20px' }}>Timestamp</th>
              <th style={{ padding: '14px 20px' }}>Actor</th>
              <th style={{ padding: '14px 20px' }}>Action</th>
              <th style={{ padding: '14px 20px' }}>Status</th>
              <th style={{ padding: '14px 20px' }}>Details / Diff</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '32px 20px', textAlign: 'center', color: '#64748B' }}>
                  No audit events recorded yet.
                </td>
              </tr>
            ) : (
              filtered.map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '14px 20px', color: '#94A3B8', whiteSpace: 'nowrap' }}>
                    {new Date(a.timestamp).toLocaleTimeString()} · {new Date(a.timestamp).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <code style={{ color: '#818CF8', fontSize: '12px' }}>{a.actor}</code>
                  </td>
                  <td style={{ padding: '14px 20px', fontWeight: 700, color: '#FFFFFF' }}>
                    {a.action}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 800,
                        background: a.status === 'SUCCESS' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: a.status === 'SUCCESS' ? '#10B981' : '#EF4444',
                      }}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', color: '#64748B', fontSize: '12px', fontFamily: 'monospace' }}>
                    {a.details ? JSON.stringify(a.details) : '—'}
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
