import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';
import { t } from '../i18n';
import { NavItemRenderer } from './NavItemRenderer';
import type { NavItem } from './types';

export interface SidebarCardProps {
  brand?: React.ReactNode;
  tenantSwitcher?: React.ReactNode;
  items: NavItem[];
  pluginNavItems?: NavItem[];
  pluginSectionTitle?: string;
  bottomCard?: React.ReactNode;
  userProfile?: React.ReactNode;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export function SidebarCard({
  brand,
  tenantSwitcher,
  items,
  pluginNavItems,
  pluginSectionTitle = 'Plugins & Extensions',
  bottomCard,
  userProfile,
  isCollapsed = false,
  onToggleCollapse,
  className,
}: SidebarCardProps) {
  return (
    <aside
      className={cn(
        'relative flex flex-col h-full bg-[var(--color-surface)] border-r border-[var(--color-border)] transition-all duration-300 ease-in-out select-none',
        isCollapsed ? 'w-20' : 'w-64',
        className
      )}
      data-sidebar-state={isCollapsed ? 'collapsed' : 'expanded'}
    >
      {/* Brand Header */}
      {brand && (
        <div className="flex h-14 items-center justify-between border-b border-[var(--color-border)] px-4">
          <div className="flex items-center gap-3 overflow-hidden">{brand}</div>
          {onToggleCollapse && !isCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] transition-colors cursor-pointer"
              aria-label={t('shell.collapseSidebar', 'Collapse sidebar')}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Tenant Switcher Slot */}
      {tenantSwitcher && !isCollapsed && (
        <div className="border-b border-[var(--color-border)] p-3">{tenantSwitcher}</div>
      )}

      {/* Navigation Items List */}
      <div className="flex-1 overflow-y-auto space-y-4 p-3">
        <nav className="space-y-1">
          {items.map((item) => (
            <NavItemRenderer key={item.id} item={item} isCollapsed={isCollapsed} />
          ))}
        </nav>

        {/* Plugin Navigation Section */}
        {pluginNavItems && pluginNavItems.length > 0 && (
          <div className="pt-2">
            {!isCollapsed && pluginSectionTitle && (
              <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
                {pluginSectionTitle}
              </div>
            )}
            <nav className="space-y-1">
              {pluginNavItems.map((item) => (
                <NavItemRenderer key={item.id} item={item} isCollapsed={isCollapsed} />
              ))}
            </nav>
          </div>
        )}
      </div>

      {/* Bottom Card / System Status Slot */}
      {bottomCard && !isCollapsed && (
        <div className="p-3 border-t border-[var(--color-border)]">{bottomCard}</div>
      )}

      {/* User Profile Slot */}
      {userProfile && !isCollapsed && (
        <div className="p-3 border-t border-[var(--color-border)]">{userProfile}</div>
      )}

      {/* Expand Toggle Footer when Collapsed */}
      {isCollapsed && onToggleCollapse && (
        <div className="p-2 border-t border-[var(--color-border)] flex justify-center mt-auto">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-2 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] transition-colors cursor-pointer"
            aria-label={t('shell.expandSidebar', 'Expand sidebar')}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
