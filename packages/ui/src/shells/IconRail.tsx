import * as React from 'react';
import { cn } from '../utils/cn';
import { NavItemRenderer } from './NavItemRenderer';
import type { NavItem } from './types';

export interface IconRailProps {
  brandIcon?: React.ReactNode;
  items: NavItem[];
  bottomItems?: NavItem[];
  touchStation?: boolean;
  className?: string;
}

export function IconRail({
  brandIcon,
  items,
  bottomItems,
  touchStation = false,
  className,
}: IconRailProps) {
  return (
    <aside
      className={cn(
        'relative flex flex-col h-full bg-[var(--color-surface)] border-r border-[var(--color-border)] select-none shrink-0 items-center py-3',
        touchStation ? 'w-20' : 'w-16',
        className
      )}
      data-rail-mode={touchStation ? 'touch-station' : 'standard'}
    >
      {/* Brand Icon Header */}
      {brandIcon && (
        <div className="flex h-12 w-full items-center justify-center border-b border-[var(--color-border)] pb-2 mb-2">
          {brandIcon}
        </div>
      )}

      {/* Main Navigation Icons */}
      <nav className="flex-1 w-full space-y-2 flex flex-col items-center overflow-y-auto px-1.5">
        {items.map((item) => (
          <NavItemRenderer
            key={item.id}
            item={item}
            isCollapsed={true}
            touchStation={touchStation}
          />
        ))}
      </nav>

      {/* Bottom Utility Items */}
      {bottomItems && bottomItems.length > 0 && (
        <div className="w-full pt-2 border-t border-[var(--color-border)] flex flex-col items-center space-y-2 px-1.5">
          {bottomItems.map((item) => (
            <NavItemRenderer
              key={item.id}
              item={item}
              isCollapsed={true}
              touchStation={touchStation}
            />
          ))}
        </div>
      )}
    </aside>
  );
}
