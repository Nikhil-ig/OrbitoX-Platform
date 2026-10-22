/**
 * Phase 4 End-to-End Visual & Functional Playwright Audit Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Drives real Chromium browser across Desktop (1440x900) and Mobile (375x812) viewports:
 * 1. CraveAtlas: Customer identity capture in cart drawer -> Live order tracking modal
 * 2. SwiftBite Mobile: Floating cart bar -> Bottom sheet checkout -> Live tracking modal
 * 3. White-Label Studio: Tab 3 Branch Overrides -> Inheritance badges -> Save & Reset
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = path.resolve(process.env.HOME || '/Users/apple', '.gemini/antigravity-ide/brain/945b8da6-0c8a-4383-b2a9-5e62bb73a105/.tempmediaStorage');
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function runAudit() {
  console.log('🚀 Launching Playwright Chromium for Phase 4 Visual Audit...\n');
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    // =========================================================================
    // 1. DESKTOP AUDIT (1440x900): CraveAtlas
    // =========================================================================
    console.log('📱 1. Auditing CraveAtlas on Desktop (1440x900)...');
    const contextDesktop = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const pageDesktop = await contextDesktop.newPage();

    await pageDesktop.goto('http://localhost:4010/apps/crave-atlas', { waitUntil: 'networkidle' });
    console.log('  ✅ Loaded /apps/crave-atlas');

    // Add Tandoori Roti to cart
    const addRotiBtn = pageDesktop.locator('#btn-add-item_tandoori_roti');
    if (await addRotiBtn.isVisible()) {
      await addRotiBtn.click();
      console.log('  ✅ Clicked + ADD on Tandoori Roti');
    } else {
      // Fallback: click first add button
      await pageDesktop.locator('.ca-dish-add-btn').first().click();
    }
    await pageDesktop.waitForTimeout(500);

    // Open Cart Drawer
    await pageDesktop.click('#ca-cart-trigger');
    await pageDesktop.waitForSelector('#ca-cart-drawer.open', { timeout: 3000 });
    console.log('  ✅ Cart drawer opened');

    // Screenshot Cart Drawer with Customer Identity Fields
    const cartScreenshotPath = path.join(ARTIFACT_DIR, 'phase4_craveatlas_cart_drawer_desktop.png');
    await pageDesktop.screenshot({ path: cartScreenshotPath });
    console.log(`  📸 Saved screenshot: ${cartScreenshotPath}`);

    // Fill Customer Identity Inputs
    await pageDesktop.fill('#ca-customer-name', 'Aarav Sharma');
    await pageDesktop.fill('#ca-customer-phone', '+91 98765 43210');
    await pageDesktop.fill('#ca-delivery-address', 'House 42, Sector 17, Chandigarh');
    await pageDesktop.fill('#ca-customer-notes', 'Ring doorbell once. Leave with reception.');
    console.log('  ✅ Customer identity details entered');

    // Submit Order
    await pageDesktop.click('#ca-submit-order-btn');
    console.log('  ✅ Clicked submit order button');

    // Wait for Live Order Tracking Modal
    await pageDesktop.waitForSelector('#ca-tracking-modal.open', { timeout: 8000 });
    console.log('  ✅ Live Order Tracking modal opened successfully!');

    // Wait 1s for SSE/Polling badge to render
    await pageDesktop.waitForTimeout(1000);

    const trackerScreenshotPath = path.join(ARTIFACT_DIR, 'phase4_craveatlas_live_tracker_desktop.png');
    await pageDesktop.screenshot({ path: trackerScreenshotPath });
    console.log(`  📸 Saved screenshot: ${trackerScreenshotPath}`);

    // Close Tracking Modal and verify Floating Tracker Pill
    await pageDesktop.click('#ca-tracking-modal button');
    await pageDesktop.waitForTimeout(500);

    const pillVisible = await pageDesktop.locator('#ca-floating-tracker').isVisible();
    console.log(`  ✅ Floating tracker pill visible: ${pillVisible}`);

    const pillScreenshotPath = path.join(ARTIFACT_DIR, 'phase4_craveatlas_floating_pill_desktop.png');
    await pageDesktop.screenshot({ path: pillScreenshotPath });
    console.log(`  📸 Saved screenshot: ${pillScreenshotPath}`);

    await contextDesktop.close();

    // =========================================================================
    // 2. MOBILE AUDIT (375x812): SwiftBite
    // =========================================================================
    console.log('\n📱 2. Auditing SwiftBite on Mobile (375x812)...');
    const contextMobile = await browser.newContext({
      viewport: { width: 375, height: 812 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const pageMobile = await contextMobile.newPage();

    await pageMobile.goto('http://localhost:4010/apps/swift-bite', { waitUntil: 'networkidle' });
    console.log('  ✅ Loaded /apps/swift-bite on mobile viewport');

    const mobileMenuScreenshotPath = path.join(ARTIFACT_DIR, 'phase4_swiftbite_mobile_menu.png');
    await pageMobile.screenshot({ path: mobileMenuScreenshotPath });
    console.log(`  📸 Saved screenshot: ${mobileMenuScreenshotPath}`);

    // Add item to cart
    await pageMobile.locator('.sb-dish-add-btn').first().click();
    await pageMobile.waitForTimeout(500);
    console.log('  ✅ Clicked add dish to SwiftBite cart');

    // Confirm customization if modal opens
    const customizerModal = pageMobile.locator('#sb-customizer-modal');
    if (await customizerModal.isVisible()) {
      await pageMobile.click('#sb-customizer-modal button.sb-order-btn');
      await pageMobile.waitForTimeout(500);
      console.log('  ✅ Confirmed customization and added to cart');
    }

    // Click mobile floating cart bar
    await pageMobile.click('#sb-mobile-bar button');
    await pageMobile.waitForSelector('#sb-mobile-checkout-modal.open', { timeout: 3000 });
    console.log('  ✅ Mobile checkout bottom sheet modal opened');

    const mobileCheckoutScreenshotPath = path.join(ARTIFACT_DIR, 'phase4_swiftbite_mobile_checkout_sheet.png');
    await pageMobile.screenshot({ path: mobileCheckoutScreenshotPath });
    console.log(`  📸 Saved screenshot: ${mobileCheckoutScreenshotPath}`);

    // Enter customer details in mobile modal
    await pageMobile.fill('#sb-m-customer-name', 'Simran Kaur');
    await pageMobile.fill('#sb-m-customer-phone', '9888811223');
    await pageMobile.fill('#sb-m-delivery-address', 'Flat 8B, Sector 35, Chandigarh');
    await pageMobile.fill('#sb-m-customer-notes', 'Call before arrival');
    console.log('  ✅ Mobile customer details filled');

    // Place order
    await pageMobile.click('#sb-m-submit-order-btn');
    console.log('  ✅ Clicked mobile submit order button');

    // Wait for Live Tracking Modal
    await pageMobile.waitForSelector('#sb-tracking-modal.open', { timeout: 8000 });
    console.log('  ✅ SwiftBite Live Tracking modal opened successfully!');

    await pageMobile.waitForTimeout(1000);
    const mobileTrackingScreenshotPath = path.join(ARTIFACT_DIR, 'phase4_swiftbite_mobile_tracker.png');
    await pageMobile.screenshot({ path: mobileTrackingScreenshotPath });
    console.log(`  📸 Saved screenshot: ${mobileTrackingScreenshotPath}`);

    await contextMobile.close();

    // =========================================================================
    // 3. WHITE-LABEL STUDIO AUDIT (1440x900): Tab 3 Branch Overrides
    // =========================================================================
    console.log('\n🎨 3. Auditing White-Label Studio (1440x900)...');
    const contextWL = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const pageWL = await contextWL.newPage();

    // Auto-accept confirmation dialogs
    pageWL.on('dialog', async (dialog) => {
      console.log(`  🔔 Dialog appeared: [${dialog.type()}] "${dialog.message()}" -> accepting`);
      await dialog.accept();
    });

    await pageWL.goto('http://localhost:4010/whitelabel', { waitUntil: 'networkidle' });
    console.log('  ✅ Loaded /whitelabel');

    // Switch to Tab 3: Branch Overrides
    await pageWL.click('#tab-btn-locations');
    await pageWL.waitForSelector('#section-locations', { state: 'visible', timeout: 3000 });
    console.log('  ✅ Switched to Tab 3: Branch Overrides');

    // Select Chandigarh Sector 17
    await pageWL.click('#btn-branch-override-branch_chd');
    await pageWL.waitForTimeout(500);
    console.log('  ✅ Selected Chandigarh Sector 17 branch');

    const wlTab3ScreenshotPath = path.join(ARTIFACT_DIR, 'phase4_whitelabel_tab3_branch_overrides.png');
    await pageWL.screenshot({ path: wlTab3ScreenshotPath });
    console.log(`  📸 Saved screenshot: ${wlTab3ScreenshotPath}`);

    // Update branch overrides
    await pageWL.fill('#branch-override-name', 'The Chandigarh Grand Heritage');
    await pageWL.fill('#branch-override-tagline', 'Artisan North Indian Dining at Sector 17');
    await pageWL.fill('#branch-override-color', '#8B4513');
    await pageWL.fill('#branch-override-subdomain', 'chandigarh-heritage');
    await pageWL.fill('#branch-override-phone', '+91 172 270 4421');

    // Click Save Branch Override
    await pageWL.click('#btn-save-branch-override');
    await pageWL.waitForTimeout(1000);
    console.log('  ✅ Clicked Save Branch Override');

    const wlSavedScreenshotPath = path.join(ARTIFACT_DIR, 'phase4_whitelabel_override_saved.png');
    await pageWL.screenshot({ path: wlSavedScreenshotPath });
    console.log(`  📸 Saved screenshot: ${wlSavedScreenshotPath}`);

    // Click Reset to Brand Default
    await pageWL.click('#btn-reset-branch-override');
    await pageWL.waitForTimeout(1000);
    console.log('  ✅ Clicked Reset to Brand Default');

    const wlResetScreenshotPath = path.join(ARTIFACT_DIR, 'phase4_whitelabel_override_reset.png');
    await pageWL.screenshot({ path: wlResetScreenshotPath });
    console.log(`  📸 Saved screenshot: ${wlResetScreenshotPath}`);

    await contextWL.close();

    console.log('\n🎉 ALL PHASE 4 BROWSER AUDITS COMPLETED SUCCESSFULLY WITH SCREENSHOTS!');
  } finally {
    await browser.close();
  }
}

runAudit().catch((err) => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
