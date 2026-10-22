'use client';

import React, { useMemo } from 'react';
import { Occasion, Theme } from '@orbitox-io/celebrations';
import { Sparkles, CalendarDays, MapPin, Heart, Clock, Send, ShieldCheck } from 'lucide-react';

interface LiveInvitationCanvasProps {
  names: string;
  occasion: Occasion;
  theme: Theme;
  eventDate: string;
  venueName: string;
  storyQuote: string;
  heroImage?: string;
  isInteractive?: boolean;
}

export const LiveInvitationCanvas: React.FC<LiveInvitationCanvasProps> = ({
  names,
  occasion,
  theme,
  eventDate,
  venueName,
  storyQuote,
  heroImage,
  isInteractive = false,
}) => {
  // Generate Monogram letters (e.g. "Vikram & Ananya" -> "V & A")
  const monogram = useMemo(() => {
    const parts = names
      .split(/&|and|\+/i)
      .map((s) => s.trim().charAt(0).toUpperCase())
      .filter(Boolean);
    if (parts.length >= 2) return `${parts[0]} & ${parts[1]}`;
    if (parts.length === 1) return parts[0];
    return 'C';
  }, [names]);

  // Compute countdown to event date
  const countdown = useMemo(() => {
    try {
      const target = new Date(eventDate).getTime();
      const now = new Date().getTime();
      const diff = target - now;
      if (isNaN(diff) || diff <= 0) {
        return { days: '142', hours: '08', minutes: '36' };
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      return {
        days: String(days).padStart(2, '0'),
        hours: String(hours).padStart(2, '0'),
        minutes: String(minutes).padStart(2, '0'),
      };
    } catch {
      return { days: '142', hours: '08', minutes: '36' };
    }
  }, [eventDate]);

  // Formatted date string (e.g. "Saturday, 14 December 2026")
  const formattedDate = useMemo(() => {
    try {
      const d = new Date(eventDate);
      if (isNaN(d.getTime())) return eventDate || 'Saturday, 14 December 2026';
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return eventDate || 'Saturday, 14 December 2026';
    }
  }, [eventDate]);

  const defaultPhoto =
    heroImage ||
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80';

  return (
    <article
      aria-label="Live Celebration Invitation Preview"
      style={{
        width: '100%',
        maxWidth: 720,
        margin: '0 auto',
        borderRadius: 32,
        background: 'linear-gradient(180deg, rgba(16, 20, 28, 0.92) 0%, rgba(10, 13, 19, 0.96) 100%)',
        border: '1.5px solid rgba(212, 175, 55, 0.45)',
        boxShadow:
          '0 35px 90px rgba(0, 0, 0, 0.6), 0 0 50px rgba(212, 175, 55, 0.18), inset 0 0 25px rgba(212, 175, 55, 0.04)',
        padding: 'clamp(24px, 5vw, 44px)',
        position: 'relative',
        overflow: 'hidden',
        color: '#FAF8F5',
        textAlign: 'center',
        transition: 'all 0.5s cubic-bezier(0.19, 1, 0.22, 1)',
      }}
    >
      {/* Subtle Background Filigree Corner Accents */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: 'linear-gradient(90deg, transparent 0%, #D4AF37 50%, transparent 100%)',
        }}
      />

      {/* Top Monogram Seal */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, #F5D061 0%, #D4AF37 60%, #8A6820 100%)',
            boxShadow: '0 8px 24px rgba(212, 175, 55, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid rgba(255, 255, 255, 0.5)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: '1.15rem',
              color: '#090B10',
              letterSpacing: '0.04em',
            }}
          >
            {monogram}
          </span>
        </div>
      </div>

      {/* Occasion Kicker & Ceremony Invite Prompt */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '6px 14px',
          borderRadius: 999,
          background: 'rgba(212, 175, 55, 0.12)',
          border: '1px solid rgba(212, 175, 55, 0.3)',
          color: '#F5D061',
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}
      >
        <Sparkles size={12} />
        <span>Cordially Invite You · {occasion.name}</span>
      </div>

      {/* Monolithic Protagonist Names */}
      <h2
        className="gold-foil-text"
        style={{
          fontSize: 'clamp(2.4rem, 5.5vw, 4.2rem)',
          lineHeight: 1.05,
          letterSpacing: '-0.04em',
          fontFamily: 'var(--font-display)',
          margin: '0 0 14px 0',
          fontWeight: 700,
          textShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}
      >
        {names || 'Aarav & Meera'}
      </h2>

      {/* Poetic Quote / Narrative */}
      <p
        style={{
          fontSize: 'clamp(0.95rem, 2vw, 1.15rem)',
          fontStyle: 'italic',
          color: 'rgba(245, 247, 251, 0.82)',
          maxWidth: 540,
          margin: '0 auto 24px auto',
          lineHeight: 1.6,
          fontFamily: 'Georgia, serif',
        }}
      >
        “{storyQuote || 'Two lives, two hearts, joined together in friendship and united forever in love.'}”
      </p>

      {/* Hero Cinematography Portal */}
      <div
        style={{
          position: 'relative',
          height: 'clamp(200px, 32vw, 290px)',
          borderRadius: 22,
          overflow: 'hidden',
          marginBottom: 24,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 15px 40px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${defaultPhoto})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transition: 'transform 0.6s ease',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(8,11,16,0.1) 0%, rgba(8,11,16,0.5) 60%, rgba(8,11,16,0.85) 100%)',
          }}
        />

        {/* Venue Overlay in Photo */}
        <div
          style={{
            position: 'absolute',
            bottom: 14,
            left: 14,
            right: 14,
            padding: '12px 16px',
            borderRadius: 14,
            background: 'rgba(10, 14, 20, 0.72)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            textAlign: 'left',
          }}
        >
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(245,247,251,0.55)' }}>
              The Sanctuary
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#FAF8F5' }}>
              {venueName || 'Lake Palace, Udaipur'}
            </div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#F5D061', fontSize: 13, fontWeight: 700 }}>
            <MapPin size={15} /> Coordinates Locked
          </div>
        </div>
      </div>

      {/* Date & Astronomical Countdown Ticker */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 10,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            padding: '12px 8px',
            borderRadius: 16,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: '#F5D061' }}>
            {countdown.days}
          </div>
          <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(245,247,251,0.5)' }}>
            Days Remaining
          </div>
        </div>

        <div
          style={{
            padding: '12px 8px',
            borderRadius: 16,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: '#F5D061' }}>
            {countdown.hours}
          </div>
          <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(245,247,251,0.5)' }}>
            Hours
          </div>
        </div>

        <div
          style={{
            padding: '12px 8px',
            borderRadius: 16,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: '#F5D061' }}>
            {countdown.minutes}
          </div>
          <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(245,247,251,0.5)' }}>
            Minutes
          </div>
        </div>
      </div>

      {/* Date Ribbon */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '0.94rem',
          color: 'rgba(245, 247, 251, 0.75)',
          marginBottom: 20,
        }}
      >
        <CalendarDays size={16} color="#D4AF37" />
        <span>{formattedDate}</span>
      </div>

      {/* Guest Action Buttons */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          justifyContent: 'center',
          marginTop: 10,
        }}
      >
        <button
          type="button"
          style={{
            padding: '12px 24px',
            borderRadius: 999,
            background: 'linear-gradient(135deg, #FAF4E1 0%, #D4AF37 50%, #B8860B 100%)',
            border: 'none',
            color: '#090B10',
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: '0.04em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 8px 20px rgba(212, 175, 55, 0.35)',
            cursor: 'pointer',
          }}
        >
          <Heart size={15} fill="#090B10" />
          <span>Confirm Attendance (RSVP)</span>
        </button>

        <button
          type="button"
          style={{
            padding: '12px 20px',
            borderRadius: 999,
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#FAF8F5',
            fontWeight: 700,
            fontSize: 13,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
          }}
        >
          <Send size={14} />
          <span>Send Warm Wishes</span>
        </button>
      </div>
    </article>
  );
};
