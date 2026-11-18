import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  SidebarCard,
  IconRail,
  TopBar,
  BottomNavPill,
  BottomTabBar,
  MoreNavSheet,
  ShellContentFrame,
  ResponsiveShell,
  NavItemRenderer,
  type NavItem,
} from '../shells';
import {
  LayoutDashboard,
  Server,
  Users,
  ShieldAlert,
  CreditCard,
  Key,
  Settings,
  HelpCircle,
  Bell,
  Search,
} from 'lucide-react';
import { Button } from '../components/button';

const meta: Meta = {
  title: 'Shells/Persona Shell Primitives',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

const SAMPLE_NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" />, active: true },
  { id: 'fleet', label: 'Fleet Clusters', icon: <Server className="h-4 w-4" />, badge: <span className="text-xs bg-[var(--status-good-bg)] text-[var(--status-good-fg)] border border-[var(--status-good-border)] px-1.5 py-0.5 rounded-full font-medium">12 Live</span> },
  { id: 'tenants', label: 'Tenants & Orgs', icon: <Users className="h-4 w-4" /> },
  { id: 'security', label: 'Security & PKI', icon: <ShieldAlert className="h-4 w-4" /> },
  { id: 'billing', label: 'Billing & Plans', icon: <CreditCard className="h-4 w-4" /> },
];

const OVERFLOW_NAV_ITEMS: NavItem[] = [
  { id: 'api-keys', label: 'API Keys', icon: <Key className="h-4 w-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
  { id: 'support', label: 'Help & Docs', icon: <HelpCircle className="h-4 w-4" /> },
];

const SAMPLE_BOTTOM_NAV_ITEMS: NavItem[] = [
  { id: 'system-status', label: 'System Health', icon: <Bell className="h-4 w-4" /> },
  { id: 'documentation', label: 'API Reference', icon: <HelpCircle className="h-4 w-4" /> },
];

/**
 * 1. Desktop Wide (1440 x 900) - Operator & Owner Console Shell
 */
export const DesktopWide: StoryObj = {
  parameters: {
    viewport: {
      defaultViewport: 'desktop1440',
      viewports: {
        desktop1440: { name: 'Desktop (1440x900)', styles: { width: '1440px', height: '900px' } },
      },
    },
  },
  render: () => {
    return (
      <div className="flex h-screen w-full bg-[var(--color-bg)] text-[var(--color-text)]">
        <SidebarCard
          brand={
            <div className="flex items-center gap-2 font-bold tracking-tight">
              <div className="h-6 w-6 rounded-full bg-[var(--color-primary)]" />
              <span>OrbitoX Platform</span>
            </div>
          }
          items={SAMPLE_NAV_ITEMS}
          pluginNavItems={OVERFLOW_NAV_ITEMS}
          pluginSectionTitle="System & Security"
          bottomCard={
            <div className="rounded-xl bg-[var(--color-surface-raised)] p-3 text-xs">
              <div className="font-semibold text-[var(--color-text)]">Cluster AP-South-1</div>
              <div className="text-[var(--color-text-muted)] mt-0.5">Latency: 8ms • Healthy</div>
            </div>
          }
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar
            breadcrumbs={<span className="font-medium text-[var(--color-text)]">Fleet / Clusters</span>}
            searchSlot={
              <div className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text-muted)]">
                <Search className="h-3.5 w-3.5" />
                <span>Search fleet (⌘K)</span>
              </div>
            }
            actionSlot={
              <Button size="sm" variant="primary">
                Deploy Cluster
              </Button>
            }
            userMenu={
              <div className="h-8 w-8 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)] flex items-center justify-center font-bold text-xs">
                OP
              </div>
            }
          />
          <ShellContentFrame>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <div className="text-sm text-[var(--color-text-muted)]">Active Nodes</div>
                <div className="text-2xl font-bold mt-2">1,284</div>
              </div>
              <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <div className="text-sm text-[var(--color-text-muted)]">Tenant Workloads</div>
                <div className="text-2xl font-bold mt-2">4,812</div>
              </div>
              <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <div className="text-sm text-[var(--color-text-muted)]">Security Violations</div>
                <div className="text-2xl font-bold mt-2 text-[var(--color-success)]">0 Leaks</div>
              </div>
            </div>
          </ShellContentFrame>
        </div>
      </div>
    );
  },
};

