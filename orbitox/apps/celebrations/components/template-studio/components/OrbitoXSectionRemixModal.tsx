'use client';

import React from 'react';
import { Palette, Sparkles, X, Check, ArrowRight, Wand2 } from 'lucide-react';
import { SceneGraphNode } from '../engine/SceneGraphTypes';

export interface RemixStyle {
  id: string;
  name: string;
  tagline: string;
  gradient: string;
  badge: string;
  stylePatch: {
    background?: string;
    color?: string;
    fontFamily?: string;
    borderRadius?: string;
    boxShadow?: string;
    letterSpacing?: string;
    textTransform?: string;
    border?: string;
  };
}

export const REMIX_STYLES: RemixStyle[] = [
  {
    id: 'cinematic',
    name: 'Cinematic Starlight',
    tagline: 'Deep cosmic void with starlight gold bloom & tracked serif',
    gradient: 'linear-gradient(135deg, #040712 0%, #1A150A 100%)',
    badge: 'Signature',
    stylePatch: {
      color: '#DFBA6B',
      fontFamily: "'Cormorant Garamond', serif",
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      boxShadow: '0 20px 80px rgba(223, 186, 107, 0.35)',
      border: '1px solid rgba(223, 186, 107, 0.3)',
      borderRadius: '8px',
    },
  },
  {
    id: 'editorial',
    name: 'Editorial Couture',
    tagline: 'High-fashion monochrome minimalism with champagne accents',
    gradient: 'linear-gradient(135deg, #121212 0%, #262626 100%)',
    badge: 'Editorial',
    stylePatch: {
      color: '#FFFFFF',
      fontFamily: "'Playfair Display', serif",
      letterSpacing: '0.04em',
      textTransform: 'none',
      boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '4px',
    },
  },
  {
    id: 'minimal',
    name: 'Minimal Modern',
    tagline: 'Sleek precision, electric violet focus, ultra-clean geometry',
    gradient: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)',
    badge: 'Modern SaaS',
    stylePatch: {
      color: '#FFFFFF',
      fontFamily: "'Inter', sans-serif",
      letterSpacing: '-0.02em',
      textTransform: 'none',
      boxShadow: '0 20px 50px rgba(139, 92, 246, 0.2)',
      border: '1px solid rgba(139, 92, 246, 0.3)',
      borderRadius: '12px',
    },
  },
  {
    id: 'noir-cyber',
    name: 'Noir Cyber',
    tagline: 'Stealth obsidian black with luminescent neon cyan pulse',
    gradient: 'linear-gradient(135deg, #0A0A0A 0%, #082F49 100%)',
    badge: 'Futuristic',
    stylePatch: {
      color: '#06B6D4',
      fontFamily: "'Space Grotesk', sans-serif",
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      boxShadow: '0 0 40px rgba(6, 182, 212, 0.4)',
      border: '1px solid rgba(6, 182, 212, 0.4)',
      borderRadius: '2px',
    },
  },
  {
    id: 'aurora-glass',
    name: 'Aurora Glass',
    tagline: 'Luminescent pink & cyan refraction over crystalline glass',
    gradient: 'linear-gradient(135deg, #0B132B 0%, #2D124D 100%)',
    badge: 'Glassmorphism',
    stylePatch: {
      color: '#FFFFFF',
      fontFamily: "'Outfit', sans-serif",
      letterSpacing: '0.01em',
      textTransform: 'none',
      boxShadow: '0 25px 70px rgba(236, 72, 153, 0.25)',
      border: '1px solid rgba(255, 255, 255, 0.25)',
      borderRadius: '16px',
    },
  },
  {
    id: 'brutalist',
    name: 'Brutalist Raw',
    tagline: 'High-contrast neo-brutalism with acid yellow stark punch',
    gradient: 'linear-gradient(135deg, #000000 0%, #1C1917 100%)',
    badge: 'Avant-Garde',
    stylePatch: {
      color: '#EAB308',
      fontFamily: "'Syne', sans-serif",
      letterSpacing: '-0.03em',
      textTransform: 'uppercase',
      boxShadow: '8px 8px 0px #EAB308',
      border: '2px solid #EAB308',
      borderRadius: '0px',
    },
  },
  {
    id: 'botanical',
    name: 'Botanical Organic',
    tagline: 'Deep forest moss with radiant emerald sage warmth',
    gradient: 'linear-gradient(135deg, #061A14 0%, #0F382C 100%)',
    badge: 'Organic',
    stylePatch: {
      color: '#10B981',
      fontFamily: "'DM Serif Display', serif",
      letterSpacing: '0.02em',
      textTransform: 'none',
      boxShadow: '0 20px 60px rgba(16, 185, 129, 0.25)',
      border: '1px solid rgba(16, 185, 129, 0.3)',
      borderRadius: '14px',
    },
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedNode: SceneGraphNode | null;
  onApplyRemix: (stylePatch: any) => void;
}

export function OrbitoXSectionRemixModal({
  isOpen,
  onClose,
  selectedNode,
  onApplyRemix,
}: Props) {
  if (!isOpen || !selectedNode) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(4, 7, 18, 0.85)',
        backdropFilter: 'blur(16px)',
        zIndex: 130,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '640px',
          maxWidth: '100%',
          background: '#090D1A',
          border: '1px solid rgba(223, 186, 107, 0.35)',
          borderRadius: '16px',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.9), 0 0 50px rgba(223, 186, 107, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(223, 186, 107, 0.08) 0%, transparent 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #DFBA6B 0%, #B08D4C 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#060B1A',
              }}
            >
              <Wand2 size={17} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#FFFFFF' }}>
                Remix Section: {selectedNode.name || selectedNode.kind}
              </h3>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                Keep your content. Instantly transform composition, typography, and optical effects.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.4)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Styles Grid */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '460px', overflowY: 'auto' }}>
          {REMIX_STYLES.map((style) => (
            <div
              key={style.id}
              onClick={() => {
                onApplyRemix(style.stylePatch);
                onClose();
              }}
              style={{
                background: style.gradient,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '14px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(223, 186, 107, 0.5)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFFFFF' }}>{style.name}</span>
                  <span
                    style={{
                      fontSize: '0.66rem',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.12)',
                      color: 'rgba(255, 255, 255, 0.85)',
                    }}
                  >
                    {style.badge}
                  </span>
                </div>
                <span style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.55)', maxWidth: '420px' }}>
                  {style.tagline}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  color: '#DFBA6B',
                }}
              >
                <span>Apply</span>
                <ArrowRight size={13} />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            fontSize: '0.72rem',
            color: 'rgba(255, 255, 255, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>Direct SceneGraph transformation • Preserves all underlying text and images</span>
          <span style={{ fontFamily: 'monospace' }}>ESC to close</span>
        </div>
      </div>
    </div>
  );
}
