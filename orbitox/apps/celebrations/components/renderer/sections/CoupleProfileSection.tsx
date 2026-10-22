'use client';

import React from 'react';
import { ExperienceSection, Theme } from '@orbitox-io/celebrations';

interface Props {
  section: ExperienceSection;
  theme: Theme;
}

export function CoupleProfileSection({ section, theme }: Props) {
  const config = section.config || {};
  const partner1Name = (config.partner1Name as string) || 'Aarav Sharma';
  const partner1Role = (config.partner1Role as string) || 'The Groom';
  const partner1Bio =
    (config.partner1Bio as string) ||
    'An architect with a passion for heritage structures and slow mornings with black coffee.';
  const partner1Image =
    (config.partner1Image as string) ||
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80';

  const partner2Name = (config.partner2Name as string) || 'Meera Patel';
  const partner2Role = (config.partner2Role as string) || 'The Bride';
  const partner2Bio =
    (config.partner2Bio as string) ||
    'A wildlife photographer captivated by mountain mist, classical dance, and candid stories.';
  const partner2Image =
    (config.partner2Image as string) ||
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=80';

  return (
    <section
      style={{
        padding: '90px 24px',
        background: theme.styleConfig.backgroundColor,
        color: theme.styleConfig.textColor,
      }}
    >
      <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-block',
            fontSize: '0.85rem',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            color: theme.styleConfig.primaryColor,
            marginBottom: '12px',
            fontWeight: 700,
          }}
        >
          Better Together
        </div>

        <h2
          style={{
            fontFamily: theme.styleConfig.fontHeading,
            fontSize: 'clamp(2.2rem, 5vw, 3.2rem)',
            color: theme.styleConfig.textColor,
            marginBottom: '60px',
          }}
        >
          Meet the Celebrants
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '40px',
            alignItems: 'stretch',
          }}
        >
          {/* Partner 1 */}
          <div
            style={{
              background: theme.styleConfig.cardBackgroundColor || 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${theme.styleConfig.primaryColor}33`,
              borderRadius: '24px',
              padding: '36px 28px',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: '160px',
                height: '160px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: `3px solid ${theme.styleConfig.primaryColor}`,
                boxShadow: `0 0 25px ${theme.styleConfig.primaryColor}44`,
                marginBottom: '24px',
              }}
            >
              <img
                src={partner1Image}
                alt={partner1Name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <div
              style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                color: theme.styleConfig.primaryColor,
                fontWeight: 700,
                marginBottom: '6px',
              }}
            >
              {partner1Role}
            </div>

            <h3
              style={{
                fontFamily: theme.styleConfig.fontHeading,
                fontSize: '1.8rem',
                color: theme.styleConfig.textColor,
                marginBottom: '14px',
              }}
            >
              {partner1Name}
            </h3>

            <p
              style={{
                fontFamily: theme.styleConfig.fontBody,
                fontSize: '0.95rem',
                lineHeight: 1.7,
                color: theme.styleConfig.mutedTextColor,
              }}
            >
              {partner1Bio}
            </p>
          </div>

          {/* Partner 2 */}
          <div
            style={{
              background: theme.styleConfig.cardBackgroundColor || 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${theme.styleConfig.primaryColor}33`,
              borderRadius: '24px',
              padding: '36px 28px',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: '160px',
                height: '160px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: `3px solid ${theme.styleConfig.primaryColor}`,
                boxShadow: `0 0 25px ${theme.styleConfig.primaryColor}44`,
                marginBottom: '24px',
              }}
            >
              <img
                src={partner2Image}
                alt={partner2Name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <div
              style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                color: theme.styleConfig.primaryColor,
                fontWeight: 700,
                marginBottom: '6px',
              }}
            >
              {partner2Role}
            </div>

            <h3
              style={{
                fontFamily: theme.styleConfig.fontHeading,
                fontSize: '1.8rem',
                color: theme.styleConfig.textColor,
                marginBottom: '14px',
              }}
            >
              {partner2Name}
            </h3>

            <p
              style={{
                fontFamily: theme.styleConfig.fontBody,
                fontSize: '0.95rem',
                lineHeight: 1.7,
                color: theme.styleConfig.mutedTextColor,
              }}
            >
              {partner2Bio}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
