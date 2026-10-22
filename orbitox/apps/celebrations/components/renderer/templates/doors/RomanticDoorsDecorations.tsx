'use client';

import React from 'react';
import { Sparkles, Heart } from 'lucide-react';

// French Chateau Archway Casing with Rococo Keystone & Moulding
export function FrenchArchwayFrame({
  primaryColor = '#E8A598',
  goldColor = '#D4AF37',
  className = '',
}: {
  primaryColor?: string;
  goldColor?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 680 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="frenchGoldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={goldColor} stopOpacity="0.15" />
          <stop offset="25%" stopColor={goldColor} stopOpacity="0.85" />
          <stop offset="50%" stopColor="#FFF1C5" stopOpacity="1" />
          <stop offset="75%" stopColor={goldColor} stopOpacity="0.85" />
          <stop offset="100%" stopColor={goldColor} stopOpacity="0.15" />
        </linearGradient>
        <filter id="softChateauGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Main Arch Outer Rim (hugs 640px door container exactly) */}
      <path
        d="M 20 180 L 20 140 C 20 50, 160 12, 340 12 C 520 12, 660 50, 660 140 L 660 180"
        stroke="url(#frenchGoldGrad)"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
        filter="url(#softChateauGlow)"
      />

      {/* Inner Decorative Moulding */}
      <path
        d="M 36 180 L 36 142 C 36 64, 170 26, 340 26 C 510 26, 644 64, 644 142 L 644 180"
        stroke="url(#frenchGoldGrad)"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        fill="none"
      />

      {/* Center Keystone with French Fleur & Rosette */}
      <g transform="translate(340, 16)">
        <circle cx="0" cy="0" r="15" fill="#180C13" stroke="url(#frenchGoldGrad)" strokeWidth="2" />
        <path
          d="M 0 -9 C 2 -5, 5 -3, 5 0 C 5 3, 2 5, 0 7 C -2 5, -5 3, -5 0 C -5 -3, -2 -5, 0 -9 Z"
          fill={goldColor}
        />
        <circle cx="0" cy="0" r="2.5" fill="#FFF1C5" />
        {/* Acanthus scrolls on left & right of keystone */}
        <path
          d="M -16 -2 C -32 -12, -54 -7, -72 0 C -50 -2, -32 6, -16 5"
          stroke="url(#frenchGoldGrad)"
          strokeWidth="1.8"
          fill="none"
        />
        <path
          d="M 16 -2 C 32 -12, 54 -7, 72 0 C 50 -2, 32 6, 16 5"
          stroke="url(#frenchGoldGrad)"
          strokeWidth="1.8"
          fill="none"
        />
      </g>

      {/* Left Capital Ornament at Spring Line */}
      <g transform="translate(20, 140)">
        <rect x="-12" y="-7" width="24" height="14" rx="3" fill="#180C13" stroke={goldColor} strokeWidth="1.5" />
        <circle cx="0" cy="0" r="2.5" fill="#FFF1C5" />
      </g>

      {/* Right Capital Ornament at Spring Line */}
      <g transform="translate(660, 140)">
        <rect x="-12" y="-7" width="24" height="14" rx="3" fill="#180C13" stroke={goldColor} strokeWidth="1.5" />
        <circle cx="0" cy="0" r="2.5" fill="#FFF1C5" />
      </g>
    </svg>
  );
}

