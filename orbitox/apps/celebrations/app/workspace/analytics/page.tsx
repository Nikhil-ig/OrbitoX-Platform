'use client';

import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Eye,
  CheckCircle2,
  Smartphone,
  Calendar,
  Download,
} from 'lucide-react';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { useEcosystem } from '@/lib/ecosystem-context';

export default function WorkspaceAnalyticsPage() {
  const { agencyProjects } = useEcosystem();

  return (
    <WorkspaceShell>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>Cross-Event Telemetry</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
              Real-time analytics across all {agencyProjects.length} client celebration invitations.
            </p>
          </div>

          <button className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem', gap: '6px' }}>
            <Download size={13} />
            <span>Export Analytics CSV</span>
          </button>
        </div>

        {/* Top Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          <div className="surface-card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.76rem', color: 'var(--color-text-tertiary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
              Total Invitation Views
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>18,420</div>
            <div style={{ fontSize: '0.78rem', color: '#10b981', marginTop: '6px' }}>+24% vs last month</div>
          </div>

          <div className="surface-card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.76rem', color: 'var(--color-text-tertiary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
              Overall RSVP Conversion
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>88.4%</div>
            <div style={{ fontSize: '0.78rem', color: '#10b981', marginTop: '6px' }}>Industry average: 64%</div>
          </div>

          <div className="surface-card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.76rem', color: 'var(--color-text-tertiary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
              Door Pass Adoption
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>94.2%</div>
            <div style={{ fontSize: '0.78rem', color: '#60a5fa', marginTop: '6px' }}>Saved to Apple / Google Wallet</div>
          </div>

          <div className="surface-card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.76rem', color: 'var(--color-text-tertiary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
              Mobile Device Traffic
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>91.8%</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '6px' }}>iOS: 72% • Android: 28%</div>
          </div>
        </div>

        {/* Per-Event Breakdown Table */}
        <div className="surface-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '16px' }}>
            Event Performance Breakdown
          </h2>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)', fontSize: '0.76rem' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>EVENT TITLE</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>CLIENT</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>INVITED</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>CONFIRMED</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>DOOR SCANS</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>COMPLETION VELOCITY</th>
                </tr>
              </thead>
              <tbody>
                {agencyProjects.map((p) => {
                  const confirmed = Math.round(p.totalGuests * 0.88);
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#ffffff' }}>{p.eventTitle}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--color-text-secondary)' }}>{p.clientName}</td>
                      <td style={{ padding: '12px 14px' }}>{p.totalGuests}</td>
                      <td style={{ padding: '12px 14px', color: '#10b981', fontWeight: 600 }}>{confirmed} ({Math.round((confirmed / p.totalGuests) * 100)}%)</td>
                      <td style={{ padding: '12px 14px' }}>{p.checkedInGuests}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--color-text-secondary)' }}>4.2 days avg response</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}