/**
 * 2. Tablet Landscape (1194 x 834) - Touch Station IconRail
 */
export const TabletLandscapeTouchStation: StoryObj = {
  parameters: {
    viewport: {
      defaultViewport: 'ipadPro11Landscape',
      viewports: {
        ipadPro11Landscape: { name: 'iPad Pro 11" Landscape (1194x834)', styles: { width: '1194px', height: '834px' } },
      },
    },
  },
  render: () => {
    return (
      <div className="flex h-screen w-full bg-[var(--color-bg)] text-[var(--color-text)]">
        <IconRail
          brandIcon={<div className="h-8 w-8 rounded-full bg-[var(--color-primary)]" />}
          items={SAMPLE_NAV_ITEMS}
          bottomItems={[{ id: 'bell', label: 'Alerts', icon: <Bell className="h-5 w-5" /> }]}
          touchStation={true}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar
            breadcrumbs={<span className="font-semibold text-base">KDS Station 04 • Expeditor</span>}
            contextSlot={<span className="text-xs bg-[var(--status-good-bg)] text-[var(--status-good-fg)] border border-[var(--status-good-border)] px-2 py-1 rounded-full font-medium">Rush Mode Active</span>}
          />
          <ShellContentFrame>
            <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <h2 className="text-lg font-bold">Touch Station Surface (Touch Target $\ge 52$px)</h2>
              <p className="text-sm text-[var(--color-text-muted)] mt-2">
                Optimized for touch ergonomics on kitchen and counter stations.
              </p>
            </div>
          </ShellContentFrame>
        </div>
      </div>
    );
  },
};

/**
 * 3. Tablet Portrait (834 x 1194) - Floating BottomNavPill
 */
export const TabletPortraitFloatingPill: StoryObj = {
  parameters: {
    viewport: {
      defaultViewport: 'ipadPro11Portrait',
      viewports: {
        ipadPro11Portrait: { name: 'iPad Pro 11" Portrait (834x1194)', styles: { width: '834px', height: '1194px' } },
      },
    },
  },
  render: () => {
    return (
      <div className="flex flex-col h-screen w-full bg-[var(--color-bg)] text-[var(--color-text)] relative">
        <TopBar
          breadcrumbs={<span className="font-semibold">RestaurantOS • Today</span>}
          userMenu={<div className="h-8 w-8 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)] text-xs flex items-center justify-center font-bold">JD</div>}
        />
        <ShellContentFrame>
          <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
            <h2 className="text-lg font-bold">Tablet Portrait Frame</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">
              Persistent floating BottomNavPill with backdrop blur and touch targets $\ge 44$px.
            </p>
          </div>
        </ShellContentFrame>
        <BottomNavPill items={SAMPLE_NAV_ITEMS} />
      </div>
    );
  },
};

/**
 * 4. Handheld Mobile (390 x 844) - BottomTabBar + MoreNavSheet
 */
export const HandheldMobileTabBar: StoryObj = {
  parameters: {
    viewport: {
      defaultViewport: 'iphone14',
      viewports: {
        iphone14: { name: 'iPhone 14 (390x844)', styles: { width: '390px', height: '844px' } },
      },
    },
  },
  render: () => {
    const [isMoreOpen, setIsMoreOpen] = React.useState(false);

    return (
      <div className="flex flex-col h-screen w-full max-w-[390px] mx-auto bg-[var(--color-bg)] text-[var(--color-text)] relative border-x border-[var(--color-border)]">
        <TopBar
          breadcrumbs={<span className="font-semibold text-sm">Customer Portal</span>}
          userMenu={<div className="h-7 w-7 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)] text-xs flex items-center justify-center font-bold">CP</div>}
        />
        <ShellContentFrame>
          <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
            <h2 className="text-base font-bold">Handheld Mobile (390 x 844)</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-2">
              Docked bottom tab bar with primary actions and accessible MoreNavSheet for overflow.
            </p>
          </div>
        </ShellContentFrame>
        <BottomTabBar
          items={SAMPLE_NAV_ITEMS}
          showMoreButton={true}
          onMoreClick={() => setIsMoreOpen(true)}
        />
        <MoreNavSheet
          isOpen={isMoreOpen}
          onOpenChange={setIsMoreOpen}
          items={OVERFLOW_NAV_ITEMS}
          bottomItems={SAMPLE_BOTTOM_NAV_ITEMS}
        />
      </div>
    );
  },
};

