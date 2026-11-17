import * as React from 'react';
import { cn } from '../utils/cn';
import type { NavItem } from './types';

export interface NavItemRendererProps {
  item: NavItem;
  isCollapsed?: boolean;
  touchStation?: boolean;
  className?: string;
  onItemClick?: (item: NavItem) => void;
}

/**
 * 3-Way Semantic NavItem Normalization Adapter
 *
 * 1. item.href (and !== '#') -> Renders semantic <a> anchor
 * 2. item.onClick -> Renders semantic <button type="button">
 * 3. Neither / Disabled -> Renders accessible <span>
 *
 * Enforces zero fake href="#" anchors and zero dead interactive elements.
 * Supports touchStation touch targets (>= 52px).
 */
export function NavItemRenderer({
  item,
  isCollapsed = false,
  touchStation = false,
  className,
  onItemClick,
}: NavItemRendererProps) {
  const content = (
    <>
      {item.icon && (
        <span
          className={cn(
            'shrink-0 flex items-center justify-center',
            touchStation ? 'h-6 w-6' : 'h-5 w-5'
          )}
        >
          {item.icon}
        </span>
      )}
      {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!isCollapsed && item.badge && <span className="shrink-0">{item.badge}</span>}
    </>
  );

  const baseClasses = cn(
    'flex items-center gap-3 rounded-full text-sm font-medium transition-all select-none',
    touchStation ? 'min-h-[52px] min-w-[52px] px-4 py-3' : 'min-h-[44px] px-4 py-2.5',
    isCollapsed && (touchStation ? 'justify-center px-2 min-w-[52px]' : 'justify-center px-2 min-w-[44px]'),
    item.active
      ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)] font-semibold shadow-[var(--shadow-accent-glow)]'
      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)]',
    item.disabled && 'opacity-50 pointer-events-none cursor-not-allowed',
    className
  );

  const handleClick = (e: React.MouseEvent) => {
    if (item.disabled) {
      e.preventDefault();
      return;
    }
    if (item.onClick) {
      item.onClick(e);
    }
    if (onItemClick) {
      onItemClick(item);
    }
  };

  // 1. Real Link Destination (Active Navigation)
  if (item.href && item.href !== '#' && !item.disabled) {
    return (
      <a
        href={item.href}
        className={baseClasses}
        aria-current={item.active ? 'page' : undefined}
        title={isCollapsed ? (item.title || item.label) : undefined}
        onClick={handleClick}
      >
        {content}
      </a>
    );
  }

  // 2. Action Callback (Real User Action)
  if (item.onClick && !item.disabled) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={baseClasses}
        aria-current={item.active ? 'page' : undefined}
        title={isCollapsed ? (item.title || item.label) : undefined}
      >
        {content}
      </button>
    );
  }

  // 3. Static Item or Disabled State: Renders <span> without dead click or fake anchor
  return (
    <span
      className={cn(baseClasses, 'cursor-default')}
      aria-disabled={item.disabled ? 'true' : undefined}
      title={isCollapsed ? (item.title || item.label) : undefined}
    >
      {content}
    </span>
  );
}
