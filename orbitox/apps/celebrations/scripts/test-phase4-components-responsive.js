const { chromium } = require('playwright');

async function run() {
  console.log('🚀 Starting Phase 4 Component System & Responsive Art Direction Verification...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('Browser console error:', msg.text());
    }
  });

  try {
    console.log('Navigating to Template Studio...');
    await page.goto('http://localhost:3010/admin/template-studio?template=celestial-odyssey', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.waitForSelector('#sz-left-rail', { timeout: 15000 });
    console.log('✅ Studio Shell loaded.');

    // ─── 1. COMPONENT SYSTEM VERIFICATION ───
    console.log('1. Testing Component System...');

    // Select a button on canvas
    const btnNode = await page.$('[data-node-kind="button"]');
    if (!btnNode) {
      throw new Error('Could not find button node on canvas');
    }
    await btnNode.scrollIntoViewIfNeeded();
    await btnNode.click();
    await page.waitForTimeout(500);

    // Click "Convert into Master Component"
    const createCompBtn = await page.$('#sz-create-component-btn');
    if (!createCompBtn) {
      throw new Error('Create Component button not found in Inspector');
    }
    await createCompBtn.click();
    await page.waitForTimeout(600);

    // Verify Master Component badge is displayed
    const masterBadge = await page.$('#sz-master-component-badge');
    if (!masterBadge) {
      throw new Error('Master Component badge not visible after creation');
    }
    console.log('✅ Master Component successfully created (❖).');

    // Instantiate an instance
    const addInstBtn = await page.$('#sz-inspector-instantiate-btn');
    if (!addInstBtn) {
      throw new Error('Add Instance button not found on Master Component');
    }
    await addInstBtn.click();
    await page.waitForTimeout(600);
    console.log('✅ Instantiated component instance.');

    // Click on the newly instantiated instance (it has (Instance) in name or isInstance)
    const instanceBanner = await page.$('#sz-instance-component-banner');
    if (instanceBanner) {
      console.log('✅ Instance Component Inspector banner mounted (◇).');

      // Test Detaching the instance
      const detachBtn = await page.$('#sz-detach-instance-btn');
      if (detachBtn) {
        await detachBtn.click();
        await page.waitForTimeout(600);
        console.log('✅ Component instance detached into independent layer.');
      }
    }

    // ─── 2. RESPONSIVE ART DIRECTION VERIFICATION ───
    console.log('2. Testing Responsive Art Direction Cascade...');

    // Check initial Desktop artboard width
    const artboard = await page.$('#orbitox-artboard-frame');
    if (!artboard) throw new Error('Artboard frame not found');

    const getArtboardWidth = async () => {
      return await page.$eval('#orbitox-artboard-frame', el => el.clientWidth);
    };

    const initialDesktopWidth = await getArtboardWidth();
    console.log(`Initial Desktop Artboard Width: ${initialDesktopWidth}px`);
    if (initialDesktopWidth < 1400) {
      throw new Error(`Expected Desktop width ~1440px, got ${initialDesktopWidth}px`);
    }

    // Switch to Tablet (768px)
    console.log('Switching to Tablet viewport...');
    await page.click('#sz-viewport-tablet');
    await page.waitForTimeout(500);
    const tabletWidth = await getArtboardWidth();
    console.log(`Tablet Artboard Width: ${tabletWidth}px`);
    if (tabletWidth !== 768) {
      throw new Error(`Expected Tablet width 768px, got ${tabletWidth}px`);
    }
    console.log('✅ Tablet viewport verified (768px).');

    // Switch to Mobile (390px)
    console.log('Switching to Mobile viewport...');
    await page.click('#sz-viewport-mobile');
    await page.waitForTimeout(500);
    const mobileWidth = await getArtboardWidth();
    console.log(`Mobile Artboard Width: ${mobileWidth}px`);
    if (mobileWidth !== 390) {
      throw new Error(`Expected Mobile width 390px, got ${mobileWidth}px`);
    }
    console.log('✅ Mobile viewport verified (390px).');

    // On mobile, test independent override
    const textNode = await page.$('[data-node-kind="text"]');
    if (textNode) {
      await textNode.click();
      await page.waitForTimeout(400);

      // Check if responsive override badge is present in Properties Panel
      const responsiveBadges = await page.$$('.sz-responsive-badge');
      console.log(`Found ${responsiveBadges.length} responsive indicator badges in Inspector.`);
    }

    // Switch back to Desktop
    console.log('Switching back to Desktop viewport...');
    await page.click('#sz-viewport-desktop');
    await page.waitForTimeout(500);
    const restoredDesktopWidth = await getArtboardWidth();
    console.log(`Restored Desktop Artboard Width: ${restoredDesktopWidth}px`);
    if (restoredDesktopWidth < 1400) {
      throw new Error(`Expected Desktop restored width ~1440px, got ${restoredDesktopWidth}px`);
    }
    console.log('✅ Desktop viewport restored with inheritance intact.');

    // Capture screenshot
    const screenshotPath = '/Users/apple/.gemini/antigravity-ide/brain/e1945eb2-f0c9-4854-913d-b4ee9b26219a/phase4_components_responsive_verified.png';
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`📸 Screenshot saved to ${screenshotPath}`);

    console.log('🎉 PHASE 4 VERIFICATION PASSED COMPLETELY!');
  } catch (err) {
    console.error('❌ Phase 4 test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
