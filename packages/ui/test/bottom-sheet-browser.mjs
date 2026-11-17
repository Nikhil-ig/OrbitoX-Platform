import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
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

function parseTranslateY(transformString) {
  if (!transformString || transformString === 'none') return 0;
  const matrixMatch = transformString.match(/matrix\(([^)]+)\)/);
  if (matrixMatch) {
    const parts = matrixMatch[1].split(',').map((s) => parseFloat(s.trim()));
    return parts[5] || 0;
  }
  const matrix3dMatch = transformString.match(/matrix3d\(([^)]+)\)/);
  if (matrix3dMatch) {
    const parts = matrix3dMatch[1].split(',').map((s) => parseFloat(s.trim()));
    return parts[13] || 0;
  }
  return 0;
}

async function runBrowserVerification() {
  console.log('🚀 [BottomSheet Playwright]: Starting browser verification on REAL React component in Storybook...');

  // 1. Ensure dist-storybook is built
  if (!fs.existsSync(path.join(DIST_DIR, 'index.json'))) {
    console.log('  ℹ dist-storybook not found; building Storybook 8...');
    execSync('pnpm run build-storybook', {
      cwd: path.resolve(import.meta.dirname, '..'),
      stdio: 'inherit',
    });
  }

  // 2. Start local static HTTP server
  const { server, port } = await startStaticServer();
  const storyUrl = `http://127.0.0.1:${port}/iframe.html?id=components-layout-navigation--bottom-tab-bar-and-sheet-demo&viewMode=story`;

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    console.log('  ℹ Standard chromium fallback: launching system Google Chrome channel...');
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  }

  try {
    // 3. Open page in mobile viewport (390 x 844 iPhone)
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    await page.goto(storyUrl, { waitUntil: 'networkidle' });

    // Click trigger to open the real React BottomSheet
    const trigger = page.locator('button:has-text("Open Order Detail")');
    await trigger.waitFor({ state: 'visible' });
    await trigger.click();

    // Locate the actual Radix Dialog content element
    const dialog = page.locator('[role="dialog"]');
    await dialog.waitFor({ state: 'visible' });

    // Locate the actual drag handle rendered by BottomSheetContent
    const handle = dialog.locator('[role="region"][aria-label="Drag handle"]');
    await handle.waitFor({ state: 'visible' });

    // Step 1: Initial resting state on real React component
    const restingTransform = await dialog.evaluate((el) => window.getComputedStyle(el).transform);
    const restingY = parseTranslateY(restingTransform);
    assert.equal(restingY, 0, 'Initial resting state must have translateY 0');
    console.log('  ✔ Step 1: Initial resting state verified on real React component (translateY: 0px)');

    // Drag handle coordinates
    const handleBox = await handle.boundingBox();
    assert.ok(handleBox, 'Drag handle must have bounding box');
    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;

    // Step 2: Upward Drag Clamping (delta = -40px)
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY - 40);
    let upState = await dialog.getAttribute('data-drag-state');
    assert.equal(upState, 'idle', 'Upward drag must be clamped to idle');
    let upTransform = await dialog.evaluate((el) => window.getComputedStyle(el).transform);
    assert.equal(parseTranslateY(upTransform), 0, 'Upward drag transform must remain at 0px');
    await page.mouse.up();
    console.log('  ✔ Step 2: Upward mouse drag (-40px) clamped safely to resting state (0px)');

    // Step 3: Mouse Drag with Pointer Capture (cursor at +30px is below the 24px handle)
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 30);
    let t30 = await dialog.evaluate((el) => window.getComputedStyle(el).transform);
    assert.equal(parseTranslateY(t30), 30, 'Mouse drag with pointer capture: translateY must be 30px');
    console.log('  ✔ Step 3: Mouse drag with pointer capture past handle boundary -> translateY = 30px (quantized: 30px)');

    // Step 4: Continuous fine-grained mouse tracking to 50px and 74px (<= 75px boundary)
    await page.mouse.move(startX, startY + 50);
    let t50 = await dialog.evaluate((el) => window.getComputedStyle(el).transform);
    assert.equal(parseTranslateY(t50), 50, 'At delta = 50px, computed translateY must be 50px');

    await page.mouse.move(startX, startY + 74);
    let t74 = await dialog.evaluate((el) => window.getComputedStyle(el).transform);
    assert.equal(parseTranslateY(t74), 74, 'At delta = 74px, computed translateY must be 74px');
    console.log('  ✔ Step 4: Continuous fine-grained mouse tracking to 74px (<= 75px boundary)');

    // Step 5: Small drag release at 74px -> snaps back to resting state, Radix Dialog stays OPEN
    await page.mouse.up();
    await page.waitForTimeout(300);
    let snapBackState = await dialog.getAttribute('data-drag-state');
    assert.equal(snapBackState, 'idle', 'Sheet must snap back to idle state when released at <= 75px');
    let snapTransform = await dialog.evaluate((el) => window.getComputedStyle(el).transform);
    assert.ok(
      Math.abs(parseTranslateY(snapTransform)) < 0.1,
      `Snap-back transform must return to resting translateY 0, got ${parseTranslateY(snapTransform)}`
    );
    assert.ok(await dialog.isVisible(), 'Sheet must remain open after small drag snap-back');
    console.log('  ✔ Step 5: Small mouse drag released at 74px -> snapped back cleanly (stays open)');

    // Step 6: Drag down 40px and trigger pointer cancellation recovery
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 40);
    let move40State = await dialog.getAttribute('data-drag-state');
    assert.equal(move40State, 'dragging');
    await handle.dispatchEvent('pointercancel', { pointerId: 1 });
    await page.waitForTimeout(300);
    let cancelState = await dialog.getAttribute('data-drag-state');
    assert.equal(cancelState, 'idle', 'Sheet must return to idle after pointer cancel');
    await page.mouse.up();
    console.log('  ✔ Step 6: Gesture cancellation recovery verified (sheet returned to idle)');

    // Step 7: Mouse Drag beyond 75px threshold (e.g. 80px) -> triggers real Radix Dialog dismissal
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 80);
    let t80 = await dialog.evaluate((el) => window.getComputedStyle(el).transform);
    assert.equal(parseTranslateY(t80), 80, 'At delta = 80px, computed translateY must be 80px');

    await page.mouse.up();
    await page.waitForTimeout(400);

    // Verify Radix Dialog closed
    const isClosed = !(await dialog.isVisible().catch(() => false));
    assert.ok(isClosed, 'Radix Dialog must have closed after drag > 75px');
    console.log('  ✔ Step 7: Mouse drag released at 80px (> 75px) -> real React component dismissed successfully');

    // Step 8: Reopen sheet via React trigger button
    await trigger.click();
    const reopenedDialog = page.locator('[role="dialog"]');
    await reopenedDialog.waitFor({ state: 'visible' });
    await page.waitForTimeout(300);
    console.log('  ✔ Step 8: Sheet reopened successfully via React trigger');

    // Step 9: Zero DOM Inline-Style Mutation Invariant on Real React Component
    // BottomSheet relies strictly on CSS attribute selectors (data-drag-state, data-drag-offset) rather than inline styles.
    // Verify that neither transform nor transition was ever injected as an inline style.
    const inlineTransform = await reopenedDialog.evaluate((el) => el.style.transform);
    const inlineTransition = await reopenedDialog.evaluate((el) => el.style.transition);
    assert.equal(inlineTransform, '', 'BottomSheet must not set inline style.transform');
    assert.equal(inlineTransition, '', 'BottomSheet must not set inline style.transition');
    const fullStyle = (await reopenedDialog.getAttribute('style')) || '';
    assert.ok(
      !fullStyle.includes('transform') && !fullStyle.includes('transition'),
      `Zero inline-style invariant violated: found transform/transition in style="${fullStyle}"`
    );
    console.log('  ✔ Step 9: Zero DOM inline-style mutation invariant verified on real React component (no transform/transition)');

    console.log('\n🏆 [BottomSheet Playwright]: ALL REAL REACT COMPONENT BROWSER CHECKS PASSED!\n');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

runBrowserVerification().catch((err) => {
  console.error('❌ Browser verification failed:', err);
  process.exit(1);
});
