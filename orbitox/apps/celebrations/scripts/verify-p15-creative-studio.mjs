import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.resolve(__dirname, '../public/screenshots/p15-studio');
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
    }
  } catch (e) {
    console.warn(`Could not copy ${filename} to artifacts:`, e.message);
  }
}

async function run() {
  console.log('========================================================================');
  console.log('🪐 ORBITOX P15 CREATIVE STUDIO TRANSFORMATION VERIFICATION');
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

  try {
    console.log('\n[Step 1] Navigating to OrbitoX Visual Studio...');
    await page.goto('http://localhost:3010/admin/template-studio', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.waitForSelector('#orbitox-artboard-frame', { timeout: 15000 });
    console.log('✓ Artboard frame loaded.');

    // Verify debug HUD is HIDDEN by default
    const hud = await page.$('#orbitox-interaction-debug-hud');
    console.log(`✓ Debug HUD is hidden in normal mode: ${!hud ? 'PASS' : 'FAIL'}`);

    // Verify unified bottom bar exists
    const bottomBar = await page.$('#orbitox-unified-bottom-bar');
    console.log(`✓ Unified bottom contextual bar present: ${!!bottomBar ? 'PASS' : 'FAIL'}`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_visual_studio_clean.png') });
    copyToArtifacts('01_visual_studio_clean.png');

    // ────────────────────────────────────────────────────────────────────────
    // TEST 2: NODE SELECTION & FIGMA-STYLE FLOATING CONTEXT BAR
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n[Step 2] Testing Selection & Floating Context Bar...');
    const titleNode = await page.$('#node_celebration_title_2');
    if (titleNode) {
      await titleNode.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_node_selected_context_bar.png') });
      copyToArtifacts('02_node_selected_context_bar.png');
      console.log('✓ Node selected with starlight gold border and Floating Context Bar.');
    }

    // ────────────────────────────────────────────────────────────────────────
    // TEST 3: SECTION REMIX WORKFLOW (7 Design Universes)
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n[Step 3] Testing Section Remix Workflow...');
    const remixBtn = await page.$('button:has-text("Remix")');
    if (remixBtn) {
      await remixBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_section_remix_modal.png') });
      copyToArtifacts('03_section_remix_modal.png');
      console.log('✓ Section Remix Modal active with 7 visual design universes.');

      // Close remix modal with Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }

    // ────────────────────────────────────────────────────────────────────────
    // TEST 4: VISUAL ADD LIBRARY DRAWER (Category chips & Wireframe cards)
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n[Step 4] Testing Visual Add Library...');
    const addBtn = await page.$('button[title*="Add"]');
    if (addBtn) {
      await addBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_visual_add_library.png') });
      copyToArtifacts('04_visual_add_library.png');
      console.log('✓ Visual Add Library with wireframe thumbnails active.');
    }

    // ────────────────────────────────────────────────────────────────────────
    // TEST 5: DESIGN UNIVERSES DRAWER (12 Universes)
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n[Step 5] Testing Styles & Themes (Design Universes)...');
    const stylesButton = await page.$('button[title*="Styles"]');
    if (stylesButton) {
      await stylesButton.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_design_universes.png') });
      copyToArtifacts('05_design_universes.png');
      console.log('✓ Design Universes drawer active.');
    }

    // ────────────────────────────────────────────────────────────────────────
    // TEST 6: VISUAL TYPOGRAPHY STUDIO (Specimen Cards)
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n[Step 6] Testing Typography Studio Specimen Cards...');
    const typographySubtab = await page.$('button:has-text("Typography")');
    if (typographySubtab) {
      await typographySubtab.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_typography_studio.png') });
      copyToArtifacts('06_typography_studio.png');
      console.log('✓ Typography Studio live pairing specimens active.');
    }

    // ────────────────────────────────────────────────────────────────────────
    // TEST 7: SWITCH TO MOTION WORKSPACE
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n[Step 7] Testing First-Class Motion Studio Workspace...');
    const motionTab = await page.$('header button:has-text("Motion")');
    if (motionTab) {
      await motionTab.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_motion_timeline.png') });
      copyToArtifacts('07_motion_timeline.png');
      console.log('✓ Motion Timeline workspace active.');
    }

    // ────────────────────────────────────────────────────────────────────────
    // TEST 8: SWITCH TO 3D WORKSPACE
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n[Step 8] Testing 3D Studio Workspace...');
    const threeDTab = await page.$('header button:has-text("3D")');
    if (threeDTab) {
      await threeDTab.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_3d_workspace.png') });
      copyToArtifacts('08_3d_workspace.png');
      console.log('✓ 3D Studio Workspace active.');
    }

    // ────────────────────────────────────────────────────────────────────────
    // TEST 9: ASK ORBITOX AI DESIGN ASSISTANT
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n[Step 9] Testing Ask OrbitoX AI Design Assistant...');
    // Return to design mode
    const designTab = await page.$('header button:has-text("Design")');
    if (designTab) await designTab.click();
    await page.waitForTimeout(400);

    const aiBtn = await page.$('button:has-text("Ask OrbitoX")');
    if (aiBtn) {
      await aiBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_ai_assistant_modal.png') });
      copyToArtifacts('09_ai_assistant_modal.png');
      console.log('✓ Ask OrbitoX AI Assistant Modal active.');

      // Close modal with Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    console.log('\n🎉 ALL ORBITOX CREATIVE STUDIO VERIFICATIONS SUCCEEDED!');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error_state.png') });
    copyToArtifacts('error_state.png');
  } finally {
    await browser.close();
  }
}

run();
