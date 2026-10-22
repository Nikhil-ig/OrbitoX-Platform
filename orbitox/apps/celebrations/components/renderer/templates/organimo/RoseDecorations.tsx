'use client';

import React from 'react';

/**
 * Exquisite, high-fidelity SVG Botanical Rose & Petal Illustrations
 * Modeled directly after the luxury wedding reference image.
 * 
 * 100% Vector, Ultra-Photorealistic Gradients, ZERO Parallax,
 * Completely static, performant, and crisp on all Retina and mobile screens.
 */

interface PetalProps {
  size?: number;
  rotation?: number;
  flip?: boolean;
  opacity?: number;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Photorealistic Rose Petal with Curled Velvet Edge, Specular Highlights & Natural Depth
 */
export function RosePetalSvg({
  size = 48,
  rotation = 0,
  flip = false,
  opacity = 1,
  style,
  className,
}: PetalProps) {
  const id = React.useId().replace(/:/g, '_');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transform: `rotate(${rotation}deg) ${flip ? 'scaleX(-1)' : ''}`,
        filter: 'drop-shadow(0 12px 22px rgba(225, 29, 72, 0.28)) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.08))',
        opacity,
        pointerEvents: 'none',
        display: 'block',
        ...style,
      }}
      className={className}
    >
      <defs>
        {/* Deep velvety radial body gradient */}
        <radialGradient
          id={`petalBody_${id}`}
          cx="42%"
          cy="38%"
          r="62%"
          fx="32%"
          fy="28%"
        >
          <stop offset="0%" stopColor="#FFF1F4" />
          <stop offset="20%" stopColor="#FDA4AF" />
          <stop offset="55%" stopColor="#FF3B77" />
          <stop offset="82%" stopColor="#E11D48" />
          <stop offset="100%" stopColor="#9F1239" />
        </radialGradient>

        {/* Petal Inner Shadow Gradient */}
        <linearGradient id={`petalInnerGlow_${id}`} x1="0%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#FFE4E6" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#FB7185" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#881337" stopOpacity="0.8" />
        </linearGradient>

        {/* Curled Lip Specular Rim */}
        <linearGradient id={`petalCurlRim_${id}`} x1="20%" y1="0%" x2="85%" y2="60%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="40%" stopColor="#FECDD3" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#E11D48" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Ambient Petal Under-Shadow */}
      <path
        d="M60 14C86 14 110 32 108 66C105 96 78 112 58 112C36 112 10 96 12 64C14 32 36 14 60 14Z"
        fill="#881337"
        fillOpacity="0.12"
      />

      {/* Main Velvet Petal Body */}
      <path
        d="M60 12C84 12 106 28 104 62C101 92 76 108 56 108C36 108 14 92 16 60C18 30 38 12 60 12Z"
        fill={`url(#petalBody_${id})`}
      />

      {/* Inner Petal Cup Depth (Creates 3D Convex Curve) */}
      <path
        d="M58 24C76 24 94 38 92 64C90 84 72 96 56 96C40 96 26 84 28 62C30 40 42 24 58 24Z"
        fill={`url(#petalInnerGlow_${id})`}
      />

      {/* Curled Outer Rim Highlight */}
      <path
        d="M58 13C78 13 100 27 102 56"
        stroke={`url(#petalCurlRim_${id})`}
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* Delicate Micro-Veins */}
      <path
        d="M58 32Q56 64 56 98"
        stroke="#FFF1F2"
        strokeWidth="1.2"
        strokeOpacity="0.6"
        strokeLinecap="round"
      />
      <path
        d="M56 52Q72 58 84 68"
        stroke="#FFE4E6"
        strokeWidth="0.8"
        strokeOpacity="0.4"
        strokeLinecap="round"
      />
      <path
        d="M56 62Q38 68 28 78"
        stroke="#FFE4E6"
        strokeWidth="0.8"
        strokeOpacity="0.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Single High-Fidelity Botanical Rose Blossom with Stem & Leaves
 * Placed on the Left and Right margins of Anna & Mark in the reference image.
 */
