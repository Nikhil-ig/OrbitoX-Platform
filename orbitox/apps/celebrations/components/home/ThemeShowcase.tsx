'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, ExternalLink, Eye, Check } from 'lucide-react';
import { DEFAULT_THEMES } from '@orbitox-io/celebrations';

interface ShowcaseTheme {
  id: string;
  name: string;
  category: 'Editorial' | 'Heritage' | 'Modern' | 'Romantic';
  badge: string;
  palette: string[];
  fontDisplay: string;
  description: string;
  demoSlug: string;
  previewGradient: string;
  accentColor: string;
}

const CURATED_THEMES: ShowcaseTheme[] = [
  {
    id: 'editorial-atelier',
    name: 'Editorial Atelier',
    category: 'Editorial',
    badge: 'Artisanal Vogue Style',
    palette: ['#121214', '#f5f0e8', '#c9a227', '#4a4843'],
    fontDisplay: 'Playfair Display Serif',
    description: 'High-fashion editorial layout featuring asymmetric typography, high-contrast imagery, and subtle grain.',
    demoSlug: 'vikram-ananya-wedding',
    previewGradient: 'radial-gradient(circle at 70% 30%, #30261a 0%, #0d0e12 100%)',
    accentColor: '#d4af37',
  },
  {
    id: 'royal-heritage',
    name: 'Royal Heritage',
    category: 'Heritage',
    badge: 'Palatial Splendor',
    palette: ['#0f172a', '#fde047', '#9333ea', '#f8fafc'],
    fontDisplay: 'Cinzel Decorative',
    description: 'Inspired by Indian royal palaces, gold foil filigree accents, and regal ceremonial pacing.',
    demoSlug: 'royal-wedding-demo',
    previewGradient: 'radial-gradient(circle at 60% 40%, #2e183b 0%, #090b12 100%)',
    accentColor: '#eab308',
  },
  {
    id: 'botanical-solarium',
    name: 'Botanical Solarium',
    category: 'Romantic',
    badge: 'Organic & Floral',
    palette: ['#06231a', '#86efac', '#fef3c7', '#14532d'],
    fontDisplay: 'Cormorant Garamond',
    description: 'Earthy emerald greens, botanical foliage illustrations, and gentle garden breeze aesthetics.',
    demoSlug: 'vikram-ananya-wedding',
    previewGradient: 'radial-gradient(circle at 40% 60%, #103322 0%, #08100c 100%)',
    accentColor: '#10b981',
  },
  {
    id: 'midnight-starlight',
    name: 'Midnight Starlight',
    category: 'Modern',
    badge: 'Cosmic & Nocturnal',
    palette: ['#050814', '#818cf8', '#e0e7ff', '#1e1b4b'],
    fontDisplay: 'Plus Jakarta Sans',
    description: 'Sleek dark obsidian canvas sprinkled with interactive starlight particles and glowing neon accents.',
    demoSlug: 'vikram-ananya-wedding',
    previewGradient: 'radial-gradient(circle at 50% 50%, #1e1b4b 0%, #05060d 100%)',
    accentColor: '#6366f1',
  },
];

export function ThemeShowcase() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const categories = ['All', 'Editorial', 'Heritage', 'Modern', 'Romantic'];

  const filteredThemes = selectedCategory === 'All'
    ? CURATED_THEMES
    : CURATED_THEMES.filter((t) => t.category === selectedCategory);

  return (
    <section
      id="themes"
      style={{
        padding: '96px 0',
        background: 'linear-gradient(180deg, rgba(17, 17, 20, 0.4) 0%, rgba(9, 9, 11, 0) 100%)',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '48px' }}>
          <span className="kicker" style={{ marginBottom: '16px' }}>
            Artisanal Aesthetics
          </span>
          <h2
            style={{
              fontSize: 'clamp(2rem, 3.8vw, 2.8rem)',
              lineHeight: 1.15,
              fontWeight: 800,
              letterSpacing: '-0.025em',
              marginBottom: '16px',
            }}
          >
            Curated Themes for Discerning Hosts
          </h2>
          <p
            style={{
              fontSize: '1.05rem',
              color: 'var(--color-text-secondary)',
              maxWidth: '680px',
              lineHeight: 1.6,
              marginBottom: '28px',
            }}
          >
            Not a generic template marketplace. Every theme is an engineered digital environment featuring
            harmonious typography, fluid animations, and device-responsive layouts.
          </p>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '999px',
                  fontSize: '0.84rem',
                  fontWeight: selectedCategory === cat ? 700 : 500,
                  background: selectedCategory === cat ? 'var(--color-surface-3)' : 'rgba(255, 255, 255, 0.03)',
                  color: selectedCategory === cat ? '#ffffff' : 'var(--color-text-secondary)',
                  border: selectedCategory === cat ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid var(--color-border)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Themes Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '28px',
          }}
        >
          {filteredThemes.map((theme) => (
            <div
              key={theme.id}
              style={{
                borderRadius: '20px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface-1)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
              }}
              className="surface-card"
            >
              <div>
                {/* Visual Preview Header */}
                <div
                  style={{
                    height: '180px',
                    background: theme.previewGradient,
                    position: 'relative',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '999px',
                        background: 'rgba(0, 0, 0, 0.5)',
                        backdropFilter: 'blur(10px)',
                        color: theme.accentColor,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        border: `1px solid ${theme.accentColor}44`,
                      }}
                    >
                      {theme.badge}
                    </span>

                    {/* Color Swatches */}
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {theme.palette.map((hex, idx) => (
                        <div
                          key={idx}
                          style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            backgroundColor: hex,
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Display Type Preview */}
                  <div>
                    <div
                      style={{
                        fontSize: '1.7rem',
                        fontWeight: 700,
                        color: '#ffffff',
                        lineHeight: 1.1,
                        textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                      }}
                    >
                      {theme.name}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.65)', marginTop: '4px' }}>
                      Type: {theme.fontDisplay}
                    </div>
                  </div>
                </div>

                {/* Theme Meta Body */}
                <div style={{ padding: '24px' }}>
                  <p
                    style={{
                      fontSize: '0.88rem',
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.55,
                      marginBottom: '20px',
                    }}
                  >
                    {theme.description}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>
                      <Check size={14} color="#10b981" />
                      <span>Adaptive light & dark ambient shifts</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>
                      <Check size={14} color="#10b981" />
                      <span>Interactive door opening choreography</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div
                style={{
                  padding: '16px 24px',
                  borderTop: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Link
                  href={`/e/${theme.demoSlug}`}
                  target="_blank"
                  className="btn-secondary"
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    padding: '9px 12px',
                    fontSize: '0.82rem',
                    gap: '6px',
                  }}
                >
                  <Eye size={14} />
                  <span>Preview Live</span>
                </Link>
                <Link
                  href={`/create?theme=${theme.id}`}
                  className="btn-primary"
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    padding: '9px 12px',
                    fontSize: '0.82rem',
                    gap: '6px',
                  }}
                >
                  <span>Use Theme</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA link */}
        <div style={{ textAlign: 'center', marginTop: '48px' }}>
          <Link
            href="/themes"
            className="btn-secondary"
            style={{
              padding: '11px 22px',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          >
            <span>Explore All Themes in Catalog</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}
