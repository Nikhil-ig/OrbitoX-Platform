'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Building2, Check, ChevronDown, ChevronUp, Crown, Heart, Sparkles, ArrowRight } from 'lucide-react';
import { useEcosystem } from '../../lib/ecosystem-context';

export default function PricingPage() {
  const { c2cPlans, agencyPlans, currentRole } = useEcosystem();
  const [pricingTab, setPricingTab] = useState<'C2C' | 'AGENCY'>(currentRole === 'AGENCY_PLANNER' ? 'AGENCY' : 'C2C');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Can I change my visual theme after creating my invitation?',
      a: 'Yes. The platform separates content from design, so you can refresh the look without losing your guest list, timeline, or RSVP flow.',
    },
    {
      q: 'How does custom domain setup work?',
      a: 'Premium plans support custom domains and secure hosting so your celebration experience feels like a polished digital product instead of a hosted template.',
    },
    {
      q: 'What is included in the Agency plan?',
      a: 'Agency accounts include more capacity, shared workspaces, higher guest limits, and operational controls specifically designed for multi-event planning.',
    },
    {
      q: 'Can I export guest data and planning details?',
      a: 'Yes. The dashboard makes it easy to export guest manifests, dietary notes, and other event planning information for smoother coordination.',
    },
    {
      q: 'Is the experience secure?',
      a: 'Absolutely. The system is designed around permission-aware access, secure guest experiences, and professional event hosting patterns.',
    },
  ];

  const activePlans = pricingTab === 'C2C' ? c2cPlans : agencyPlans;

  return (
    <main style={{ minHeight: '100vh', background: 'radial-gradient(circle at top, rgba(216,179,106,0.12), transparent 18%), linear-gradient(180deg, #090b10 0%, #0d1118 100%)', color: '#f5f7fb', padding: '32px 0 80px' }}>
      <div className="container">
        <header style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 999, background: 'rgba(216,179,106,0.12)', border: '1px solid rgba(216,179,106,0.26)', color: '#f5e5bf', fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            <Crown size={14} /> luxury plans
          </div>
          <h1 style={{ marginTop: 18, fontSize: 'clamp(2.4rem, 4vw, 4rem)', letterSpacing: '-0.08em' }}>Choose the plan that fits your story.</h1>
          <p style={{ margin: '14px auto 0', maxWidth: 720, color: 'rgba(245,247,251,0.72)', lineHeight: 1.7 }}>
            From intimate personal milestones to multi-event agency operations, each plan is tailored to feel effortless and premium from the first click onward.
          </p>
        </header>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 8, padding: 6, borderRadius: 999, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
            <button
              type="button"
              onClick={() => setPricingTab('C2C')}
              style={{
                borderRadius: 999,
                padding: '10px 18px',
                border: pricingTab === 'C2C' ? '1px solid rgba(216,179,106,0.46)' : '1px solid transparent',
                background: pricingTab === 'C2C' ? 'rgba(216,179,106,0.14)' : 'transparent',
                color: pricingTab === 'C2C' ? '#f5e5bf' : 'rgba(245,247,251,0.72)',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Heart size={14} /> Personal</span>
            </button>
            <button
              type="button"
              onClick={() => setPricingTab('AGENCY')}
              style={{
                borderRadius: 999,
                padding: '10px 18px',
                border: pricingTab === 'AGENCY' ? '1px solid rgba(216,179,106,0.46)' : '1px solid transparent',
                background: pricingTab === 'AGENCY' ? 'rgba(216,179,106,0.14)' : 'transparent',
                color: pricingTab === 'AGENCY' ? '#f5e5bf' : 'rgba(245,247,251,0.72)',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Building2 size={14} /> Agency</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18, marginBottom: 48 }}>
          {activePlans.map((plan) => (
            <article key={plan.id} className="surface-panel" style={{ padding: 24, position: 'relative', border: plan.isPopular ? '1px solid rgba(216,179,106,0.46)' : '1px solid rgba(255,255,255,0.08)', background: plan.isPopular ? 'linear-gradient(180deg, rgba(216,179,106,0.08), rgba(17,22,31,0.75))' : 'rgba(17,22,31,0.75)' }}>
              {plan.isPopular && (
                <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: 'rgba(216,179,106,0.14)', border: '1px solid rgba(216,179,106,0.32)', color: '#f5e5bf', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  <Sparkles size={12} /> Suggested
                </div>
              )}

              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(245,247,251,0.6)' }}>{plan.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 14 }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.08em' }}>₹{plan.priceInr.toLocaleString('en-IN')}</span>
                  <span style={{ color: 'rgba(245,247,251,0.58)' }}>{plan.billingPeriod === 'ONE_TIME' ? '/ one-time' : plan.billingPeriod === 'MONTHLY' ? '/ month' : '/ year'}</span>
                </div>
                <div style={{ marginTop: 10, color: 'rgba(245,247,251,0.66)' }}>{plan.maxGuests ? `Up to ${plan.maxGuests} guests` : 'Flexible guest access'} • {plan.maxEvents ? `${plan.maxEvents} events` : 'Everything you need'}</div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 22px', display: 'grid', gap: 12 }}>
                {plan.features.map((feature, index) => (
                  <li key={`${plan.id}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(245,247,251,0.82)' }}>
                    <Check size={15} color="#8fd6b2" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href={plan.id.startsWith('c2c') ? '/create' : '/dashboard?view=agency'} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px 16px', fontWeight: 800 }}>
                {plan.priceInr === 0 ? 'Start free' : 'Choose plan'} <ArrowRight size={16} />
              </Link>
            </article>
          ))}
        </div>

        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(245,247,251,0.56)' }}>Frequently asked questions</div>
            <h2 style={{ marginTop: 10, fontSize: 'clamp(1.8rem, 3vw, 2.8rem)', letterSpacing: '-0.06em' }}>Everything you need before you commit.</h2>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {faqs.map((faq, index) => {
              const open = openFaq === index;
              return (
                <div key={faq.q} style={{ overflow: 'hidden', borderRadius: 18, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : index)}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 0,
                      color: '#f5f7fb',
                      padding: '18px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      fontWeight: 700,
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <span>{faq.q}</span>
                    {open ? <ChevronUp size={18} color="#f5e5bf" /> : <ChevronDown size={18} color="#f5e5bf" />}
                  </button>
                  {open && <div style={{ padding: '0 18px 18px', color: 'rgba(245,247,251,0.7)', lineHeight: 1.75 }}>{faq.a}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
