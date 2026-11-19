import * as React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '../utils/cn';
import { t } from '../i18n';
import { NavItemRenderer } from './NavItemRenderer';
import type { NavItem } from './types';

export interface BottomTabBarProps {
  items: NavItem[];
  onMoreClick?: () => void;
  showMoreButton?: boolean;
  moreLabel?: string;
  className?: string;
  onItemClick?: (item: NavItem) => void;
}

export function BottomTabBar({
  items,
  onMoreClick,
  showMoreButton = false,
  moreLabel = 'More',
  className,
  onItemClick,
}: BottomTabBarProps) {
  // Display at most 4 primary items when More button is active, otherwise up to 5
  const maxPrimary = showMoreButton ? 4 : 5;
  const displayItems = items.slice(0, maxPrimary);

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-sm px-2 select-none sm:hidden',
        className
      )}
      aria-label={t('shell.bottomTabBar', 'Mobile Bottom Tab Bar')}
    >
      {displayItems.map((item) => (
        <div key={item.id} className="flex-1 flex justify-center">
          <NavItemRenderer
            item={item}
            isCollapsed={false}
            onItemClick={onItemClick}
            className="flex-col gap-1 px-2 py-1 min-h-[48px] min-w-[48px] justify-center rounded-xl text-[11px]"
          />
        </div>
      ))}

      {showMoreButton && onMoreClick && (
        <div className="flex-1 flex justify-center">
          <button
            type="button"
            onClick={onMoreClick}
            className="flex flex-col items-center justify-center gap-1 min-h-[48px] min-w-[48px] rounded-xl px-2 py-1 text-[11px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
            aria-label={t('shell.moreOptions', 'More navigation options')}
          >
            <MoreHorizontal className="h-5 w-5 shrink-0" />
            <span className="truncate">{moreLabel}</span>
          </button>
        </div>
      )}
    </nav>
  );
}
