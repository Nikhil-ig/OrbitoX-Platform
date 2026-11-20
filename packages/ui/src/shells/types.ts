import * as React from 'react';

/**
 * Authoritative NavItem representation for all OrbitoX persona shells.
 * Backward compatible with optional href, onClick, and active state.
 */
export interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon?: React.ReactNode;
  active?: boolean;
  badge?: React.ReactNode;
  disabled?: boolean;
  onClick?: (e?: React.MouseEvent) => void;
  title?: string;
  linkComponent?: React.ComponentType<any>;
}

export interface NavGroup {
  id: string;
  title?: string;
  items: NavItem[];
}

export type ViewportClass = 'mobile' | 'tablet-portrait' | 'tablet-landscape' | 'desktop';

export interface AppearanceControlProps {
  theme?: 'auto' | 'light' | 'dark';
  onThemeChange?: (theme: 'auto' | 'light' | 'dark') => void;
  appearanceSlot?: React.ReactNode;
}

export interface ShellNavigationProps {
  items: NavItem[];
  activeId?: string;
  onItemSelect?: (item: NavItem) => void;
}
