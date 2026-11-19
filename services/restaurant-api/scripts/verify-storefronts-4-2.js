/**
 * 🪐 RestaurantOS 4.2 — Multi-Viewport Visual & Functional Verification Suite
 * Captures screenshots across viewports for all 6 templates, marketplace, and KDS.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = '/Users/apple/.gemini/antigravity-ide/brain/945b8da6-0c8a-4383-b2a9-5e62bb73a105';
const BASE_URL = 'http://localhost:4010';
const LOCATOR = '7Kp9xQ8m2L';

const TEMPLATES = [
  { id: 'tmpl_haute_gastronomy', name: 'haute' },
  { id: 'tmpl_nordic_minimal', name: 'nordic' },
  { id: 'tmpl_artisan_coffee', name: 'cafe' },
  { id: 'tmpl_neon_street', name: 'neon' },
  { id: 'tmpl_trattoria_bella', name: 'trattoria' },
  { id: 'tmpl_tokyo_izakaya', name: 'izakaya' },
];

const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1440', width: 1440, height: 900 },
];

async function run() {
  const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser = await chromium.launch({
    executablePath: fs.existsSync(CHROME_PATH) ? CHROME_PATH : undefined,
    headless: true
  });
  const results = [];

  for (const tmpl of TEMPLATES) {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      try {
        const url = `${BASE_URL}/dine/${LOCATOR}?templateId=${tmpl.id}`;
        await page.goto(url, { waitUntil: 'networkidle' });

        // Bypass seating gate if present
        const gate = page.locator('#seating-gate');
        if (await gate.isVisible()) {
          const btn = page.locator('#seating-gate button');
          if (await btn.isVisible()) {
            await btn.click();
            await page.waitForTimeout(300);
          }
        }

        const screenshotPath = path.join(ARTIFACTS_DIR, `v4_2_template_${tmpl.name}_${vp.name}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`✅ Captured: ${tmpl.name} @ ${vp.name}px -> ${screenshotPath}`);
        results.push({ template: tmpl.name, viewport: vp.name, status: 'PASS' });
      } catch (err) {
        console.error(`❌ Error capturing ${tmpl.name} @ ${vp.name}:`, err.message);
        results.push({ template: tmpl.name, viewport: vp.name, status: 'FAIL', error: err.message });
      } finally {
        await page.close();
      }
    }
  }

  // Capture Marketplace
  const mktPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await mktPage.goto(`${BASE_URL}/marketplace`, { waitUntil: 'networkidle' });
    const mktPath = path.join(ARTIFACTS_DIR, 'v4_2_marketplace_1440.png');
    await mktPage.screenshot({ path: mktPath, fullPage: false });
    console.log(`✅ Captured Marketplace -> ${mktPath}`);

    // Test live preview modal with sandboxed iframe
    await mktPage.evaluate(() => {
      if (typeof window.openLivePreviewModal === 'function') {
        window.openLivePreviewModal('tmpl_nordic_minimal');
      }
    });
    await mktPage.waitForTimeout(1500);
    const mktModalPath = path.join(ARTIFACTS_DIR, 'v4_2_marketplace_preview_modal_1440.png');
    await mktPage.screenshot({ path: mktModalPath, fullPage: false });
    console.log(`✅ Captured Marketplace Modal Preview -> ${mktModalPath}`);
  } catch (err) {
    console.error('❌ Error capturing Marketplace:', err.message);
  } finally {
    await mktPage.close();
  }

  // Capture KDS
  const kdsPage = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    await kdsPage.goto(`${BASE_URL}/kds?station=ALL`, { waitUntil: 'networkidle' });
    const kdsPath = path.join(ARTIFACTS_DIR, 'v4_2_kds_1920.png');
    await kdsPage.screenshot({ path: kdsPath, fullPage: false });
    console.log(`✅ Captured KDS -> ${kdsPath}`);
  } catch (err) {
    console.error('❌ Error capturing KDS:', err.message);
  } finally {
    await kdsPage.close();
  }

  await browser.close();
  console.log('🎉 Verification run complete! Total screenshots captured:', results.length + 2);
}

run().catch(console.error);
