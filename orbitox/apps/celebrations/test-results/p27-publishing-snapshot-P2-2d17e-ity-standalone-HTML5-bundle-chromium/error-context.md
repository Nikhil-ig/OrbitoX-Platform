# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: p27-publishing-snapshot.spec.ts >> P27 Publishing Snapshot & Production Edge Compilation >> 1. ProductionEdgeExporter compiles high-fidelity standalone HTML5 bundle
- Location: tests/e2e/p27-publishing-snapshot.spec.ts:10:7

# Error details

```
TimeoutError: page.waitForSelector: Timeout 20000ms exceeded.
Call log:
  - waiting for locator('#sz-top-bar, .orbitox-studio-zero') to be visible

```

# Page snapshot

```yaml
- 'heading "Application error: a client-side exception has occurred while loading localhost (see the browser console for more information)." [level=2] [ref=e4]'
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('P27 Publishing Snapshot & Production Edge Compilation', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.setViewportSize({ width: 1440, height: 900 });
  6  |     await page.goto('/admin/template-studio?template=saas-nextgen', { waitUntil: 'domcontentloaded' });
> 7  |     await page.waitForSelector('#sz-top-bar, .orbitox-studio-zero', { timeout: 20000 });
     |                ^ TimeoutError: page.waitForSelector: Timeout 20000ms exceeded.
  8  |   });
  9  | 
  10 |   test('1. ProductionEdgeExporter compiles high-fidelity standalone HTML5 bundle', async ({ page }) => {
  11 |     const bundleResult = await page.evaluate(() => {
  12 |       const win = window as any;
  13 |       const Exporter = win.__studioProductionEdgeExporter;
  14 |       const store = win.__studioStore;
  15 |       if (!Exporter || !store) return { success: false, reason: 'Missing exporter or store' };
  16 | 
  17 |       const state = store.getState();
  18 |       const schema = state.draft?.schema;
  19 |       if (!schema) return { success: false, reason: 'Missing draft schema' };
  20 | 
  21 |       const bundle = Exporter.compileToBundle(schema);
  22 |       return {
  23 |         success: true,
  24 |         htmlLength: bundle.html.length,
  25 |         hasDoctype: bundle.html.startsWith('<!DOCTYPE html>'),
  26 |         hasTitle: bundle.html.includes('<title>'),
  27 |         hasMetaViewport: bundle.html.includes('name="viewport"'),
  28 |         hasJsonLd: bundle.html.includes('application/ld+json'),
  29 |         hasGoogleFonts: bundle.html.includes('fonts.googleapis.com'),
  30 |         hasCss: bundle.css.length > 0,
  31 |         nodeCount: bundle.meta.nodeCount,
  32 |         sectionCount: bundle.meta.sectionCount,
  33 |       };
  34 |     });
  35 | 
  36 |     expect(bundleResult.success).toBe(true);
  37 |     expect(bundleResult.hasDoctype).toBe(true);
  38 |     expect(bundleResult.hasTitle).toBe(true);
  39 |     expect(bundleResult.hasMetaViewport).toBe(true);
  40 |     expect(bundleResult.hasJsonLd).toBe(true);
  41 |     expect(bundleResult.hasGoogleFonts).toBe(true);
  42 |     expect(bundleResult.hasCss).toBe(true);
  43 |     expect(bundleResult.nodeCount).toBeGreaterThan(0);
  44 |     expect(bundleResult.sectionCount).toBeGreaterThan(0);
  45 |   });
  46 | 
  47 |   test('2. Publish Modal opens and displays live edge export metrics', async ({ page }) => {
  48 |     // Click Publish button on top bar
  49 |     const publishBtn = page.locator('#sz-publish-btn').first();
  50 |     await publishBtn.waitFor({ state: 'visible', timeout: 5000 });
  51 |     await publishBtn.click();
  52 | 
  53 |     // Verify Publish modal appears
  54 |     const publishModal = page.locator('#sz-publish-modal-container').first();
  55 |     await publishModal.waitFor({ state: 'visible', timeout: 8000 });
  56 | 
  57 |     // Verify modal elements: canonical domain or export actions
  58 |     await expect(publishModal).toBeVisible();
  59 | 
  60 |     // Close publish modal with Escape
  61 |     await page.keyboard.press('Escape');
  62 |     await expect(publishModal).not.toBeVisible();
  63 |   });
  64 | });
  65 | 
```