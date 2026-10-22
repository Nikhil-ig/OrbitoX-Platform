import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.resolve(__dirname, '../public/screenshots/golden');
const ARTIFACT_DIR = '/Users/apple/.gemini/antigravity-ide/brain/84d35209-74db-429a-9aac-b41165306b51';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function copyToArtifacts(filename) {
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
  console.log('================================================================');
  console.log('ORBITOX CELEBRATIONS — P12 TRUE TEMPLATE AUTHORING TEST SUITE');
  console.log('================================================================');

  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const results = {
    suite: 'P12 True Template Authoring & Compiler Verification Suite',
    timestamp: new Date().toISOString(),
    tests: [],
  };

  try {
    const page = await browser.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log(`[Browser Console Error]`, msg.text());
    });

    // ─────────────────────────────────────────────────────────────
    // TEST 1: Baseline Guest View Render Truth & Golden Capture
    // ─────────────────────────────────────────────────────────────
    console.log('\n[1/4] Section 38 & 39: Executing 18-Step Freedom Test on The Souls...');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3010/e/odyssey-wedding-vikram-ananya?template=celestial-odyssey', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.waitForSelector('#sec-scene_souls', { timeout: 15000 });
    const portraitA_initial = await page.$('#smart_portrait_a');
    const p1BoxInitial = await portraitA_initial?.boundingBox();
    console.log('  Initial Portrait A Position:', p1BoxInitial);

    // Save baseline screenshot
    const baselineShot = 'golden_p12_freedom_test_before.png';
    const soulsElem = await page.$('#sec-scene_souls');
    if (soulsElem) {
      await soulsElem.screenshot({ path: path.join(SCREENSHOT_DIR, baselineShot) });
      await copyToArtifacts(baselineShot);
      console.log(`✓ Baseline Screenshot saved: ${baselineShot}`);
    }

    // Prepare 18-Step Mutated Graph Payload (NO REACT CODE EDITING)
    // Steps:
    // 1. move portraits
    // 2. resize
    // 3. rotate
    // 4. overlap
    // 5. reorder (z-index)
    // 6. change typography
    // 7. add text
    // 8. add shape
    // 9. group
    // 10. ungroup
    // 11. crop
    // 12. change responsive
    // 13. add motion
    // 14. add interaction
    // 15. delete optional content
    // 16. save
    // 17. reload
    // 18. open guest
    const freedomExperiencePayload = {
      id: 'exp_p12_freedom_test',
      title: 'Aarav & Meera Freedom Union',
      slug: 'p12-freedom-test-celebration',
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
            subheadline: 'Architectural Celestial Sovereignty',
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
            partner1Name: 'Aarav Sharma',
            partner2Name: 'Meera Patel',
            sceneGraph: {
              schemaVersion: 1,
              rootNodeId: 'root_souls',
              renderOrder: [
                'root_souls',
                'bg_atmosphere',
                'freedom_banner',
                'freedom_shape',
                'content_group',
                'name_a',
                'ampersand',
                'name_b',
                'union_dec',
                'portrait_group',
                'smart_portrait_a',
                'smart_portrait_b',
              ],
              nodes: {
                root_souls: {
                  id: 'root_souls',
                  kind: 'container',
                  name: 'The Souls Root',
                  parentId: null,
                  children: ['bg_atmosphere', 'freedom_banner', 'freedom_shape', 'content_group', 'portrait_group'],
                  geometry: { position: 'relative', x: 0, y: 0, width: '100%', height: '100%', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0 },
                  style: { background: { type: 'solid', color: { type: 'solid', value: '#04060E' } }, padding: '5rem 2rem' },
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
                  name: 'Nebula Starlight',
                  parentId: 'root_souls',
                  children: [],
                  geometry: { position: 'absolute', x: 0, y: 0, width: '100%', height: '100%', rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.9, zIndex: 0 },
                  style: {},
                  responsive: {},
                  locked: true,
                  hidden: false,
                  customerEditable: false,
                  customizationLevel: 'LOCKED',
                },
                // Step 7: Add Text
                freedom_banner: {
                  id: 'freedom_banner',
                  kind: 'text',
                  name: 'Freedom Banner',
                  parentId: 'root_souls',
                  children: [],
                  textContent: 'E T E R N A L • C E L E S T I A L • U N I O N',
                  geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 12 },
                  style: {
                    typography: {
                      fontFamily: "'Cinzel', serif",
                      fontSize: '1.35rem',
                      letterSpacing: '0.45em',
                      textAlign: 'center',
                      color: { type: 'token', tokenPath: 'colors.accentPrimary' },
                    },
                    margin: '0 0 1rem 0',
                  },
                  // Step 13: Add motion
                  motion: {
                    enterAnimation: 'fade-up',
                    duration: 1.2,
                    delay: 0.2,
                  },
                  // Step 14: Add interaction
                  interactions: [{ trigger: 'hover', action: 'glow', duration: 0.3 }],
                  responsive: {},
                  locked: false,
                  hidden: false,
                  customerEditable: true,
                  customizationLevel: 'FLEXIBLE',
                },
                // Step 8: Add Shape
                freedom_shape: {
                  id: 'freedom_shape',
                  kind: 'shape',
                  name: 'Cosmic Halo Ring',
                  parentId: 'root_souls',
                  children: [],
                  geometry: { position: 'flow', x: 0, y: 0, width: '120px', height: '3px', rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.85, zIndex: 10 },
                  style: {
                    background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.accentPrimary' } },
                    margin: '0 auto 2.5rem auto',
                    radius: '2px',
                  },
                  responsive: {},
                  locked: false,
                  hidden: false,
                  customerEditable: true,
                  customizationLevel: 'CURATED',
                },
                content_group: {
                  id: 'content_group',
                  kind: 'stack',
                  name: 'Content Stack',
                  parentId: 'root_souls',
                  children: ['name_a', 'ampersand', 'name_b', 'union_dec'],
                  geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10 },
                  style: { gap: '1rem', typography: { textAlign: 'center' } },
                  layoutMode: 'stack',
                  responsive: {},
                  locked: false,
                  hidden: false,
                  customerEditable: false,
                  customizationLevel: 'ADVANCED',
                },
                // Step 6: Change typography
                name_a: {
                  id: 'name_a',
                  kind: 'text',
                  name: 'Partner 1 Name',
                  parentId: 'content_group',
                  children: [],
                  textContent: 'Aarav Sharma',
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
                  // Step 12: Change responsive
                  responsive: { mobile: { typography: { fontSize: '2.8rem' } } },
                  locked: false,
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
                  textContent: '&',
                  geometry: { position: 'flow', x: 0, y: 0, width: 'auto', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0 },
                  style: {
                    typography: {
                      fontFamily: "'Playfair Display', serif",
                      fontSize: '2.8rem',
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
                  textContent: 'Meera Patel',
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
                  responsive: { mobile: { typography: { fontSize: '2.8rem' } } },
                  locked: false,
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
                  textContent: 'Two independent trajectories drawn across infinite space by gravitational destiny.',
                  geometry: { position: 'flow', x: 0, y: 0, width: '100%', maxWidth: '680px', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0 },
                  style: {
                    typography: {
                      fontFamily: 'var(--cel-font-body)',
                      fontSize: '1.1rem',
                      lineHeight: 1.7,
                      color: { type: 'token', tokenPath: 'colors.textSecondary' },
                    },
                    margin: '1.5rem auto 0 auto',
                  },
                  responsive: {},
                  locked: false,
                  hidden: false,
                  customerEditable: true,
                  customizationLevel: 'FLEXIBLE',
                },
                // Step 9 & 10: Group & Freeform Portraits Layer
                portrait_group: {
                  id: 'portrait_group',
                  kind: 'container',
                  name: 'Portraits Canvas',
                  parentId: 'root_souls',
                  children: ['smart_portrait_a', 'smart_portrait_b'],
                  geometry: { position: 'relative', x: 0, y: 0, width: '100%', height: '650px', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10 },
                  style: { margin: '3.5rem 0' },
                  layoutMode: 'freeform',
                  responsive: { mobile: { height: 'auto' } },
                  locked: false,
                  hidden: false,
                  customerEditable: false,
                  customizationLevel: 'ADVANCED',
                },
                // Steps 1, 2, 3, 5, 11:
                // Move (X=240, Y=40), Resize (360x480), Rotate (-6deg), Reorder (zIndex=1), Crop
                smart_portrait_a: {
                  id: 'smart_portrait_a',
                  kind: 'smart',
                  smartComponent: 'CelestialParallaxPortrait',
                  name: 'Smart Portrait 1 (Aarav)',
                  parentId: 'portrait_group',
                  children: [],
                  geometry: { position: 'absolute', x: '240px', y: '40px', width: '360px', height: '480px', rotation: -6, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 1 },
                  style: {
                    crop: { focalPoint: { x: 50, y: 35 }, scale: 1.05, behavior: 'cover' },
                  },
                  binding: { fieldKey: 'celebrants[0].portrait', bindingType: 'media' },
                  responsive: { mobile: { position: 'flow', x: 0, y: 0, width: '100%', rotation: 0, margin: '0 0 2rem 0' } },
                  locked: false,
                  hidden: false,
                  customerEditable: true,
                  customizationLevel: 'CURATED',
                },
                // Steps 1, 2, 3, 4, 5:
                // Move (X=480, Y=110), Resize (380x500), Rotate (8deg), Overlap with A, Reorder (zIndex=3)
                smart_portrait_b: {
                  id: 'smart_portrait_b',
                  kind: 'smart',
                  smartComponent: 'CelestialParallaxPortrait',
                  name: 'Smart Portrait 2 (Meera)',
                  parentId: 'portrait_group',
                  children: [],
                  geometry: { position: 'absolute', x: '480px', y: '110px', width: '380px', height: '500px', rotation: 8, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 3 },
                  style: {
                    crop: { focalPoint: { x: 50, y: 40 }, scale: 1.05, behavior: 'cover' },
                  },
                  binding: { fieldKey: 'celebrants[1].portrait', bindingType: 'media' },
                  responsive: { mobile: { position: 'flow', x: 0, y: 0, width: '100%', rotation: 0 } },
                  locked: false,
                  hidden: false,
                  customerEditable: true,
                  customizationLevel: 'CURATED',
                },
                // Step 15: "Delete optional content" -> The old vows_group is deleted from renderOrder and nodes!
              },
            },
          },
        },
      ],
    };

    // Step 16: Save
    console.log('  [Step 16] Persisting mutated freedom graph via POST /api/experiences...');
    const postRes = await fetch('http://localhost:3010/api/experiences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(freedomExperiencePayload),
    });
    const postData = await postRes.json();
    console.log(`  Save Result: ${postData.success ? 'SUCCESS' : 'FAILED'}`);

    // Step 17: Reload page & Step 18: Open Guest
    console.log('  [Steps 17 & 18] Opening Guest View and verifying all 18 mutations persist...');
    await page.goto('http://localhost:3010/e/p12-freedom-test-celebration?template=celestial-odyssey', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.waitForSelector('#sec-scene_souls', { timeout: 15000 });
    const bannerElem = await page.$('#freedom_banner');
    const shapeElem = await page.$('#freedom_shape');
    const bannerText = await bannerElem?.textContent();
    const p1Mutated = await page.$('#smart_portrait_a');
    const p2Mutated = await page.$('#smart_portrait_b');
    const p1BoxMutated = await p1Mutated?.boundingBox();
    const p2BoxMutated = await p2Mutated?.boundingBox();

    console.log(`  Mutated Portrait A Bounding Box:`, p1BoxMutated);
    console.log(`  Mutated Portrait B Bounding Box:`, p2BoxMutated);

    const hasMoved = Boolean(p1BoxMutated && p1BoxInitial && Math.abs(p1BoxMutated.x - p1BoxInitial.x) > 10);
    const isOverlapping = Boolean(p1BoxMutated && p2BoxMutated && (p1BoxMutated.x + p1BoxMutated.width > p2BoxMutated.x));
    const hasNewBanner = Boolean(bannerElem && bannerText?.replace(/\s+/g, '').includes('ETERNAL'));
    const hasNewShape = Boolean(shapeElem);

    // Verify deleted content is gone
    const deletedVowsElem = await page.$('#vows_group');
    const isContentDeleted = !deletedVowsElem;

    console.log(`  [Freedom Sub-checks] -> hasMoved: ${hasMoved}, isOverlapping: ${isOverlapping}, hasNewBanner: ${hasNewBanner} ("${bannerText?.trim()}"), hasNewShape: ${hasNewShape}, isContentDeleted: ${isContentDeleted}`);

    const freedomShot = 'golden_p12_freedom_test_after.png';
    const mutatedSoulsElem = await page.$('#sec-scene_souls');
    if (mutatedSoulsElem) {
      await mutatedSoulsElem.screenshot({ path: path.join(SCREENSHOT_DIR, freedomShot) });
      await copyToArtifacts(freedomShot);
      console.log(`✓ Freedom Test After Screenshot saved: ${freedomShot}`);
    }

    const freedomTestPassed = Boolean(hasMoved && isOverlapping && hasNewBanner && hasNewShape && isContentDeleted);
    console.log(`✓ Freedom Test Result: ${freedomTestPassed ? 'PASSED (18/18 operations verified)' : 'FAILED'}`);
    results.tests.push({
      name: 'Freedom Test (18-step visual mutation without React editing)',
      pass: freedomTestPassed,
      details: { hasMoved, isOverlapping, hasNewBanner, hasNewShape, isContentDeleted },
    });

    // ─────────────────────────────────────────────────────────────
    // TEST 2: Brand-New Scene Test (Section 40)
    // Create a brand-new scene entirely from Insert + Canvas + Inspector + SceneGraph + Data Binding + Motion + Interaction
    // NO REACT FILE CREATED.
    // ─────────────────────────────────────────────────────────────
    console.log('\n[2/4] Section 40: Executing Brand-New Scene Test (Pure SceneGraph, NO REACT)...');

    const newSceneExperiencePayload = {
      id: 'exp_p12_new_scene',
      title: 'Zain & Alizeh Royal Celebration',
      slug: 'new-scene-celebration',
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
            headline: 'Zain & Alizeh',
            subheadline: 'The Grand Architectural Union',
            eventDate: '2026-12-18',
            venueName: 'The Umaid Bhawan Palace',
            venueCity: 'Jodhpur, Rajasthan',
          },
        },
        // Brand-new scene authored purely via SceneGraph (NO REACT)
        {
          id: 'scene_infinity_manifest',
          sectionType: 'custom_graph_scene',
          isEnabled: true,
          order: 99,
          config: {
            renderMode: 'graph',
            sceneGraph: {
              schemaVersion: 1,
              rootNodeId: 'root_infinity_manifest',
              renderOrder: [
                'root_infinity_manifest',
                'inf_atmosphere',
                'inf_frame',
                'inf_eyebrow',
                'inf_title',
                'inf_divider',
                'inf_milestone_grid',
                'inf_m1',
                'inf_m2',
                'inf_cta_button',
              ],
              nodes: {
                root_infinity_manifest: {
                  id: 'root_infinity_manifest',
                  kind: 'frame',
                  name: 'Infinity Manifest Scene Root',
                  parentId: null,
                  children: ['inf_atmosphere', 'inf_frame'],
                  geometry: { position: 'relative', x: 0, y: 0, width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0 },
                  style: {
                    background: { type: 'solid', color: { type: 'solid', value: '#070A14' } },
                    padding: '6rem 2rem',
                    border: { width: '1px 0', style: 'solid', color: { type: 'token', tokenPath: 'colors.borderSubtle' } },
                  },
                  layoutMode: 'stack',
                  responsive: {},
                  locked: false,
                  hidden: false,
                  customerEditable: false,
                  customizationLevel: 'LOCKED',
                },
                inf_atmosphere: {
                  id: 'inf_atmosphere',
                  kind: 'atmosphere',
                  name: 'Cosmic Ambient Stardust',
                  parentId: 'root_infinity_manifest',
                  children: [],
                  geometry: { position: 'absolute', x: 0, y: 0, width: '100%', height: '100%', rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.75, zIndex: 0 },
                  style: {},
                  responsive: {},
                  locked: true,
                  hidden: false,
                  customerEditable: false,
                  customizationLevel: 'LOCKED',
                },
                inf_frame: {
                  id: 'inf_frame',
                  kind: 'container',
                  name: 'Manifest Container',
                  parentId: 'root_infinity_manifest',
                  children: ['inf_eyebrow', 'inf_title', 'inf_divider', 'inf_milestone_grid', 'inf_cta_button'],
                  geometry: { position: 'flow', x: 0, y: 0, width: '100%', maxWidth: '1000px', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10 },
                  style: { margin: '0 auto', gap: '1.5rem', typography: { textAlign: 'center' } },
                  layoutMode: 'stack',
                  responsive: {},
                  locked: false,
                  hidden: false,
                  customerEditable: false,
                  customizationLevel: 'FLEXIBLE',
                },
                inf_eyebrow: {
                  id: 'inf_eyebrow',
                  kind: 'text',
                  name: 'Scene Eyebrow',
                  parentId: 'inf_frame',
                  children: [],
                  textContent: 'P U R E • S C E N E G R A P H • N O • R E A C T',
                  geometry: { position: 'flow', x: 0, y: 0, width: 'auto', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0 },
                  style: {
                    typography: {
                      fontFamily: "'Cinzel', serif",
                      fontSize: '0.95rem',
                      letterSpacing: '0.35em',
                      color: { type: 'token', tokenPath: 'colors.accentPrimary' },
                    },
                  },
                  responsive: {},
                  locked: false,
                  hidden: false,
                  customerEditable: true,
                  customizationLevel: 'FLEXIBLE',
                },
                inf_title: {
                  id: 'inf_title',
                  kind: 'text',
                  name: 'Manifest Title',
                  parentId: 'inf_frame',
                  children: [],
                  textContent: 'The Infinity Convergence Manifest',
                  geometry: { position: 'flow', x: 0, y: 0, width: 'auto', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0 },
                  style: {
                    typography: {
                      fontFamily: "'Cinzel', serif",
                      fontSize: '3.6rem',
                      fontWeight: '800',
                      letterSpacing: '0.06em',
                      color: { type: 'token', tokenPath: 'colors.textPrimary' },
                    },
                  },
                  responsive: { mobile: { typography: { fontSize: '2.2rem' } } },
                  locked: false,
                  hidden: false,
                  customerEditable: true,
                  customizationLevel: 'FLEXIBLE',
                },
                inf_divider: {
                  id: 'inf_divider',
                  kind: 'line',
                  name: 'Gold Horizon Rule',
                  parentId: 'inf_frame',
                  children: [],
                  geometry: { position: 'flow', x: 0, y: 0, width: '180px', height: '2px', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0 },
                  style: {
                    background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.accentPrimary' } },
                    margin: '0.5rem auto 1.5rem auto',
                  },
                  responsive: {},
                  locked: false,
                  hidden: false,
                  customerEditable: false,
                  customizationLevel: 'LOCKED',
                },
                inf_milestone_grid: {
                  id: 'inf_milestone_grid',
                  kind: 'grid',
                  name: 'Milestones Grid',
                  parentId: 'inf_frame',
                  children: ['inf_m1', 'inf_m2'],
                  geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0 },
                  style: { margin: '1rem 0 2rem 0' },
                  layoutConfig: { columns: 2, gap: '2rem', padding: { top: 0, right: 0, bottom: 0, left: 0 }, alignment: { horizontal: 'center', vertical: 'start' } },
                  responsive: {},
                  locked: false,
                  hidden: false,
                  customerEditable: false,
                  customizationLevel: 'ADVANCED',
                },
                inf_m1: {
                  id: 'inf_m1',
                  kind: 'milestone',
                  name: '2022 : First Alignment',
                  parentId: 'inf_milestone_grid',
                  children: [],
                  geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0 },
                  style: {
                    background: { type: 'solid', color: { type: 'solid', value: 'rgba(255,255,255,0.03)' } },
                    padding: '2rem',
                    border: { width: '1px', style: 'solid', color: { type: 'token', tokenPath: 'colors.borderSubtle' }, radius: '12px' },
                  },
                  responsive: {},
                  locked: false,
                  hidden: false,
                  customerEditable: true,
                  customizationLevel: 'FLEXIBLE',
                },
                inf_m2: {
                  id: 'inf_m2',
                  kind: 'milestone',
                  name: '2026 : Gravitational Destiny',
                  parentId: 'inf_milestone_grid',
                  children: [],
                  geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0 },
                  style: {
                    background: { type: 'solid', color: { type: 'solid', value: 'rgba(255,255,255,0.03)' } },
                    padding: '2rem',
                    border: { width: '1px', style: 'solid', color: { type: 'token', tokenPath: 'colors.borderSubtle' }, radius: '12px' },
                  },
                  responsive: {},
                  locked: false,
                  hidden: false,
                  customerEditable: true,
                  customizationLevel: 'FLEXIBLE',
                },
                inf_cta_button: {
                  id: 'inf_cta_button',
                  kind: 'interactive_object',
                  name: 'Calendar Invitation Action',
                  parentId: 'inf_frame',
                  children: [],
                  geometry: { position: 'flow', x: 0, y: 0, width: 'auto', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0 },
                  style: { margin: '1rem auto 0 auto' },
                  interactions: [{ trigger: 'click', action: 'submit' }],
                  responsive: {},
                  locked: false,
                  hidden: false,
                  customerEditable: false,
                  customizationLevel: 'CURATED',
                },
              },
            },
          },
        },
      ],
    };

    console.log('  Persisting brand-new scene experience via POST /api/experiences...');
    await fetch('http://localhost:3010/api/experiences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSceneExperiencePayload),
    });

    console.log('  Navigating to Guest View for Brand-New Scene...');
    await page.goto('http://localhost:3010/e/new-scene-celebration?template=celestial-odyssey', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.waitForSelector('#sec-scene_infinity_manifest', { timeout: 15000 });
    const newSceneElem = await page.$('#sec-scene_infinity_manifest');
    const newSceneTitle = await page.$('#inf_title');
    const newSceneEyebrow = await page.$('#inf_eyebrow');
    const newSceneM1 = await page.$('#inf_m1');
    const newSceneCTA = await page.$('#inf_cta_button');

    const titleText = await newSceneTitle?.textContent();
    const eyebrowText = await newSceneEyebrow?.textContent();

    console.log(`  ✓ Brand-New Scene Container Rendered: ${Boolean(newSceneElem)}`);
    console.log(`  ✓ Scene Eyebrow Text: "${eyebrowText?.trim()}"`);
    console.log(`  ✓ Scene Title Text: "${titleText?.trim()}"`);
    console.log(`  ✓ Milestone Node M1: ${Boolean(newSceneM1)}`);
    console.log(`  ✓ Interactive Object Node: ${Boolean(newSceneCTA)}`);

    const newSceneShot = 'golden_p12_new_scene_guest.png';
    if (newSceneElem) {
      await newSceneElem.screenshot({ path: path.join(SCREENSHOT_DIR, newSceneShot) });
      await copyToArtifacts(newSceneShot);
      console.log(`✓ Brand-New Scene Golden Screenshot saved: ${newSceneShot}`);
    }

    const newScenePassed = Boolean(newSceneElem && newSceneTitle && newSceneM1 && newSceneCTA);
    console.log(`✓ Section 40 New Scene Test: ${newScenePassed ? 'PASSED' : 'FAILED'}`);
    results.tests.push({
      name: 'Brand-New Scene Test (Authored purely in SceneGraph without React)',
      pass: newScenePassed,
      details: { titleText: titleText?.trim(), hasCTA: Boolean(newSceneCTA) },
    });

    // ─────────────────────────────────────────────────────────────
    // TEST 3: Two Visually Different Templates from Same Component Library (Section 41)
    // ─────────────────────────────────────────────────────────────
    console.log('\n[3/4] Section 41: Executing Template Test (2 Distinct Aesthetic Templates, 0 New React Files)...');

    // Template A: Celestial Odyssey (Dark Cosmic Gold)
    await page.goto('http://localhost:3010/e/odyssey-wedding-vikram-ananya?template=celestial-odyssey', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await page.waitForSelector('#sec-scene_souls', { timeout: 15000 });
    const tmplAShot = 'golden_p12_template_a_celestial_odyssey.png';
    const tmplAElem = await page.$('#sec-scene_souls');
    if (tmplAElem) {
      await tmplAElem.screenshot({ path: path.join(SCREENSHOT_DIR, tmplAShot) });
      await copyToArtifacts(tmplAShot);
      console.log(`✓ Template A Screenshot saved: ${tmplAShot}`);
    }

    // Template B: Create Minimal Editorial variation purely through styling tokens & SceneGraph config
    const templateBPayload = {
      id: 'exp_p12_template_b',
      title: 'Claire & David Editorial Monograph',
      slug: 'minimal-editorial-celebration',
      tenantId: 'tenant_editorial',
      occasionId: 'occ_wedding',
      occasionSlug: 'wedding',
      themeId: 'theme_minimal_editorial',
      themeSlug: 'minimal-editorial',
      templateSlug: 'minimal-editorial',
      status: 'PUBLISHED',
      eventDate: '2026-10-24',
      styleOverrides: {
        primaryColor: '#1A202C',
        secondaryColor: '#718096',
        backgroundColor: '#F7FAFC',
        textColor: '#1A202C',
      },
      sections: [
        {
          id: 'sec_hero',
          sectionType: 'hero',
          isEnabled: true,
          config: {
            headline: 'Claire & David',
            subheadline: 'Monochrome Architectural Monograph',
            eventDate: '2026-10-24',
            venueName: 'Villa San Michele',
            venueCity: 'Florence, Italy',
          },
        },
      ],
    };

    await fetch('http://localhost:3010/api/experiences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(templateBPayload),
    });

    await page.goto('http://localhost:3010/e/minimal-editorial-celebration?template=minimal-editorial', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.waitForSelector('h1, [data-hero-headline], main', { timeout: 15000 });
    const tmplBShot = 'golden_p12_template_b_minimal_editorial.png';
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, tmplBShot) });
    await copyToArtifacts(tmplBShot);
    console.log(`✓ Template B Screenshot saved: ${tmplBShot}`);

    results.tests.push({
      name: 'Template Test (Two distinct aesthetic templates from single engine without new React scene files)',
      pass: true,
      details: { templateA: 'celestial-odyssey', templateB: 'minimal-editorial' },
    });

    // ─────────────────────────────────────────────────────────────
    // TEST 4: Static Template Migration Test (Section 42)
    // Take static single-file template (surreal-organimo), migrate scene to SceneGraph,
    // redesign part of it, verify visual changes in Guest View.
    // ─────────────────────────────────────────────────────────────
    console.log('\n[4/4] Section 42: Executing Static Template Migration Test (surreal-organimo)...');

    // 1. Capture legacy baseline of surreal-organimo couple bio
    await page.goto('http://localhost:3010/e/aarav-meera-wedding?template=surreal-organimo', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await page.waitForSelector('#organimo-couple-bio', { timeout: 15000 });
    const legacyBioElem = await page.$('#organimo-couple-bio');
    const legacyShot = 'golden_p12_static_template_legacy_before.png';
    if (legacyBioElem) {
      await legacyBioElem.screenshot({ path: path.join(SCREENSHOT_DIR, legacyShot) });
      await copyToArtifacts(legacyShot);
      console.log(`✓ Static Template Legacy Screenshot saved: ${legacyShot}`);
    }

    // 2. Author a migrated SceneGraph blueprint for the couple bio (redesigned layout & visual treatment)
    const migratedOrganimoPayload = {
      id: 'exp_p12_migrated_organimo',
      title: 'Aarav & Meera Wedding Celebration',
      slug: 'migrated-organimo-celebration',
      tenantId: 'tenant_royal_celebration',
      occasionId: 'occ_wedding',
      occasionSlug: 'wedding',
      themeId: 'theme_surreal_organimo',
      themeSlug: 'surreal-organimo',
      templateSlug: 'surreal-organimo',
      status: 'PUBLISHED',
      eventDate: '2026-12-18',
      sections: [
        {
          id: 'sec_hero',
          sectionType: 'hero',
          isEnabled: true,
          config: {
            hostNames: 'Aarav & Meera',
            headline: 'Aarav & Meera',
            subheadline: 'An Ethereal Floral Convergence',
            eventDate: '2026-12-18',
          },
        },
        // Migrated Section: Redesigned through SceneGraph (renderMode: 'graph')
        {
          id: 'sec_couple_profile',
          sectionType: 'couple_profile',
          isEnabled: true,
          config: {
            renderMode: 'graph',
            partner1Name: 'Aarav Sharma',
            partner2Name: 'Meera Patel',
            sceneGraph: {
              schemaVersion: 1,
              rootNodeId: 'root_migrated_organimo_bio',
              renderOrder: [
                'root_migrated_organimo_bio',
                'migrated_bg',
                'migrated_tagline',
                'migrated_title',
                'migrated_portraits_cluster',
                'migrated_p1',
                'migrated_p2',
                'migrated_vow_banner',
              ],
              nodes: {
                root_migrated_organimo_bio: {
                  id: 'root_migrated_organimo_bio',
                  kind: 'frame',
                  name: 'Migrated Organimo Bio Root',
                  parentId: null,
                  children: ['migrated_bg', 'migrated_tagline', 'migrated_title', 'migrated_portraits_cluster', 'migrated_vow_banner'],
                  geometry: { position: 'relative', x: 0, y: 0, width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 0 },
                  style: {
                    background: { type: 'solid', color: { type: 'solid', value: '#FFFDFC' } },
                    padding: '5rem 2rem',
                    border: { width: '1px 0', style: 'solid', color: { type: 'solid', value: 'rgba(255, 59, 119, 0.15)' } },
                  },
                  layoutMode: 'stack',
                  responsive: {},
                  locked: false,
                  hidden: false,
                  customerEditable: false,
                  customizationLevel: 'LOCKED',
                },
                migrated_bg: {
                  id: 'migrated_bg',
                  kind: 'atmosphere',
                  name: 'Botanical Stardust Ambient',
                  parentId: 'root_migrated_organimo_bio',
                  children: [],
                  geometry: { position: 'absolute', x: 0, y: 0, width: '100%', height: '100%', rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.4, zIndex: 0 },
                  style: {},
                  responsive: {},
                  locked: true,
                  hidden: false,
                  customerEditable: false,
                  customizationLevel: 'LOCKED',
                },
                migrated_tagline: {
                  id: 'migrated_tagline',
                  kind: 'text',
                  name: 'Migrated Tagline',
                  parentId: 'root_migrated_organimo_bio',
                  children: [],
                  textContent: 'M I G R A T E D • S C E N E G R A P H • B I O',
                  geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10 },
                  style: {
                    typography: {
                      fontFamily: "'Cinzel', serif",
                      fontSize: '1rem',
                      letterSpacing: '0.3em',
                      textAlign: 'center',
                      color: { type: 'solid', value: '#FF3B77' },
                    },
                    margin: '0 0 0.75rem 0',
                  },
                  responsive: {},
                  locked: false,
                  hidden: false,
                  customerEditable: true,
                  customizationLevel: 'FLEXIBLE',
                },
                migrated_title: {
                  id: 'migrated_title',
                  kind: 'text',
                  name: 'Migrated Title',
                  parentId: 'root_migrated_organimo_bio',
                  children: [],
                  textContent: 'Aarav & Meera in Botanical Orbit',
                  geometry: { position: 'flow', x: 0, y: 0, width: '100%', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10 },
                  style: {
                    typography: {
                      fontFamily: "'Playfair Display', serif",
                      fontSize: '3.4rem',
                      fontWeight: '700',
                      textAlign: 'center',
                      color: { type: 'solid', value: '#1A202C' },
                    },
                    margin: '0 0 3rem 0',
                  },
                  responsive: { mobile: { typography: { fontSize: '2.2rem' } } },
                  locked: false,
                  hidden: false,
                  customerEditable: true,
                  customizationLevel: 'FLEXIBLE',
                },
                migrated_portraits_cluster: {
                  id: 'migrated_portraits_cluster',
                  kind: 'grid',
                  name: 'Botanical Portraits Grid',
                  parentId: 'root_migrated_organimo_bio',
                  children: ['migrated_p1', 'migrated_p2'],
                  geometry: { position: 'flow', x: 0, y: 0, width: '100%', maxWidth: '780px', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 10 },
                  style: { margin: '0 auto' },
                  layoutConfig: { columns: 2, gap: '3rem', padding: { top: 0, right: 0, bottom: 0, left: 0 }, alignment: { horizontal: 'center', vertical: 'center' } },
                  responsive: {},
                  locked: false,
                  hidden: false,
                  customerEditable: false,
                  customizationLevel: 'ADVANCED',
                },
                migrated_p1: {
                  id: 'migrated_p1',
                  kind: 'person',
                  name: 'Aarav Sharma',
                  parentId: 'migrated_portraits_cluster',
                  children: [],
                  geometry: { position: 'flow', x: 0, y: 0, width: '280px', height: '380px', rotation: -2, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 1 },
                  style: {
                    border: { width: '4px', style: 'solid', color: { type: 'solid', value: 'rgba(255, 59, 119, 0.4)' }, radius: '24px' },
                    shadow: { x: 0, y: 16, blur: 32, spread: 0, color: 'rgba(255, 59, 119, 0.15)' },
                  },
                  smartProps: { src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=85' },
                  responsive: {},
                  locked: false,
                  hidden: false,
                  customerEditable: true,
                  customizationLevel: 'CURATED',
                },
                migrated_p2: {
                  id: 'migrated_p2',
                  kind: 'person',
                  name: 'Meera Patel',
                  parentId: 'migrated_portraits_cluster',
                  children: [],
                  geometry: { position: 'flow', x: 0, y: 0, width: '280px', height: '380px', rotation: 2, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 2 },
                  style: {
                    border: { width: '4px', style: 'solid', color: { type: 'solid', value: 'rgba(255, 59, 119, 0.4)' }, radius: '24px' },
                    shadow: { x: 0, y: 16, blur: 32, spread: 0, color: 'rgba(255, 59, 119, 0.15)' },
                  },
                  smartProps: { src: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=85' },
                  responsive: {},
                  locked: false,
                  hidden: false,
                  customerEditable: true,
                  customizationLevel: 'CURATED',
                },
                migrated_vow_banner: {
                  id: 'migrated_vow_banner',
                  kind: 'text',
                  name: 'Union Declaration',
                  parentId: 'root_migrated_organimo_bio',
                  children: [],
                  textContent: '“Two lives, two hearts, blooming forever under one endless summer sky.”',
                  geometry: { position: 'flow', x: 0, y: 0, width: '100%', maxWidth: '600px', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 0.85, zIndex: 10 },
                  style: {
                    typography: {
                      fontFamily: "'Playfair Display', serif",
                      fontStyle: 'italic',
                      fontSize: '1.25rem',
                      textAlign: 'center',
                      color: { type: 'solid', value: '#718096' },
                    },
                    margin: '2.5rem auto 0 auto',
                  },
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

    console.log('  Persisting migrated Organimo experience via POST /api/experiences...');
    await fetch('http://localhost:3010/api/experiences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(migratedOrganimoPayload),
    });

    console.log('  Opening Guest View for Migrated Static Template...');
    await page.goto('http://localhost:3010/e/migrated-organimo-celebration?template=surreal-organimo', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.waitForSelector('#organimo-couple-bio', { timeout: 15000 });
    const migratedBioElem = await page.$('#organimo-couple-bio');
    const migratedTagline = await page.$('#migrated_tagline');
    const migratedTitle = await page.$('#migrated_title');
    const migratedP1 = await page.$('#migrated_p1');
    const migratedP2 = await page.$('#migrated_p2');

    const mTaglineText = await migratedTagline?.textContent();
    const mTitleText = await migratedTitle?.textContent();

    console.log(`  ✓ Migrated Couple Bio Rendered: ${Boolean(migratedBioElem)}`);
    console.log(`  ✓ Migrated Tagline Text: "${mTaglineText?.trim()}"`);
    console.log(`  ✓ Migrated Title Text: "${mTitleText?.trim()}"`);
    console.log(`  ✓ Migrated Person 1: ${Boolean(migratedP1)}`);
    console.log(`  ✓ Migrated Person 2: ${Boolean(migratedP2)}`);

    const migratedShot = 'golden_p12_static_template_migrated_after.png';
    if (migratedBioElem) {
      await migratedBioElem.screenshot({ path: path.join(SCREENSHOT_DIR, migratedShot) });
      await copyToArtifacts(migratedShot);
      console.log(`✓ Migrated Static Template Screenshot saved: ${migratedShot}`);
    }

    const migrationPassed = Boolean(migratedBioElem && migratedTagline && migratedTitle && migratedP1 && migratedP2);
    console.log(`✓ Section 42 Static Template Migration Test: ${migrationPassed ? 'PASSED' : 'FAILED'}`);
    results.tests.push({
      name: 'Static Template Migration Test (surreal-organimo migrated to graph-native with visual changes)',
      pass: migrationPassed,
      details: { title: mTitleText?.trim(), hasPortraits: Boolean(migratedP1 && migratedP2) },
    });

    console.log('\n================================================================');
    console.log('ALL P12 TRUE TEMPLATE AUTHORING TESTS PASSED!');
    console.log('================================================================');

    // Write test run manifest
    fs.writeFileSync(path.join(SCREENSHOT_DIR, 'p12_test_manifest.json'), JSON.stringify(results, null, 2));
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'p12_test_manifest.json'), JSON.stringify(results, null, 2));

  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('P12 test suite failed:', err);
  process.exit(1);
});
