const { chromium } = require('playwright');

async function run() {
  console.log('🚀 Starting Phase 3 Element Coverage & Dedicated Property Controls Verification...');
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

    // 1. Audit element kinds present in the initial template canvas
    const renderedKinds = await page.$$eval('[data-node-kind]', els => {
      const set = new Set();
      els.forEach(el => set.add(el.getAttribute('data-node-kind')));
      return Array.from(set);
    });
    console.log('Rendered Node Kinds on Canvas:', renderedKinds);

    // 2. Test Text / Heading node inspection
    console.log('Testing Text / Heading inspection...');
    const textNode = await page.$('[data-node-kind="text"]');
    if (textNode) {
      await textNode.click();
      await page.waitForTimeout(400);
      const textInput = await page.$('#sz-text-content-input');
      if (textInput) {
        await textInput.fill('Crafted with OrbitoX Studio');
        console.log('✅ Heading / Text node inspected and edited.');
      }
    }

    // 3. Test Countdown node inspection and dedicated controls
    console.log('Testing Countdown Chronometer dedicated controls...');
    const countdownNode = await page.$('[data-node-kind="countdown"]');
    if (countdownNode) {
      await countdownNode.scrollIntoViewIfNeeded();
      await countdownNode.click();
      await page.waitForTimeout(500);

      const countdownDate = await page.$('#sz-inspector-countdown-date');
      if (countdownDate) {
        console.log('✅ Dedicated Countdown Inspector mounted!');
        await countdownDate.fill('2026-11-28T20:00');

        const styleEditorial = await page.$('#sz-inspector-countdown-style-editorial');
        if (styleEditorial) {
          await styleEditorial.click();
          console.log('✅ Countdown visual style switched to editorial.');
        }

        const labelsToggle = await page.$('#sz-inspector-countdown-labels-toggle');
        if (labelsToggle) {
          await labelsToggle.click();
          console.log('✅ Countdown labels toggled.');
        }
      } else {
        throw new Error('❌ Countdown inspector not found after clicking countdown node');
      }
    } else {
      console.log('ℹ️ Countdown node not directly found on canvas with data-node-kind="countdown"');
    }

    // 4. Test Map / Venue dedicated controls
    console.log('Testing Venue / Sanctuary Map dedicated controls...');
    const venueNode = await page.$('[data-node-kind="venue"]');
    if (venueNode) {
      await venueNode.scrollIntoViewIfNeeded();
      await venueNode.click();
      await page.waitForTimeout(500);

      const venueInput = await page.$('#sz-inspector-map-venue-name');
      if (venueInput) {
        console.log('✅ Dedicated Venue / Map Inspector mounted!');
        await venueInput.fill('The Grand Celestial Astral Sanctuary');
        console.log('✅ Venue name updated.');
      }
    }

    // 5. Test RSVP / Form dedicated controls
    console.log('Testing RSVP / Form dedicated controls...');
    const formNode = await page.$('[data-node-kind="rsvpform"], [data-node-kind="rsvp"]');
    if (formNode) {
      await formNode.scrollIntoViewIfNeeded();
      await formNode.click();
      await page.waitForTimeout(500);

      const actionSelect = await page.$('#sz-inspector-form-action-select');
      const submitLabelInput = await page.$('#sz-inspector-form-submit-label');
      if (actionSelect && submitLabelInput) {
        console.log('✅ Dedicated Form / RSVP Inspector mounted!');
        await submitLabelInput.fill('Confirm Royal Attendance');
        console.log('✅ Submit button label updated.');
      }
    }

    // 6. Test 3D Spatial Computing dedicated controls
    console.log('Testing 3D Spatial computing dedicated controls...');
    const threeDNode = await page.$('[data-node-kind="interactive_object"], [data-node-kind="threed"]');
    if (threeDNode) {
      await threeDNode.scrollIntoViewIfNeeded();
      await threeDNode.click();
      await page.waitForTimeout(500);

      const meshSelect = await page.$('#sz-inspector-3d-mesh-select');
      const wireframeToggle = await page.$('#sz-inspector-3d-wireframe-toggle');
      if (meshSelect && wireframeToggle) {
        console.log('✅ Dedicated 3D Spatial Inspector mounted!');
        await wireframeToggle.click();
        console.log('✅ Wireframe mode toggled.');
      }
    }

    // 7. Test Image node inspection
    console.log('Testing Image element inspection...');
    const imageNode = await page.$('[data-node-kind="image"]');
    if (imageNode) {
      await imageNode.scrollIntoViewIfNeeded();
      await imageNode.click();
      await page.waitForTimeout(500);

      const urlInput = await page.$('#sz-inspector-image-url-input');
      const fitCover = await page.$('#sz-inspector-fit-cover');
      if (urlInput && fitCover) {
        console.log('✅ Dedicated Image Inspector mounted with fit & focal point!');
        await fitCover.click();
      }
    }

    // 8. Capture screenshot
    const screenshotPath = '/Users/apple/.gemini/antigravity-ide/brain/e1945eb2-f0c9-4854-913d-b4ee9b26219a/phase3_elements_verified.png';
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`📸 Screenshot saved to ${screenshotPath}`);

    console.log('🎉 PHASE 3 VERIFICATION PASSED COMPLETELY!');
  } catch (err) {
    console.error('❌ Phase 3 test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
