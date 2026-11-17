import * as React from 'react';
import { Menu } from 'lucide-react';
import { cn } from '../utils/cn';

export interface TopBarProps {
  breadcrumbs?: React.ReactNode;
  searchSlot?: React.ReactNode;
  contextSlot?: React.ReactNode;
  appearanceControl?: React.ReactNode;
  actionSlot?: React.ReactNode;
  userMenu?: React.ReactNode;
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
  className?: string;
}

export function TopBar({
  breadcrumbs,
  searchSlot,
  contextSlot,
  appearanceControl,
  actionSlot,
  userMenu,
  onMenuToggle,
  showMenuButton = false,
  className,
}: TopBarProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-xs px-4 sm:px-6 select-none',
        className
      )}
    >
      {/* Left: Hamburger trigger & Breadcrumbs */}
      <div className="flex items-center gap-3 overflow-hidden">
        {showMenuButton && onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="md:hidden p-2 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {breadcrumbs && <div className="text-sm truncate">{breadcrumbs}</div>}
      </div>

      {/* Center: Search & Context Switcher Slots */}
      <div className="flex items-center gap-3">
        {searchSlot && <div className="hidden sm:block">{searchSlot}</div>}
        {contextSlot && <div>{contextSlot}</div>}
      </div>

      {/* Right: Appearance control, Actions & User Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {appearanceControl && <div>{appearanceControl}</div>}
        {actionSlot && <div>{actionSlot}</div>}
        {userMenu && <div>{userMenu}</div>}
      </div>
    </header>
  );
}
