import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const CSS_PATH = path.resolve(import.meta.dirname, '../src/tokens/components.css');
const cssContent = fs.readFileSync(CSS_PATH, 'utf8');

const HTML_CONTENT = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <title>BottomSheet Real Browser Gesture Test</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f17; color: #fff; height: 100vh; overflow: hidden; }
    #sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 40; }
    #sheet-content {
      position: fixed; inset-x: 0; bottom: 0; left: 0; right: 0;
      height: 320px; background: #131b2e; border-top: 1px solid #1e293b;
      border-radius: 1.25rem 1.25rem 0 0; z-index: 50; touch-action: none;
      will-change: transform;
    }
    .drag-handle-container {
      width: 100%; padding: 12px 0 8px; cursor: grab; display: flex; justify-content: center;
    }
    .drag-handle-pill {
      width: 48px; height: 6px; border-radius: 9999px; background: #334155;
    }
    .sheet-body { padding: 16px; }
    /* Injected components.css rules below */
    ${cssContent}
  </style>
</head>
<body>
  <div id="sheet-overlay"></div>
  <div id="sheet-content" data-drag-state="idle">
    <div id="drag-handle" class="drag-handle-container" role="region" aria-label="Drag handle">
      <div class="drag-handle-pill"></div>
    </div>
    <div class="sheet-body">
      <h2>BottomSheet Real Browser Test</h2>
      <p>Testing 2px step stylesheet transforms with zero inline styles.</p>
    </div>
  </div>

  <script>
    const sheet = document.getElementById('sheet-content');
    const handle = document.getElementById('drag-handle');
    let startY = null;
    let currentDelta = 0;
    let isDismissing = false;

    handle.addEventListener('pointerdown', (e) => {
      if (isDismissing) return;
      startY = e.clientY;
      currentDelta = 0;
      handle.setPointerCapture(e.pointerId);
    });

    handle.addEventListener('pointermove', (e) => {
      if (startY === null || isDismissing) return;
      const delta = e.clientY - startY;
      if (delta > 0) {
        currentDelta = delta;
        sheet.setAttribute('data-drag-state', 'dragging');
        const quantized = Math.min(80, Math.max(2, Math.round(delta / 2) * 2));
        sheet.setAttribute('data-drag-offset', String(quantized));
      } else {
        currentDelta = 0;
        sheet.setAttribute('data-drag-state', 'idle');
        sheet.removeAttribute('data-drag-offset');
      }
    });

    handle.addEventListener('pointerup', (e) => {
      if (startY === null || isDismissing) return;
      if (currentDelta > 75) {
        isDismissing = true;
        sheet.setAttribute('data-drag-state', 'dismissing');
        sheet.removeAttribute('data-drag-offset');
      } else {
        sheet.setAttribute('data-drag-state', 'snapping');
        sheet.removeAttribute('data-drag-offset');
        setTimeout(() => {
          if (!isDismissing) sheet.setAttribute('data-drag-state', 'idle');
        }, 200);
      }
      startY = null;
      currentDelta = 0;
    });

    handle.addEventListener('pointercancel', (e) => {
      if (!isDismissing) {
        sheet.setAttribute('data-drag-state', 'snapping');
        sheet.removeAttribute('data-drag-offset');
        setTimeout(() => {
          if (!isDismissing) sheet.setAttribute('data-drag-state', 'idle');
        }, 200);
      }
      startY = null;
      currentDelta = 0;
    });
  </script>
