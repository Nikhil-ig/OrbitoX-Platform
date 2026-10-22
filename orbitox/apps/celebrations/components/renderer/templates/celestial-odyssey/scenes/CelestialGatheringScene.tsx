'use client';

import React from 'react';
import { Clock, MapPin, Navigation, Shirt, Sparkles, Car } from 'lucide-react';
import { CelestialEventItem } from './CelestialItineraryScene';
import { SceneLayoutConfig, SceneMotionConfig, SceneInteractionConfig } from '@/components/studio/StudioData';

interface CelestialGatheringSceneProps {
  events: CelestialEventItem[];
  protocolDressCode?: string;
  venueName?: string;
  venueCity?: string;
  venueAddress?: string;
  primaryAccent?: string;
  layout?: SceneLayoutConfig;
  motion?: SceneMotionConfig;
  interactions?: SceneInteractionConfig[];
}

export function CelestialGatheringScene({
  events,
  protocolDressCode = 'Formal Elegance • Black Tie & Gilded Accents',
  venueName = 'The Grand Lake Sanctuary',
  venueCity = 'Lake Como, Italy',
  venueAddress = 'Via Regina 24, 22010 Tremezzina CO, Italy',
  primaryAccent = '#E5C07B',
  layout,
  motion,
  interactions,
}: CelestialGatheringSceneProps) {
  const handleOpenMaps = () => {
    if (typeof window !== 'undefined') {
      const query = encodeURIComponent(`${venueName} ${venueAddress} ${venueCity}`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  };

  // Dynamic layout rules (P2-7)
  const composition = layout?.composition || 'editorial';
  const paddingTop = layout?.paddingTopRem !== undefined ? `${layout.paddingTopRem}rem` : 'clamp(44px, 6vh, 68px)';
  const paddingBottom = layout?.paddingBottomRem !== undefined ? `${layout.paddingBottomRem}rem` : 'clamp(44px, 6vh, 68px)';
  const contentMaxWidth = layout?.contentMaxWidthPx !== undefined ? `${layout.contentMaxWidthPx}px` : '1100px';

  // Dynamic motion config (P2-8)
  const entryDuration = motion?.entryDuration !== undefined ? `${motion.entryDuration}s` : '0.8s';
  const motionEasing = motion?.easing || 'cubic-bezier(0.16, 1, 0.3, 1)';
  const isReducedStatic = motion?.reducedMotionFallback === 'static' || motion?.reducedMotionFallback === 'instant';

  return (
    <section
      id="moment-gathering"
      aria-label="The Celebration & Order of Events"
      style={{
        position: 'relative',
        padding: `${paddingTop} 20px ${paddingBottom}`,
        overflow: 'hidden',
        background: 'radial-gradient(ellipse 90% 70% at 50% 50%, rgba(12, 16, 36, 0.7) 0%, rgba(6, 8, 15, 0.98) 100%)',
        transition: isReducedStatic ? 'none' : `padding ${entryDuration} ${motionEasing}`,
      }}
    >
      <div style={{ maxWidth: contentMaxWidth, margin: '0 auto', position: 'relative', zIndex: 2 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(32px, 5vh, 52px)' }}>
          {/* Incoming continuity light beam from Alignment */}
          <div
            style={{
              width: '1px',
              height: '24px',
              background: `linear-gradient(180deg, transparent 0%, ${primaryAccent}66 100%)`,
              margin: '0 auto 12px',
              opacity: 0.8,
            }}
          />

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
            The Gathering
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
            Celebration &amp; Sanctuary
          </h2>

          <p
            style={{
              fontSize: 'clamp(0.92rem, 1.8vw, 1.05rem)',
              color: 'rgba(255, 249, 245, 0.65)',
              maxWidth: '520px',
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            A sacred timeline of celebration in our lakeside haven beneath the open night sky.
          </p>
        </div>

        {/* Master Gathering Grid: Left Venue / Right Itinerary Timeline */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 'clamp(32px, 4vw, 56px)',
            alignItems: 'start',
          }}
        >
          {/* Left Column: Sanctuary Photographic Experience */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '28px',
              padding: 'clamp(24px, 4vw, 36px)',
            }}
          >
            {/* Sanctuary Image */}
            <div
              style={{
                position: 'relative',
                borderRadius: '20px',
                overflow: 'hidden',
                aspectRatio: '16 / 10',
                marginBottom: '24px',
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&q=85"
                alt={venueName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, transparent 50%, rgba(6, 8, 15, 0.8) 100%)',
                }}
              />
            </div>

            <span
              style={{
                fontSize: '0.74rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: primaryAccent,
                marginBottom: '6px',
              }}
            >
              The Sanctuary
            </span>

            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
                fontWeight: 400,
                color: '#FFF9F5',
                margin: '0 0 8px 0',
              }}
            >
              {venueName}
            </h3>

            <p style={{ color: 'rgba(255, 249, 245, 0.7)', fontSize: '0.92rem', lineHeight: 1.6, margin: '0 0 20px 0' }}>
              {venueAddress}, {venueCity}
            </p>

            {/* Dress code & transit chips */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {protocolDressCode && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.82rem' }}>
                  <Shirt size={14} style={{ color: primaryAccent }} />
                  <span>{protocolDressCode}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.82rem' }}>
                <Car size={14} style={{ color: primaryAccent }} />
                <span>Complimentary valet &amp; river shuttle transfers available</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenMaps}
              style={{
                position: 'relative',
                overflow: 'hidden',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '9999px',
                background: `linear-gradient(135deg, ${primaryAccent} 0%, #D4AF37 100%)`,
                color: '#07080D',
                fontWeight: 600,
                fontSize: '0.86rem',
                border: 'none',
                cursor: 'pointer',
                minHeight: '40px',
                boxShadow: `0 4px 16px ${primaryAccent}33`,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%)',
                  animation: 'celestialButtonShimmer 5s ease-in-out infinite',
                  pointerEvents: 'none',
                }}
              />
              <Navigation size={14} style={{ position: 'relative', zIndex: 2 }} />
              <span style={{ position: 'relative', zIndex: 2 }}>Get Directions (Google Maps)</span>
            </button>
          </div>

          {/* Right Column: Ceremonial Timeline Sequence */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {events.map((ev, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '20px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '20px',
                  padding: '20px 24px',
                  transition: 'all 0.3s ease',
                }}
              >
                {/* Time Indicator */}
                <div style={{ minWidth: '64px', paddingTop: '2px' }}>
                  <span
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: '1.15rem',
                      fontWeight: 500,
                      color: primaryAccent,
                      textShadow: `0 0 12px ${primaryAccent}44`,
                    }}
                  >
                    {ev.time}
                  </span>
                </div>

                {/* Event Details */}
                <div style={{ flex: 1 }}>
                  <h4
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: '1.2rem',
                      color: '#FFF9F5',
                      margin: '0 0 6px 0',
                      fontWeight: 400,
                    }}
                  >
                    {ev.title}
                  </h4>
                  <p style={{ fontSize: '0.88rem', color: 'rgba(255, 249, 245, 0.65)', lineHeight: 1.5, margin: 0 }}>
                    {ev.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transition Bridge to RSVP / Attendance */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: 'clamp(36px, 6vh, 56px)' }}>
          <div className="celestial-photon-stream" style={{ width: '1px', height: '36px', background: `linear-gradient(180deg, ${primaryAccent}66 0%, ${primaryAccent} 100%)` }} />
          <div style={{ position: 'relative', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '6px 0' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FFF9F5', boxShadow: `0 0 12px ${primaryAccent}, 0 0 4px #FFF`, animation: 'celestialBeaconBreathe 3s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1px solid ${primaryAccent}55`, animation: 'celestialBeaconRingPulse 3s cubic-bezier(0.16, 1, 0.3, 1) infinite', pointerEvents: 'none' }} />
          </div>
          <span style={{ fontSize: '0.54rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: `${primaryAccent}CC`, fontWeight: 500 }}>
            CONFIRM ATTENDANCE
          </span>
          <div style={{ width: '1px', height: '24px', background: `linear-gradient(180deg, ${primaryAccent} 0%, transparent 100%)`, marginTop: '6px' }} />
        </div>
      </div>
    </section>
  );
}
