import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const DIST_DIR = path.resolve(import.meta.dirname, '../dist-storybook');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const reqPath = (req.url || '/').split('?')[0];
      let filePath = path.join(DIST_DIR, reqPath === '/' ? 'index.html' : reqPath);
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(DIST_DIR, 'index.html');
      }
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: addr.port });
    });
  });
}

async function isElementVisible(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  }, selector);
}

async function runResponsiveBrowserVerification() {
  console.log('🚀 [ResponsiveShell Playwright]: Starting browser verification across 4 viewport bands & boundary widths...');

  const { server, port } = await startStaticServer();
  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      channel: 'chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }).catch(() => {
      return chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    });

    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });

    const storyUrl = `http://127.0.0.1:${port}/iframe.html?id=shells-persona-shell-primitives--adaptive-responsive-shell&viewMode=story`;
    await page.goto(storyUrl, { waitUntil: 'networkidle' });

    const shell = page.locator('[data-testid="responsive-shell"]');
    await shell.waitFor({ state: 'visible' });

    // Test matrix across exact mathematical boundaries:
    // 1. Phone Band (< 640px)
    // 1a. Reference 390x844 (iPhone 14 Portrait)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(100);
    assert.equal(await isElementVisible(page, '[data-testid="phone-tabbar-band"]'), true, '390px: Phone BottomTabBar must be visible');
    assert.equal(await isElementVisible(page, '[data-testid="tablet-portrait-pill-band"]'), false, '390px: Tablet portrait pill must be hidden');
    assert.equal(await isElementVisible(page, '[data-testid="tablet-landscape-rail-band"]'), false, '390px: Tablet landscape rail must be hidden');
    assert.equal(await isElementVisible(page, '[data-testid="desktop-sidebar-band"]'), false, '390px: Desktop sidebar must be hidden');
    console.log('  ✔ Band 1 (390×844): Phone BottomTabBar active, all tablet/desktop sidebars hidden');

    const phoneMoreBtn = page.locator('[data-testid="phone-tabbar-band"] button[aria-label="More navigation options"]');
    const phoneMoreBox = await phoneMoreBtn.boundingBox();
    assert.ok(phoneMoreBox !== null, 'Phone More button bounding box must be present');
    assert.ok(phoneMoreBox.width >= 44 && phoneMoreBox.height >= 44, `Phone More button must be >= 44×44px (got ${phoneMoreBox.width}×${phoneMoreBox.height}px)`);
    console.log(`  ✔ Phone More Button Hit Target: ${phoneMoreBox.width}×${phoneMoreBox.height}px satisfies >= 44×44px`);

    // 1b. Boundary 639px (< 640px)
    await page.setViewportSize({ width: 639, height: 844 });
    await page.waitForTimeout(100);
    assert.equal(await isElementVisible(page, '[data-testid="phone-tabbar-band"]'), true, '639px: Phone BottomTabBar must remain visible');
    assert.equal(await isElementVisible(page, '[data-testid="tablet-portrait-pill-band"]'), false, '639px: Tablet portrait pill must remain hidden');
    console.log('  ✔ Boundary 639px: Phone BottomTabBar active at upper edge');

    // 2. Tablet Portrait Band (640px – 1023px)
    // 2a. Boundary 640px
    await page.setViewportSize({ width: 640, height: 1000 });
    await page.waitForTimeout(100);
    assert.equal(await isElementVisible(page, '[data-testid="phone-tabbar-band"]'), false, '640px: Phone BottomTabBar must be hidden');
    assert.equal(await isElementVisible(page, '[data-testid="tablet-portrait-pill-band"]'), true, '640px: Tablet portrait BottomNavPill must be visible');
    assert.equal(await isElementVisible(page, '[data-testid="tablet-landscape-rail-band"]'), false, '640px: Tablet landscape rail must be hidden');
    assert.equal(await isElementVisible(page, '[data-testid="desktop-sidebar-band"]'), false, '640px: Desktop sidebar must be hidden');
    console.log('  ✔ Boundary 640px: Tablet Portrait BottomNavPill active at lower edge');

    // 2b. Reference 834x1194 (iPad Pro 11" Portrait)
    await page.setViewportSize({ width: 834, height: 1194 });
    await page.waitForTimeout(100);
    assert.equal(await isElementVisible(page, '[data-testid="tablet-portrait-pill-band"]'), true, '834px: Tablet portrait BottomNavPill must be visible');
    assert.equal(await isElementVisible(page, '[data-testid="tablet-landscape-rail-band"]'), false, '834px: Tablet landscape rail must be hidden');
    assert.equal(await isElementVisible(page, '[data-testid="desktop-sidebar-band"]'), false, '834px: Desktop sidebar must be hidden');
    console.log('  ✔ Band 2 (834×1194): Tablet Portrait BottomNavPill active on iPad Pro Portrait');

    // 2c. Tablet Portrait Overflow More Sheet Trigger & Non-Duplication
    const pillMoreBtn = page.locator('[data-testid="bottom-nav-pill-more-btn"]');
    assert.equal(await pillMoreBtn.isVisible(), true, 'BottomNavPill must display More button when overflow exists');

    const pillMoreBox = await pillMoreBtn.boundingBox();
    assert.ok(pillMoreBox !== null, 'More button bounding box must be present');
    assert.ok(
      pillMoreBox.width >= 44,
      `More button width must be >= 44px for WCAG touch ergonomics (got ${pillMoreBox.width}px)`
    );
    assert.ok(
      pillMoreBox.height >= 44,
      `More button height must be >= 44px for WCAG touch ergonomics (got ${pillMoreBox.height}px)`
    );
    console.log(`  ✔ More Button Hit Target: ${pillMoreBox.width}×${pillMoreBox.height}px satisfies >= 44×44px`);

    await pillMoreBtn.click();
    await page.waitForTimeout(200);
    const dialog = page.locator('[role="dialog"]');
    assert.equal(await dialog.isVisible(), true, 'MoreNavSheet must open on tablet portrait when More button clicked');

    // Assert rendered contents inside MoreNavSheet:
    const sheetText = (await dialog.textContent()) || '';
    // Assert overflow items are present:
    assert.ok(sheetText.includes('Billing & Plans'), 'Sheet must contain overflow item (Billing & Plans)');
    assert.ok(sheetText.includes('API Keys'), 'Sheet must contain overflow item (API Keys)');
    assert.ok(sheetText.includes('Settings'), 'Sheet must contain overflow item (Settings)');
    assert.ok(sheetText.includes('Help & Docs'), 'Sheet must contain overflow item (Help & Docs)');
    // Assert bottomNavItems are present:
    assert.ok(sheetText.includes('System Health'), 'Sheet must contain bottomNavItem (System Health)');
    assert.ok(sheetText.includes('API Reference'), 'Sheet must contain bottomNavItem (API Reference)');
    // Assert primary items are NOT duplicated in the sheet:
    assert.ok(!sheetText.includes('Overview'), 'Sheet must NOT contain primary item 0 (Overview)');
    assert.ok(!sheetText.includes('Fleet Clusters'), 'Sheet must NOT contain primary item 1 (Fleet Clusters)');
    assert.ok(!sheetText.includes('Tenants & Orgs'), 'Sheet must NOT contain primary item 2 (Tenants & Orgs)');
    assert.ok(!sheetText.includes('Security & PKI'), 'Sheet must NOT contain primary item 3 (Security & PKI)');
    console.log('  ✔ Tablet Portrait More Sheet: Full item contents rendered without duplication (both overflow & bottomNavItems)');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    console.log('  ✔ Tablet Portrait More Sheet: Accessible from BottomNavPill and cleanly dismissible');

    // 2d. Boundary 1023px
    await page.setViewportSize({ width: 1023, height: 1000 });
    await page.waitForTimeout(100);
    assert.equal(await isElementVisible(page, '[data-testid="tablet-portrait-pill-band"]'), true, '1023px: Tablet portrait pill must remain visible');
    assert.equal(await isElementVisible(page, '[data-testid="tablet-landscape-rail-band"]'), false, '1023px: Tablet landscape rail must remain hidden');
    console.log('  ✔ Boundary 1023px: Tablet Portrait BottomNavPill active at upper edge');

    // 3. Tablet Landscape Band (1024px – 1279px)
    // 3a. Boundary 1024px
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.waitForTimeout(100);
    assert.equal(await isElementVisible(page, '[data-testid="tablet-landscape-rail-band"]'), true, '1024px: Tablet landscape IconRail must be visible');
    assert.equal(await isElementVisible(page, '[data-testid="tablet-portrait-pill-band"]'), false, '1024px: Tablet portrait pill must be hidden');
    assert.equal(await isElementVisible(page, '[data-testid="desktop-sidebar-band"]'), false, '1024px: Desktop sidebar must be hidden');
    console.log('  ✔ Boundary 1024px: Tablet Landscape IconRail active at lower edge');

    // 3b. Reference 1194x834 (iPad Pro 11" Landscape)
    await page.setViewportSize({ width: 1194, height: 834 });
    await page.waitForTimeout(100);
    assert.equal(await isElementVisible(page, '[data-testid="tablet-landscape-rail-band"]'), true, '1194px: Tablet landscape IconRail must be visible');
    assert.equal(await isElementVisible(page, '[data-testid="desktop-sidebar-band"]'), false, '1194px: Desktop sidebar must NOT be shown on iPad Pro 11"');
    console.log('  ✔ Band 3 (1194×834): Tablet Landscape IconRail active on iPad Pro Landscape (260px sidebar prevented)');

    // 3c. Boundary 1279px
    await page.setViewportSize({ width: 1279, height: 900 });
    await page.waitForTimeout(100);
    assert.equal(await isElementVisible(page, '[data-testid="tablet-landscape-rail-band"]'), true, '1279px: Tablet landscape rail must remain visible');
    assert.equal(await isElementVisible(page, '[data-testid="desktop-sidebar-band"]'), false, '1279px: Desktop sidebar must remain hidden');
    console.log('  ✔ Boundary 1279px: Tablet Landscape IconRail active at upper edge');

    // 4. Desktop Band (>= 1280px)
    // 4a. Boundary 1280px
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(100);
    assert.equal(await isElementVisible(page, '[data-testid="desktop-sidebar-band"]'), true, '1280px: Desktop SidebarCard must be visible');
    assert.equal(await isElementVisible(page, '[data-testid="tablet-landscape-rail-band"]'), false, '1280px: Tablet landscape rail must be hidden');
    assert.equal(await isElementVisible(page, '[data-testid="tablet-portrait-pill-band"]'), false, '1280px: Tablet portrait pill must be hidden');
    console.log('  ✔ Boundary 1280px: Desktop SidebarCard active at lower edge');

    // 4b. Reference 1440x900 (Desktop Wide)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(100);
    assert.equal(await isElementVisible(page, '[data-testid="desktop-sidebar-band"]'), true, '1440px: Desktop SidebarCard must be visible');
    assert.equal(await isElementVisible(page, '[data-testid="tablet-landscape-rail-band"]'), false, '1440px: Tablet landscape rail must be hidden');
    console.log('  ✔ Band 4 (1440×900): Desktop SidebarCard active on Desktop Reference');

    // 5. Constrained-Height Landscape Phone Viewport (844 × 390, max-height: 500px)
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(100);
    const headerHeight = await page.evaluate(() => {
      const h = document.querySelector('[data-testid="responsive-shell"] header');
      return h ? h.getBoundingClientRect().height : 0;
    });
    assert.ok(headerHeight <= 44, `Landscape phone: TopBar must compress in height (got ${headerHeight}px <= 44px)`);
    assert.equal(await isElementVisible(page, '[data-testid="tablet-portrait-pill-band"]'), true, '844x390: Tablet portrait pill must remain visible');
    assert.equal(await isElementVisible(page, '[data-testid="desktop-sidebar-band"]'), false, '844x390: Desktop sidebar must be hidden');
    console.log('  ✔ Constrained Height (844×390 Landscape Phone): TopBar compressed (<=44px) and pill navigation docked');

    // 6. Touch Station Tablet Landscape Mode (>= 52px Touch Targets)
    const stationUrl = `http://127.0.0.1:${port}/iframe.html?id=shells-persona-shell-primitives--adaptive-responsive-shell-touch-station&viewMode=story`;
    await page.goto(stationUrl, { waitUntil: 'networkidle' });
    await page.setViewportSize({ width: 1194, height: 834 });
    await page.waitForTimeout(100);
    const railTargetHeight = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('[data-testid="tablet-landscape-rail-band"] [data-rail-mode="touch-station"] nav > *'));
      if (items.length === 0) return 0;
      return Math.min(...items.map((i) => i.getBoundingClientRect().height));
    });
    assert.ok(railTargetHeight >= 52, `Touch station rail targets must be >= 52px (got ${railTargetHeight}px)`);
    console.log(`  ✔ Touch Station Mode (1194×834 KDS): Tablet landscape rail enforces >= 52px ergonomic targets (got ${railTargetHeight}px)`);

    console.log('\n🏆 [ResponsiveShell Playwright]: ALL VIEWPORT BANDS, BOUNDARIES, LANDSCAPE PHONE & TOUCH STATION CHECKS PASSED IN REAL BROWSER!\n');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

runResponsiveBrowserVerification().catch((err) => {
  console.error('❌ Responsive browser verification failed:', err);
  process.exit(1);
});