</body>
</html>`;

function parseTranslateY(transformString) {
  if (!transformString || transformString === 'none') return 0;
  // matrix(1, 0, 0, 1, 0, 30) -> translateY is 6th item
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
  console.log('🚀 [BottomSheet Playwright]: Starting browser verification suite...');

  // 1. Start local test HTTP server
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML_CONTENT);
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/`;

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    console.log('  ℹ Standard chromium launch fallback, trying system chrome channel...');
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  }

  try {
    // 2. Open page in mobile viewport (390 x 844 iPhone)
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    await page.goto(url);

    const sheet = page.locator('#sheet-content');
    const handle = page.locator('#drag-handle');
    await handle.waitFor({ state: 'visible' });

    // Step 1: Initial resting state
    const restingTransform = await sheet.evaluate((el) => window.getComputedStyle(el).transform);
    const restingY = parseTranslateY(restingTransform);
    assert.equal(restingY, 0, 'Initial resting state must have translateY 0');
    console.log('  ✔ Step 1: Initial resting state verified (translateY: 0px, matrix identity)');

    // Step 2: Drag down by 10px
    const handleBox = await handle.boundingBox();
    assert.ok(handleBox, 'Drag handle must have bounding box');
    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();

    await page.mouse.move(startX, startY + 10);
    let t10 = await sheet.evaluate((el) => window.getComputedStyle(el).transform);
    assert.equal(parseTranslateY(t10), 10, 'At delta = 10px, computed translateY must be exactly 10px');
    console.log('  ✔ Step 2: Downward drag 10px -> translateY = 10px (quantized: 10px via CSS rule)');

    // Step 3: Drag down to 30px
    await page.mouse.move(startX, startY + 30);
    let t30 = await sheet.evaluate((el) => window.getComputedStyle(el).transform);
    assert.equal(parseTranslateY(t30), 30, 'At delta = 30px, computed translateY must be exactly 30px');
    console.log('  ✔ Step 3: Downward drag 30px -> translateY = 30px (quantized: 30px via CSS rule)');

    // Step 4: Drag down to 50px
    await page.mouse.move(startX, startY + 50);
    let t50 = await sheet.evaluate((el) => window.getComputedStyle(el).transform);
    assert.equal(parseTranslateY(t50), 50, 'At delta = 50px, computed translateY must be exactly 50px');
    console.log('  ✔ Step 4: Downward drag 50px -> translateY = 50px (quantized: 50px via CSS rule)');

    // Step 5: Drag down to 74px (exact small-drag boundary below 75px threshold)
    await page.mouse.move(startX, startY + 74);
    let t74 = await sheet.evaluate((el) => window.getComputedStyle(el).transform);
    assert.equal(parseTranslateY(t74), 74, 'At delta = 74px, computed translateY must be exactly 74px');
    console.log('  ✔ Step 5: Downward drag 74px -> translateY = 74px (quantized: 74px below 75px threshold)');

    // Step 6: Release gesture at 74px -> snaps back to resting state
    await page.mouse.up();
    await page.waitForTimeout(300);
    let snapBackState = await sheet.getAttribute('data-drag-state');
    assert.equal(snapBackState, 'idle', 'Sheet must snap back to idle state when released at <= 75px');
    let snapTransform = await sheet.evaluate((el) => window.getComputedStyle(el).transform);
    assert.ok(
      Math.abs(parseTranslateY(snapTransform)) < 0.1,
      `Snap-back transform must return to resting translateY 0, got ${parseTranslateY(snapTransform)}`
    );
    console.log('  ✔ Step 6: Release at 74px (<= 75px) -> snapped back cleanly to resting state (translateY: 0px)');

    // Step 7: Drag down beyond 75px threshold to 80px
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 80);
    let t80 = await sheet.evaluate((el) => window.getComputedStyle(el).transform);
    assert.equal(parseTranslateY(t80), 80, 'At delta = 80px, computed translateY must be 80px');
    console.log('  ✔ Step 7: Downward drag 80px (> 75px) -> translateY = 80px reached');

    // Step 8: Release gesture at 80px -> dismisses
    await page.mouse.up();
    await page.waitForTimeout(50);
    let dismissState = await sheet.getAttribute('data-drag-state');
    assert.equal(dismissState, 'dismissing', 'Sheet must transition to dismissing state when released at > 75px');
    console.log('  ✔ Step 8: Release at 80px (> 75px) -> sheet dismiss triggered (data-drag-state="dismissing")');

    // Step 9: Reset dismissing state for subsequent gesture assertions
    await sheet.evaluate((el) => {
      el.setAttribute('data-drag-state', 'idle');
      el.removeAttribute('data-drag-offset');
    });

    // Step 10: Upward drag (delta = -40px) must be clamped to resting state
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY - 40);
    let upDragState = await sheet.getAttribute('data-drag-state');
    assert.equal(upDragState, 'idle', 'Upward drag must remain in idle state without offset');
    let upTransform = await sheet.evaluate((el) => window.getComputedStyle(el).transform);
    assert.equal(parseTranslateY(upTransform), 0, 'Upward drag transform must remain at 0px');
    await page.mouse.up();
    console.log('  ✔ Step 9: Upward drag (-40px) -> clamped safely to resting state (translateY: 0px)');

    // Step 11: Zero DOM inline-style invariant verified
    const styleAttr = await sheet.getAttribute('style');
    assert.ok(
      !styleAttr || styleAttr.trim() === '',
      `Zero inline styles invariant violated: found style="${styleAttr}"`
    );
    console.log('  ✔ Step 10: Zero DOM inline-style invariant verified (sheet style attribute is completely empty)');

    console.log('\n🏆 [BottomSheet Playwright]: ALL REAL BROWSER GESTURE CHECKS PASSED!\n');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

runBrowserVerification().catch((err) => {
  console.error('❌ Browser verification failed:', err);
  process.exit(1);
});
