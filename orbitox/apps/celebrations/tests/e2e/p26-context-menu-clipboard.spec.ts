import { test, expect } from '@playwright/test';

test.describe('P26.10 — Professional Right-Click Context Menu & Clipboard Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Template Studio on localhost:3010
    await page.goto('/admin/template-studio?template=saas-nextgen', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#sz-top-bar, .orbitox-studio-zero, [data-testid="template-studio"]', { timeout: 20000 });
  });

  test('TEST-01: Canvas Background Right-Click Menu Opens with Canonical Actions', async ({ page }) => {
    const canvas = page.locator('#sz-canvas-workspace, .canvas-artboard-backdrop');
    await expect(canvas.first()).toBeVisible();

    // Right-click on empty canvas area (near margin)
    await canvas.first().click({ button: 'right', position: { x: 50, y: 50 } });

    // Menu should appear
    const contextMenu = page.locator('[role="menu"][aria-label="Context Menu"]');
    await expect(contextMenu).toBeVisible();

    // Verify canonical background actions
    await expect(contextMenu.getByText('Paste', { exact: true })).toBeVisible();
    await expect(contextMenu.getByText('Paste Here', { exact: true })).toBeVisible();
    await expect(contextMenu.getByText('Select All', { exact: true })).toBeVisible();
    await expect(contextMenu.getByText('Zoom to Fit', { exact: true })).toBeVisible();

    // Escape closes context menu
    await page.keyboard.press('Escape');
    await expect(contextMenu).not.toBeVisible();
  });

  test('TEST-02: Node Right-Click Context Menu Displays Creative Operations & Copy as Code', async ({ page }) => {
    // Wait for nodes on canvas
    const node = page.locator('[data-node-id]').first();
    if (await node.isVisible()) {
      await node.click({ button: 'right' });

      const contextMenu = page.locator('[role="menu"][aria-label="Context Menu"]');
      await expect(contextMenu).toBeVisible();

      // Check node operations
      await expect(contextMenu.getByText('Cut', { exact: true })).toBeVisible();
      await expect(contextMenu.getByText('Copy', { exact: true })).toBeVisible();
      await expect(contextMenu.getByText('Copy as Code', { exact: true })).toBeVisible();
      await expect(contextMenu.getByText('Duplicate', { exact: true })).toBeVisible();
      await expect(contextMenu.getByText('Select Layer', { exact: true })).toBeVisible();

      // Hover over "Copy as Code" to reveal submenu
      const copyAsCodeItem = contextMenu.locator('#menu-item-copy-as-code, [data-menu-item="menu-item-copy-as-code"], div:has-text("Copy as Code")').first();
      await copyAsCodeItem.hover();

      // Submenu should appear with JSX, HTML, SVG, JSON AST targets
      await expect(page.getByText('React / JSX Component', { exact: true })).toBeVisible();
      await expect(page.getByText('HTML5 & Scoped CSS', { exact: true })).toBeVisible();
      await expect(page.getByText('SVG Vector Markup', { exact: true })).toBeVisible();
      await expect(page.getByText('JSON SceneGraph AST', { exact: true })).toBeVisible();

      // Escape closes menu
      await page.keyboard.press('Escape');
      await expect(contextMenu).not.toBeVisible();
    }
  });

  test('TEST-03: Keyboard Navigation in Context Menu', async ({ page }) => {
    const canvas = page.locator('#sz-canvas-workspace, .canvas-artboard-backdrop');
    await canvas.first().click({ button: 'right', position: { x: 80, y: 80 } });

    const contextMenu = page.locator('[role="menu"][aria-label="Context Menu"]');
    await expect(contextMenu).toBeVisible();

    // Arrow down should focus items
    await page.keyboard.press('ArrowDown');
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.getAttribute('role') : null;
    });
    expect(focused).toBe('menuitem');

    // Escape closes menu
    await page.keyboard.press('Escape');
    await expect(contextMenu).not.toBeVisible();
  });
});
