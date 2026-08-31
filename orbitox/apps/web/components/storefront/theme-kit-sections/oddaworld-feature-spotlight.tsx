'use client';

import React, { useState } from 'react';
import { PageSection } from '@orbitox/commerce';

interface SpotlightProps {
  section: PageSection;
  onSelect?: () => void;
  isSelected?: boolean;
}

export function OddaWorldFeatureSpotlightSection({
  section,
  onSelect,
  isSelected,
}: SpotlightProps) {
  const {
    badge = 'ACOUSTIC ARCHITECTURE',
    title = 'Engineered for Pure Sonic Precision',
    subtitle = 'Custom 50mm dynamic beryllium drivers tuned for studio-grade low distortion and binaural depth.',
  } = section.settings || {};

  const [activeTab, setActiveTab] = useState<'acoustic' | 'anc' | 'battery'>('acoustic');
  const [soundProfile, setSoundProfile] = useState<'bass' | 'balanced' | 'spatial'>('spatial');

  return (
    <section
      onClick={onSelect}
      style={{
        maxWidth: '1320px',
        margin: '30px auto',
        padding: '40px 30px',
        background: 'radial-gradient(ellipse at 50% 0%, #082114 0%, #030805 100%)',
        borderRadius: '32px',
        border: isSelected ? '2px solid #A3E635' : '1px solid rgba(163, 230, 53, 0.25)',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(163, 230, 53, 0.2)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        color: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Cyber Glowing Accents */}
      <div
        style={{
          position: 'absolute',
          top: '-120px',
          right: '10%',
          width: '350px',
          height: '350px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(163, 230, 53, 0.15) 0%, transparent 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />

      {/* Top Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 900,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#A3E635',
            background: 'rgba(163, 230, 53, 0.1)',
            border: '1px solid rgba(163, 230, 53, 0.3)',
            padding: '5px 14px',
            borderRadius: '9999px',
          }}
        >
          {badge}
        </span>
        <h2
          style={{
            fontSize: 'clamp(28px, 4vw, 44px)',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            margin: '14px 0 8px',
          }}
        >
          {title}
        </h2>
        <p style={{ fontSize: '14px', color: '#94A3B8', maxWidth: '600px', margin: '0 auto' }}>
          {subtitle}
        </p>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'inline-flex',
            gap: '8px',
            marginTop: '24px',
            background: 'rgba(0, 0, 0, 0.5)',
            padding: '4px',
            borderRadius: '9999px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {[
            { id: 'acoustic', label: '🔊 50mm Beryllium Drivers' },
            { id: 'anc', label: '🛡️ 42dB Hybrid ANC' },
            { id: 'battery', label: '⚡ 60h Ultra Battery' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab(t.id as any);
              }}
              style={{
                padding: '8px 18px',
                borderRadius: '9999px',
                border: 'none',
                background: activeTab === t.id ? '#A3E635' : 'transparent',
                color: activeTab === t.id ? '#040C07' : '#94A3B8',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Main Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
          gap: '30px',
          alignItems: 'center',
        }}
      >
        {/* Left: Dynamic 3D Cutaway Preview */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '30px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minHeight: '380px',
            justifyContent: 'center',
          }}
        >
          <img
            src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800&auto=format&fit=crop"
            alt="OddaWorld Titanium Drivers"
            style={{
              maxHeight: '260px',
              maxWidth: '100%',
              objectFit: 'contain',
              filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.8))',
              zIndex: 2,
            }}
          />

          {/* Interactive Sound EQ Mode Selector */}
          <div
            style={{
              display: 'flex',
              gap: '10px',
              marginTop: '20px',
              zIndex: 3,
            }}
          >
            {[
              { id: 'spatial', label: '🌌 Binaural Spatial 3D' },
              { id: 'bass', label: '⚡ Deep Impact Bass' },
              { id: 'balanced', label: '🎯 Studio Reference' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSoundProfile(p.id as any);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: soundProfile === p.id ? '1px solid #A3E635' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: soundProfile === p.id ? 'rgba(163, 230, 53, 0.15)' : 'rgba(0,0,0,0.4)',
                  color: soundProfile === p.id ? '#A3E635' : '#94A3B8',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Technical Metrics & Realtime Visualizer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Animated Frequency Audio Visualizer Bars */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '16px',
              padding: '16px 20px',
              border: '1px solid rgba(163, 230, 53, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#A3E635' }}>
                LIVE SPECTRUM ANALYZER (20Hz - 40,000Hz)
              </span>
              <span style={{ fontSize: '11px', color: '#94A3B8' }}>Hi-Res Wireless 990kbps</span>
            </div>

            {/* Sound Wave Bars */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px', height: '50px' }}>
              {[40, 65, 85, 95, 70, 45, 80, 100, 90, 60, 75, 95, 80, 50, 65, 90, 40, 70, 85, 60].map((h, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h}%`,
                    background: i % 2 === 0 ? '#A3E635' : '#4ADE80',
                    borderRadius: '2px',
                    boxShadow: '0 0 8px rgba(163, 230, 53, 0.4)',
                    transition: 'height 0.3s ease',
                  }}
                />
              ))}
            </div>
          </div>

          {/* 3 Tech Spec Rows */}
          {[
            { title: 'Acoustic Driver', val: '50mm Beryllium Matrix', desc: '0.05% Ultra-low Total Harmonic Distortion (THD)' },
            { title: 'Noise Suppression', val: '-42dB Smart Hybrid ANC', desc: 'Dual-feedforward microphones sampling at 384kHz' },
            { title: 'Wireless Latency', val: '24ms Ultra-Low Gaming', desc: 'LE Audio Bluetooth 5.4 with aptX Lossless' },
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '14px 18px',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFF' }}>{item.title}</div>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>{item.desc}</div>
              </div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 900,
                  color: '#A3E635',
                  padding: '4px 10px',
                  background: 'rgba(163, 230, 53, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(163, 230, 53, 0.25)',
                }}
              >
                {item.val}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
