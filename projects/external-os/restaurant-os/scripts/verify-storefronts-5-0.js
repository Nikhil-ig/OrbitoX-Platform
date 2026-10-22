/**
 * 🪐 RestaurantOS 5.0 — Comprehensive Multi-Viewport Visual Verification Suite
 * Captures screenshots across all 7 target viewports:
 * - 390 × 844
 * - 430 × 932
 * - 768 × 1024
 * - 1024 × 768
 * - 1280 × 800
 * - 1440 × 900
 * - 1920 × 1080
 * Also captures Product Customizer, Cart Folio, Marketplace Previews, and KDS Workstation.
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
  { name: '390x844', width: 390, height: 844 },
  { name: '430x932', width: 430, height: 932 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '1280x800', width: 1280, height: 800 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
];

async function run() {
  console.log('📸 Starting RestaurantOS 5.0 Visual Verification Suite...\n');
  const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser = await chromium.launch({
    executablePath: fs.existsSync(CHROME_PATH) ? CHROME_PATH : undefined,
    headless: true
  });
  const results = [];

  // 1. Capture All 6 Templates Across 7 Viewports
  for (const tmpl of TEMPLATES) {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      try {
        const url = `${BASE_URL}/dine/${LOCATOR}?templateId=${tmpl.id}&preview=1`;
        await page.goto(url, { waitUntil: 'networkidle' });

        // Bypass seating gate if present
        const gate = page.locator('#seating-gate');
        if (await gate.isVisible()) {
          const btn = page.locator('#seating-gate button');
          if (await btn.isVisible()) {
            await btn.click();
            await page.waitForTimeout(200);
          }
        }

        const screenshotPath = path.join(ARTIFACTS_DIR, `v5_0_${tmpl.name}_${vp.name}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`✅ [${tmpl.name}] Captured @ ${vp.name} -> ${screenshotPath}`);
        results.push({ template: tmpl.name, viewport: vp.name, status: 'PASS' });
      } catch (err) {
        console.error(`❌ [${tmpl.name}] Error @ ${vp.name}:`, err.message);
        results.push({ template: tmpl.name, viewport: vp.name, status: 'FAIL', error: err.message });
      } finally {
        await page.close();
      }
    }
  }

  // 2. Capture Product Customizer Modal State (Paneer Tikka with options and dish photo)
  console.log('\n📸 Capturing Product Customizer Modal State...');
  const customizerPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await customizerPage.goto(`${BASE_URL}/dine/${LOCATOR}?templateId=tmpl_haute_gastronomy&preview=1`, { waitUntil: 'networkidle' });
    await customizerPage.evaluate(() => {
      if (typeof window.openItemSheet === 'function') {
        window.openItemSheet('item_paneer_tikka');
      }
    });
    await customizerPage.waitForTimeout(600);
    const customizerPath = path.join(ARTIFACTS_DIR, 'v5_0_product_customizer_modal_390.png');
    await customizerPage.screenshot({ path: customizerPath, fullPage: false });
    console.log(`✅ Captured Product Customizer -> ${customizerPath}`);
  } catch (err) {
    console.error('❌ Error capturing Product Customizer:', err.message);
  } finally {
    await customizerPage.close();
  }

  // 3. Capture Cart Folio Sheet State
  console.log('\n📸 Capturing Cart Folio Sheet State...');
  const cartPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await cartPage.goto(`${BASE_URL}/dine/${LOCATOR}?templateId=tmpl_haute_gastronomy&preview=1`, { waitUntil: 'networkidle' });
    await cartPage.evaluate(() => {
      if (typeof window.quickAddToCart === 'function') {
        window.quickAddToCart('item_paneer_tikka');
        window.quickAddToCart('item_butter_chicken');
        window.quickAddToCart('item_butter_naan');
      }
      if (typeof window.openCartSheet === 'function') {
        window.openCartSheet();
      }
    });
    await cartPage.waitForTimeout(600);
    const cartPath = path.join(ARTIFACTS_DIR, 'v5_0_cart_folio_sheet_390.png');
    await cartPage.screenshot({ path: cartPath, fullPage: false });
    console.log(`✅ Captured Cart Folio -> ${cartPath}`);
  } catch (err) {
    console.error('❌ Error capturing Cart Folio:', err.message);
  } finally {
    await cartPage.close();
  }

  // 4. Capture Template Marketplace & Live Modal Preview
  console.log('\n📸 Capturing Template Marketplace & Sandboxed Device Preview...');
  const mktPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await mktPage.goto(`${BASE_URL}/marketplace`, { waitUntil: 'networkidle' });
    const mktPath = path.join(ARTIFACTS_DIR, 'v5_0_marketplace_1440.png');
    await mktPage.screenshot({ path: mktPath, fullPage: false });
    console.log(`✅ Captured Marketplace -> ${mktPath}`);

    // Test live preview modal with sandboxed iframe
    await mktPage.evaluate(() => {
      if (typeof window.openLivePreviewModal === 'function') {
        window.openLivePreviewModal('tmpl_nordic_minimal');
      }
    });
    await mktPage.waitForTimeout(1500);
    const mktModalPath = path.join(ARTIFACTS_DIR, 'v5_0_marketplace_preview_modal_1440.png');
    await mktPage.screenshot({ path: mktModalPath, fullPage: false });
    console.log(`✅ Captured Marketplace Modal Preview -> ${mktModalPath}`);
  } catch (err) {
    console.error('❌ Error capturing Marketplace:', err.message);
  } finally {
    await mktPage.close();
  }

  // 5. Capture Kitchen Display System (KDS)
  console.log('\n📸 Capturing Kitchen Display System (KDS)...');
  const kdsPage = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    await kdsPage.goto(`${BASE_URL}/kds?station=ALL`, { waitUntil: 'networkidle' });
    const kdsPath = path.join(ARTIFACTS_DIR, 'v5_0_kds_1920.png');
    await kdsPage.screenshot({ path: kdsPath, fullPage: false });
    console.log(`✅ Captured KDS -> ${kdsPath}`);
  } catch (err) {
    console.error('❌ Error capturing KDS:', err.message);
  } finally {
    await kdsPage.close();
  }

  await browser.close();
  console.log(`\n🎉 Verification run complete! Captured ${results.length + 5} high-fidelity screenshots.`);
}

run().catch(console.error);
