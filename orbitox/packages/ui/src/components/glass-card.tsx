'use client';

import React from 'react';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glow' | 'accent-border' | 'subtle';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
  children: React.ReactNode;
}

export function GlassCard({
  variant = 'default',
  padding = 'md',
  interactive = false,
  children,
  style,
  className = '',
  ...props
}: GlassCardProps) {
  const paddingMap = {
    none: '0px',
    sm: '12px',
    md: '18px 20px',
    lg: '24px 28px',
  };

  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'elevated':
        return {
          background: 'var(--ui-bg-elevated, rgba(24, 28, 46, 0.85))',
          border: '1px solid var(--ui-border-default, rgba(255, 255, 255, 0.1))',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.65)',
        };
      case 'glow':
        return {
          background: 'var(--ui-bg-card, rgba(20, 24, 38, 0.75))',
          border: '1px solid var(--ui-border-glow, rgba(168, 85, 247, 0.35))',
          boxShadow: '0 0 30px var(--ui-accent-glow, rgba(168, 85, 247, 0.25)), 0 10px 30px rgba(0,0,0,0.7)',
        };
      case 'accent-border':
        return {
          background: 'var(--ui-bg-card, rgba(20, 24, 38, 0.75))',
          border: '1px solid var(--ui-accent-primary, #A855F7)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
        };
      case 'subtle':
        return {
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--ui-border-subtle, rgba(255, 255, 255, 0.06))',
          boxShadow: 'none',
        };
      case 'default':
      default:
        return {
          background: 'var(--ui-bg-card, rgba(20, 24, 38, 0.75))',
          border: '1px solid var(--ui-border-default, rgba(255, 255, 255, 0.1))',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
        };
    }
  };

  return (
    <div
      className={`orbitox-glass-card ${className}`}
      style={{
        borderRadius: 'var(--ui-radius-lg, 16px)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: paddingMap[padding],
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: interactive ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        ...getVariantStyles(),
        ...style,
      }}
      onMouseEnter={(e) => {
        if (interactive) {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = 'translateY(-3px)';
          el.style.borderColor = 'var(--ui-border-bright, rgba(255, 255, 255, 0.25))';
          el.style.boxShadow = '0 16px 40px rgba(0, 0, 0, 0.75), 0 0 20px var(--ui-accent-glow, rgba(168, 85, 247, 0.2))';
        }
      }}
      onMouseLeave={(e) => {
        if (interactive) {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = 'none';
          const original = getVariantStyles();
          el.style.borderColor = (original.border as string)?.split(' ')[2] || 'var(--ui-border-default)';
          el.style.boxShadow = (original.boxShadow as string) || 'none';
        }
      }}
      {...props}
    >
      {children}
    </div>
  );
}
