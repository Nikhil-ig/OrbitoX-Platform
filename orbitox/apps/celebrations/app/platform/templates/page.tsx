'use client';

import React from 'react';
import { Palette, Eye, EyeOff, DollarSign, Sparkles } from 'lucide-react';
import { PlatformShell } from '@/components/platform/PlatformShell';
import { useEcosystem } from '@/lib/ecosystem-context';

export default function PlatformTemplatesPage() {
  const { templates, toggleTemplateVisibility, updateTemplatePricing } = useEcosystem();

  return (
    <PlatformShell>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>Global Template Catalog Governance</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
              Control global template availability, wholesale and consumer retail pricing, and free trial allowances.
            </p>
          </div>
        </div>

        {/* Templates Governance Table */}
        <div className="surface-card" style={{ padding: '24px' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)', fontSize: '0.76rem' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>TEMPLATE NAME</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>OCCASION</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>PRICING TIER</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>RETAIL PRICE (INR)</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>FREE TRIAL DAYS</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>VISIBILITY</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>TOGGLE</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((tpl) => (
                  <tr key={tpl.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '14px', fontWeight: 700, color: '#ffffff' }}>
                      {tpl.name}
                    </td>
                    <td style={{ padding: '14px' }}>
                      <span className="badge badge-accent">{(tpl.supportedOccasions?.[0] || 'GENERAL').toUpperCase()}</span>
                    </td>
                    <td style={{ padding: '14px' }}>
                      <span className="badge badge-neutral">{tpl.pricingType}</span>
                    </td>
                    <td style={{ padding: '14px', fontWeight: 600, color: '#ffffff' }}>
                      ₹{tpl.priceInr.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '14px', color: 'var(--color-text-secondary)' }}>
                      {tpl.freeTrialDays} Days Free Pass
                    </td>
                    <td style={{ padding: '14px' }}>
                      {tpl.status === 'ACTIVE' ? (
                        <span className="badge badge-success">Visible Globally</span>
                      ) : (
                        <span className="badge badge-warning">Hidden from Catalog</span>
                      )}
                    </td>
                    <td style={{ padding: '14px', textAlign: 'right' }}>
                      <button
                        onClick={() => toggleTemplateVisibility(tpl.slug, tpl.status === 'ACTIVE')}
                        className="btn-secondary btn-sm"
                        style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                      >
                        {tpl.status === 'ACTIVE' ? 'Hide Template' : 'Publish Template'}
                      </button>
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
