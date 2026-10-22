'use client';

import React from 'react';
import { Sun, Heart, Sparkles } from 'lucide-react';

// Hand-painted Italian Ceramic Majolica Tile Ribbon
export function ItalianMajolicaBorder({
  primaryColor = '#E8B86D',
  azureColor = '#3A7D8C',
  className = '',
}: {
  primaryColor?: string;
  azureColor?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 800 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <defs>
        <pattern id="majolicaTile" width="48" height="48" patternUnits="userSpaceOnUse">
          <rect width="48" height="48" fill="#1C100B" />
          <rect x="2" y="2" width="44" height="44" stroke={primaryColor} strokeWidth="1" strokeOpacity="0.4" fill="none" />
          {/* Tile Center Cross & Diamond */}
          <circle cx="24" cy="24" r="7" fill={azureColor} fillOpacity="0.4" stroke={primaryColor} strokeWidth="1" />
          <circle cx="24" cy="24" r="2.5" fill="#FFF8E7" />
          <path d="M 24 6 L 24 14" stroke={primaryColor} strokeWidth="1.2" />
          <path d="M 24 34 L 24 42" stroke={primaryColor} strokeWidth="1.2" />
          <path d="M 6 24 L 14 24" stroke={primaryColor} strokeWidth="1.2" />
          <path d="M 34 24 L 42 24" stroke={primaryColor} strokeWidth="1.2" />
          {/* Corner Florets */}
          <circle cx="4" cy="4" r="2" fill={primaryColor} fillOpacity="0.6" />
          <circle cx="44" cy="4" r="2" fill={primaryColor} fillOpacity="0.6" />
          <circle cx="4" cy="44" r="2" fill={primaryColor} fillOpacity="0.6" />
          <circle cx="44" cy="44" r="2" fill={primaryColor} fillOpacity="0.6" />
        </pattern>
      </defs>
      <rect width="800" height="48" fill="url(#majolicaTile)" />
      <line x1="0" y1="1" x2="800" y2="1" stroke={primaryColor} strokeWidth="1.5" strokeOpacity="0.7" />
      <line x1="0" y1="47" x2="800" y2="47" stroke={primaryColor} strokeWidth="1.5" strokeOpacity="0.7" />
    </svg>
  );
}

// Italian Clifftop Villa Terracotta Archway
export function TerracottaArchway({
  primaryColor = '#E8B86D',
  accentColor = '#D84A75',
}: {
  primaryColor?: string;
  accentColor?: string;
}) {
  return (
    <svg
      viewBox="0 0 720 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="amalfiGoldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={primaryColor} stopOpacity="0.2" />
          <stop offset="30%" stopColor={primaryColor} stopOpacity="0.9" />
          <stop offset="50%" stopColor="#FFF2D6" stopOpacity="1" />
          <stop offset="70%" stopColor={primaryColor} stopOpacity="0.9" />
          <stop offset="100%" stopColor={primaryColor} stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="bougGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF7096" />
          <stop offset="100%" stopColor={accentColor} />
        </linearGradient>
      </defs>

      {/* Stone Portico Arch */}
      <path
        d="M 30 180 L 30 135 C 30 45, 180 12, 360 12 C 540 12, 690 45, 690 135 L 690 180"
        stroke="url(#amalfiGoldGrad)"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Inner Decorative Arch */}
      <path
        d="M 50 180 L 50 138 C 50 58, 190 26, 360 26 C 530 26, 670 58, 670 138 L 670 180"
        stroke="url(#amalfiGoldGrad)"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        fill="none"
      />

      {/* Villa Keystone Rosette */}
      <g transform="translate(360, 16)">
        <circle cx="0" cy="0" r="15" fill="#1C100B" stroke="url(#amalfiGoldGrad)" strokeWidth="2" />
        <circle cx="0" cy="0" r="5" fill={primaryColor} />
        <circle cx="0" cy="0" r="2" fill="#FFF" />
      </g>

      {/* Cascading Bougainvillea along the arch */}
      {[120, 200, 280, 440, 520, 600].map((x, i) => (
        <g key={i} transform={`translate(${x}, ${42 + Math.sin(i) * 12})`}>
          <circle cx="-4" cy="0" r="7" fill="url(#bougGrad)" />
          <circle cx="4" cy="0" r="7" fill="url(#bougGrad)" />
          <circle cx="0" cy="-5" r="7" fill="url(#bougGrad)" />
          <circle cx="0" cy="0" r="2" fill="#FFF1C5" />
        </g>
      ))}
    </svg>
  );
}

// Amalfi Citrus & Rose Floral Divider (Zero emojis)
export function AmalfiFloralDivider({
  primaryColor = '#E8B86D',
  accentColor = '#D84A75',
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
          background: `linear-gradient(90deg, transparent 0%, ${primaryColor}99 70%, ${accentColor} 100%)`,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Sun size={13} color={primaryColor} style={{ opacity: 0.85 }} />
        <div
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: 'rgba(232, 184, 109, 0.15)',
            border: `1px solid ${primaryColor}88`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 12px ${accentColor}44`,
          }}
        >
          <Heart size={12} fill={accentColor} color={accentColor} />
        </div>
        <Sun size={13} color={primaryColor} style={{ opacity: 0.85 }} />
      </div>
      <div
        style={{
          flex: 1,
          height: '1px',
          background: `linear-gradient(270deg, transparent 0%, ${primaryColor}99 70%, ${accentColor} 100%)`,
        }}
      />
    </div>
  );
}
