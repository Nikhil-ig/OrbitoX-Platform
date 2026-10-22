'use client';

import React, { useState } from 'react';
import {
  Palette,
  Sparkles,
  Type,
  Check,
  X,
  Droplet,
  Layers,
  Sliders,
  ChevronRight,
} from 'lucide-react';
import { DesignUniverseEngine, DesignUniverse } from '@/components/template-studio/engine/DesignUniverses';
import { TypographyStudioEngine, FontPairing, FONT_PAIRINGS } from '@/components/template-studio/engine/TypographyStudio';
import { TemplateDesignTokens } from '@/components/template-studio/types/TemplateSchema';

interface StylesPanelProps {
  designTokens: TemplateDesignTokens;
  activeUniverseId?: string;
  onApplyUniverse: (universeId: string) => void;
  onApplyFontPairing: (pairingId: string) => void;
  onUpdateTokens: (patch: Partial<TemplateDesignTokens>) => void;
  onClose: () => void;
}

export function StylesPanel({
  designTokens,
  activeUniverseId = 'celestial',
  onApplyUniverse,
  onApplyFontPairing,
  onUpdateTokens,
  onClose,
}: StylesPanelProps) {
  const [activeTab, setActiveTab] = useState<'universes' | 'typography' | 'colors'>('universes');

  // 12 Visual Design Universes
  const universes = DesignUniverseEngine.getAll();

  return (
    <aside
      id="sz-styles-panel"
      style={{
        width: '320px',
        background: '#16181D',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        zIndex: 35,
        userSelect: 'none',
      }}
    >
      {/* ── HEADER ── */}
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Palette size={15} style={{ color: '#3B82F6' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F3F4F6' }}>Design System</span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#6B7280',
            cursor: 'pointer',
            padding: '2px',
          }}
        >
          <X size={15} />
        </button>
      </div>

      {/* ── TABS (Universes | Typography | Colors) ── */}
      <div
        style={{
          display: 'flex',
          background: '#121317',
          padding: '4px',
          gap: '4px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <button
          id="sz-styles-tab-universes"
          onClick={() => setActiveTab('universes')}
          style={{
            flex: 1,
            background: activeTab === 'universes' ? '#21242D' : 'transparent',
            border: 'none',
            borderRadius: '5px',
            padding: '5px',
            color: activeTab === 'universes' ? '#FFFFFF' : '#9CA3AF',
            fontSize: '0.72rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Universes
        </button>
        <button
          id="sz-styles-tab-typography"
          onClick={() => setActiveTab('typography')}
          style={{
            flex: 1,
            background: activeTab === 'typography' ? '#21242D' : 'transparent',
            border: 'none',
            borderRadius: '5px',
            padding: '5px',
            color: activeTab === 'typography' ? '#FFFFFF' : '#9CA3AF',
            fontSize: '0.72rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Typography
        </button>
        <button
          id="sz-styles-tab-colors"
          onClick={() => setActiveTab('colors')}
          style={{
            flex: 1,
            background: activeTab === 'colors' ? '#21242D' : 'transparent',
            border: 'none',
            borderRadius: '5px',
            padding: '5px',
            color: activeTab === 'colors' ? '#FFFFFF' : '#9CA3AF',
            fontSize: '0.72rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Colors
        </button>
      </div>

      {/* ── CONTENT AREA ── */}
      <div
        className="sz-custom-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {/* ── 1. DESIGN UNIVERSES TAB ── */}
        {activeTab === 'universes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              12 Design Universes (Global Art Direction)
            </div>
            {universes.map((uni: DesignUniverse) => {
              const isSelected = activeUniverseId === uni.id;
              return (
                <div
                  key={uni.id}
                  id={`sz-universe-card-${uni.id}`}
                  onClick={() => onApplyUniverse(uni.id)}
                  style={{
                    background: isSelected ? '#1F2430' : '#1C1E25',
                    border: isSelected ? '1px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = '#252932';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = '#1C1E25';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    }
                  }}
                >
                  {/* Color Swatch Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          background: uni.previewGradient || uni.accentColor,
                          boxShadow: `0 0 8px ${uni.accentColor}44`,
                        }}
                      />
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#FFFFFF' }}>{uni.name}</span>
                    </div>
                    {isSelected && (
                      <div
                        style={{
                          background: '#2563EB',
                          borderRadius: '9999px',
                          padding: '2px 8px',
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <Check size={10} />
                        <span>Active</span>
                      </div>
                    )}
                  </div>

                  {/* Tagline & Description */}
                  <div style={{ fontSize: '0.72rem', color: '#9CA3AF', lineHeight: 1.3 }}>
                    {uni.tagline}
                  </div>

                  {/* Mini Palette Dots */}
                  <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: uni.tokens.colors?.backgroundPrimary }} title="Background" />
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: uni.tokens.colors?.surfacePrimary }} title="Surface" />
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: uni.tokens.colors?.accentPrimary }} title="Accent Primary" />
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: uni.tokens.colors?.textPrimary }} title="Text Primary" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── 2. TYPOGRAPHY STUDIO TAB ── */}
        {activeTab === 'typography' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Curated Font Pairings
            </div>
            {FONT_PAIRINGS.map((pairing: FontPairing) => (
              <div
                key={pairing.id}
                id={`sz-font-pairing-${pairing.id}`}
                onClick={() => onApplyFontPairing(pairing.id)}
                style={{
                  background: '#1C1E25',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#252932';
                  e.currentTarget.style.borderColor = '#3B82F6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#1C1E25';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#FFFFFF' }}>{pairing.name}</span>
                  <span style={{ fontSize: '0.65rem', color: '#60A5FA', textTransform: 'uppercase', fontWeight: 600 }}>
                    {pairing.category}
                  </span>
                </div>
                {/* Live Specimen Text */}
                <div
                  style={{
                    fontFamily: pairing.displayFont,
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: '#F3F4F6',
                    margin: '2px 0',
                    lineHeight: 1.2,
                  }}
                >
                  {pairing.sampleHeadline}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#9CA3AF', fontFamily: pairing.bodyFont }}>
                  {pairing.description}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── 3. COLORS & TOKENS TAB ── */}
        {activeTab === 'colors' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Document Color Palette
            </div>
            {[
              { label: 'Primary Accent', key: 'accentPrimary', value: designTokens.colors?.accentPrimary || '#3B82F6' },
              { label: 'Secondary Accent', key: 'accentSecondary', value: designTokens.colors?.accentSecondary || '#1D4ED8' },
              { label: 'Background Primary', key: 'backgroundPrimary', value: designTokens.colors?.backgroundPrimary || '#0B0F19' },
              { label: 'Surface Primary', key: 'surfacePrimary', value: designTokens.colors?.surfacePrimary || '#1E293B' },
              { label: 'Text Primary', key: 'textPrimary', value: designTokens.colors?.textPrimary || '#F8FAFC' },
              { label: 'Border Subtle', key: 'borderSubtle', value: designTokens.colors?.borderSubtle || 'rgba(255,255,255,0.08)' },
            ].map((token) => (
              <div
                key={token.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#1F2229',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="color"
                    value={token.value.startsWith('#') ? token.value : '#3B82F6'}
                    onChange={(e) => {
                      onUpdateTokens({
                        colors: {
                          ...designTokens.colors!,
                          [token.key]: e.target.value,
                        },
                      });
                    }}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      background: 'none',
                    }}
                  />
                  <span style={{ fontSize: '0.74rem', color: '#D1D5DB' }}>{token.label}</span>
                </div>
                <span style={{ fontSize: '0.7rem', color: '#9CA3AF', fontFamily: 'monospace' }}>
                  {token.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
