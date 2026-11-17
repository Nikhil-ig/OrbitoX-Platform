import * as React from 'react';
import { cn } from '../utils/cn';
import { NavItemRenderer } from './NavItemRenderer';
import type { NavItem } from './types';

export interface BottomNavPillProps {
  items: NavItem[];
  className?: string;
  onItemClick?: (item: NavItem) => void;
}

export function BottomNavPill({ items, className, onItemClick }: BottomNavPillProps) {
  return (
    <nav
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 p-1.5 rounded-full bg-[var(--color-surface)]/90 backdrop-blur-md border border-[var(--color-border)] shadow-2xl transition-all duration-300 max-w-[calc(100vw-32px)] overflow-x-auto',
        className
      )}
      aria-label="Bottom Navigation Pill"
    >
      {items.map((item) => (
        <NavItemRenderer
          key={item.id}
          item={item}
          isCollapsed={false}
          onItemClick={onItemClick}
          className="rounded-full px-4 text-xs font-medium"
        />
      ))}
    </nav>
  );
}
