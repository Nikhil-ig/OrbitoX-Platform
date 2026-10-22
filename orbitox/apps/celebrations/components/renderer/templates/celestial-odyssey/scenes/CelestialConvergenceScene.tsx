'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Download, Sparkles } from 'lucide-react';

interface CelestialConvergenceSceneProps {
  eventDateStr: string;
  venueName?: string;
  venueCity?: string;
  primaryAccent?: string;
  onAddToCalendar: () => void;
}

export function CelestialConvergenceScene({
  eventDateStr,
  venueName = 'The Grand Lake Sanctuary',
  venueCity = 'Lake Como, Italy',
  primaryAccent = '#E5C07B',
  onAddToCalendar,
}: CelestialConvergenceSceneProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const target = new Date(eventDateStr).getTime() || new Date('2026-12-18T16:00:00').getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, target - now);
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [eventDateStr]);

  const units = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hours', value: timeLeft.hours },
    { label: 'Minutes', value: timeLeft.minutes },
    { label: 'Seconds', value: timeLeft.seconds },
  ];

  return (
    <section
      id="moment-convergence"
      aria-label="Temporal Convergence & Countdown"
      style={{
        position: 'relative',
        padding: '120px 24px',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(14, 18, 40, 0.6) 0%, rgba(6, 8, 15, 0.98) 100%)',
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 2 }}>
        {/* Header */}
        <p
          style={{
            fontSize: '0.76rem',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: primaryAccent,
            fontWeight: 500,
            margin: '0 0 12px 0',
          }}
        >
          The Alignment
        </p>

        <h2
          style={{
            fontFamily: "'Playfair Display', 'Cinzel', serif",
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 400,
            color: '#FFF9F5',
            margin: '0 0 16px 0',
            letterSpacing: '0.02em',
          }}
        >
          Countdown to Convergence
        </h2>

        <p
          style={{
            fontSize: 'clamp(0.92rem, 1.8vw, 1.05rem)',
            color: 'rgba(255, 249, 245, 0.65)',
            maxWidth: '480px',
            margin: '0 auto 48px auto',
            lineHeight: 1.6,
          }}
        >
          Each second brings our family and closest friends closer to the sacred moment.
        </p>

        {/* Editorial Numerals Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 'clamp(12px, 3vw, 24px)',
            marginBottom: '44px',
          }}
        >
          {units.map((u) => (
            <div
              key={u.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: 'clamp(18px, 3vw, 28px) 12px',
                borderRadius: '20px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <span
                style={{
                  fontFamily: "'Playfair Display', 'Cinzel', serif",
                  fontSize: 'clamp(2rem, 4.5vw, 3.2rem)',
                  fontWeight: 400,
                  color: '#FFF9F5',
                  lineHeight: 1,
                  marginBottom: '8px',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {String(u.value).padStart(2, '0')}
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: primaryAccent,
                  fontWeight: 500,
                }}
              >
                {u.label}
              </span>
            </div>
          ))}
        </div>

        {/* Date and Calendar Action */}
        <div style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.75)',
              fontSize: '0.86rem',
            }}
          >
            <Calendar size={15} style={{ color: primaryAccent }} />
            <span>{eventDateStr} • {venueCity}</span>
          </div>

          <button
            type="button"
            onClick={onAddToCalendar}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 22px',
              borderRadius: '9999px',
              background: `linear-gradient(135deg, ${primaryAccent} 0%, #D4AF37 100%)`,
              color: '#07080D',
              fontWeight: 600,
              fontSize: '0.86rem',
              border: 'none',
              cursor: 'pointer',
              boxShadow: `0 4px 16px ${primaryAccent}35`,
              transition: 'all 0.25s ease',
              minHeight: '40px',
            }}
          >
            <Download size={14} />
            <span>Add to Calendar (.ics)</span>
          </button>
        </div>
      </div>
    </section>
  );
}
