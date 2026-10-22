'use client';

import React from 'react';
import { Building2, Globe2, ShieldCheck, CheckCircle2, Search, ExternalLink } from 'lucide-react';
import { PlatformShell } from '@/components/platform/PlatformShell';

export default function PlatformOrganizationsPage() {
  const tenants = [
    {
      id: 'ten-vivah',
      name: 'Vivah Luxury Ateliers Pvt Ltd',
      tier: 'Sovereign Enterprise',
      domain: 'celebrate.vivahevents.com',
      ssl: 'Active (Let’s Encrypt Wildcard)',
      activeEvents: 14,
      mrr: '₹19,999',
      status: 'Active',
    },
    {
      id: 'ten-shubh',
      name: 'Shubh Bandhan Weddings',
      tier: 'Atelier Studio',
      domain: 'invites.shubhbandhan.in',
      ssl: 'Active (Auto-Provisioned)',
      activeEvents: 8,
      mrr: '₹7,999',
      status: 'Active',
    },
    {
      id: 'ten-regal',
      name: 'Regal Vows Jaipur',
      tier: 'Sovereign Enterprise',
      domain: 'invitations.regalvows.com',
      ssl: 'Active',
      activeEvents: 22,
      mrr: '₹19,999',
      status: 'Active',
    },
    {
      id: 'ten-aura',
      name: 'Aura Milestone Occasions',
      tier: 'Atelier Studio',
      domain: 'celebrate.auraoccasions.com',
      ssl: 'Active',
      activeEvents: 5,
      mrr: '₹7,999',
      status: 'Active',
    },
  ];

  return (
    <PlatformShell>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>Partner & Agency Tenants</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
              Multi-tenant root governance: zero-trust domain mapping, custom SSL certificates, and active quotas.
            </p>
          </div>
        </div>

        {/* Organizations Table */}
        <div className="surface-card" style={{ padding: '24px' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)', fontSize: '0.76rem' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>TENANT ORGANIZATION</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>TIER</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>CUSTOM DOMAIN</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>SSL CERTIFICATE</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>ACTIVE EVENTS</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>MRR</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '14px', fontWeight: 700, color: '#ffffff' }}>
                      {t.name}
                    </td>
                    <td style={{ padding: '14px' }}>
                      <span className="badge badge-accent">{t.tier}</span>
                    </td>
                    <td style={{ padding: '14px', color: '#60a5fa', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {t.domain}
                    </td>
                    <td style={{ padding: '14px', color: '#10b981', fontSize: '0.8rem' }}>
                      ✓ {t.ssl}
                    </td>
                    <td style={{ padding: '14px', fontWeight: 600, color: '#ffffff' }}>
                      {t.activeEvents} Events
                    </td>
                    <td style={{ padding: '14px', fontWeight: 700, color: '#ffffff' }}>
                      {t.mrr}
                    </td>
                    <td style={{ padding: '14px', textAlign: 'right' }}>
                      <span className="badge badge-success">{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PlatformShell>
  );
}
