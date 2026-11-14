'use client';

import * as React from 'react';
import { cn } from '../utils/cn';
import { t } from '../i18n';

export interface BottomTabBarItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  isPrimaryAction?: boolean;
}

export interface BottomTabBarProps {
  items: BottomTabBarItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  className?: string;
  ariaLabel?: string;
}

export function BottomTabBar({
  items,
  activeId,
  onSelect,
  className,
  ariaLabel,
}: BottomTabBarProps) {
  return (
    <nav
      aria-label={ariaLabel || t('common.bottomNav', 'Navigation')}
      className={cn(
        'fixed bottom-3 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-40',
        'flex items-center justify-between gap-1 p-1.5',
        'bg-[var(--color-surface)]/95 backdrop-blur-md',
        'border border-[var(--color-border)] rounded-full',
        'shadow-lg shadow-black/10 max-w-md mx-auto',
        className
      )}
    >
      <div role="tablist" className="flex items-center justify-around w-full gap-1">
        {items.slice(0, 5).map((item) => {
          const isActive = activeId === item.id;

          if (item.isPrimaryAction) {
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={item.label}
                onClick={() => onSelect?.(item.id)}
                className={cn(
                  'relative flex items-center justify-center -my-3 h-12 w-12 rounded-full',
                  'bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-md',
                  'hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0'
                )}
              >
                {item.icon}
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-danger)] text-[9px] font-bold text-white px-1">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={item.label}
              onClick={() => onSelect?.(item.id)}
              className={cn(
                'relative flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-full min-h-[44px]',
                'text-[10px] font-medium transition-all cursor-pointer',
                isActive
                  ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)] font-semibold shadow-xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)]/50'
              )}
            >
              {item.icon && <span className="h-4 w-4 mb-0.5 shrink-0 flex items-center justify-center">{item.icon}</span>}
              <span className="truncate max-w-[64px]">{item.label}</span>
              {item.badge !== undefined && (
                <span className="absolute top-1 right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[var(--color-primary)] text-[8px] font-bold text-white px-0.5">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
