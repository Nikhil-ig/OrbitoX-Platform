'use client';

import React from 'react';

interface QuotaBarProps {
  used: number;
  limit: number;
  unit?: string;
  label?: string;
  showDetails?: boolean;
  height?: number;
}

export function QuotaBar({
  used,
  limit,
  unit = '',
  label,
  showDetails = true,
  height = 8,
}: QuotaBarProps) {
  const percentage = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  // Determine color based on consumption threshold
  let fillColor = 'linear-gradient(90deg, #10B981, #38BDF8)';
  let glowColor = 'rgba(56, 189, 248, 0.4)';

  if (percentage >= 90) {
    fillColor = 'linear-gradient(90deg, #F59E0B, #EF4444)';
    glowColor = 'rgba(239, 68, 68, 0.5)';
  } else if (percentage >= 70) {
    fillColor = 'linear-gradient(90deg, #38BDF8, #F59E0B)';
    glowColor = 'rgba(245, 158, 11, 0.4)';
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toLocaleString();
  };

  return (
    <div style={{ width: '100%' }}>
      {showDetails && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px',
            fontSize: '12px',
          }}
        >
          {label && <span style={{ color: 'var(--ui-text-secondary, #94A3B8)', fontWeight: 500 }}>{label}</span>}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#FFFFFF', fontWeight: 700 }}>
              {formatNumber(used)} {unit}
            </span>
            <span style={{ color: 'var(--ui-text-muted, #64748B)' }}>/</span>
            <span style={{ color: 'var(--ui-text-muted, #64748B)' }}>
              {formatNumber(limit)} {unit}
            </span>
            <span
              style={{
                marginLeft: '6px',
                fontSize: '11px',
                fontWeight: 700,
                color: percentage >= 90 ? '#EF4444' : percentage >= 70 ? '#F59E0B' : '#10B981',
                background: percentage >= 90 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                padding: '1px 6px',
                borderRadius: '6px',
              }}
            >
              {percentage}%
            </span>
          </div>
        </div>
      )}

      <div
        style={{
          width: '100%',
          height: `${height}px`,
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: `${height}px`,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            background: fillColor,
            borderRadius: `${height}px`,
            boxShadow: `0 0 10px ${glowColor}`,
            transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>
    </div>
  );
}
