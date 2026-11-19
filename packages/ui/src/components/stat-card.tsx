import * as React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../utils/cn';

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  change?: {
    value: string | number;
    trend?: 'up' | 'down' | 'neutral';
    label?: string;
  };
  sparkline?: React.ReactNode;
  icon?: React.ReactNode;
}

export function StatCard({
  label,
  value,
  change,
  sparkline,
  icon,
  className,
  ...props
}: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-[var(--color-text)] shadow-xs flex flex-col justify-between',
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--color-text-muted)] tracking-wide">{label}</span>
        {icon && <div className="text-[var(--color-text-subtle)] shrink-0">{icon}</div>}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="text-2xl font-bold tracking-tight text-[var(--color-text)]">{value}</span>

        {change && (
          <div
            className={cn(
              'inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded',
              change.trend === 'up' && 'bg-[var(--color-success-subtle)] text-[var(--color-success)]',
              change.trend === 'down' && 'bg-[var(--color-danger-subtle)] text-[var(--color-danger)]',
              (!change.trend || change.trend === 'neutral') && 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]'
            )}
          >
            {change.trend === 'up' && <TrendingUp className="h-3 w-3" />}
            {change.trend === 'down' && <TrendingDown className="h-3 w-3" />}
            {(!change.trend || change.trend === 'neutral') && <Minus className="h-3 w-3" />}
            <span>{change.value}</span>
          </div>
        )}
      </div>

      {(change?.label || sparkline) && (
        <div className="mt-4 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
          {change?.label && <span>{change.label}</span>}
          {sparkline && <div className="ml-auto h-8 w-24 shrink-0">{sparkline}</div>}
        </div>
      )}
    </div>
  );
}

