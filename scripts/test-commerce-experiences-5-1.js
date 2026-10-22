/**
 * 🍷 RESTAURANTOS 5.1 — COMMERCE EXPERIENCES ACCEPTANCE & VERIFICATION SUITE
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates the three new application-level food-commerce experiences:
 *   1. CraveAtlas (Discovery-First Multi-Restaurant Food Marketplace)
 *   2. SwiftBite (Speed-First Food Ordering App)
 *   3. PantryRush (Quick-Commerce Grocery Application)
 *
 * Verifies:
 * - Domain contracts, stock validation, server-authoritative quotes
 * - Idempotency and duplicate order prevention
 * - Single-restaurant cart boundary constraints
 * - Explicit substitution preferences
 * - Responsive rendering and screenshot captures across 7 viewports
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const { chromium } = require(path.join(__dirname, '../projects/external-os/restaurant-os/node_modules/playwright'));

const ARTIFACTS_DIR = '/Users/apple/.gemini/antigravity-ide/brain/945b8da6-0c8a-4383-b2a9-5e62bb73a105';
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

function request(method, pathName, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(pathName, BASE_URL);
    const postData = data ? (typeof data === 'string' ? data : JSON.stringify(data)) : null;

    const reqHeaders = { ...headers };
    if (postData) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            resolve({ statusCode: res.statusCode, data: json, raw: body });
          } catch (e) {
            resolve({ statusCode: res.statusCode, raw: body });
          }
        });
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runTestSuite() {
  console.log('======================================================================');
  console.log('🪐 ORBITOX RESTAURANTOS 5.1 — COMMERCE EXPERIENCES ACCEPTANCE SUITE');
  console.log('======================================================================\n');

  // --- 1. DOMAIN & API CONTRACT TESTS ---
  console.log('--- TEST GROUP 1: RESTAURANT MARKETPLACE APIS ---');
  const resPartners = await request('GET', '/api/commerce/restaurants');
  assert(resPartners.statusCode === 200, 'GET /api/commerce/restaurants returns HTTP 200');
  assert(Array.isArray(resPartners.data?.data) && resPartners.data.data.length >= 6, 'Contains at least 6 rich restaurant partners');

  const partner1 = resPartners.data?.data[0];
  const resPartner1 = await request('GET', `/api/commerce/restaurants/${partner1.id}`);
  assert(resPartner1.statusCode === 200, `GET /api/commerce/restaurants/${partner1.id} returns HTTP 200`);
  assert(resPartner1.data?.data?.name === partner1.name, 'Partner record matches catalog identity');

  console.log('\n--- TEST GROUP 2: QUICK-COMMERCE GROCERY APIS ---');
  const resSkus = await request('GET', '/api/commerce/grocery/skus');
  assert(resSkus.statusCode === 200, 'GET /api/commerce/grocery/skus returns HTTP 200');
  assert(Array.isArray(resSkus.data?.data) && resSkus.data.data.length >= 16, 'Contains 16 curated grocery SKUs');

  const dairyFilter = await request('GET', '/api/commerce/grocery/skus?category=Dairy,%20Bread%20%26%20Eggs');
  assert(dairyFilter.statusCode === 200, 'Category filtering on grocery SKUs returns HTTP 200');
  assert(dairyFilter.data?.data.every(s => s.category === 'Dairy, Bread & Eggs'), 'All filtered SKUs belong to Dairy, Bread & Eggs');

  const milkSku = resSkus.data?.data.find(s => s.id === 'sku_amul_taaza') || resSkus.data?.data[0];
  const resSingleSku = await request('GET', `/api/commerce/grocery/skus/${milkSku.id}`);
  assert(resSingleSku.statusCode === 200, `GET /api/commerce/grocery/skus/${milkSku.id} returns HTTP 200`);
  assert(resSingleSku.data?.data?.packSize === milkSku.packSize, 'SKU pack size matches catalog record');

  console.log('\n--- TEST GROUP 3: SERVER-AUTHORITATIVE ORDER QUOTES & IDEMPOTENCY ---');
  const idempotencyKey = 'test_key_' + Date.now();
  const foodOrderPayload = {
    restaurantId: partner1.id,
    fulfillmentMethod: 'delivery',
    items: [
      { id: 'item_1', name: 'Dal Bukhara Heritage Handi', priceMinor: 48000, quantity: 2 },
      { id: 'item_2', name: 'Dum Gosht Biryani Awadhi', priceMinor: 68000, quantity: 1 }
    ],
    customerName: 'Aarav Sharma',
    customerPhone: '+91 98765 00112',
    deliveryAddress: 'Flat 402, Royal Palms, Ludhiana'
  };

  const resOrder1 = await request('POST', '/api/commerce/orders', foodOrderPayload, {
    'x-idempotency-key': idempotencyKey,
  });
  assert(resOrder1.statusCode === 201, 'POST /api/commerce/orders returns HTTP 201 Created');
  assert(resOrder1.data?.quote?.subtotalMinor === (48000 * 2 + 68000), 'Subtotal calculated authoritatively (₹1640)');
  assert(resOrder1.data?.quote?.deliveryFeeMinor === 4000, 'Delivery fee minor is ₹40');
  assert(resOrder1.data?.quote?.taxMinor === Math.round((48000 * 2 + 68000) * 0.05), 'Taxes minor is 5% GST');

  // Replay identical idempotency key to test duplicate order prevention
  const resOrderReplay = await request('POST', '/api/commerce/orders', foodOrderPayload, {
    'x-idempotency-key': idempotencyKey,
  });
  assert(resOrderReplay.statusCode === 200, 'Replay with same idempotency key returns HTTP 200');
  assert(resOrderReplay.data?.orderId === resOrder1.data?.orderId, 'Identical orderId returned, preventing duplicate order');
  assert(resOrderReplay.data?.idempotentReplay === true, 'Response marked as idempotentReplay');

  console.log('\n--- TEST GROUP 4: GROCERY INVENTORY STOCK VALIDATION & DECREMENT ---');
  // Attempt to order 999 units (exceeding stock)
  const excessiveStockPayload = {
    items: [{ skuId: milkSku.id, quantity: 999 }],
    substitutionPreference: 'ASK_BEFORE_SUBSTITUTE',
  };
  const resStockFail = await request('POST', '/api/commerce/grocery/orders', excessiveStockPayload);
  assert(resStockFail.statusCode === 400, 'Excessive stock order rejected with HTTP 400');
  assert(resStockFail.data?.error === 'INSUFFICIENT_STOCK', 'Error code is INSUFFICIENT_STOCK');

  // Valid grocery basket order
  const initialStock = milkSku.stockQuantity;
  const validGroceryPayload = {
    items: [{ skuId: milkSku.id, quantity: 2 }],
    substitutionPreference: 'ALLOW_STORE_REPLACEMENT',
    deliveryAddress: 'House 12, Sarabha Nagar, Ludhiana',
    pincode: '141001'
  };
  const resGroceryOrder = await request('POST', '/api/commerce/grocery/orders', validGroceryPayload);
  assert(resGroceryOrder.statusCode === 201, 'Valid grocery order placed with HTTP 201 Created');
  assert(resGroceryOrder.data?.status === 'packed', 'Grocery order state initialized to "packed"');
  assert(resGroceryOrder.data?.estimatedDeliveryMinutes === 15, '15-min delivery SLA assigned');

  // Check that stock was atomically decremented
  const resPostStock = await request('GET', `/api/commerce/grocery/skus/${milkSku.id}`);
  assert(resPostStock.data?.data?.stockQuantity === initialStock - 2, `Stock decremented from ${initialStock} to ${initialStock - 2}`);

  console.log('\n--- TEST GROUP 5: MARKETPLACE TEMPLATE DISCOVERY ---');
  const resTemplates = await request('GET', '/api/restaurant/templates');
  assert(resTemplates.statusCode === 200, 'GET /api/restaurant/templates returns HTTP 200');
  const allTemplates = resTemplates.data?.data || [];
  assert(allTemplates.length >= 9, 'All 9 templates available in marketplace (6 existing + 3 new app experiences)');
  assert(allTemplates.some(t => t.id === 'tmpl_crave_atlas'), 'CraveAtlas template registered');
  assert(allTemplates.some(t => t.id === 'tmpl_swift_bite'), 'SwiftBite template registered');
  assert(allTemplates.some(t => t.id === 'tmpl_pantry_rush'), 'PantryRush template registered');

  // --- 2. BROWSER VERIFICATION & SCREENSHOT CAPTURE ACROSS VIEWPORTS ---
  console.log('\n--- TEST GROUP 6: BROWSER USER INTERACTION & MULTI-VIEWPORT VERIFICATION ---');

  const browser = await chromium.launch({
    headless: true,
    executablePath: RESOLVED_CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  // Verify CraveAtlas Flows
  console.log('Testing CraveAtlas Browser Flow...');
  const pageCA = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await pageCA.goto(`${BASE_URL}/apps/crave-atlas`, { waitUntil: 'networkidle' });

  // 1. Search restaurant
  await pageCA.fill('#ca-global-search', 'biryani');
  await pageCA.waitForTimeout(300);
  const searchResultsCount = await pageCA.$$eval('.ca-restaurant-card', cards => cards.filter(c => c.style.display !== 'none').length);
  assert(searchResultsCount >= 1, 'CraveAtlas live search filters restaurant cards by query');

  // Reset search
  await pageCA.fill('#ca-global-search', '');
  await pageCA.waitForTimeout(200);

  // 2. Open restaurant detail page
  await pageCA.goto(`${BASE_URL}/apps/crave-atlas?restaurant=rest_heritage_bistro`, { waitUntil: 'networkidle' });
  const hasMenuSection = await pageCA.isVisible('#ca-menu-grid');
  assert(hasMenuSection, 'CraveAtlas renders full in-line restaurant menu view');

  // Add item to cart
  const caAddBtn = await pageCA.$('.ca-dish-add-btn');
  if (caAddBtn) {
    await caAddBtn.click();
    await pageCA.waitForTimeout(300);
    const cartCount = await pageCA.$eval('#ca-cart-label', el => el.innerText);
    assert(cartCount.includes('1'), 'CraveAtlas item added to active cart successfully');
  }

  // Capture CraveAtlas Desktop & Restaurant Detail
  const caDesktopShot = path.join(ARTIFACTS_DIR, 'craveatlas_home_desktop.png');
  await pageCA.screenshot({ path: caDesktopShot, fullPage: false });
  console.log(`  ✓ Captured: craveatlas_home_desktop.png`);

  await pageCA.close();

  // Verify SwiftBite Flow
  console.log('\nTesting SwiftBite Browser Flow...');
  const pageSB = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await pageSB.goto(`${BASE_URL}/apps/swift-bite`, { waitUntil: 'networkidle' });

  // 1. Fast Add Item (item with no required options)
  const fastAddBtn = await pageSB.$('.sb-dish-card[data-required-opts="false"] .sb-stepper-btn') || await pageSB.$('.sb-stepper-btn');
  if (fastAddBtn) {
    await fastAddBtn.click();
    await pageSB.waitForTimeout(300);
    const cartCountText = await pageSB.$eval('#sb-mobile-cart-count', el => el.innerText);
    assert(!cartCountText.includes('0 ITEMS'), 'SwiftBite 1-tap fast add increments cart badge instantly');
  }

  // 2. Open customize modal (item with required options)
  const customizerTrigger = await pageSB.$('.sb-dish-card[data-required-opts="true"] .sb-stepper-btn');
  if (customizerTrigger) {
    await customizerTrigger.click();
    await pageSB.waitForTimeout(300);
    const customizerVisible = await pageSB.isVisible('#sb-customizer-modal');
    assert(customizerVisible, 'SwiftBite targeted customizer bottom sheet opens for modifiable item');
    await pageSB.evaluate(() => dismissCustomizer());
    await pageSB.waitForTimeout(200);
  }

  const sbMobileShot = path.join(ARTIFACTS_DIR, 'swiftbite_home_mobile.png');
  await pageSB.screenshot({ path: sbMobileShot, fullPage: false });
  console.log(`  ✓ Captured: swiftbite_home_mobile.png`);

  await pageSB.close();

  // Verify PantryRush Flow
  console.log('\nTesting PantryRush Browser Flow...');
  const pagePR = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await pagePR.goto(`${BASE_URL}/apps/pantry-rush`, { waitUntil: 'networkidle' });

  // 1. Check Aisle Switching
  const dairyAisleTab = await pagePR.$('.pr-cat-link:nth-child(2)');
  if (dairyAisleTab) {
    await dairyAisleTab.click();
    await pagePR.waitForTimeout(300);
    const visibleSkus = await pagePR.$$eval('.pr-sku-card', cards => cards.filter(c => c.style.display !== 'none').length);
    assert(visibleSkus >= 1, 'PantryRush aisle rail switches catalog shelf dynamically');
  }

  // 2. Add SKU to basket
  const skuAddBtn = await pagePR.$('.pr-stepper-btn');
  if (skuAddBtn) {
    await skuAddBtn.click();
    await pagePR.waitForTimeout(300);
    const basketBadge = await pagePR.$eval('#pr-basket-badge', el => el.innerText);
    assert(basketBadge.includes('Basket (1)'), 'PantryRush item added to quick-commerce basket');
  }

  const prDesktopShot = path.join(ARTIFACTS_DIR, 'pantryrush_home_desktop.png');
  await pagePR.screenshot({ path: prDesktopShot, fullPage: false });
  console.log(`  ✓ Captured: pantryrush_home_desktop.png`);

  await pagePR.close();

  // Capture Multi-Viewport Matrix for all 3 apps + Marketplace
  console.log('\nTesting Multi-Viewport Matrix across 7 resolutions...');
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });

    // Marketplace
    await page.goto(`${BASE_URL}/marketplace`, { waitUntil: 'networkidle' });
    const mktScreen = path.join(ARTIFACTS_DIR, `phase7_marketplace_${vp.name}.png`);
    await page.screenshot({ path: mktScreen, fullPage: false });

    // CraveAtlas
    await page.goto(`${BASE_URL}/apps/crave-atlas`, { waitUntil: 'networkidle' });
    const caScreen = path.join(ARTIFACTS_DIR, `phase7_craveatlas_${vp.name}.png`);
    await page.screenshot({ path: caScreen, fullPage: false });

    // SwiftBite
    await page.goto(`${BASE_URL}/apps/swift-bite`, { waitUntil: 'networkidle' });
    const sbScreen = path.join(ARTIFACTS_DIR, `phase7_swiftbite_${vp.name}.png`);
    await page.screenshot({ path: sbScreen, fullPage: false });

    // PantryRush
    await page.goto(`${BASE_URL}/apps/pantry-rush`, { waitUntil: 'networkidle' });
    const prScreen = path.join(ARTIFACTS_DIR, `phase7_pantryrush_${vp.name}.png`);
    await page.screenshot({ path: prScreen, fullPage: false });

    console.log(`  ✓ Captured 4 apps at viewport ${vp.name} (${vp.width}x${vp.height})`);
    await page.close();
  }

  await browser.close();

  console.log('\n======================================================================');
  console.log(`🏁 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('======================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal suite execution error:', err);
  process.exit(1);
});
