'use client';

import React from 'react';
import { Sparkles, Heart } from 'lucide-react';

// Victorian Conservatory Arched Ironwork Tracery
export function VictorianGlasshouseArch({
  primaryColor = '#E2C889',
  accentColor = '#D4B8E8',
  className = '',
}: {
  primaryColor?: string;
  accentColor?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 700 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="crystalGold" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={primaryColor} stopOpacity="0.2" />
          <stop offset="30%" stopColor={primaryColor} stopOpacity="0.85" />
          <stop offset="50%" stopColor="#FFF9E6" stopOpacity="1" />
          <stop offset="70%" stopColor={primaryColor} stopOpacity="0.85" />
          <stop offset="100%" stopColor={primaryColor} stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="wisteriaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor={accentColor} />
          <stop offset="100%" stopColor="#9C72C3" />
        </linearGradient>
      </defs>

      {/* Main Conservatory Arch Contour */}
      <path
        d="M 30 200 L 30 150 C 30 50, 180 16, 350 16 C 520 16, 670 50, 670 150 L 670 200"
        stroke="url(#crystalGold)"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Inner Tracery Ribs */}
      <path
        d="M 50 200 L 50 152 C 50 70, 190 32, 350 32 C 510 32, 650 70, 650 152 L 650 200"
        stroke="url(#crystalGold)"
        strokeWidth="1.5"
        strokeDasharray="5 3"
        fill="none"
      />

      {/* Radial Ironwork Sunburst Ribs */}
      {[
        'M 120 120 L 150 75',
        'M 200 70 L 230 40',
        'M 300 40 L 320 20',
        'M 400 40 L 380 20',
        'M 500 70 L 470 40',
        'M 580 120 L 550 75',
      ].map((d, i) => (
        <path key={i} d={d} stroke="url(#crystalGold)" strokeWidth="1.2" strokeOpacity="0.7" />
      ))}

      {/* Center Victorian Rosette Keystone */}
      <g transform="translate(350, 18)">
        <circle cx="0" cy="0" r="16" fill="#140822" stroke="url(#crystalGold)" strokeWidth="2" />
        <circle cx="0" cy="0" r="6" fill={primaryColor} />
        <circle cx="0" cy="0" r="2.5" fill="#FFF" />
      </g>

      {/* Hanging Wisteria Clusters along the arch */}
      {[100, 180, 260, 440, 520, 600].map((x, idx) => (
        <g key={idx} transform={`translate(${x}, ${50 + Math.sin(idx) * 16})`}>
          <ellipse cx="0" cy="8" rx="4" ry="10" fill="url(#wisteriaGradient)" opacity="0.85" />
          <ellipse cx="0" cy="22" rx="3.5" ry="8" fill="url(#wisteriaGradient)" opacity="0.75" />
          <ellipse cx="0" cy="34" rx="2.5" ry="6" fill="url(#wisteriaGradient)" opacity="0.65" />
        </g>
      ))}
    </svg>
  );
}

// Crystal Candelabra with Amber Flickering Glow
export function CrystalCandelabra({
  size = 40,
}: {
  size?: number;
}) {
  return (
    <div style={{ width: `${size}px`, height: `${size * 1.4}px`, display: 'inline-flex' }}>
      <svg viewBox="0 0 40 56" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <defs>
          <radialGradient id="candGlow" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#FFF1C5" stopOpacity="1" />
            <stop offset="50%" stopColor="#FFA040" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FF8000" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Center Candle & Branches */}
        <path d="M 20 28 L 20 48" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 10 36 C 10 44, 30 44, 30 36" stroke="#D4AF37" strokeWidth="2" fill="none" />
        <rect x="8" y="24" width="4" height="12" rx="1" fill="#FFF9E6" />
        <rect x="18" y="16" width="4" height="12" rx="1" fill="#FFF9E6" />
        <rect x="28" y="24" width="4" height="12" rx="1" fill="#FFF9E6" />
        {/* Center Flame */}
        <circle cx="20" cy="12" r="8" fill="url(#candGlow)" />
        <circle cx="10" cy="20" r="6" fill="url(#candGlow)" />
        <circle cx="30" cy="20" r="6" fill="url(#candGlow)" />
        {/* Base */}
        <path d="M 12 50 L 28 50" stroke="#D4AF37" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// Glasshouse Floral Divider (Zero emojis)
export function GlasshouseFloralDivider({
  primaryColor = '#E2C889',
  accentColor = '#D4B8E8',
}: {
  primaryColor?: string;
  accentColor?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '14px',
        margin: '24px auto',
        maxWidth: '380px',
        width: '100%',
      }}
    >
      <div
        style={{
          flex: 1,
          height: '1px',
          background: `linear-gradient(90deg, transparent 0%, ${primaryColor}88 70%, ${accentColor} 100%)`,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Sparkles size={13} color={primaryColor} style={{ opacity: 0.85 }} />
        <div
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: 'rgba(212, 184, 232, 0.15)',
            border: `1px solid ${primaryColor}88`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 12px ${accentColor}44`,
          }}
        >
          <Heart size={12} fill={primaryColor} color={primaryColor} />
        </div>
        <Sparkles size={13} color={primaryColor} style={{ opacity: 0.85, transform: 'scaleX(-1)' }} />
      </div>
      <div
        style={{
          flex: 1,
          height: '1px',
          background: `linear-gradient(270deg, transparent 0%, ${primaryColor}88 70%, ${accentColor} 100%)`,
        }}
      />
    </div>
  );
}
