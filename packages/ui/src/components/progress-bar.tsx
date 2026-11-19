import * as React from 'react';
import { cn } from '../utils/cn';

// Discretized width class mapping to avoid inline styles
const WIDTH_CLASSES: Record<number, string> = {
  0: 'w-0',
  5: 'w-[5%]',
  10: 'w-[10%]',
  15: 'w-[15%]',
  20: 'w-[20%]',
  25: 'w-[25%]',
  30: 'w-[30%]',
  35: 'w-[35%]',
  40: 'w-[40%]',
  45: 'w-[45%]',
  50: 'w-[50%]',
  55: 'w-[55%]',
  60: 'w-[60%]',
  65: 'w-[65%]',
  70: 'w-[70%]',
  75: 'w-[75%]',
  80: 'w-[80%]',
  85: 'w-[85%]',
  90: 'w-[90%]',
  95: 'w-[95%]',
  100: 'w-full',
};

function getDiscreteWidthClass(percent: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const nearest5 = Math.round(clamped / 5) * 5;
  return WIDTH_CLASSES[nearest5] || 'w-0';
}

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // current value
  max?: number;  // default 100
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  ariaLabel?: string;
}

export function ProgressBar({
  value,
  max = 100,
  variant = 'primary',
  size = 'md',
  ariaLabel = 'Progress',
  className,
  ...props
}: ProgressBarProps) {
  const percent = max > 0 ? (value / max) * 100 : 0;
  const widthClass = getDiscreteWidthClass(percent);

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3.5',
  };

  const variantClasses = {
    primary: 'bg-[var(--color-primary)]',
    success: 'bg-[var(--color-success)]',
    warning: 'bg-[var(--color-warning)]',
    danger: 'bg-[var(--color-danger)]',
  };

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={ariaLabel || (props['aria-label'] as string) || 'Progress'}
      className={cn(
        'w-full rounded-full bg-[var(--color-border)]/60 overflow-hidden',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <div
        className={cn(
          'h-full rounded-full transition-all duration-300',
          variantClasses[variant],
          widthClass
        )}
      />
    </div>
  );
}

export interface MeterRowProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  current: number;
  total: number;
  valueDisplay?: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
}

export function MeterRow({
  label,
  current,
  total,
  valueDisplay,
  variant = 'primary',
  className,
  ...props
}: MeterRowProps) {
  const display = valueDisplay || `${current} of ${total}`;

  return (
    <div className={cn('space-y-1.5', className)} {...props}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-[var(--color-text)]">{label}</span>
        <span className="font-mono text-[var(--color-text-muted)]">{display}</span>
      </div>
      <ProgressBar
        value={current}
        max={total}
        variant={variant}
        ariaLabel={label}
      />
    </div>
  );
}
