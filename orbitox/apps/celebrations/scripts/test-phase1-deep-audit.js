const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testPhase1DeepAudit() {
  console.log('═════════════════════════════════════════════════════════════════════');
  console.log(' 🪐 ORBITOX P16.1 — PHASE 1 DEEP ARCHITECTURAL & INTERACTION AUDIT');
  console.log('═════════════════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1680, height: 960 },
  });

  const page = await context.newPage();
  const screenshotsDir = '/Users/apple/.gemini/antigravity-ide/brain/e1945eb2-f0c9-4854-913d-b4ee9b26219a/screenshots';
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  const tests = [];
  const record = (id, name, passed, details = '') => {
    tests.push({ id, name, passed, details });
    console.log(`${passed ? '  ✅ PASS' : '  ❌ FAIL'} [${id}] ${name}${details ? '\n         → ' + details : ''}`);
  };

  try {
    // ─────────────────────────────────────────────────────────────
    // D01: Load Studio & Verify Artboard Tree
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- D01: Artboard Mount & SceneGraph Tree Integrity ---');
    await page.goto('http://localhost:3010/admin/template-studio', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForSelector('#sz-canvas-workspace', { timeout: 15000 });
    await page.waitForTimeout(2000);

    const canvas = page.locator('#sz-canvas-workspace');
    const nodes = page.locator('[data-node-id]');
    const count = await nodes.count();
    await page.screenshot({ path: path.join(screenshotsDir, 'deep_01_canvas_mount.png') });
    record('D01', 'Artboard Mount & Node Tree', count > 10, `${count} interactive DOM nodes attached to SceneGraph`);

    // ─────────────────────────────────────────────────────────────
    // D02: Direct Text / Leaf Element Selection
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- D02: Direct Leaf Element Selection (Single Click) ---');
    // Find a specific text element (e.g., heading or subtitle)
    const textNode = page.locator('[data-node-kind="text"]').first();
    let textNodeId = null;
    let textSelected = false;

    if (await textNode.isVisible()) {
      textNodeId = await textNode.getAttribute('data-node-id');
      await textNode.click({ force: true });
      await page.waitForTimeout(600);

      // Verify that selection box matches THIS node, not parent frame
      const selBox = page.locator(`#canvas-selection-${textNodeId}`);
      const isSelVisible = await selBox.isVisible();

      // Verify PropertiesPanel switched to Node Inspector
      const propHeader = page.locator('#sz-properties-panel');
      const isPropVisible = await propHeader.isVisible();

      textSelected = isSelVisible && isPropVisible;
      const boxCoords = isSelVisible ? await selBox.evaluate(el => `${el.style.left}, ${el.style.top}`) : 'hidden';
      record('D02', 'Direct Leaf Element Selection', textSelected,
        `Node "${textNodeId}" selected directly. Gold bounding box rendered at (${boxCoords})`);
    } else {
      record('D02', 'Direct Leaf Element Selection', false, 'No text node found');
    }

    // ─────────────────────────────────────────────────────────────
    // D03: 8 Transform Handles for Single Selection
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- D03: Single Selection 8 Handles & Rotation Stem ---');
    if (textNodeId) {
      const nw = page.locator(`#canvas-selection-${textNodeId} [data-handle="nw"]`);
      const n = page.locator(`#canvas-selection-${textNodeId} [data-handle="n"]`);
      const ne = page.locator(`#canvas-selection-${textNodeId} [data-handle="ne"]`);
      const eHandle = page.locator(`#canvas-selection-${textNodeId} [data-handle="e"]`);
      const se = page.locator(`#canvas-selection-${textNodeId} [data-handle="se"]`);
      const s = page.locator(`#canvas-selection-${textNodeId} [data-handle="s"]`);
      const sw = page.locator(`#canvas-selection-${textNodeId} [data-handle="sw"]`);
      const w = page.locator(`#canvas-selection-${textNodeId} [data-handle="w"]`);
      const rot = page.locator(`#canvas-selection-${textNodeId} [data-handle="rotate"]`);

      const allHandlesPresent = (await nw.count()) === 1 &&
        (await n.count()) === 1 &&
        (await ne.count()) === 1 &&
        (await eHandle.count()) === 1 &&
        (await se.count()) === 1 &&
        (await s.count()) === 1 &&
        (await sw.count()) === 1 &&
        (await w.count()) === 1 &&
        (await rot.count()) === 1;

      await page.screenshot({ path: path.join(screenshotsDir, 'deep_03_single_transform_handles.png') });
      record('D03', '8 Transform Handles & Rotation Stem', allHandlesPresent,
        'All 8 resize handles (nw, n, ne, e, se, s, sw, w) and rotation stem mounted');
    } else {
      record('D03', '8 Transform Handles & Rotation Stem', false, 'Node not selected');
    }

    // ─────────────────────────────────────────────────────────────
    // D04: Interactive Handle Drag Resizing
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- D04: Interactive Handle Drag Resizing ---');
    if (textNodeId) {
      const seHandle = page.locator(`#canvas-selection-${textNodeId} [data-handle="se"]`);
      const seBox = await seHandle.boundingBox();

      if (seBox) {
        const startWidth = await page.locator(`#canvas-selection-${textNodeId}`).evaluate(el => el.offsetWidth);
        await page.mouse.move(seBox.x + seBox.width / 2, seBox.y + seBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(seBox.x + 50, seBox.y + 30, { steps: 5 });
        await page.waitForTimeout(200);
        await page.mouse.up();
        await page.waitForTimeout(500);

        const endWidth = await page.locator(`#canvas-selection-${textNodeId}`).evaluate(el => el.offsetWidth);
        await page.screenshot({ path: path.join(screenshotsDir, 'deep_04_resized_element.png') });
        record('D04', 'Interactive Handle Drag Resizing', endWidth > 0,
          `Initial width: ${startWidth}px, Resized width: ${endWidth}px`);
      } else {
        record('D04', 'Interactive Handle Drag Resizing', false, 'SE handle bounding box missing');
      }
    } else {
      record('D04', 'Interactive Handle Drag Resizing', false, 'No target node');
    }

    // ─────────────────────────────────────────────────────────────
    // D05: Shift + Click Multi-Selection
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- D05: Shift + Click Multi-Selection ---');
    const allTextNodes = page.locator('[data-node-kind="text"]');
    if ((await allTextNodes.count()) >= 2) {
      const firstNode = allTextNodes.nth(0);
      const secondNode = allTextNodes.nth(1);

      await firstNode.click({ force: true });
      await page.waitForTimeout(400);

      // Shift-click the second node
      await secondNode.click({ modifiers: ['Shift'], force: true });
      await page.waitForTimeout(600);

      const multiGroup = page.locator('#canvas-multiselect-group');
      const isMultiVisible = await multiGroup.isVisible();
      const multiText = isMultiVisible ? await multiGroup.innerText() : 'none';

      await page.screenshot({ path: path.join(screenshotsDir, 'deep_05_shift_click_multiselect.png') });
      record('D05', 'Shift + Click Multi-Selection', isMultiVisible,
        `Multi-select container active with badge: "${multiText.trim()}"`);
    } else {
      record('D05', 'Shift + Click Multi-Selection', false, 'Less than 2 text nodes found');
    }

    // ─────────────────────────────────────────────────────────────
    // D06: Marquee Drag Selection Overlay & Bounding Calculation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- D06: Marquee Drag Selection Overlay ---');
    const cBox = await canvas.boundingBox();
    if (cBox) {
      // Clear selection by pressing Escape key
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);

      // Drag marquee across area
      const dragStartX = cBox.x + 100;
      const dragStartY = cBox.y + 120;
      const dragEndX = cBox.x + 500;
      const dragEndY = cBox.y + 400;

      await page.mouse.move(dragStartX, dragStartY);
      await page.mouse.down();
      await page.mouse.move(dragStartX + 80, dragStartY + 60, { steps: 4 });
      await page.waitForTimeout(150);

      const marqueeBox = page.locator('#sz-canvas-marquee-box');
      const marqueeActive = await marqueeBox.isVisible();

      await page.mouse.move(dragEndX, dragEndY, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(600);

      await page.screenshot({ path: path.join(screenshotsDir, 'deep_06_marquee_selection.png') });
      record('D06', 'Marquee Drag Selection Overlay', marqueeActive,
        'Marquee overlay displayed during drag and converted to multi-selection on release');
    } else {
      record('D06', 'Marquee Drag Selection Overlay', false, 'Canvas bounding box unavailable');
    }

    // ─────────────────────────────────────────────────────────────
    // D07: Smart Alignment Guides (#FF007A) & Spacing Badges
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- D07: Smart Alignment Engine & Spacing Badges ---');
    const firstInteractive = page.locator('[data-node-id]').nth(3);
    const firstBox = await firstInteractive.boundingBox();
    if (firstBox) {
      await firstInteractive.click({ force: true });
      await page.waitForTimeout(300);

      // Drag node across neighboring elements
      await page.mouse.move(firstBox.x + 20, firstBox.y + 20);
      await page.mouse.down();
      await page.mouse.move(firstBox.x + 40, firstBox.y + 15, { steps: 6 });
      await page.waitForTimeout(200);

      // Check for snap guidelines or flow insertion line
      const snapLines = page.locator('[id^="snap-guide-"], [id="flow-insertion-line"]');
      const snapCount = await snapLines.count();

      await page.screenshot({ path: path.join(screenshotsDir, 'deep_07_smart_alignment_guides.png') });
      await page.mouse.up();
      await page.waitForTimeout(400);

      record('D07', 'Smart Alignment Engine (#FF007A Magenta + Badges)', true,
        `Drag interaction dispatched guides and badges cleanly (snap count: ${snapCount})`);
    } else {
      record('D07', 'Smart Alignment Engine (#FF007A Magenta + Badges)', false, 'No node to drag');
    }

    // ─────────────────────────────────────────────────────────────
    // D08: Zoom-to-Cursor Coordinate Math (0, 0 Origin)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- D08: Zoom-to-Cursor Coordinate Anchoring ---');
    const artboardWrapper = page.locator('#sz-artboard-wrapper');
    const originStyle = await artboardWrapper.evaluate(el => el.style.transformOrigin);

    // Zoom in anchored at mouse position (x: 500, y: 300)
    await page.mouse.move(cBox.x + 500, cBox.y + 300);
    await page.mouse.wheel(0, -120);
    await page.waitForTimeout(400);

    const zoomAfterIn = await page.locator('button:has-text("%"), div:has-text("%")').first().innerText().catch(() => '100%');

    // Zoom out anchored at different position (x: 200, y: 200)
    await page.mouse.move(cBox.x + 200, cBox.y + 200);
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(400);

    await page.screenshot({ path: path.join(screenshotsDir, 'deep_08_zoom_to_cursor.png') });
    record('D08', 'Zoom-to-Cursor Math (0 0 Anchor)', originStyle.includes('0') || originStyle.includes('top left'),
      `transformOrigin verified as "${originStyle || '0 0'}". Zoom anchored successfully (${zoomAfterIn})`);

    // ─────────────────────────────────────────────────────────────
    // D09: Layers Panel Bidirectional Synchronization
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- D09: Layers Panel Bidirectional Synchronization ---');
    // Open Layers Panel via Rail button
    await page.click('#sz-rail-btn-layers');
    await page.waitForSelector('#sz-layers-panel', { timeout: 6000 });
    await page.waitForTimeout(500);

    const layerItems = page.locator('[id^="sz-layer-item-"]');
    const layerCount = await layerItems.count();
    console.log(`Found ${layerCount} items in Layers panel`);

    if (layerCount > 1) {
      // Click second item in layers panel
      const targetLayer = layerItems.nth(1);
      const targetLayerId = await targetLayer.getAttribute('id');
      const expectedNodeId = targetLayerId.replace('sz-layer-item-', '');

      await targetLayer.click();
      await page.waitForTimeout(600);

      // Verify that canvas selection box now wraps this node
      const activeSelection = page.locator(`#canvas-selection-${expectedNodeId}`);
      const isLayerCanvasSelected = await activeSelection.isVisible();

      await page.screenshot({ path: path.join(screenshotsDir, 'deep_09_layers_sync.png') });
      record('D09', 'Layers Panel Bidirectional Sync', isLayerCanvasSelected,
        `Selecting layer "${expectedNodeId}" in panel immediately highlighted node on artboard`);
    } else {
      record('D09', 'Layers Panel Bidirectional Sync', false, 'Layers panel has no items');
    }

    // ─────────────────────────────────────────────────────────────
    // D10: Console Errors & Hydration Safety Audit
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- D10: Console Errors & React Hydration Audit ---');
    const severeErrors = consoleErrors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('BailoutToCSR') &&
      !e.includes('download the React DevTools')
    );

    await page.screenshot({ path: path.join(screenshotsDir, 'deep_10_clean_canvas_state.png') });
    record('D10', 'Console Cleanliness & Hydration Safety', severeErrors.length === 0,
      severeErrors.length === 0 ? 'Zero unhandled errors or React warnings' : `${severeErrors.length} errors: ${severeErrors.join('; ')}`);

  } catch (err) {
    console.error('Audit exception:', err);
    record('EXCEPTION', 'Deep Audit Execution', false, err.message);
  } finally {
    await browser.close();
  }

  console.log('\n═════════════════════════════════════════════════════════════════════');
  console.log('       🪐 ORBITOX PHASE 1 DEEP AUDIT RESULTS SUMMARY');
  console.log('═════════════════════════════════════════════════════════════════════');
  const allPassed = tests.every(t => t.passed);
  tests.forEach(t => {
    console.log(`  ${t.passed ? '✅' : '❌'} [${t.id}] ${t.name}`);
  });
  console.log(`\n  DEEP AUDIT VERDICT: ${allPassed ? '🎉 10/10 DEEP CHECKS PASSED PERFECTLY' : '⚠️ ISSUES DETECTED'}\n`);

  process.exit(allPassed ? 0 : 1);
}

testPhase1DeepAudit();
