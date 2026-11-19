import './dom-setup';
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

import {
  SidebarCard,
  IconRail,
  TopBar,
  BottomNavPill,
  BottomTabBar,
  ResponsiveShell,
  MoreNavSheet,
  NavItemRenderer,
  type NavItem,
} from '../src/shells';
import { AppShell } from '../src/components/app-shell';

const SAMPLE_ITEMS: NavItem[] = [
  { id: 'item-link', label: 'Dashboard Link', href: '/dashboard', active: true },
  { id: 'item-action', label: 'Action Button', onClick: () => {} },
  { id: 'item-static', label: 'Static Item' },
  { id: 'item-disabled', label: 'Disabled Item', href: '/disabled', disabled: true },
];

describe('Layer 4: Persona Shell Primitives & Responsive Navigation', () => {
  afterEach(() => {
    cleanup();
  });
  it('NavItemRenderer enforces 3-way semantic normalization without fake href="#" (TST-CMP-05)', () => {
    const { container } = render(
      <div>
        <NavItemRenderer item={SAMPLE_ITEMS[0]!} />
        <NavItemRenderer item={SAMPLE_ITEMS[1]!} />
        <NavItemRenderer item={SAMPLE_ITEMS[2]!} />
        <NavItemRenderer item={SAMPLE_ITEMS[3]!} />
      </div>
    );

    // 1. Real Link -> Renders <a> with real href, aria-current="page"
    const linkEl = container.querySelector('a[href="/dashboard"]');
    assert.ok(linkEl, 'Item with href must render semantic <a> element');
    assert.equal(linkEl.getAttribute('aria-current'), 'page');

    // 2. Action -> Renders <button type="button">
    const buttonEl = container.querySelector('button[type="button"]');
    assert.ok(buttonEl, 'Item with onClick must render semantic <button type="button">');
    assert.ok(buttonEl.textContent?.includes('Action Button'));

    // 3. Static -> Renders <span>
    const spans = container.querySelectorAll('span');
    const staticSpan = Array.from(spans).find((s) => s.textContent?.includes('Static Item'));
    assert.ok(staticSpan, 'Static item must render <span> without interactive button or anchor');

    // 4. Disabled -> Renders non-interactive <span> with aria-disabled
    const disabledSpan = Array.from(spans).find((s) => s.textContent?.includes('Disabled Item'));
    assert.ok(disabledSpan, 'Disabled item must render <span>');
    assert.equal(disabledSpan.getAttribute('aria-disabled'), 'true');

    // 5. INVARIANT: Zero fake href="#" anchors
    const fakeAnchors = container.querySelectorAll('a[href="#"]');
    assert.equal(fakeAnchors.length, 0, 'Must have zero fake href="#" anchors');
  });

  it('IconRail enforces >= 52px touch targets when touchStation={true}', () => {
    const { container: standardContainer } = render(
      <IconRail items={SAMPLE_ITEMS} touchStation={false} />
    );
    const standardRail = standardContainer.querySelector('aside');
    assert.equal(standardRail?.getAttribute('data-rail-mode'), 'standard');
    assert.ok(standardRail?.className.includes('w-16'));

    const { container: stationContainer } = render(
      <IconRail items={SAMPLE_ITEMS} touchStation={true} />
    );
    const stationRail = stationContainer.querySelector('aside');
    assert.equal(stationRail?.getAttribute('data-rail-mode'), 'touch-station');
    assert.ok(stationRail?.className.includes('w-20'));

    // Check touch target class on item
    const stationItem = stationContainer.querySelector('a[href="/dashboard"]');
    assert.ok(
      stationItem?.className.includes('min-h-[52px]') && stationItem?.className.includes('min-w-[52px]'),
      'Touch station nav items must meet >= 52px ergonomic standard'
    );
  });

  it('SidebarCard renders collapsed and expanded states cleanly', () => {
    let collapseToggled = false;
    const { container, rerender } = render(
      <SidebarCard
        brand={<div>Brand Logo</div>}
        items={SAMPLE_ITEMS}
        isCollapsed={false}
        onToggleCollapse={() => {
          collapseToggled = true;
        }}
      />
    );

    const aside = container.querySelector('aside');
    assert.equal(aside?.getAttribute('data-sidebar-state'), 'expanded');
    assert.ok(aside?.className.includes('w-64'));

    rerender(
      <SidebarCard
        brand={<div>Brand Logo</div>}
        items={SAMPLE_ITEMS}
        isCollapsed={true}
        onToggleCollapse={() => {
          collapseToggled = true;
        }}
      />
    );

    assert.equal(aside?.getAttribute('data-sidebar-state'), 'collapsed');
    assert.ok(aside?.className.includes('w-20'));
  });

  it('TopBar renders responsive header with menu button and action slots', () => {
    let menuClicked = false;
    const { container } = render(
      <TopBar
        breadcrumbs={<div>Path / Detail</div>}
        showMenuButton={true}
        onMenuToggle={() => {
          menuClicked = true;
        }}
        actionSlot={<button id="action-btn">Action</button>}
      />
    );

    const header = container.querySelector('header');
    assert.ok(header);
    assert.ok(container.querySelector('#action-btn'));
    assert.ok(container.innerHTML.includes('Path / Detail'));
  });

  it('BottomTabBar and BottomNavPill satisfy handheld ergonomics', () => {
    let moreClicked = false;
    const { container } = render(
      <div>
        <BottomNavPill items={SAMPLE_ITEMS} />
        <BottomTabBar
          items={SAMPLE_ITEMS}
          showMoreButton={true}
          onMoreClick={() => {
            moreClicked = true;
          }}
        />
      </div>
    );

    const pillNav = container.querySelector('nav[aria-label="Bottom Navigation Pill"]');
    assert.ok(pillNav);

    const tabBar = container.querySelector('nav[aria-label="Mobile Bottom Tab Bar"]');
    assert.ok(tabBar);

    const moreButton = tabBar.querySelector('button[aria-label="More navigation options"]');
    assert.ok(moreButton, 'More navigation button must be rendered on mobile tab bar');
  });

  it('TST-CMP-06: Package Dependency Invariant (packages/ui contains zero imports from apps/platform)', () => {
    const srcDir = path.resolve(__dirname, '../src');
    const allFiles: string[] = [];

    function walkDir(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          allFiles.push(fullPath);
        }
      }
    }

    walkDir(srcDir);
    assert.ok(allFiles.length > 20, 'Should scan packages/ui source files');

    for (const file of allFiles) {
      const code = fs.readFileSync(file, 'utf8');
      assert.ok(
        !code.includes('apps/platform'),
        `Forbidden dependency: ${file} must not import from apps/platform`
      );
      assert.ok(
        !code.includes('@orbitox-io/platform'),
        `Forbidden dependency: ${file} must not import from @orbitox-io/platform`
      );
    }
  });

  it('AppShell backward-compatible adapter enforces 3-way NavItem normalization and controlled appearance', () => {
    let themeToggled = false;
    const { container } = render(
      <AppShell
        appName="Test Platform"
        navItems={SAMPLE_ITEMS}
        onThemeToggle={() => {
          themeToggled = true;
        }}
        appearanceControl={<div data-testid="controlled-appearance-slot">Appearance Slot</div>}
      >
        <div>App Content</div>
      </AppShell>
    );

    // Verifies 0 fake href="#"
    const fakeAnchors = container.querySelectorAll('a[href="#"]');
    assert.equal(fakeAnchors.length, 0, 'AppShell must contain zero fake href="#" anchors');

    // Verifies real link
    const linkEl = container.querySelector('a[href="/dashboard"]');
    assert.ok(linkEl, 'AppShell must render real <a> link');

    // Verifies action button
    const buttonEl = container.querySelector('button[type="button"]');
    assert.ok(buttonEl, 'AppShell must render semantic <button>');

    // Verifies appearanceControl slot
    const appearanceSlot = container.querySelector('[data-testid="controlled-appearance-slot"]');
    assert.ok(appearanceSlot, 'AppShell must render controlled appearance slot when provided');
  });

  it('ResponsiveShell renders all 4 viewport bands with correct semantic testids and classes', () => {
    const { container } = render(
      <ResponsiveShell
        appName="OrbitoX Universal"
        navItems={SAMPLE_ITEMS}
      >
        <div>Content Frame</div>
      </ResponsiveShell>
    );

    const desktopBand = container.querySelector('[data-testid="desktop-sidebar-band"]');
    assert.ok(desktopBand, 'Must contain desktop sidebar band');
    assert.ok(desktopBand.className.includes('hidden xl:flex'), 'Desktop band must enforce xl:flex boundary');

    const tabletLandBand = container.querySelector('[data-testid="tablet-landscape-rail-band"]');
    assert.ok(tabletLandBand, 'Must contain tablet landscape rail band');
    assert.ok(tabletLandBand.className.includes('hidden lg:flex xl:hidden'), 'Tablet landscape band must enforce lg:flex xl:hidden');

    const tabletPortBand = container.querySelector('[data-testid="tablet-portrait-pill-band"]');
    assert.ok(tabletPortBand, 'Must contain tablet portrait pill band');
    assert.ok(tabletPortBand.className.includes('hidden sm:flex lg:hidden'), 'Tablet portrait band must enforce sm:flex lg:hidden');

    const phoneBand = container.querySelector('[data-testid="phone-tabbar-band"]');
    assert.ok(phoneBand, 'Must contain phone tab bar band');
    assert.ok(phoneBand.className.includes('flex sm:hidden'), 'Phone band must enforce flex sm:hidden');
  });

  it('ResponsiveShell manages overflow items and bottomNavItems cleanly without duplication across all 4 bands', () => {
    const SIX_NAV_ITEMS: NavItem[] = [
      { id: 'nav-1', label: 'Dashboard' },
      { id: 'nav-2', label: 'Orders' },
      { id: 'nav-3', label: 'Kitchen' },
      { id: 'nav-4', label: 'Analytics' },
      { id: 'nav-5', label: 'Inventory' },
      { id: 'nav-6', label: 'Customers' },
    ];

    const TWO_BOTTOM_ITEMS: NavItem[] = [
      { id: 'bot-1', label: 'System Health' },
      { id: 'bot-2', label: 'API Reference' },
    ];

    const { container } = render(
      <ResponsiveShell
        appName="Compact Navigation Contract Test"
        navItems={SIX_NAV_ITEMS}
        bottomNavItems={TWO_BOTTOM_ITEMS}
      >
        <div>Content Frame</div>
      </ResponsiveShell>
    );

    // ─── Band 4: Desktop SidebarCard (>= 1280px) ───
    const desktopBand = container.querySelector('[data-testid="desktop-sidebar-band"]');
    assert.ok(desktopBand, 'Desktop sidebar band must exist');
    const desktopText = desktopBand.textContent || '';
    SIX_NAV_ITEMS.forEach((item) => {
      assert.ok(desktopText.includes(item.label), `Desktop sidebar must contain ${item.label}`);
    });
    TWO_BOTTOM_ITEMS.forEach((item) => {
      assert.ok(desktopText.includes(item.label), `Desktop sidebar must contain ${item.label}`);
    });

    // ─── Band 3: Tablet Landscape IconRail (1024px – 1279px) ───
    const tabletLandBand = container.querySelector('[data-testid="tablet-landscape-rail-band"]');
    assert.ok(tabletLandBand, 'Tablet landscape rail band must exist');
    SIX_NAV_ITEMS.forEach((item) => {
      const railItem = tabletLandBand.querySelector(`[title="${item.label}"]`);
      assert.ok(railItem, `Tablet landscape rail must contain item with title ${item.label}`);
    });
    TWO_BOTTOM_ITEMS.forEach((item) => {
      const railItem = tabletLandBand.querySelector(`[title="${item.label}"]`);
      assert.ok(railItem, `Tablet landscape rail must contain bottom item with title ${item.label}`);
    });

    // ─── Band 2: Tablet Portrait BottomNavPill (640px – 1023px) ───
    const tabletPill = container.querySelector('[data-testid="tablet-portrait-pill-band"]');
    assert.ok(tabletPill);
    const pillText = tabletPill.textContent || '';
    // Primary 4 items must be in the pill:
    assert.ok(pillText.includes('Dashboard'), 'Pill must contain item 0 (Dashboard)');
    assert.ok(pillText.includes('Orders'), 'Pill must contain item 1 (Orders)');
    assert.ok(pillText.includes('Kitchen'), 'Pill must contain item 2 (Kitchen)');
    assert.ok(pillText.includes('Analytics'), 'Pill must contain item 3 (Analytics)');
    // Overflow items and bottom items must NOT be duplicated in the pill:
    assert.ok(!pillText.includes('Inventory'), 'Pill must NOT contain overflow item 4 (Inventory)');
    assert.ok(!pillText.includes('Customers'), 'Pill must NOT contain overflow item 5 (Customers)');
    assert.ok(!pillText.includes('System Health'), 'Pill must NOT contain bottom item 1 (System Health)');
    assert.ok(!pillText.includes('API Reference'), 'Pill must NOT contain bottom item 2 (API Reference)');

    // Pill More button must be present with >= 44x44px target classes
    const pillMoreBtn = tabletPill.querySelector('[data-testid="bottom-nav-pill-more-btn"]') as HTMLElement;
    assert.ok(pillMoreBtn, 'BottomNavPill must display More button when overflow exists');
    assert.ok(pillMoreBtn.className.includes('min-h-[44px]'), 'More button must have min-h-[44px]');
    assert.ok(pillMoreBtn.className.includes('min-w-[44px]'), 'More button must have min-w-[44px]');

    // ─── Band 1: Phone BottomTabBar (< 640px) ───
    const phoneTabBar = container.querySelector('[data-testid="phone-tabbar-band"]');
    assert.ok(phoneTabBar);
    const phoneText = phoneTabBar.textContent || '';
    assert.ok(phoneText.includes('Dashboard'), 'Phone tab bar must contain item 0');
    assert.ok(phoneText.includes('Orders'), 'Phone tab bar must contain item 1');
    assert.ok(phoneText.includes('Kitchen'), 'Phone tab bar must contain item 2');
    assert.ok(phoneText.includes('Analytics'), 'Phone tab bar must contain item 3');
    assert.ok(!phoneText.includes('Inventory'), 'Phone tab bar must NOT contain overflow item 4');
    assert.ok(!phoneText.includes('Customers'), 'Phone tab bar must NOT contain overflow item 5');
    assert.ok(!phoneText.includes('System Health'), 'Phone tab bar must NOT contain bottom item 1');
    assert.ok(!phoneText.includes('API Reference'), 'Phone tab bar must NOT contain bottom item 2');
    const tabMoreBtn = phoneTabBar.querySelector('button[aria-label="More navigation options"]');
    assert.ok(tabMoreBtn, 'Phone BottomTabBar must display More button when overflow exists');

    // ─── MoreNavSheet Contents (Phone & Tablet Portrait) ───
    const { baseElement: sheetBase } = render(
      <MoreNavSheet
        isOpen={true}
        onOpenChange={() => {}}
        items={SIX_NAV_ITEMS.slice(4)}
        bottomItems={TWO_BOTTOM_ITEMS}
        title="More Actions & Navigation"
      />
    );

    const sheetContent = sheetBase.querySelector('[role="dialog"]');
    assert.ok(sheetContent, 'MoreNavSheet dialog must be rendered');
    const sheetText = sheetContent.textContent || '';

    // Sheet MUST contain overflow items and bottomNavItems:
    assert.ok(sheetText.includes('Inventory'), 'MoreNavSheet must contain overflow item 4 (Inventory)');
    assert.ok(sheetText.includes('Customers'), 'MoreNavSheet must contain overflow item 5 (Customers)');
    assert.ok(sheetText.includes('System Health'), 'MoreNavSheet must contain bottom item 1 (System Health)');
    assert.ok(sheetText.includes('API Reference'), 'MoreNavSheet must contain bottom item 2 (API Reference)');

    // Sheet must NOT contain primary items (zero duplication):
    assert.ok(!sheetText.includes('Dashboard'), 'MoreNavSheet must NOT contain primary item 0');
    assert.ok(!sheetText.includes('Orders'), 'MoreNavSheet must NOT contain primary item 1');
    assert.ok(!sheetText.includes('Kitchen'), 'MoreNavSheet must NOT contain primary item 2');
    assert.ok(!sheetText.includes('Analytics'), 'MoreNavSheet must NOT contain primary item 3');

    // Verify structured sections:
    const overflowList = sheetContent.querySelector('[data-testid="more-nav-sheet-list"]');
    assert.ok(overflowList, 'Must contain overflow items list');
    const bottomList = sheetContent.querySelector('[data-testid="more-nav-sheet-bottom-list"]');
    assert.ok(bottomList, 'Must contain distinct bottomNavItems list');
  });

  it('ResponsiveShell triggers overflow when navItems <= 4 but bottomNavItems is present', () => {
    const THREE_NAV_ITEMS: NavItem[] = [
      { id: '1', label: 'Home' },
      { id: '2', label: 'Menu' },
      { id: '3', label: 'Orders' },
    ];
    const ONE_BOTTOM_ITEM: NavItem[] = [
      { id: 'settings', label: 'Settings' },
    ];

    const { container } = render(
      <ResponsiveShell
        appName="Bottom Items Only Overflow Test"
        navItems={THREE_NAV_ITEMS}
        bottomNavItems={ONE_BOTTOM_ITEM}
      >
        <div>Content</div>
      </ResponsiveShell>
    );

    const tabletPill = container.querySelector('[data-testid="tablet-portrait-pill-band"]');
    assert.ok(tabletPill);
    const pillMoreBtn = tabletPill.querySelector('[data-testid="bottom-nav-pill-more-btn"]');
    assert.ok(pillMoreBtn, 'BottomNavPill must display More button because bottomNavItems is present');

    const phoneTabBar = container.querySelector('[data-testid="phone-tabbar-band"]');
    assert.ok(phoneTabBar);
    const tabMoreBtn = phoneTabBar.querySelector('button[aria-label="More navigation options"]');
    assert.ok(tabMoreBtn, 'Phone BottomTabBar must display More button because bottomNavItems is present');
  });

  it('MoreNavSheet renders single overlay without nested duplicate overlays', () => {
    const { baseElement } = render(
      <MoreNavSheet
        isOpen={true}
        onOpenChange={() => {}}
        items={SAMPLE_ITEMS}
        title="More Actions"
      />
    );

    const overlays = baseElement.querySelectorAll('[data-state="open"].fixed.inset-0');
    assert.equal(overlays.length, 1, 'MoreNavSheet must render exactly one overlay (no nested duplicate overlays)');
  });
});
