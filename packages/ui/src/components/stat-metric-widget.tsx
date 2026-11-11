'use client';

import React from 'react';
import { GlassCard } from './glass-card';

export interface StatMetricWidgetProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  subtext?: string;
  accentTone?: string;
  onClick?: () => void;
}

export function StatMetricWidget({
  label,
  value,
  delta,
  deltaType = 'positive',
  icon,
  subtext,
  accentTone = 'var(--ui-accent-primary, #A855F7)',
  onClick,
}: StatMetricWidgetProps) {
  return (
    <GlassCard
      interactive={!!onClick}
      onClick={onClick}
      padding="md"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ui-text-secondary, #94A3B8)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
        {icon && (
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: `color-mix(in srgb, ${accentTone} 15%, transparent)`,
              border: `1px solid color-mix(in srgb, ${accentTone} 30%, transparent)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: accentTone,
            }}
          >
            {icon}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
        <span style={{ fontSize: '24px', fontWeight: 900, color: 'var(--ui-text-primary, #FFFFFF)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          {value}
        </span>
        {delta && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: '9999px',
              background:
                deltaType === 'positive'
                  ? 'rgba(16, 185, 129, 0.15)'
                  : deltaType === 'negative'
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'rgba(255, 255, 255, 0.08)',
              color:
                deltaType === 'positive'
                  ? '#34D399'
                  : deltaType === 'negative'
                  ? '#F87171'
                  : '#94A3B8',
              border:
                deltaType === 'positive'
                  ? '1px solid rgba(16, 185, 129, 0.3)'
                  : deltaType === 'negative'
                  ? '1px solid rgba(239, 68, 68, 0.3)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {delta}
          </span>
        )}
      </div>

      {subtext && (
        <span style={{ fontSize: '11px', color: 'var(--ui-text-muted, #64748B)', lineHeight: 1.3 }}>
          {subtext}
        </span>
      )}
    </GlassCard>
  );
}
