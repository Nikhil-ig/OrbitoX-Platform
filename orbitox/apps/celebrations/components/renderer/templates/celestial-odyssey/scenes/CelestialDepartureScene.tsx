'use client';

import React from 'react';
import { ArrowUp, Sparkles, Heart } from 'lucide-react';
import { parseCoupleNames } from '../../../CoupleTitle';

interface CelestialDepartureSceneProps {
  celebrationTitle: string;
  primaryAccent?: string;
}

export function CelestialDepartureScene({
  celebrationTitle,
  primaryAccent = '#E5C07B',
}: CelestialDepartureSceneProps) {
  const { isCouple, name1, name2 } = parseCoupleNames(celebrationTitle);
  const displayName1 = isCouple ? name1 : celebrationTitle;
  const displayName2 = isCouple ? name2 : '';

  const handleScrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <section
      id="moment-departure"
      aria-label="The Closing Farewell"
      style={{
        position: 'relative',
        padding: 'clamp(44px, 6vh, 68px) 20px clamp(48px, 8vh, 80px) 20px',
        textAlign: 'center',
        background: 'radial-gradient(ellipse 90% 70% at 50% 80%, rgba(14, 20, 42, 0.75) 0%, rgba(6, 8, 15, 0.98) 100%)',
      }}
    >
      <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 2 }}>
        {/* Incoming continuity light beam from Blessings */}
        <div
          style={{
            width: '1px',
            height: '24px',
            background: `linear-gradient(180deg, transparent 0%, ${primaryAccent}66 100%)`,
            marginBottom: '16px',
            opacity: 0.8,
          }}
        />

        <div style={{ animation: 'celestialBeaconBreathe 3.5s ease-in-out infinite', display: 'inline-flex' }}>
          <Heart size={20} style={{ color: primaryAccent, filter: `drop-shadow(0 0 8px ${primaryAccent}88)`, marginBottom: '20px' }} />
        </div>

        <p
          style={{
            fontSize: '0.78rem',
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: primaryAccent,
            fontWeight: 500,
            margin: '0 0 12px 0',
          }}
        >
          With All Our Love
        </p>

        <h3
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)',
            fontWeight: 400,
            color: '#FFF9F5',
            margin: '0 0 16px 0',
          }}
        >
          Until We Meet Beneath The Stars
        </h3>

        <p
          style={{
            fontSize: '0.94rem',
            color: 'rgba(255, 249, 245, 0.65)',
            lineHeight: 1.6,
            margin: '0 0 32px 0',
          }}
        >
          Thank you for being part of our story, our constellation, and our forever.
        </p>

        <p
          style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: 'italic',
            fontSize: '1.25rem',
            color: primaryAccent,
            margin: '0 0 40px 0',
            textShadow: `0 0 20px ${primaryAccent}33`,
          }}
        >
          {isCouple ? `${displayName1} & ${displayName2}` : displayName1}
        </p>

        <button
          type="button"
          onClick={handleScrollToTop}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '11px 24px',
            borderRadius: '9999px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: `1px solid ${primaryAccent}44`,
            color: '#FFF9F5',
            fontSize: '0.8rem',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: `0 4px 16px rgba(0,0,0,0.4), 0 0 12px ${primaryAccent}18`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = primaryAccent;
            e.currentTarget.style.boxShadow = `0 6px 20px ${primaryAccent}44`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = `${primaryAccent}44`;
            e.currentTarget.style.boxShadow = `0 4px 16px rgba(0,0,0,0.4), 0 0 12px ${primaryAccent}18`;
          }}
        >
          <ArrowUp size={13} style={{ color: primaryAccent }} />
          <span>Return to Horizon</span>
        </button>
      </div>
    </section>
  );
}
