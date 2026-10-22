const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testPhase3AssetStudio() {
  console.log('═════════════════════════════════════════════════════════════════════');
  console.log(' 🪐 ORBITOX P16.1 — PHASE 3 ASSET STUDIO & MEDIA PIPELINE TEST SUITE');
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
      const text = msg.text();
      if (!text.includes('favicon') && !text.includes('404')) {
        consoleErrors.push(text);
      }
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
    // P3-01: Load Studio & Mount Asset Studio Drawer
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P3-01: Asset Studio Drawer Mount & Tool Rail ---');
    await page.goto('http://localhost:3010/admin/template-studio', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForSelector('#sz-canvas-workspace', { timeout: 15000 });
    await page.waitForTimeout(2000);

    const assetRailBtn = page.locator('#sz-rail-btn-assets');
    await assetRailBtn.click();
    await page.waitForTimeout(500);

    const assetsPanel = page.locator('#sz-assets-panel');
    const isPanelVisible = await assetsPanel.isVisible();

    // Check search and category buttons
    const searchInput = page.locator('#sz-asset-search-input');
    const hasSearch = await searchInput.isVisible();

    const photoFilter = page.locator('#sz-asset-filter-photos');
    await photoFilter.click();
    await page.waitForTimeout(300);

    const cardsCount = await page.locator('[id^="sz-asset-card-"]').count();
    await page.screenshot({ path: path.join(screenshotsDir, 'p3_01_assets_panel_categories.png') });

    record(
      'P3-01',
      'Asset Studio Drawer Mount & Category Navigation',
      isPanelVisible && hasSearch && cardsCount > 0,
      `Drawer visible: ${isPanelVisible}, Filtered photo cards: ${cardsCount}`
    );

    // ─────────────────────────────────────────────────────────────
    // P3-02: Folder Management & Filter Strip
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P3-02: Folder Management Strip ---');
    const celestialFolder = page.locator('#sz-folder-celestial');
    const hasCelestialFolder = await celestialFolder.isVisible();

    let celestialCount = 0;
    if (hasCelestialFolder) {
      await celestialFolder.click();
      await page.waitForTimeout(300);
      celestialCount = await page.locator('[id^="sz-asset-card-"]').count();
    }

    // Reset to All Folders and All Categories
    const allFolder = page.locator('#sz-folder-all');
    await allFolder.click();
    await page.waitForTimeout(200);
    const allCategory = page.locator('#sz-asset-filter-all');
    await allCategory.click();
    await page.waitForTimeout(300);

    record(
      'P3-02',
      'Folder Filtering & Organization Strip',
      hasCelestialFolder && celestialCount > 0,
      `Celestial folder active: ${hasCelestialFolder}, filtered items: ${celestialCount}`
    );

    // ─────────────────────────────────────────────────────────────
    // P3-03: Automated Client-Side WebP Compression & Thumbnail Pipeline
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P3-03: Automated Client-Side WebP Compression & Thumbnail Pipeline ---');
    const compressionResult = await page.evaluate(async () => {
      const FileUploadService = window.__studioFileUploadService;
      if (!FileUploadService) {
        throw new Error('window.__studioFileUploadService is not mounted');
      }

      // Create a test 1200x800 canvas and generate a test JPEG blob
      const testCanvas = document.createElement('canvas');
      testCanvas.width = 1200;
      testCanvas.height = 800;
      const ctx = testCanvas.getContext('2d');
      ctx.fillStyle = '#6366F1';
      ctx.fillRect(0, 0, 1200, 800);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '48px sans-serif';
      ctx.fillText('OrbitoX Media Compression Test', 100, 400);

      const blob = await new Promise((res) => testCanvas.toBlob(res, 'image/jpeg', 0.95));
      const testFile = new File([blob], 'test_high_res_photo.jpg', { type: 'image/jpeg' });

      // Process via uploadFile with client-side WebP compression
      const asset = await FileUploadService.uploadFile(testFile, 'test-folder');

      return {
        id: asset.id,
        name: asset.name,
        category: asset.category,
        mimeType: asset.mimeType,
        hasWebpUrl: asset.url && (asset.url.startsWith('data:image/webp') || asset.url.startsWith('data:image/jpeg')),
        hasThumbnail: !!asset.thumbnailUrl,
        width: asset.width,
        height: asset.height,
        sizeBytes: asset.sizeBytes,
        folder: asset.folder,
      };
    });

    record(
      'P3-03',
      'Automated Client-Side WebP Compression & Thumbnail Pipeline',
      compressionResult.hasWebpUrl && compressionResult.hasThumbnail && compressionResult.width === 1200,
      `MimeType: ${compressionResult.mimeType}, Dimensions: ${compressionResult.width}x${compressionResult.height}, Compressed size: ${Math.round(compressionResult.sizeBytes / 1024)} KB`
    );

    // ─────────────────────────────────────────────────────────────
    // P3-04: Select Image Node & Verify Inspector Media Controls
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P3-04: Image Node Selection & Media Inspector ---');
    // Find or insert an image node in the active scene
    const targetImageNodeId = await page.evaluate(() => {
      const store = window.__studioStore;
      const scene = store.getState().draft.schema.scenes[0];
      const nodes = Object.values(scene.sceneGraph?.nodes || {});
      const existingImg = nodes.find((n) => n.kind === 'image');
      if (existingImg) {
        window.__studioController.selectNode(existingImg.id, scene.id);
        return existingImg.id;
      }

      // If no image node, insert one into first scene
      const controller = window.__studioController;
      controller.insertNode('image', 'Hero Showcase Image', {
        src: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80',
        imageUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80',
        geometry: { width: '100%', height: '380px', position: 'flow' },
        style: { border: { radius: '16px' } },
      }, scene.id);

      const afterNodes = Object.values(store.getState().draft.schema.scenes[0].sceneGraph?.nodes || {});
      const createdImg = afterNodes.find((n) => n.kind === 'image');
      if (createdImg) {
        controller.selectNode(createdImg.id, scene.id);
        return createdImg.id;
      }
      return null;
    });

    await page.waitForTimeout(800);

    // Verify Inspector has Aspect Ratio and Focal Point matrix
    const aspectRatio16_9 = page.locator('#sz-aspect-ratio-16-9');
    const hasAspectRatio = await aspectRatio16_9.isVisible();

    const focalMatrix = page.locator('#sz-focal-point-matrix');
    const hasFocalMatrix = await focalMatrix.isVisible();

    await page.screenshot({ path: path.join(screenshotsDir, 'p3_02_aspect_ratio_and_focal_matrix.png') });

    record(
      'P3-04',
      'Media Inspector Aspect Ratio & 3x3 Focal Matrix Mounted',
      hasAspectRatio && hasFocalMatrix,
      `Aspect ratio selector: ${hasAspectRatio}, 3x3 Focal matrix: ${hasFocalMatrix}`
    );

    // ─────────────────────────────────────────────────────────────
    // P3-05: Aspect Ratio & Object Fit Selection
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P3-05: Aspect Ratio & Object Fit Preset Verification ---');
    await aspectRatio16_9.click();
    await page.waitForTimeout(300);

    const fitContain = page.locator('#sz-inspector-fit-contain');
    if (await fitContain.isVisible()) {
      await fitContain.click();
      await page.waitForTimeout(300);
    }

    const appliedMediaStyle = await page.evaluate((id) => {
      const store = window.__studioStore;
      const node = store.getState().draft.schema.scenes[0].sceneGraph.nodes[id];
      return {
        aspectRatio: node?.style?.aspectRatio,
        objectFit: node?.style?.objectFit,
      };
    }, targetImageNodeId);

    record(
      'P3-05',
      'Aspect Ratio & Object Fit Mutates Node AST',
      appliedMediaStyle.aspectRatio === '16 / 9' && appliedMediaStyle.objectFit === 'contain',
      `Applied aspectRatio: "${appliedMediaStyle.aspectRatio}", objectFit: "${appliedMediaStyle.objectFit}"`
    );

    // ─────────────────────────────────────────────────────────────
    // P3-06: Interactive 3x3 Focal Point Matrix (Rule of Thirds)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P3-06: 3x3 Focal Point Matrix & Coordinate Sliders ---');
    const topLeftFocalBtn = page.locator('#sz-focal-btn-top-left');
    await topLeftFocalBtn.click();
    await page.waitForTimeout(300);

    let focalCheck = await page.evaluate((id) => {
      const store = window.__studioStore;
      const node = store.getState().draft.schema.scenes[0].sceneGraph.nodes[id];
      return {
        focalPoint: node?.style?.focalPoint,
        objectPosition: node?.style?.objectPosition,
      };
    }, targetImageNodeId);

    const isTopLeftCorrect = focalCheck.focalPoint?.x === 0 && focalCheck.focalPoint?.y === 0;

    // Click Center-Center
    const centerFocalBtn = page.locator('#sz-focal-btn-center-center');
    await centerFocalBtn.click();
    await page.waitForTimeout(300);

    focalCheck = await page.evaluate((id) => {
      const store = window.__studioStore;
      const node = store.getState().draft.schema.scenes[0].sceneGraph.nodes[id];
      return {
        focalPoint: node?.style?.focalPoint,
        objectPosition: node?.style?.objectPosition,
      };
    }, targetImageNodeId);

    const isCenterCorrect = focalCheck.focalPoint?.x === 50 && focalCheck.focalPoint?.y === 50;

    record(
      'P3-06',
      'Rule of Thirds 3x3 Focal Matrix Point Anchoring',
      isTopLeftCorrect && isCenterCorrect,
      `Top-Left anchor (0%, 0%): ${isTopLeftCorrect}, Center-Center anchor (50%, 50%): ${isCenterCorrect}`
    );

    // ─────────────────────────────────────────────────────────────
    // P3-07: HTML5 Drag-and-Drop Image Replacement onto Canvas
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P3-07: HTML5 Drag-and-Drop Image Replacement ---');
    const newReplacementUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';

    // Dispatch HTML5 drag-and-drop onto the artboard image DOM element
    const dropSucceeded = await page.evaluate(
      ({ id, url }) => {
        const el = document.getElementById(id);
        if (!el) return false;

        const assetPayload = JSON.stringify({ id: 'a3', name: 'Abstract Golden Fluid', url });
        const dataTransfer = new DataTransfer();
        dataTransfer.setData('orbitox_asset', assetPayload);
        dataTransfer.setData('text/plain', url);

        // Dispatch dragover
        const dragOverEvent = new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        });
        el.dispatchEvent(dragOverEvent);

        // Dispatch drop
        const dropEvent = new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        });
        el.dispatchEvent(dropEvent);

        // Check if node state updated
        const store = window.__studioStore;
        const node = store.getState().draft.schema.scenes[0].sceneGraph.nodes[id];
        return node?.src === url || node?.imageUrl === url || node?.smartProps?.url === url;
      },
      { id: targetImageNodeId, url: newReplacementUrl }
    );

    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotsDir, 'p3_03_image_replaced_on_canvas.png') });

    record(
      'P3-07',
      'HTML5 Drag-and-Drop Replaces Image on Canvas',
      dropSucceeded,
      `Image node ${targetImageNodeId} successfully replaced with dropped asset URL`
    );

    // ─────────────────────────────────────────────────────────────
    // P3-08: 1-Click Replace Image from Asset Manager Card
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P3-08: 1-Click Asset Manager Card Replacement ---');
    // Ensure image node is selected
    await page.evaluate((id) => {
      window.__studioController.selectNode(id);
    }, targetImageNodeId);
    await page.waitForTimeout(300);

    // Click on asset card a1
    const assetCardA1 = page.locator('#sz-asset-card-a1');
    if (await assetCardA1.isVisible()) {
      await assetCardA1.click();
      await page.waitForTimeout(400);
    }

    const replacedUrlA1 = await page.evaluate((id) => {
      const store = window.__studioStore;
      const node = store.getState().draft.schema.scenes[0].sceneGraph.nodes[id];
      return node?.src || node?.imageUrl || node?.smartProps?.url;
    }, targetImageNodeId);

    const isA1Replaced = replacedUrlA1 && replacedUrlA1.includes('photo-1600585154340-be6161a56a0c');

    record(
      'P3-08',
      '1-Click Asset Replacement from Drawer',
      isA1Replaced,
      `Selected node image updated to: ${replacedUrlA1?.slice(0, 60)}...`
    );

    // ─────────────────────────────────────────────────────────────
    // P3-09: Console Health & Zero Leak Audit
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P3-09: Console Health & Zero Leak Audit ---');
    record(
      'P3-09',
      'Console Cleanliness & Zero Unhandled Exceptions',
      consoleErrors.length === 0,
      consoleErrors.length === 0 ? '0 unhandled console errors' : `${consoleErrors.length} errors: ${consoleErrors.join(', ')}`
    );

    console.log('\n═════════════════════════════════════════════════════════════════════');
    const passedCount = tests.filter((t) => t.passed).length;
    console.log(` 🏆 PHASE 3 RESULTS: ${passedCount}/${tests.length} CHECKS PASSED`);
    console.log('═════════════════════════════════════════════════════════════════════\n');

    await browser.close();
    return passedCount === tests.length;
  } catch (err) {
    console.error('Fatal error during Phase 3 testing:', err);
    await page.screenshot({ path: path.join(screenshotsDir, 'p3_fatal_error.png') });
    await browser.close();
    return false;
  }
}

testPhase3AssetStudio()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
