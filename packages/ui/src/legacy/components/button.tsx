import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    borderRadius: 'var(--radius-sm, 6px)',
    border: 'none',
    cursor: 'pointer',
    transition: 'var(--transition-fast, all 0.2s ease)',
    outline: 'none',
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: 'var(--accent-primary, #6366f1)',
      color: '#ffffff',
      boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
    },
    secondary: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      color: 'var(--text-primary, #ffffff)',
      border: '1px solid var(--border-glass, rgba(255,255,255,0.1))',
    },
    outline: {
      backgroundColor: 'transparent',
      color: 'var(--accent-primary, #6366f1)',
      border: '1px solid var(--accent-primary, #6366f1)',
    },
    danger: {
      backgroundColor: 'var(--danger, #ef4444)',
      color: '#ffffff',
    },
  };

  const sizes: Record<string, React.CSSProperties> = {
    sm: { padding: '6px 12px', fontSize: '13px' },
    md: { padding: '10px 18px', fontSize: '14px' },
    lg: { padding: '14px 24px', fontSize: '16px' },
  };

  return (
    <button
      style={{ ...baseStyle, ...variants[variant], ...sizes[size] }}
      className={`glow-effect ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
