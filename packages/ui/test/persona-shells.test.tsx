import './dom-setup';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

import {
  SidebarCard,
  IconRail,
  TopBar,
  BottomNavPill,
  BottomTabBar,
  NavItemRenderer,
  type NavItem,
} from '../src/shells';

const SAMPLE_ITEMS: NavItem[] = [
  { id: 'item-link', label: 'Dashboard Link', href: '/dashboard', active: true },
  { id: 'item-action', label: 'Action Button', onClick: () => {} },
  { id: 'item-static', label: 'Static Item' },
  { id: 'item-disabled', label: 'Disabled Item', href: '/disabled', disabled: true },
];

describe('Layer 4: Persona Shell Primitives & Responsive Navigation', () => {
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
});
