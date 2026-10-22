'use client';

import React from 'react';
import {
  Users,
  CreditCard,
  QrCode,
  Globe2,
  Volume2,
  BarChart3,
  ShieldCheck,
  Smartphone,
  CalendarCheck,
} from 'lucide-react';

export function CapabilitiesGrid() {
  const capabilities = [
    {
      icon: <Users size={22} color="#f472b6" />,
      bg: 'rgba(244, 114, 182, 0.1)',
      title: 'Advanced RSVP & Dietary Engine',
      description:
        'Manage plus-ones, multi-event invitations (e.g. Haldi vs Reception), children allocations, and detailed dietary tags (Jain, Halal, Vegan).',
    },
    {
      icon: <CreditCard size={22} color="#10b981" />,
      bg: 'rgba(16, 185, 129, 0.1)',
      title: 'Digital Shagun & Gift Registry',
      description:
        'Accept monetary blessings directly via UPI, Apple Pay, and cards with 0% platform commission. Direct host bank settlement with custom blessing notes.',
    },
    {
      icon: <QrCode size={22} color="#60a5fa" />,
      bg: 'rgba(96, 165, 250, 0.1)',
      title: 'Offline Door Staff QR Pass',
      description:
        'Guests receive Apple and Google Wallet passes. Venue door staff can scan and check in guests even with zero cellular reception at remote palace venues.',
    },
    {
      icon: <Globe2 size={22} color="#c4b5fd" />,
      bg: 'rgba(124, 92, 252, 0.1)',
      title: 'Custom Domains & Zero-Trust Tenancy',
      description:
        'Host on custom vanity domains (e.g. celebrate.aaravandmeera.com) powered by OrbitoX multi-tenant routing with automated SSL certificates.',
    },
    {
      icon: <Volume2 size={22} color="#f59e0b" />,
      bg: 'rgba(245, 158, 11, 0.1)',
      title: 'Atmospheric Audio Soundscapes',
      description:
        'Optionally accompany your digital invitation with high-fidelity acoustic soundscapes and personal voice notes recorded by the hosts.',
    },
    {
      icon: <BarChart3 size={22} color="#38bdf8" />,
      bg: 'rgba(56, 189, 248, 0.1)',
      title: 'Real-Time Engagement Telemetry',
      description:
        'Track invite open rates, WhatsApp delivery status, response velocities, and export structured guest lists directly to CSV or Excel.',
    },
  ];

  return (
    <section
      id="features"
      style={{
        padding: '96px 0',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 64px auto' }}>
          <span className="kicker" style={{ marginBottom: '16px' }}>
            Platform Infrastructure
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
            Engineered for Flawless Execution
          </h2>
          <p
            style={{
              fontSize: '1.05rem',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
            }}
          >
            Every tool required to orchestrate world-class digital celebrations, packaged into an intuitive
            SaaS experience.
          </p>
        </div>

        {/* 6 Grid items */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
          }}
        >
          {capabilities.map((item, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--color-surface-1)',
                border: '1px solid var(--color-border)',
                borderRadius: '18px',
                padding: '28px 24px',
                transition: 'all 0.2s ease',
              }}
              className="surface-card"
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: item.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '18px',
                }}
              >
                {item.icon}
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px', color: '#ffffff' }}>
                {item.title}
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
