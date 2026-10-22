'use client';

import React, { useState } from 'react';
import { Smartphone, Monitor, Sparkles, MapPin, Calendar, Users, Heart, ExternalLink } from 'lucide-react';

export interface StudioFormData {
  occasionSlug: string;
  themeSlug: string;
  protagonist1: string;
  protagonist2: string;
  eventTitle: string;
  tagline: string;
  date: string;
  venueName: string;
  city: string;
  storyQuote: string;
  enableRsvp: boolean;
  enableShagun: boolean;
  upiId: string;
  enableGuestbook: boolean;
}

interface LivePreviewPanelProps {
  data: StudioFormData;
}

export function LivePreviewPanel({ data }: LivePreviewPanelProps) {
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'desktop'>('mobile');

  // Derive theme styling
  const getThemeStyles = () => {
    switch (data.themeSlug) {
      case 'royal-heritage':
        return {
          bg: 'linear-gradient(180deg, #181324 0%, #0d0a14 100%)',
          accent: '#eab308',
          accentGlow: 'rgba(234, 179, 8, 0.25)',
          fontFamily: "'Playfair Display', serif",
          tag: 'Royal Heritage',
        };
      case 'botanical-solarium':
        return {
          bg: 'linear-gradient(180deg, #091c14 0%, #050e0a 100%)',
          accent: '#10b981',
          accentGlow: 'rgba(16, 185, 129, 0.25)',
          fontFamily: "'Inter', sans-serif",
          tag: 'Botanical Solarium',
        };
      case 'midnight-starlight':
        return {
          bg: 'linear-gradient(180deg, #0b0f24 0%, #050711 100%)',
          accent: '#818cf8',
          accentGlow: 'rgba(129, 140, 248, 0.25)',
          fontFamily: "'Inter', sans-serif",
          tag: 'Midnight Starlight',
        };
      case 'editorial-atelier':
      default:
        return {
          bg: 'linear-gradient(180deg, #1f1a14 0%, #0c0b0a 100%)',
          accent: '#d4af37',
          accentGlow: 'rgba(212, 175, 55, 0.25)',
          fontFamily: "'Playfair Display', serif",
          tag: 'Editorial Atelier',
        };
    }
  };

  const theme = getThemeStyles();
  const titleDisplay = data.protagonist2
    ? `${data.protagonist1 || 'Protagonist 1'} & ${data.protagonist2 || 'Protagonist 2'}`
    : data.protagonist1 || 'Celebration Host';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--color-surface-1)',
        borderLeft: '1px solid var(--color-border)',
      }}
    >
      {/* Top Preview Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          borderBottom: '1px solid var(--color-border)',
          background: 'rgba(255, 255, 255, 0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
            Live Guest Preview
          </span>
          <span className="badge badge-accent" style={{ fontSize: '0.66rem' }}>
            Instant Updates
          </span>
        </div>

        {/* Viewport switchers */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--color-surface-2)', padding: '3px', borderRadius: '8px' }}>
          <button
            onClick={() => setDeviceMode('mobile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.74rem',
              fontWeight: deviceMode === 'mobile' ? 700 : 500,
              background: deviceMode === 'mobile' ? 'var(--color-surface-3)' : 'transparent',
              color: deviceMode === 'mobile' ? '#ffffff' : 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            <Smartphone size={13} />
            <span>Mobile</span>
          </button>
          <button
            onClick={() => setDeviceMode('desktop')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.74rem',
              fontWeight: deviceMode === 'desktop' ? 700 : 500,
              background: deviceMode === 'desktop' ? 'var(--color-surface-3)' : 'transparent',
              color: deviceMode === 'desktop' ? '#ffffff' : 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            <Monitor size={13} />
            <span>Expanded</span>
          </button>
        </div>
      </div>

      {/* Preview Stage Container */}
      <div
        style={{
          flex: 1,
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflowY: 'auto',
          background: 'radial-gradient(circle at 50% 30%, rgba(124, 92, 252, 0.06), transparent 70%)',
        }}
      >
        <div
          style={{
            width: deviceMode === 'mobile' ? '340px' : '560px',
            minHeight: '520px',
            maxHeight: '620px',
            borderRadius: '32px',
            border: '6px solid #27272a',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 32px ' + theme.accentGlow,
            background: theme.bg,
            overflowY: 'auto',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '28px 24px',
            color: '#ffffff',
            transition: 'all 0.3s ease',
          }}
        >
          {/* Subtle Phone Notch / Speaker */}
          {deviceMode === 'mobile' && (
            <div
              style={{
                position: 'absolute',
                top: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '70px',
                height: '4px',
                borderRadius: '999px',
                background: 'rgba(255, 255, 255, 0.2)',
              }}
            />
          )}

          {/* Invitation Content Inside Device */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: theme.accent,
                  border: `1px solid ${theme.accent}44`,
                  padding: '3px 10px',
                  borderRadius: '999px',
                  background: 'rgba(0,0,0,0.3)',
                }}
              >
                {data.occasionSlug.toUpperCase()} INVITATION
              </span>
            </div>

            <h3
              style={{
                fontFamily: theme.fontFamily,
                fontSize: deviceMode === 'mobile' ? '1.85rem' : '2.4rem',
                fontWeight: 700,
                textAlign: 'center',
                lineHeight: 1.15,
                color: '#ffffff',
                marginBottom: '8px',
              }}
            >
              {titleDisplay}
            </h3>

            <p
              style={{
                fontSize: '0.84rem',
                color: 'rgba(255, 255, 255, 0.7)',
                textAlign: 'center',
                marginBottom: '20px',
              }}
            >
              {data.tagline || 'Together with our families, we invite you to celebrate our union.'}
            </p>

            {/* Date & Location box */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '14px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '0.8rem',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={14} color={theme.accent} />
                <span>{data.date || 'Saturday, February 18, 2027'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={14} color={theme.accent} />
                <span>
                  {data.venueName || 'Grand Palace'} {data.city ? `• ${data.city}` : ''}
                </span>
              </div>
            </div>

            {/* Quote block */}
            {data.storyQuote && (
              <div
                style={{
                  fontStyle: 'italic',
                  fontSize: '0.8rem',
                  color: 'rgba(255, 255, 255, 0.65)',
                  textAlign: 'center',
                  borderLeft: `2px solid ${theme.accent}`,
                  paddingLeft: '12px',
                  margin: '14px 0',
                }}
              >
                &ldquo;{data.storyQuote}&rdquo;
              </div>
            )}
          </div>

          {/* Bottom Interactive CTAs in Device */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
            {data.enableRsvp && (
              <button
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  background: theme.accent,
                  color: '#090b10',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  border: 'none',
                  boxShadow: `0 4px 14px ${theme.accentGlow}`,
                }}
              >
                RSVP & Confirm Attendance
              </button>
            )}

            {data.enableShagun && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: '0.74rem',
                }}
              >
                <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Digital Shagun:</span>
                <span style={{ color: '#10b981', fontWeight: 600 }}>UPI Ready ({data.upiId || 'Verified'})</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
