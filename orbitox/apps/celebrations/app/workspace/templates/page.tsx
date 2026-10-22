'use client';

import React from 'react';
import Link from 'next/link';
import { Palette, Sparkles, Check, ArrowRight, Eye, ShieldCheck, DollarSign } from 'lucide-react';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { useEcosystem } from '@/lib/ecosystem-context';

export default function WorkspaceTemplatesPage() {
  const { templates } = useEcosystem();

  return (
    <WorkspaceShell>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>Wholesale Template Catalog</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
              Licensed templates available under your Sovereign Partner tier. You retain 100% of client retail markup.
            </p>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: '#10b981',
              fontSize: '0.8rem',
              fontWeight: 700,
            }}
          >
            <ShieldCheck size={15} />
            <span>Wholesale Partner Rate: 40% Discount Applied</span>
          </div>
        </div>

        {/* Template Catalog Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {templates.map((tpl) => {
            const wholesaleCost = Math.round(tpl.priceInr * 0.6);
            const clientRetail = tpl.priceInr;
            const margin = clientRetail - wholesaleCost;

            return (
              <div key={tpl.id} className="surface-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span className="badge badge-accent">{(tpl.supportedOccasions?.[0] || 'MULTI-OCCASION').toUpperCase()}</span>
                    <span className="badge badge-success">Wholesale Licensed</span>
                  </div>

                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
                    {tpl.name}
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
                    {tpl.description || 'Artisanal template environment curated for luxury celebration showcases.'}
                  </p>

                  {/* Wholesale Pricing Breakdown */}
                  <div
                    style={{
                      padding: '14px',
                      borderRadius: '12px',
                      background: 'var(--color-surface-2)',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      marginBottom: '20px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--color-text-tertiary)' }}>Agency Wholesale Rate:</span>
                      <strong style={{ color: '#ffffff' }}>₹{wholesaleCost.toLocaleString('en-IN')}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--color-text-tertiary)' }}>Recommended Retail MSRP:</span>
                      <strong style={{ color: '#60a5fa' }}>₹{clientRetail.toLocaleString('en-IN')}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', paddingTop: '6px', borderTop: '1px solid var(--color-border)' }}>
                      <span style={{ color: '#10b981', fontWeight: 600 }}>Agency Profit Margin:</span>
                      <strong style={{ color: '#10b981' }}>+₹{margin.toLocaleString('en-IN')} (40%)</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link
                      href={`/e/vikram-ananya-wedding`}
                      target="_blank"
                      className="btn-secondary"
                      style={{ flex: 1, justifyContent: 'center', fontSize: '0.82rem', padding: '8px' }}
                    >
                      <Eye size={13} />
                      <span>Live Preview</span>
                    </Link>
                    <Link
                      href={`/create?template=${tpl.slug}`}
                      className="btn-primary"
                      style={{ flex: 1, justifyContent: 'center', fontSize: '0.82rem', padding: '8px', background: '#3b82f6' }}
                    >
                      <span>Deploy to Client</span>
                    </Link>
                  </div>
                  <Link
                    href={`/admin/template-studio?template=${tpl.slug}`}
                    className="btn-outline-gold"
                    style={{ justifyContent: 'center', fontSize: '0.8rem', padding: '6px', textAlign: 'center', textDecoration: 'none' }}
                  >
                    <Sparkles size={13} style={{ marginRight: '6px' }} />
                    <span>Configure in Template Studio (Admin)</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </WorkspaceShell>
  );
}