export function RoseStemSvg({
  size = 150,
  flip = false,
  rotation = 0,
  style,
}: {
  size?: number;
  flip?: boolean;
  rotation?: number;
  style?: React.CSSProperties;
}) {
  const id = React.useId().replace(/:/g, '_');

  return (
    <svg
      width={size}
      height={size * 1.35}
      viewBox="0 0 170 230"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transform: `rotate(${rotation}deg) ${flip ? 'scaleX(-1)' : ''}`,
        filter: 'drop-shadow(0 16px 30px rgba(0, 0, 0, 0.12)) drop-shadow(0 4px 10px rgba(225, 29, 72, 0.15))',
        pointerEvents: 'none',
        display: 'block',
        ...style,
      }}
    >
      <defs>
        {/* Multi-layer Velvet Petal Gradient */}
        <radialGradient id={`roseHeadGrad_${id}`} cx="46%" cy="40%" r="58%">
          <stop offset="0%" stopColor="#FFF1F5" />
          <stop offset="22%" stopColor="#FDA4AF" />
          <stop offset="55%" stopColor="#FF3B77" />
          <stop offset="82%" stopColor="#E11D48" />
          <stop offset="100%" stopColor="#881337" />
        </radialGradient>

        {/* Stem Gradient */}
        <linearGradient id={`stemGrad_${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#65A30D" />
          <stop offset="50%" stopColor="#3F6212" />
          <stop offset="100%" stopColor="#1E3A1A" />
        </linearGradient>

        {/* Leaf Gradient */}
        <linearGradient id={`leafGrad_${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#84CC16" />
          <stop offset="50%" stopColor="#4D7C0F" />
          <stop offset="100%" stopColor="#1E3A1A" />
        </linearGradient>
      </defs>

      {/* Gracefully Curved Stem */}
      <path
        d="M85 92Q80 145 98 215"
        stroke={`url(#stemGrad_${id})`}
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Small Natural Stem Thorns */}
      <path d="M82 120Q76 122 72 124Q78 126 84 125" fill="#365314" />
      <path d="M89 160Q96 162 101 164Q95 166 90 165" fill="#365314" />

      {/* Left Leaf Group */}
      <g>
        <path
          d="M85 130C60 118 42 130 36 148C54 154 78 148 88 140Z"
          fill={`url(#leafGrad_${id})`}
          filter="drop-shadow(0 4px 6px rgba(0,0,0,0.1))"
        />
        {/* Leaf Main Vein */}
        <path d="M85 134Q62 140 40 146" stroke="#BEF264" strokeWidth="1.2" strokeLinecap="round" />
        {/* Micro Leaf Veins */}
        <path d="M72 137Q68 132 64 128" stroke="#BEF264" strokeWidth="0.8" strokeOpacity="0.7" />
        <path d="M60 140Q56 135 52 131" stroke="#BEF264" strokeWidth="0.8" strokeOpacity="0.7" />
      </g>

      {/* Right Leaf Group */}
      <g>
        <path
          d="M92 162C116 152 136 162 142 180C124 185 102 180 93 172Z"
          fill={`url(#leafGrad_${id})`}
          filter="drop-shadow(0 4px 6px rgba(0,0,0,0.1))"
        />
        {/* Leaf Main Vein */}
        <path d="M92 165Q118 171 138 178" stroke="#BEF264" strokeWidth="1.2" strokeLinecap="round" />
        {/* Micro Leaf Veins */}
        <path d="M106 168Q110 163 115 159" stroke="#BEF264" strokeWidth="0.8" strokeOpacity="0.7" />
        <path d="M120 171Q125 166 130 162" stroke="#BEF264" strokeWidth="0.8" strokeOpacity="0.7" />
      </g>

      {/* Calyx & Sepals Supporting the Blossom */}
      <path d="M72 88C66 82 58 86 52 80C62 76 74 80 78 86Z" fill="#365314" />
      <path d="M96 88C102 82 110 86 116 80C106 76 94 80 90 86Z" fill="#365314" />
      <path d="M84 94C84 99 82 105 84 108C86 105 86 99 86 94Z" fill="#365314" />

      {/* Multi-layered Cabbage / Garden Rose Blossom */}
      {/* Layer 1: Outer Petal Skirt */}
      <ellipse cx="85" cy="54" rx="46" ry="38" fill={`url(#roseHeadGrad_${id})`} />

      {/* Layer 2: Outer Petal Overlaps */}
      <path
        d="M48 48C45 28 68 18 85 20C102 18 122 28 120 48C118 70 102 82 85 82C68 82 50 70 48 48Z"
        fill="#FF2D6C"
      />
      <path
        d="M52 46C56 30 72 24 85 25C98 24 114 30 118 46C112 62 100 72 85 72C70 72 58 62 52 46Z"
        fill={`url(#roseHeadGrad_${id})`}
      />

      {/* Layer 3: Mid Petal Rosette */}
      <path
        d="M58 44C60 30 74 26 85 27C96 26 110 30 112 44C108 58 98 66 85 66C72 66 62 58 58 44Z"
        fill="#E11D48"
      />
      <path
        d="M62 42C66 32 76 28 85 29C94 28 104 32 108 42C104 52 96 58 85 58C74 58 66 52 62 42Z"
        fill={`url(#roseHeadGrad_${id})`}
      />

      {/* Layer 4: Tight Inner Petal Spiral Heart */}
      <path
        d="M70 40C70 32 78 30 85 31C92 30 100 32 100 40C98 48 92 52 85 52C78 52 72 48 70 40Z"
        fill="#9F1239"
      />
      <path
        d="M75 38C76 33 81 32 85 33C89 32 94 33 95 38C93 43 89 46 85 46C81 46 77 43 75 38Z"
        fill="#FFF1F5"
      />
      <path
        d="M80 37C82 35 85 34 87 35C88 37 86 40 85 41C83 40 81 38 80 37Z"
        fill="#FF2D6C"
      />
    </svg>
  );
}

