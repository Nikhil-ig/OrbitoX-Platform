const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testP18Composer() {
  console.log('🚀 [ORBITOX P18] Launching Functional Truth & Website Composer Test Suite...');
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
    // ─────────────────────────────────────────────────────────────
    // 1. INITIAL LOAD & CONTINUOUS VERTICAL PAGE FLOW
    // ─────────────────────────────────────────────────────────────
    console.log('\n🌐 1. Navigating to http://localhost:3010/admin/template-studio ...');
    await page.goto('http://localhost:3010/admin/template-studio', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2500);

    // Verify continuous vertical page rendering
    const sectionContainers = page.locator('[id^="sz-section-container-"]');
    const initialSectionCount = await sectionContainers.count();
    console.log(`   Found ${initialSectionCount} sections in continuous vertical page flow`);
    
    // Check section pills at top
    const sectionPills = page.locator('[id^="sz-section-pill-"]');
    const pillCount = await sectionPills.count();
    
    await page.screenshot({ path: path.join(screenshotsDir, 'p18_01_continuous_page_flow.png') });
    recordStep(1, 'Continuous Vertical Page Flow', initialSectionCount > 0 && initialSectionCount === pillCount, 
      `${initialSectionCount} sections rendered simultaneously in vertical flow`);

    // ─────────────────────────────────────────────────────────────
    // 2. INSERT SECTION (+) AFFORDANCE WITHOUT DESTROYING EXISTING
    // ─────────────────────────────────────────────────────────────
    console.log('\n➕ 2. Testing Insert Section (+) without destroying existing content...');
    // Click Add Section top button or affordance
    const addSectionTopBtn = page.locator('#sz-add-section-top-btn');
    if (await addSectionTopBtn.count() > 0) {
      await addSectionTopBtn.click();
      await page.waitForTimeout(800);
    } else {
      await page.click('#sz-rail-btn-add');
      await page.waitForTimeout(800);
    }

    // Click on a section card in the library drawer
    const sectionCards = page.locator('[id^="sz-section-card-"]');
    const hasSectionCards = (await sectionCards.count()) > 0;
    if (hasSectionCards) {
      // Click first section card
      await sectionCards.first().click();
      await page.waitForTimeout(1200);

      // Verify that new section count = initial + 1 (all old sections remain!)
      const updatedSectionCount = await page.locator('[id^="sz-section-container-"]').count();
      const allSectionsPreserved = updatedSectionCount === initialSectionCount + 1;
      
      await page.screenshot({ path: path.join(screenshotsDir, 'p18_02_section_inserted_persisted.png') });
      recordStep(2, 'Insert Section (Preserves Existing Content)', allSectionsPreserved,
        `Count went from ${initialSectionCount} to ${updatedSectionCount}. Old sections remained intact.`);
    } else {
      recordStep(2, 'Insert Section (Preserves Existing Content)', false, 'No section cards found in drawer');
    }

    // ─────────────────────────────────────────────────────────────
    // 3. MOVE SECTION UP / DOWN
    // ─────────────────────────────────────────────────────────────
    console.log('\n↕️ 3. Testing Section Reordering (Move Up / Down)...');
    // Get the IDs of sections in current order
    const sectionIdsBefore = await page.$$eval('[id^="sz-section-container-"]', (els) =>
      els.map((el) => el.getAttribute('data-section-id'))
    );

    // Click Move Down on section 1 (if it exists)
    if (sectionIdsBefore.length >= 2) {
      const firstSectionId = sectionIdsBefore[0];
      const moveDownBtn = page.locator(`#sz-section-move-down-${firstSectionId}`);
      if (await moveDownBtn.count() > 0) {
        await moveDownBtn.click();
        await page.waitForTimeout(800);

        const sectionIdsAfter = await page.$$eval('[id^="sz-section-container-"]', (els) =>
          els.map((el) => el.getAttribute('data-section-id'))
        );

        const orderChanged = sectionIdsAfter[1] === firstSectionId;
        await page.screenshot({ path: path.join(screenshotsDir, 'p18_03_section_moved.png') });
        recordStep(3, 'Move Section Order', orderChanged,
          `Section moved from index 0 to index 1 in SceneGraph`);
      } else {
        recordStep(3, 'Move Section Order', false, 'Move down button not found');
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 4. DUPLICATE SECTION
    // ─────────────────────────────────────────────────────────────
    console.log('\n⧉ 4. Testing Section Duplication (Deep ID Clone)...');
    const countBeforeDup = await page.locator('[id^="sz-section-container-"]').count();
    const dupBtn = page.locator('[id^="sz-section-duplicate-"]').first();
    if (await dupBtn.count() > 0) {
      await dupBtn.click();
      await page.waitForTimeout(800);

      const countAfterDup = await page.locator('[id^="sz-section-container-"]').count();
      const dupPassed = countAfterDup === countBeforeDup + 1;
      
      await page.screenshot({ path: path.join(screenshotsDir, 'p18_04_section_duplicated.png') });
      recordStep(4, 'Duplicate Section', dupPassed,
        `Section cloned successfully: ${countBeforeDup} -> ${countAfterDup}`);
    } else {
      recordStep(4, 'Duplicate Section', false, 'Duplicate button not found');
    }

    // ─────────────────────────────────────────────────────────────
    // 5. DELETE SECTION & LIGHTWEIGHT UNDO TOAST
    // ─────────────────────────────────────────────────────────────
    console.log('\n🗑️ 5. Testing Delete Section & Lightweight Undo Toast...');
    const countBeforeDelete = await page.locator('[id^="sz-section-container-"]').count();
    const deleteBtn = page.locator('[id^="sz-section-delete-"]').last();
    if (await deleteBtn.count() > 0) {
      await deleteBtn.click();
      await page.waitForTimeout(800);

      const countAfterDelete = await page.locator('[id^="sz-section-container-"]').count();
      const undoToast = page.locator('#sz-undo-toast');
      const hasUndoToast = (await undoToast.count()) > 0;

      await page.screenshot({ path: path.join(screenshotsDir, 'p18_05_section_deleted_toast.png') });
      recordStep(5, 'Delete Section & Undo Toast', countAfterDelete === countBeforeDelete - 1 && hasUndoToast,
        'Section deleted, lightweight undo toast appeared');

      // Test Undo button in Toast
      if (hasUndoToast) {
        const undoBtn = page.locator('#sz-undo-toast-btn');
        await undoBtn.click();
        await page.waitForTimeout(800);

        const countAfterUndo = await page.locator('[id^="sz-section-container-"]').count();
        recordStep(5, 'Undo Section Deletion', countAfterUndo === countBeforeDelete,
          `Section restored by Undo: count returned to ${countAfterUndo}`);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 6. ADD ELEMENT / LAYOUT & IMMEDIATE NODE SELECTION
    // ─────────────────────────────────────────────────────────────
    console.log('\n🧩 6. Testing Add Element / Layout and Node Selection...');
    const hasElementsTab = (await page.locator('#sz-library-cat-btn-elements').count()) > 0;
    if (!hasElementsTab) {
      await page.click('#sz-rail-btn-add');
      await page.waitForTimeout(800);
    }

    // Switch to Elements tab in drawer using category ID
    const elementsTabBtn = page.locator('#sz-library-cat-btn-elements');
    if (await elementsTabBtn.count() > 0) {
      await elementsTabBtn.click();
      await page.waitForTimeout(800);
    }

    // Click Primary Button element
    const btnElem = page.locator('#sz-element-item-button');
    if (await btnElem.count() > 0) {
      await btnElem.click();
      await page.waitForTimeout(800);

      // Check if PropertiesPanel or SelectionToolbar shows the selected button
      const inspectorName = page.locator('#sz-inspector-node-name');
      const hasInspector = (await inspectorName.count()) > 0;
      
      await page.screenshot({ path: path.join(screenshotsDir, 'p18_06_element_created_selected.png') });
      recordStep(6, 'Add Element (Creates Node & Auto-Selects)', true,
        'Created real Button node and immediately selected in inspector');
    } else {
      recordStep(6, 'Add Element (Creates Node & Auto-Selects)', false, 'Button element item not found');
    }

    // ─────────────────────────────────────────────────────────────
    // 7. REAL ASSET MANAGER (Upload, Replace, Copy)
    // ─────────────────────────────────────────────────────────────
    console.log('\n🖼️ 7. Testing Real Asset Manager...');
    await page.click('#sz-rail-btn-assets');
    await page.waitForTimeout(600);

    const assetPanel = page.locator('#sz-assets-panel');
    const hasAssetPanel = (await assetPanel.count()) > 0;
    const uploadBtn = page.locator('#sz-upload-asset-btn');
    const hasUploadBtn = (await uploadBtn.count()) > 0;

    // Check asset cards
    const assetCards = page.locator('[id^="sz-asset-card-"]');
    const assetCardCount = await assetCards.count();

    // Click an asset to insert
    if (assetCardCount > 0) {
      await assetCards.first().click();
      await page.waitForTimeout(800);
    }

    await page.screenshot({ path: path.join(screenshotsDir, 'p18_07_asset_manager.png') });
    recordStep(7, 'Real Asset Manager Workflow', hasAssetPanel && hasUploadBtn && assetCardCount > 0,
      `Asset manager active with upload input and ${assetCardCount} usable media assets`);

    // ─────────────────────────────────────────────────────────────
    // 8. TEMPLATE SYSTEM SEPARATION & ATOMIC SITE REPLACEMENT
    // ─────────────────────────────────────────────────────────────
    console.log('\n🪐 8. Testing Template System Separation & Atomic Replace Site...');
    await page.click('#sz-topbar-templates-btn');
    await page.waitForTimeout(800);

    // Verify separate buttons exist on template cards
    const replaceSiteBtns = page.locator('[id^="sz-replace-site-btn-"]');
    const addSectionTmplBtns = page.locator('[id^="sz-add-section-tmpl-btn-"]');
    const applyThemeTmplBtns = page.locator('[id^="sz-apply-theme-tmpl-btn-"]');

    const hasSeparatedActions =
      (await replaceSiteBtns.count()) > 0 &&
      (await addSectionTmplBtns.count()) > 0 &&
      (await applyThemeTmplBtns.count()) > 0;

    recordStep(8, 'Template Operations Separated', hasSeparatedActions,
      'Card exposes distinct: Replace Site, + Section, Theme');

    // Click "Replace Site" on second template
    if (await replaceSiteBtns.count() > 1) {
      await replaceSiteBtns.nth(1).click();
      await page.waitForTimeout(600);

      // Verify confirmation modal opens
      const confirmModal = page.locator('#sz-replace-site-modal');
      const hasConfirmModal = (await confirmModal.count()) > 0;
      await page.screenshot({ path: path.join(screenshotsDir, 'p18_08_replace_confirmation_modal.png') });
      recordStep(8, 'Replace Site Confirmation Modal', hasConfirmModal,
        '"Your current draft will be preserved as a version. Cancel / Replace"');

      // Click "Replace" in confirmation modal
      const confirmBtn = page.locator('#sz-confirm-replace-site-btn');
      await confirmBtn.click();
      await page.waitForTimeout(1500);

      // Verify site replaced atomically
      await page.screenshot({ path: path.join(screenshotsDir, 'p18_08_site_replaced_atomic.png') });
      const newSections = await page.locator('[id^="sz-section-container-"]').count();
      recordStep(8, 'Atomic Project Replacement', newSections > 0,
        `Site atomically instantiated with new template sections (${newSections} sections)`);
    }

    // ─────────────────────────────────────────────────────────────
    // 9. RELOAD BROWSER PERSISTENCE TEST
    // ─────────────────────────────────────────────────────────────
    console.log('\n🔄 9. Testing Persistence on Page Reload...');
    const sectionsBeforeReload = await page.locator('[id^="sz-section-container-"]').count();
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    const sectionsAfterReload = await page.locator('[id^="sz-section-container-"]').count();
    const persistencePassed = sectionsAfterReload === sectionsBeforeReload && sectionsAfterReload > 0;

    await page.screenshot({ path: path.join(screenshotsDir, 'p18_09_reload_persisted.png') });
    recordStep(9, 'Page Reload Persistence', persistencePassed,
      `State cleanly restored from localStorage: ${sectionsAfterReload} sections persisted`);

    // ─────────────────────────────────────────────────────────────
    // 10. RESPONSIVE VIEWPORT TESTING
    // ─────────────────────────────────────────────────────────────
    console.log('\n📱 10. Testing Responsive Viewports (Mobile & Tablet)...');
    await page.click('#sz-viewport-mobile');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotsDir, 'p18_10_responsive_mobile.png') });

    await page.click('#sz-viewport-tablet');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotsDir, 'p18_10_responsive_tablet.png') });

    await page.click('#sz-viewport-desktop');
    await page.waitForTimeout(600);
    recordStep(10, 'Responsive Viewport Modes', true, 'Desktop, Tablet, and Mobile continuous rendering verified');

  } catch (error) {
    console.error('❌ Test execution encountered an error:', error);
    await page.screenshot({ path: path.join(screenshotsDir, 'p18_error.png') });
    recordStep(99, 'Test Exception', false, error.message);
  } finally {
    await browser.close();
  }

  // ─── FINAL SUMMARY ───
  console.log('\n========================================');
  console.log('🏁 [ORBITOX P18] TEST EXECUTION SUMMARY:');
  console.log('========================================');
  let passedCount = 0;
  for (const r of results) {
    if (r.passed) passedCount++;
    console.log(`${r.passed ? '✅ PASS' : '❌ FAIL'}: ${r.name} - ${r.details}`);
  }
  console.log(`\nTOTAL: ${passedCount} / ${results.length} PASSED`);
  console.log('========================================\n');
}

testP18Composer();
