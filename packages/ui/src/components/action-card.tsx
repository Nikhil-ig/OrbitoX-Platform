'use client';

import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';
import { ProgressBar } from './progress-bar';

export interface ActionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  status?: React.ReactNode;
  progress?: number;
  progressLabel?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  highlighted?: boolean;
  href?: string;
  onClick?: () => void;
}

export function ActionCard({
  title,
  subtitle,
  status,
  progress,
  progressLabel,
  icon,
  action,
  highlighted = false,
  href,
  onClick,
  className,
  ...props
}: ActionCardProps) {
  const isClickable = Boolean(href || onClick);

  const cardContent = (
    <div
      onClick={onClick}
      className={cn(
        'group relative flex flex-col gap-3 p-5 rounded-[var(--radius-card)] border transition-all duration-200 select-none',
        highlighted
          ? 'bg-[var(--color-surface-raised)] border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/40 shadow-[var(--shadow-accent-glow)]'
          : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-border)]/80 hover:bg-[var(--color-surface-raised)]/60 shadow-xs',
        isClickable && 'cursor-pointer active:scale-[0.99]',
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-primary)]">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-[var(--color-text)] truncate">{title}</h4>
            {subtitle && (
              <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {status}
          {action ? (
            action
          ) : isClickable ? (
            <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-transform group-hover:translate-x-0.5" />
          ) : null}
        </div>
      </div>

      {progress !== undefined && (
        <div className="mt-1 space-y-1">
          {progressLabel && (
            <div className="flex justify-between text-[11px] text-[var(--color-text-muted)]">
              <span>{progressLabel}</span>
              <span>{Math.round(progress)}%</span>
            </div>
          )}
          <ProgressBar value={progress} size="sm" ariaLabel={progressLabel || title} />
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block no-underline">
        {cardContent}
      </a>
    );
  }

  return cardContent;
}
