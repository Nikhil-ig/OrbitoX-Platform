import * as React from 'react';
import { cn } from '../utils/cn';
import { t } from '../i18n';
import { TopBar } from './TopBar';
import { SidebarCard } from './SidebarCard';
import { IconRail } from './IconRail';
import { BottomNavPill } from './BottomNavPill';
import { BottomTabBar } from './BottomTabBar';
import { MoreNavSheet } from './MoreNavSheet';
import { ShellContentFrame } from './ShellContentFrame';
import type { NavItem } from './types';

export interface ResponsiveShellProps {
  appName?: string;
  brand?: React.ReactNode;
  brandIcon?: React.ReactNode;
  navItems: NavItem[];
  managementNavItems?: NavItem[];
  managementSectionTitle?: string;
  bottomNavItems?: NavItem[];
  tenantSwitcher?: React.ReactNode;
  searchSlot?: React.ReactNode;
  contextSlot?: React.ReactNode;
  bottomCard?: React.ReactNode;
  userProfile?: React.ReactNode;
  topBarActions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  touchStation?: boolean;
  linkComponent?: React.ComponentType<any>;
  children: React.ReactNode;
  className?: string;
}

/**
 * Authoritative 4-band responsive persona shell composition (UI-7B2-BP1).
 * Seamlessly transitions between:
 * - Phone (< 640px): Floating BottomTabBar with MoreNavSheet
 * - Tablet Portrait (640px–1023px): Centered floating BottomNavPill
 * - Tablet Landscape (1024px–1279px): Collapsible 64px IconRail
 * - Desktop (>= 1280px): Collapsible 260px SidebarCard
 */
export function ResponsiveShell({
  appName = 'OrbitoX',
  brand,
  brandIcon,
  navItems,
  managementNavItems,
  managementSectionTitle,
  bottomNavItems,
  tenantSwitcher,
  searchSlot,
  contextSlot,
  bottomCard,
  userProfile,
  topBarActions,
  breadcrumbs,
  touchStation = false,
  linkComponent,
  children,
  className,
}: ResponsiveShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isMoreSheetOpen, setIsMoreSheetOpen] = React.useState(false);

  const hasOverflow = navItems.length > 4 || Boolean(bottomNavItems && bottomNavItems.length > 0);
  const primaryNavItems = navItems.length > 4 ? navItems.slice(0, 4) : navItems;
  const overflowNavItems = navItems.length > 4 ? navItems.slice(4) : [];

  const brandElement = brand || (
    <div className="flex items-center gap-2">
      {brandIcon || <div className="h-6 w-6 rounded-full bg-[var(--color-primary)] shrink-0" />}
      <span className="font-bold text-sm tracking-tight text-[var(--color-text)] truncate">{appName}</span>
    </div>
  );

  const brandIconElement = brandIcon || (
    <div className="h-6 w-6 rounded-full bg-[var(--color-primary)] shrink-0" />
  );

  return (
    <div
      className={cn(
        'relative min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex overflow-x-hidden',
        className
      )}
      data-testid="responsive-shell"
    >
      {/* ─── Band 4: Desktop SidebarCard (>= 1280px: Tailwind xl) ─── */}
      <div className="hidden xl:flex shrink-0 z-20" data-testid="desktop-sidebar-band">
        <SidebarCard
          brand={brandElement}
          searchSlot={searchSlot}
          tenantSwitcher={tenantSwitcher}
          items={navItems}
          managementNavItems={managementNavItems}
          managementSectionTitle={managementSectionTitle}
          pluginNavItems={bottomNavItems}
          bottomCard={bottomCard}
          userProfile={userProfile}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          linkComponent={linkComponent}
        />
      </div>

      {/* ─── Band 3: Tablet Landscape IconRail (1024px – 1279px: Tailwind lg to < xl) ─── */}
      <div className="hidden lg:flex xl:hidden shrink-0 z-20" data-testid="tablet-landscape-rail-band">
        <IconRail
          brandIcon={brandIconElement}
          items={navItems}
          bottomItems={bottomNavItems}
          touchStation={touchStation}
        />
      </div>

      {/* ─── Main Application Viewport ─── */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 sm:pb-24 lg:pb-0">
        {/* Responsive TopBar (visible across all viewports) */}
        <TopBar
          breadcrumbs={
            <div className="flex items-center gap-3">
              {brandElement}
              {breadcrumbs}
            </div>
          }
          searchSlot={searchSlot}
          contextSlot={contextSlot}
          actionSlot={topBarActions}
          onMenuToggle={() => setIsMoreSheetOpen(true)}
          showMenuButton={hasOverflow}
          className="shrink-0"
        />

        {/* Content Frame */}
        <ShellContentFrame className="flex-1 overflow-y-auto">
          {children}
        </ShellContentFrame>
      </div>

      {/* ─── Band 2: Tablet Portrait BottomNavPill (640px – 1023px: Tailwind sm & md) ─── */}
      <div className="hidden sm:flex lg:hidden fixed bottom-6 [@media(max-height:500px)]:bottom-2 left-1/2 -translate-x-1/2 z-40" data-testid="tablet-portrait-pill-band">
        <BottomNavPill
          items={primaryNavItems}
          showMoreButton={hasOverflow}
          onMoreClick={() => setIsMoreSheetOpen(true)}
        />
      </div>

      {/* ─── Band 1: Phone BottomTabBar (< 640px: Tailwind max-sm) ─── */}
      <div className="flex sm:hidden fixed bottom-0 left-0 right-0 z-40" data-testid="phone-tabbar-band">
        <BottomTabBar
          items={primaryNavItems}
          showMoreButton={hasOverflow}
          onMoreClick={() => setIsMoreSheetOpen(true)}
        />
      </div>

      {/* Phone & Tablet More Navigation Sheet */}
      <MoreNavSheet
        isOpen={isMoreSheetOpen}
        onOpenChange={setIsMoreSheetOpen}
        items={overflowNavItems}
        bottomItems={bottomNavItems}
        title={t('shell.moreActions', 'More Actions & Navigation')}
      />
    </div>
  );
}
