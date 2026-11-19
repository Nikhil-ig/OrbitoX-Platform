import * as React from 'react';
import { cn } from '../utils/cn';

export type OperationalStatus =
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'ONLINE'
  | 'OFFLINE'
  | 'STALE'
  | 'NEVER_CONNECTED'
  | 'PROVISIONING'
  | 'IN_PROGRESS'
  | 'RETRYING'
  | 'READY'
  | 'COMMITTED'
  | 'PENDING'
  | 'FAILED'
  | 'REVOKED'
  | 'EXPIRED'
  | 'DEGRADED'
  | 'TRIAL'
  | 'ARCHIVED'
  | string;

export interface OperationalStatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: OperationalStatus;
  label?: string;
  showDot?: boolean;
  size?: 'sm' | 'md';
}

type StatusTone = 'success' | 'warning' | 'destructive' | 'info' | 'neutral';

function getStatusTone(status: string): StatusTone {
  const normalized = status.toUpperCase().trim();
  switch (normalized) {
    case 'ACTIVE':
    case 'ONLINE':
    case 'COMMITTED':
    case 'READY':
    case 'SUCCEEDED':
    case 'LIVE':
      return 'success';
    case 'DEGRADED':
    case 'STALE':
    case 'WARNING':
    case 'PENDING':
    case 'RETRYING':
    case 'TRIAL':
    case 'IN_PROGRESS':
    case 'HOLD':
      return 'warning';
    case 'SUSPENDED':
    case 'OFFLINE':
    case 'FAILED':
    case 'REVOKED':
    case 'ERROR':
    case 'BLOCKED':
    case 'PURGED':
      return 'destructive';
    case 'PROVISIONING':
    case 'INITIALIZING':
    case 'CONNECTING':
      return 'info';
    default:
      return 'neutral';
  }
}

function getToneStyles(tone: StatusTone) {
  switch (tone) {
    case 'success':
      return {
        badge: 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20',
        dot: 'bg-[var(--color-success)]',
      };
    case 'warning':
      return {
        badge: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/20',
        dot: 'bg-[var(--color-warning)]',
      };
    case 'destructive':
      return {
        badge: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20',
        dot: 'bg-[var(--color-danger)]',
      };
    case 'info':
      return {
        badge: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20',
        dot: 'bg-[var(--color-primary)]',
      };
    case 'neutral':
    default:
      return {
        badge: 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] border-[var(--color-border)]',
        dot: 'bg-[var(--color-text-muted)]',
      };
  }
}

export function OperationalStatusBadge({
  status,
  label,
  showDot = true,
  size = 'md',
  className,
  ...props
}: OperationalStatusBadgeProps) {
  const tone = getStatusTone(status);
  const styles = getToneStyles(tone);
  const displayLabel = label || status.replace(/_/g, ' ');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full border transition-colors',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        styles.badge,
        className
      )}
      data-status={status}
      data-tone={tone}
      {...props}
    >
      {showDot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full shrink-0', styles.dot)}
          aria-hidden="true"
        />
      )}
      <span className="truncate uppercase tracking-wider font-mono text-[11px]">
        {displayLabel}
      </span>
    </span>
  );
}
