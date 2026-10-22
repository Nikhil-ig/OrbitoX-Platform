'use client';

import React from 'react';
import { ExperienceSection, Theme } from '@orbitox-io/celebrations';
import { Sparkles, Calendar, MapPin } from 'lucide-react';
import { CoupleTitle } from '../CoupleTitle';

interface Props {
  section: ExperienceSection;
  theme: Theme;
}

export function HeroSection({ section, theme }: Props) {
  const config = section.config || {};
  const headline = (config.headline as string) || 'We are getting married!';
  const subheadline = (config.subheadline as string) || 'Save our date and celebrate with us';
  const hostNames = (config.hostNames as string) || 'Aarav & Meera';
  const eventDate = (config.eventDate as string) || 'December 18, 2026';
  const venueCity = (config.venueCity as string) || 'Udaipur, Rajasthan';
  const coverImageUrl =
    (config.coverImageUrl as string) ||
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=80';

  const overlayOpacity = (config.overlayOpacity as number) ?? 0.55;

  return (
    <section
      style={{
        position: 'relative',
        minHeight: '88vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '80px 24px',
        overflow: 'hidden',
        color: theme.styleConfig.textColor || '#FFFFFF',
      }}
    >
      {/* Background Cover Image with Parallax Aura */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url(${coverImageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.9)',
          transform: 'scale(1.02)',
          zIndex: 1,
        }}
      />

      {/* Dynamic Theme Gradient Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(180deg, rgba(0,0,0,0.4) 0%, ${theme.styleConfig.backgroundColor} 95%)`,
          opacity: overlayOpacity,
          zIndex: 2,
        }}
      />

      {/* Floating Particles or Glow */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '500px',
          height: '500px',
          background: `radial-gradient(circle, ${theme.styleConfig.primaryColor}33 0%, transparent 70%)`,
          filter: 'blur(60px)',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />

      {/* Content Container */}
      <div
        style={{
          position: 'relative',
          zIndex: 3,
          maxWidth: '850px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 18px',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${theme.styleConfig.primaryColor}55`,
            borderRadius: '9999px',
            fontSize: '0.85rem',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: theme.styleConfig.primaryColor,
            marginBottom: '24px',
            fontWeight: 700,
          }}
        >
          <Sparkles size={14} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} />
          <span>{headline}</span>
        </div>

        <CoupleTitle
          as="h1"
          title={hostNames}
          flourishColor={theme.styleConfig.primaryColor}
          style={{
            fontFamily: theme.styleConfig.fontHeading,
            fontSize: 'clamp(2.8rem, 7vw, 5.2rem)',
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: '20px',
            color: theme.styleConfig.primaryColor,
            textShadow: '0 4px 20px rgba(0,0,0,0.6)',
          }}
        />

        <p
          style={{
            fontFamily: theme.styleConfig.fontBody,
            fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)',
            color: theme.styleConfig.mutedTextColor || '#E2E8F0',
            maxWidth: '650px',
            margin: '0 auto 36px auto',
            lineHeight: 1.6,
          }}
        >
          {subheadline}
        </p>

        <div
          style={{
            display: 'inline-flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            padding: '12px 28px',
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(14px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
            <Calendar size={16} color={theme.styleConfig.primaryColor} />
            <span>{eventDate}</span>
          </div>
          <span style={{ opacity: 0.4 }}>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
            <MapPin size={16} color={theme.styleConfig.primaryColor} />
            <span>{venueCity}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
