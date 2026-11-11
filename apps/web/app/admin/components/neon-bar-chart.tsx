'use client';

import React, { useState } from 'react';

export interface NeonBarItem {
  label: string;
  valueA: number; // Blue/Indigo
  valueB: number; // Cyber Orange
}

export interface NeonBarChartProps {
  title?: string;
  legendA?: string;
  legendB?: string;
  data?: NeonBarItem[];
  height?: number;
}

const DEFAULT_DATA: NeonBarItem[] = [
  { label: 'Jan', valueA: 45, valueB: 70 },
  { label: 'Feb', valueA: 62, valueB: 85 },
  { label: 'Mar', valueA: 38, valueB: 92 },
  { label: 'Apr', valueA: 80, valueB: 110 },
  { label: 'May', valueA: 55, valueB: 68 },
  { label: 'Jun', valueA: 95, valueB: 88 },
  { label: 'Jul', valueA: 72, valueB: 105 },
  { label: 'Aug', valueA: 110, valueB: 82 },
];

export function NeonBarChart({
  title = 'Platform Telemetry Equalizer',
  legendA = 'Compute (CPU)',
  legendB = 'Throughput (Reqs)',
  data = DEFAULT_DATA,
  height = 160,
}: NeonBarChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.valueA, d.valueB)),
    100
  );

  const width = 520;
  const paddingX = 20;
  const paddingTop = 16;
  const paddingBottom = 26;
  const graphHeight = height - paddingTop - paddingBottom;

  const barWidth = 9;
  const groupSpacing = (width - paddingX * 2) / data.length;

  return (
    <div style={{ width: '100%', userSelect: 'none' }}>
      {/* Chart Top Header & Legend */}
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
        <span style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.2px' }}>
          {title}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px', fontWeight: 600 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '3px',
                background: '#5865F2',
                boxShadow: '0 0 8px rgba(88, 101, 242, 0.6)',
              }}
            />
            <span style={{ color: '#94A3B8' }}>{legendA}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '3px',
                background: '#FF7A1A',
                boxShadow: '0 0 8px rgba(255, 122, 26, 0.6)',
              }}
            />
            <span style={{ color: '#94A3B8' }}>{legendB}</span>
          </div>
        </div>
      </div>

      {/* Responsive SVG Graphic */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
      >
        {/* Subtle Horizontal Dash Line Grid */}
        {[0.2, 0.5, 0.8].map((ratio, i) => (
          <line
            key={i}
            x1={paddingX}
            y1={paddingTop + graphHeight * ratio}
            x2={width - paddingX}
            y2={paddingTop + graphHeight * ratio}
            stroke="rgba(255, 255, 255, 0.04)"
            strokeDasharray="3 3"
          />
        ))}

        {data.map((item, idx) => {
          const centerX = paddingX + idx * groupSpacing + groupSpacing / 2;
          const hA = Math.max((item.valueA / maxVal) * graphHeight, 8);
          const hB = Math.max((item.valueB / maxVal) * graphHeight, 8);

          const yA = paddingTop + graphHeight - hA;
          const yB = paddingTop + graphHeight - hB;

          const isHovered = hoverIdx === idx;

          return (
            <g
              key={idx}
              onMouseEnter={() => setHoverIdx(idx)}
              onMouseLeave={() => setHoverIdx(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Subtle hover background column */}
              {isHovered && (
                <rect
                  x={centerX - groupSpacing * 0.45}
                  y={paddingTop}
                  width={groupSpacing * 0.9}
                  height={graphHeight}
                  rx="6"
                  fill="rgba(255, 255, 255, 0.03)"
                />
              )}

              {/* Bar A: Electric Blue/Indigo Pill */}
              <rect
                x={centerX - barWidth - 2}
                y={yA}
                width={barWidth}
                height={hA}
                rx={barWidth / 2}
                fill="#5865F2"
                style={{
                  transition: 'height 0.3s ease, y 0.3s ease',
                  filter: isHovered ? 'drop-shadow(0 0 10px rgba(88, 101, 242, 0.8))' : 'none',
                }}
              />

              {/* Bar B: Cyber Orange Pill */}
              <rect
                x={centerX + 2}
                y={yB}
                width={barWidth}
                height={hB}
                rx={barWidth / 2}
                fill="#FF7A1A"
                style={{
                  transition: 'height 0.3s ease, y 0.3s ease',
                  filter: isHovered ? 'drop-shadow(0 0 10px rgba(255, 122, 26, 0.8))' : 'none',
                }}
              />

              {/* Month / Category Label */}
              <text
                x={centerX}
                y={height - 8}
                textAnchor="middle"
                fill={isHovered ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)'}
                fontSize="10"
                fontWeight="700"
                fontFamily="sans-serif"
              >
                {item.label}
              </text>

              {/* Floating Tooltip */}
              {isHovered && (
                <g transform={`translate(${centerX}, ${Math.min(yA, yB) - 14})`}>
                  <rect
                    x="-32"
                    y="-20"
                    width="64"
                    height="20"
                    rx="10"
                    fill="#1E293B"
                    stroke="#475569"
                    strokeWidth="1"
                    filter="drop-shadow(0 4px 10px rgba(0,0,0,0.5))"
                  />
                  <text
                    x="0"
                    y="-6"
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="9.5"
                    fontWeight="800"
                  >
                    {item.valueA} | {item.valueB}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
