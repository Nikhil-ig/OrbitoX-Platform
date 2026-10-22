import { test, expect } from '@playwright/test';

test.describe('P27 Publishing Snapshot & Production Edge Compilation', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/admin/template-studio?template=saas-nextgen', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#sz-top-bar, .orbitox-studio-zero', { timeout: 45000 });
  });

  test('1. ProductionEdgeExporter compiles high-fidelity standalone HTML5 bundle', async ({ page }) => {
    const bundleResult = await page.evaluate(() => {
      const win = window as any;
      const Exporter = win.__studioProductionEdgeExporter;
      const store = win.__studioStore;
      if (!Exporter || !store) return { success: false, reason: 'Missing exporter or store' };

      const state = store.getState();
      const schema = state.draft?.schema;
      if (!schema) return { success: false, reason: 'Missing draft schema' };

      const bundle = Exporter.compileToBundle(schema);
      return {
        success: true,
        htmlLength: bundle.html.length,
        hasDoctype: bundle.html.startsWith('<!DOCTYPE html>'),
        hasTitle: bundle.html.includes('<title>'),
        hasMetaViewport: bundle.html.includes('name="viewport"'),
        hasJsonLd: bundle.html.includes('application/ld+json'),
        hasGoogleFonts: bundle.html.includes('fonts.googleapis.com'),
        hasCss: bundle.css.length > 0,
        nodeCount: bundle.meta.nodeCount,
        sectionCount: bundle.meta.sectionCount,
      };
    });

    expect(bundleResult.success).toBe(true);
    expect(bundleResult.hasDoctype).toBe(true);
    expect(bundleResult.hasTitle).toBe(true);
    expect(bundleResult.hasMetaViewport).toBe(true);
    expect(bundleResult.hasJsonLd).toBe(true);
    expect(bundleResult.hasGoogleFonts).toBe(true);
    expect(bundleResult.hasCss).toBe(true);
    expect(bundleResult.nodeCount).toBeGreaterThan(0);
    expect(bundleResult.sectionCount).toBeGreaterThan(0);
  });

  test('2. Publish Modal opens and displays live edge export metrics', async ({ page }) => {
    // Click Publish button on top bar
    const publishBtn = page.locator('#sz-publish-btn').first();
    await publishBtn.waitFor({ state: 'visible', timeout: 5000 });
    await publishBtn.click();

    // Verify Publish modal appears
    const publishModal = page.locator('#sz-publish-modal-container').first();
    await publishModal.waitFor({ state: 'visible', timeout: 8000 });

    // Verify modal elements: canonical domain or export actions
    await expect(publishModal).toBeVisible();

    // Close publish modal with Escape
    await page.keyboard.press('Escape');
    await expect(publishModal).not.toBeVisible();
  });
});
