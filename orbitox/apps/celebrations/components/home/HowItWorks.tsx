'use client';

import React from 'react';
import Link from 'next/link';
import {
  Palette,
  Sliders,
  Send,
  ArrowRight,
  CheckCircle,
  Smartphone,
  Sparkles,
  QrCode,
  HeartHandshake,
} from 'lucide-react';

export function HowItWorks() {
  const steps = [
    {
      step: '01',
      title: 'Select Occasion & Aesthetic',
      subtitle: 'Artisanal worlds tailored to your moment',
      description:
        'Choose from 12+ signature occasions (Weddings, Galas, Jubilees, Baby Showers) and pair with a curated typographic universe designed by editorial art directors.',
      badge: 'Step 1 • 2 Minutes',
      icon: <Palette size={22} color="#c4b5fd" />,
      features: ['Editorial, Royal, Botanical, Minimalist themes', 'One-click typography and palette tuning', 'Interactive device viewport preview'],
    },
    {
      step: '02',
      title: 'Curate Narrative & Interactivity',
      subtitle: 'More than an invite — a living celebration portal',
      description:
        'Add protagonists, ceremony itineraries with live Google Maps radar, RSVP dietary surveys, photo timeline galleries, and digital Shagun UPI collections.',
      badge: 'Step 2 • Fully Guided',
      icon: <Sliders size={22} color="#f472b6" />,
      features: ['Real-time RSVP & plus-one tracking', 'Digital Shagun UPI with zero commission', 'Multi-day itinerary with dress code moodboards'],
    },
    {
      step: '03',
      title: 'Publish & Gate Check-In',
      subtitle: 'Frictionless for guests, effortless for hosts',
      description:
        'Share customized links with open-graph previews. Guests receive instant Apple/Google Wallet passes with offline-verifiable QR codes for smooth door check-in.',
      badge: 'Step 3 • Instant Launch',
      icon: <Send size={22} color="#10b981" />,
      features: ['Instant Apple & Google Wallet QR pass', 'Door staff scanner app with offline sync', 'Real-time host analytics & exportable spreadsheets'],
    },
  ];

  return (
    <section
      id="how-it-works"
      style={{
        padding: '96px 0',
        position: 'relative',
      }}
    >
      <div className="container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 64px auto' }}>
          <span className="kicker" style={{ marginBottom: '16px' }}>
            Seamless Workflow
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
            How OrbitoX Celebrations Works
          </h2>
          <p
            style={{
              fontSize: '1.05rem',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
            }}
          >
            A high-velocity creation studio for individuals and agencies. From initial concept to live gate check-in
            in three intuitive steps.
          </p>
        </div>

        {/* 3 Step Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '28px',
            position: 'relative',
          }}
        >
          {steps.map((item, index) => (
            <div
              key={item.step}
              style={{
                position: 'relative',
                background: 'var(--color-surface-1)',
                border: '1px solid var(--color-border)',
                borderRadius: '20px',
                padding: '36px 30px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
              }}
              className="surface-card"
            >
              <div>
                {/* Step Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '24px',
                  }}
                >
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {item.icon}
                  </div>
                  <span
                    style={{
                      fontSize: '2.4rem',
                      fontWeight: 900,
                      color: 'rgba(255, 255, 255, 0.12)',
                      fontFamily: 'monospace',
                      lineHeight: 1,
                    }}
                  >
                    {item.step}
                  </span>
                </div>

                <div
                  style={{
                    display: 'inline-block',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: 'var(--color-accent)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: '8px',
                  }}
                >
                  {item.badge}
                </div>

                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '6px', color: '#ffffff' }}>
                  {item.title}
                </h3>
                <div style={{ fontSize: '0.86rem', color: 'var(--color-text-secondary)', marginBottom: '14px', fontWeight: 500 }}>
                  {item.subtitle}
                </div>
                <p
                  style={{
                    fontSize: '0.9rem',
                    color: 'var(--color-text-tertiary)',
                    lineHeight: 1.6,
                    marginBottom: '24px',
                  }}
                >
                  {item.description}
                </p>

                {/* Features List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {item.features.map((feat, fIdx) => (
                    <div key={fIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
                      <CheckCircle size={14} color="#10b981" />
                      <span style={{ color: 'var(--color-text-secondary)' }}>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '28px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
                <Link
                  href="/create"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <span>Experience Step {item.step}</span>
                  <ArrowRight size={14} color="var(--color-accent)" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
