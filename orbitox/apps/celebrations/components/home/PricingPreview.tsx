'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, ArrowRight, Sparkles, Building2, Heart } from 'lucide-react';

export function PricingPreview() {
  const [billingType, setBillingType] = useState<'C2C' | 'B2B'>('C2C');

  const c2cPlans = [
    {
      id: 'free',
      name: 'Free Experience',
      badge: 'Test Drive',
      price: '₹0',
      period: 'forever',
      description: 'Design and preview your full interactive invitation with test RSVPs.',
      features: [
        'Full 9-step creation studio',
        'Up to 25 confirmed guest RSVPs',
        'Standard interactive themes',
        'Celebrations subtle watermark',
      ],
      ctaText: 'Start Free Trial',
      ctaHref: '/create',
      btnClass: 'btn-secondary',
    },
    {
      id: 'host-pro',
      name: 'Premier Celebration',
      badge: 'Most Popular',
      price: '₹2,499',
      period: 'one-time pass',
      description: 'The definitive complete digital suite for your wedding or milestone.',
      features: [
        'Unlimited guest RSVPs & plus-ones',
        'Remove all Celebrations watermarks',
        'Direct UPI & Card Shagun collection (0% fee)',
        'Apple & Google Wallet QR gate passes',
        'Custom ambient audio soundscapes',
      ],
      ctaText: 'Choose Premier',
      ctaHref: '/create?plan=host-pro',
      btnClass: 'btn-primary',
      featured: true,
    },
    {
      id: 'host-bespoke',
      name: 'Royal Concierge',
      badge: 'VIP White-Glove',
      price: '₹6,999',
      period: 'one-time pass',
      description: 'Dedicated custom domain, automated WhatsApp concierge, and VIP support.',
      features: [
        'Everything in Premier Celebration',
        'Custom vanity domain (e.g. rohit-priya.com)',
        'Automated WhatsApp RSVP delivery bot',
        'Concierge design assistance & photo retouching',
        'Priority 24/7 day-of-event standby',
      ],
      ctaText: 'Get Royal Bespoke',
      ctaHref: '/pricing',
      btnClass: 'btn-secondary',
    },
  ];

  const b2bPlans = [
    {
      id: 'agency-starter',
      name: 'Atelier Studio',
      badge: 'Boutique Planners',
      price: '₹7,999',
      period: 'per month',
      description: 'For independent event planners managing up to 10 concurrent clients.',
      features: [
        '10 active client events simultaneously',
        'Wholesale template rates (keep your client markup)',
        'Offline-capable door staff QR scanner app',
        'Client review & approval collaboration links',
      ],
      ctaText: 'Start Agency Trial',
      ctaHref: '/workspace',
      btnClass: 'btn-secondary',
    },
    {
      id: 'agency-pro',
      name: 'Sovereign Atelier',
      badge: 'Premier Agencies',
      price: '₹19,999',
      period: 'per month',
      description: 'Complete white-label solution for premier luxury event companies.',
      features: [
        'Unlimited active client events',
        '100% white-label client portal with your agency logo',
        'Custom agency root domain with wildcard SSL',
        'Unlimited door staff passcodes',
        'Dedicated account manager & SLA',
      ],
      ctaText: 'Launch Sovereign Workspace',
      ctaHref: '/workspace',
      btnClass: 'btn-primary',
      featured: true,
    },
  ];

  const currentPlans = billingType === 'C2C' ? c2cPlans : b2bPlans;

  return (
    <section
      id="pricing"
      style={{
        padding: '96px 0',
        background: 'linear-gradient(180deg, rgba(9, 9, 11, 0) 0%, rgba(17, 17, 20, 0.5) 100%)',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 48px auto' }}>
          <span className="kicker" style={{ marginBottom: '16px' }}>
            Transparent Investment
          </span>
          <h2
            style={{
              fontSize: 'clamp(2rem, 3.8vw, 2.8rem)',
              lineHeight: 1.15,
              fontWeight: 800,
              letterSpacing: '-0.025em',
              marginBottom: '16px',
            }}
          >
            Simple, Honest Pricing
          </h2>
          <p
            style={{
              fontSize: '1.05rem',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
              marginBottom: '32px',
            }}
          >
            No hidden per-guest surcharges. Choose a one-time pass for your personal celebration, or an agency
            workspace for client portfolios.
          </p>

          {/* Toggle C2C / B2B */}
          <div
            style={{
              display: 'inline-flex',
              padding: '4px',
              borderRadius: '999px',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
            }}
          >
            <button
              onClick={() => setBillingType('C2C')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 20px',
                borderRadius: '999px',
                fontSize: '0.85rem',
                fontWeight: billingType === 'C2C' ? 700 : 500,
                background: billingType === 'C2C' ? 'var(--color-surface-3)' : 'transparent',
                color: billingType === 'C2C' ? '#ffffff' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Heart size={15} color="#f472b6" />
              <span>For Couples & Hosts (One-Time)</span>
            </button>
            <button
              onClick={() => setBillingType('B2B')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 20px',
                borderRadius: '999px',
                fontSize: '0.85rem',
                fontWeight: billingType === 'B2B' ? 700 : 500,
                background: billingType === 'B2B' ? 'var(--color-surface-3)' : 'transparent',
                color: billingType === 'B2B' ? '#ffffff' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Building2 size={15} color="#60a5fa" />
              <span>For Planners & Agencies (Monthly)</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fit, minmax(300px, 1fr))`,
            gap: '24px',
            alignItems: 'stretch',
            maxWidth: billingType === 'B2B' ? '820px' : '1100px',
            margin: '0 auto',
          }}
        >
          {currentPlans.map((plan) => (
            <div
              key={plan.id}
              style={{
                position: 'relative',
                background: plan.featured
                  ? 'linear-gradient(180deg, rgba(28, 26, 38, 0.95) 0%, rgba(17, 17, 22, 0.95) 100%)'
                  : 'var(--color-surface-1)',
                border: plan.featured
                  ? '1.5px solid var(--color-accent)'
                  : '1px solid var(--color-border)',
                borderRadius: '20px',
                padding: '32px 28px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: plan.featured
                  ? '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 32px var(--color-accent-glow)'
                  : 'none',
              }}
              className="surface-card"
            >
              {plan.featured && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '3px 12px',
                    borderRadius: '999px',
                    background: 'var(--color-accent)',
                    color: '#ffffff',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  {plan.badge}
                </div>
              )}

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>{plan.name}</h3>
                  {!plan.featured && (
                    <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>
                      {plan.badge}
                    </span>
                  )}
                </div>

                {/* Price block */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '2.4rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em' }}>
                      {plan.price}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>
                      / {plan.period}
                    </span>
                  </div>
                </div>

                <p
                  style={{
                    fontSize: '0.86rem',
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.5,
                    marginBottom: '24px',
                    minHeight: '38px',
                  }}
                >
                  {plan.description}
                </p>

                {/* Features List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
                  {plan.features.map((feat, fIdx) => (
                    <div key={fIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.84rem' }}>
                      <Check size={16} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ color: 'var(--color-text-secondary)' }}>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href={plan.ctaHref}
                className={plan.btnClass}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '11px 18px',
                  fontSize: '0.88rem',
                }}
              >
                <span>{plan.ctaText}</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          ))}
        </div>

        {/* Footnote */}
        <div style={{ textAlign: 'center', marginTop: '48px' }}>
          <Link
            href="/pricing"
            style={{
              fontSize: '0.88rem',
              color: 'var(--color-text-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Compare all features in detail on the full pricing page</span>
            <ArrowRight size={14} color="var(--color-accent)" />
          </Link>
        </div>
      </div>
    </section>
  );
}
