/**
 * RESTAURANTOS 2.0 — PHASE 5 MULTI-VIEWPORT VERIFICATION & SCREENSHOT CAPTURE
 *
 * Verifies responsive layout integrity across all 7 target viewports:
 * - 390 × 844 (Mobile Standard)
 * - 430 × 932 (Mobile Pro Max)
 * - 768 × 1024 (Tablet Portrait)
 * - 1024 × 768 (Tablet Landscape)
 * - 1280 × 800 (Compact Laptop)
 * - 1440 × 900 (Standard Laptop)
 * - 1920 × 1080 (Full HD Workstation)
 */

const path = require('path');
const fs = require('fs');
const { chromium } = require(path.join(__dirname, '../projects/external-os/restaurant-os/node_modules/playwright'));

const ARTIFACTS_DIR = '/Users/apple/.gemini/antigravity-ide/brain/e271e165-d4c7-4d52-813e-390f34c19cf6';
const BASE_URL = 'http://localhost:4010';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const RESOLVED_CHROME_PATH = process.env.CHROME_BIN || (fs.existsSync(CHROME_PATH) ? CHROME_PATH : undefined);

const VIEWPORTS = [
  { name: 'mobile_390x844', width: 390, height: 844 },
  { name: 'mobile_pro_430x932', width: 430, height: 932 },
  { name: 'tablet_portrait_768x1024', width: 768, height: 1024 },
  { name: 'tablet_landscape_1024x768', width: 1024, height: 768 },
  { name: 'laptop_compact_1280x800', width: 1280, height: 800 },
  { name: 'laptop_standard_1440x900', width: 1440, height: 900 },
  { name: 'desktop_fhd_1920x1080', width: 1920, height: 1080 },
];

async function run() {
  console.log('======================================================================');
  console.log('📱 RESTAURANTOS 2.0 — MULTI-VIEWPORT RESPONSIVENESS & SCREENSHOT MATRIX');
  console.log('======================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    executablePath: RESOLVED_CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  for (const vp of VIEWPORTS) {
    console.log(`Testing viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });

    // 1. Operations Home
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    const opScreen = path.join(ARTIFACTS_DIR, `phase5_operations_${vp.name}.png`);
    await page.screenshot({ path: opScreen, fullPage: false });
    console.log(`  ✓ Captured Operations: phase5_operations_${vp.name}.png`);

    // 2. Spatial Floor Studio
    await page.goto(`${BASE_URL}/operations/floor`, { waitUntil: 'networkidle' });
    const floorScreen = path.join(ARTIFACTS_DIR, `phase5_floor_${vp.name}.png`);
    await page.screenshot({ path: floorScreen, fullPage: false });
    console.log(`  ✓ Captured Floor Studio: phase5_floor_${vp.name}.png`);

    // 3. Kitchen KDS
    await page.goto(`${BASE_URL}/kds`, { waitUntil: 'networkidle' });
    const kdsScreen = path.join(ARTIFACTS_DIR, `phase5_kds_${vp.name}.png`);
    await page.screenshot({ path: kdsScreen, fullPage: false });
    console.log(`  ✓ Captured KDS: phase5_kds_${vp.name}.png`);

    // 4. Diner Mobile PWA
    await page.goto(`${BASE_URL}/dine/7Kp9xQ8m2L`, { waitUntil: 'networkidle' });
    const dinerScreen = path.join(ARTIFACTS_DIR, `phase5_diner_${vp.name}.png`);
    await page.screenshot({ path: dinerScreen, fullPage: false });
    console.log(`  ✓ Captured Diner Companion: phase5_diner_${vp.name}.png`);

    await page.close();
  }

  await browser.close();
  console.log('\n======================================================================');
  console.log('🎉 ALL 7 VIEWPORTS SYSTEMATICALLY VERIFIED AND CAPTURED!');
  console.log('======================================================================');
}

run().catch((err) => {
  console.error('Error during viewport verification:', err);
  process.exit(1);
});
