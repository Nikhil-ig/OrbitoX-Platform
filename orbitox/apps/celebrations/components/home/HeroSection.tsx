'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  Heart,
  Cake,
  Gem,
  Building2,
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  ShieldCheck,
  Play,
} from 'lucide-react';

interface OccasionHeroConfig {
  id: string;
  name: string;
  badge: string;
  headline: string;
  accentColor: string;
  accentGlow: string;
  icon: React.ReactNode;
  names: string;
  subtitle: string;
  date: string;
  location: string;
  guestCount: number;
  rsvpCount: number;
  tags: string[];
}

const OCCASIONS: OccasionHeroConfig[] = [
  {
    id: 'wedding',
    name: 'Weddings',
    badge: 'Royal & Editorial Nuptials',
    headline: 'Breathtaking digital invitations and guest experiences',
    accentColor: '#f472b6',
    accentGlow: 'rgba(244, 114, 182, 0.25)',
    icon: <Heart size={16} color="#f472b6" />,
    names: 'Aarav & Meera',
    subtitle: 'Celebrating the Sacred Union & Sangeet Gala',
    date: 'February 18, 2027',
    location: 'Umaid Bhawan Palace, Jodhpur',
    guestCount: 420,
    rsvpCount: 384,
    tags: ['Interactive RSVP', 'Curated Music', 'Shagun Tracker', 'QR Gate Pass'],
  },
  {
    id: 'birthday',
    name: 'Milestone Birthdays',
    badge: 'Epoch Jubilees',
    headline: 'Celebrate memorable milestones with interactive storytelling',
    accentColor: '#f59e0b',
    accentGlow: 'rgba(245, 158, 11, 0.25)',
    icon: <Cake size={16} color="#f59e0b" />,
    names: 'Vikramaditya Rao',
    subtitle: '50th Golden Jubilee Masquerade Soirée',
    date: 'November 12, 2026',
    location: 'The Oberoi Grand, Mumbai',
    guestCount: 160,
    rsvpCount: 142,
    tags: ['Photo Timeline', 'Memory Board', 'Dress Code Guide', 'Gift Registry'],
  },
  {
    id: 'anniversary',
    name: 'Anniversaries',
    badge: 'Silver & Golden Vows',
    headline: 'Honor timeless love stories with cinematic digital keepsakes',
    accentColor: '#ec4899',
    accentGlow: 'rgba(236, 72, 153, 0.25)',
    icon: <Gem size={16} color="#ec4899" />,
    names: 'Dev & Rohini',
    subtitle: '25 Years of Grace & Vow Renewal',
    date: 'December 28, 2026',
    location: 'Lake Palace, Udaipur',
    guestCount: 220,
    rsvpCount: 198,
    tags: ['Legacy Gallery', 'Live Stream', 'Tribute Audio', 'Hotel Logistics'],
  },
  {
    id: 'corporate',
    name: 'Corporate Galas',
    badge: 'Enterprise & Keynotes',
    headline: 'Professional summits and bespoke celebration portals',
    accentColor: '#3b82f6',
    accentGlow: 'rgba(59, 130, 246, 0.25)',
    icon: <Building2 size={16} color="#3b82f6" />,
    names: 'Apex Horizons 2027',
    subtitle: 'Annual Leadership Summit & Awards Evening',
    date: 'March 15, 2027',
    location: 'St. Regis, Singapore',
    guestCount: 850,
    rsvpCount: 790,
    tags: ['Badge Scanner', 'Dietary Routing', 'Speaker Matrix', 'Custom Domain'],
  },
];

