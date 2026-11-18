import * as React from 'react';
import {
  BottomSheet,
  BottomSheetContent,
} from '../components/bottom-sheet';
import { NavItemRenderer } from './NavItemRenderer';
import type { NavItem } from './types';

export interface MoreNavSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  items: NavItem[];
  title?: string;
  onItemClick?: (item: NavItem) => void;
}

export function MoreNavSheet({
  isOpen,
  onOpenChange,
  items,
  title = 'More Navigation',
  onItemClick,
}: MoreNavSheetProps) {
  const handleItemSelect = (item: NavItem) => {
    onOpenChange(false);
    if (onItemClick) {
      onItemClick(item);
    }
  };

  return (
    <BottomSheet open={isOpen} onOpenChange={onOpenChange}>
      <BottomSheetContent className="bg-[var(--color-surface)] border-t border-[var(--color-border)] p-4 max-h-[80vh] overflow-y-auto">
        {title && (
          <div className="text-base font-semibold text-[var(--color-text)] mb-4 px-2">
            {title}
          </div>
        )}
        <nav className="space-y-1">
          {items.map((item) => (
            <NavItemRenderer
              key={item.id}
              item={item}
              isCollapsed={false}
              onItemClick={handleItemSelect}
              className="w-full justify-start text-sm py-3"
            />
          ))}
        </nav>
      </BottomSheetContent>
    </BottomSheet>
  );
}
