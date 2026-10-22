'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { CalendarDays, MapPin, ArrowRight, Clock, Sparkles } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { atelierSoundscape } from '@/lib/atelier-soundscape';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface Scene05Props {
  names: string;
  eventDate: string;
  venueName: string;
  onEventDateChange: (date: string) => void;
  onVenueNameChange: (venue: string) => void;
  onNextScene: () => void;
  isCalmMode?: boolean;
}

const VENUE_PRESETS = [
  'Lake Palace, Udaipur',
  'Taj Falaknuma Palace, Hyderabad',
  'Umaid Bhawan Palace, Jodhpur',
  'Villa d’Este, Lake Como',
  'The Pierre, New York City',
  'Alila Diwa, South Goa',
];

export const Scene05_Horizon: React.FC<Scene05Props> = ({
  names,
  eventDate,
  venueName,
  onEventDateChange,
  onVenueNameChange,
  onNextScene,
  isCalmMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  return (
    <section
      id="scene-5"
      ref={containerRef}
      className="cinematic-scene"
      style={{
        minHeight: '100vh',
        justifyContent: 'center',
        padding: '100px 24px',
        position: 'relative',
        zIndex: 22,
      }}
    >
      <div style={{ maxWidth: 1000, margin: '0 auto', width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10,
              color: '#D4AF37',
              fontSize: 12,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            <span>Scene 05</span>
            <span>—</span>
            <span>The Sanctuary & Horizon</span>
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.2rem, 5vw, 4rem)',
              fontWeight: 800,
              color: '#FAF8F5',
              lineHeight: 1.15,
            }}
          >
            When & Where Shall We Convene?
          </h2>
          <p
            style={{
              color: 'rgba(245, 247, 251, 0.7)',
              fontSize: 'clamp(1rem, 1.8vw, 1.25rem)',
              maxWidth: 620,
              margin: '12px auto 0',
            }}
          >
            Fix the coordinates in time and space. The living countdown begins immediately.
          </p>
        </div>

        {/* Live Countdown Grid */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 'clamp(12px, 3vw, 32px)',
            marginBottom: 48,
          }}
        >
          {[
            { label: 'Days Remaining', val: countdown.days },
            { label: 'Hours', val: countdown.hours },
            { label: 'Minutes', val: countdown.minutes },
          ].map((item, idx) => (
            <div
              key={idx}
              className="cinematic-glass-card"
              style={{
                padding: 'clamp(16px, 3vw, 28px) clamp(20px, 4vw, 36px)',
                textAlign: 'center',
                minWidth: 'clamp(90px, 20vw, 140px)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
                  fontWeight: 800,
                  color: '#F5D061',
                  lineHeight: 1,
                  marginBottom: 6,
                }}
              >
                {item.val}
              </div>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'rgba(245, 247, 251, 0.6)',
                  fontWeight: 700,
                }}
              >
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {/* Date and Venue Interactive Inputs */}
        <div
          className="cinematic-glass-card"
          style={{
            padding: 'clamp(24px, 5vw, 44px)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 32,
            marginBottom: 36,
          }}
        >
          {/* Date Picker Section */}
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#D4AF37',
                marginBottom: 12,
              }}
            >
              <CalendarDays size={16} />
              <span>Event Date</span>
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => onEventDateChange(e.target.value)}
              className="atelier-input"
              data-cursor="DATE"
              style={{
                colorScheme: 'dark',
              }}
            />
          </div>

          {/* Venue Location Section */}
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#D4AF37',
                marginBottom: 12,
              }}
            >
              <MapPin size={16} />
              <span>Sanctuary / Venue</span>
            </label>
            <input
              type="text"
              value={venueName}
              onChange={(e) => onVenueNameChange(e.target.value)}
              placeholder="e.g. Lake Palace, Udaipur"
              className="atelier-input"
              data-cursor="VENUE"
            />
          </div>
        </div>

        {/* Venue Presets */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            flexWrap: 'wrap',
            marginBottom: 44,
          }}
        >
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(245, 247, 251, 0.45)' }}>
            Iconic Palaces:
          </span>
          {VENUE_PRESETS.map((v) => (
            <button
              key={v}
              onClick={() => {
                atelierSoundscape.playPaperWhisper();
                onVenueNameChange(v);
              }}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: venueName === v ? '#F5D061' : 'rgba(245, 247, 251, 0.75)',
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.25s ease',
              }}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Proceed Action */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => {
              atelierSoundscape.playResonantBell();
              onNextScene();
            }}
            data-cursor="PROCEED"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              padding: '16px 36px',
              borderRadius: 999,
              background: 'linear-gradient(135deg, #FAF8F5 0%, #D4AF37 100%)',
              color: '#07090D',
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              border: 'none',
              boxShadow: '0 15px 35px rgba(212, 175, 55, 0.4)',
              cursor: 'pointer',
            }}
          >
            <span>Proceed to Story & Dedication</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
};
