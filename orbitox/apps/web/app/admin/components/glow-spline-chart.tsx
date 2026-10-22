'use client';

import React, { useState } from 'react';

export interface SplineCallout {
  index: number;
  label: string;
  subLabel?: string;
}

export interface GlowSplineChartProps {
  data?: number[];
  labels?: string[];
  height?: number;
  variant?: 'indigo' | 'orange' | 'cyan';
  callouts?: SplineCallout[];
  showNodes?: boolean;
  showLabels?: boolean;
}

// Convert discrete points into a smooth cubic Bezier path
function createSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2 || !points[0]) return '';
  let d = `M ${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1] ?? points[i]!;
    const p3 = points[Math.min(i + 2, points.length - 1)] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  return d;
}

export function GlowSplineChart({
  data = [35, 58, 42, 78, 62, 92, 75, 110],
  labels = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  height = 140,
  variant = 'indigo',
  callouts = [
    { index: 3, label: '+3.2%' },
    { index: 5, label: '9.6%' },
  ],
  showNodes = true,
  showLabels = true,
}: GlowSplineChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const width = 600;
  const paddingX = 24;
  const paddingTop = 28;
  const paddingBottom = showLabels ? 28 : 12;
  const graphHeight = height - paddingTop - paddingBottom;

  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal || 1;

  const stepX = (width - paddingX * 2) / Math.max(data.length - 1, 1);

  const points = data.map((val, idx) => {
    const x = paddingX + idx * stepX;
    const y = paddingTop + (1 - (val - minVal) / range) * graphHeight;
    return { x, y, val };
  });

  const pathD = createSmoothPath(points);
  const firstPt = points[0];
  const lastPt = points[points.length - 1];
  const areaD = firstPt && lastPt
    ? `${pathD} L ${lastPt.x},${height - paddingBottom} L ${firstPt.x},${height - paddingBottom} Z`
    : '';

  // Color schemes
  const config = {
    indigo: {
      line: '#6366F1',
      glow: 'rgba(99, 102, 241, 0.55)',
      gradTop: 'rgba(99, 102, 241, 0.35)',
      gradBottom: 'rgba(99, 102, 241, 0.0)',
      nodeCenter: '#FFFFFF',
      calloutBg: '#4338CA',
      calloutBorder: '#818CF8',
    },
    orange: {
      line: '#FF7A1A',
      glow: 'rgba(255, 122, 26, 0.55)',
      gradTop: 'rgba(255, 122, 26, 0.35)',
      gradBottom: 'rgba(255, 122, 26, 0.0)',
      nodeCenter: '#FFFFFF',
      calloutBg: '#C2410C',
      calloutBorder: '#FB923C',
    },
    cyan: {
      line: '#38BDF8',
      glow: 'rgba(56, 189, 248, 0.55)',
      gradTop: 'rgba(56, 189, 248, 0.35)',
      gradBottom: 'rgba(56, 189, 248, 0.0)',
      nodeCenter: '#FFFFFF',
      calloutBg: '#0369A1',
      calloutBorder: '#7DD3FC',
    },
  }[variant];

  const uniqueId = React.useId().replace(/:/g, '');
  const gradientId = `splineGrad-${uniqueId}`;
  const filterId = `splineGlow-${uniqueId}`;

  return (
    <div style={{ width: '100%', position: 'relative', userSelect: 'none' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={config.gradTop} />
            <stop offset="100%" stopColor={config.gradBottom} />
          </linearGradient>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor={config.glow} />
          </filter>
        </defs>

        {/* Subtle Horizontal Dash Guides */}
        <line
          x1={paddingX}
          y1={paddingTop + graphHeight * 0.25}
          x2={width - paddingX}
          y2={paddingTop + graphHeight * 0.25}
          stroke="rgba(255, 255, 255, 0.04)"
          strokeDasharray="4 4"
        />
        <line
          x1={paddingX}
          y1={paddingTop + graphHeight * 0.75}
          x2={width - paddingX}
          y2={paddingTop + graphHeight * 0.75}
          stroke="rgba(255, 255, 255, 0.04)"
          strokeDasharray="4 4"
        />

        {/* Luminous Area Gradient Fill */}
        <path d={areaD} fill={`url(#${gradientId})`} />

        {/* Main Spline Curve with Neon Glow */}
        <path
          d={pathD}
          fill="none"
          stroke={config.line}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${filterId})`}
        />

        {/* Interactive / Highlight Nodes */}
        {points.map((pt, idx) => {
          const callout = callouts.find((c) => c.index === idx);
          const isHovered = hoverIndex === idx;

          return (
            <g
              key={idx}
              onMouseEnter={() => setHoverIndex(idx)}
              onMouseLeave={() => setHoverIndex(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Outer Halo */}
              {(showNodes || callout || isHovered) && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 9 : callout ? 7 : 5}
                  fill={config.glow}
                  opacity={isHovered ? 0.9 : 0.6}
                  style={{ transition: 'all 0.2s ease' }}
                />
              )}

              {/* Inner Node */}
              {(showNodes || callout || isHovered) && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 4.5 : 3}
                  fill={config.nodeCenter}
                  stroke={config.line}
                  strokeWidth="2"
                />
              )}

              {/* Callout Pill Tag */}
              {callout && (
                <g transform={`translate(${pt.x}, ${pt.y - 18})`}>
                  <rect
                    x="-24"
                    y="-18"
                    width="48"
                    height="18"
                    rx="9"
                    fill={config.calloutBg}
                    stroke={config.calloutBorder}
                    strokeWidth="1"
                    filter="drop-shadow(0 2px 6px rgba(0,0,0,0.5))"
                  />
                  <text
                    x="0"
                    y="-6"
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="9.5"
                    fontWeight="800"
                    fontFamily="monospace"
                  >
                    {callout.label}
                  </text>
                </g>
              )}

              {/* Hover Value Tooltip */}
              {isHovered && !callout && (
                <g transform={`translate(${pt.x}, ${pt.y - 18})`}>
                  <rect
                    x="-22"
                    y="-18"
                    width="44"
                    height="18"
                    rx="9"
                    fill="#1E293B"
                    stroke="#94A3B8"
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="-6"
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="9"
                    fontWeight="700"
                  >
                    {pt.val}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* X-Axis Labels */}
        {showLabels &&
          labels.map((lbl, idx) => {
            const x = paddingX + idx * stepX;
            return (
              <text
                key={idx}
                x={x}
                y={height - 6}
                textAnchor="middle"
                fill="rgba(255, 255, 255, 0.4)"
                fontSize="10"
                fontWeight="600"
                fontFamily="sans-serif"
              >
                {lbl}
              </text>
            );
          })}
      </svg>
    </div>
  );
}
