'use client';

import React from 'react';
import { ExperienceSection, Theme } from '@orbitox-io/celebrations';
import { Sparkles } from 'lucide-react';

interface Props {
  section: ExperienceSection;
  theme: Theme;
}

export function DressCodeSection({ section, theme }: Props) {
  const config = section.config || {};
  const title = (config.title as string) || 'Attire & Color Palette';
  const subtitle =
    (config.subtitle as string) || 'We invite you to complement our celebration palette';
  const description =
    (config.description as string) ||
    'Formal Indian or Black-Tie optional. Pastel shades and jewel tones are welcome.';
  const colors =
    (config.colors as Array<{
      name: string;
      hex: string;
    }>) || [
      { name: 'Champagne Gold', hex: '#D4AF37' },
      { name: 'Forest Emerald', hex: '#0E3A2F' },
      { name: 'Dusty Rose', hex: '#E8A598' },
      { name: 'Warm Ivory', hex: '#FAF7F5' },
    ];

  return (
    <section
      style={{
        padding: '80px 24px',
        background: theme.styleConfig.backgroundColor,
        color: theme.styleConfig.textColor,
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <div
          style={{
            fontSize: '0.85rem',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            color: theme.styleConfig.primaryColor,
            marginBottom: '12px',
            fontWeight: 700,
          }}
        >
          Style & Aesthetic
        </div>

        <h2
          style={{
            fontFamily: theme.styleConfig.fontHeading,
            fontSize: 'clamp(2rem, 4.5vw, 3rem)',
            color: theme.styleConfig.textColor,
            marginBottom: '16px',
          }}
        >
          {title}
        </h2>

        <p
          style={{
            fontFamily: theme.styleConfig.fontBody,
            fontSize: '1.05rem',
            color: theme.styleConfig.mutedTextColor,
            marginBottom: '36px',
          }}
        >
          {subtitle}
        </p>

        {/* Color Swatches */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '24px',
            marginBottom: '36px',
          }}
        >
          {colors.map((c, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: c.hex,
                  border: '3px solid rgba(255,255,255,0.2)',
                  boxShadow: `0 6px 18px ${c.hex}44`,
                }}
              />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: theme.styleConfig.textColor }}>
                {c.name}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            background: theme.styleConfig.cardBackgroundColor || 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${theme.styleConfig.primaryColor}26`,
            borderRadius: '16px',
            padding: '20px 24px',
            fontSize: '0.95rem',
            lineHeight: 1.6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <Sparkles size={16} color={theme.styleConfig.primaryColor} style={{ flexShrink: 0 }} />
          <span>{description}</span>
        </div>
      </div>
    </section>
  );
}
