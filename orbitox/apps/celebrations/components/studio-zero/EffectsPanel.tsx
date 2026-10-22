'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Sliders,
  Check,
  X,
  Droplet,
  Layers,
  Wand2,
} from 'lucide-react';

interface EffectsPanelProps {
  onApplyEffect: (effectPatch: any) => void;
  onClose?: () => void;
}

export function EffectsPanel({ onApplyEffect, onClose }: EffectsPanelProps) {
  const [blurAmount, setBlurAmount] = useState(16);
  const [glowIntensity, setGlowIntensity] = useState(0.4);

  const presets = [
    {
      id: 'glass',
      name: 'Frosted Glass',
      desc: 'Translucent glass with specular highlight and blur',
      patch: {
        background: { type: 'solid', color: { type: 'solid', value: 'rgba(255, 255, 255, 0.05)' } },
        border: { width: '1px', style: 'solid', color: { type: 'solid', value: 'rgba(255, 255, 255, 0.15)' }, radius: '16px' },
        effects: { backdropBlur: '16px', shadow: '0 20px 40px rgba(0,0,0,0.4)' },
      },
    },
    {
      id: 'aurora',
      name: 'Aurora Glow',
      desc: 'Vibrant chromatic radial gradient sphere',
      patch: {
        background: {
          type: 'gradient',
          gradient: 'radial-gradient(circle, rgba(124, 58, 237, 0.4) 0%, rgba(59, 130, 246, 0.2) 60%, transparent 80%)',
        },
        effects: { blur: '24px' },
      },
    },
    {
      id: 'celestial',
      name: 'Celestial Starlight',
      desc: 'Cosmic obsidian with golden stardust rim highlight',
      patch: {
        background: { type: 'solid', color: { type: 'solid', value: 'rgba(11, 15, 25, 0.9)' } },
        border: { width: '1px', style: 'solid', color: { type: 'solid', value: 'rgba(223, 186, 107, 0.35)' }, radius: '16px' },
        effects: { shadow: '0 0 25px rgba(223, 186, 107, 0.2)' },
      },
    },
    {
      id: 'film',
      name: 'Cinematic Grain',
      desc: 'Analogue 35mm grain contrast with deep blacks',
      patch: {
        background: { type: 'solid', color: { type: 'solid', value: 'rgba(18, 19, 23, 0.95)' } },
        border: { width: '1px', style: 'solid', color: { type: 'solid', value: 'rgba(255, 255, 255, 0.08)' }, radius: '12px' },
        effects: { contrast: 1.15, brightness: 0.95 },
      },
    },
    {
      id: 'chrome',
      name: 'Liquid Chrome',
      desc: 'Metallic specular reflection with high gloss',
      patch: {
        background: {
          type: 'gradient',
          gradient: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.02) 100%)',
        },
        border: { width: '1px', style: 'solid', color: { type: 'solid', value: 'rgba(255, 255, 255, 0.3)' }, radius: '14px' },
      },
    },
  ];

  return (
    <aside
      id="sz-effects-panel"
      style={{
        width: '300px',
        background: '#16181D',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        zIndex: 35,
        userSelect: 'none',
        color: '#F3F4F6',
      }}
    >
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
          <Sparkles size={15} style={{ color: '#3B82F6' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Effects Studio</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#6B7280',
              cursor: 'pointer',
            }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      <div className="sz-custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>
          Shader & Surface Presets
        </div>
        {presets.map((preset) => (
          <div
            key={preset.id}
            onClick={() => onApplyEffect(preset.patch)}
            style={{
              background: '#1F2229',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '10px 12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#292D37';
              e.currentTarget.style.borderColor = '#3B82F6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#1F2229';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            }}
          >
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#FFFFFF' }}>{preset.name}</div>
            <div style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>{preset.desc}</div>
          </div>
        ))}
      </div>
    </aside>
  );
}
