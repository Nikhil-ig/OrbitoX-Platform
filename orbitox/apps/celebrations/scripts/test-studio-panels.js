const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testStudioPanels() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });
  const context = await browser.newContext({
    viewport: { width: 1680, height: 960 },
  });
  const page = await context.newPage();
  const dir = '/Users/apple/.gemini/antigravity-ide/brain/e1945eb2-f0c9-4854-913d-b4ee9b26219a/screenshots';

  try {
    await page.goto('http://localhost:3010/admin/template-studio', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // 1. Open layers drawer
    const layersBtn = page.locator('button[title*="Layers"]').first();
    await layersBtn.click();
    await page.waitForTimeout(600);

    // 2. Select 'Celebration Title' layer
    const titleLayer = page.locator('text=Celebration Title').first();
    if (await titleLayer.count() > 0) {
      await titleLayer.click();
      await page.waitForTimeout(800);
    }
    await page.screenshot({ path: path.join(dir, '14_selected_node_inspector.png') });
    console.log('✅ 14_selected_node_inspector.png captured');

    // 3. Open Pages Panel
    const pagesBtn = page.locator('button[title*="Pages"]').first();
    await pagesBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(dir, '15_pages_panel.png') });
    console.log('✅ 15_pages_panel.png captured');

    // 4. Open Assets Panel
    const assetsBtn = page.locator('button[title*="Assets"]').first();
    await assetsBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(dir, '16_assets_panel.png') });
    console.log('✅ 16_assets_panel.png captured');

    // 5. Open Components Panel
    const compBtn = page.locator('button[title*="Components"]').first();
    await compBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(dir, '17_components_panel.png') });
    console.log('✅ 17_components_panel.png captured');

    // 6. Open Data Panel
    const dataBtn = page.locator('button[title*="Data"]').first();
    await dataBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(dir, '18_data_panel.png') });
    console.log('✅ 18_data_panel.png captured');

    // 7. Open Remix Modal
    const remixBtn = page.locator('button:has-text("Remix")').first();
    if (await remixBtn.count() > 0) {
      await remixBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(dir, '19_remix_modal.png') });
      console.log('✅ 19_remix_modal.png captured');
      // close modal
      const closeBtn = page.locator('button:has-text("Keep Original")').first();
      if (await closeBtn.count() > 0) await closeBtn.click();
      await page.waitForTimeout(400);
    }

    // 8. Open Shortcuts Modal
    const shortcutsBtn = page.locator('button[title*="Shortcuts"]').first();
    await shortcutsBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(dir, '20_shortcuts_modal.png') });
    console.log('✅ 20_shortcuts_modal.png captured');

    console.log('🎉 ALL PANEL & INSPECTOR TESTS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('Error during testing:', err);
  } finally {
    await browser.close();
  }
}

testStudioPanels();
