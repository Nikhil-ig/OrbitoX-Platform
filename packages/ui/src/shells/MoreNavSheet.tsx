import * as React from 'react';
import {
  BottomSheet,
  BottomSheetContent,
} from '../components/bottom-sheet';
import { NavItemRenderer } from './NavItemRenderer';
import type { NavItem } from './types';
import { cn } from '../utils/cn';

export interface MoreNavSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  items: NavItem[];
  bottomItems?: NavItem[];
  title?: string;
  onItemClick?: (item: NavItem) => void;
  className?: string;
}

export function MoreNavSheet({
  isOpen,
  onOpenChange,
  items,
  bottomItems,
  title = 'More Navigation',
  onItemClick,
  className,
}: MoreNavSheetProps) {
  const handleItemSelect = (item: NavItem) => {
    onOpenChange(false);
    if (onItemClick) {
      onItemClick(item);
    }
  };

  return (
    <BottomSheet open={isOpen} onOpenChange={onOpenChange}>
      <BottomSheetContent
        className={cn(
          'bg-[var(--color-surface)] border-t border-[var(--color-border)] p-4 max-h-[80vh] overflow-y-auto',
          className
        )}
      >
        {title && (
          <div className="text-base font-semibold text-[var(--color-text)] mb-4 px-2">
            {title}
          </div>
        )}
        <nav className="space-y-1" data-testid="more-nav-sheet-list">
          {items.map((item) => (
            <NavItemRenderer
              key={item.id}
              item={item}
              isCollapsed={false}
              onItemClick={handleItemSelect}
              className="w-full justify-start text-sm py-3"
            />
          ))}
          {bottomItems && bottomItems.length > 0 && (
            <div
              className={cn(
                'space-y-1',
                items.length > 0 && 'pt-2 mt-2 border-t border-[var(--color-border)]'
              )}
              data-testid="more-nav-sheet-bottom-list"
            >
              {bottomItems.map((item) => (
                <NavItemRenderer
                  key={item.id}
                  item={item}
                  isCollapsed={false}
                  onItemClick={handleItemSelect}
                  className="w-full justify-start text-sm py-3"
                />
              ))}
            </div>
          )}
        </nav>
      </BottomSheetContent>
    </BottomSheet>
  );
}
