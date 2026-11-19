'use client';

import * as React from 'react';
import { cn } from '../utils/cn';

export interface SwipeActionItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onTrigger: () => void;
  variant?: 'default' | 'destructive' | 'success';
}

export interface SwipeActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  leftAction?: SwipeActionItem;
  rightAction?: SwipeActionItem;
  showAlternativeButtons?: boolean;
}

export function SwipeActions({
  children,
  leftAction,
  rightAction,
  showAlternativeButtons = true,
  className,
  ...props
}: SwipeActionsProps) {
  const [offset, setOffset] = React.useState(0);
  const startXRef = React.useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startXRef.current === null) return;
    const currentX = e.touches[0]?.clientX ?? 0;
    const diff = currentX - startXRef.current;
    // Allow swipe right if leftAction exists, allow swipe left if rightAction exists
    if (diff > 0 && leftAction) {
      setOffset(Math.min(diff, 80));
    } else if (diff < 0 && rightAction) {
      setOffset(Math.max(diff, -80));
    }
  };

  const handleTouchEnd = () => {
    if (offset >= 60 && leftAction) {
      leftAction.onTrigger();
    } else if (offset <= -60 && rightAction) {
      rightAction.onTrigger();
    }
    setOffset(0);
    startXRef.current = null;
  };

  return (
    <div className={cn('relative overflow-hidden rounded-[var(--radius-card)]', className)} {...props}>
      {/* Background action targets */}
      {leftAction && (
        <div
          className={cn(
            'absolute inset-y-0 left-0 flex items-center px-4 font-medium text-xs rounded-l-[var(--radius-card)]',
            leftAction.variant === 'destructive'
              ? 'bg-[var(--color-danger)] text-white'
              : 'bg-[var(--color-primary)] text-white'
          )}
        >
          {leftAction.icon}
          <span className="ml-1.5">{leftAction.label}</span>
        </div>
      )}

      {rightAction && (
        <div
          className={cn(
            'absolute inset-y-0 right-0 flex items-center justify-end px-4 font-medium text-xs rounded-r-[var(--radius-card)]',
            rightAction.variant === 'destructive'
              ? 'bg-[var(--color-danger)] text-white'
              : 'bg-[var(--color-success)] text-white'
          )}
        >
          <span className="mr-1.5">{rightAction.label}</span>
          {rightAction.icon}
        </div>
      )}

      {/* Main swipeable surface */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={cn(
          'relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-card)] transition-transform duration-150 ease-out select-none',
          offset !== 0 && 'shadow-md'
        )}
      >
        {children}

        {/* Visible Accessible Alternative Action Buttons (WCAG 2.2 AA invariant) */}
        {showAlternativeButtons && (leftAction || rightAction) && (
          <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-[var(--color-border)]/50 bg-[var(--color-surface-raised)]/30">
            {leftAction && (
              <button
                type="button"
                onClick={leftAction.onTrigger}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] transition-colors cursor-pointer"
              >
                {leftAction.icon}
                <span>{leftAction.label}</span>
              </button>
            )}
            {rightAction && (
              <button
                type="button"
                onClick={rightAction.onTrigger}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer',
                  rightAction.variant === 'destructive'
                    ? 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20'
                    : 'bg-[var(--color-primary)] text-[var(--color-primary-fg)] hover:brightness-110'
                )}
              >
                <span>{rightAction.label}</span>
                {rightAction.icon}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

