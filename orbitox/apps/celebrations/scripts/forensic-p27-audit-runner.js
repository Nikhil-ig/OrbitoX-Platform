const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runAudit() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1680, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to Studio...');
  await page.goto('http://localhost:3010/admin/template-studio?template=saas-nextgen', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Capture screenshot diagnostic
  const screenshotPath = '/Users/apple/.gemini/antigravity-ide/brain/815297d3-01e6-492f-9259-3903dd5f3b53/diagnostic_p27_forensic.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Diagnostic screenshot saved to:', screenshotPath);

  // Full inventory of all interactive controls
  const inventory = await page.evaluate(() => {
    const controls = [];
    const elements = document.querySelectorAll('button, input, select, textarea, [role="button"], [data-testid]');
    
    elements.forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
      const surface = el.closest('#sz-top-bar') ? 'top_bar'
        : el.closest('#sz-properties-panel, #sz-section-inspector') ? 'inspector'
        : el.closest('#sz-left-rail, aside') ? 'rail'
        : el.closest('#sz-canvas, .orbitox-studio-zero') ? 'canvas'
        : 'modal_or_overlay';

      controls.push({
        id: el.id || el.getAttribute('data-testid') || `ctrl_${index}`,
        surface,
        tag: el.tagName,
        type: el.getAttribute('type') || null,
        label: (el.textContent || el.getAttribute('title') || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim().slice(0, 50),
        isVisible,
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
        disabled: el.hasAttribute('disabled'),
      });
    });

    return {
      totalControls: controls.length,
      visibleControls: controls.filter(c => c.isVisible).length,
      controls: controls.slice(0, 100),
    };
  });

  console.log('Inventory summary: total', inventory.totalControls, 'visible:', inventory.visibleControls);

  // Test Node selection & inspector state
  const headingEl = await page.$('[data-node-id="node_hero_title"]');
  let headingInfo = null;
  if (headingEl) {
    const box = await headingEl.boundingBox();
    await headingEl.click();
    await page.waitForTimeout(1000);

    headingInfo = await page.evaluate(() => {
      const win = window;
      const state = win.__studioStore?.getState();
      const inspector = document.querySelector('#sz-properties-panel');
      return {
        selectedNodeId: state?.ui?.selection?.nodeId,
        hasInspector: Boolean(inspector),
        inspectorInputs: inspector ? Array.from(inspector.querySelectorAll('input, select')).map(i => ({
          tag: i.tagName,
          val: (i).value,
          label: i.getAttribute('placeholder') || i.getAttribute('title') || ''
        })).slice(0, 15) : []
      };
    });
  }

  console.log('Heading selection result:', JSON.stringify(headingInfo, null, 2));

  await browser.close();
  return { inventory, headingInfo, screenshotPath };
}

runAudit().then(res => {
  console.log('Audit complete.');
  process.exit(0);
}).catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
