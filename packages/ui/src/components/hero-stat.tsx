import * as React from 'react';
import { cn } from '../utils/cn';

export interface HeroStatProps extends React.HTMLAttributes<HTMLDivElement> {
  value: React.ReactNode;
  label: string;
  delta?: string | { value: string; trend?: 'up' | 'down' | 'neutral' };
  deltaType?: 'positive' | 'negative' | 'neutral';
  note?: string;
  compact?: boolean;
}

export function HeroStat({
  value,
  label,
  delta,
  deltaType = 'positive',
  note,
  compact = false,
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
    <div className={cn('flex flex-col min-w-0', className)} {...props}>
      <div
        className={cn(
          'font-light tracking-[-0.03em] text-[var(--color-text)] leading-none select-all tabular-nums',
          compact
            ? 'text-2xl sm:text-3xl font-semibold whitespace-nowrap overflow-hidden text-ellipsis'
            : 'text-4xl md:text-5xl'
        )}
      >
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
        'rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:p-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 divide-y sm:divide-y-0 lg:divide-x divide-[var(--color-border)] shadow-sm',
        className
      )}
      {...props}
    >
      {stats.map((stat, idx) => (
        <div key={idx} className={cn('min-w-0', idx > 0 ? 'pt-4 sm:pt-0 lg:pl-5' : '')}>
          <HeroStat compact {...stat} />
        </div>
      ))}
    </div>
  );
}