// Cascading English Climbing Roses & Ivy Vines
export function ClimbingRosesGarland({
  side = 'left',
  primaryColor = '#E8A598',
}: {
  side?: 'left' | 'right';
  primaryColor?: string;
}) {
  const isLeft = side === 'left';
  return (
    <svg
      viewBox="0 0 100 480"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        transform: isLeft ? 'none' : 'scaleX(-1)',
      }}
    >
      <defs>
        <linearGradient id={`rosePetalGrad_${side}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF0F3" />
          <stop offset="50%" stopColor={primaryColor} />
          <stop offset="100%" stopColor="#B34B62" />
        </linearGradient>
        <linearGradient id={`ivyLeafGrad_${side}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A3B899" />
          <stop offset="100%" stopColor="#415D43" />
        </linearGradient>
      </defs>

      {/* Main Sinewy Vine Stem */}
      <path
        d="M 20 0 C 35 70, 8 140, 30 210 C 50 280, 15 350, 35 420 C 42 450, 28 475, 24 480"
        stroke="#5A4A42"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 30 210 C 12 245, 6 290, 12 335"
        stroke="#5A4A42"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />

      {/* Ivy Leaves */}
      <g fill={`url(#ivyLeafGrad_${side})`} opacity="0.85">
        <path d="M 22 55 C 32 45, 44 52, 38 64 C 33 67, 24 64, 22 55 Z" />
        <path d="M 12 125 C 2 114, -4 127, 4 136 C 11 136, 15 129, 12 125 Z" />
        <path d="M 38 190 C 50 180, 58 194, 46 204 C 38 204, 34 196, 38 190 Z" />
        <path d="M 16 280 C 7 270, 0 284, 10 293 C 19 291, 21 284, 16 280 Z" />
        <path d="M 42 365 C 54 355, 62 371, 50 380 C 41 380, 39 371, 42 365 Z" />
      </g>

      {/* Blooming English Roses */}
      {/* Rose 1 (Top) */}
      <g transform="translate(26, 95)">
        <circle cx="0" cy="0" r="13" fill={`url(#rosePetalGrad_${side})`} />
        <path
          d="M -7 -3 C -3 -10, 3 -10, 7 -3 C 10 3, 3 8, 0 8 C -5 8, -10 2, -7 -3 Z"
          fill="#FFF0F3"
          opacity="0.75"
        />
        <circle cx="0" cy="0" r="3.5" fill="#D4AF37" />
      </g>

      {/* Rose 2 (Mid) */}
      <g transform="translate(32, 245) scale(1.1)">
        <circle cx="0" cy="0" r="13" fill={`url(#rosePetalGrad_${side})`} />
        <path
          d="M -6 -3 C -3 -10, 4 -10, 6 -3 C 9 3, 3 8, 0 8 C -4 8, -9 1, -6 -3 Z"
          fill="#FFF0F3"
          opacity="0.8"
        />
        <circle cx="0" cy="0" r="3.5" fill="#D4AF37" />
      </g>

      {/* Rose 3 (Lower) */}
      <g transform="translate(34, 400) scale(0.9)">
        <circle cx="0" cy="0" r="13" fill={`url(#rosePetalGrad_${side})`} />
        <path
          d="M -5 -2 C -2 -8, 3 -8, 5 -2 C 8 2, 2 7, 0 7 C -3 7, -8 1, -5 -2 Z"
          fill="#FFF0F3"
          opacity="0.75"
        />
        <circle cx="0" cy="0" r="3" fill="#D4AF37" />
      </g>

      {/* Soft Rose Buds */}
      <circle cx="14" cy="170" r="4.5" fill={`url(#rosePetalGrad_${side})`} />
      <circle cx="26" cy="325" r="5" fill={`url(#rosePetalGrad_${side})`} />
    </svg>
  );
}

