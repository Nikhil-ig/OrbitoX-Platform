'use client';

import React, { useState } from 'react';
import { MapPin, Navigation, Copy, Check, Compass, Car, Plane, Moon } from 'lucide-react';

interface CelestialSanctuarySceneProps {
  venueName?: string;
  venueCity?: string;
  venueAddress?: string;
  primaryAccent?: string;
}

export function CelestialSanctuaryScene({
  venueName = 'The Grand Lake Sanctuary',
  venueCity = 'Lake Como, Italy',
  venueAddress = 'Via Regina 24, 22010 Tremezzina CO, Italy',
  primaryAccent = '#E5C07B',
}: CelestialSanctuarySceneProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`${venueName}, ${venueAddress}, ${venueCity}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleOpenMaps = () => {
    if (typeof window !== 'undefined') {
      const query = encodeURIComponent(`${venueName} ${venueAddress} ${venueCity}`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  };

  return (
    <section
      id="celestial-sanctuary-scene"
      aria-label="Astral Sanctuary & Venue Wayfinding"
      style={{
        position: 'relative',
        padding: '120px 24px',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(18, 22, 45, 0.5) 0%, rgba(7, 8, 13, 0.98) 100%)',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
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
            <Compass size={14} />
            <span>Terrestrial Coordinates</span>
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
            The Astral Sanctuary
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
            A tranquil sanctuary selected beneath an open sky, designed for celebration and eternal memories.
          </p>
        </div>

        {/* Master Sanctuary Card */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '36px',
            alignItems: 'center',
            background: 'linear-gradient(135deg, rgba(25, 30, 52, 0.45) 0%, rgba(10, 12, 22, 0.85) 100%)',
            border: '1px solid rgba(229, 192, 123, 0.2)',
            borderRadius: '32px',
            padding: 'clamp(24px, 4vw, 44px)',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)',
          }}
        >
          {/* Venue Visual Frame */}
          <div
            style={{
              position: 'relative',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 16px 36px rgba(0,0,0,0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              aspectRatio: '16 / 10',
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&q=85"
              alt={venueName}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />

            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, transparent 40%, rgba(7, 8, 13, 0.85) 100%)',
              }}
            />

            <div
              style={{
                position: 'absolute',
                bottom: '18px',
                left: '20px',
                right: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FFF9F5', fontSize: '0.86rem' }}>
                <Moon size={16} style={{ color: primaryAccent }} />
                <span>Midnight Horizon Setting</span>
              </div>
            </div>
          </div>

          {/* Venue Specifics & Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <span
                style={{
                  fontSize: '0.78rem',
                  letterSpacing: '0.2em',
                  color: primaryAccent,
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                Destination & Wayfinding
              </span>
              <h3
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)',
                  fontWeight: 400,
                  color: '#FFF9F5',
                  margin: '6px 0 10px 0',
                }}
              >
                {venueName}
              </h3>
              <p style={{ color: 'rgba(255, 249, 245, 0.72)', lineHeight: 1.6, margin: 0, fontSize: '0.98rem' }}>
                {venueAddress}, {venueCity}
              </p>
            </div>

            {/* Travel Guide Badges */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: primaryAccent, fontSize: '0.82rem', marginBottom: '4px' }}>
                  <Car size={14} />
                  <strong>Valet & Parking</strong>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Complimentary valet upon arrival at Sanctuary North Gate.
                </span>
              </div>

              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: primaryAccent, fontSize: '0.82rem', marginBottom: '4px' }}>
                  <Plane size={14} />
                  <strong>Transit Shuttles</strong>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Private river shuttles every 30m from city center docks.
                </span>
              </div>
            </div>

            {/* Actions: Maps & Copy */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', paddingTop: '8px' }}>
              <button
                type="button"
                onClick={handleOpenMaps}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '9999px',
                  background: `linear-gradient(135deg, ${primaryAccent} 0%, #D4AF37 100%)`,
                  color: '#07080D',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: `0 4px 20px ${primaryAccent}44`,
                  minHeight: '44px',
                  transition: 'all 0.2s ease',
                }}
              >
                <Navigation size={15} />
                <span>Launch Google Maps</span>
              </button>

              <button
                type="button"
                onClick={handleCopyAddress}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFF9F5',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  minHeight: '44px',
                  transition: 'all 0.2s ease',
                }}
              >
                {copied ? (
                  <>
                    <Check size={15} style={{ color: '#4ADE80' }} />
                    <span style={{ color: '#4ADE80' }}>Address Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={15} style={{ color: primaryAccent }} />
                    <span>Copy Coordinates</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
