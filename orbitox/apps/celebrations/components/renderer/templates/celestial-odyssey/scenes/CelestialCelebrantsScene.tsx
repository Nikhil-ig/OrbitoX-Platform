'use client';

import React, { useState } from 'react';
import { Sparkles, Heart, Star, ChevronDown, ChevronUp } from 'lucide-react';

interface CelestialCelebrantsSceneProps {
  partner1Name?: string;
  partner1Role?: string;
  partner1Bio?: string;
  partner1Image?: string;
  partner2Name?: string;
  partner2Role?: string;
  partner2Bio?: string;
  partner2Image?: string;
  primaryAccent?: string;
}

export function CelestialCelebrantsScene({
  partner1Name = 'Vikramaditya',
  partner1Role = 'The Groom • Solar Orbit',
  partner1Bio = 'Architect of dreams, steadfast protector, and visionary seeker whose heart found its destined anchor in the gentle light of Ananya.',
  partner1Image = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=85',
  partner2Name = 'Ananya',
  partner2Role = 'The Bride • Lunar Radiance',
  partner2Bio = 'Bearer of luminous joy, artist of warmth, whose grace illuminates the deepest horizons of our shared universe with unwavering compassion.',
  partner2Image = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=85',
  primaryAccent = '#E5C07B',
}: CelestialCelebrantsSceneProps) {
  const [expandedPartner, setExpandedPartner] = useState<'p1' | 'p2' | null>(null);

  const partners = [
    {
      id: 'p1' as const,
      name: partner1Name,
      role: partner1Role,
      bio: partner1Bio,
      image: partner1Image,
      element: 'Solar Force • Constellation Orion',
      badge: 'Sol Invictus',
    },
    {
      id: 'p2' as const,
      name: partner2Name,
      role: partner2Role,
      bio: partner2Bio,
      image: partner2Image,
      element: 'Lunar Grace • Constellation Lyra',
      badge: 'Luna Seraph',
    },
  ];

  return (
    <section
      id="celestial-celebrants-scene"
      aria-label="The Celebrants & Dual Constellations"
      style={{
        position: 'relative',
        padding: '120px 24px',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(18, 22, 42, 0.5) 0%, rgba(7, 8, 13, 0.98) 100%)',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 18px',
              borderRadius: '9999px',
              background: 'rgba(229, 192, 123, 0.08)',
              border: `1px solid ${primaryAccent}33`,
              color: primaryAccent,
              fontSize: '0.78rem',
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}
          >
            <Star size={14} />
            <span>Dual Astral Convergence</span>
          </div>

          <h2
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 'clamp(2.2rem, 5vw, 3.6rem)',
              fontWeight: 400,
              color: '#FFF9F5',
              margin: '0 0 16px 0',
              letterSpacing: '0.04em',
            }}
          >
            Two Souls • One Orbit
          </h2>

          <p
            style={{
              fontSize: 'clamp(0.92rem, 2vw, 1.08rem)',
              color: 'rgba(255, 249, 245, 0.65)',
              maxWidth: '600px',
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            Independent stars bound together by love’s undeniable gravitational grace.
          </p>
        </div>

        {/* Dual Portraits Composition with Central Nexus */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 'clamp(32px, 5vw, 64px)',
            alignItems: 'start',
            position: 'relative',
          }}
        >
          {partners.map((p) => {
            const isExpanded = expandedPartner === p.id;
            return (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(10, 12, 22, 0.8) 100%)',
                  borderRadius: '32px',
                  border: isExpanded ? `1.5px solid ${primaryAccent}` : '1px solid rgba(229, 192, 123, 0.18)',
                  padding: 'clamp(28px, 4vw, 44px) 24px',
                  boxShadow: isExpanded
                    ? `0 20px 50px -10px ${primaryAccent}33`
                    : '0 16px 40px rgba(0, 0, 0, 0.5)',
                  transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                  position: 'relative',
                }}
              >
                {/* Circular Portrait Frame with Concentric Golden Rings */}
                <div
                  style={{
                    position: 'relative',
                    width: 'clamp(180px, 24vw, 240px)',
                    height: 'clamp(180px, 24vw, 240px)',
                    borderRadius: '50%',
                    padding: '8px',
                    background: `linear-gradient(135deg, ${primaryAccent} 0%, rgba(229, 192, 123, 0.1) 100%)`,
                    boxShadow: `0 0 30px ${primaryAccent}33`,
                    marginBottom: '28px',
                  }}
                >
                  <img
                    src={p.image}
                    alt={p.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid #07080D',
                    }}
                  />

                  {/* Celestial Element Tag Floating on Orb */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '0',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      padding: '4px 14px',
                      borderRadius: '9999px',
                      background: '#07080D',
                      border: `1px solid ${primaryAccent}`,
                      color: primaryAccent,
                      fontSize: '0.68rem',
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.8)',
                    }}
                  >
                    {p.badge}
                  </div>
                </div>

                {/* Celebrant Name */}
                <h3
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
                    fontWeight: 400,
                    color: '#FFF9F5',
                    margin: '0 0 6px 0',
                    letterSpacing: '0.04em',
                  }}
                >
                  {p.name}
                </h3>

                {/* Role / Astral Title */}
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: primaryAccent,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    marginBottom: '16px',
                    fontWeight: 500,
                  }}
                >
                  {p.role}
                </p>

                {/* Constellation Guide Tag */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '0.78rem',
                    marginBottom: '20px',
                  }}
                >
                  <Sparkles size={12} style={{ color: primaryAccent }} />
                  <span>{p.element}</span>
                </div>

                {/* Biography */}
                <p
                  style={{
                    fontSize: '0.94rem',
                    color: 'rgba(255, 249, 245, 0.75)',
                    lineHeight: 1.65,
                    margin: 0,
                    maxWidth: '420px',
                    display: isExpanded ? 'block' : '-webkit-box',
                    WebkitLineClamp: isExpanded ? 'none' : 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {p.bio}
                </p>

                {/* Interactive Bio Expander (Touch Target ≥44px) */}
                <button
                  type="button"
                  onClick={() => setExpandedPartner(isExpanded ? null : p.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '20px',
                    padding: '8px 18px',
                    borderRadius: '9999px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: primaryAccent,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    minHeight: '44px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span>{isExpanded ? 'Fold Astral Story' : 'Read Full Alignment'}</span>
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
