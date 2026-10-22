'use client';

import React from 'react';
import { Theme, DEFAULT_THEMES } from '@orbitox-io/celebrations';
import { Sparkles, Music, Check, Compass, Disc } from 'lucide-react';
import { atelierSoundscape } from '@/lib/atelier-soundscape';

interface UniverseMoodSelectorProps {
  selectedTheme: Theme;
  onSelectTheme: (theme: Theme) => void;
}

export interface UniverseDef {
  slug: string;
  name: string;
  tagline: string;
  palette: [string, string, string];
  audioVibe: string;
  fontSpecimen: string;
  bgTexture: string;
}

export const UNIVERSE_DEFINITIONS: UniverseDef[] = [
  {
    slug: 'royal-regalia',
    name: 'Royal Regalia',
    tagline: 'Opulent palace grandeur with gold filigree and deep emerald.',
    palette: ['#071510', '#D4AF37', '#FAF8F5'],
    audioVibe: 'Versailles Chamber Cello & Harp',
    fontSpecimen: 'Cinzel Decorative',
    bgTexture: 'radial-gradient(circle at top right, rgba(212,175,55,0.25), rgba(7,21,16,0.95))',
  },
  {
    slug: 'celestial-gold',
    name: 'Celestial Gold',
    tagline: 'Midnight navy starlight shimmer and champagne gold gradients.',
    palette: ['#0B1120', '#F5D061', '#F8FAFC'],
    audioVibe: 'Symphonic Celestial Strings',
    fontSpecimen: 'Playfair Display',
    bgTexture: 'radial-gradient(circle at center, rgba(245,208,97,0.2), rgba(11,17,32,0.98))',
  },
  {
    slug: 'amalfi-riviera',
    name: 'Amalfi Riviera',
    tagline: 'Mediterranean terracotta, sea mist, and warm sunlit citrus.',
    palette: ['#8C3A27', '#E5A967', '#FFF7ED'],
    audioVibe: 'Italian Riviera Acoustic Guitar',
    fontSpecimen: 'Italiana Serif',
    bgTexture: 'linear-gradient(135deg, rgba(140,58,39,0.7), rgba(24,14,10,0.95))',
  },
  {
    slug: 'enchanted-glasshouse',
    name: 'Enchanted Glasshouse',
    tagline: 'Botanical sanctuary, soft dewy rose, and morning mist.',
    palette: ['#1C2E24', '#F3D9D9', '#E8F3EE'],
    audioVibe: 'Botanical Sanctuary Piano',
    fontSpecimen: 'Cormorant Garamond',
    bgTexture: 'radial-gradient(ellipse at 50% 30%, rgba(243,217,217,0.25), rgba(28,46,36,0.95))',
  },
  {
    slug: 'party-nocturne',
    name: 'Party Nocturne',
    tagline: 'Pitch noir, gold ember glow, and chic midnight energy.',
    palette: ['#050507', '#E6C875', '#FAF8F5'],
    audioVibe: 'Monaco Midnight Lounge Beats',
    fontSpecimen: 'Plus Jakarta Sans',
    bgTexture: 'radial-gradient(circle at 80% 20%, rgba(230,200,117,0.3), rgba(5,5,7,0.98))',
  },
  {
    slug: 'minimal-editorial',
    name: 'Minimal Editorial',
    tagline: 'Archival warm bone, pristine whitespace, and monolith typography.',
    palette: ['#F8F6F0', '#111111', '#888888'],
    audioVibe: 'Contemporary Acoustic Etude',
    fontSpecimen: 'Cinzel Roman',
    bgTexture: 'linear-gradient(180deg, rgba(248,246,240,0.12), rgba(12,14,18,0.95))',
  },
];

export const UniverseMoodSelector: React.FC<UniverseMoodSelectorProps> = ({
  selectedTheme,
  onSelectTheme,
}) => {
  return (
    <div style={{ width: '100%', maxWidth: 1120, margin: '0 auto' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 18,
          padding: '10px 0',
        }}
      >
        {UNIVERSE_DEFINITIONS.map((def) => {
          const isSelected =
            selectedTheme.slug === def.slug ||
            (selectedTheme.slug.includes('glasshouse') && def.slug === 'enchanted-glasshouse') ||
            (selectedTheme.slug.includes('botanical') && def.slug === 'enchanted-glasshouse');

          return (
            <div
              key={def.slug}
              onClick={() => {
                atelierSoundscape.playHarpArpeggio();
                const prefix = def.slug.split('-')[0] || '';
                const matched =
                  DEFAULT_THEMES.find((t) => t.slug === def.slug) ||
                  (prefix ? DEFAULT_THEMES.find((t) => t.slug.includes(prefix)) : undefined) ||
                  selectedTheme;
                onSelectTheme(matched);
              }}
              style={{
                position: 'relative',
                padding: '24px 22px',
                borderRadius: 22,
                background: def.bgTexture,
                border: isSelected ? '2px solid #D4AF37' : '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: isSelected
                  ? '0 20px 50px rgba(212, 175, 55, 0.25), 0 0 30px rgba(212, 175, 55, 0.15)'
                  : '0 12px 30px rgba(0, 0, 0, 0.35)',
                cursor: 'pointer',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                transition: 'all 0.4s cubic-bezier(0.19, 1, 0.22, 1)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 220,
              }}
            >
              {/* Header: Name, Palette Swatches & Check */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {def.palette.map((color, idx) => (
                      <span
                        key={idx}
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          background: color,
                          border: '1px solid rgba(255,255,255,0.3)',
                          display: 'inline-block',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.4)',
                        }}
                      />
                    ))}
                  </div>

                  {isSelected && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '4px 10px',
                        borderRadius: 999,
                        background: 'linear-gradient(135deg, #FAF4E1, #D4AF37)',
                        color: '#0A0D14',
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      <Check size={12} strokeWidth={3} /> Active Universe
                    </div>
                  )}
                </div>

                <h4
                  style={{
                    fontSize: '1.45rem',
                    fontFamily: 'var(--font-display)',
                    color: isSelected ? '#FAF4E1' : '#FFFFFF',
                    margin: 0,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {def.name}
                </h4>

                <p
                  style={{
                    marginTop: 8,
                    fontSize: '0.86rem',
                    lineHeight: 1.45,
                    color: 'rgba(245, 247, 251, 0.72)',
                  }}
                >
                  {def.tagline}
                </p>
              </div>

              {/* Bottom: Font Specimen & Sound Info */}
              <div
                style={{
                  marginTop: 18,
                  paddingTop: 14,
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  color: 'rgba(245, 247, 251, 0.65)',
                }}
              >
                <span style={{ fontStyle: 'italic', letterSpacing: '0.05em' }}>
                  {def.fontSpecimen}
                </span>

                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#F5D061' }}>
                  <Music size={12} /> {def.audioVibe}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
