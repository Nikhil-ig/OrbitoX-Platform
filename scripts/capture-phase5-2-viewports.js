const path = require('path');
const fs = require('fs');
const { chromium } = require(path.join(__dirname, '../projects/external-os/restaurant-os/node_modules/playwright'));

const ARTIFACTS_DIR = '/Users/apple/.gemini/antigravity-ide/brain/945b8da6-0c8a-4383-b2a9-5e62bb73a105';
const BASE_URL = 'http://localhost:4010';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const RESOLVED_CHROME_PATH = process.env.CHROME_BIN || (fs.existsSync(CHROME_PATH) ? CHROME_PATH : undefined);

async function checkOverflow(page, label) {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
  if (hasOverflow) {
    console.warn(`  ⚠️ Warning: Horizontal overflow detected on ${label}!`);
  } else {
    console.log(`  ✅ Clean viewport layout (0 horizontal overflow) on ${label}`);
  }
}

async function run() {
  console.log('🚀 Starting RestaurantOS 5.2 Multi-Viewport Capture & Responsive Audit...');
  
  const browser = await chromium.launch({
    headless: true,
    executablePath: RESOLVED_CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  // 1. Viewport 390 x 844 (Standard Phone - iPhone 14/15)
  console.log('\n📱 Viewport: 390 x 844 (Mobile Phone)');
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    
    // CraveAtlas Mobile
    await page.goto(`${BASE_URL}/apps/crave-atlas`, { waitUntil: 'networkidle' });
    await checkOverflow(page, 'CraveAtlas @ 390x844');
    const caMobilePath = path.join(ARTIFACTS_DIR, 'v5_2_craveatlas_390x844.png');
    await page.screenshot({ path: caMobilePath, fullPage: false });
    console.log(`  📸 Saved: ${caMobilePath}`);

    // SwiftBite Mobile
    await page.goto(`${BASE_URL}/apps/swift-bite`, { waitUntil: 'networkidle' });
    await checkOverflow(page, 'SwiftBite @ 390x844');
    const sbMobilePath = path.join(ARTIFACTS_DIR, 'v5_2_swiftbite_390x844.png');
    await page.screenshot({ path: sbMobilePath, fullPage: false });
    console.log(`  📸 Saved: ${sbMobilePath}`);

    // SwiftBite with customizer open
    const custBtn = await page.$('.sb-dish-card[data-id="dish_biryani_gosht"] .sb-quick-add-btn');
    if (custBtn) {
      await custBtn.click();
      await page.waitForTimeout(400);
      const sbCustomizerPath = path.join(ARTIFACTS_DIR, 'v5_2_swiftbite_customizer_390x844.png');
      await page.screenshot({ path: sbCustomizerPath, fullPage: false });
      console.log(`  📸 Saved: ${sbCustomizerPath}`);
    }

    await page.close();
  }

  // 2. Viewport 430 x 932 (Large Phone - iPhone 15 Pro Max)
  console.log('\n📱 Viewport: 430 x 932 (Large Phone)');
  {
    const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
    
    // CraveAtlas with Delhi CP Branch selected (Late Night & Price Overrides)
    await page.goto(`${BASE_URL}/apps/crave-atlas?branch=branch_del`, { waitUntil: 'networkidle' });
    await checkOverflow(page, 'CraveAtlas Delhi Branch @ 430x932');
    const caDelhiPath = path.join(ARTIFACTS_DIR, 'v5_2_craveatlas_delhi_430x932.png');
    await page.screenshot({ path: caDelhiPath, fullPage: false });
    console.log(`  📸 Saved: ${caDelhiPath}`);

    // SwiftBite with Chandigarh Branch (86'd items badge)
    await page.goto(`${BASE_URL}/apps/swift-bite?branch=branch_chd`, { waitUntil: 'networkidle' });
    await checkOverflow(page, 'SwiftBite Chandigarh Branch @ 430x932');
    const sbChdPath = path.join(ARTIFACTS_DIR, 'v5_2_swiftbite_chandigarh_430x932.png');
    await page.screenshot({ path: sbChdPath, fullPage: false });
    console.log(`  📸 Saved: ${sbChdPath}`);

    // PantryRush Single-Brand Dark-Store Pantry
    await page.goto(`${BASE_URL}/apps/pantry-rush`, { waitUntil: 'networkidle' });
    await checkOverflow(page, 'PantryRush @ 430x932');
    const prPath = path.join(ARTIFACTS_DIR, 'v5_2_pantryrush_430x932.png');
    await page.screenshot({ path: prPath, fullPage: false });
    console.log(`  📸 Saved: ${prPath}`);

    await page.close();
  }

  // 3. Viewport 768 x 1024 (Tablet Portrait - iPad Mini / Air)
  console.log('\n📟 Viewport: 768 x 1024 (Tablet Portrait)');
  {
    const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });
    
    // CraveAtlas Tablet Portrait
    await page.goto(`${BASE_URL}/apps/crave-atlas`, { waitUntil: 'networkidle' });
    await checkOverflow(page, 'CraveAtlas @ 768x1024');
    const caTabletPortPath = path.join(ARTIFACTS_DIR, 'v5_2_craveatlas_768x1024.png');
    await page.screenshot({ path: caTabletPortPath, fullPage: false });
    console.log(`  📸 Saved: ${caTabletPortPath}`);

    // Menu Workspace Overrides Tab on Tablet
    await page.goto(`${BASE_URL}/menu`, { waitUntil: 'networkidle' });
    await page.click('#tab-btn-overrides');
    await page.waitForTimeout(300);
    await checkOverflow(page, 'Menu Overrides Workspace @ 768x1024');
    const menuTabPortPath = path.join(ARTIFACTS_DIR, 'v5_2_menu_overrides_768x1024.png');
    await page.screenshot({ path: menuTabPortPath, fullPage: false });
    console.log(`  📸 Saved: ${menuTabPortPath}`);

    await page.close();
  }

  // 4. Viewport 1024 x 768 (Tablet Landscape)
  console.log('\n📟 Viewport: 1024 x 768 (Tablet Landscape)');
  {
    const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
    
    // CraveAtlas Tablet Landscape
    await page.goto(`${BASE_URL}/apps/crave-atlas`, { waitUntil: 'networkidle' });
    await checkOverflow(page, 'CraveAtlas @ 1024x768');
    const caTabletLandPath = path.join(ARTIFACTS_DIR, 'v5_2_craveatlas_1024x768.png');
    await page.screenshot({ path: caTabletLandPath, fullPage: false });
    console.log(`  📸 Saved: ${caTabletLandPath}`);

    // KDS Kitchen Display System routed for Delhi Branch
    await page.goto(`${BASE_URL}/kds?branch=branch_del`, { waitUntil: 'networkidle' });
    await checkOverflow(page, 'KDS Delhi @ 1024x768');
    const kdsTabletLandPath = path.join(ARTIFACTS_DIR, 'v5_2_kds_delhi_1024x768.png');
    await page.screenshot({ path: kdsTabletLandPath, fullPage: false });
    console.log(`  📸 Saved: ${kdsTabletLandPath}`);

    await page.close();
  }

  // 5. Viewport 1280 x 800 (Small Desktop / MacBook Air 13)
  console.log('\n💻 Viewport: 1280 x 800 (Small Desktop)');
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    
    // CraveAtlas Small Desktop with Cart Drawer Open
    await page.goto(`${BASE_URL}/apps/crave-atlas`, { waitUntil: 'networkidle' });
    const addBtn = await page.$('.ca-add-btn:not([disabled])');
    if (addBtn) await addBtn.click();
    await page.waitForTimeout(200);
    await page.click('#ca-cart-trigger');
    await page.waitForTimeout(300);
    await checkOverflow(page, 'CraveAtlas Cart Drawer @ 1280x800');
    const caSmallDeskPath = path.join(ARTIFACTS_DIR, 'v5_2_craveatlas_cart_drawer_1280x800.png');
    await page.screenshot({ path: caSmallDeskPath, fullPage: false });
    console.log(`  📸 Saved: ${caSmallDeskPath}`);

    await page.close();
  }

  // 6. Viewport 1440 x 900 (Standard Desktop / MacBook Pro 15)
  console.log('\n🖥️ Viewport: 1440 x 900 (Standard Desktop)');
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    
    // CraveAtlas Flagship Desktop
    await page.goto(`${BASE_URL}/apps/crave-atlas`, { waitUntil: 'networkidle' });
    await checkOverflow(page, 'CraveAtlas Desktop @ 1440x900');
    const caDeskPath = path.join(ARTIFACTS_DIR, 'v5_2_craveatlas_flagship_1440x900.png');
    await page.screenshot({ path: caDeskPath, fullPage: false });
    console.log(`  📸 Saved: ${caDeskPath}`);

    // SwiftBite Desktop (2-Column Folio View)
    await page.goto(`${BASE_URL}/apps/swift-bite`, { waitUntil: 'networkidle' });
    await checkOverflow(page, 'SwiftBite Desktop @ 1440x900');
    const sbDeskPath = path.join(ARTIFACTS_DIR, 'v5_2_swiftbite_desktop_1440x900.png');
    await page.screenshot({ path: sbDeskPath, fullPage: false });
    console.log(`  📸 Saved: ${sbDeskPath}`);

    // Menu Workspace Overrides Tab Desktop
    await page.goto(`${BASE_URL}/menu`, { waitUntil: 'networkidle' });
    await page.click('#tab-btn-overrides');
    await page.waitForTimeout(300);
    await checkOverflow(page, 'Menu Overrides Workspace @ 1440x900');
    const menuDeskPath = path.join(ARTIFACTS_DIR, 'v5_2_menu_overrides_desktop_1440x900.png');
    await page.screenshot({ path: menuDeskPath, fullPage: false });
    console.log(`  📸 Saved: ${menuDeskPath}`);

    await page.close();
  }

  // 7. Viewport 1920 x 1080 (Full HD Desktop & Wall Displays)
  console.log('\n🖥️ Viewport: 1920 x 1080 (Full HD Desktop)');
  {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    
    // CraveAtlas Full HD
    await page.goto(`${BASE_URL}/apps/crave-atlas`, { waitUntil: 'networkidle' });
    await checkOverflow(page, 'CraveAtlas @ 1920x1080');
    const caFullHDPath = path.join(ARTIFACTS_DIR, 'v5_2_craveatlas_fhd_1920x1080.png');
    await page.screenshot({ path: caFullHDPath, fullPage: false });
    console.log(`  📸 Saved: ${caFullHDPath}`);

    // KDS Kitchen Display System on Wall Display (Full HD)
    await page.goto(`${BASE_URL}/kds?branch=branch_del`, { waitUntil: 'networkidle' });
    await checkOverflow(page, 'KDS Full HD Wall Display @ 1920x1080');
    const kdsFullHDPath = path.join(ARTIFACTS_DIR, 'v5_2_kds_fhd_1920x1080.png');
    await page.screenshot({ path: kdsFullHDPath, fullPage: false });
    console.log(`  📸 Saved: ${kdsFullHDPath}`);

    await page.close();
  }

  await browser.close();
  console.log('\n🎉 ALL 7 VIEWPORTS AUDITED AND CAPTURED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error('Fatal error during capture:', err);
  process.exit(1);
});
