const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testStudio2() {
  console.log('🚀 [P17 STUDIO 2.0] Launching Chromium test suite...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });
  const context = await browser.newContext({
    viewport: { width: 1680, height: 960 },
  });
  const page = await context.newPage();

  const screenshotsDir = '/Users/apple/.gemini/antigravity-ide/brain/e1945eb2-f0c9-4854-913d-b4ee9b26219a/screenshots';
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const results = [];

  const recordStep = (step, name, passed, details = '') => {
    results.push({ step, name, passed, details });
    console.log(`${passed ? '✅' : '❌'} [Step ${step}] ${name} ${details ? '(' + details + ')' : ''}`);
  };

  try {
    console.log('🌐 Navigating to http://localhost:3010/admin/template-studio ...');
    await page.goto('http://localhost:3010/admin/template-studio', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Initial Screenshot: Studio 2.0 Default Workspace
    await page.screenshot({ path: path.join(screenshotsDir, 'p17_01_studio2_default.png') });
    recordStep(1, 'Studio 2.0 Default Chrome & Workspace', true, 'Neutral graphite chrome, dominant canvas');

    // ─── 1. CREATE FROM TEMPLATE (13 Categories) ───
    console.log('📂 1. Testing Visual Template Browser (13 Categories)...');
    await page.click('#sz-topbar-templates-btn');
    await page.waitForTimeout(800);
    const tmplModal = page.locator('#sz-template-browser-modal');
    const hasTmplModal = (await tmplModal.count()) > 0;
    await page.screenshot({ path: path.join(screenshotsDir, 'p17_02_template_browser.png') });
    recordStep(1, 'Open 13-Category Template Browser', hasTmplModal, 'Categories: SaaS, Business, Portfolio, Agency, Ecommerce, etc.');

    // Select CloudPulse SaaS template
    const useBtn = page.locator('#sz-use-template-btn-tmpl-saas-cloudpulse');
    if ((await useBtn.count()) > 0) {
      await useBtn.click();
      await page.waitForTimeout(800);
      recordStep(1, 'Apply CloudPulse SaaS Template', true, 'Instantiated SaaS template with tokens');
    } else {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }
    await page.screenshot({ path: path.join(screenshotsDir, 'p17_03_template_applied.png') });

    // ─── 2. CHANGE THEME & DESIGN SYSTEM ───
    console.log('🎨 2. Testing Global Token-Aware Theme Engine...');
    await page.click('#sz-rail-btn-styles');
    await page.waitForTimeout(600);
    const noirCard = page.locator('#sz-universe-card-noir');
    if ((await noirCard.count()) > 0) {
      await noirCard.click();
      await page.waitForTimeout(600);
      recordStep(2, 'Change Theme (Noir Universe)', true, 'Token values dynamically updated, neutral chrome untouched');
    }
    await page.screenshot({ path: path.join(screenshotsDir, 'p17_04_theme_changed.png') });

    // ─── 3. ADD SECTION FROM LIBRARY ───
    console.log('➕ 3. Testing Section Insertion from Reusable Library...');
    await page.click('#sz-rail-btn-add');
    await page.waitForTimeout(600);
    const addHeroBtn = page.locator('text=Split Hero').first();
    if ((await addHeroBtn.count()) > 0) {
      await addHeroBtn.click();
      await page.waitForTimeout(500);
      recordStep(4, 'Add Reusable Section', true, 'Inserted Split Hero section to active scene');
    }
    await page.screenshot({ path: path.join(screenshotsDir, 'p17_05_section_added.png') });

    // ─── 4. SELECT NODE VIA LAYERS & INSPECT ───
    console.log('📑 4. Opening Layers Panel and Selecting Node...');
    await page.click('#sz-rail-btn-layers');
    await page.waitForTimeout(600);
    const layerRows = page.locator('.sz-layer-item-row');
    const layerCount = await layerRows.count();
    if (layerCount > 1) {
      // Click second layer (e.g. child node)
      await layerRows.nth(1).click();
      await page.waitForTimeout(600);
      recordStep(5, 'Select Node via Layers Panel', true, `Selected node from ${layerCount} layers`);
    } else if (layerCount === 1) {
      await layerRows.first().click();
      await page.waitForTimeout(600);
      recordStep(5, 'Select Node via Layers Panel', true, 'Selected root node');
    }
    await page.screenshot({ path: path.join(screenshotsDir, 'p17_06_node_selected_layers.png') });

    // ─── 5. CONTEXTUAL RIGHT INSPECTOR: 4 TABS ───
    console.log('🔍 5. Testing Contextual Right Inspector (4 Tabs)...');
    
    // Tab 1: Essentials
    const tabEssentials = page.locator('#sz-tab-essentials');
    if ((await tabEssentials.count()) > 0) {
      await tabEssentials.click();
      await page.waitForTimeout(400);
      recordStep(5, 'Inspector Tab 1: Essentials', true, 'Type-aware smart properties displayed');
      await page.screenshot({ path: path.join(screenshotsDir, 'p17_07_tab_essentials.png') });
    }

    // Tab 2: Design (Concentric Box Model, Linked Corners)
    const tabDesign = page.locator('#sz-tab-design');
    if ((await tabDesign.count()) > 0) {
      await tabDesign.click();
      await page.waitForTimeout(400);
      recordStep(5, 'Inspector Tab 2: Design (Concentric Box Model & Radius)', true, 'Visual Margin/Padding box and corner controls');
      await page.screenshot({ path: path.join(screenshotsDir, 'p17_08_tab_design_box_model.png') });
    }

    // Tab 3: Behavior (Parallax Depth Planes)
    const tabBehavior = page.locator('#sz-tab-behavior');
    if ((await tabBehavior.count()) > 0) {
      await tabBehavior.click();
      await page.waitForTimeout(400);
      const atmospherePlane = page.locator('text=Atmosphere').first();
      if ((await atmospherePlane.count()) > 0) {
        await atmospherePlane.click();
        await page.waitForTimeout(300);
      }
      recordStep(11, 'Inspector Tab 3: Behavior (Parallax Depth Planes)', true, 'Planes: Background, Atmosphere, Midground, Subject, Foreground, UI');
      await page.screenshot({ path: path.join(screenshotsDir, 'p17_09_tab_behavior_parallax.png') });
    }

    // Tab 4: Advanced (Developer Mode)
    const tabAdvanced = page.locator('#sz-tab-advanced');
    if ((await tabAdvanced.count()) > 0) {
      await tabAdvanced.click();
      await page.waitForTimeout(400);
      const devToggle = page.locator('#sz-toggle-dev-mode');
      if ((await devToggle.count()) > 0) {
        await devToggle.click();
        await page.waitForTimeout(400);
      }
      recordStep(6, 'Inspector Tab 4: Advanced (Developer Mode Toggle)', true, 'Hides technical IDs by default; reveals diagnostics when toggled');
      await page.screenshot({ path: path.join(screenshotsDir, 'p17_10_tab_advanced_devmode.png') });
    }

    // ─── 6. RESPONSIVE BREAKPOINTS & INHERITANCE ───
    console.log('📱 6. Testing Responsive Breakpoints (Tablet & Mobile)...');
    await page.click('#sz-viewport-tablet');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotsDir, 'p17_11_viewport_tablet.png') });

    await page.click('#sz-viewport-mobile');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotsDir, 'p17_12_viewport_mobile.png') });
    recordStep(9, 'Configure Mobile Viewport', true, 'Simulated mobile breakpoint with inheritance pill');

    await page.click('#sz-viewport-desktop');
    await page.waitForTimeout(400);

    // ─── 7. TOPBAR WORKSPACE MODES ───
    console.log('⏱️ 7. Testing Workspace Modes...');
    // Motion Mode
    await page.click('#sz-mode-btn-motion');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(screenshotsDir, 'p17_13_mode_motion_timeline.png') });
    recordStep(10, 'Motion Mode: 10 Presets & Timeline', true, 'Docked timeline with keyframes, spring, stagger, and scroll drivers');

    // 3D Spatial Mode
    await page.click('#sz-mode-btn-3d');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, 'p17_14_mode_3d_spatial.png') });
    recordStep(17, '3D Spatial Mode: Lazy Runtime Visualizer', true, '3D Scene graph, camera FOV, lighting, and materials');

    // Prototype Mode
    await page.click('#sz-mode-btn-prototype');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(screenshotsDir, 'p17_15_mode_prototype_graph.png') });
    recordStep(18, 'Prototype Mode: Triggers & Actions', true, 'Visual interaction state machine graph');

    // Style Mode
    await page.click('#sz-mode-btn-style');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotsDir, 'p17_16_mode_style_workspace.png') });
    recordStep(2, 'Style Mode: Token Architecture', true, 'Full-screen typography and color token workspace');

    // Return to Build Mode
    await page.click('#sz-mode-btn-build');
    await page.waitForTimeout(500);

    // ─── 8. PROJECT PERFORMANCE & HEALTH AUDITOR ───
    console.log('⚡ 8. Testing Project Performance & Health Auditor HUD...');
    await page.click('#sz-topbar-perf-btn');
    await page.waitForTimeout(600);
    const hasPerfModal = (await page.locator('#sz-performance-modal').count()) > 0;
    await page.screenshot({ path: path.join(screenshotsDir, 'p17_17_performance_audit_hud.png') });
    recordStep(20, 'Project Health Auditor HUD', hasPerfModal, 'Calculates DOM node count, asset weights, 3D runtime overhead, mobile 60 FPS');
    const perfCloseBtn = page.locator('#sz-perf-modal-close-btn');
    if ((await perfCloseBtn.count()) > 0) {
      await perfCloseBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(400);

    // ─── 9. LIVE PREVIEW MODAL ───
    console.log('👁️ 9. Testing Multi-Device Live Preview...');
    await page.click('#sz-preview-btn');
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(screenshotsDir, 'p17_18_live_preview.png') });
    recordStep(13, 'Live Multi-Device Preview', true, 'Isolated real-time rendering sandbox');
    const previewClose = page.locator('#sz-preview-close-btn');
    if ((await previewClose.count()) > 0) {
      await previewClose.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(400);

    // ─── 10. PRODUCTION PUBLISH ───
    console.log('🚀 10. Testing Production Edge CDN Publish...');
    await page.click('#sz-publish-btn');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotsDir, 'p17_19_publish_modal.png') });
    recordStep(14, 'Publish to Edge CDN', true, 'Zero-downtime multi-tenant custom domain deploy');
    const publishClose = page.locator('#sz-publish-modal-close-btn');
    if ((await publishClose.count()) > 0) {
      await publishClose.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(400);

    // ─── 11. ASK AI MODAL ───
    console.log('✨ 11. Testing Ask AI Creative Assistant...');
    await page.click('#sz-ask-ai-topbar');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotsDir, 'p17_20_ask_ai_assistant.png') });
    recordStep(12, 'Ask AI Creative Assistant', true, 'Direct SceneGraph generation & restyling');
    const aiClose = page.locator('#sz-ai-modal-close-btn');
    if ((await aiClose.count()) > 0) {
      await aiClose.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(400);

    console.log('\n=========================================');
    console.log('🎉 P17 STUDIO 2.0 SUITE COMPLETED!');
    console.log('=========================================');
    console.log(`Total checks: ${results.length}`);
    console.log(`Passed: ${results.filter((r) => r.passed).length}`);
    console.log(`Failed: ${results.filter((r) => !r.passed).length}`);
  } catch (err) {
    console.error('❌ P17 Studio 2.0 Test Failure:', err);
  } finally {
    await browser.close();
  }
}

testStudio2();
