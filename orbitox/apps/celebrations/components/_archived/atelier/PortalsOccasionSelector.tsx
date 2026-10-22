'use client';

import React from 'react';
import { Occasion, DEFAULT_OCCASIONS } from '@orbitox-io/celebrations';
import { Sparkles, Heart, Cake, CalendarHeart, Baby, Flame, Building2, Check } from 'lucide-react';
import { atelierSoundscape } from '@/lib/atelier-soundscape';

interface PortalsOccasionSelectorProps {
  selectedOccasion: Occasion;
  onSelectOccasion: (occasion: Occasion) => void;
}

// Curated cinematic atmospheres for each occasion portal
const OCCASION_CINEMATICS: Record<string, { image: string; moodTagline: string; vibeBadge: string }> = {
  wedding: {
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
    moodTagline: 'Two souls, a timeless promise, an eternal gathering.',
    vibeBadge: 'Imperial Romantic',
  },
  birthday: {
    image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1200&q=80',
    moodTagline: 'An electric milestone celebrating another triumphant orbit.',
    vibeBadge: 'Joyful & Chic',
  },
  anniversary: {
    image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80',
    moodTagline: 'Honoring devotion, golden memories, and the years ahead.',
    vibeBadge: 'Timeless Devotion',
  },
  'baby-shower': {
    image: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=1200&q=80',
    moodTagline: 'Welcoming the gentle arrival of life’s purest miracle.',
    vibeBadge: 'Botanical Grace',
  },
  festival: {
    image: 'https://images.unsplash.com/photo-1543807535-eceef0bc6599?auto=format&fit=crop&w=1200&q=80',
    moodTagline: 'Sacred traditions, communal radiance, and festive illumination.',
    vibeBadge: 'Sacred Splendor',
  },
  corporate: {
    image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
    moodTagline: 'Prestigious award galas, executive summits, and visionary launches.',
    vibeBadge: 'Black Tie Gala',
  },
};

export const PortalsOccasionSelector: React.FC<PortalsOccasionSelectorProps> = ({
  selectedOccasion,
  onSelectOccasion,
}) => {
  const displayedOccasions = DEFAULT_OCCASIONS.slice(0, 6);

  return (
    <div style={{ width: '100%', maxWidth: 1120, margin: '0 auto' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
          padding: '10px 0',
        }}
      >
        {displayedOccasions.map((occasion) => {
          const isSelected = occasion.slug === selectedOccasion.slug;
          const fallbackCinematic = {
            image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
            moodTagline: 'Two souls, a timeless promise, an eternal gathering.',
            vibeBadge: 'Imperial Romantic',
          };
          const cinematic = OCCASION_CINEMATICS[occasion.slug] ?? fallbackCinematic;

          return (
            <div
              key={occasion.id}
              onClick={() => {
                atelierSoundscape.playHarpArpeggio();
                onSelectOccasion(occasion);
              }}
              style={{
                position: 'relative',
                height: 380,
                borderRadius: 24,
                overflow: 'hidden',
                cursor: 'pointer',
                border: isSelected ? '2px solid #D4AF37' : '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: isSelected
                  ? '0 25px 60px rgba(212, 175, 55, 0.28), 0 0 35px rgba(212, 175, 55, 0.2)'
                  : '0 16px 40px rgba(0, 0, 0, 0.4)',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                transition: 'all 0.45s cubic-bezier(0.19, 1, 0.22, 1)',
              }}
            >
              {/* Cinematic Background with gradient veil */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `url(${cinematic.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  transform: isSelected ? 'scale(1.08)' : 'scale(1.02)',
                  transition: 'transform 0.8s cubic-bezier(0.19, 1, 0.22, 1)',
                  filter: isSelected ? 'brightness(0.92) contrast(1.05)' : 'brightness(0.7) contrast(1)',
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(180deg, rgba(8, 10, 15, 0.25) 0%, rgba(8, 10, 15, 0.6) 50%, rgba(8, 10, 15, 0.95) 100%)',
                }}
              />

              {/* Selection Badge */}
              <div
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 999,
                  background: isSelected ? 'rgba(212, 175, 55, 0.95)' : 'rgba(10, 14, 20, 0.65)',
                  backdropFilter: 'blur(10px)',
                  border: isSelected ? '1px solid #FFF2C2' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: isSelected ? '#0A0D14' : '#F5D061',
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {isSelected ? (
                  <>
                    <Check size={13} strokeWidth={3} /> Selected
                  </>
                ) : (
                  cinematic.vibeBadge
                )}
              </div>

              {/* Content Anchored at Bottom */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: 22,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={14} color="#D4AF37" />
                  <span
                    style={{
                      fontSize: 11,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'rgba(245, 247, 251, 0.6)',
                    }}
                  >
                    Occasion Portal
                  </span>
                </div>

                <h3
                  style={{
                    fontSize: '1.75rem',
                    lineHeight: 1.15,
                    fontFamily: 'var(--font-display)',
                    color: isSelected ? '#FAF4E1' : '#FFFFFF',
                    margin: 0,
                  }}
                >
                  {occasion.name}
                </h3>

                <p
                  style={{
                    fontSize: '0.88rem',
                    lineHeight: 1.45,
                    color: 'rgba(245, 247, 251, 0.78)',
                    margin: 0,
                  }}
                >
                  {cinematic.moodTagline}
                </p>

                {isSelected && (
                  <div
                    style={{
                      marginTop: 8,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#F5D061',
                    }}
                  >
                    <span>World initialized</span>
                    <span style={{ fontSize: 16 }}>→</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
