'use client';

import React from 'react';
import { Sparkles, Calendar, MapPin, Volume2, VolumeX, ArrowDown, Heart } from 'lucide-react';
import { CoupleTitle } from '../../../CoupleTitle';

interface CelestialHeroSceneProps {
  celebrationTitle: string;
  celebrationSubtitle?: string;
  eventDateStr: string;
  venueName?: string;
  venueCity?: string;
  primaryAccent?: string;
  isPlayingAudio: boolean;
  onToggleAudio: () => void;
  onScrollToStory: () => void;
  onScrollToRsvp: () => void;
}

export function CelestialHeroScene({
  celebrationTitle,
  celebrationSubtitle = 'Under the Eternal Canopy of the Midnight Sky',
  eventDateStr,
  venueName = 'The Grand Lake Sanctuary',
  venueCity = 'Lake Como, Italy',
  primaryAccent = '#E5C07B',
  isPlayingAudio,
  onToggleAudio,
  onScrollToStory,
  onScrollToRsvp,
}: CelestialHeroSceneProps) {
  return (
    <section
      id="celestial-hero-scene"
      aria-label="Celestial Celebration Prelude"
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '120px 24px 80px 24px',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse 100% 70% at 50% 30%, rgba(22, 28, 56, 0.5) 0%, rgba(7, 8, 13, 0.98) 100%)',
      }}
    >
      {/* Ambient Starlight Radial Halos */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${primaryAccent}15 0%, transparent 70%)`,
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />

      {/* Floating Soundscape Audio Pill (Top Right on desktop / responsive) */}
      <div
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          zIndex: 40,
        }}
      >
        <button
          type="button"
          onClick={onToggleAudio}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            borderRadius: '9999px',
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: `1px solid ${isPlayingAudio ? primaryAccent : 'rgba(255, 255, 255, 0.15)'}`,
            color: isPlayingAudio ? primaryAccent : '#FFF9F5',
            fontSize: '0.82rem',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            transition: 'all 0.25s ease',
            minHeight: '44px',
          }}
          aria-label={isPlayingAudio ? 'Mute ambient soundscape' : 'Play ambient celestial soundscape'}
        >
          {isPlayingAudio ? (
            <>
              <Volume2 size={16} />
              <span>Soundscape Active</span>
              <span
                style={{
                  display: 'inline-flex',
                  gap: '2px',
                  alignItems: 'center',
                  height: '12px',
                }}
              >
                <span style={{ width: '2px', height: '10px', background: primaryAccent, animation: 'pulse 1s infinite' }} />
                <span style={{ width: '2px', height: '14px', background: primaryAccent, animation: 'pulse 0.7s infinite 0.2s' }} />
                <span style={{ width: '2px', height: '8px', background: primaryAccent, animation: 'pulse 1.1s infinite 0.4s' }} />
              </span>
            </>
          ) : (
            <>
              <VolumeX size={16} />
              <span>Enter With Sound</span>
            </>
          )}
        </button>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        {/* Heraldic Cosmic Crest Icon */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(229, 192, 123, 0.08)',
            border: `1px solid ${primaryAccent}44`,
            boxShadow: `0 0 28px ${primaryAccent}22`,
            marginBottom: '24px',
          }}
        >
          <Sparkles size={28} style={{ color: primaryAccent, filter: 'drop-shadow(0 0 10px #E5C07B)' }} />
        </div>

        {/* Auspicious Decree Kicker */}
        <div
          style={{
            fontSize: 'clamp(0.74rem, 1.6vw, 0.88rem)',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: primaryAccent,
            fontWeight: 600,
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}
        >
          <span style={{ height: '1px', width: '32px', background: `linear-gradient(90deg, transparent, ${primaryAccent})` }} />
          <span>Sacred Celestial Convergence</span>
          <span style={{ height: '1px', width: '32px', background: `linear-gradient(90deg, ${primaryAccent}, transparent)` }} />
        </div>

        {/* Main Celebrants Names Title */}
        <h1
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 'clamp(2.6rem, 7vw, 5.2rem)',
            fontWeight: 400,
            lineHeight: 1.12,
            letterSpacing: '0.02em',
            color: '#FFF9F5',
            margin: '0 0 20px 0',
            textShadow: '0 4px 30px rgba(0, 0, 0, 0.8)',
          }}
        >
          <CoupleTitle title={celebrationTitle} />
        </h1>

        {/* Poetic Subtitle */}
        <p
          style={{
            fontSize: 'clamp(1rem, 2.2vw, 1.25rem)',
            color: 'rgba(255, 249, 245, 0.82)',
            maxWidth: '680px',
            margin: '0 auto 36px auto',
            lineHeight: 1.6,
            fontWeight: 300,
            letterSpacing: '0.02em',
          }}
        >
          {celebrationSubtitle}
        </p>

        {/* Date and Location Badge */}
        <div
          style={{
            display: 'inline-flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            padding: '12px 28px',
            borderRadius: '9999px',
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            marginBottom: '44px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FFF9F5', fontSize: '0.94rem' }}>
            <Calendar size={16} style={{ color: primaryAccent }} />
            <span>{eventDateStr}</span>
          </div>

          <span style={{ color: 'rgba(255, 255, 255, 0.25)' }}>•</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FFF9F5', fontSize: '0.94rem' }}>
            <MapPin size={16} style={{ color: primaryAccent }} />
            <span>{venueName}, {venueCity}</span>
          </div>
        </div>

        {/* Call to Action Buttons */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
          }}
        >
          <button
            type="button"
            onClick={onScrollToRsvp}
            style={{
              padding: '14px 32px',
              borderRadius: '9999px',
              background: `linear-gradient(135deg, ${primaryAccent} 0%, #D4AF37 100%)`,
              color: '#07080D',
              fontWeight: 700,
              fontSize: '0.95rem',
              letterSpacing: '0.04em',
              border: 'none',
              cursor: 'pointer',
              boxShadow: `0 8px 32px ${primaryAccent}55`,
              transition: 'all 0.3s ease',
              minHeight: '44px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <Heart size={16} fill="#07080D" />
            <span>Confirm Attendance (RSVP)</span>
          </button>

          <button
            type="button"
            onClick={onScrollToStory}
            style={{
              padding: '14px 28px',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#FFF9F5',
              fontWeight: 500,
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              minHeight: '44px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.borderColor = primaryAccent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            <span>Explore The Universe</span>
            <ArrowDown size={15} />
          </button>
        </div>
      </div>
    </section>
  );
}
