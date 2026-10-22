'use client';

import React, { useState } from 'react';
import { Experience, Theme, DEFAULT_THEMES } from '@orbitox-io/celebrations';
import { ExperienceView } from '../renderer/ExperienceView';
import { ViewportMode } from './StudioData';
import {
  X,
  Monitor,
  Tablet,
  Smartphone,
  ExternalLink,
  ArrowLeft,
  Sparkles,
  Eye,
  Key,
} from 'lucide-react';

interface FullGuestPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  experience: Experience;
  themeSlug: string;
}

export function FullGuestPreviewModal({
  isOpen,
  onClose,
  experience,
  themeSlug,
}: FullGuestPreviewModalProps) {
  const [viewport, setViewport] = useState<ViewportMode>('desktop');

  if (!isOpen) return null;

  const matchedTheme =
    DEFAULT_THEMES.find((t) => t.slug === themeSlug) || (DEFAULT_THEMES[0] as Theme);

  const viewportWidths: Record<ViewportMode, string> = {
    desktop: '100%',
    tablet: '768px',
    mobile: '420px',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#050608',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* ─── FULL PREVIEW TOP IMMERSION BAR ─── */}
      <header
        style={{
          height: 60,
          background: 'rgba(11, 11, 15, 0.96)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          flexShrink: 0,
          zIndex: 100,
        }}
      >
        {/* Left: Back to Studio & Live Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 16px',
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              color: '#f4f4f5',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.16)';
            }}
          >
            <ArrowLeft size={15} />
            <span>Return to Studio</span>
          </button>

          <span style={{ width: 1, height: 20, background: 'rgba(255, 255, 255, 0.1)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#10b981',
                boxShadow: '0 0 8px #10b981',
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', letterSpacing: '0.02em' }}>
              Guest Experience View
            </span>
            <span style={{ color: '#71717a', fontSize: 12 }}>•</span>
            <span style={{ fontSize: 12, color: '#a1a1aa' }}>{experience.title}</span>
          </div>
        </div>

        {/* Center: Viewport Switcher */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(24, 24, 27, 0.8)',
            padding: 4,
            borderRadius: 10,
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <button
            type="button"
            onClick={() => setViewport('desktop')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 7,
              fontSize: 12,
              fontWeight: viewport === 'desktop' ? 700 : 500,
              background: viewport === 'desktop' ? '#27272a' : 'transparent',
              color: viewport === 'desktop' ? '#ffffff' : '#a1a1aa',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Monitor size={14} />
            <span>Desktop</span>
          </button>

          <button
            type="button"
            onClick={() => setViewport('tablet')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 7,
              fontSize: 12,
              fontWeight: viewport === 'tablet' ? 700 : 500,
              background: viewport === 'tablet' ? '#27272a' : 'transparent',
              color: viewport === 'tablet' ? '#ffffff' : '#a1a1aa',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Tablet size={14} />
            <span>Tablet</span>
          </button>

          <button
            type="button"
            onClick={() => setViewport('mobile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 7,
              fontSize: 12,
              fontWeight: viewport === 'mobile' ? 700 : 500,
              background: viewport === 'mobile' ? '#27272a' : 'transparent',
              color: viewport === 'mobile' ? '#ffffff' : '#a1a1aa',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Smartphone size={14} />
            <span>Mobile</span>
          </button>
        </div>

        {/* Right: Open in New Tab & Exit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a
            href="/e/preview"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 8,
              background: 'rgba(251, 191, 36, 0.12)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              color: '#fbbf24',
              fontSize: 12,
              fontWeight: 700,
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>Open in New Tab</span>
            <ExternalLink size={13} />
          </a>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#a1a1aa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Close Preview (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* ─── PREVIEW CANVAS WRAPPER ─── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          justifyContent: 'center',
          background: 'radial-gradient(circle at 50% 10%, rgba(212, 175, 55, 0.06) 0%, #050608 70%)',
          padding: viewport === 'desktop' ? '0' : '24px 0',
        }}
      >
        <div
          style={{
            width: viewportWidths[viewport],
            maxWidth: viewport === 'desktop' ? '100%' : viewportWidths[viewport],
            minHeight: '100%',
            backgroundColor: '#07090E',
            borderRadius: viewport === 'desktop' ? 0 : 20,
            border: viewport === 'desktop' ? 'none' : '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: viewport === 'desktop' ? 'none' : '0 30px 90px rgba(0, 0, 0, 0.95)',
            position: 'relative',
            overflowX: 'hidden',
          }}
        >
          <ExperienceView experience={experience} theme={matchedTheme} />
        </div>
      </div>
    </div>
  );
}
