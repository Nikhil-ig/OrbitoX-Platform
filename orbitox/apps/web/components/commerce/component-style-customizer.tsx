'use client';

import React from 'react';

export interface ComponentStyleConfig {
  bgMode?: 'default' | 'black' | 'maroon' | 'gold-glow' | 'glass' | 'gradient' | 'custom';
  bgColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  paddingY?: 'sm' | 'md' | 'lg' | 'xl';
  containerWidth?: 'standard' | 'narrow' | 'wide' | 'full';
  borderRadius?: 'none' | 'sm' | 'md' | 'lg';
  dividerTop?: boolean;
  dividerBottom?: boolean;
  animation?: 'none' | 'fade-in' | 'slide-up' | 'zoom-in' | 'glow';
  customCss?: string;
}

export interface ComponentStyleCustomizerProps {
  styleConfig: ComponentStyleConfig;
  onChange: (updated: ComponentStyleConfig) => void;
}

export function ComponentStyleCustomizer({
  styleConfig = {},
  onChange,
}: ComponentStyleCustomizerProps) {
  const handleChange = (key: keyof ComponentStyleConfig, value: any) => {
    onChange({
      ...styleConfig,
      [key]: value,
    });
  };

  return (
    <div
      style={{
        padding: '12px',
        borderRadius: '10px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '11px', fontWeight: 800, color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Component Style & Layout
        </span>
      </div>

      {/* Background Style Mode */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase' }}>
          Background Style
        </label>
        <select
          value={styleConfig.bgMode || 'default'}
          onChange={(e) => handleChange('bgMode', e.target.value as any)}
          style={{
            padding: '6px 8px',
            borderRadius: '6px',
            background: '#0D0D0E',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#FFF',
            fontSize: '11px',
          }}
        >
          <option value="default">Default Theme Background</option>
          <option value="black">Deep Noir Black (#000000)</option>
          <option value="maroon">Royal Crimson Velvet (#7A1113)</option>
          <option value="gold-glow">Imperial Gold Ambient Glow</option>
          <option value="glass">Glassmorphic Frost Blur</option>
          <option value="gradient">Custom Linear Gradient</option>
          <option value="custom">Custom Solid Color</option>
        </select>
      </div>

      {/* Custom Color Input */}
      {styleConfig.bgMode === 'custom' && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="color"
            value={styleConfig.bgColor || '#161618'}
            onChange={(e) => handleChange('bgColor', e.target.value)}
            style={{ width: '32px', height: '32px', borderRadius: '4px', border: '1px solid #444', background: 'none', cursor: 'pointer' }}
          />
          <input
            type="text"
            value={styleConfig.bgColor || '#161618'}
            onChange={(e) => handleChange('bgColor', e.target.value)}
            style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', fontSize: '11px' }}
          />
        </div>
      )}

      {/* Gradient Colors */}
      {styleConfig.bgMode === 'gradient' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '9px', color: '#888' }}>From Color</span>
            <input
              type="color"
              value={styleConfig.gradientFrom || '#7A1113'}
              onChange={(e) => handleChange('gradientFrom', e.target.value)}
              style={{ width: '100%', height: '28px', borderRadius: '4px', border: '1px solid #444', background: 'none', cursor: 'pointer' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '9px', color: '#888' }}>To Color</span>
            <input
              type="color"
              value={styleConfig.gradientTo || '#0B0709'}
              onChange={(e) => handleChange('gradientTo', e.target.value)}
              style={{ width: '100%', height: '28px', borderRadius: '4px', border: '1px solid #444', background: 'none', cursor: 'pointer' }}
            />
          </div>
        </div>
      )}

      {/* Padding & Container Width */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase' }}>
            Vertical Spacing
          </label>
          <select
            value={styleConfig.paddingY || 'md'}
            onChange={(e) => handleChange('paddingY', e.target.value as any)}
            style={{
              padding: '6px 8px',
              borderRadius: '6px',
              background: '#0D0D0E',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#FFF',
              fontSize: '11px',
            }}
          >
            <option value="sm">Compact (32px)</option>
            <option value="md">Standard (64px)</option>
            <option value="lg">Spacious (96px)</option>
            <option value="xl">Immersion (120px)</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase' }}>
            Max Width
          </label>
          <select
            value={styleConfig.containerWidth || 'standard'}
            onChange={(e) => handleChange('containerWidth', e.target.value as any)}
            style={{
              padding: '6px 8px',
              borderRadius: '6px',
              background: '#0D0D0E',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#FFF',
              fontSize: '11px',
            }}
          >
            <option value="standard">Standard (1280px)</option>
            <option value="narrow">Editorial (960px)</option>
            <option value="wide">Wide (1440px)</option>
            <option value="full">Full Width (100%)</option>
          </select>
        </div>
      </div>

      {/* Dividers & Animation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase' }}>
            Divider Borders
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#AAA', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!styleConfig.dividerTop}
                onChange={(e) => handleChange('dividerTop', e.target.checked)}
              />
              Top
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#AAA', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!styleConfig.dividerBottom}
                onChange={(e) => handleChange('dividerBottom', e.target.checked)}
              />
              Bottom
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase' }}>
            Animation
          </label>
          <select
            value={styleConfig.animation || 'none'}
            onChange={(e) => handleChange('animation', e.target.value as any)}
            style={{
              padding: '6px 8px',
              borderRadius: '6px',
              background: '#0D0D0E',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#FFF',
              fontSize: '11px',
            }}
          >
            <option value="none">None</option>
            <option value="fade-in">Fade In</option>
            <option value="slide-up">Slide Up</option>
            <option value="zoom-in">Zoom In</option>
            <option value="glow">Glow Highlight</option>
          </select>
        </div>
      </div>
    </div>
  );
}
