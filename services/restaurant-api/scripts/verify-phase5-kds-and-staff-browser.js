/**
 * 📸 RestaurantOS Phase 5 Browser Visual Verification Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Uses Playwright to verify KDS workstation and staff workspace across desktop
 * and tablet workstation viewports.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runBrowserAudit() {
  console.log('🌐 Launching Playwright browser audit for Phase 5...');
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  } catch (err) {
    try {
      browser = await chromium.launch({ headless: true });
    } catch (e2) {
      console.log('⚠️ System headless chrome not found directly. Will use subagent.');
      throw e2;
    }
  }

  const artifactDir = path.join(__dirname, '..', 'data', 'phase5-audit');
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  // 1. Desktop KDS Workstation (1440x900) - ALL Stations
  console.log('  🖥️ Auditing Desktop KDS (1440x900) - ALL Stations...');
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await desktopContext.newPage();
  await page.goto('http://localhost:4010/kds?station=ALL', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  
  const desktopAllPath = path.join(artifactDir, 'phase5_kds_desktop_all.png');
  await page.screenshot({ path: desktopAllPath, fullPage: true });
  console.log('  ✅ Captured Desktop KDS (ALL):', desktopAllPath);

  // Test Audio Toggle Interaction
  const audioToggle = await page.$('#kds-audio-toggle');
  if (audioToggle) {
    console.log('  🔔 Clicking KDS Audio Toggle button...');
    await audioToggle.click();
    await page.waitForTimeout(500);
    const audioState = await page.$eval('#kds-audio-label', el => el.textContent);
    console.log('  ✅ Audio Toggle State updated to:', audioState);
  }

  // 2. Desktop KDS Workstation (1440x900) - EXPO Pass
  console.log('  🖥️ Auditing Desktop KDS (1440x900) - EXPO Mode...');
  await page.goto('http://localhost:4010/kds?station=EXPO', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const desktopExpoPath = path.join(artifactDir, 'phase5_kds_desktop_expo.png');
  await page.screenshot({ path: desktopExpoPath, fullPage: true });
  console.log('  ✅ Captured Desktop KDS (EXPO):', desktopExpoPath);

  // 3. Desktop KDS Workstation (1440x900) - RECALL Pass
  console.log('  🖥️ Auditing Desktop KDS (1440x900) - RECALL Mode...');
  await page.goto('http://localhost:4010/kds?station=RECALL', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const desktopRecallPath = path.join(artifactDir, 'phase5_kds_desktop_recall.png');
  await page.screenshot({ path: desktopRecallPath, fullPage: true });
  console.log('  ✅ Captured Desktop KDS (RECALL):', desktopRecallPath);

  // 4. Tablet KDS Workstation (1024x768) - Kitchen Tablet Pass
  console.log('  📱 Auditing Tablet KDS (1024x768)...');
  const tabletContext = await browser.newContext({
    viewport: { width: 1024, height: 768 },
  });
  const tabletPage = await tabletContext.newPage();
  await tabletPage.goto('http://localhost:4010/kds?station=TANDOOR', { waitUntil: 'networkidle' });
  await tabletPage.waitForTimeout(1000);
  const tabletTandoorPath = path.join(artifactDir, 'phase5_kds_tablet_tandoor.png');
  await tabletPage.screenshot({ path: tabletTandoorPath, fullPage: true });
  console.log('  ✅ Captured Tablet KDS (TANDOOR):', tabletTandoorPath);

  // 5. Staff Management Workspace (1440x900)
  console.log('  👥 Auditing Staff Management Workspace...');
  await page.goto('http://localhost:4010/operations/staff', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const staffWorkspacePath = path.join(artifactDir, 'phase5_staff_workspace.png');
  await page.screenshot({ path: staffWorkspacePath, fullPage: true });
  console.log('  ✅ Captured Staff Workspace:', staffWorkspacePath);

  // Switch to Role & Permissions Matrix tab
  const matrixBtn = await page.$('#tab-btn-matrix');
  if (matrixBtn) {
    await matrixBtn.click();
    await page.waitForTimeout(500);
    const staffMatrixPath = path.join(artifactDir, 'phase5_staff_matrix.png');
    await page.screenshot({ path: staffMatrixPath, fullPage: true });
    console.log('  ✅ Captured Staff RBAC Matrix:', staffMatrixPath);
  }

  await browser.close();
  console.log('\n🎉 Browser visual audit complete! All screenshots saved in:', artifactDir);
}

runBrowserAudit().catch(err => {
  console.error('Fatal error during Playwright visual audit:', err);
  process.exit(1);
});
