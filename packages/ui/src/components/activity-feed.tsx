import * as React from 'react';
import { cn } from '../utils/cn';

export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  tag?: string;
  tagVariant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  time: string;
  href?: string;
}

export interface ActivityFeedProps extends React.HTMLAttributes<HTMLUListElement> {
  items: ActivityItem[];
  emptyText?: string;
}

export function ActivityFeed({
  items,
  emptyText,
  className,
  ...props
}: ActivityFeedProps) {
  const tagVariantClasses = {
    default: 'border-[var(--color-border)] text-[var(--color-text-muted)]',
    success: 'border-[var(--color-success)]/40 text-[var(--color-success)]',
    warning: 'border-[var(--color-warning)]/40 text-[var(--color-warning)]',
    danger: 'border-[var(--color-danger)]/40 text-[var(--color-danger)]',
    info: 'border-[var(--color-info)]/40 text-[var(--color-info)]',
  };

  if (items.length === 0 && emptyText) {
    return (
      <div className="py-6 text-center text-xs text-[var(--color-text-muted)]">
        {emptyText}
      </div>
    );
  }

  return (
    <ul className={cn('space-y-3.5 list-none m-0 p-0', className)} {...props}>
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-3 text-xs m-0 p-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)] shrink-0" aria-hidden="true" />
            <div className="truncate">
              <span className="font-semibold text-[var(--color-text)] mr-1">{item.actor}</span>
              {item.href ? (
                <a
                  href={item.href}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:underline transition-colors"
                >
                  {item.action}
                </a>
              ) : (
                <span className="text-[var(--color-text-muted)]">{item.action}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {item.tag && (
              <span
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-none select-none',
                  tagVariantClasses[item.tagVariant || 'default']
                )}
              >
                {item.tag}
              </span>
            )}
            <span className="text-[11px] font-mono text-[var(--color-text-subtle)] shrink-0">
              {item.time}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

