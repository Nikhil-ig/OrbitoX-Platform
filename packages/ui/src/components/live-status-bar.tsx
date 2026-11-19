import * as React from 'react';
import { cn } from '../utils/cn';

export interface LiveStatusBarProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function LiveStatusBar({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  className,
  ...props
}: LiveStatusBarProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'w-full max-w-md mx-auto flex items-center justify-between gap-3 rounded-full bg-[var(--color-pill-dark)] text-white p-2.5 pr-3 shadow-xl select-none',
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon ? (
          <div className="h-9 w-9 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)] flex items-center justify-center shrink-0">
            {icon}
          </div>
        ) : (
          <div className="h-9 w-9 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)] flex items-center justify-center shrink-0">
            <span className="h-2.5 w-2.5 rounded-full bg-white animate-pulse" aria-hidden="true" />
          </div>
        )}

        <div className="min-w-0">
          <div className="text-xs font-semibold leading-tight truncate text-white">
            {title}
          </div>
          <div className="text-[11px] text-white/70 leading-normal truncate mt-0.5">
            {subtitle}
          </div>
        </div>
      </div>

      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-3.5 py-1.5 shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
