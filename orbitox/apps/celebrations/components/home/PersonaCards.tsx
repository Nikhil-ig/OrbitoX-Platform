'use client';

import React from 'react';
import Link from 'next/link';
import {
  Heart,
  Building2,
  Globe2,
  ArrowRight,
  Check,
  Sparkles,
  QrCode,
  ShieldCheck,
  Palette,
  CreditCard,
} from 'lucide-react';

export function PersonaCards() {
  const personas = [
    {
      id: 'c2c',
      badge: 'C2C Individuals & Couples',
      badgeColor: '#f472b6',
      badgeBg: 'rgba(244, 114, 182, 0.12)',
      title: 'Host Your Own Milestone',
      tagline: 'Simple, emotional, and stunningly crafted.',
      description:
        'Create a bespoke digital invitation in minutes. Collect RSVPs, send automated WhatsApp reminders, and gather heartfelt audio blessings.',
      highlights: [
        'Instant self-serve 9-step guided studio',
        'Direct UPI & Card digital Shagun collection',
        'Interactive guestbook with photo uploads',
        'Interactive dietary & travel logistics',
      ],
      ctaText: 'Start Your Celebration',
      ctaHref: '/create',
      btnClass: 'btn-primary',
      icon: <Heart size={20} color="#f472b6" />,
      roleSwitch: 'HOST_CONSUMER',
    },
    {
      id: 'b2b',
      badge: 'B2B Planners & Event Ateliers',
      badgeColor: '#60a5fa',
      badgeBg: 'rgba(96, 165, 250, 0.12)',
      title: 'Agency & Atelier Workspace',
      tagline: 'Orchestrate hundreds of client celebrations.',
      description:
        'Manage high-volume client rosters with wholesale template rates, white-label client portals, door-staff QR check-in apps, and custom domains.',
      highlights: [
        'Multi-client dashboard with wholesale billing',
        'White-label portal with custom client branding',
        'Offline-capable QR door staff gate check-in',
        'Client review & approval collaboration links',
      ],
      ctaText: 'Enter Agency Cockpit',
      ctaHref: '/workspace',
      btnClass: 'btn-secondary',
      icon: <Building2 size={20} color="#60a5fa" />,
      featured: true,
      roleSwitch: 'AGENCY_PLANNER',
    },
    {
      id: 'o2b2c',
      badge: 'O2B2C Platform & Ecosystem',
      badgeColor: '#a78bfa',
      badgeBg: 'rgba(167, 139, 250, 0.12)',
      title: 'Platform OS & Operators',
      tagline: 'Enterprise multi-tenancy at global scale.',
      description:
        'Built on the OrbitoX zero-trust kernel. Provision isolated tenant domains, govern global template catalogs, set license terms, and track platform metrics.',
      highlights: [
        'Zero-trust tenant isolation with AsyncLocalStorage',
        'Ed25519 cryptographic anti-tamper signatures',
        'Custom domain wildcards & SSL automation',
        'Global revenue share & subscription telemetry',
      ],
      ctaText: 'Explore Platform OS',
      ctaHref: '/platform',
      btnClass: 'btn-ghost',
      icon: <Globe2 size={20} color="#a78bfa" />,
      roleSwitch: 'PLATFORM_ADMIN',
    },
  ];

  return (
    <section
      id="solutions"
      style={{
        padding: '88px 0',
        background: 'linear-gradient(180deg, rgba(9, 9, 11, 0) 0%, rgba(17, 17, 20, 0.4) 100%)',
        borderTop: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div className="container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 60px auto' }}>
          <span
            className="kicker"
            style={{ marginBottom: '16px' }}
          >
            Engineered For Every Scale
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
            One unified design system.{' '}
            <span className="text-gradient-purple">Three tailored experiences.</span>
          </h2>
          <p
            style={{
              fontSize: '1.05rem',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
            }}
          >
            Whether you are a couple planning your dream wedding, an atelier delivering 50+ celebrations a year,
            or an enterprise platform operator, Celebrations adapts seamlessly to your workflow.
          </p>
        </div>

        {/* 3 Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            alignItems: 'stretch',
          }}
        >
          {personas.map((persona) => (
            <div
              key={persona.id}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '32px 28px',
                borderRadius: '20px',
                background: persona.featured
                  ? 'linear-gradient(180deg, rgba(26, 26, 34, 0.95) 0%, rgba(17, 17, 22, 0.95) 100%)'
                  : 'rgba(17, 17, 20, 0.65)',
                border: persona.featured
                  ? '1.5px solid rgba(96, 165, 250, 0.35)'
                  : '1px solid var(--color-border)',
                boxShadow: persona.featured
                  ? '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(96, 165, 250, 0.1)'
                  : 'var(--shadow-sm)',
                transition: 'all 0.2s ease',
              }}
            >
              {persona.featured && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '28px',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    background: '#3b82f6',
                    color: '#ffffff',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Most Popular For Agencies
                </div>
              )}

              <div>
                {/* Top Badge & Icon */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      background: persona.badgeBg,
                      color: persona.badgeColor,
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      border: `1px solid ${persona.badgeColor}33`,
                    }}
                  >
                    {persona.badge}
                  </div>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {persona.icon}
                  </div>
                </div>

                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '6px', color: '#ffffff' }}>
                  {persona.title}
                </h3>
                <div style={{ fontSize: '0.86rem', color: persona.badgeColor, fontWeight: 600, marginBottom: '14px' }}>
                  {persona.tagline}
                </div>
                <p
                  style={{
                    fontSize: '0.9rem',
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.55,
                    marginBottom: '24px',
                  }}
                >
                  {persona.description}
                </p>

                {/* Highlights List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
                  {persona.highlights.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.84rem' }}>
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: persona.badgeBg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '2px',
                        }}
                      >
                        <Check size={11} color={persona.badgeColor} />
                      </div>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Action */}
              <Link
                href={persona.ctaHref}
                className={persona.btnClass}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '11px 18px',
                  fontSize: '0.9rem',
                }}
              >
                <span>{persona.ctaText}</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
