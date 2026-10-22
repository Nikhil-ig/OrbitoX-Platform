import { test, expect } from '@playwright/test';
import * as path from 'path';

const ARTIFACTS_DIR = '/Users/apple/.gemini/antigravity-ide/brain/815297d3-01e6-492f-9259-3903dd5f3b53';

test.describe('P26.1 Visual Capture Suite', () => {
  test('Capture all 5 P26.1 creative suite features', async ({ page }) => {
    // Set 1440x900 viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/admin/template-studio?template=saas-nextgen', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#sz-top-bar, .orbitox-studio-zero, [data-testid="template-studio"]', { timeout: 25000 });

    // Screenshot 1: Desktop Creative Studio Canvas Overview
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'p26_1_studio_overview.png') });

    // Feature 1: Universal Add Command Center
    const addRailBtn = page.locator('#sz-rail-btn-add');
    if (await addRailBtn.isVisible()) {
      await addRailBtn.click();
    } else {
      await page.keyboard.press('a');
    }
    const commandCenter = page.locator('#sz-universal-add-command-center');
    await expect(commandCenter).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'p26_1_universal_add_palette.png') });
    await page.keyboard.press('Escape');
    await expect(commandCenter).not.toBeVisible();

    // Feature 2: Template Marketplace & Multi-Device Live Preview
    const templatesBtn = page.locator('#sz-rail-btn-templates');
    await templatesBtn.click();
    const marketplace = page.locator('#sz-template-marketplace-modal');
    await expect(marketplace).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'p26_1_template_marketplace.png') });

    const previewBtn = marketplace.getByRole('button', { name: 'Preview Live' }).first();
    await previewBtn.click();
    const livePreviewModal = page.locator('#sz-live-template-preview-modal');
    await expect(livePreviewModal).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'p26_1_live_template_preview_desktop.png') });

    // Switch to Tablet preview
    const tabletView = livePreviewModal.getByRole('button', { name: 'Tablet', exact: true });
    await tabletView.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'p26_1_live_template_preview_tablet.png') });

    // Close preview / marketplace
    await page.keyboard.press('Escape');

    // Feature 3: Universal 3-Step Creative Intake Modal
    const importBtn = page.locator('button:has-text("Import")').first();
    await importBtn.click();
    const intakeModal = page.locator('#sz-creative-intake-modal');
    await expect(intakeModal).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'p26_1_creative_intake_modal.png') });
    const closeBtn = page.locator('#sz-creative-intake-close-btn');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await expect(intakeModal).not.toBeVisible();

    // Feature 4: CMS Collections & Canvas Repeaters in Data Panel
    const dataRailBtn = page.locator('#sz-rail-btn-data');
    await dataRailBtn.click();
    const dataPanel = page.locator('#sz-data-panel');
    await expect(dataPanel).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'p26_1_cms_collections_panel.png') });
    const closeDataBtn = dataPanel.locator('button[title="Close panel"]');
    await closeDataBtn.click();

    // Feature 5: Interactive Box Model & Corner Radius
    const node = page.locator('[data-node-id]').first();
    if (await node.isVisible()) {
      await node.click();
      const propertiesPanel = page.locator('#sz-properties-panel');
      if (await propertiesPanel.isVisible()) {
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'p26_1_box_model_corner_radius.png') });
      }
    }
  });
});
