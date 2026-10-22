const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testPhase4MasterComponents() {
  console.log('═════════════════════════════════════════════════════════════════════');
  console.log(' 🪐 ORBITOX P16.1 — PHASE 4 MASTER COMPONENTS & OVERRIDES TEST SUITE');
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
    // Load Studio
    // ─────────────────────────────────────────────────────────────
    console.log('Loading OrbitoX Visual Studio...');
    await page.goto('http://localhost:3010/admin/template-studio', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForSelector('#sz-canvas-workspace', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // ─────────────────────────────────────────────────────────────
    // P4-01: Create Master Component from Selection
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P4-01: Create Master Component from Selection ---');
    const createResult = await page.evaluate(() => {
      const controller = window.__studioController;
      const store = window.__studioStore;
      if (!controller || !store) return { success: false, reason: 'No controller or store' };

      const state = store.getState();
      const scene = state.draft.schema.scenes[0];
      const nodes = Object.values(scene.sceneGraph.nodes);
      const textNode = nodes.find(n => n.kind === 'text') || nodes[1];
      if (!textNode) return { success: false, reason: 'No suitable node to turn into component' };

      controller.selectNode(textNode.id, scene.id);
      controller.createComponent(textNode.id, 'Celestial Header Component');

      const afterState = store.getState();
      const afterScene = afterState.draft.schema.scenes[0];
      const updatedNode = afterScene.sceneGraph.nodes[textNode.id];
      const masterRegistry = afterState.draft.schema.masterComponents || {};

      const compId = updatedNode?.component?.masterComponentId;
      const inRegistry = Boolean(compId && masterRegistry[compId]);

      return {
        success: Boolean(updatedNode?.component?.isMaster && inRegistry),
        nodeId: textNode.id,
        compId,
        nodeName: updatedNode?.name,
        isMaster: updatedNode?.component?.isMaster,
        inRegistry,
      };
    });

    await page.waitForTimeout(500);

    const masterBadgeVisible = await page.locator('#sz-master-component-badge').isVisible().catch(() => false);
    record(
      'P4-01',
      'Create Master Component from Selection & Register in Schema AST',
      createResult.success && masterBadgeVisible,
      `Master ID: ${createResult.compId}, In Registry: ${createResult.inRegistry}, Badge Visible: ${masterBadgeVisible}`
    );

    // ─────────────────────────────────────────────────────────────
    // P4-02: Document Components Drawer Catalog
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P4-02: Document Components Drawer Catalog ---');
    const componentsRailBtn = page.locator('#sz-rail-btn-components');
    await componentsRailBtn.click();
    await page.waitForTimeout(600);

    const componentsPanel = page.locator('#sz-components-panel');
    const isPanelOpen = await componentsPanel.isVisible();

    const masterCard = page.locator(`#sz-master-comp-card-${createResult.compId}`);
    const isMasterCardVisible = await masterCard.isVisible().catch(() => false);
    const countBadgeText = await page.locator('#sz-components-count-badge').innerText().catch(() => '');

    record(
      'P4-02',
      'Components Drawer Mounts with Master Component Catalog',
      isPanelOpen && isMasterCardVisible && countBadgeText === '1',
      `Drawer Open: ${isPanelOpen}, Card Visible: ${isMasterCardVisible}, Master Count: ${countBadgeText}`
    );

    await page.screenshot({ path: path.join(screenshotsDir, 'p4_01_master_components_drawer.png') });

    // ─────────────────────────────────────────────────────────────
    // P4-03: Instantiate Component on Canvas
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P4-03: Instantiate Component on Canvas ---');
    const instantiateResult = await page.evaluate((compId) => {
      const controller = window.__studioController;
      const store = window.__studioStore;
      const state = store.getState();
      const scene = state.draft.schema.scenes[0];
      const initialNodeCount = Object.keys(scene.sceneGraph.nodes).length;

      controller.instantiateComponent(compId);

      const afterState = store.getState();
      const afterScene = afterState.draft.schema.scenes[0];
      const afterNodes = Object.values(afterScene.sceneGraph.nodes);
      const afterNodeCount = afterNodes.length;

      const instanceNode = afterNodes.find(
        n => n.component?.masterComponentId === compId && !n.component?.isMaster
      );

      if (instanceNode) {
        controller.selectNode(instanceNode.id, afterScene.id);
      }

      return {
        success: Boolean(instanceNode && afterNodeCount > initialNodeCount),
        instanceId: instanceNode?.id,
        isMaster: instanceNode?.component?.isMaster,
        masterComponentId: instanceNode?.component?.masterComponentId,
        nodeCountBefore: initialNodeCount,
        nodeCountAfter: afterNodeCount,
      };
    }, createResult.compId);

    await page.waitForTimeout(600);

    const instanceBannerVisible = await page.locator('#sz-instance-component-banner').isVisible().catch(() => false);
    record(
      'P4-03',
      'Instantiate Component Clones Subtree with Master Linkage',
      instantiateResult.success && instanceBannerVisible,
      `Instance ID: ${instantiateResult.instanceId}, Nodes: ${instantiateResult.nodeCountBefore} → ${instantiateResult.nodeCountAfter}, Banner: ${instanceBannerVisible}`
    );

    await page.screenshot({ path: path.join(screenshotsDir, 'p4_02_component_instance_inspector.png') });

    // ─────────────────────────────────────────────────────────────
    // P4-04: Isolated Property Overrides Tracking
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P4-04: Isolated Property Overrides Tracking ---');
    const overrideResult = await page.evaluate((instId) => {
      const controller = window.__studioController;
      const store = window.__studioStore;
      const state = store.getState();
      const scene = state.draft.schema.scenes[0];
      const masterRegistry = state.draft.schema.masterComponents || {};

      // Mutate instance text and style
      controller.setInstanceOverride(instId, {
        textContent: 'VIP RSVP Exclusive Access',
        'style.color': '#FFD700',
      });

      const afterState = store.getState();
      const afterScene = afterState.draft.schema.scenes[0];
      const instance = afterScene.sceneGraph.nodes[instId];
      const masterId = instance?.component?.masterComponentId;
      const master = masterRegistry[masterId];

      const overrides = instance?.component?.instanceOverrides || {};
      const overrideCount = Object.keys(overrides).length;

      return {
        success: instance?.textContent === 'VIP RSVP Exclusive Access' &&
                 overrideCount === 2 &&
                 master?.textContent !== 'VIP RSVP Exclusive Access',
        instanceText: instance?.textContent,
        masterText: master?.textContent,
        overrides,
        overrideCount,
      };
    }, instantiateResult.instanceId);

    await page.waitForTimeout(500);

    const overrideCountBadge = await page.locator('#sz-instance-override-count').innerText().catch(() => '');
    const textOverridePill = await page.locator('#sz-override-indicator-textContent').isVisible().catch(() => false);

    record(
      'P4-04',
      'Isolated Property Overrides Tracked in Component AST',
      overrideResult.success && textOverridePill && overrideCountBadge.includes('2'),
      `Instance Text: "${overrideResult.instanceText}", Master Text: "${overrideResult.masterText}", Overrides: ${overrideCountBadge}, Pill Visible: ${textOverridePill}`
    );

    // ─────────────────────────────────────────────────────────────
    // P4-05: Single Property Override Reset
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P4-05: Single Property Override Reset ---');
    const singleResetResult = await page.evaluate((instId) => {
      const controller = window.__studioController;
      const store = window.__studioStore;
      const state = store.getState();
      const scene = state.draft.schema.scenes[0];
      const masterId = scene.sceneGraph.nodes[instId]?.component?.masterComponentId;
      const originalMasterText = state.draft.schema.masterComponents[masterId]?.textContent;

      controller.resetInstanceOverrides(instId, 'textContent');

      const afterState = store.getState();
      const afterScene = afterState.draft.schema.scenes[0];
      const instance = afterScene.sceneGraph.nodes[instId];
      const remainingOverrides = instance?.component?.instanceOverrides || {};

      return {
        success: instance?.textContent === originalMasterText &&
                 remainingOverrides.textContent === undefined &&
                 remainingOverrides['style.color'] !== undefined,
        currentText: instance?.textContent,
        originalMasterText,
        remainingOverrides,
      };
    }, instantiateResult.instanceId);

    await page.waitForTimeout(500);

    record(
      'P4-05',
      'Granular Single Property Override Reset',
      singleResetResult.success,
      `Restored Text: "${singleResetResult.currentText}", Remaining Overrides: ${JSON.stringify(singleResetResult.remainingOverrides)}`
    );

    // ─────────────────────────────────────────────────────────────
    // P4-06: Full Overrides Reset
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P4-06: Full Overrides Reset ---');
    const fullResetBtn = page.locator('#sz-reset-overrides-btn');
    await fullResetBtn.click();
    await page.waitForTimeout(500);

    const fullResetResult = await page.evaluate((instId) => {
      const store = window.__studioStore;
      const scene = store.getState().draft.schema.scenes[0];
      const instance = scene.sceneGraph.nodes[instId];
      const overrides = instance?.component?.instanceOverrides || {};

      return {
        success: Object.keys(overrides).length === 0,
        overrideCount: Object.keys(overrides).length,
      };
    }, instantiateResult.instanceId);

    const isResetDisabled = await fullResetBtn.isDisabled();
    record(
      'P4-06',
      'Full Reset of Instance Overrides Back to Canonical Master',
      fullResetResult.success && isResetDisabled,
      `Overrides Remaining: ${fullResetResult.overrideCount}, Reset Button Disabled: ${isResetDisabled}`
    );

    // ─────────────────────────────────────────────────────────────
    // P4-07: Push Changes to Master Component & Propagation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P4-07: Push Changes to Master & Multi-Instance Propagation ---');
    const pushResult = await page.evaluate((instId) => {
      const controller = window.__studioController;
      const store = window.__studioStore;
      const state = store.getState();
      const scene = state.draft.schema.scenes[0];
      const masterId = scene.sceneGraph.nodes[instId]?.component?.masterComponentId;

      // 1. Create a second instance before pushing
      controller.instantiateComponent(masterId);
      const afterFirstState = store.getState();
      const nodesAfterSecond = Object.values(afterFirstState.draft.schema.scenes[0].sceneGraph.nodes);
      const secondInstance = nodesAfterSecond.find(
        n => n.component?.masterComponentId === masterId && !n.component?.isMaster && n.id !== instId
      );

      // 2. Modify first instance
      controller.updateStyle(instId, {
        border: { radius: '9999px', width: '3px', color: '#10B981', style: 'solid' },
      });

      // 3. Push to master
      controller.pushInstanceToMaster(instId);

      const pushedState = store.getState();
      const pushedScene = pushedState.draft.schema.scenes[0];
      const masterInRegistry = pushedState.draft.schema.masterComponents[masterId];
      const inst1 = pushedScene.sceneGraph.nodes[instId];
      const inst2 = secondInstance ? pushedScene.sceneGraph.nodes[secondInstance.id] : null;

      const masterHasBorder = masterInRegistry?.style?.border?.color === '#10B981';
      const inst2ReceivedBorder = inst2?.style?.border?.color === '#10B981';
      const inst1OverridesCleared = Object.keys(inst1?.component?.instanceOverrides || {}).length === 0;

      return {
        success: Boolean(masterHasBorder && inst2ReceivedBorder && inst1OverridesCleared),
        masterBorder: masterInRegistry?.style?.border,
        inst2Border: inst2?.style?.border,
        inst1OverridesCleared,
      };
    }, instantiateResult.instanceId);

    await page.waitForTimeout(500);

    record(
      'P4-07',
      'Push Instance to Master Propagates to All Sibling Instances',
      pushResult.success,
      `Master Border: ${JSON.stringify(pushResult.masterBorder)}, Instance 2 Propagated: ${Boolean(pushResult.inst2Border)}, Inst 1 Cleared: ${pushResult.inst1OverridesCleared}`
    );

    // ─────────────────────────────────────────────────────────────
    // P4-08: Detach Instance from Master
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P4-08: Detach Instance from Master ---');
    const detachBtn = page.locator('#sz-detach-instance-btn');
    await detachBtn.click();
    await page.waitForTimeout(600);

    const detachResult = await page.evaluate((instId) => {
      const store = window.__studioStore;
      const scene = store.getState().draft.schema.scenes[0];
      const node = scene.sceneGraph.nodes[instId];

      return {
        success: Boolean(node?.component?.isDetached && !node?.component?.masterComponentId),
        isDetached: node?.component?.isDetached,
        masterComponentId: node?.component?.masterComponentId,
        nodeName: node?.name,
      };
    }, instantiateResult.instanceId);

    const instanceBannerNowGone = !(await page.locator('#sz-instance-component-banner').isVisible().catch(() => false));

    record(
      'P4-08',
      'Detach Instance Breaks Master Linkage into Autonomous Layer',
      detachResult.success && instanceBannerNowGone,
      `Detached: ${detachResult.isDetached}, Master ID: ${detachResult.masterComponentId}, Banner Disappeared: ${instanceBannerNowGone}`
    );

    await page.screenshot({ path: path.join(screenshotsDir, 'p4_03_detached_element_on_canvas.png') });

    // ─────────────────────────────────────────────────────────────
    // P4-09: Layers Panel ❖ Master & ◇ Instance Badges
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P4-09: Layers Panel ❖ Master & ◇ Instance Badges ---');
    const layersRailBtn = page.locator('#sz-rail-btn-layers');
    await layersRailBtn.click();
    await page.waitForTimeout(600);

    const layersPanel = page.locator('#sz-layers-panel');
    const isLayersPanelOpen = await layersPanel.isVisible();

    const layerItemsText = await layersPanel.innerText().catch(() => '');
    const hasMasterDiamond = layerItemsText.includes('❖');
    const hasInstanceDiamond = layerItemsText.includes('◇');

    record(
      'P4-09',
      'Layers Panel Visual ❖ Master & ◇ Instance Typography Badges',
      isLayersPanelOpen && hasMasterDiamond && hasInstanceDiamond,
      `Layers Open: ${isLayersPanelOpen}, Master Diamond (❖): ${hasMasterDiamond}, Instance Diamond (◇): ${hasInstanceDiamond}`
    );

    await page.screenshot({ path: path.join(screenshotsDir, 'p4_04_layers_component_badges.png') });

    // ─────────────────────────────────────────────────────────────
    // P4-10: Console Health & Zero Unhandled Exceptions
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P4-10: Console Health & Zero Leak Audit ---');
    record(
      'P4-10',
      'Console Cleanliness & Zero Unhandled Exceptions',
      consoleErrors.length === 0,
      `${consoleErrors.length} unhandled console errors`
    );

    // ─────────────────────────────────────────────────────────────
    // SUMMARY
    // ─────────────────────────────────────────────────────────────
    const passedCount = tests.filter((t) => t.passed).length;
    console.log('\n═════════════════════════════════════════════════════════════════════');
    console.log(` 🏆 PHASE 4 RESULTS: ${passedCount}/${tests.length} CHECKS PASSED`);
    console.log('═════════════════════════════════════════════════════════════════════\n');

    if (passedCount !== tests.length) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during Phase 4 verification:', err);
    await page.screenshot({ path: path.join(screenshotsDir, 'p4_fatal_error.png') });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testPhase4MasterComponents();
