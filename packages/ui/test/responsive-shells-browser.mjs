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
    // 1a. Reference 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(100);
    assert.equal(await isElementVisible(page, '[data-testid="phone-tabbar-band"]'), true, '390px: Phone BottomTabBar must be visible');
    assert.equal(await isElementVisible(page, '[data-testid="tablet-portrait-pill-band"]'), false, '390px: Tablet portrait pill must be hidden');
    assert.equal(await isElementVisible(page, '[data-testid="tablet-landscape-rail-band"]'), false, '390px: Tablet landscape rail must be hidden');
    assert.equal(await isElementVisible(page, '[data-testid="desktop-sidebar-band"]'), false, '390px: Desktop sidebar must be hidden');
    console.log('  ✔ Band 1 (390×844): Phone BottomTabBar active, all tablet/desktop sidebars hidden');

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

    // 2c. Boundary 1023px
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

    console.log('\n🏆 [ResponsiveShell Playwright]: ALL 4 VIEWPORT BANDS & BOUNDARY WIDTHS PASSED IN REAL BROWSER!\n');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

runResponsiveBrowserVerification().catch((err) => {
  console.error('❌ Responsive browser verification failed:', err);
  process.exit(1);
});