/**
 * 5. Adaptive 4-Band Responsive Shell (UI-7B2-BP1 Composition)
 */
export const AdaptiveResponsiveShell: StoryObj = {
  render: () => {
    return (
      <ResponsiveShell
        appName="OrbitoX Universal"
        navItems={[...SAMPLE_NAV_ITEMS, ...OVERFLOW_NAV_ITEMS]}
        bottomNavItems={SAMPLE_BOTTOM_NAV_ITEMS}
        breadcrumbs={<span className="font-semibold text-sm">Dashboard</span>}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
            <h3 className="font-bold text-base">Responsive Navigation State</h3>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">
              Resize your browser window across the 4 authoritative boundary widths:
            </p>
            <ul className="text-xs space-y-1.5 mt-3 text-[var(--color-text-muted)]">
              <li>• &lt; 640px: <b>Phone BottomTabBar</b> + MoreSheet</li>
              <li>• 640px–1023px: <b>Tablet Portrait BottomNavPill</b> (with More Sheet trigger)</li>
              <li>• 1024px–1279px: <b>Tablet Landscape IconRail (64px)</b></li>
              <li>• &ge; 1280px: <b>Desktop SidebarCard (260px)</b></li>
            </ul>
          </div>
        </div>
      </ResponsiveShell>
    );
  },
};

/**
 * 5b. Adaptive Responsive Shell with Touch Station Mode (52px Touch Targets)
 */
export const AdaptiveResponsiveShellTouchStation: StoryObj = {
  parameters: {
    viewport: {
      defaultViewport: 'ipadProLandscape',
      viewports: {
        ipadProLandscape: { name: 'iPad Pro Landscape (1194x834)', styles: { width: '1194px', height: '834px' } },
      },
    },
  },
  render: () => {
    return (
      <ResponsiveShell
        appName="OrbitoX POS & KDS Station"
        navItems={[...SAMPLE_NAV_ITEMS, ...OVERFLOW_NAV_ITEMS]}
        bottomNavItems={SAMPLE_BOTTOM_NAV_ITEMS}
        touchStation={true}
        breadcrumbs={<span className="font-semibold text-sm">Kitchen Display Station (KDS)</span>}
      >
        <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] max-w-xl">
          <h3 className="font-bold text-base">Touch Station Mode (touchStation=true)</h3>
          <p className="text-sm text-[var(--color-text-muted)] mt-2">
            The tablet landscape rail renders with enlarged 52px touch targets and an 80px rail width to prevent mis-taps during high-throughput kitchen and POS station operations.
          </p>
        </div>
      </ResponsiveShell>
    );
  },
};

/**
 * 6. Individual NavItemRenderer (Interactive Navigation Target)
 */
export const IndividualNavItemRenderer: StoryObj = {
  render: () => {
    return (
      <div className="p-8 space-y-4 max-w-sm">
        <h4 className="text-sm font-semibold text-[var(--color-text)]">NavItemRenderer States</h4>
        <div className="space-y-2 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <NavItemRenderer
            item={{ id: 'active', label: 'Active State', icon: <LayoutDashboard className="h-4 w-4" />, active: true }}
            isCollapsed={false}
          />
          <NavItemRenderer
            item={{ id: 'inactive', label: 'Inactive State', icon: <Server className="h-4 w-4" /> }}
            isCollapsed={false}
          />
          <NavItemRenderer
            item={{ id: 'with-badge', label: 'With Count Badge', icon: <Users className="h-4 w-4" />, badge: <span className="text-xs bg-[var(--status-good-bg)] text-[var(--status-good-fg)] border border-[var(--status-good-border)] px-1.5 py-0.5 rounded-full font-medium">5</span> }}
            isCollapsed={false}
          />
        </div>
      </div>
    );
  },
};
