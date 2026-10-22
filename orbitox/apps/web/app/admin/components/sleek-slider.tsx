'use client';

import React from 'react';

export interface SleekSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  prefix?: string;
  variant?: 'indigo' | 'orange' | 'cyan';
  onChange: (val: number) => void;
}

export function SleekSlider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  prefix = '',
  variant = 'indigo',
  onChange,
}: SleekSliderProps) {
  const percentage = Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);

  const colors = {
    indigo: {
      gradient: 'linear-gradient(90deg, #4338CA 0%, #6366F1 100%)',
      glow: 'rgba(99, 102, 241, 0.5)',
      text: '#818CF8',
    },
    orange: {
      gradient: 'linear-gradient(90deg, #EA580C 0%, #FF7A1A 100%)',
      glow: 'rgba(255, 122, 26, 0.5)',
      text: '#FB923C',
    },
    cyan: {
      gradient: 'linear-gradient(90deg, #0284C7 0%, #38BDF8 100%)',
      glow: 'rgba(56, 189, 248, 0.5)',
      text: '#38BDF8',
    },
  }[variant];

  return (
    <div style={{ width: '100%', userSelect: 'none' }}>
      {/* Label and Value readout row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '10px',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#E2E8F0' }}>{label}</span>
        <span
          style={{
            fontSize: '18px',
            fontWeight: 900,
            color: '#FFFFFF',
            letterSpacing: '-0.3px',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {prefix}
          {value.toLocaleString()}
          {unit}
        </span>
      </div>

      {/* Track and Knob */}
      <div style={{ position: 'relative', height: '24px', display: 'flex', alignItems: 'center' }}>
        {/* Background Track */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: '8px',
            borderRadius: '4px',
            background: 'rgba(255, 255, 255, 0.08)',
          }}
        />

        {/* Illuminated Active Track */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            width: `${percentage}%`,
            height: '8px',
            borderRadius: '4px',
            background: colors.gradient,
            boxShadow: `0 0 12px ${colors.glow}`,
          }}
        />

        {/* Native HTML range input on top with full opacity opacity 0 for perfect accessibility */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
            zIndex: 10,
            margin: 0,
          }}
        />

        {/* Visual Knurled Thumb Knob (Inspired by Image 1) */}
        <div
          style={{
            position: 'absolute',
            left: `calc(${percentage}% - 10px)`,
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: '#FFFFFF',
            boxShadow: `0 2px 8px rgba(0, 0, 0, 0.6), 0 0 10px ${colors.glow}`,
            pointerEvents: 'none',
            zIndex: 5,
            transition: 'transform 0.1s ease',
          }}
        />
      </div>

      {/* Min / Max bounds indicator */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          fontWeight: 700,
          color: '#64748B',
          marginTop: '6px',
        }}
      >
        <span>
          {prefix}
          {min.toLocaleString()}
          {unit}
        </span>
        <span>
          {prefix}
          {max.toLocaleString()}
          {unit}
        </span>
      </div>
    </div>
  );
}