/**
 * Dense Cluster Bouquet of Pink Garden Roses
 * Nestled beside the "Are You Attending?" Envelope card as featured in the reference image.
 * Completely static, zero parallax, soft ambient drop shadow.
 */
export function RoseBouquetCluster({
  size = 210,
  style,
}: {
  size?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size * 0.9}px`,
        pointerEvents: 'none',
        display: 'block',
        ...style,
      }}
    >
      {/* Rose 1 (Main Center High Rose) */}
      <div style={{ position: 'absolute', top: 0, left: `${size * 0.22}px`, zIndex: 3 }}>
        <RoseStemSvg size={size * 0.68} rotation={-4} />
      </div>

      {/* Rose 2 (Left Lower Blooming Rose) */}
      <div style={{ position: 'absolute', top: `${size * 0.2}px`, left: 0, zIndex: 2 }}>
        <RoseStemSvg size={size * 0.58} rotation={-26} />
      </div>

      {/* Rose 3 (Right Lower Blooming Rose) */}
      <div style={{ position: 'absolute', top: `${size * 0.16}px`, right: 0, zIndex: 2 }}>
        <RoseStemSvg size={size * 0.6} rotation={20} flip />
      </div>

      {/* Scattered Petals Resting at Base */}
      <div style={{ position: 'absolute', bottom: '-10px', left: `${size * 0.12}px`, zIndex: 5 }}>
        <RosePetalSvg size={size * 0.26} rotation={42} />
      </div>
      <div style={{ position: 'absolute', bottom: '-6px', right: `${size * 0.18}px`, zIndex: 5 }}>
        <RosePetalSvg size={size * 0.22} rotation={-28} flip />
      </div>
    </div>
  );
}

/**
 * Delicate Rose Emblem / Icon for Badges, Medallions, and Profile Accents
 */
export function RoseIcon({
  size = 20,
  color = '#FF3B77',
  style,
}: {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    >
      <circle cx="12" cy="12" r="11" fill="#FFF1F4" />
      {/* Outer Petal Swirl */}
      <path
        d="M12 5C14.5 5 17 6.8 17 9.5C17 12 15 14 12 14C9 14 7 12 7 9.5C7 6.8 9.5 5 12 5Z"
        fill={color}
      />
      {/* Mid Petal Cup */}
      <path
        d="M12 7C13.5 7 15 8.2 15 10C15 11.5 13.8 12.5 12 12.5C10.2 12.5 9 11.5 9 10C9 8.2 10.5 7 12 7Z"
        fill="#FDA4AF"
      />
      {/* Rose Center Core */}
      <path
        d="M12 8.5C12.8 8.5 13.5 9.2 13.5 10C13.5 10.8 12.8 11.5 12 11.5C11.2 11.5 10.5 10.8 10.5 10C10.5 9.2 11.2 8.5 12 8.5Z"
        fill="#9F1239"
      />
      {/* Delicate Stem Accent */}
      <path
        d="M12 14V19M12 16.5C10.5 16 9.5 17 9 18M12 15.5C13.5 15 14.5 16 15 17"
        stroke="#4D7C0F"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Continuous Interconnecting Botanical Vine Divider
 * Threads consecutive sections together into a seamless royal storybook.
 */
export function InterconnectingVineLine({
  title,
  symbol = '♦',
  style,
}: {
  title?: string;
  symbol?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 0',
        position: 'relative',
        zIndex: 5,
        pointerEvents: 'none',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '380px' }}>
        {/* Left flowing leaf tendril */}
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, #F5C67B, rgba(245, 198, 123, 0.05))' }} />
        
        {/* Center Botanical Floral Emblem */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 14px',
            background: 'rgba(255, 245, 248, 0.85)',
            backdropFilter: 'blur(10px)',
            borderRadius: '9999px',
            border: '1px solid rgba(245, 198, 123, 0.45)',
            boxShadow: '0 4px 14px rgba(225, 29, 72, 0.08), 0 0 10px rgba(245, 198, 123, 0.15)',
          }}
        >
          <RoseIcon size={14} />
          {title && (
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '0.62rem',
                fontWeight: 700,
                letterSpacing: '1.4px',
                textTransform: 'uppercase',
                color: '#881337',
              }}
            >
              {title}
            </span>
          )}
          {!title && <span style={{ color: '#D4AF37', fontSize: '0.6rem' }}>{symbol}</span>}
        </div>

        {/* Right flowing leaf tendril */}
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, #F5C67B, rgba(245, 198, 123, 0.05))' }} />
      </div>
    </div>
  );
}

