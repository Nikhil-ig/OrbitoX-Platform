'use client';

import React, { useState } from 'react';
import { Sparkles, Sun, Droplets, Layers, Eye, Sliders, Check } from 'lucide-react';

export interface EffectPreset {
  id: string;
  name: string;
  category: 'light' | 'surface' | 'atmosphere' | 'depth';
  icon: string;
  description: string;
  glowIntensity: number;
  glassBlur: number;
  noiseAmount: number;
  particles: number;
}

const EFFECT_PRESETS: EffectPreset[] = [
  { id: 'celestial-glow', name: 'Celestial Stardust Glow', category: 'light', icon: '✨', description: 'Soft gold ambient bloom with cosmic stardust particles', glowIntensity: 75, glassBlur: 16, noiseAmount: 12, particles: 120 },
  { id: 'frosted-glass', name: 'Frosted Glassmorphism', category: 'surface', icon: '💎', description: 'High-index optical refraction with subtle specular borders', glowIntensity: 30, glassBlur: 24, noiseAmount: 5, particles: 20 },
  { id: 'aurora-borealis', name: 'Aurora Luminescence', category: 'atmosphere', icon: '🌌', description: 'Dancing spectral magenta and cyan atmospheric waves', glowIntensity: 90, glassBlur: 20, noiseAmount: 8, particles: 80 },
  { id: 'film-grain-noir', name: 'Editorial Film Grain', category: 'surface', icon: '🎞', description: 'Analogue 35mm textural grain with rich contrast', glowIntensity: 10, glassBlur: 0, noiseAmount: 40, particles: 0 },
  { id: 'cyber-chrome', name: 'Cyberpunk Chrome', category: 'surface', icon: '⚡', description: 'Iridescent metallic sheen with sharp neon reflections', glowIntensity: 85, glassBlur: 12, noiseAmount: 18, particles: 100 },
  { id: 'liquid-hologram', name: 'Holographic Prism', category: 'atmosphere', icon: '🔮', description: 'Chromatic dispersion with shifting ethereal light rays', glowIntensity: 65, glassBlur: 18, noiseAmount: 15, particles: 60 },
];

interface Props {
  onApplyEffect?: (preset: EffectPreset) => void;
}

export function OrbitoXEffectsStudio({ onApplyEffect }: Props) {
  const [activeCategory, setActiveCategory] = useState<'all' | 'light' | 'surface' | 'atmosphere'>('all');
  const [selectedEffect, setSelectedEffect] = useState<EffectPreset>(EFFECT_PRESETS[0]!);
  const [glow, setGlow] = useState(selectedEffect.glowIntensity);
  const [blur, setBlur] = useState(selectedEffect.glassBlur);
  const [noise, setNoise] = useState(selectedEffect.noiseAmount);
  const [particles, setParticles] = useState(selectedEffect.particles);

  const filteredPresets = EFFECT_PRESETS.filter(
    (p) => activeCategory === 'all' || p.category === activeCategory
  );

  const handleSelectPreset = (p: EffectPreset) => {
    setSelectedEffect(p);
    setGlow(p.glowIntensity);
    setBlur(p.glassBlur);
    setNoise(p.noiseAmount);
    setParticles(p.particles);
    onApplyEffect?.(p);
  };

  return (
    <div style={{ padding: '20px', color: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <Sparkles size={18} style={{ color: '#DFBA6B' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Visual Effects Studio</h3>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.4 }}>
          Hardware-accelerated shaders, optical glass, film grain, and atmospheric stardust. Parameterized and rendered live.
        </p>
      </div>

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {[
          { id: 'all', label: 'All Effects' },
          { id: 'light', label: 'Light & Glow' },
          { id: 'surface', label: 'Glass & Surface' },
          { id: 'atmosphere', label: 'Atmosphere' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id as any)}
            style={{
              background: activeCategory === tab.id ? 'rgba(223, 186, 107, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              border: activeCategory === tab.id ? '1px solid #DFBA6B' : '1px solid rgba(255, 255, 255, 0.08)',
              color: activeCategory === tab.id ? '#DFBA6B' : 'rgba(255, 255, 255, 0.7)',
              borderRadius: '9999px',
              padding: '4px 12px',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Preset Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {filteredPresets.map((preset) => {
          const isSelected = selectedEffect.id === preset.id;
          return (
            <div
              key={preset.id}
              onClick={() => handleSelectPreset(preset)}
              style={{
                borderRadius: '10px',
                padding: '12px',
                background: isSelected ? 'rgba(223, 186, 107, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                border: isSelected ? '1px solid #DFBA6B' : '1px solid rgba(255, 255, 255, 0.06)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '1.2rem' }}>{preset.icon}</span>
                {isSelected && <Check size={14} style={{ color: '#DFBA6B' }} />}
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#FFFFFF' }}>{preset.name}</div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.3 }}>
                {preset.description}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sliders for active effect */}
      <div
        style={{
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#DFBA6B', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sliders size={14} />
          <span>Tuning: {selectedEffect.name}</span>
        </div>

        {/* Glow */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>Light Bloom / Glow</span>
            <span style={{ fontSize: '0.7rem', color: '#DFBA6B', fontFamily: 'monospace' }}>{glow}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={glow}
            onChange={(e) => setGlow(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#DFBA6B' }}
          />
        </div>

        {/* Glass Blur */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>Frosted Glass Blur</span>
            <span style={{ fontSize: '0.7rem', color: '#DFBA6B', fontFamily: 'monospace' }}>{blur}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="40"
            value={blur}
            onChange={(e) => setBlur(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#DFBA6B' }}
          />
        </div>

        {/* Film Noise */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>Analogue Film Grain</span>
            <span style={{ fontSize: '0.7rem', color: '#DFBA6B', fontFamily: 'monospace' }}>{noise}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={noise}
            onChange={(e) => setNoise(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#DFBA6B' }}
          />
        </div>

        {/* Atmosphere Stardust */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>Atmospheric Stardust Density</span>
            <span style={{ fontSize: '0.7rem', color: '#DFBA6B', fontFamily: 'monospace' }}>{particles}</span>
          </div>
          <input
            type="range"
            min="0"
            max="200"
            value={particles}
            onChange={(e) => setParticles(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#DFBA6B' }}
          />
        </div>
      </div>
    </div>
  );
}
