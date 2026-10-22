'use client';

import React from 'react';
import { Server, Database, HardDrive, Wifi, ShieldCheck, Activity } from 'lucide-react';
import { PlatformShell } from '@/components/platform/PlatformShell';

export default function PlatformUsagePage() {
  const quotas = [
    { title: 'Edge CDN Bandwidth', used: '4.8 TB', total: '20 TB', pct: 24, icon: <Wifi size={18} color="#60a5fa" /> },
    { title: 'High-Res Asset Storage', used: '640 GB', total: '2 TB', pct: 32, icon: <HardDrive size={18} color="#10b981" /> },
    { title: 'Active Tenant Databases', used: '128 DBs', total: '500 DBs', pct: 25, icon: <Database size={18} color="#f59e0b" /> },
    { title: 'Cryptographic Signatures', used: '1.2M Signs', total: '10M Signs', pct: 12, icon: <ShieldCheck size={18} color="#a78bfa" /> },
  ];

  return (
    <PlatformShell>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>System Usage & Quotas</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
              Platform infrastructure utilization: global edge traffic, media storage, and tenant isolation metrics.
            </p>
          </div>
        </div>

        {/* Quota Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          {quotas.map((q, idx) => (
            <div key={idx} className="surface-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>{q.title}</span>
                {q.icon}
              </div>

              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
                {q.used}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--color-text-tertiary)', marginBottom: '14px' }}>
                Limit: {q.total} allocated
              </div>

              {/* Progress bar */}
              <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
                <div style={{ width: `${q.pct}%`, height: '100%', background: 'var(--color-accent)', borderRadius: '999px' }} />
              </div>
            </div>
          ))}
        </div>

        {/* System Health Status */}
        <div className="surface-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Activity size={18} color="#10b981" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
              Infrastructure Service Mesh Status
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.86rem' }}>
            {[
              { service: 'Multi-Tenant Edge Router', status: 'Operational', latency: '12ms' },
              { service: 'Ed25519 Signature Verifier', status: 'Operational', latency: '2ms' },
              { service: 'Dynamic QR Pass Generator', status: 'Operational', latency: '45ms' },
              { service: 'Automated Let’s Encrypt SSL Manager', status: 'Operational', latency: 'Idle' },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div style={{ fontWeight: 600, color: '#ffffff' }}>{s.service}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>{s.latency}</span>
                  <span className="badge badge-success">{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PlatformShell>
  );
}
