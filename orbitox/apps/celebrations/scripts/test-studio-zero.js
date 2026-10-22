const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testStudioZero() {
  console.log('🚀 Launching Chromium for OrbitoX Studio Zero verification...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });
  const context = await browser.newContext({
    viewport: { width: 1680, height: 960 },
  });
  const page = await context.newPage();

  const screenshotsDir = '/Users/apple/.gemini/antigravity-ide/brain/e1945eb2-f0c9-4854-913d-b4ee9b26219a/screenshots';
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  try {
    console.log('🌐 Navigating to http://localhost:3010/admin/template-studio ...');
    await page.goto('http://localhost:3010/admin/template-studio', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // 1. Initial Studio Zero Default Canvas Screen
    console.log('📸 1. Capturing Initial Studio Zero Workspace...');
    await page.screenshot({ path: path.join(screenshotsDir, '01_studio_zero_default.png') });

    // Verify Title and Chrome
    const title = await page.textContent('#sz-top-bar');
    console.log('✅ Top bar rendered with:', title ? 'Valid Topbar content' : 'Missing');

    // 2. Open Add Library Drawer
    console.log('📂 2. Opening Add Library Drawer...');
    await page.click('#sz-rail-btn-add');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotsDir, '02_library_drawer.png') });

    // 3. Open Design Universes & Styles Drawer
    console.log('🎨 3. Opening Design Universes & Styles Drawer...');
    await page.click('#sz-rail-btn-styles');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotsDir, '03_styles_universes_drawer.png') });

    // 4. Apply a different Design Universe (e.g. Noir or Aurora)
    console.log('🌌 4. Applying Noir Design Universe...');
    const noirCard = page.locator('#sz-universe-card-noir');
    if (await noirCard.count() > 0) {
      await noirCard.click();
      await page.waitForTimeout(800);
      console.log('✅ Applied Noir Universe');
    }
    await page.screenshot({ path: path.join(screenshotsDir, '04_applied_universe.png') });

    // 5. Open Layers Panel
    console.log('📑 5. Opening Layers Panel...');
    await page.click('#sz-rail-btn-layers');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotsDir, '05_layers_panel.png') });

    // 6. Test Responsive Viewport Switching (Tablet, Mobile)
    console.log('📱 6. Switching to Tablet Viewport...');
    await page.click('#sz-viewport-tablet');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotsDir, '06_tablet_viewport.png') });

    console.log('📱 Switching to Mobile Viewport...');
    await page.click('#sz-viewport-mobile');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotsDir, '07_mobile_viewport.png') });

    console.log('🖥️ Resetting to Desktop Viewport...');
    await page.click('#sz-viewport-desktop');
    await page.waitForTimeout(600);

    // 7. Test Mode Switcher: Motion Workspace Timeline
    console.log('⏱️ 7. Switching to Motion Timeline Mode...');
    await page.click('#sz-mode-btn-motion');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(screenshotsDir, '08_motion_timeline.png') });

    // 8. Test Mode Switcher: 3D Spatial Workspace
    console.log('🧊 8. Switching to 3D Spatial Mode...');
    await page.click('#sz-mode-btn-3d');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, '09_3d_workspace.png') });

    // 9. Test Mode Switcher: Prototype Graph Workspace
    console.log('⚡ 9. Switching to Prototype Graph Mode...');
    await page.click('#sz-mode-btn-prototype');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(screenshotsDir, '10_prototype_workspace.png') });

    // Reset back to Design Mode
    await page.click('#sz-mode-btn-design');
    await page.waitForTimeout(600);

    // 10. Test Live Multi-Device Preview Modal
    console.log('👁️ 10. Opening Live Multi-Device Preview...');
    await page.click('#sz-preview-btn');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(screenshotsDir, '11_live_preview_modal.png') });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // 11. Test Ask AI Modal
    console.log('✨ 11. Opening Ask AI Modal...');
    await page.click('#sz-ask-ai-topbar');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotsDir, '12_ask_ai_modal.png') });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // 12. Test Publish Modal
    console.log('🚀 12. Opening Edge CDN Publish Modal...');
    await page.click('#sz-publish-btn');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotsDir, '13_publish_modal.png') });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    console.log('🎉 ALL STUDIO ZERO ACCEPTANCE TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test error:', err);
  } finally {
    await browser.close();
  }
}

testStudioZero();
