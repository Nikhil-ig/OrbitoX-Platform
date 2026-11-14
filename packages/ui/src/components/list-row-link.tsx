import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';

export interface ListRowLinkProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  statusDot?: 'green' | 'blue' | 'coral' | 'amber' | 'muted';
  highlighted?: boolean;
  action?: React.ReactNode;
  href?: string;
  onClick?: () => void;
}

export function ListRowLink({
  title,
  subtitle,
  statusDot = 'muted',
  highlighted = false,
  action,
  href,
  onClick,
  className,
  ...props
}: ListRowLinkProps) {
  const dotColorClasses = {
    green: 'bg-[var(--color-success)]',
    blue: 'bg-[var(--color-primary)]',
    coral: 'bg-[var(--color-danger)]',
    amber: 'bg-[var(--color-warning)]',
    muted: 'bg-[var(--color-text-subtle)]',
  };

  const content = (
    <>
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={cn(
            'h-2 w-2 rounded-full shrink-0',
            highlighted ? 'bg-[var(--color-primary-fg)]' : dotColorClasses[statusDot]
          )}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <div
            className={cn(
              'text-sm font-semibold truncate',
              highlighted ? 'text-[var(--color-primary-fg)]' : 'text-[var(--color-text)]'
            )}
          >
            {title}
          </div>
          {subtitle && (
            <div
              className={cn(
                'text-xs truncate mt-0.5',
                highlighted ? 'text-[var(--color-primary-fg)] font-medium' : 'text-[var(--color-text-muted)]'
              )}
            >
              {subtitle}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-3">
        {action}
        <ChevronRight
          className={cn(
            'h-4 w-4 shrink-0',
            highlighted ? 'text-[var(--color-primary-fg)]' : 'text-[var(--color-text-subtle)]'
          )}
          aria-hidden="true"
        />
      </div>
    </>
  );

  const baseClasses = cn(
    'flex items-center justify-between p-3.5 rounded-[var(--radius-row)] transition-all duration-200 select-none cursor-pointer',
    highlighted
      ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-[var(--shadow-accent-glow)]'
      : 'bg-[var(--color-surface-raised)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface)]',
    className
  );

  if (href) {
    return (
      <a href={href} onClick={onClick} className={baseClasses}>
        {content}
      </a>
    );
  }

  return (
    <div role="button" tabIndex={0} onClick={onClick} className={baseClasses} {...props}>
      {content}
    </div>
  );
}

