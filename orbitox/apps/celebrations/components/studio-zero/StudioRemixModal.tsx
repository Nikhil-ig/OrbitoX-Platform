'use client';

import React from 'react';
import {
  Wand2,
  X,
  Sparkles,
  Check,
  RefreshCw,
} from 'lucide-react';
import { TemplateSceneDefinition } from '@/components/template-studio/types/TemplateSchema';

interface StudioRemixModalProps {
  isOpen: boolean;
  onClose: () => void;
  sceneName: string;
  onApplyRemix: (remixId: string) => void;
}

export function StudioRemixModal({
  isOpen,
  onClose,
  sceneName,
  onApplyRemix,
}: StudioRemixModalProps) {
  if (!isOpen) return null;

  const remixStyles = [
    {
      id: 'editorial',
      name: 'Editorial Couture',
      desc: 'High-contrast typography, delicate serif titles, editorial border rules, generous whitespace',
      gradient: 'linear-gradient(135deg, #1C1917 0%, #292524 100%)',
      accent: '#F5F5F4',
    },
    {
      id: 'cinematic',
      name: 'Cinematic Depth',
      desc: 'Vignette atmosphere, smooth deep shadows, volumetric lighting, wide letter-spacing',
      gradient: 'linear-gradient(135deg, #090D1A 0%, #172554 100%)',
      accent: '#60A5FA',
    },
    {
      id: 'minimal',
      name: 'Bauhaus Minimal',
      desc: 'Geometric purity, stark monochromatic lines, neutral grey surfaces, zero unnecessary noise',
      gradient: 'linear-gradient(135deg, #18181B 0%, #27272A 100%)',
      accent: '#FFFFFF',
    },
    {
      id: 'luxury',
      name: 'Obsidian & Gold',
      desc: 'Deep black velvet surfaces, champagne gold accents, royal serif headings, specular glows',
      gradient: 'linear-gradient(135deg, #0A0A0A 0%, #1A170F 100%)',
      accent: '#DFBA6B',
    },
    {
      id: 'aurora',
      name: 'Aurora Borealis',
      desc: 'Vibrant chromatic mesh gradients, violet and emerald glow spheres, glassmorphism blur',
      gradient: 'linear-gradient(135deg, #4C1D95 0%, #065F46 100%)',
      accent: '#A78BFA',
    },
    {
      id: 'noir',
      name: 'Titanium Noir',
      desc: 'Sleek brushed metal surfaces, razor sharp borders, dark industrial posture, monospace accents',
      gradient: 'linear-gradient(135deg, #111215 0%, #1F2228 100%)',
      accent: '#94A3B8',
    },
    {
      id: 'futuristic',
      name: 'Cyberpunk Grid',
      desc: 'Neon cyan highlights, monospace technical labels, subtle grid overlays, high-velocity motion',
      gradient: 'linear-gradient(135deg, #082F49 0%, #0369A1 100%)',
      accent: '#38BDF8',
    },
    {
      id: 'brutalist',
      name: 'Neo Brutalist',
      desc: 'Heavy black borders, high-impact grotesque typography, bold geometry, asymmetric layout',
      gradient: 'linear-gradient(135deg, #18181B 0%, #09090B 100%)',
      accent: '#FACC15',
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(12px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '560px',
          background: '#16181D',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.8), 0 0 40px rgba(59, 130, 246, 0.15)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60A5FA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Wand2 size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#FFFFFF' }}>
                Remix Section Art Direction
              </h3>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#9CA3AF' }}>
                Re-art direct &ldquo;{sceneName}&rdquo; while preserving your content
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#6B7280',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Remix Styles Grid */}
        <div
          className="sz-custom-scrollbar"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '10px',
            maxHeight: '380px',
            overflowY: 'auto',
          }}
        >
          {remixStyles.map((style) => (
            <div
              key={style.id}
              onClick={() => {
                onApplyRemix(style.id);
                onClose();
              }}
              style={{
                background: '#1F2229',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#292D37';
                e.currentTarget.style.borderColor = '#3B82F6';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#1F2229';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '4px',
                      background: style.gradient,
                      boxShadow: `0 0 6px ${style.accent}55`,
                    }}
                  />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#FFFFFF' }}>{style.name}</span>
                </div>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#9CA3AF', lineHeight: 1.35 }}>
                {style.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
