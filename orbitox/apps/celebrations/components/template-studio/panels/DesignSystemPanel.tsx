'use client';

import React from 'react';
import {
  TemplateSchema,
  TemplateDesignTokens,
} from '../types/TemplateSchema';
import {
  Palette,
  Type,
  Sparkles,
  Layers,
  Sliders,
  Check,
} from 'lucide-react';

interface DesignSystemPanelProps {
  schema: TemplateSchema;
  onUpdateTokens: (patch: Partial<TemplateDesignTokens>) => void;
}

export function DesignSystemPanel({ schema, onUpdateTokens }: DesignSystemPanelProps) {
  const tokens = schema.designTokens;

  const updateColor = (key: keyof TemplateDesignTokens['colors'], val: string) => {
    onUpdateTokens({
      colors: {
        ...tokens.colors,
        [key]: val,
      },
    });
  };

  const updateTypography = (key: keyof TemplateDesignTokens['typography'], val: any) => {
    onUpdateTokens({
      typography: {
        ...tokens.typography,
        [key]: val,
      },
    });
  };

  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto', color: '#fff' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 4px 0' }}>
          Central Design Tokens
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--cel-text-muted, #94A3B8)', margin: 0, lineHeight: 1.5 }}>
          Harmonious aesthetic variables. Centralizing colors, luxury typography, and spatial geometry ensures architectural coherence across all scenes and devices.
        </p>
      </div>

      {/* 1. Core Color Tokens */}
      <div
        style={{
          borderRadius: '16px',
          background: 'rgba(13, 20, 41, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '20px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Palette size={16} color="#DFBA6B" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Color Tokens & Metallic Accents</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {[
            { key: 'backgroundPrimary', label: 'Primary Cosmic Background' },
            { key: 'surfacePrimary', label: 'Surface Primary (Glass)' },
            { key: 'accentPrimary', label: 'Primary Metal / Accent' },
            { key: 'accentSecondary', label: 'Secondary Accent' },
            { key: 'textPrimary', label: 'Text Primary' },
            { key: 'textSecondary', label: 'Text Secondary' },
            { key: 'textMuted', label: 'Text Muted' },
            { key: 'borderSubtle', label: 'Border Subtle' },
          ].map((item) => {
            const val = tokens.colors[item.key as keyof TemplateDesignTokens['colors']];

            return (
              <div
                key={item.key}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--cel-text-muted, #94A3B8)', display: 'block' }}>
                    {item.label}
                  </span>
                  <code style={{ fontSize: '0.78rem', color: '#fff' }}>{val}</code>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="color"
                    value={val.startsWith('#') ? val : '#DFBA6B'}
                    onChange={(e) => updateColor(item.key as any, e.target.value)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      border: '2px solid rgba(255, 255, 255, 0.2)',
                      background: 'none',
                      cursor: 'pointer',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Typography Hierarchy Tokens */}
      <div
        style={{
          borderRadius: '16px',
          background: 'rgba(13, 20, 41, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '20px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Type size={16} color="#38BDF8" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Typography Hierarchy</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--cel-text-muted, #94A3B8)', marginBottom: '4px' }}>
              Display Title Font
            </label>
            <input
              type="text"
              value={tokens.typography.displayFont}
              onChange={(e) => updateTypography('displayFont', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                background: '#070B16',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#fff',
                fontSize: '0.82rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--cel-text-muted, #94A3B8)', marginBottom: '4px' }}>
              Heading Font
            </label>
            <input
              type="text"
              value={tokens.typography.headingFont}
              onChange={(e) => updateTypography('headingFont', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                background: '#070B16',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#fff',
                fontSize: '0.82rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--cel-text-muted, #94A3B8)', marginBottom: '4px' }}>
              Body Sans-Serif Font
            </label>
            <input
              type="text"
              value={tokens.typography.bodyFont}
              onChange={(e) => updateTypography('bodyFont', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                background: '#070B16',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#fff',
                fontSize: '0.82rem',
              }}
            />
          </div>
        </div>

        {/* Font Scaling Preview */}
        <div
          style={{
            marginTop: '20px',
            padding: '16px',
            borderRadius: '10px',
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <span style={{ fontSize: '0.7rem', color: 'var(--cel-text-dim, #64748B)', fontWeight: 700, textTransform: 'uppercase' }}>
            Typography Preview
          </span>
          <div style={{ fontFamily: tokens.typography.displayFont, fontSize: '1.6rem', color: '#DFBA6B', marginTop: '6px', letterSpacing: '0.1em' }}>
            CELESTIAL ODYSSEY
          </div>
          <div style={{ fontFamily: tokens.typography.headingFont, fontSize: '1.1rem', color: '#fff', fontStyle: 'italic', marginTop: '4px' }}>
            “Two independent trajectories drawn across infinite space by gravitational destiny”
          </div>
          <div style={{ fontFamily: tokens.typography.bodyFont, fontSize: '0.82rem', color: 'var(--cel-text-secondary, #CBD5E1)', marginTop: '8px', lineHeight: 1.5 }}>
            Harmonious geometric rhythm across mobile screens and grand desktop viewports.
          </div>
        </div>
      </div>
    </div>
  );
}