// Ornate Antique French Cremone Brass Handle
export function VintageBrassHandle({
  isHovered = false,
  isOpen = false,
  side = 'left',
}: {
  isHovered?: boolean;
  isOpen?: boolean;
  side?: 'left' | 'right';
}) {
  const isLeft = side === 'left';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isLeft ? 'flex-end' : 'flex-start',
        filter: isHovered
          ? 'drop-shadow(0 0 16px rgba(212, 175, 55, 0.9))'
          : 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.75))',
        transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
        transform: isOpen
          ? isLeft
            ? 'rotate(-25deg)'
            : 'rotate(25deg)'
          : isHovered
          ? 'scale(1.05)'
          : 'scale(1)',
      }}
    >
      <svg width="34" height="110" viewBox="0 0 34 110" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`brassPlateGrad_${side}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF1C5" />
            <stop offset="35%" stopColor="#D4AF37" />
            <stop offset="70%" stopColor="#997722" />
            <stop offset="100%" stopColor="#4A380C" />
          </linearGradient>
          <linearGradient id={`brassLeverGrad_${side}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFF8E7" />
            <stop offset="50%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#7A5D18" />
          </linearGradient>
        </defs>

        {/* Backplate Escutcheon */}
        <rect
          x="7"
          y="6"
          width="20"
          height="98"
          rx="10"
          fill={`url(#brassPlateGrad_${side})`}
          stroke="#4A380C"
          strokeWidth="1.2"
        />

        {/* Top & Bottom Mounting Screws */}
        <circle cx="17" cy="16" r="2.2" fill="#3D2E0B" />
        <circle cx="17" cy="94" r="2.2" fill="#3D2E0B" />

        {/* Keyhole */}
        <circle cx="17" cy="74" r="2.5" fill="#1C1405" />
        <path d="M 15.5 75 L 18.5 75 L 19.5 82 L 14.5 82 Z" fill="#1C1405" />

        {/* Lever Pivot Boss */}
        <circle cx="17" cy="40" r="6.5" fill={`url(#brassPlateGrad_${side})`} stroke="#4A380C" strokeWidth="1" />
        <circle cx="17" cy="40" r="2.5" fill="#FFF1C5" />

        {/* Lever Handle */}
        <path
          d={
            isLeft
              ? 'M 17 38 C 10 36, 2 40, 2 44 C 2 48, 10 44, 17 42 Z'
              : 'M 17 38 C 24 36, 32 40, 32 44 C 32 48, 24 44, 17 42 Z'
          }
          fill={`url(#brassLeverGrad_${side})`}
          stroke="#5C4510"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}

// Romantic Floral Divider with Center Vector Blossom (Zero Emojis)
export function RomanticFloralDivider({
  color = '#E8A598',
  goldColor = '#D4AF37',
  className = '',
}: {
  color?: string;
  goldColor?: string;
  className?: string;
}) {
  return (
    <div
      className={className}
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
          background: `linear-gradient(90deg, transparent 0%, ${goldColor}99 70%, ${color} 100%)`,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Sparkles size={13} color={goldColor} style={{ opacity: 0.8 }} />
        <div
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: 'rgba(232, 165, 152, 0.15)',
            border: `1px solid ${goldColor}88`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 12px ${color}44`,
          }}
        >
          <Heart size={12} fill="#E8A598" color="#E8A598" />
        </div>
        <Sparkles size={13} color={goldColor} style={{ opacity: 0.8, transform: 'scaleX(-1)' }} />
      </div>
      <div
        style={{
          flex: 1,
          height: '1px',
          background: `linear-gradient(270deg, transparent 0%, ${goldColor}99 70%, ${color} 100%)`,
        }}
      />
    </div>
  );
}

// Vintage Candle Lantern with Flickering Flame
export function CandleLantern({
  glowColor = '#FFB86C',
  size = 32,
}: {
  glowColor?: string;
  size?: number;
}) {
  return (
    <div
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size * 1.5}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        viewBox="0 0 36 54"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          <radialGradient id="lanternGlow" cx="50%" cy="60%" r="50%">
            <stop offset="0%" stopColor={glowColor} stopOpacity="1" />
            <stop offset="40%" stopColor="#FFA040" stopOpacity="0.8" />
            <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="18" cy="6" r="4" stroke="#D4AF37" strokeWidth="1.5" />
        <path d="M 6 15 L 18 8 L 30 15 Z" fill="#2E201B" stroke="#D4AF37" strokeWidth="1.2" />
        <rect x="8" y="15" width="20" height="28" rx="2" fill="rgba(255, 235, 200, 0.08)" stroke="#D4AF37" strokeWidth="1.2" />
        <circle cx="18" cy="30" r="12" fill="url(#lanternGlow)" />
        <rect x="15" y="32" width="6" height="10" rx="1" fill="#FFF9E6" />
        <path
          d="M 18 24 C 19.5 27, 20 29, 18 31 C 16 29, 16.5 27, 18 24 Z"
          fill="#FFF275"
        >
          <animate
            attributeName="opacity"
            values="0.85;1;0.7;0.95;0.85"
            dur="1.6s"
            repeatCount="indefinite"
          />
        </path>
        <rect x="6" y="43" width="24" height="4" rx="1.5" fill="#2E201B" stroke="#D4AF37" strokeWidth="1.2" />
      </svg>
    </div>
  );
}
