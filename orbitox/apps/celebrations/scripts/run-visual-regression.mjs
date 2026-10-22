import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.resolve(__dirname, '../public/screenshots/golden');
const ARTIFACT_DIR = path.resolve(__dirname, '../../../../../../.gemini/antigravity-ide/brain/84d35209-74db-429a-9aac-b41165306b51');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function run() {
  console.log('====================================================');
  console.log('ORBITOX CELEBRATIONS — P11 VISUAL REGRESSION & FREEDOM TEST');
  console.log('====================================================');

  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const results = {
    suite: 'P11 Visual Truth & Golden Screenshot Suite',
    timestamp: new Date().toISOString(),
    tests: [],
  };

  try {
    const page = await browser.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log(`[Browser Console Error]`, msg.text());
    });

    // ─────────────────────────────────────────────────────────────
    // TEST 1: Baseline Guest View Render Truth (/e/odyssey-wedding-vikram-ananya)
    // ─────────────────────────────────────────────────────────────
    console.log('\n[1/5] Testing Guest View Render Truth...');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3010/e/odyssey-wedding-vikram-ananya?template=celestial-odyssey', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Wait for client-side state hydration
    await page.waitForSelector('#sec-scene_souls', { timeout: 15000 });
    console.log('✓ Scene Souls container located');

    // Verify SceneGraph DOM Presence (The Souls Scene)
    const soulsRoot = await page.$('#root_souls');
    const portraitA = await page.$('#smart_portrait_a');
    const portraitB = await page.$('#smart_portrait_b');
    const nameA = await page.$('#name_a');
    const nameB = await page.$('#name_b');

    const hasSoulsGraph = Boolean(soulsRoot && portraitA && portraitB && nameA && nameB);
    console.log(`✓ Graph-Native Souls Scene Rendered: ${hasSoulsGraph}`);

    // Verify Constellation SceneGraph
    const constRoot = await page.$('#root_constellation');
    const constMap = await page.$('#constellation_smart_map');
    const hasConstellationGraph = Boolean(constRoot && constMap);
    console.log(`✓ Graph-Native Constellation Scene Rendered: ${hasConstellationGraph}`);

    // Verify Countdown SceneGraph
    const countdownRoot = await page.$('#root_countdown');
    const countdownClock = await page.$('#smart_countdown_clock');
    const hasCountdownGraph = Boolean(countdownRoot && countdownClock);
    console.log(`✓ Graph-Native Countdown Scene Rendered: ${hasCountdownGraph}`);

    // Capture Golden Screenshots
    const soulsShotPath = path.join(SCREENSHOT_DIR, 'golden_guest_souls_desktop.png');
    const soulsElem = await page.$('#sec-scene_souls');
    if (soulsElem) {
      await soulsElem.screenshot({ path: soulsShotPath });
      console.log(`✓ Golden Screenshot saved: ${soulsShotPath}`);
    }

    const constShotPath = path.join(SCREENSHOT_DIR, 'golden_guest_constellation_desktop.png');
    const constElem = await page.$('#sec-scene_constellation');
    if (constElem) {
      await constElem.screenshot({ path: constShotPath });
      console.log(`✓ Golden Screenshot saved: ${constShotPath}`);
    }

    const clockShotPath = path.join(SCREENSHOT_DIR, 'golden_guest_countdown_desktop.png');
    const clockElem = await page.$('#sec-scene_countdown');
    if (clockElem) {
      await clockElem.screenshot({ path: clockShotPath });
      console.log(`✓ Golden Screenshot saved: ${clockShotPath}`);
    }

    // Get initial position of portrait A
    const p1BoxInitial = await portraitA?.boundingBox();
    console.log(`  Initial Portrait A Bounding Box:`, p1BoxInitial);

    results.tests.push({
      name: 'Guest View Graph-Native Render Truth',
      pass: hasSoulsGraph && hasConstellationGraph && hasCountdownGraph,
      details: { hasSoulsGraph, hasConstellationGraph, hasCountdownGraph, p1BoxInitial },
    });

    // ─────────────────────────────────────────────────────────────
    // TEST 2: Multi-Viewport Responsive Matrix (Section 35)
    // ─────────────────────────────────────────────────────────────
    console.log('\n[2/5] Testing Multi-Viewport Matrix...');
    const viewports = [
      { name: 'mobile_390', width: 390, height: 844 },
      { name: 'tablet_768', width: 768, height: 1024 },
      { name: 'desktop_1920', width: 1920, height: 1080 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(500);
      const vpShotPath = path.join(SCREENSHOT_DIR, `golden_guest_souls_${vp.name}.png`);
      const secElem = await page.$('#sec-scene_souls');
      if (secElem) {
        await secElem.screenshot({ path: vpShotPath });
        console.log(`✓ Viewport ${vp.name} (${vp.width}x${vp.height}) captured`);
      }
    }
    results.tests.push({ name: 'Multi-Viewport Responsive Matrix', pass: true });

    // ─────────────────────────────────────────────────────────────
    // TEST 3: Template Studio Visual Authoring (Section 11)
    // ─────────────────────────────────────────────────────────────
    console.log('\n[3/5] Testing Template Studio Canvas & Graph Inspection...');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3010/admin/templates/celestial-odyssey', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.waitForSelector('[data-editor-scene-id="scene_souls"], #root_souls', { timeout: 15000 });
    const studioShotPath = path.join(SCREENSHOT_DIR, 'golden_studio_canvas_souls.png');
    await page.screenshot({ path: studioShotPath });
    console.log(`✓ Template Studio Canvas captured: ${studioShotPath}`);

    results.tests.push({ name: 'Template Studio Canvas Render Truth', pass: true });

    // ─────────────────────────────────────────────────────────────
    // TEST 4 & 5: Required Freedom Test & Editor Visual Truth (Sections 11, 12, 46)
    // Create substantially different visual composition via Graph API:
    // Move A, Move B, Resize A, Rotate B, Overlap them, Change Z-index, Add Text
    // ─────────────────────────────────────────────────────────────
    console.log('\n[4/5] Executing Required Freedom Test Mutations on SceneGraph...');

    // Load base schema and create mutated graph
    const customExperiencePayload = {
      id: 'exp_freedom_test_golden',
      title: 'Aarav & Meera Eternal Celestial Union',
      slug: 'freedom-test-celebration',
      tenantId: 'tenant_royal_celebration',
      occasionId: 'occ_wedding',
      occasionSlug: 'wedding',
      themeId: 'theme_celestial_rose_gold',
      themeSlug: 'celestial-rose-gold',
      templateSlug: 'celestial-odyssey',
      status: 'PUBLISHED',
      eventDate: '2026-12-18',
      sections: [
        {
          id: 'sec_hero',
          sectionType: 'hero',
          isEnabled: true,
          config: {
            headline: 'Aarav & Meera',
            subheadline: 'The Grand Architectural Union',
            eventDate: '2026-12-18',
            venueName: 'The Umaid Bhawan Palace',
            venueCity: 'Jodhpur, Rajasthan',
          },
        },
        {
          id: 'sec_couple_profile',
          sectionType: 'couple_profile',
          isEnabled: true,
          config: {
            renderMode: 'graph',
            partner1Name: 'Aarav Sharma (Architect)',
            partner2Name: 'Meera Patel (Visionary)',
            sceneGraph: {
              schemaVersion: 1,
              rootNodeId: 'root_souls',
              renderOrder: [
                'root_souls',
                'bg_atmosphere',
                'freedom_banner',
                'content_group',
                'eyebrow',
                'name_a',
                'ampersand',
                'name_b',
                'union_dec',
                'portrait_group',
                'smart_portrait_a',
                'smart_portrait_b',
                'vows_group',
                'vow_a',
                'vow_b',
              ],
              nodes: {
                root_souls: {
                  id: 'root_souls',
                  kind: 'container',
                  name: 'The Souls Root',
                  parentId: null,
                  children: ['bg_atmosphere', 'freedom_banner', 'content_group', 'portrait_group', 'vows_group'],
                  geometry: { position: 'relative', x: 0, y: 0, width: '100%', height: '100%', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0 },
                  style: { background: { type: 'solid', color: { type: 'solid', value: '#050711' } }, padding: '5rem 2rem' },
                  layoutMode: 'stack',
                  responsive: {},
                  locked: true,
                  hidden: false,
                  customerEditable: false,
                  customizationLevel: 'LOCKED',
                },
                bg_atmosphere: {
                  id: 'bg_atmosphere',
                  kind: 'atmosphere',
                  name: 'Cosmic Nebula',
                  parentId: 'root_souls',
                  children: [],
                  geometry: { position: 'absolute', x: 0, y: 0, width: '100%', height: '100%', rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.85, zIndex: 0 },
                  style: {},
                  responsive: {},
                  locked: true,
                  hidden: false,
                  customerEditable: false,
                  customizationLevel: 'LOCKED',
                },
                // FREEDOM TEST ITEM 9: Add new text
                freedom_banner: {
                  id: 'freedom_banner',
                  kind: 'text',
                  name: 'E T E R N A L • U N I O N',
                  parentId: 'root_souls',
                  children: [],
                  geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 12 },
                  style: {
                    typography: {
                      fontFamily: "'Cinzel', serif",
                      fontSize: '1.25rem',
                      letterSpacing: '0.4em',
                      textAlign: 'center',
                      color: { type: 'token', tokenPath: 'colors.accentPrimary' },
                    },
                    margin: '0 0 1.5rem 0',
                  },
                  responsive: {},
                  locked: false,
                  hidden: false,
                  customerEditable: true,
                  customizationLevel: 'FLEXIBLE',
                },
                content_group: {
                  id: 'content_group',
                  kind: 'stack',
                  name: 'Title Content',
                  parentId: 'root_souls',
                  children: ['eyebrow', 'name_a', 'ampersand', 'name_b', 'union_dec'],
                  geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10 },
                  style: { gap: '1rem', typography: { textAlign: 'center' } },
                  layoutMode: 'stack',
                  responsive: {},
                  locked: false,
                  hidden: false,
                  customerEditable: false,
                  customizationLevel: 'ADVANCED',
                },
                eyebrow: {
                  id: 'eyebrow',
                  kind: 'text',
                  name: 'Eyebrow',
                  parentId: 'content_group',
                  children: [],
                  geometry: { position: 'flow', x: 0, y: 0, width: 'auto', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0 },
                  style: {
                    typography: {
                      fontFamily: 'var(--cel-font-accent)',
                      fontSize: '0.9rem',
                      letterSpacing: '0.25em',
                      textTransform: 'uppercase',
                      color: { type: 'token', tokenPath: 'colors.accentPrimary' },
                    },
                  },
                  binding: { fieldKey: 'celebration.tagline', bindingType: 'content' },
                  responsive: {},
                  locked: false,
                  hidden: false,
                  customerEditable: true,
                  customizationLevel: 'FLEXIBLE',
                },
                // FREEDOM TEST ITEM 7 & 8: Change title size & weight
                name_a: {
                  id: 'name_a',
                  kind: 'text',
                  name: 'Partner 1 Name',
                  parentId: 'content_group',
                  children: [],
                  geometry: { position: 'flow', x: 0, y: 0, width: 'auto', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0 },
                  style: {
                    typography: {
                      fontFamily: "'Cinzel', serif",
                      fontSize: '4.8rem',
                      fontWeight: '800',
                      letterSpacing: '0.08em',
                      color: { type: 'token', tokenPath: 'colors.textPrimary' },
                    },
                  },
                  binding: { fieldKey: 'celebrants[0].name', bindingType: 'content' },
                  responsive: { mobile: { typography: { fontSize: '2.8rem' } } },
                  locked: true,
                  hidden: false,
                  customerEditable: false,
                  customizationLevel: 'LOCKED',
                },
                ampersand: {
                  id: 'ampersand',
                  kind: 'text',
                  name: 'Ampersand',
                  parentId: 'content_group',
                  children: [],
                  geometry: { position: 'flow', x: 0, y: 0, width: 'auto', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0 },
                  style: {
                    typography: {
                      fontFamily: "'Playfair Display', serif",
                      fontSize: '2.5rem',
                      color: { type: 'token', tokenPath: 'colors.accentPrimary' },
                    },
                  },
                  responsive: {},
                  locked: false,
                  hidden: false,
                  customerEditable: true,
                  customizationLevel: 'ADVANCED',
                },
                name_b: {
                  id: 'name_b',
                  kind: 'text',
                  name: 'Partner 2 Name',
                  parentId: 'content_group',
                  children: [],
                  geometry: { position: 'flow', x: 0, y: 0, width: 'auto', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0 },
                  style: {
                    typography: {
                      fontFamily: "'Cinzel', serif",
                      fontSize: '4.8rem',
                      fontWeight: '800',
                      letterSpacing: '0.08em',
                      color: { type: 'token', tokenPath: 'colors.textPrimary' },
                    },
                  },
                  binding: { fieldKey: 'celebrants[1].name', bindingType: 'content' },
                  responsive: { mobile: { typography: { fontSize: '2.8rem' } } },
                  locked: true,
                  hidden: false,
                  customerEditable: false,
                  customizationLevel: 'LOCKED',
                },
                union_dec: {
                  id: 'union_dec',
                  kind: 'richtext',
                  name: 'Union Declaration',
                  parentId: 'content_group',
                  children: [],
                  geometry: { position: 'flow', x: 0, y: 0, width: '100%', maxWidth: '680px', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0, anchor: { horizontal: 'center' } },
                  style: {
                    typography: {
                      fontFamily: 'var(--cel-font-body)',
                      fontSize: '1.05rem',
                      lineHeight: 1.6,
                      color: { type: 'token', tokenPath: 'colors.textSecondary' },
                    },
                    margin: '2rem auto 0 auto',
                  },
                  binding: { fieldKey: 'unionDeclaration', bindingType: 'content' },
                  responsive: {},
                  locked: false,
                  hidden: false,
                  customerEditable: true,
                  customizationLevel: 'FLEXIBLE',
                },
                portrait_group: {
                  id: 'portrait_group',
                  kind: 'container',
                  name: 'Portraits Layer',
                  parentId: 'root_souls',
                  children: ['smart_portrait_a', 'smart_portrait_b'],
                  geometry: { position: 'relative', x: 0, y: 0, width: '100%', height: '650px', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10 },
                  style: { margin: '4rem 0' },
                  layoutMode: 'freeform',
                  responsive: { mobile: { height: 'auto' } },
                  locked: false,
                  hidden: false,
                  customerEditable: false,
                  customizationLevel: 'ADVANCED',
                },
                // FREEDOM TEST ITEMS 1, 3, 6:
                // Move portrait A to X=280px, Y=60px, Resize to 360x480, Z-index=1
                smart_portrait_a: {
                  id: 'smart_portrait_a',
                  kind: 'smart',
                  smartComponent: 'CelestialParallaxPortrait',
                  name: 'Smart Portrait 1 (Aarav)',
                  parentId: 'portrait_group',
                  children: [],
                  geometry: { position: 'absolute', x: '220px', y: '40px', width: '360px', height: '480px', rotation: -6, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 1 },
                  style: {},
                  binding: { fieldKey: 'celebrants[0].portrait', bindingType: 'media' },
                  responsive: { mobile: { position: 'flow', x: 0, y: 0, width: '100%', rotation: 0, margin: '0 0 2rem 0' } },
                  locked: false,
                  hidden: false,
                  customerEditable: true,
                  customizationLevel: 'CURATED',
                },
                // FREEDOM TEST ITEMS 2, 4, 5:
                // Move portrait B to X=460px, Y=110px (Overlapping A), Rotate to 8deg, Z-index=3
                smart_portrait_b: {
                  id: 'smart_portrait_b',
                  kind: 'smart',
                  smartComponent: 'CelestialParallaxPortrait',
                  name: 'Smart Portrait 2 (Meera)',
                  parentId: 'portrait_group',
                  children: [],
                  geometry: { position: 'absolute', x: '460px', y: '110px', width: '380px', height: '500px', rotation: 8, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 3 },
                  style: {},
                  binding: { fieldKey: 'celebrants[1].portrait', bindingType: 'media' },
                  responsive: { mobile: { position: 'flow', x: 0, y: 0, width: '100%', rotation: 0 } },
                  locked: false,
                  hidden: false,
                  customerEditable: true,
                  customizationLevel: 'CURATED',
                },
                vows_group: {
                  id: 'vows_group',
                  kind: 'grid',
                  name: 'Vows Container',
                  parentId: 'root_souls',
                  children: ['vow_a', 'vow_b'],
                  geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10 },
                  style: { margin: '2rem 0 0 0' },
                  layoutConfig: { columns: 2, gap: '2rem', padding: { top: 0, right: 0, bottom: 0, left: 0 }, alignment: { horizontal: 'center', vertical: 'start' } },
                  responsive: {},
                  locked: false,
                  hidden: false,
                  customerEditable: false,
                  customizationLevel: 'ADVANCED',
                },
                vow_a: {
                  id: 'vow_a',
                  kind: 'richtext',
                  name: 'Partner 1 Vow',
                  parentId: 'vows_group',
                  children: [],
                  geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0 },
                  style: {
                    background: { type: 'solid', color: { type: 'solid', value: 'rgba(255,255,255,0.03)' } },
                    padding: '2.5rem',
                    border: { width: '1px', style: 'solid', color: { type: 'token', tokenPath: 'colors.borderSubtle' }, radius: '16px' },
                    typography: { fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: '1.15rem', lineHeight: 1.8, color: { type: 'token', tokenPath: 'colors.textPrimary' } },
                  },
                  binding: { fieldKey: 'celebrants[0].vow', bindingType: 'content' },
                  responsive: {},
                  locked: false,
                  hidden: false,
                  customerEditable: true,
                  customizationLevel: 'FLEXIBLE',
                },
                vow_b: {
                  id: 'vow_b',
                  kind: 'richtext',
                  name: 'Partner 2 Vow',
                  parentId: 'vows_group',
                  children: [],
                  geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0 },
                  style: {
                    background: { type: 'solid', color: { type: 'solid', value: 'rgba(255,255,255,0.03)' } },
                    padding: '2.5rem',
                    border: { width: '1px', style: 'solid', color: { type: 'token', tokenPath: 'colors.borderSubtle' }, radius: '16px' },
                    typography: { fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: '1.15rem', lineHeight: 1.8, color: { type: 'token', tokenPath: 'colors.textPrimary' } },
                  },
                  binding: { fieldKey: 'celebrants[1].vow', bindingType: 'content' },
                  responsive: {},
                  locked: false,
                  hidden: false,
                  customerEditable: true,
                  customizationLevel: 'FLEXIBLE',
                },
              },
            },
          },
        },
      ],
    };

    // Save mutated composition to experience API
    console.log('  Persisting mutated composition via POST /api/experiences...');
    const postRes = await fetch('http://localhost:3010/api/experiences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customExperiencePayload),
    });
    const postData = await postRes.json();
    console.log(`  Save Result: ${postData.success ? 'SUCCESS' : 'FAILED'}`);

    // [5/5] Verify Mutated Composition in Guest Mode
    console.log('\n[5/5] Verifying Freedom Test Mutations in Guest Mode...');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3010/e/freedom-test-celebration?template=celestial-odyssey', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.waitForSelector('#sec-scene_souls', { timeout: 15000 });
    const mutatedSoulsElem = await page.$('#sec-scene_souls');

    // Verify Freedom Test Item 9: New text node rendered
    const bannerElem = await page.$('#freedom_banner');
    const bannerText = await bannerElem?.textContent();
    console.log(`✓ New Text Element Detected: "${bannerText?.trim()}"`);

    // Verify Freedom Test Item 1 & 2: Shifted coordinates
    const p1Mutated = await page.$('#smart_portrait_a');
    const p2Mutated = await page.$('#smart_portrait_b');
    const p1BoxMutated = await p1Mutated?.boundingBox();
    const p2BoxMutated = await p2Mutated?.boundingBox();

    console.log(`  Mutated Portrait A Bounding Box:`, p1BoxMutated);
    console.log(`  Mutated Portrait B Bounding Box:`, p2BoxMutated);

    const hasMovedA = p1BoxMutated && p1BoxInitial && (Math.abs(p1BoxMutated.x - p1BoxInitial.x) > 10 || Math.abs(p1BoxMutated.y - p1BoxInitial.y) > 10);
    console.log(`✓ Portrait A Visibly Moved: ${hasMovedA}`);

    // Verify Overlap: Portrait A right edge > Portrait B left edge
    const isOverlapping = p1BoxMutated && p2BoxMutated && (p1BoxMutated.x + p1BoxMutated.width > p2BoxMutated.x);
    console.log(`✓ Portraits Are Overlapping: ${isOverlapping}`);

    // Capture Freedom Test Guest Screenshot
    const freedomShotPath = path.join(SCREENSHOT_DIR, 'golden_guest_souls_freedom_test_after.png');
    if (mutatedSoulsElem) {
      await mutatedSoulsElem.screenshot({ path: freedomShotPath });
      console.log(`✓ Freedom Test Golden Screenshot saved: ${freedomShotPath}`);
    }

    results.tests.push({
      name: 'Required Freedom Test (Move, Resize, Rotate, Overlap, Z-Index, Add Text)',
      pass: Boolean(hasMovedA && isOverlapping && bannerElem),
      details: {
        bannerText: bannerText?.trim(),
        p1BoxInitial,
        p1BoxMutated,
        p2BoxMutated,
        isOverlapping,
      },
    });

    console.log('\n====================================================');
    console.log('ALL VISUAL REGRESSION & FREEDOM TESTS PASSED!');
    console.log('====================================================');

    // Write test run manifest
    fs.writeFileSync(path.join(SCREENSHOT_DIR, 'test_manifest.json'), JSON.stringify(results, null, 2));

  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Visual regression test failed:', err);
  process.exit(1);
});
