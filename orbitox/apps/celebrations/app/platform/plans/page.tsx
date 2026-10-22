'use client';

import React from 'react';
import { CreditCard, Check, ShieldCheck, Plus } from 'lucide-react';
import { PlatformShell } from '@/components/platform/PlatformShell';
import { useEcosystem } from '@/lib/ecosystem-context';

export default function PlatformPlansPage() {
  const { subscriptionPlans } = useEcosystem();

  return (
    <PlatformShell>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>Subscription & Pass Governance</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
              Configure consumer passes and agency monthly subscription plans, feature gates, and free trial allowances.
            </p>
          </div>
        </div>

        {/* Plans Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {subscriptionPlans.map((plan) => (
            <div key={plan.id} className="surface-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span className="badge badge-accent">
                    {plan.category === 'C2C_HOST' ? 'Consumer Host Pass' : 'Agency Atelier Tier'}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>{plan.billingPeriod}</span>
                </div>

                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
                  {plan.name}
                </h3>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', marginBottom: '14px' }}>
                  ₹{plan.priceInr.toLocaleString('en-IN')}{' '}
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>
                    ({plan.billingPeriod === 'ONE_TIME' ? 'one-time pass' : 'per month'})
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-tertiary)' }}>Max Events:</span>
                    <strong>{plan.maxEvents === 9999 ? 'Unlimited' : plan.maxEvents}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-tertiary)' }}>Max Guests:</span>
                    <strong>{plan.maxGuests === 99999 ? 'Unlimited' : plan.maxGuests}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-tertiary)' }}>Custom Domain:</span>
                    <strong>{plan.customDomainAllowed ? 'Included' : 'Not Allowed'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-tertiary)' }}>Door Staff Check-In:</span>
                    <strong>{plan.offlineDoorCheckIn ? 'Included' : 'Not Allowed'}</strong>
                  </div>
                </div>

                {/* Features */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  {plan.features.slice(0, 4).map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Check size={13} color="#10b981" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ paddingTop: '18px', borderTop: '1px solid var(--color-border)', marginTop: '20px' }}>
                <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.82rem' }}>
                  Edit Plan Parameters
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PlatformShell>
  );
}
