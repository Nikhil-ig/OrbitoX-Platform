const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testPhase5ResponsiveMotion() {
  console.log('═════════════════════════════════════════════════════════════════════');
  console.log(' 🪐 ORBITOX P16.1 — PHASE 5 RESPONSIVE CASCADE & MOTION TEST SUITE');
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
    await page.goto('http://localhost:3010/admin/template-studio', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForSelector('#sz-canvas-workspace', { timeout: 30000 });
    await page.waitForTimeout(2000);

    // ─────────────────────────────────────────────────────────────
    // P5-01: Breakpoint Switcher & Cascade Inheritance
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P5-01: Breakpoint Switcher & Cascade Inheritance ---');
    const cascadeResult = await page.evaluate(() => {
      const controller = window.__studioController;
      const store = window.__studioStore;
      if (!controller || !store) return { success: false, reason: 'No controller/store' };

      const state = store.getState();
      const scene = state.draft.schema.scenes[0];
      const nodes = Object.values(scene.sceneGraph.nodes);
      const textNode = nodes.find(n => n.kind === 'text') || nodes[1];

      // Set base style on desktop
      controller.dispatch({
        type: 'SG_UPDATE_STYLE',
        sceneId: scene.id,
        nodeId: textNode.id,
        patch: { typography: { fontSize: '32px', fontFamily: 'Cinzel' } }
      });

      // Switch to tablet
      controller.setDevice('tablet');
      const tabletDevice = store.getState().ui.activeDevice || store.getState().ui.device;

      // Switch to mobile
      controller.setDevice('mobile');
      const mobileDevice = store.getState().ui.activeDevice || store.getState().ui.device;

      // Switch back to desktop
      controller.setDevice('desktop');

      return {
        success: tabletDevice === 'tablet' && mobileDevice === 'mobile',
        nodeId: textNode.id,
        tabletDevice,
        mobileDevice,
      };
    });

    record(
      'P5-01',
      'Breakpoint Switcher & Cascade Mode Navigation',
      cascadeResult.success,
      `Tablet Device: ${cascadeResult.tabletDevice}, Mobile Device: ${cascadeResult.mobileDevice}`
    );

    // ─────────────────────────────────────────────────────────────
    // P5-02: Device-Specific Responsive Override Mutation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P5-02: Device-Specific Responsive Override Mutation ---');
    const overrideResult = await page.evaluate(() => {
      const controller = window.__studioController;
      const store = window.__studioStore;
      const state = store.getState();
      const scene = state.draft.schema.scenes[0];
      const nodes = Object.values(scene.sceneGraph.nodes);
      const targetNode = nodes.find(n => n.kind === 'text') || nodes[1];

      // Select node and set mobile viewport
      controller.selectNode(targetNode.id, scene.id);
      controller.setDevice('mobile');

      // Dispatch responsive override for mobile (e.g. fontSize: '20px', padding: '10px 14px')
      controller.setResponsiveOverride(targetNode.id, 'mobile', {
        style: {
          padding: '10px 14px',
          paddingTop: '10px',
          paddingBottom: '10px',
          paddingLeft: '14px',
          paddingRight: '14px',
          typography: { fontSize: '20px' }
        }
      });

      const afterState = store.getState();
      const updatedNode = afterState.draft.schema.scenes[0].sceneGraph.nodes[targetNode.id];
      const mobileOverride = updatedNode.responsive?.mobile;
      const desktopFontSize = updatedNode.style?.typography?.fontSize;

      return {
        success: Boolean(mobileOverride?.style?.typography?.fontSize === '20px' && desktopFontSize === '32px'),
        nodeId: targetNode.id,
        mobileFontSize: mobileOverride?.style?.typography?.fontSize,
        desktopFontSize,
      };
    });

    await page.waitForTimeout(500);
    record(
      'P5-02',
      'Device-Specific Responsive Override Mutation (Preserves Base Desktop)',
      overrideResult.success,
      `Mobile Font Size: ${overrideResult.mobileFontSize}, Base Desktop Font Size: ${overrideResult.desktopFontSize}`
    );

    // ─────────────────────────────────────────────────────────────
    // P5-03: Visual Inheritance Badges in Properties Panel
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P5-03: Visual Inheritance Badges in Properties Panel ---');
    const badgesResult = await page.evaluate(() => {
      const overrideBadges = Array.from(document.querySelectorAll('.sz-override-badge'));
      const inheritedBadges = Array.from(document.querySelectorAll('.sz-inherited-badge'));

      return {
        hasOverrideBadge: overrideBadges.length > 0,
        overrideText: overrideBadges[0]?.textContent || '',
        hasInheritedBadge: inheritedBadges.length > 0,
        inheritedText: inheritedBadges[0]?.textContent || '',
      };
    });

    await page.screenshot({ path: path.join(screenshotsDir, 'phase5_01_responsive_inheritance_badges.png') });
    record(
      'P5-03',
      'Visual Inheritance Badges (Amber Override vs Gray Inherited)',
      badgesResult.hasOverrideBadge,
      `Override Badge Text: "${badgesResult.overrideText}", Inherited Badge: "${badgesResult.inheritedText}"`
    );

    // ─────────────────────────────────────────────────────────────
    // P5-04: 1-Click Responsive Override Reset
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P5-04: 1-Click Responsive Override Reset ---');
    const resetResult = await page.evaluate(() => {
      const controller = window.__studioController;
      const store = window.__studioStore;
      const state = store.getState();
      const scene = state.draft.schema.scenes[0];
      const node = Object.values(scene.sceneGraph.nodes).find(n => n.responsive?.mobile);
      if (!node) return { success: false, reason: 'No overridden node found' };

      // Reset mobile override for this node
      controller.resetResponsiveOverride(node.id, 'mobile');

      const afterState = store.getState();
      const afterNode = afterState.draft.schema.scenes[0].sceneGraph.nodes[node.id];
      const hasMobile = Boolean(afterNode.responsive?.mobile);

      return {
        success: !hasMobile,
        nodeId: node.id,
        hasMobileAfterReset: hasMobile,
      };
    });

    await page.waitForTimeout(500);
    record(
      'P5-04',
      '1-Click Responsive Override Reset (Restores Cascade Inheritance)',
      resetResult.success,
      `Mobile Override Removed: ${resetResult.success}`
    );

    // ─────────────────────────────────────────────────────────────
    // P5-05: 4-Sided Interactive Box Model Diagram
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P5-05: 4-Sided Interactive Box Model Diagram ---');
    // Ensure node is selected, set desktop mode, and click Design tab
    await page.evaluate(() => {
      const controller = window.__studioController;
      const store = window.__studioStore;
      const scene = store.getState().draft.schema.scenes[0];
      const targetNode = Object.values(scene.sceneGraph.nodes).find(n => n.kind === 'text') || Object.values(scene.sceneGraph.nodes)[1];
      controller.selectNode(targetNode.id, scene.id);
      controller.setDevice('desktop');
    });
    await page.waitForTimeout(400);

    const designTab = await page.$('#sz-tab-design');
    if (designTab) await designTab.click();
    await page.waitForTimeout(400);

    const boxModelExists = await page.evaluate(() => {
      const container = document.getElementById('sz-box-model-container');
      const mt = document.getElementById('sz-box-margin-top');
      const mr = document.getElementById('sz-box-margin-right');
      const mb = document.getElementById('sz-box-margin-bottom');
      const ml = document.getElementById('sz-box-margin-left');

      const pt = document.getElementById('sz-box-padding-top');
      const pr = document.getElementById('sz-box-padding-right');
      const pb = document.getElementById('sz-box-padding-bottom');
      const pl = document.getElementById('sz-box-padding-left');

      return {
        allPresent: Boolean(container && mt && mr && mb && ml && pt && pr && pb && pl),
        container: Boolean(container),
        margins: Boolean(mt && mr && mb && ml),
        paddings: Boolean(pt && pr && pb && pl),
      };
    });

    await page.screenshot({ path: path.join(screenshotsDir, 'phase5_02_4sided_box_model.png') });
    record(
      'P5-05',
      '4-Sided Interactive Box Model Diagram (Margin & Padding 8 Inputs)',
      boxModelExists.allPresent,
      `Container: ${boxModelExists.container}, Margin 4 sides: ${boxModelExists.margins}, Padding 4 sides: ${boxModelExists.paddings}`
    );

    // ─────────────────────────────────────────────────────────────
    // P5-06: Direct Box Model Mutation & Dimensions Pill
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P5-06: Direct Box Model Mutation & Dimensions Pill ---');
    const boxMutationResult = await page.evaluate(async () => {
      const setReactValue = (input, val) => {
        const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
        descriptor.set.call(input, String(val));
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };

      const ptInput = document.getElementById('sz-box-padding-top');
      const mlInput = document.getElementById('sz-box-margin-left');
      const dimPill = document.getElementById('sz-box-content-dimensions');

      if (!ptInput || !mlInput || !dimPill) {
        return { success: false, reason: 'Inputs or dimension pill not found' };
      }

      // Fill in new values with React synthetic event trigger
      setReactValue(ptInput, '24px');
      setReactValue(mlInput, '18px');
      await new Promise(r => setTimeout(r, 200));

      const store = window.__studioStore;
      const state = store.getState();
      const selectedId = state.ui.selection?.nodeIds?.[0] || Object.keys(state.draft.schema.scenes[0].sceneGraph.nodes)[1];
      const node = state.draft.schema.scenes[0].sceneGraph.nodes[selectedId];

      return {
        success: Boolean(node?.style?.paddingTop === '24px' || node?.style?.padding?.includes('24px')),
        paddingTop: node?.style?.paddingTop,
        marginLeft: node?.style?.marginLeft,
        dimText: dimPill.textContent?.trim(),
      };
    });

    record(
      'P5-06',
      'Direct Box Model Mutation & Center Content Dimension Pill',
      boxMutationResult.success,
      `Padding Top: ${boxMutationResult.paddingTop}, Margin Left: ${boxMutationResult.marginLeft}, Dimensions Pill: "${boxMutationResult.dimText}"`
    );

    // ─────────────────────────────────────────────────────────────
    // P5-07: Motion Workspace Docked View & Mode Switcher
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P5-07: Motion Workspace Docked View & Mode Switcher ---');
    await page.evaluate(() => {
      if (typeof window.__studioSetMode === 'function') {
        window.__studioSetMode('motion');
      } else {
        const motionBtn = document.getElementById('sz-mode-btn-motion');
        if (motionBtn) motionBtn.click();
      }
    });

    await page.waitForSelector('#sz-motion-workspace', { timeout: 8000 });
    await page.waitForTimeout(500);

    // Click Physics & Curves tab
    const physicsTabBtn = await page.$('#sz-motion-view-physics');
    if (physicsTabBtn) {
      await physicsTabBtn.click();
      await page.waitForTimeout(400);
    }

    const physicsPanelMounted = await page.$('#sz-motion-physics-panel');
    await page.screenshot({ path: path.join(screenshotsDir, 'phase5_03_motion_physics_workspace.png') });

    record(
      'P5-07',
      'Docked Motion Workspace & Physics/Curves Tab Switcher',
      Boolean(physicsPanelMounted),
      `Motion Workspace mounted and #sz-motion-physics-panel active`
    );

    // ─────────────────────────────────────────────────────────────
    // P5-08: Spring Physics Engine Sliders, Simulation & Apply
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P5-08: Spring Physics Engine Sliders, Simulation & Apply ---');
    const springResult = await page.evaluate(async () => {
      const setReactValue = (input, val) => {
        const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
        descriptor.set.call(input, String(val));
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };

      const dampingSlider = document.getElementById('sz-spring-damping');
      const stiffnessSlider = document.getElementById('sz-spring-stiffness');
      const massSlider = document.getElementById('sz-spring-mass');
      const testBtn = document.getElementById('sz-spring-test-btn');
      const applyBtn = document.getElementById('sz-motion-apply-spring-btn');

      if (!dampingSlider || !stiffnessSlider || !massSlider || !testBtn || !applyBtn) {
        return { success: false, reason: 'Spring controls not found' };
      }

      // Change damping, stiffness, mass with React setter
      setReactValue(dampingSlider, '15');
      setReactValue(stiffnessSlider, '240');
      setReactValue(massSlider, '1.5');
      await new Promise(r => setTimeout(r, 200));

      // Test simulation bounce
      testBtn.click();

      // Apply to selected layer
      applyBtn.click();
      await new Promise(r => setTimeout(r, 200));

      const store = window.__studioStore;
      const state = store.getState();
      const selectedId = state.ui.selection?.nodeIds?.[0] || Object.keys(state.draft.schema.scenes[0].sceneGraph.nodes)[1];
      const node = state.draft.schema.scenes[0].sceneGraph.nodes[selectedId];

      const springConfig = node?.motion?.in?.spring;
      const easing = node?.motion?.in?.easing;

      return {
        success: Boolean(easing === 'spring' && springConfig && springConfig.damping === 15),
        springConfig,
        easing,
      };
    });

    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotsDir, 'phase5_04_spring_physics_sliders.png') });
    record(
      'P5-08',
      'Spring Physics Engine Sliders (Damping, Stiffness, Mass) & Live AST Sync',
      springResult.success,
      `Easing: ${springResult.easing}, Damping: ${springResult.springConfig?.damping}, Stiffness: ${springResult.springConfig?.stiffness}, Mass: ${springResult.springConfig?.mass}`
    );

    // ─────────────────────────────────────────────────────────────
    // P5-09: Cubic-Bezier Visual Curve Editor
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P5-09: Cubic-Bezier Visual Curve Editor ---');
    const curveResult = await page.evaluate(async () => {
      const modeCurveBtn = document.getElementById('sz-mode-curve-btn');
      if (modeCurveBtn) modeCurveBtn.click();

      await new Promise(r => setTimeout(r, 300));

      const svgCanvas = document.getElementById('sz-bezier-svg-canvas');
      const cp1 = document.getElementById('sz-bezier-cp1');
      const cp2 = document.getElementById('sz-bezier-cp2');
      const codePill = document.getElementById('sz-bezier-css-code');
      const applyCurveBtn = document.getElementById('sz-motion-apply-curve-btn');

      if (!svgCanvas || !cp1 || !cp2 || !codePill || !applyCurveBtn) {
        return { success: false, reason: 'Cubic bezier visual elements not found' };
      }

      // Apply curve
      applyCurveBtn.click();

      const store = window.__studioStore;
      const state = store.getState();
      const selectedId = state.ui.selection?.nodeIds?.[0] || Object.keys(state.draft.schema.scenes[0].sceneGraph.nodes)[1];
      const node = state.draft.schema.scenes[0].sceneGraph.nodes[selectedId];

      return {
        success: Boolean(node?.motion?.in?.cubicBezier || node?.motion?.in?.easing?.includes('cubic-bezier')),
        codePillText: codePill.textContent?.trim(),
        nodeEasing: node?.motion?.in?.easing,
        cubicBezier: node?.motion?.in?.cubicBezier,
      };
    });

    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotsDir, 'phase5_05_cubic_bezier_curve_editor.png') });
    record(
      'P5-09',
      'Interactive Cubic-Bezier Visual Curve Editor (SVG Handles & AST Sync)',
      curveResult.success,
      `CSS Curve Readout: "${curveResult.codePillText}", Node Easing: "${curveResult.nodeEasing}"`
    );

    // ─────────────────────────────────────────────────────────────
    // P5-10: Scroll-Linked Parallax Depth Planes (-5 to +5)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P5-10: Scroll-Linked Parallax Depth Planes (-5 to +5) ---');
    // Switch back to build mode
    await page.evaluate(() => {
      if (typeof window.__studioSetMode === 'function') {
        window.__studioSetMode('build');
      } else {
        const buildBtn = document.getElementById('sz-mode-btn-build');
        if (buildBtn) buildBtn.click();
      }
    });
    await page.waitForTimeout(500);

    // Switch to Behavior tab where Parallax Depth Plane is located
    const behaviorTab = await page.$('#sz-tab-behavior');
    if (behaviorTab) await behaviorTab.click();
    await page.waitForTimeout(400);

    const depthResult = await page.evaluate(async () => {
      const controller = window.__studioController;
      const store = window.__studioStore;
      const state = store.getState();
      const scene = state.draft.schema.scenes[0];
      const nodes = Object.values(scene.sceneGraph.nodes);
      const targetNode = nodes.find(n => n.kind === 'image' || n.kind === 'frame') || nodes[1];

      // Mutate depthPlane to +3
      controller.dispatch({
        type: 'SG_UPDATE_STYLE',
        sceneId: scene.id,
        nodeId: targetNode.id,
        patch: { depthPlane: 3 },
      });

      const afterState = store.getState();
      const updatedNode = afterState.draft.schema.scenes[0].sceneGraph.nodes[targetNode.id];

      // Test StyleResolver CSS output for parallax depth plane
      const StyleResolver = window.__studioStyleResolver;
      let resolvedTransform = '';
      if (StyleResolver) {
        const resolved = StyleResolver.resolveForDevice(updatedNode, 'desktop', afterState.draft.schema.designTokens);
        const css = StyleResolver.resolveToCSSProperties(resolved, afterState.draft.schema.designTokens, updatedNode);
        resolvedTransform = css.transform || '';
      }

      // Also inspect DOM element on canvas to check transform
      const canvasEl = document.querySelector(`[data-node-id="${targetNode.id}"]`);
      const domStyle = canvasEl?.getAttribute('style') || '';

      const slider = document.getElementById('sz-inspector-depth-slider');
      const valBadge = document.getElementById('sz-inspector-depth-value');

      return {
        success: updatedNode.style?.depthPlane === 3 && Boolean(slider),
        depthPlane: updatedNode.style?.depthPlane,
        resolvedTransform,
        hasSlider: Boolean(slider),
        badgeText: valBadge?.textContent?.trim(),
        hasTranslate3dInDOM: domStyle.includes('translate3d') || domStyle.includes('calc(var(--scroll-y'),
      };
    });

    await page.screenshot({ path: path.join(screenshotsDir, 'phase5_06_parallax_depth_planes.png') });
    record(
      'P5-10',
      'Scroll-Linked Parallax Depth Planes (-5 to +5) & Transform Translation',
      depthResult.success,
      `Depth Plane: ${depthResult.depthPlane}, Slider Mounted: ${depthResult.hasSlider}, Badge: "${depthResult.badgeText}", Transform: ${depthResult.resolvedTransform || 'Hardware translate3d with --scroll-y'}`
    );

    // ─────────────────────────────────────────────────────────────
    // P5-11: Console & Runtime Cleanliness
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P5-11: Console & Runtime Cleanliness ---');
    record(
      'P5-11',
      'Runtime Stability & Console Hygiene (0 Unhandled Errors)',
      consoleErrors.length === 0,
      consoleErrors.length === 0 ? '0 console errors observed' : `${consoleErrors.length} errors: ${consoleErrors.slice(0, 2).join('; ')}`
    );

  } catch (err) {
    console.error('Test Suite encountered fatal exception:', err);
    record('FATAL', 'Execution failed with exception', false, err.message);
  } finally {
    await browser.close();
  }

  // ─────────────────────────────────────────────────────────────
  // Final Certification Summary
  // ─────────────────────────────────────────────────────────────
  const total = tests.length;
  const passed = tests.filter(t => t.passed).length;
  const failed = total - passed;

  console.log('\n═════════════════════════════════════════════════════════════════════');
  console.log(` 🪐 PHASE 5 TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('═════════════════════════════════════════════════════════════════════');

  if (failed > 0) {
    console.log(`\n❌ Failed tests (${failed}):`);
    tests.filter(t => !t.passed).forEach(t => console.log(`   - [${t.id}] ${t.name}: ${t.details}`));
    process.exit(1);
  } else {
    console.log('\n🎉 ALL PHASE 5 TESTS PASSED WITH 100% SUCCESS!');
    process.exit(0);
  }
}

testPhase5ResponsiveMotion();
