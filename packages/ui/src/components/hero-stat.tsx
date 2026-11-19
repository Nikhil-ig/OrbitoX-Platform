import * as React from 'react';
import { cn } from '../utils/cn';

export interface HeroStatProps extends React.HTMLAttributes<HTMLDivElement> {
  value: React.ReactNode;
  label: string;
  delta?: string | { value: string; trend?: 'up' | 'down' | 'neutral' };
  deltaType?: 'positive' | 'negative' | 'neutral';
  note?: string;
}

export function HeroStat({
  value,
  label,
  delta,
  deltaType = 'positive',
  note,
  className,
  ...props
}: HeroStatProps) {
  const deltaColorClasses = {
    positive: 'text-[var(--color-success)]',
    negative: 'text-[var(--color-danger)]',
    neutral: 'text-[var(--color-text-muted)]',
  };

  const deltaText = typeof delta === 'object' && delta !== null ? delta.value : delta;
  const effectiveType = typeof delta === 'object' && delta !== null
    ? (delta.trend === 'up' ? 'positive' : delta.trend === 'down' ? 'negative' : 'neutral')
    : deltaType;

  return (
    <div className={cn('flex flex-col', className)} {...props}>
      <div className="text-4xl md:text-5xl lg:text-6xl font-light tracking-[-0.04em] text-[var(--color-text)] leading-none select-all">
        {value}
      </div>
      <div className="text-sm font-medium text-[var(--color-text-muted)] mt-2">
        {label}
      </div>
      {(deltaText || note) && (
        <div className="text-xs mt-1 flex items-center gap-1.5 flex-wrap">
          {deltaText && (
            <span className={cn('font-medium', deltaColorClasses[effectiveType])}>
              {deltaText}
            </span>
          )}
          {deltaText && note && <span className="text-[var(--color-text-subtle)]" aria-hidden="true">•</span>}
          {note && (
            <span className="text-[var(--color-text-subtle)]">
              {note}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export interface StatStripProps extends React.HTMLAttributes<HTMLDivElement> {
  stats: HeroStatProps[];
}

export function StatStrip({ stats, className, ...props }: StatStripProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:p-8 grid grid-cols-2 lg:grid-cols-4 gap-6 divide-y lg:divide-y-0 lg:divide-x divide-[var(--color-border)] shadow-sm',
        className
      )}
      {...props}
    >
      {stats.map((stat, idx) => (
        <div key={idx} className={cn(idx > 0 ? 'lg:pl-6' : '', idx > 1 ? 'pt-4 lg:pt-0' : '')}>
          <HeroStat {...stat} />
        </div>
      ))}
    </div>
  );
}

