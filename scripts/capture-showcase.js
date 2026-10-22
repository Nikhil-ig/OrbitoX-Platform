const path = require('path');
const fs = require('fs');
const { chromium } = require(path.join(__dirname, '../projects/external-os/restaurant-os/node_modules/playwright'));

const ARTIFACTS_DIR = '/Users/apple/.gemini/antigravity-ide/brain/945b8da6-0c8a-4383-b2a9-5e62bb73a105';
const BASE_URL = 'http://localhost:4010';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const RESOLVED_CHROME_PATH = process.env.CHROME_BIN || (fs.existsSync(CHROME_PATH) ? CHROME_PATH : undefined);

async function run() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: RESOLVED_CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  // 1. Marketplace All 9 Templates Overview (scrolled down)
  const pageMkt = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  await pageMkt.goto(`${BASE_URL}/marketplace`, { waitUntil: 'networkidle' });
  await pageMkt.evaluate(() => window.scrollBy(0, 500));
  await pageMkt.waitForTimeout(300);
  await pageMkt.screenshot({ path: path.join(ARTIFACTS_DIR, 'showcase_marketplace_cards.png') });

  // 2. Open Live Preview Modal for PantryRush with Tablet Frame
  const prCard = await pageMkt.$('.template-card[data-id="tmpl_pantry_rush"] button');
  if (prCard) {
    await prCard.click();
    await pageMkt.waitForTimeout(600);
    // Switch to tablet frame
    await pageMkt.click('#vp-tablet');
    await pageMkt.waitForTimeout(400);
    await pageMkt.screenshot({ path: path.join(ARTIFACTS_DIR, 'showcase_marketplace_preview_modal_tablet.png') });
  }
  await pageMkt.close();

  // 3. CraveAtlas: Restaurant Detail & Cart Drawer Open
  const pageCA = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await pageCA.goto(`${BASE_URL}/apps/crave-atlas?restaurant=rest_heritage_bistro`, { waitUntil: 'networkidle' });
  const caAdd = await pageCA.$('.ca-dish-add-btn');
  if (caAdd) {
    await caAdd.click();
    await pageCA.waitForTimeout(200);
    // Toggle cart drawer
    await pageCA.click('#ca-cart-trigger');
    await pageCA.waitForTimeout(300);
    await pageCA.screenshot({ path: path.join(ARTIFACTS_DIR, 'showcase_craveatlas_cart_open.png') });
  }
  await pageCA.close();

  // 4. CraveAtlas: Conflict Modal
  const pageCAConflict = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await pageCAConflict.goto(`${BASE_URL}/apps/crave-atlas?restaurant=rest_heritage_bistro`, { waitUntil: 'networkidle' });
  const caAdd1 = await pageCAConflict.$('.ca-dish-add-btn');
  if (caAdd1) await caAdd1.click();
  // Navigate to another restaurant
  await pageCAConflict.goto(`${BASE_URL}/apps/crave-atlas?restaurant=rest_botanical_co`, { waitUntil: 'networkidle' });
  const caAdd2 = await pageCAConflict.$('.ca-dish-add-btn');
  if (caAdd2) {
    await caAdd2.click();
    await pageCAConflict.waitForTimeout(300);
    await pageCAConflict.screenshot({ path: path.join(ARTIFACTS_DIR, 'showcase_craveatlas_conflict_modal.png') });
  }
  await pageCAConflict.close();

  // 5. SwiftBite: Customizer Sheet Open
  const pageSB = await browser.newPage({ viewport: { width: 430, height: 932 } });
  await pageSB.goto(`${BASE_URL}/apps/swift-bite`, { waitUntil: 'networkidle' });
  const customizerTrigger = await pageSB.$('.sb-dish-card[data-required-opts="true"] .sb-stepper-btn');
  if (customizerTrigger) {
    await customizerTrigger.click();
    await pageSB.waitForTimeout(300);
    await pageSB.screenshot({ path: path.join(ARTIFACTS_DIR, 'showcase_swiftbite_customizer_sheet.png') });
  }
  await pageSB.close();

  // 6. PantryRush: Open Basket Drawer with Substitution Preference
  const pagePR = await browser.newPage({ viewport: { width: 430, height: 932 } });
  await pagePR.goto(`${BASE_URL}/apps/pantry-rush`, { waitUntil: 'networkidle' });
  const prAdd = await pagePR.$('.pr-stepper-btn');
  if (prAdd) {
    await prAdd.click();
    await pagePR.waitForTimeout(300);
    await pagePR.click('.pr-basket-btn');
    await pagePR.waitForTimeout(300);
    await pagePR.screenshot({ path: path.join(ARTIFACTS_DIR, 'showcase_pantryrush_mobile_basket.png') });
  }
  await pagePR.close();

  await browser.close();
  console.log('🎉 All showcase screenshots captured successfully!');
}

run().catch(err => {
  console.error('Error capturing showcase:', err);
  process.exit(1);
});
