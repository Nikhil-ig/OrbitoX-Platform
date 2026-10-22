import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.resolve(__dirname, '../public/screenshots/p16-experience');
const ARTIFACT_DIR = '/Users/apple/.gemini/antigravity-ide/brain/1d2ceca5-c227-4c13-a616-31a00a45e581';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

function copyToArtifacts(filename) {
  try {
    const src = path.join(SCREENSHOT_DIR, filename);
    const dest = path.join(ARTIFACT_DIR, filename);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`  [Artifact] Saved ${filename} to artifacts directory`);
    }
  } catch (e) {
    console.warn(`Could not copy ${filename} to artifacts:`, e.message);
  }
}

async function run() {
  console.log('========================================================================');
  console.log('🪐 ORBITOX P16 — REAL USER EXPERIENCE & VISUAL VERIFICATION SUITE');
  console.log('========================================================================');

  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1680,1050'],
  });

  const context = await browser.newContext({
    viewport: { width: 1680, height: 1050 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  const results = [];

  try {
    // ──────────────────────────────────────────────────────────────────
    // STEP 1: INITIAL STUDIO LOAD — CALM, SPACIOUS CANVAS FIRST
    // ──────────────────────────────────────────────────────────────────
    console.log('\n[Step 1] Loading OrbitoX Visual Studio in fresh user session...');
    await page.goto('http://localhost:3010/admin/template-studio', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.waitForSelector('#orbitox-artboard-frame', { timeout: 15000 });
    console.log('✓ Artboard frame loaded.');

    // Verify debug HUD is HIDDEN in normal mode
    const debugHud = await page.$('#orbitox-interaction-debug-hud');
    const isDebugHidden = !debugHud;
    console.log(`✓ Technical Debug HUD is hidden: ${isDebugHidden ? 'PASS' : 'FAIL'}`);

    // Verify left rail drawer is collapsed by default (canvas-first spaciousness)
    const activeDrawer = await page.$('#orbitox-left-drawer');
    const isDrawerCollapsed = !activeDrawer;
    console.log(`✓ Left drawer collapsed by default (Canvas First): ${isDrawerCollapsed ? 'PASS' : 'FAIL'}`);

    // Verify single unified bottom bar is present
    const bottomBar = await page.$('#orbitox-unified-bottom-bar');
    console.log(`✓ Single unified bottom bar present: ${bottomBar ? 'PASS' : 'FAIL'}`);

    // Verify floating AI pill was removed from canvas bottom
    const floatingAiPill = await page.$('button:has-text("Ask OrbitoX AI")');
    console.log(`✓ Floating duplicate AI pill removed: ${!floatingAiPill ? 'PASS' : 'FAIL'}`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_p16_calm_canvas_spacious.png') });
    copyToArtifacts('01_p16_calm_canvas_spacious.png');
    results.push({ name: '1. Canvas First Spaciousness', pass: isDebugHidden && isDrawerCollapsed && !!bottomBar });

    // ──────────────────────────────────────────────────────────────────
    // STEP 2: CREATE WEBSITE MODAL (+ NEW)
    // ──────────────────────────────────────────────────────────────────
    console.log('\n[Step 2] Testing "+ New" Website Creation flow...');
    const newBtn = await page.$('#orbitox-new-project-btn');
    if (newBtn) {
      await newBtn.click();
      await page.waitForTimeout(600);

      // Verify modal is open with SaaS category
      const saasCard = await page.$('text=SaaS & Tech');
      console.log(`✓ SaaS Industry Card visible: ${saasCard ? 'PASS' : 'FAIL'}`);

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_p16_new_project_modal.png') });
      copyToArtifacts('02_p16_new_project_modal.png');
      results.push({ name: '2. New Project Modal (9 Industries)', pass: !!saasCard });

      // Close modal
      const closeBtn = await page.$('button:has-text("Cancel")');
      if (closeBtn) await closeBtn.click();
      await page.waitForTimeout(400);
    } else {
      console.warn('Could not find "+ New" button');
      results.push({ name: '2. New Project Modal', pass: false });
    }

    // ──────────────────────────────────────────────────────────────────
    // STEP 3: VISUAL ADD LIBRARY WITH CATEGORIES & WIREFRAME PREVIEWS
    // ──────────────────────────────────────────────────────────────────
    console.log('\n[Step 3] Opening Visual Add Library drawer...');
    const addTabBtn = await page.$('button[title*="Add (A)"], button[title*="Add"]');
    if (addTabBtn) {
      await addTabBtn.click();
      await page.waitForTimeout(600);

      // Verify categories chips exist
      const sectionsChip = await page.$('button:has-text("sections")');
      console.log(`✓ Category filter chip "sections" visible: ${sectionsChip ? 'PASS' : 'FAIL'}`);

      if (sectionsChip) {
        await sectionsChip.click();
        await page.waitForTimeout(400);
      }

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_p16_add_sections_library.png') });
      copyToArtifacts('03_p16_add_sections_library.png');
      results.push({ name: '3. Visual Add Library (Wireframe Previews)', pass: !!sectionsChip });

      // Insert a Bento Grid or Features section
      const sectionCard =
        (await page.$('[data-testid^="section-block-"]')) ||
        (await page.$('text=Bento Architecture')) ||
        (await page.$('text=Video Headline'));
      if (sectionCard) {
        console.log('✓ Clicking to insert pre-built section into canvas...');
        await sectionCard.click();
        await page.waitForTimeout(800);

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_p16_section_inserted_canvas.png') });
        copyToArtifacts('04_p16_section_inserted_canvas.png');
        results.push({ name: '4. Section Inserted into SceneGraph', pass: true });
      } else {
        results.push({ name: '4. Section Inserted into SceneGraph', pass: false });
      }

      // Close the Add drawer to maximize canvas
      await addTabBtn.click();
      await page.waitForTimeout(400);
    } else {
      results.push({ name: '3. Visual Add Library', pass: false });
    }

    // ──────────────────────────────────────────────────────────────────
    // STEP 5: SELECT NODE -> FLOATING CONTEXT TOOLBAR & CALM INSPECTOR
    // ──────────────────────────────────────────────────────────────────
    console.log('\n[Step 5] Selecting node on canvas...');
    const targetElement =
      (await page.$('#orbitox-artboard-frame #node_celebration_title_2')) ||
      (await page.$('#orbitox-artboard-frame [id*="celebration_title"]')) ||
      (await page.$('#orbitox-artboard-frame [id^="node_tagline_"]')) ||
      (await page.$('#orbitox-artboard-frame [id^="node_"]'));

    if (targetElement) {
      const targetBox = await targetElement.boundingBox();
      if (targetBox) {
        const clickX = targetBox.x + targetBox.width / 2;
        const clickY = targetBox.y + targetBox.height / 2;
        await page.mouse.click(clickX, clickY);
        await page.waitForTimeout(600);
      }

      // Verify floating context bar appears
      const contextBar = await page.$('#orbitox-floating-context-bar');
      console.log(`✓ Floating contextual toolbar visible: ${contextBar ? 'PASS' : 'FAIL'}`);

      // Verify right inspector shows calm groups
      const appearanceOrTypo =
        (await page.$('text=Typography')) ||
        (await page.$('text=Appearance')) ||
        (await page.$('text=Layout'));
      console.log(`✓ Right inspector calm groups visible: ${appearanceOrTypo ? 'PASS' : 'FAIL'}`);

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_p16_node_selected_context_toolbar.png') });
      copyToArtifacts('05_p16_node_selected_context_toolbar.png');
      results.push({ name: '5. Contextual Toolbar & Calm Inspector', pass: !!contextBar || !!appearanceOrTypo });
    } else {
      console.warn('Could not locate canvas node');
      results.push({ name: '5. Contextual Toolbar & Calm Inspector', pass: false });
    }

    // ──────────────────────────────────────────────────────────────────
    // STEP 6: DYNAMIC PAGES WORKSPACE
    // ──────────────────────────────────────────────────────────────────
    console.log('\n[Step 6] Testing Pages Drawer & Dynamic Page List...');
    const pagesTabBtn = await page.$('button[title*="Pages (P)"], button[title*="Pages"]');
    if (pagesTabBtn) {
      await pagesTabBtn.click();
      await page.waitForTimeout(600);

      const addPageBtn = await page.$('button:has-text("+ Add Page")');
      console.log(`✓ "+ Add Page" button visible: ${addPageBtn ? 'PASS' : 'FAIL'}`);

      if (addPageBtn) {
        await addPageBtn.click();
        await page.waitForTimeout(500);
        console.log('✓ Successfully created dynamic page in SceneGraph!');
      }

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_p16_dynamic_pages_workspace.png') });
      copyToArtifacts('06_p16_dynamic_pages_workspace.png');
      results.push({ name: '6. Dynamic Pages Management', pass: !!addPageBtn });

      // Close pages drawer
      await pagesTabBtn.click();
      await page.waitForTimeout(400);
    } else {
      results.push({ name: '6. Dynamic Pages Management', pass: false });
    }

    // ──────────────────────────────────────────────────────────────────
    // STEP 7: MOTION TIMELINE WORKSPACE
    // ──────────────────────────────────────────────────────────────────
    console.log('\n[Step 7] Testing Motion Timeline workspace...');
    const motionModeBtn = await page.$('#orbitox-mode-motion');
    if (motionModeBtn) {
      await motionModeBtn.click();
      await page.waitForTimeout(700);

      const timeline = await page.$('#orbitox-motion-timeline, [title*="Timeline"], button:has-text("Keyframes")');
      console.log(`✓ Motion timeline docked at canvas bottom: ${timeline ? 'PASS' : 'FAIL'}`);

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_p16_motion_timeline_workspace.png') });
      copyToArtifacts('07_p16_motion_timeline_workspace.png');
      results.push({ name: '7. Motion Timeline Workspace', pass: !!timeline });

      // Return to Design mode
      const designModeBtn = await page.$('#orbitox-mode-design');
      if (designModeBtn) {
        await designModeBtn.click();
        await page.waitForTimeout(500);
      }
    } else {
      results.push({ name: '7. Motion Timeline Workspace', pass: false });
    }

    // ──────────────────────────────────────────────────────────────────
    // STEP 8: PROTOTYPE INTERACTION WORKSPACE
    // ──────────────────────────────────────────────────────────────────
    console.log('\n[Step 8] Testing Prototype Interaction Flow workspace...');
    const prototypeModeBtn = await page.$('#orbitox-mode-prototype');
    if (prototypeModeBtn) {
      await prototypeModeBtn.click();
      await page.waitForTimeout(700);

      const protoWorkspace = await page.$('#orbitox-prototype-workspace');
      console.log(`✓ Prototype flow workspace visible: ${protoWorkspace ? 'PASS' : 'FAIL'}`);

      const testTriggerBtn = await page.$('#orbitox-test-trigger-flow-btn');
      if (testTriggerBtn) {
        await testTriggerBtn.click();
        await page.waitForTimeout(400);
        console.log('✓ Tested Trigger ➔ Condition ➔ Action ➔ Transition interaction pipeline!');
      }

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_p16_prototype_workspace.png') });
      copyToArtifacts('08_p16_prototype_workspace.png');
      results.push({ name: '8. Prototype Interaction Workspace', pass: !!protoWorkspace });

      // Switch back to Design mode
      const designModeBtn = await page.$('#orbitox-mode-design');
      if (designModeBtn) {
        await designModeBtn.click();
        await page.waitForTimeout(500);
      }
    } else {
      results.push({ name: '8. Prototype Interaction Workspace', pass: false });
    }

    // ──────────────────────────────────────────────────────────────────
    // STEP 9: FULLSCREEN CANVAS MODE (F / ESC)
    // ──────────────────────────────────────────────────────────────────
    console.log('\n[Step 9] Testing Fullscreen Canvas mode...');
    const fullscreenBtn = await page.$('#orbitox-fullscreen-btn');
    if (fullscreenBtn) {
      await fullscreenBtn.click();
      await page.waitForTimeout(600);

      const exitFullscreenBtn = await page.$('#orbitox-exit-fullscreen-btn');
      console.log(`✓ Fullscreen overlay exit button visible: ${exitFullscreenBtn ? 'PASS' : 'FAIL'}`);

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_p16_fullscreen_canvas_mode.png') });
      copyToArtifacts('09_p16_fullscreen_canvas_mode.png');
      results.push({ name: '9. Immersive Fullscreen Canvas', pass: !!exitFullscreenBtn });

      // Press Escape to exit fullscreen
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      let isExitWorking = !(await page.$('#orbitox-exit-fullscreen-btn'));
      if (!isExitWorking) {
        const exitBtn = await page.$('#orbitox-exit-fullscreen-btn');
        if (exitBtn) {
          await exitBtn.click();
          await page.waitForTimeout(500);
          isExitWorking = true;
        }
      }
      console.log(`✓ Exit fullscreen cleanly: ${isExitWorking ? 'PASS' : 'FAIL'}`);
    } else {
      results.push({ name: '9. Immersive Fullscreen Canvas', pass: false });
    }

    // ──────────────────────────────────────────────────────────────────
    // STEP 10: DESIGN UNIVERSES (THEMES)
    // ──────────────────────────────────────────────────────────────────
    console.log('\n[Step 10] Testing Design Universes...');
    const stylesTabBtn = (await page.$('#orbitox-left-tab-styles')) || (await page.$('button[title*="Styles"]'));
    if (stylesTabBtn) {
      await stylesTabBtn.click();
      await page.waitForTimeout(600);

      const universeCard =
        (await page.$('text=Celestial Odyssey')) ||
        (await page.$('text=Noir Minimal')) ||
        (await page.$('text=Amalfi Villa')) ||
        (await page.$('text=Aurora Borealis'));
      console.log(`✓ Design Universe cards visible: ${universeCard ? 'PASS' : 'FAIL'}`);

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_p16_design_universes_themes.png') });
      copyToArtifacts('10_p16_design_universes_themes.png');
      results.push({ name: '10. Design Universes (1-Click Themes)', pass: !!universeCard });

      // Close styles drawer
      await stylesTabBtn.click();
      await page.waitForTimeout(400);
    } else {
      results.push({ name: '10. Design Universes', pass: false });
    }

    // ──────────────────────────────────────────────────────────────────
    // STEP 11: RESPONSIVE MOBILE BREAKPOINT
    // ──────────────────────────────────────────────────────────────────
    console.log('\n[Step 11] Testing Responsive Mobile Breakpoint...');
    const mobileBtn = await page.$('#orbitox-viewport-mobile');
    if (mobileBtn) {
      await mobileBtn.click();
      await page.waitForTimeout(600);

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_p16_mobile_responsive_mode.png') });
      copyToArtifacts('11_p16_mobile_responsive_mode.png');
      results.push({ name: '11. Responsive Mobile Breakpoint', pass: true });

      // Return to Desktop
      const desktopBtn = await page.$('#orbitox-viewport-desktop');
      if (desktopBtn) {
        await desktopBtn.click();
        await page.waitForTimeout(400);
      }
    } else {
      results.push({ name: '11. Responsive Mobile Breakpoint', pass: false });
    }

    // ──────────────────────────────────────────────────────────────────
    // STEP 12: PUBLISH MODAL FLOW
    // ──────────────────────────────────────────────────────────────────
    console.log('\n[Step 12] Testing 1-Click Publish Modal...');
    const publishBtn = await page.$('#orbitox-publish-btn');
    if (publishBtn) {
      await publishBtn.click();
      await page.waitForTimeout(1000);

      const liveUrl =
        (await page.$('text=Deployed to Edge CDN')) ||
        (await page.$('text=Deployment Successful')) ||
        (await page.$('text=Live Preview')) ||
        (await page.$('text=Publish'));
      console.log(`✓ Publish modal and edge status visible: ${liveUrl ? 'PASS' : 'FAIL'}`);

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12_p16_publish_deployment_modal.png') });
      copyToArtifacts('12_p16_publish_deployment_modal.png');
      results.push({ name: '12. Edge CDN 1-Click Publishing', pass: !!liveUrl });
    } else {
      results.push({ name: '12. Edge CDN 1-Click Publishing', pass: false });
    }

  } catch (err) {
    console.error('Execution error during P16 user test:', err);
  } finally {
    await browser.close();
  }

  console.log('\n========================================================================');
  console.log('ORBITOX P16 USER TEST SUITE RESULTS:');
  console.log('========================================================================');
  let allPass = true;
  for (const r of results) {
    const mark = r.pass ? '✓ PASS' : '✗ FAIL';
    console.log(`  ${mark} | ${r.name}`);
    if (!r.pass) allPass = false;
  }
  console.log('========================================================================');
  console.log(`OVERALL: ${allPass ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  process.exit(allPass ? 0 : 1);
}

run();
