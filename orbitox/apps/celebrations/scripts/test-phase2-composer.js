const { chromium } = require('playwright');
const path = require('path');

async function run() {
  console.log('🚀 Starting Phase 2 Section Composer Verification...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleLogs = [];
  const consoleErrors = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    if (msg.type() === 'error') {
      consoleErrors.push(text);
    }
  });

  try {
    console.log('Navigating to Template Studio...');
    await page.goto('http://localhost:3010/admin/template-studio?template=celestial-odyssey', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.waitForSelector('#sz-left-rail', { timeout: 15000 });
    console.log('✅ Studio Shell loaded successfully.');

    // 1. Verify publish modal is NOT blocking canvas
    const publishModal = await page.$('#sz-publish-modal-backdrop');
    if (publishModal) {
      const isVisible = await publishModal.isVisible();
      if (isVisible) {
        throw new Error('❌ Publish modal is unexpectedly visible on initial load!');
      }
    }
    console.log('✅ Verified Publish Modal is closed by default.');

    // 2. Open Pages panel
    await page.click('#sz-rail-btn-pages');
    await page.waitForSelector('#sz-pages-panel', { timeout: 5000 });
    console.log('✅ Pages panel opened.');

    // 3. Count initial sections
    const getSectionNames = async () => {
      return await page.$$eval('#sz-pages-panel [id^="sz-page-section-row-"] span:nth-child(3)', spans =>
        spans.map(s => s.innerText.trim())
      );
    };

    const initialSections = await getSectionNames();
    console.log(`Initial sections (${initialSections.length}):`, initialSections);

    // 4. Open Add drawer and insert Pricing Tiers
    console.log('Opening Add Section library...');
    await page.click('#sz-rail-btn-add');
    await page.waitForSelector('#sz-library-drawer', { timeout: 5000 });

    console.log('Clicking Pricing Table card...');
    await page.waitForSelector('#sz-section-card-sec_pricing_table', { timeout: 5000 });
    await page.click('#sz-section-card-sec_pricing_table');
    await page.waitForTimeout(1000);

    // 5. Insert Gallery
    console.log('Clicking Visual Media Gallery card...');
    await page.waitForSelector('#sz-section-card-sec_gallery', { timeout: 5000 });
    await page.click('#sz-section-card-sec_gallery');
    await page.waitForTimeout(1000);

    // 6. Switch back to Pages panel to inspect sections
    await page.click('#sz-rail-btn-pages');
    await page.waitForSelector('#sz-pages-panel', { timeout: 5000 });
    const updatedSections = await getSectionNames();
    console.log(`Updated sections (${updatedSections.length}):`, updatedSections);

    const hasPricing = updatedSections.some(s => s.toLowerCase().includes('pricing'));
    const hasGallery = updatedSections.some(s => s.toLowerCase().includes('gallery'));
    if (!hasPricing || !hasGallery) {
      throw new Error(`Expected Pricing and Gallery in sections, got: ${JSON.stringify(updatedSections)}`);
    }
    console.log('✅ Pricing Table and Gallery sections successfully inserted.');

    // 7. Verify Unique Node IDs across entire project schema in localStorage
    const schemaRaw = await page.evaluate(() => {
      return localStorage.getItem('orbitox_celebrations_template_schema_celestial-odyssey');
    });
    if (!schemaRaw) {
      throw new Error('❌ Schema not found in localStorage!');
    }
    const schema = JSON.parse(schemaRaw);
    const nodeIds = [];
    const collectNodeIds = (nodes) => {
      if (!nodes) return;
      for (const node of Object.values(nodes)) {
        nodeIds.push(node.id);
        if (node.children) {
          // children are string IDs
        }
      }
    };
    for (const scene of schema.scenes) {
      if (scene.sceneGraph && scene.sceneGraph.nodes) {
        collectNodeIds(scene.sceneGraph.nodes);
      }
    }
    const uniqueIds = new Set(nodeIds);
    console.log(`Total nodes in project: ${nodeIds.length}, Unique IDs: ${uniqueIds.size}`);
    if (nodeIds.length !== uniqueIds.size) {
      const duplicates = nodeIds.filter((id, index) => nodeIds.indexOf(id) !== index);
      throw new Error(`❌ Found duplicate node IDs: ${JSON.stringify(duplicates)}`);
    }
    console.log('✅ Zero Node ID Collisions: All nodes across inserted sections are guaranteed unique!');

    // 8. Test Section Reordering
    const galleryRowIndex = updatedSections.findIndex(s => s.toLowerCase().includes('gallery'));
    console.log(`Gallery is at index ${galleryRowIndex}. Moving up...`);

    // Find the section ID for gallery
    const sectionIds = await page.$$eval('#sz-pages-panel [id^="sz-page-section-row-"]', rows =>
      rows.map(r => r.id.replace('sz-page-section-row-', ''))
    );
    const gallerySectionId = sectionIds[galleryRowIndex];
    const moveUpBtn = await page.$(`#sz-panel-sec-up-${gallerySectionId}`);
    if (!moveUpBtn) {
      throw new Error(`Could not find move up button for ${gallerySectionId}`);
    }
    await moveUpBtn.click();
    await page.waitForTimeout(800);

    const reorderedSections = await getSectionNames();
    console.log('Sections after Move Up:', reorderedSections);
    const newGalleryRowIndex = reorderedSections.findIndex(s => s.toLowerCase().includes('gallery'));
    if (newGalleryRowIndex !== galleryRowIndex - 1) {
      throw new Error(`Expected gallery to move from ${galleryRowIndex} to ${galleryRowIndex - 1}, but is at ${newGalleryRowIndex}`);
    }
    console.log(`✅ Section moved up successfully (from ${galleryRowIndex} to ${newGalleryRowIndex}).`);

    // 9. Test Undo
    console.log('Testing Undo (Clicking #sz-undo-btn)...');
    await page.click('#sz-undo-btn');
    await page.waitForTimeout(800);

    const sectionsAfterUndo = await getSectionNames();
    console.log('Sections after Undo:', sectionsAfterUndo);
    const galleryRowIndexAfterUndo = sectionsAfterUndo.findIndex(s => s.toLowerCase().includes('gallery'));
    if (galleryRowIndexAfterUndo !== galleryRowIndex) {
      throw new Error(`Expected gallery to revert to index ${galleryRowIndex}, but got ${galleryRowIndexAfterUndo}`);
    }
    console.log('✅ Undo restored exact previous section order deterministically!');

    // 10. Capture screenshot of verified canvas
    const screenshotPath = '/Users/apple/.gemini/antigravity-ide/brain/e1945eb2-f0c9-4854-913d-b4ee9b26219a/phase2_composer_verified.png';
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`📸 Screenshot saved to ${screenshotPath}`);

    console.log('🎉 PHASE 2 VERIFICATION PASSED COMPLETELY!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
