import * as React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '../utils/cn';
import { t } from '../i18n';
import { NavItemRenderer } from './NavItemRenderer';
import type { NavItem } from './types';

export interface BottomNavPillProps {
  items: NavItem[];
  className?: string;
  onItemClick?: (item: NavItem) => void;
  showMoreButton?: boolean;
  onMoreClick?: () => void;
  moreLabel?: string;
}

export function BottomNavPill({
  items,
  className,
  onItemClick,
  showMoreButton = false,
  onMoreClick,
  moreLabel,
}: BottomNavPillProps) {
  const maxPrimary = showMoreButton ? 4 : 5;
  const displayItems = items.slice(0, maxPrimary);

  return (
    <nav
      className={cn(
        'fixed bottom-6 [@media(max-height:500px)]:bottom-2 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 p-1.5 rounded-full bg-[var(--color-surface)]/90 backdrop-blur-md border border-[var(--color-border)] shadow-2xl transition-all duration-300 max-w-[calc(100vw-32px)] overflow-x-auto',
        className
      )}
      aria-label={t('shell.bottomNavPill', 'Bottom Navigation Pill')}
    >
      {displayItems.map((item) => (
        <NavItemRenderer
          key={item.id}
          item={item}
          isCollapsed={false}
          onItemClick={onItemClick}
          className="rounded-full px-4 text-xs font-medium"
        />
      ))}

      {showMoreButton && onMoreClick && (
        <button
          type="button"
          onClick={onMoreClick}
          className="rounded-full px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)] transition-colors cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px]"
          aria-label={t('shell.moreOptions', 'More navigation options')}
          data-testid="bottom-nav-pill-more-btn"
        >
          <MoreHorizontal className="h-4 w-4 shrink-0" />
          <span>{moreLabel || t('common.more', 'More')}</span>
        </button>
      )}
    </nav>
  );
}
