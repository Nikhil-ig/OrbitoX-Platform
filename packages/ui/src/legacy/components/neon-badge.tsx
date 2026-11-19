'use client';

import React from 'react';

export interface NeonBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'gold' | 'emerald' | 'cyan' | 'ruby' | 'muted';
  size?: 'sm' | 'md';
  pulse?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function NeonBadge({
  variant = 'primary',
  size = 'md',
  pulse = false,
  icon,
  children,
  style,
  className = '',
  ...props
}: NeonBadgeProps) {
  const variantStyles = {
    primary: {
      bg: 'rgba(168, 85, 247, 0.15)',
      border: 'rgba(168, 85, 247, 0.4)',
      text: '#C084FC',
      dot: '#A855F7',
      glow: 'rgba(168, 85, 247, 0.4)',
    },
    gold: {
      bg: 'rgba(229, 169, 60, 0.15)',
      border: 'rgba(229, 169, 60, 0.45)',
      text: '#FCD34D',
      dot: '#E5A93C',
      glow: 'rgba(229, 169, 60, 0.45)',
    },
    emerald: {
      bg: 'rgba(16, 185, 129, 0.15)',
      border: 'rgba(16, 185, 129, 0.4)',
      text: '#6EE7B7',
      dot: '#10B981',
      glow: 'rgba(16, 185, 129, 0.4)',
    },
    cyan: {
      bg: 'rgba(56, 189, 248, 0.15)',
      border: 'rgba(56, 189, 248, 0.4)',
      text: '#7DD3FC',
      dot: '#38BDF8',
      glow: 'rgba(56, 189, 248, 0.4)',
    },
    ruby: {
      bg: 'rgba(239, 68, 68, 0.15)',
      border: 'rgba(239, 68, 68, 0.4)',
      text: '#FCA5A5',
      dot: '#EF4444',
      glow: 'rgba(239, 68, 68, 0.4)',
    },
    muted: {
      bg: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(255, 255, 255, 0.1)',
      text: '#94A3B8',
      dot: '#64748B',
      glow: 'transparent',
    },
  };

  const v = variantStyles[variant];

  return (
    <span
      className={`orbitox-neon-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size === 'sm' ? '4px' : '6px',
        padding: size === 'sm' ? '2px 8px' : '4px 10px',
        borderRadius: '9999px',
        background: v.bg,
        border: `1px solid ${v.border}`,
        color: v.text,
        fontSize: size === 'sm' ? '10px' : '11px',
        fontWeight: 800,
        letterSpacing: '0.02em',
        boxShadow: v.glow !== 'transparent' ? `0 0 10px ${v.glow}` : 'none',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        ...style,
      }}
      {...props}
    >
      {pulse && (
        <span
          style={{
            position: 'relative',
            display: 'flex',
            width: '6px',
            height: '6px',
          }}
        >
          <span
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: v.dot,
              animation: 'radarPing 1.8s cubic-bezier(0, 0, 0.2, 1) infinite',
              opacity: 0.75,
            }}
          />
          <span
            style={{
              position: 'relative',
              borderRadius: '50%',
              width: '6px',
              height: '6px',
              background: v.dot,
            }}
          />
        </span>
      )}
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
