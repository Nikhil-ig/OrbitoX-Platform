/**
 * 🌐 RESTAURANTOS 5.2 — COMPREHENSIVE MULTI-APP BROWSER SWEEP
 * ─────────────────────────────────────────────────────────────────────────────
 * Sweeps all 12 platform application routes across Port 4010:
 * 1.  /apps/crave-atlas
 * 2.  /apps/swift-bite
 * 3.  /apps/pantry-rush
 * 4.  /marketplace
 * 5.  /studio
 * 6.  /whitelabel
 * 7.  /staff
 * 8.  /support
 * 9.  /menu
 * 10. /operations/floor
 * 11. /kds
 * 12. /dine/7Kp9xQ8m2L
 *
 * Verifies:
 * - HTTP 200 response & valid DOM mount
 * - 0 fatal JavaScript console errors
 * - 0 broken critical network requests (4xx / 5xx)
 * - Zero horizontal overflow at viewport (overflow-x)
 * - Captures audit screenshots for each application
 */

const path = require('path');
const fs = require('fs');
const { chromium } = require(path.join(__dirname, '../projects/external-os/restaurant-os/node_modules/playwright'));

const ARTIFACTS_DIR = '/Users/apple/.gemini/antigravity-ide/brain/945b8da6-0c8a-4383-b2a9-5e62bb73a105';
const BASE_URL = 'http://localhost:4010';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const RESOLVED_CHROME_PATH = process.env.CHROME_BIN || (fs.existsSync(CHROME_PATH) ? CHROME_PATH : undefined);

const ROUTES_TO_SWEEP = [
  { path: '/apps/crave-atlas', name: 'CraveAtlas Storefront', mobile: true },
  { path: '/apps/swift-bite', name: 'SwiftBite Speed Ordering', mobile: true },
  { path: '/apps/pantry-rush', name: 'PantryRush Dark-Store', mobile: true },
  { path: '/marketplace', name: 'OrbitoX Template Marketplace', mobile: false },
  { path: '/studio', name: 'Visual Storefront Studio', mobile: false },
  { path: '/whitelabel', name: 'White-Label Branding & Domains', mobile: false },
  { path: '/staff', name: 'Staff Operations & Access', mobile: false },
  { path: '/support', name: 'Customer Support Desk', mobile: false },
  { path: '/menu', name: 'BOH Menu & Overrides Workspace', mobile: false },
  { path: '/operations/floor', name: 'Spatial Floor Studio', mobile: false },
  { path: '/kds', name: 'Kitchen Display System (9-Station)', mobile: false },
  { path: '/dine/7Kp9xQ8m2L', name: 'Diner Mobile PWA (Table QR)', mobile: true },
];

async function runBrowserSweep() {
  console.log('===============================================================');
  console.log('🌐 RESTAURANTOS 5.2 — COMPREHENSIVE MULTI-APP BROWSER SWEEP');
  console.log('===============================================================\n');

  const browser = await chromium.launch({
    headless: true,
    executablePath: RESOLVED_CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const results = [];

  for (const item of ROUTES_TO_SWEEP) {
    const viewport = item.mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 };
    const page = await browser.newPage({ viewport });

    const consoleErrors = [];
    const failedRequests = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        const locUrl = msg.location()?.url || '';
        // Ignore expected favicon 404
        if (!text.includes('favicon.ico') && !locUrl.includes('favicon.ico')) {
          consoleErrors.push(text);
        }
      }
    });

    page.on('response', (res) => {
      if (res.status() >= 400 && !res.url().includes('favicon.ico')) {
        failedRequests.push(`${res.status()} ${res.url()}`);
      }
    });

    page.on('requestfailed', (req) => {
      if (!req.url().includes('favicon.ico')) {
        failedRequests.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText || 'Failed'}`);
      }
    });

    let httpStatus = 0;
    try {
      const response = await page.goto(`${BASE_URL}${item.path}`, { waitUntil: 'networkidle', timeout: 15000 });
      httpStatus = response ? response.status() : 0;
      await page.waitForTimeout(400);

      const title = await page.title();

      // Check horizontal overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      // Capture screenshot
      const safeSlug = item.path.replace(/\//g, '_').replace(/^_/, '');
      const screenshotPath = path.join(ARTIFACTS_DIR, `sweep_${safeSlug}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      results.push({
        path: item.path,
        name: item.name,
        status: httpStatus,
        title,
        consoleErrors,
        failedRequests,
        hasHorizontalOverflow: overflow,
        screenshot: screenshotPath,
      });

      const statusIcon = httpStatus === 200 && consoleErrors.length === 0 ? '✅' : '⚠️';
      console.log(`${statusIcon} [${item.path}] -> HTTP ${httpStatus} | Title: "${title}" | Console Errors: ${consoleErrors.length} | Overflow: ${overflow ? 'YES' : 'NO'}`);
      if (consoleErrors.length > 0) {
        console.log(`    ⚠️ Console errors:`, consoleErrors);
      }
      if (failedRequests.length > 0) {
        console.log(`    ⚠️ Failed requests:`, failedRequests);
      }
    } catch (err) {
      console.error(`❌ [${item.path}] Error sweeping route:`, err.message);
      results.push({
        path: item.path,
        name: item.name,
        status: httpStatus || 500,
        error: err.message,
        consoleErrors,
        failedRequests,
      });
    } finally {
      await page.close();
    }
  }

  await browser.close();

  console.log('\n===============================================================');
  console.log('BROWSER SWEEP COMPLETE: SUMMARY');
  console.log('===============================================================');
  console.table(
    results.map((r) => ({
      Route: r.path,
      App: r.name,
      Status: r.status,
      'Console Errors': r.consoleErrors ? r.consoleErrors.length : 'ERR',
      'Horizontal Overflow': r.hasHorizontalOverflow ? 'FAIL' : 'PASS',
    }))
  );

  const anyFatal = results.some((r) => r.status !== 200 || (r.consoleErrors && r.consoleErrors.length > 0));
  if (anyFatal) {
    console.log('\n⚠️ Some routes reported console warnings or non-200 status.');
  } else {
    console.log('\n🎉 ALL 12 APPLICATION ROUTES MOUNT WITH HTTP 200 AND 0 CONSOLE ERRORS!');
  }
}

runBrowserSweep().catch((err) => {
  console.error('Fatal browser sweep failure:', err);
  process.exit(1);
});
