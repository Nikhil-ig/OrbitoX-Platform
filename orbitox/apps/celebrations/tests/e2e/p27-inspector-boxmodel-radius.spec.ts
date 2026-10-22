import { test, expect } from '@playwright/test';

test.describe('P27 Inspector, Box Model, Corner Radius & Typography E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/admin/template-studio?template=saas-nextgen', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#sz-top-bar, .orbitox-studio-zero', { timeout: 20000 });
  });

  test('1. Box Model updates rendered DOM padding and margin visibly', async ({ page }) => {
    // Select heading text node
    const heading = page.locator('[data-node-id="node_hero_title"]').first();
    await heading.click();
    await page.waitForSelector('#sz-properties-panel', { timeout: 5000 });

    // Find BoxModel padding-top pill and double click to edit
    const padTopPill = page.locator('[data-testid="boxmodel-pill-padding-top"]').first();
    await padTopPill.waitFor({ state: 'visible', timeout: 5000 });
    await padTopPill.dblclick();

    // Type new padding value '24' into input and press Enter
    const padTopInput = page.locator('[data-testid="boxmodel-input-padding-top"]').first();
    await padTopInput.waitFor({ state: 'visible', timeout: 3000 });
    await padTopInput.fill('24');
    await padTopInput.press('Enter');

    // Wait for DOM update
    await page.waitForTimeout(300);

    // Verify rendered DOM node computed style has 24px padding-top
    const computedPadTop = await heading.evaluate((el) => window.getComputedStyle(el).paddingTop);
    expect(computedPadTop).toBe('24px');

    // Test Margin Left update
    const marginLeftPill = page.locator('[data-testid="boxmodel-pill-margin-left"]').first();
    await marginLeftPill.dblclick();
    const marginLeftInput = page.locator('[data-testid="boxmodel-input-margin-left"]').first();
    await marginLeftInput.waitFor({ state: 'visible', timeout: 3000 });
    await marginLeftInput.fill('32');
    await marginLeftInput.press('Enter');

    await page.waitForTimeout(300);
    const computedMarginLeft = await heading.evaluate((el) => window.getComputedStyle(el).marginLeft);
    expect(computedMarginLeft).toBe('32px');
  });

  test('2. Corner Radius presets visibly update Button DOM borderRadius', async ({ page }) => {
    // Select the CTA Button
    const buttonNode = page.locator('[data-node-id="node_hero_cta_btn"]').first();
    await buttonNode.click();
    await page.waitForSelector('#sz-properties-panel', { timeout: 5000 });

    // Verify CornerRadiusControl is mounted
    const radiusPreview = page.locator('[data-testid="radius-preview"]').first();
    await radiusPreview.waitFor({ state: 'visible', timeout: 5000 });

    // Click 16px preset
    const preset16 = page.locator('[data-testid="radius-preset-16"]').first();
    await preset16.click();
    await page.waitForTimeout(300);

    // Check button computed style
    let radius = await buttonNode.evaluate((el) => window.getComputedStyle(el).borderRadius);
    expect(radius).toBe('16px');

    // Click Pill preset (9999px)
    const presetPill = page.locator('[data-testid="radius-preset-pill"]').first();
    await presetPill.click();
    await page.waitForTimeout(300);

    radius = await buttonNode.evaluate((el) => window.getComputedStyle(el).borderRadius);
    expect(parseInt(radius)).toBeGreaterThanOrEqual(20); // Computed cap based on button height

    // Click 0px (sharp)
    const preset0 = page.locator('[data-testid="radius-preset-0"]').first();
    await preset0.click();
    await page.waitForTimeout(300);

    radius = await buttonNode.evaluate((el) => window.getComputedStyle(el).borderRadius);
    expect(radius).toBe('0px');
  });

  test('3. Independent Corner Radius editing updates asymmetric corners', async ({ page }) => {
    const buttonNode = page.locator('[data-node-id="node_hero_cta_btn"]').first();
    await buttonNode.click();
    await page.waitForSelector('#sz-properties-panel', { timeout: 5000 });

    // Toggle link mode to independent
    const linkToggle = page.locator('[data-testid="radius-link-toggle"]').first();
    await linkToggle.click();
    await page.waitForTimeout(200);

    // Double-click Top-Left corner scrubber to edit
    const tlScrub = page.locator('[data-testid="radius-scrub-tl"]').first();
    await tlScrub.dblclick();

    const tlInput = page.locator('[data-testid="radius-input-tl"]').first();
    await tlInput.waitFor({ state: 'visible', timeout: 3000 });
    await tlInput.fill('28');
    await tlInput.press('Enter');

    await page.waitForTimeout(300);

    // Double-click Bottom-Right corner scrubber to edit
    const brScrub = page.locator('[data-testid="radius-scrub-br"]').first();
    await brScrub.dblclick();

    const brInput = page.locator('[data-testid="radius-input-br"]').first();
    await brInput.waitFor({ state: 'visible', timeout: 3000 });
    await brInput.fill('28');
    await brInput.press('Enter');

    await page.waitForTimeout(300);

    // Verify rendered DOM node has asymmetric border radii
    const radii = await buttonNode.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        tl: style.borderTopLeftRadius,
        tr: style.borderTopRightRadius,
        br: style.borderBottomRightRadius,
        bl: style.borderBottomLeftRadius,
      };
    });

    expect(radii.tl).toBe('28px');
    expect(radii.br).toBe('28px');
  });

  test('4. Typography font family change updates rendered font instantly', async ({ page }) => {
    const heading = page.locator('[data-node-id="node_hero_title"]').first();
    await heading.click();
    await page.waitForSelector('#sz-properties-panel', { timeout: 5000 });

    // Find font family dropdown
    const fontSelect = page.locator('#sz-properties-panel select').filter({ hasText: 'Inter (Sans)' }).first();
    await fontSelect.waitFor({ state: 'visible', timeout: 5000 });

    // Select Playfair Display
    await fontSelect.selectOption({ label: 'Playfair Display (Serif)' });
    await page.waitForTimeout(300);

    // Verify computed fontFamily on the rendered DOM element
    const computedFont = await heading.evaluate((el) => window.getComputedStyle(el).fontFamily);
    expect(computedFont.toLowerCase()).toContain('playfair display');
  });
});
