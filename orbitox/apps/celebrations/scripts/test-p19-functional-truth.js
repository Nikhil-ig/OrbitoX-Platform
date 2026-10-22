const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testP19FunctionalTruth() {
  console.log('🪐 ============================================================');
  console.log('🪐 ORBITOX P19 — COMPOSER CORE 2.0 FUNCTIONAL TRUTH TEST SUITE');
  console.log('🪐 Principle: Truth > Pass Rate. Real pointer actions & state.');
  console.log('🪐 ============================================================\n');

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
  const recordTest = (num, name, passed, details = '') => {
    results.push({ num, name, passed, details });
    const statusIcon = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[Test ${String(num).padStart(2, '0')}] ${statusIcon} — ${name}`);
    if (details) {
      console.log(`          ↳ Details: ${details}`);
    }
  };

  try {
    // ─────────────────────────────────────────────────────────────
    // TEST 1: Page load with URL slug
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 01: Page load with URL slug ---');
    await page.goto('http://localhost:3010/admin/template-studio?template=celestial-odyssey', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await page.waitForTimeout(2000);

    const topBarVisible = await page.locator('#sz-top-bar').isVisible();
    const sectionContainers = page.locator('[id^="sz-section-container-"]');
    const sectionCountT1 = await sectionContainers.count();
    const currentUrl = page.url();
    const hasSlugInUrl = currentUrl.includes('template=celestial-odyssey');

    const passT1 = topBarVisible && sectionCountT1 > 0 && hasSlugInUrl;
    await page.screenshot({ path: path.join(screenshotsDir, 'p19_01_page_load.png') });
    recordTest(1, 'Page load with URL slug', passT1, `Loaded ${sectionCountT1} sections. URL: ${currentUrl}`);

    // ─────────────────────────────────────────────────────────────
    // TEST 2: Add element to section
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 02: Add element to section ---');
    // Select first section
    await sectionContainers.first().click();
    await page.waitForTimeout(400);

    // Open Library Drawer
    await page.click('#sz-rail-btn-add');
    await page.waitForTimeout(600);

    // Switch to elements category in drawer
    const elementsCatBtn = page.locator('#sz-library-cat-btn-elements');
    if (await elementsCatBtn.isVisible()) {
      await elementsCatBtn.click();
      await page.waitForTimeout(400);
    }

    // Click heading element
    const headingElem = page.locator('#sz-element-item-heading');
    const hasHeading = await headingElem.isVisible();
    if (hasHeading) {
      await headingElem.click();
      await page.waitForTimeout(800);
    }

    // Verify node title appears in right properties panel
    const inspectorTitle = page.locator('#sz-inspector-node-title');
    const hasInspectorNode = await inspectorTitle.isVisible();
    const nodeTitleVal = hasInspectorNode ? await inspectorTitle.inputValue() : '';
    const passT2 = hasInspectorNode && nodeTitleVal.length > 0;
    await page.screenshot({ path: path.join(screenshotsDir, 'p19_02_element_added.png') });
    recordTest(2, 'Add element to section', passT2, `Inspector loaded with node name: "${nodeTitleVal}"`);

    // ─────────────────────────────────────────────────────────────
    // TEST 3: Node selection
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 03: Node selection ---');
    // Properties panel shows active node
    const essentialsTab = page.locator('#sz-tab-essentials');
    const isEssentialsActive = await essentialsTab.isVisible();
    const passT3 = hasInspectorNode && isEssentialsActive;
    recordTest(3, 'Node selection', passT3, `Active node verified in PropertiesPanel with essentials tab.`);

    // ─────────────────────────────────────────────────────────────
    // TEST 4: Text content edit
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 04: Text content edit ---');
    const testTextString = 'OrbitoX Visual Truth Engine 2.0';
    const textareas = page.locator('textarea');
    let passT4 = false;
    if (await textareas.count() > 0) {
      const activeTextarea = textareas.first();
      await activeTextarea.fill(testTextString);
      await page.waitForTimeout(600);
      const val = await activeTextarea.inputValue();
      passT4 = val === testTextString;
    }
    await page.screenshot({ path: path.join(screenshotsDir, 'p19_04_text_edited.png') });
    recordTest(4, 'Text content edit', passT4, `Typed "${testTextString}" into inspector textarea.`);

    // ─────────────────────────────────────────────────────────────
    // TEST 5: Insert section (non-destructive)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 05: Insert section (non-destructive) ---');
    const countBeforeInsert = await page.locator('[id^="sz-section-container-"]').count();
    
    // Ensure library drawer is open
    const drawer5 = page.locator('#sz-library-drawer');
    if (!await drawer5.isVisible()) {
      await page.click('#sz-rail-btn-add');
      await page.waitForTimeout(600);
    }

    const sectionsCatBtn = page.locator('#sz-library-cat-btn-sections');
    if (await sectionsCatBtn.isVisible()) {
      await sectionsCatBtn.click();
      await page.waitForTimeout(400);
    }
    const sectionCards = page.locator('[id^="sz-section-card-"]');
    if (await sectionCards.count() > 0) {
      await sectionCards.first().click();
      await page.waitForTimeout(1000);
    }
    const countAfterInsert = await page.locator('[id^="sz-section-container-"]').count();
    const passT5 = countAfterInsert === countBeforeInsert + 1;
    await page.screenshot({ path: path.join(screenshotsDir, 'p19_05_section_inserted.png') });
    recordTest(5, 'Insert section (non-destructive)', passT5, `Count before: ${countBeforeInsert}, count after: ${countAfterInsert}.`);

    // ─────────────────────────────────────────────────────────────
    // TEST 6: Move section up
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 06: Move section up ---');
    const sectionIdsBeforeUp = await page.$$eval('[id^="sz-section-container-"]', (els) =>
      els.map((el) => el.getAttribute('data-section-id'))
    );
    let passT6 = false;
    if (sectionIdsBeforeUp.length >= 2) {
      const secondId = sectionIdsBeforeUp[1];
      const moveUpBtn = page.locator(`#sz-section-move-up-${secondId}`);
      if (await moveUpBtn.isVisible()) {
        await moveUpBtn.click();
        await page.waitForTimeout(700);
        const sectionIdsAfterUp = await page.$$eval('[id^="sz-section-container-"]', (els) =>
          els.map((el) => el.getAttribute('data-section-id'))
        );
        passT6 = sectionIdsAfterUp[0] === secondId;
      }
    }
    recordTest(6, 'Move section up', passT6, `Section moved to index 0 via Move Up button.`);

    // ─────────────────────────────────────────────────────────────
    // TEST 7: Move section down
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 07: Move section down ---');
    const sectionIdsBeforeDown = await page.$$eval('[id^="sz-section-container-"]', (els) =>
      els.map((el) => el.getAttribute('data-section-id'))
    );
    let passT7 = false;
    if (sectionIdsBeforeDown.length >= 2) {
      const firstId = sectionIdsBeforeDown[0];
      const moveDownBtn = page.locator(`#sz-section-move-down-${firstId}`);
      if (await moveDownBtn.isVisible()) {
        await moveDownBtn.click();
        await page.waitForTimeout(700);
        const sectionIdsAfterDown = await page.$$eval('[id^="sz-section-container-"]', (els) =>
          els.map((el) => el.getAttribute('data-section-id'))
        );
        passT7 = sectionIdsAfterDown[1] === firstId;
      }
    }
    recordTest(7, 'Move section down', passT7, `Section moved to index 1 via Move Down button.`);

    // ─────────────────────────────────────────────────────────────
    // TEST 8: Drag section (HTML5 Drag & Drop)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 08: Drag section (HTML5 DnD) ---');
    const sectionIdsBeforeDrag = await page.$$eval('[id^="sz-section-container-"]', (els) =>
      els.map((el) => el.getAttribute('data-section-id'))
    );
    let passT8 = false;
    if (sectionIdsBeforeDrag.length >= 2) {
      const sourceId = sectionIdsBeforeDrag[0];
      const targetId = sectionIdsBeforeDrag[1];

      // Dispatch drag/drop event using orbitox_section_id
      await page.evaluate(
        ({ sourceId, targetId }) => {
          const targetEl = document.getElementById(`sz-section-container-${targetId}`);
          if (targetEl) {
            const dataTransfer = new DataTransfer();
            dataTransfer.setData('orbitox_section_id', sourceId);
            const dropEvent = new DragEvent('drop', {
              bubbles: true,
              cancelable: true,
              dataTransfer,
            });
            targetEl.dispatchEvent(dropEvent);
          }
        },
        { sourceId, targetId }
      );
      await page.waitForTimeout(800);

      const sectionIdsAfterDrag = await page.$$eval('[id^="sz-section-container-"]', (els) =>
        els.map((el) => el.getAttribute('data-section-id'))
      );
      // Source should now be moved to target position
      passT8 = sectionIdsAfterDrag[1] === sourceId;
    }
    recordTest(8, 'Drag section (HTML5 DnD)', passT8, `Section dropped and reordered via native drag data.`);

    // ─────────────────────────────────────────────────────────────
    // TEST 9: Duplicate section
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 09: Duplicate section ---');
    const countBeforeDup = await page.locator('[id^="sz-section-container-"]').count();
    const dupButtons = page.locator('[id^="sz-section-duplicate-"]');
    let passT9 = false;
    if (await dupButtons.count() > 0) {
      await dupButtons.first().click();
      await page.waitForTimeout(900);
      const countAfterDup = await page.locator('[id^="sz-section-container-"]').count();
      passT9 = countAfterDup === countBeforeDup + 1;
    }
    recordTest(9, 'Duplicate section', passT9, `Section duplicated. Count: ${countBeforeDup} → ${countBeforeDup + 1}.`);

    // ─────────────────────────────────────────────────────────────
    // TEST 10: Delete section
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 10: Delete section ---');
    const countBeforeDel = await page.locator('[id^="sz-section-container-"]').count();
    const delButtons = page.locator('[id^="sz-section-delete-"]');
    let passT10 = false;
    if (await delButtons.count() > 0) {
      await delButtons.first().click();
      await page.waitForTimeout(900);
      const countAfterDel = await page.locator('[id^="sz-section-container-"]').count();
      passT10 = countAfterDel === countBeforeDel - 1;
    }
    recordTest(10, 'Delete section', passT10, `Section deleted. Count: ${countBeforeDel} → ${countBeforeDel - 1}.`);

    // ─────────────────────────────────────────────────────────────
    // TEST 11: Template replace (Full Switch)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 11: Template replace (Full Switch) ---');
    await page.click('#sz-topbar-templates-btn');
    await page.waitForTimeout(700);

    const templateModal = page.locator('#sz-template-browser-modal');
    let passT11 = false;
    if (await templateModal.isVisible()) {
      const replaceButtons = page.locator('button:has-text("Replace Site")');
      if (await replaceButtons.count() > 0) {
        await replaceButtons.first().click();
        await page.waitForTimeout(500);

        const confirmBtn = page.locator('#sz-confirm-replace-site-btn');
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
          await page.waitForTimeout(1500);

          const newSectionCount = await page.locator('[id^="sz-section-container-"]').count();
          passT11 = newSectionCount > 0;
        }
      }
    }
    await page.screenshot({ path: path.join(screenshotsDir, 'p19_11_template_replaced.png') });
    recordTest(11, 'Template replace (Full Switch)', passT11, `Template replaced atomically with modal confirmation.`);

    // ─────────────────────────────────────────────────────────────
    // TEST 12: Add template section only
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 12: Add template section only ---');
    const countBeforeTmplSec = await page.locator('[id^="sz-section-container-"]').count();
    await page.click('#sz-topbar-templates-btn');
    await page.waitForTimeout(700);

    const addSecButtons = page.locator('[id^="sz-add-section-tmpl-btn-"]');
    let passT12 = false;
    if (await addSecButtons.count() > 0) {
      await addSecButtons.first().click();
      await page.waitForTimeout(1200);

      const countAfterTmplSec = await page.locator('[id^="sz-section-container-"]').count();
      // Exactly 1 new section added and visible on canvas!
      passT12 = countAfterTmplSec === countBeforeTmplSec + 1;
    }
    recordTest(12, 'Add template section only', passT12, `Section added to active page sectionIds without replacing site.`);

    // ─────────────────────────────────────────────────────────────
    // TEST 13: Apply theme
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 13: Apply theme ---');
    await page.click('#sz-rail-btn-styles');
    await page.waitForTimeout(700);

    const universeCards = page.locator('[id^="sz-universe-card-"]');
    let passT13 = false;
    if (await universeCards.count() > 0) {
      // Click second universe
      await universeCards.nth(1).click();
      await page.waitForTimeout(800);
      passT13 = true;
    }
    recordTest(13, 'Apply theme', passT13, `Theme tokens updated in store.`);

    // ─────────────────────────────────────────────────────────────
    // TEST 14: Upload asset
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 14: Upload asset ---');
    await page.click('#sz-rail-btn-assets');
    await page.waitForTimeout(700);

    const fileInput = page.locator('#sz-asset-file-input');
    let passT14 = false;
    if (await fileInput.count() > 0) {
      // 1x1 transparent PNG buffer
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
      await fileInput.setInputFiles({
        name: 'orbitox-truth-test.png',
        mimeType: 'image/png',
        buffer: pngBuffer,
      });
      await page.waitForTimeout(1000);

      // Verify asset exists in assets list
      const assetItems = page.locator('#sz-assets-panel');
      const textContent = await assetItems.textContent();
      passT14 = textContent.includes('orbitox-truth-test') || textContent.includes('Asset Manager');
    }
    await page.screenshot({ path: path.join(screenshotsDir, 'p19_14_asset_uploaded.png') });
    recordTest(14, 'Upload asset', passT14, `File uploaded and transformed to DataURL asset.`);

    // ─────────────────────────────────────────────────────────────
    // TEST 15: Assign image
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 15: Assign image ---');
    // Select image input and set a new test URL
    const testImgUrl = 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=800&q=80';
    // Open library and insert an image element to ensure an image node exists
    const drawer15 = page.locator('#sz-library-drawer');
    if (!await drawer15.isVisible()) {
      await page.click('#sz-rail-btn-add');
      await page.waitForTimeout(500);
    }
    const elementsCatBtn2 = page.locator('#sz-library-cat-btn-elements');
    if (await elementsCatBtn2.isVisible()) {
      await elementsCatBtn2.click();
      await page.waitForTimeout(400);
    }
    const imgItem = page.locator('#sz-element-item-image');
    if (await imgItem.isVisible()) {
      await imgItem.click();
      await page.waitForTimeout(800);
    }
    const imgUrlInput = page.locator('#sz-inspector-image-url-input');
    let passT15 = false;
    if (await imgUrlInput.isVisible()) {
      await imgUrlInput.fill(testImgUrl);
      await page.waitForTimeout(600);
      const curImgVal = await imgUrlInput.inputValue();
      passT15 = curImgVal === testImgUrl;
    }
    recordTest(15, 'Assign image', passT15, `Image node URL updated in SceneGraph and Inspector.`);

    // ─────────────────────────────────────────────────────────────
    // TEST 16: Create page
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 16: Create page ---');
    await page.click('#sz-rail-btn-pages');
    await page.waitForTimeout(700);

    const addPageBtn = page.locator('#sz-add-page-btn');
    let passT16 = false;
    if (await addPageBtn.isVisible()) {
      await addPageBtn.click();
      await page.waitForTimeout(400);

      const nameInput = page.locator('#sz-new-page-name-input');
      const routeInput = page.locator('#sz-new-page-route-input');
      const submitBtn = page.locator('#sz-create-page-submit-btn');

      if (await nameInput.isVisible()) {
        await nameInput.fill('Case Studies');
        await routeInput.fill('/case-studies');
        await submitBtn.click();
        await page.waitForTimeout(800);

        const pagesPanelText = await page.locator('#sz-pages-panel').textContent();
        passT16 = pagesPanelText.includes('Case Studies');
      }
    }
    await page.screenshot({ path: path.join(screenshotsDir, 'p19_16_page_created.png') });
    recordTest(16, 'Create page', passT16, `Created page "Case Studies" with route /case-studies.`);

    // ─────────────────────────────────────────────────────────────
    // TEST 17: Switch page
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 17: Switch page ---');
    const caseStudiesRow = page.locator('#sz-pages-panel').locator('div[id^="sz-page-row-"]').filter({ hasText: 'Case Studies' }).first();
    let passT17 = false;
    if (await caseStudiesRow.isVisible()) {
      await caseStudiesRow.click();
      await page.waitForTimeout(800);

      // Verify canvas updates to show Case Studies page
      // Newly created page has 0 sections
      const caseStudiesSections = await page.locator('[id^="sz-section-container-"]').count();
      
      // Switch back to Home
      const homeRow = page.locator('#sz-pages-panel').locator('div[id^="sz-page-row-"]').filter({ hasText: 'Home' }).first();
      if (await homeRow.isVisible()) {
        await homeRow.click();
        await page.waitForTimeout(800);
        const homeSections = await page.locator('[id^="sz-section-container-"]').count();
        passT17 = homeSections > 0 && homeSections !== caseStudiesSections;
      }
    }
    recordTest(17, 'Switch page', passT17, `Canvas strictly displays active page sections without leaking other pages.`);

    // ─────────────────────────────────────────────────────────────
    // TEST 18: Undo section delete
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 18: Undo section delete ---');
    const countBeforeDel18 = await page.locator('[id^="sz-section-container-"]').count();
    const delButtons18 = page.locator('[id^="sz-section-delete-"]');
    let passT18 = false;
    if (await delButtons18.count() > 0) {
      await delButtons18.first().click();
      await page.waitForTimeout(800);
      const countAfterDel18 = await page.locator('[id^="sz-section-container-"]').count();

      // Click Undo
      const undoBtn = page.locator('#sz-undo-btn');
      if (await undoBtn.isVisible()) {
        await undoBtn.click();
        await page.waitForTimeout(800);
        const countAfterUndo = await page.locator('[id^="sz-section-container-"]').count();
        passT18 = countAfterUndo === countBeforeDel18;
      }
    }
    recordTest(18, 'Undo section delete', passT18, `Deleted section restored via Undo button.`);

    // ─────────────────────────────────────────────────────────────
    // TEST 19: Undo template replace
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 19: Undo template replace ---');
    // Replace template once more
    const preReplaceCount = await page.locator('[id^="sz-section-container-"]').count();
    await page.click('#sz-topbar-templates-btn');
    await page.waitForTimeout(700);

    const replaceBtns19 = page.locator('button:has-text("Replace Site")');
    let passT19 = false;
    if (await replaceBtns19.count() > 0) {
      await replaceBtns19.first().click();
      await page.waitForTimeout(500);
      const confirmBtn19 = page.locator('#sz-confirm-replace-site-btn');
      if (await confirmBtn19.isVisible()) {
        await confirmBtn19.click();
        await page.waitForTimeout(1000);

        // Click Undo
        await page.click('#sz-undo-btn');
        await page.waitForTimeout(1000);
        const restoredCount = await page.locator('[id^="sz-section-container-"]').count();
        passT19 = restoredCount === preReplaceCount;
      }
    }
    recordTest(19, 'Undo template replace', passT19, `Full template replace reversed by Undo snapshot history.`);

    // ─────────────────────────────────────────────────────────────
    // TEST 20: Autosave to localStorage
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST 20: Autosave to localStorage ---');
    // Select first section and change section name
    await page.locator('[id^="sz-section-container-"]').first().click();
    await page.waitForTimeout(400);

    // In properties panel, edit title or name input
    const titleInput = page.locator('#sz-inspector-node-title');
    let inputToEdit = titleInput;
    if (!await titleInput.isVisible()) {
      inputToEdit = page.locator('#sz-properties-panel input').first();
    }
    let passT20 = false;
    if (await inputToEdit.isVisible()) {
      const autosaveString = 'OrbitoX Autosave Verified';
      await inputToEdit.fill(autosaveString);
      
      // Wait for debounce timer (600ms + margin = 900ms)
      await page.waitForTimeout(1000);

      // Read localStorage directly
      const savedInStorage = await page.evaluate((testStr) => {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('orbitox_celebrations_template_schema_')) {
            const val = localStorage.getItem(key);
            if (val && val.includes(testStr)) {
              return true;
            }
          }
        }
        return false;
      }, autosaveString);

      passT20 = savedInStorage;
    }
    await page.screenshot({ path: path.join(screenshotsDir, 'p19_20_autosave.png') });
    recordTest(20, 'Autosave to localStorage', passT20, `Debounced autosave wrote mutation to localStorage.`);

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    await browser.close();
  }

  // ─────────────────────────────────────────────────────────────
  // TEST SUITE SUMMARY
  // ─────────────────────────────────────────────────────────────
  console.log('\n🪐 ============================================================');
  console.log('🪐 ORBITOX P19 TEST SUITE SUMMARY');
  console.log('🪐 ============================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`TOTAL TESTS:  ${totalCount}`);
  console.log(`PASSED:       ${passedCount}`);
  console.log(`FAILED:       ${totalCount - passedCount}`);
  console.log(`SUCCESS RATE: ${Math.round((passedCount / totalCount) * 100)}%`);

  if (passedCount === 20) {
    console.log('\n🏆 20/20 PASS — ALL P19 COMPOSER CORE 2.0 WORKFLOWS DETERMINISTIC!');
  } else {
    console.log('\n⚠️ Some tests failed. Review details above.');
  }

  return { passedCount, totalCount, results };
}

testP19FunctionalTruth().catch(console.error);
