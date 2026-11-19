'use client';

import React from 'react';

export interface StudioButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'luxury-gold' | 'neon-volt' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  isLoading?: boolean;
  children: React.ReactNode;
}

export function StudioButton({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  isLoading = false,
  children,
  style,
  disabled,
  className = '',
  ...props
}: StudioButtonProps) {
  const sizeStyles = {
    sm: { padding: '5px 12px', fontSize: '11px', borderRadius: '8px' },
    md: { padding: '8px 18px', fontSize: '12px', borderRadius: '10px' },
    lg: { padding: '12px 24px', fontSize: '14px', borderRadius: '12px' },
  };

  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          background: 'var(--ui-accent-gradient, linear-gradient(135deg, #A855F7, #6366F1))',
          color: '#FFFFFF',
          border: 'none',
          boxShadow: '0 4px 18px var(--ui-accent-glow, rgba(168, 85, 247, 0.4))',
        };
      case 'luxury-gold':
        return {
          background: 'linear-gradient(135deg, #E5A93C 0%, #F59E0B 100%)',
          color: '#000000',
          border: 'none',
          boxShadow: '0 4px 18px rgba(229, 169, 60, 0.45)',
        };
      case 'neon-volt':
        return {
          background: '#CCFF00',
          color: '#000000',
          border: 'none',
          boxShadow: '0 4px 18px rgba(204, 255, 0, 0.4)',
        };
      case 'secondary':
        return {
          background: 'rgba(255, 255, 255, 0.06)',
          color: '#FFFFFF',
          border: '1px solid var(--ui-border-default, rgba(255, 255, 255, 0.1))',
          boxShadow: 'none',
        };
      case 'outline':
        return {
          background: 'transparent',
          color: 'var(--ui-accent-primary, #A855F7)',
          border: '1px solid var(--ui-accent-primary, #A855F7)',
          boxShadow: 'none',
        };
      case 'danger':
        return {
          background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
          color: '#FFFFFF',
          border: 'none',
          boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
        };
      case 'ghost':
      default:
        return {
          background: 'transparent',
          color: 'var(--ui-text-secondary, #94A3B8)',
          border: '1px solid transparent',
          boxShadow: 'none',
        };
    }
  };

  const s = sizeStyles[size];

  return (
    <button
      className={`orbitox-studio-btn ${className}`}
      disabled={disabled || isLoading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        fontWeight: 800,
        letterSpacing: '0.01em',
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        opacity: disabled || isLoading ? 0.6 : 1,
        transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
        userSelect: 'none',
        outline: 'none',
        ...s,
        ...getVariantStyles(),
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isLoading) {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = 'translateY(-1px)';
          if (variant === 'ghost') {
            el.style.background = 'rgba(255, 255, 255, 0.06)';
            el.style.color = '#FFF';
          }
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !isLoading) {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = 'none';
          if (variant === 'ghost') {
            el.style.background = 'transparent';
            el.style.color = 'var(--ui-text-secondary, #94A3B8)';
          }
        }
      }}
      {...props}
    >
      {isLoading ? (
        <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
      ) : (
        <>
          {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
          <span>{children}</span>
          {iconRight && <span style={{ display: 'flex', alignItems: 'center' }}>{iconRight}</span>}
        </>
      )}
    </button>
  );
}
