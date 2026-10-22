'use client';

import React from 'react';
import { CreditCard, CheckCircle2, ShieldCheck, ArrowUpRight, Download } from 'lucide-react';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { useEcosystem } from '@/lib/ecosystem-context';

export default function WorkspaceBillingPage() {
  const { agencyPlans } = useEcosystem();

  return (
    <WorkspaceShell>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>Atelier Subscription & Billing</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
              Manage your agency tier, wholesale monthly statements, and payment methods.
            </p>
          </div>
        </div>

        {/* Current Plan Banner */}
        <div
          style={{
            padding: '28px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(29, 78, 216, 0.05) 100%)',
            border: '1.5px solid rgba(59, 130, 246, 0.35)',
            marginBottom: '28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px',
          }}
        >
          <div>
            <span className="badge badge-accent" style={{ marginBottom: '10px' }}>
              Active Atelier Subscription
            </span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
              Sovereign Enterprise Partner Tier
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)' }}>
              ₹19,999 / month • Next billing cycle: October 1, 2026 • Renews automatically
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-secondary" style={{ padding: '9px 16px', fontSize: '0.84rem' }}>
              Change Plan
            </button>
            <button className="btn-primary" style={{ padding: '9px 16px', fontSize: '0.84rem', background: '#3b82f6' }}>
              Manage Payment Method
            </button>
          </div>
        </div>

        {/* Wholesale Invoices Table */}
        <div className="surface-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '16px' }}>
            Recent Wholesale Invoices
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)', fontSize: '0.76rem' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>INVOICE ID</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>BILLING PERIOD</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>AMOUNT</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>STATUS</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>RECEIPT</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id: 'INV-2026-09', period: 'Sep 1, 2026 – Sep 30, 2026', amount: '₹19,999', status: 'Paid' },
                  { id: 'INV-2026-08', period: 'Aug 1, 2026 – Aug 31, 2026', amount: '₹19,999', status: 'Paid' },
                  { id: 'INV-2026-07', period: 'Jul 1, 2026 – Jul 31, 2026', amount: '₹19,999', status: 'Paid' },
                ].map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#ffffff' }}>{inv.id}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--color-text-secondary)' }}>{inv.period}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#ffffff' }}>{inv.amount}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className="badge badge-success">{inv.status}</span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <button className="btn-ghost btn-sm" style={{ padding: '4px 8px', fontSize: '0.78rem', gap: '4px' }}>
                        <Download size={13} />
                        <span>PDF</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}
