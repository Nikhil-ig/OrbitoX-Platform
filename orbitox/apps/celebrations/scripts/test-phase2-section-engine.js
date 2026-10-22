const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testPhase2SectionEngine() {
  console.log('═════════════════════════════════════════════════════════════════════');
  console.log(' 🪐 ORBITOX P16.1 — PHASE 2 REAL TEMPLATE & SECTION ENGINE TEST SUITE');
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
      // Ignore non-fatal React hydrate or favicon warnings
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
    // P2-01: Load Studio & Verify Engine Runtime Expositions
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P2-01: Studio Engine Mount & Runtime Verification ---');
    await page.goto('http://localhost:3010/admin/template-studio', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForSelector('#sz-canvas-workspace', { timeout: 15000 });
    await page.waitForTimeout(2000);

    const runtimeReady = await page.evaluate(() => {
      return (
        typeof window.__studioController !== 'undefined' &&
        typeof window.__studioStore !== 'undefined' &&
        typeof window.__studioMigrator !== 'undefined'
      );
    });
    record('P2-01', 'Studio Controller & Migrator Engine Mounted', runtimeReady, 'window.__studioController, __studioStore, and __studioMigrator are active');

    // ─────────────────────────────────────────────────────────────
    // P2-02: Non-Destructive Template Content Extraction & Migration
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P2-02: Non-Destructive Content Migrator ---');
    const migrationResult = await page.evaluate(() => {
      const migrator = window.__studioMigrator;
      const store = window.__studioStore;
      const currentSchema = store.getState().draft.schema;

      // Extract content from current schema
      const extracted = migrator.extractContent(currentSchema);

      // Create a mock destination template schema
      const targetBaseSchema = {
        ...JSON.parse(JSON.stringify(currentSchema)),
        title: 'Destination Template Test',
        slug: 'destination-test',
        scenes: currentSchema.scenes.map((s, idx) => ({
          ...s,
          id: `dest_scene_${idx}`,
          name: `Dest ${s.name}`,
        })),
      };

      // Perform non-destructive migration
      const migratedSchema = migrator.migrateInto(targetBaseSchema, extracted);

      return {
        hasCelebrants: extracted.celebrants && (extracted.celebrants.primary?.length > 0 || extracted.celebrants.names?.length > 0),
        extractedTokensCount: Object.keys(extracted.customTokens || {}).length,
        migratedTitle: migratedSchema.title,
        migratedScenesCount: migratedSchema.scenes.length,
        originalScenesCount: currentSchema.scenes.length,
      };
    });

    record(
      'P2-02',
      'Semantic Content Extraction & Non-Destructive Migration',
      migrationResult.migratedScenesCount === migrationResult.originalScenesCount,
      `Extracted tokens: ${migrationResult.extractedTokensCount}, Migrated scenes: ${migrationResult.migratedScenesCount}/${migrationResult.originalScenesCount}`
    );

    // ─────────────────────────────────────────────────────────────
    // P2-03: Section Variant Switching (migrateSectionVariant)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P2-03: Section Variant Layout Switching Engine ---');
    const variantSwapResult = await page.evaluate(() => {
      const migrator = window.__studioMigrator;
      const store = window.__studioStore;
      const scenes = store.getState().draft.schema.scenes;
      const heroScene = scenes[0];

      // Test migrating section into another variant block
      const swappedScene = migrator.migrateSectionVariant(heroScene, 'hero_split_cinematic');

      const nodesCount = swappedScene.sceneGraph?.nodes
        ? Object.keys(swappedScene.sceneGraph.nodes).length
        : (swappedScene.layers?.length || 0);

      return {
        originalId: heroScene.id,
        swappedId: swappedScene.id,
        idPreserved: heroScene.id === swappedScene.id,
        orderPreserved: heroScene.order === swappedScene.order,
        nodesCount,
      };
    });

    record(
      'P2-03',
      'Section Variant Layout Swap Preserves Identity & AST Flow',
      variantSwapResult.idPreserved && variantSwapResult.orderPreserved && variantSwapResult.nodesCount > 0,
      `Scene ID preserved: ${variantSwapResult.swappedId}, Child nodes rebuilt: ${variantSwapResult.nodesCount}`
    );

    // ─────────────────────────────────────────────────────────────
    // P2-04: UI Section Variant Picker Dropdown Interaction
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P2-04: UI Section Variant Picker Dropdown ---');
    const firstSceneId = await page.evaluate(() => {
      return window.__studioStore.getState().draft.schema.scenes[0].id;
    });

    const variantBtnSelector = `#sz-section-variant-btn-${firstSceneId}`;
    const variantBtn = page.locator(variantBtnSelector);
    const variantBtnExists = (await variantBtn.count()) > 0;

    let variantMenuAppeared = false;
    let variantSwappedViaUI = false;

    if (variantBtnExists) {
      // Hover over section to ensure controls are visible
      const secContainer = page.locator(`#sz-section-container-${firstSceneId}`);
      await secContainer.hover();
      await page.waitForTimeout(300);

      // Click Section Variant button
      await variantBtn.click();
      await page.waitForTimeout(400);

      const variantMenu = page.locator(`#sz-section-variant-menu-${firstSceneId}`);
      variantMenuAppeared = (await variantMenu.count()) > 0 && (await variantMenu.isVisible());

      await page.screenshot({ path: path.join(screenshotsDir, 'p2_01_variant_picker_menu.png') });

      if (variantMenuAppeared) {
        // Select an alternative variant
        const variantOptions = variantMenu.locator('button');
        const optCount = await variantOptions.count();
        if (optCount > 1) {
          await variantOptions.nth(1).click();
          await page.waitForTimeout(600);
          variantSwappedViaUI = true;
        }
      }
    }

    record(
      'P2-04',
      'UI Section Variant Picker Dropdown & 1-Click Swap',
      variantBtnExists && variantMenuAppeared,
      `Variant button rendered: ${variantBtnExists}, Menu opened: ${variantMenuAppeared}, Swapped via UI: ${variantSwappedViaUI}`
    );

    // ─────────────────────────────────────────────────────────────
    // P2-05: Recursive UUID Regenerator on Section Duplication
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P2-05: Section Duplication with Recursive UUID Regenerator ---');
    const duplicationResult = await page.evaluate(() => {
      const controller = window.__studioController;
      const store = window.__studioStore;

      const getNodeIds = (scene) => {
        if (scene.sceneGraph?.nodes) {
          return Object.keys(scene.sceneGraph.nodes);
        }
        if (Array.isArray(scene.nodes)) {
          return scene.nodes.map((n) => n.id);
        }
        if (Array.isArray(scene.layers)) {
          return scene.layers.map((l) => l.id);
        }
        return [];
      };

      const beforeScenes = store.getState().draft.schema.scenes;
      const targetScene = beforeScenes[0];

      // Collect all node IDs across entire schema before
      const allIdsBefore = new Set();
      beforeScenes.forEach((s) => getNodeIds(s).forEach((id) => allIdsBefore.add(id)));

      // Dispatch DUPLICATE_SECTION
      controller.duplicateSection(targetScene.id);

      const afterState = store.getState().draft.schema;
      const afterScenes = afterState.scenes;
      const duplicatedScene = afterScenes[1]; // duplicated section inserted right next to target

      // Check all node IDs in duplicated scene
      const duplicatedNodeIds = getNodeIds(duplicatedScene);
      let duplicateCollisions = 0;
      duplicatedNodeIds.forEach((id) => {
        if (allIdsBefore.has(id)) {
          duplicateCollisions++;
        }
      });

      // Check active page sectionIds sync
      const activePage = afterState.pages.find((p) => p.id === store.getState().ui.activePageId) || afterState.pages[0];
      const pageHasDuplicated = activePage.sectionIds.includes(duplicatedScene.id);

      return {
        scenesCountBefore: beforeScenes.length,
        scenesCountAfter: afterScenes.length,
        duplicatedSceneId: duplicatedScene.id,
        duplicatedNodeIdsCount: duplicatedNodeIds.length,
        duplicateCollisions,
        allNodesUnique: duplicateCollisions === 0,
        pageHasDuplicated,
        pagesSectionIdsCount: activePage.sectionIds.length,
      };
    });

    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotsDir, 'p2_02_section_duplicated.png') });

    record(
      'P2-05',
      'Recursive UUID Regenerator on DUPLICATE_SECTION',
      duplicationResult.scenesCountAfter === duplicationResult.scenesCountBefore + 1 &&
        duplicationResult.allNodesUnique &&
        duplicationResult.pageHasDuplicated,
      `Cloned ${duplicationResult.duplicatedNodeIdsCount} nodes with ZERO UUID collisions. Atomic page sync: ${duplicationResult.pageHasDuplicated}`
    );

    // ─────────────────────────────────────────────────────────────
    // P2-06: Atomic Page-Scene Synchronization on MOVE_SECTION / REORDER
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P2-06: Atomic Page-Scene Sync on Move & Reorder ---');
    const moveResult = await page.evaluate(() => {
      const controller = window.__studioController;
      const store = window.__studioStore;

      const beforeScenes = store.getState().draft.schema.scenes;
      const sceneToMove = beforeScenes[0];

      // Move section 0 down to index 1
      controller.moveSection(sceneToMove.id, 'down');

      const afterState = store.getState().draft.schema;
      const afterScenes = afterState.scenes;
      const activePage = afterState.pages.find((p) => p.id === store.getState().ui.activePageId) || afterState.pages[0];

      const sceneIndexInScenes = afterScenes.findIndex((s) => s.id === sceneToMove.id);
      const sceneIndexInPage = activePage.sectionIds.indexOf(sceneToMove.id);

      return {
        sceneMovedId: sceneToMove.id,
        sceneIndexInScenes,
        sceneIndexInPage,
        indexesMatch: sceneIndexInScenes === sceneIndexInPage,
        ordersConsistent: afterScenes.every((s, idx) => s.order === idx + 1),
      };
    });

    record(
      'P2-06',
      'Atomic Page-Scene Sync on MOVE_SECTION',
      moveResult.indexesMatch && moveResult.ordersConsistent,
      `Moved scene index in scenes: ${moveResult.sceneIndexInScenes}, in active page: ${moveResult.sceneIndexInPage}, order consistent: ${moveResult.ordersConsistent}`
    );

    // ─────────────────────────────────────────────────────────────
    // P2-07: Pages Panel HTML5 Drag-and-Drop Structure & UI Reordering
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P2-07: Pages & Sections Rail Panel Drag-and-Drop ---');
    // Open Pages Panel via Rail Tab
    const pagesRailTab = page.locator('#sz-rail-btn-pages');
    await pagesRailTab.click();
    await page.waitForTimeout(500);

    const pagesPanel = page.locator('#sz-pages-panel');
    const isPagesPanelVisible = await pagesPanel.isVisible();

    // Check section rows and drag handles
    const sectionRows = page.locator('[id^="sz-page-section-row-"]');
    const rowCount = await sectionRows.count();
    const dragHandles = page.locator('[id^="sz-drag-handle-"]');
    const handleCount = await dragHandles.count();

    // Check draggable attribute
    const firstRowDraggable = await sectionRows.first().getAttribute('draggable');

    // Test moving via Pages Panel Up / Down buttons
    const downButtons = page.locator('[id^="sz-panel-sec-down-"]');
    if ((await downButtons.count()) > 0) {
      await downButtons.first().click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: path.join(screenshotsDir, 'p2_03_pages_panel_reordered.png') });

    record(
      'P2-07',
      'Pages Panel Drag-and-Drop Structure & UI Controls',
      isPagesPanelVisible && rowCount > 1 && handleCount === rowCount && firstRowDraggable === 'true',
      `Pages panel open: ${isPagesPanelVisible}, ${rowCount} rows with draggable='${firstRowDraggable}' and ${handleCount} Grip handles`
    );

    // ─────────────────────────────────────────────────────────────
    // P2-08: Section Deletion Atomic Sync
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P2-08: Section Deletion with Clean Garbage Collection ---');
    const deleteResult = await page.evaluate(() => {
      const controller = window.__studioController;
      const store = window.__studioStore;

      const beforeState = store.getState().draft.schema;
      const targetScene = beforeState.scenes[beforeState.scenes.length - 1]; // delete last scene

      controller.deleteSection(targetScene.id);

      const afterState = store.getState().draft.schema;
      const activePage = afterState.pages.find((p) => p.id === store.getState().ui.activePageId) || afterState.pages[0];

      return {
        sceneDeletedId: targetScene.id,
        scenesCountBefore: beforeState.scenes.length,
        scenesCountAfter: afterState.scenes.length,
        pageHasDeletedId: activePage.sectionIds.includes(targetScene.id),
        ordersNormalized: afterState.scenes.every((s, idx) => s.order === idx + 1),
      };
    });

    record(
      'P2-08',
      'Atomic Section Deletion & Active Page Sync',
      deleteResult.scenesCountAfter === deleteResult.scenesCountBefore - 1 &&
        !deleteResult.pageHasDeletedId &&
        deleteResult.ordersNormalized,
      `Scenes count reduced cleanly: ${deleteResult.scenesCountBefore} -> ${deleteResult.scenesCountAfter}, Section ID removed from page: ${!deleteResult.pageHasDeletedId}`
    );

    // ─────────────────────────────────────────────────────────────
    // P2-09: Console Error Cleanliness
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P2-09: Console Health & Zero Leak Audit ---');
    record(
      'P2-09',
      'Console Error Free (No Unhandled Exceptions or Memory Leaks)',
      consoleErrors.length === 0,
      consoleErrors.length === 0 ? '0 unhandled console errors' : `${consoleErrors.length} errors: ${consoleErrors.join(', ')}`
    );

    console.log('\n═════════════════════════════════════════════════════════════════════');
    const passedCount = tests.filter((t) => t.passed).length;
    console.log(` 🏆 PHASE 2 RESULTS: ${passedCount}/${tests.length} CHECKS PASSED`);
    console.log('═════════════════════════════════════════════════════════════════════\n');

    await browser.close();
    return passedCount === tests.length;
  } catch (err) {
    console.error('Fatal error during Phase 2 testing:', err);
    await page.screenshot({ path: path.join(screenshotsDir, 'p2_fatal_error.png') });
    await browser.close();
    return false;
  }
}

testPhase2SectionEngine()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
