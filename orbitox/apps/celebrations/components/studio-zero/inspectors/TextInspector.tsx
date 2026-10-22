'use client';

import React, { useEffect } from 'react';
import { Type, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import { NodeInspectorProps } from './types';
import { ResponsivePropertyField } from './controls/ResponsivePropertyField';
import { VisualBoxModel } from './controls/VisualBoxModel';
import { TypographyStudioEngine } from '@/components/template-studio/engine/TypographyStudio';

const FONT_OPTIONS = [
  { label: 'Inter (Clean Sans)', value: "'Inter', sans-serif" },
  { label: 'Outfit (Modern Geometric)', value: "'Outfit', sans-serif" },
  { label: 'Space Grotesk (Tech Display)', value: "'Space Grotesk', sans-serif" },
  { label: 'Plus Jakarta Sans (SaaS)', value: "'Plus Jakarta Sans', sans-serif" },
  { label: 'DM Sans (Friendly Sans)', value: "'DM Sans', sans-serif" },
  { label: 'Cinzel (Luxury Roman)', value: "'Cinzel', serif" },
  { label: 'Playfair Display (Editorial)', value: "'Playfair Display', serif" },
  { label: 'Cormorant Garamond (Elegance)', value: "'Cormorant Garamond', serif" },
  { label: 'JetBrains Mono (Code/Mono)', value: "'JetBrains Mono', monospace" },
];

const FONT_SIZE_PRESETS = [12, 14, 16, 20, 24, 32, 48, 64];

export function TextInspector({
  selectedNode,
  activeViewport,
  onUpdateNode,
  onUpdateStyle,
  onResetResponsiveOverride,
}: NodeInspectorProps) {
  const style = selectedNode.style || {};
  const typo = style.typography || {};

  // Dynamically ensure Google Fonts are loaded into head whenever TextInspector is active
  useEffect(() => {
    TypographyStudioEngine.ensureGoogleFontsLoaded();
  }, []);

  const updateTypo = (patch: Record<string, any>) => {
    onUpdateStyle(selectedNode.id, {
      typography: {
        ...typo,
        ...patch,
      },
    });
  };

  const normalizeFontSize = (rawVal: string): string => {
    const trimmed = rawVal.trim();
    if (!trimmed) return '16px';
    // If it's a pure number like '32', add 'px'
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      return `${trimmed}px`;
    }
    return trimmed;
  };

  const handlePaddingChange = (side: 'top' | 'right' | 'bottom' | 'left', val: string) => {
    const propMap = { top: 'paddingTop', right: 'paddingRight', bottom: 'paddingBottom', left: 'paddingLeft' };
    onUpdateStyle(selectedNode.id, { [propMap[side]]: val });
  };

  const handleMarginChange = (side: 'top' | 'right' | 'bottom' | 'left', val: string) => {
    const propMap = { top: 'marginTop', right: 'marginRight', bottom: 'marginBottom', left: 'marginLeft' };
    onUpdateStyle(selectedNode.id, { [propMap[side]]: val });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ── TEXT CONTENT ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Text Content</label>
        <textarea
          rows={3}
          value={selectedNode.textContent || ''}
          onChange={(e) => onUpdateNode(selectedNode.id, { textContent: e.target.value })}
          placeholder="Enter text..."
          style={{
            background: '#1F2229',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '6px',
            padding: '8px',
            color: '#FFFFFF',
            fontSize: '0.74rem',
            outline: 'none',
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* ── FONT FAMILY & SIZE ── */}
      <ResponsivePropertyField
        label="Typography"
        propName="typography"
        activeViewport={activeViewport}
        isOverridden={Boolean((selectedNode.responsive as any)?.[activeViewport]?.style?.typography)}
        onResetOverride={onResetResponsiveOverride ? (prop) => onResetResponsiveOverride(selectedNode.id, activeViewport, prop) : undefined}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '6px' }}>
            <select
              value={typo.fontFamily || "'Inter', sans-serif"}
              onChange={(e) => {
                TypographyStudioEngine.ensureGoogleFontsLoaded();
                updateTypo({ fontFamily: e.target.value });
              }}
              style={{
                background: '#1F2229',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '5px',
                padding: '5px 8px',
                color: '#FFFFFF',
                fontSize: '0.72rem',
                outline: 'none',
              }}
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Size (e.g. 24px)"
              value={typo.fontSize || ''}
              onChange={(e) => updateTypo({ fontSize: e.target.value })}
              onBlur={(e) => updateTypo({ fontSize: normalizeFontSize(e.target.value) })}
              style={{
                background: '#1F2229',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '5px',
                padding: '5px 8px',
                color: '#FFFFFF',
                fontSize: '0.72rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Quick Size Presets */}
          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
            {FONT_SIZE_PRESETS.map((sz) => {
              const currentSzNum = parseFloat(String(typo.fontSize || '16'));
              const isSelected = currentSzNum === sz;
              return (
                <button
                  key={sz}
                  onClick={() => updateTypo({ fontSize: `${sz}px` })}
                  style={{
                    padding: '2px 6px',
                    borderRadius: '3px',
                    border: isSelected ? '1px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: isSelected ? 'rgba(59, 130, 246, 0.2)' : '#191B20',
                    color: isSelected ? '#60A5FA' : '#9CA3AF',
                    fontSize: '9px',
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                  }}
                >
                  {sz}
                </button>
              );
            })}
          </div>
        </div>
      </ResponsivePropertyField>

      {/* ── WEIGHT & LINE HEIGHT ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.66rem', color: '#6B7280' }}>Weight</label>
          <select
            value={String(typo.fontWeight || 400)}
            onChange={(e) => updateTypo({ fontWeight: parseInt(e.target.value) || e.target.value })}
            style={{
              background: '#1F2229',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '5px',
              padding: '4px 6px',
              color: '#FFFFFF',
              fontSize: '0.7rem',
              outline: 'none',
            }}
          >
            <option value="300">Light (300)</option>
            <option value="400">Regular (400)</option>
            <option value="500">Medium (500)</option>
            <option value="600">Semibold (600)</option>
            <option value="700">Bold (700)</option>
            <option value="800">Extrabold (800)</option>
            <option value="900">Black (900)</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.66rem', color: '#6B7280' }}>Line Height</label>
          <input
            type="text"
            placeholder="e.g. 1.4 or 140%"
            value={typo.lineHeight || ''}
            onChange={(e) => updateTypo({ lineHeight: e.target.value })}
            style={{
              background: '#1F2229',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '5px',
              padding: '4px 6px',
              color: '#FFFFFF',
              fontSize: '0.7rem',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* ── LETTER SPACING ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '0.66rem', color: '#6B7280' }}>Letter Spacing</label>
        <div style={{ display: 'flex', gap: '4px' }}>
          {['-0.05em', '0em', '0.05em', '0.1em', '0.2em'].map((sp) => {
            const isSelected = (typo.letterSpacing || '0em') === sp;
            return (
              <button
                key={sp}
                onClick={() => updateTypo({ letterSpacing: sp })}
                style={{
                  flex: 1,
                  padding: '3px 0',
                  borderRadius: '3px',
                  border: isSelected ? '1px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isSelected ? 'rgba(59, 130, 246, 0.2)' : '#191B20',
                  color: isSelected ? '#60A5FA' : '#9CA3AF',
                  fontSize: '9px',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                }}
              >
                {sp}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TEXT ALIGNMENT ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '0.66rem', color: '#6B7280' }}>Alignment</label>
        <div style={{ display: 'flex', gap: '4px', background: '#191B20', borderRadius: '5px', padding: '2px' }}>
          {(['left', 'center', 'right', 'justify'] as const).map((align) => {
            const isActive = (typo.textAlign || 'left') === align;
            const Icon =
              align === 'left'
                ? AlignLeft
                : align === 'center'
                ? AlignCenter
                : align === 'right'
                ? AlignRight
                : AlignJustify;

            return (
              <button
                key={align}
                onClick={() => updateTypo({ textAlign: align })}
                style={{
                  flex: 1,
                  padding: '4px',
                  border: 'none',
                  borderRadius: '4px',
                  background: isActive ? '#3B82F6' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#9CA3AF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={12} />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TEXT COLOR ── */}
      {(() => {
        const colorHex = typeof typo.color === 'string' ? typo.color : (typo.color as any)?.value || '#FFFFFF';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="color"
                value={colorHex.startsWith('#') ? colorHex : '#FFFFFF'}
                onChange={(e) => updateTypo({ color: { type: 'solid', value: e.target.value } })}
                style={{ width: '28px', height: '28px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: 'transparent' }}
              />
              <input
                type="text"
                value={colorHex}
                onChange={(e) => updateTypo({ color: { type: 'solid', value: e.target.value } })}
                style={{
                  flex: 1,
                  background: '#1F2229',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '5px',
                  padding: '4px 8px',
                  color: '#FFFFFF',
                  fontSize: '0.72rem',
                  outline: 'none',
                  fontFamily: 'monospace',
                }}
              />
            </div>
          </div>
        );
      })()}

      {/* ── SPACING & BOX MODEL ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF' }}>Box Spacing</label>
        <VisualBoxModel
          paddingTop={style.paddingTop}
          paddingRight={style.paddingRight}
          paddingBottom={style.paddingBottom}
          paddingLeft={style.paddingLeft}
          marginTop={style.marginTop}
          marginRight={style.marginRight}
          marginBottom={style.marginBottom}
          marginLeft={style.marginLeft}
          width={selectedNode.geometry?.width || 'auto'}
          height={selectedNode.geometry?.height || 'auto'}
          onPaddingChange={handlePaddingChange}
          onMarginChange={handleMarginChange}
          onUpdateStyle={(patch) => onUpdateStyle(selectedNode.id, patch)}
        />
      </div>
    </div>
  );
}
