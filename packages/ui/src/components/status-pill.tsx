import * as React from 'react';
import { cn } from '../utils/cn';

export type DomainStatus =
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'GRACE'
  | 'RESTRICTED'
  | 'PENDING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ARCHIVED'
  | 'REVOKED'
  | 'PAID'
  | 'UNPAID'
  | string;

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: DomainStatus;
  label?: string;
  size?: 'sm' | 'md';
}

export function StatusPill({ status, label, size = 'sm', className, ...props }: StatusPillProps) {
  const normalized = (status || '').toUpperCase();

  // Status mapping to semantic token styles
  let colorClasses = 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)]';
  let dotColor = 'bg-[var(--color-text-muted)]';

  switch (normalized) {
    case 'ACTIVE':
    case 'COMPLETED':
    case 'PAID':
      colorClasses = 'bg-[var(--color-success-subtle)] text-[var(--color-success)] border-[var(--color-success)]/30';
      dotColor = 'bg-[var(--color-success)]';
      break;

    case 'SUSPENDED':
    case 'REVOKED':
    case 'UNPAID':
    case 'FAILED':
      colorClasses = 'bg-[var(--color-danger-subtle)] text-[var(--color-danger)] border-[var(--color-danger)]/30';
      dotColor = 'bg-[var(--color-danger)]';
      break;

    case 'GRACE':
    case 'RESTRICTED':
    case 'WARNING':
      colorClasses = 'bg-[var(--color-warning-subtle)] text-[var(--color-warning)] border-[var(--color-warning)]/30';
      dotColor = 'bg-[var(--color-warning)]';
      break;

    case 'PENDING':
    case 'PROCESSING':
    case 'INFO':
      colorClasses = 'bg-[var(--color-info-subtle)] text-[var(--color-info)] border-[var(--color-info)]/30';
      dotColor = 'bg-[var(--color-info)]';
      break;

    case 'CANCELLED':
    case 'ARCHIVED':
    default:
      colorClasses = 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)]';
      dotColor = 'bg-[var(--color-text-subtle)]';
      break;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-sm px-2.5 py-1 gap-2',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border select-none',
        colorClasses,
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotColor)} aria-hidden="true" />
      {label || normalized}
    </span>
  );
}