export function HeroSection() {
  const [selectedOccasion, setSelectedOccasion] = useState<OccasionHeroConfig>(OCCASIONS[0]!);

  return (
    <section
      style={{
        position: 'relative',
        padding: '72px 0 88px 0',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(124, 92, 252, 0.15), transparent 70%)',
      }}
    >
      <div className="container">
        {/* Top Announcement Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '22px' }}>
          <div
            className="kicker"
            style={{
              boxShadow: '0 4px 20px rgba(124, 92, 252, 0.2)',
              gap: '8px',
            }}
          >
            <Sparkles size={13} color="#c4b5fd" />
            <span>Multi-Sided Celebration SaaS Platform</span>
            <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>•</span>
            <span style={{ color: '#ffffff' }}>C2C + B2B + O2B2C</span>
          </div>
        </div>

        {/* Main Headline */}
        <div style={{ textAlign: 'center', maxWidth: '880px', margin: '0 auto 28px auto' }}>
          <h1
            style={{
              fontSize: 'clamp(2.4rem, 5.2vw, 4.4rem)',
              lineHeight: 1.08,
              fontWeight: 800,
              letterSpacing: '-0.035em',
              marginBottom: '18px',
            }}
          >
            Create unforgettable digital experiences for{' '}
            <span
              style={{
                color: selectedOccasion.accentColor,
                transition: 'color 0.3s ease',
              }}
            >
              life&apos;s greatest moments.
            </span>
          </h1>
          <p
            style={{
              fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
              maxWidth: '720px',
              margin: '0 auto',
            }}
          >
            From intimate weddings to high-volume agency portfolios. Design stunning interactive invitations,
            manage guest RSVPs, collect digital Shagun, and host immersive celebration worlds.
          </p>
        </div>

        {/* CTAs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            flexWrap: 'wrap',
            marginBottom: '48px',
          }}
        >
          <Link
            href="/create"
            className="btn-primary"
            style={{
              padding: '13px 26px',
              fontSize: '0.98rem',
              fontWeight: 700,
              boxShadow: `0 8px 30px ${selectedOccasion.accentGlow}`,
            }}
          >
            <span>Start Creating Free</span>
            <ArrowRight size={17} />
          </Link>
          <Link
            href="/workspace"
            className="btn-secondary"
            style={{
              padding: '13px 24px',
              fontSize: '0.98rem',
              fontWeight: 600,
            }}
          >
            <Building2 size={16} color="var(--color-text-secondary)" />
            <span>Explore Agency Workspace</span>
          </Link>
          <Link
            href="/e/vikram-ananya-wedding"
            target="_blank"
            className="btn-ghost"
            style={{
              padding: '13px 18px',
              fontSize: '0.92rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Play size={14} fill="currentColor" />
            <span>View Live Guest Demo</span>
          </Link>
        </div>

        {/* Interactive Occasion Switcher Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            marginBottom: '32px',
          }}
        >
          {OCCASIONS.map((occ) => {
            const isSelected = selectedOccasion.id === occ.id;
            return (
              <button
                key={occ.id}
                onClick={() => setSelectedOccasion(occ)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 16px',
                  borderRadius: '999px',
                  background: isSelected ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                  border: isSelected ? `1px solid ${occ.accentColor}` : '1px solid var(--color-border)',
                  color: isSelected ? '#ffffff' : 'var(--color-text-secondary)',
                  fontSize: '0.86rem',
                  fontWeight: isSelected ? 700 : 500,
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  boxShadow: isSelected ? `0 0 20px ${occ.accentGlow}` : 'none',
                }}
              >
                {occ.icon}
                <span>{occ.name}</span>
              </button>
            );
          })}
        </div>

        {/* Live Interactive Celebration Preview Stage */}
        <div
          style={{
            position: 'relative',
            maxWidth: '1020px',
            margin: '0 auto',
            borderRadius: '24px',
            border: '1px solid var(--color-border-strong)',
            background: 'linear-gradient(180deg, #131318 0%, #0c0c0e 100%)',
            padding: '8px',
            boxShadow: '0 24px 80px rgba(0, 0, 0, 0.7), 0 0 60px rgba(124, 92, 252, 0.1)',
          }}
        >
          {/* Top Browser / Canvas Chrome */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              borderBottom: '1px solid var(--color-border)',
              borderRadius: '16px 16px 0 0',
              background: 'rgba(255, 255, 255, 0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 14px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                fontSize: '0.74rem',
                color: 'var(--color-text-secondary)',
                fontFamily: 'monospace',
              }}
            >
              <span>https://celebrate.orbitox.io/e/{selectedOccasion.id}-preview</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                LIVE PREVIEW
              </span>
            </div>
          </div>

          {/* Card Body */}
          <div
            style={{
              padding: '36px 32px',
              borderRadius: '0 0 16px 16px',
              background: `radial-gradient(circle at 50% 20%, ${selectedOccasion.accentGlow} 0%, transparent 65%)`,
              position: 'relative',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '28px',
                alignItems: 'center',
              }}
            >
              {/* Left Column: Event details */}
              <div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    color: selectedOccasion.accentColor,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    marginBottom: '14px',
                    border: `1px solid ${selectedOccasion.accentColor}33`,
                  }}
                >
                  <Sparkles size={13} />
                  <span>{selectedOccasion.badge}</span>
                </div>

                <h2
                  className="font-display"
                  style={{
                    fontSize: 'clamp(2rem, 3.8vw, 3rem)',
                    fontWeight: 700,
                    lineHeight: 1.1,
                    marginBottom: '10px',
                    color: '#ffffff',
                  }}
                >
                  {selectedOccasion.names}
                </h2>
                <p
                  style={{
                    fontSize: '1rem',
                    color: 'var(--color-text-secondary)',
                    marginBottom: '22px',
                  }}
                >
                  {selectedOccasion.subtitle}
                </p>

                {/* Key metadata chips */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.85)' }}>
                    <Calendar size={16} color={selectedOccasion.accentColor} />
                    <span>{selectedOccasion.date}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.85)' }}>
                    <MapPin size={16} color={selectedOccasion.accentColor} />
                    <span>{selectedOccasion.location}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.85)' }}>
                    <Users size={16} color={selectedOccasion.accentColor} />
                    <span>
                      {selectedOccasion.rsvpCount} / {selectedOccasion.guestCount} RSVPs Confirmed ({Math.round((selectedOccasion.rsvpCount / selectedOccasion.guestCount) * 100)}%)
                    </span>
                  </div>
                </div>

                {/* Tags */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {selectedOccasion.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--color-border)',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      ✓ {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right Column: Mini Interactive Guest Card Mockup */}
              <div
                style={{
                  background: 'rgba(17, 17, 21, 0.85)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '18px',
                  padding: '24px',
                  boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Guest Experience Portal
                  </span>
                  <span className="badge badge-accent" style={{ fontSize: '0.68rem' }}>
                    Active Portal
                  </span>
                </div>

                <div
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--color-border)',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px', color: '#ffffff' }}>
                    Will you attend this celebration?
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      className="btn-primary"
                      style={{
                        padding: '8px 12px',
                        fontSize: '0.8rem',
                        justifyContent: 'center',
                        background: selectedOccasion.accentColor,
                      }}
                    >
                      Attending (Yes)
                    </button>
                    <button
                      className="btn-secondary"
                      style={{
                        padding: '8px 12px',
                        fontSize: '0.8rem',
                        justifyContent: 'center',
                      }}
                    >
                      Regretfully Decline
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Live Shagun Blessings:</span>
                    <span style={{ fontWeight: 700, color: '#10b981' }}>₹1,42,500 collected</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Dietary Preferences:</span>
                    <span style={{ fontWeight: 600 }}>Pure Vegetarian / Jain / Vegan</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>QR Pass Status:</span>
                    <span style={{ color: '#60a5fa', fontWeight: 600 }}>Instant Apple/Google Wallet</span>
                  </div>
                </div>

                <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid var(--color-border)' }}>
                  <Link
                    href={`/create?occasion=${selectedOccasion.id}`}
                    className="btn-white"
                    style={{ width: '100%', justifyContent: 'center', fontSize: '0.86rem' }}
                  >
                    Customize This Occasion Template
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust & Proof Bar */}
        <div
          style={{
            marginTop: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '32px',
            flexWrap: 'wrap',
            color: 'var(--color-text-tertiary)',
            fontSize: '0.82rem',
            fontWeight: 500,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="#10b981" />
            <span>2,400+ Celebrations Hosted</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={16} color="#3b82f6" />
            <span>Ed25519 Cryptographic Anti-Tamper</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="#f59e0b" />
            <span>99.98% Guest RSVP Completion</span>
          </div>
        </div>
      </div>
    </section>
  );
}
