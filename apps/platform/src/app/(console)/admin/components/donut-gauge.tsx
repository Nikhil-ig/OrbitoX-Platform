'use client';

import React from 'react';

export interface DonutSegment {
  label: string;
  value: number; // percentage (0 to 100)
  color: string;
}

export interface DonutGaugeProps {
  title?: string;
  totalValue?: string;
  subLabel?: string;
  segments?: DonutSegment[];
  size?: number;
  layout?: 'side-by-side' | 'stacked';
}

const DEFAULT_SEGMENTS: DonutSegment[] = [
  { label: 'Hospitals', value: 75, color: '#5865F2' },
  { label: 'Commerce', value: 45, color: '#FF7A1A' },
  { label: 'Restaurants', value: 30, color: '#10B981' },
];

export function DonutGauge({
  title = 'Market Comparison',
  totalValue = '$35,903',
  subLabel = 'Total Value',
  segments = DEFAULT_SEGMENTS,
  size = 130,
  layout = 'side-by-side',
}: DonutGaugeProps) {
  const strokeWidth = 8;
  const baseRadius = size / 2 - strokeWidth - 4;

  return (
    <div style={{ width: '100%', userSelect: 'none' }}>
      {/* Title & Legend Dots */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px' }}>
          {segments.map((seg, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '2px',
                  background: seg.color,
                  boxShadow: `0 0 6px ${seg.color}`,
                }}
              />
              <span style={{ color: '#94A3B8', fontWeight: 600 }}>{seg.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Gauge Graphic + KPIs */}
      <div
        style={{
          display: 'flex',
          flexDirection: layout === 'stacked' ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          gap: '20px',
        }}
      >
        {/* SVG Concentric Arcs */}
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {segments.map((seg, idx) => {
              const ringRadius = baseRadius - idx * (strokeWidth + 4);
              if (ringRadius <= 4) return null;

              const circumference = 2 * Math.PI * ringRadius;
              const strokeDashoffset = circumference - (seg.value / 100) * circumference;

              return (
                <g key={idx} transform={`rotate(-90 ${size / 2} ${size / 2})`}>
                  {/* Background Track */}
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={ringRadius}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeWidth={strokeWidth}
                  />
                  {/* Foreground Animated Ring */}
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={ringRadius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{
                      transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                      filter: `drop-shadow(0 0 6px ${seg.color})`,
                    }}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Center / Side Metric Text */}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: '120px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              color: '#94A3B8',
            }}
          >
            {subLabel}
          </span>
          <span
            style={{
              fontSize: '30px',
              fontWeight: 900,
              color: '#FFFFFF',
              letterSpacing: '-0.8px',
              margin: '4px 0 0 0',
            }}
          >
            {totalValue}
          </span>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#10B981',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <span>↑ 24.8%</span>
              <span style={{ color: '#64748B' }}>this month</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
