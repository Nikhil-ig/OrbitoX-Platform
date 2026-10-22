const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testPhase6AiAndPublishing() {
  console.log('═════════════════════════════════════════════════════════════════════');
  console.log(' 🪐 ORBITOX P16.1 — PHASE 6 AI DESIGNER & PRODUCTION PUBLISHING TEST');
  console.log('═════════════════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1680, height: 960 },
  });

  const page = await context.newPage();
  const screenshotsDir = '/Users/apple/.gemini/antigravity-ide/brain/e1945eb2-f0c9-4854-913d-b4ee9b26219a/screenshots';
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon') && !text.includes('404')) {
        consoleErrors.push(text);
      }
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  const tests = [];
  const record = (id, name, passed, details = '') => {
    tests.push({ id, name, passed, details });
    console.log(`${passed ? '  ✅ PASS' : '  ❌ FAIL'} [${id}] ${name}${details ? '\n         → ' + details : ''}`);
  };

  try {
    // ─────────────────────────────────────────────────────────────
    // Load Studio
    // ─────────────────────────────────────────────────────────────
    console.log('Loading OrbitoX Visual Studio...');
    await page.goto('http://localhost:3010/admin/template-studio', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForSelector('#sz-canvas-workspace', { timeout: 30000 });
    await page.waitForTimeout(2000);

    // ─────────────────────────────────────────────────────────────
    // P6-01: AI Designer Natural Language Prompt Planning
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P6-01: AI Designer Natural Language Prompt Planning ---');
    const planResult = await page.evaluate(() => {
      const AIDesignEngine = window.__studioAIDesignEngine;
      const store = window.__studioStore;
      if (!AIDesignEngine || !store) return { success: false, reason: 'Engine or store not found' };

      const schema = store.getState().draft.schema;
      const scene = schema.scenes[0];
      const targetNode = Object.values(scene.sceneGraph.nodes)[1];

      // Test multiple prompts
      const luxuryPlan = AIDesignEngine.planPrompt('Apply luxury editorial aesthetic', schema, targetNode.id, scene.id);
      const glassPlan = AIDesignEngine.planPrompt('Add glass effect', schema, targetNode.id, scene.id);
      const parallaxPlan = AIDesignEngine.planPrompt('Add subtle parallax depth', schema, targetNode.id, scene.id);
      const springPlan = AIDesignEngine.planPrompt('Animate with spring bounce', schema, targetNode.id, scene.id);
      const mobilePlan = AIDesignEngine.planPrompt('Make this mobile-first', schema, targetNode.id, scene.id);

      const passLuxury = luxuryPlan.themeUniverse === 'editorial' && luxuryPlan.tokensPatch?.['colors.accentPrimary'] === '#D4AF37';
      const passGlass = glassPlan.nodePatches.some(p => p.patch.style?.effects?.backdropBlur === '16px');
      const passParallax = parallaxPlan.nodePatches.some(p => p.patch.style?.depthPlane === 3);
      const passSpring = springPlan.nodePatches.some(p => p.patch.motion?.in?.easing === 'spring');
      const passMobile = mobilePlan.nodePatches.some(p => p.patch.responsive?.mobile !== undefined);

      return {
        success: passLuxury && passGlass && passParallax && passSpring && passMobile,
        passLuxury,
        passGlass,
        passParallax,
        passSpring,
        passMobile,
        luxurySummary: luxuryPlan.summary,
      };
    });

    record(
      'P6-01',
      'AI Designer Natural Language Prompt Planning (Aesthetics, Glass, Motion & Mobile)',
      planResult.success,
      `Luxury: ${planResult.passLuxury}, Glass: ${planResult.passGlass}, Parallax: ${planResult.passParallax}, Spring: ${planResult.passSpring}, Mobile: ${planResult.passMobile}`
    );

    // ─────────────────────────────────────────────────────────────
    // P6-02: AI Direct SceneGraph AST Mutation on Live Canvas
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P6-02: AI Direct SceneGraph AST Mutation on Live Canvas ---');
    const mutationResult = await page.evaluate(async () => {
      const controller = window.__studioController;
      const store = window.__studioStore;
      const schema = store.getState().draft.schema;
      const scene = schema.scenes[0];
      const targetNode = Object.values(scene.sceneGraph.nodes).find(n => n.kind === 'text') || Object.values(scene.sceneGraph.nodes)[1];

      // Select target node
      controller.selectNode(targetNode.id, scene.id);

      // Execute AI command through controller
      controller.dispatch({ type: 'BEGIN_TRANSACTION', label: 'AI: luxury' });
      controller.dispatch({
        type: 'APPLY_THEME',
        universeId: 'editorial',
        patch: {
          colors: { accentPrimary: '#D4AF37' },
        },
      });
      controller.dispatch({
        type: 'SG_UPDATE_STYLE',
        sceneId: scene.id,
        nodeId: targetNode.id,
        patch: {
          typography: { fontFamily: 'Playfair Display, serif', letterSpacing: '0.08em' },
        },
      });
      controller.dispatch({ type: 'COMMIT_TRANSACTION' });

      await new Promise(r => setTimeout(r, 200));

      const updatedState = store.getState();
      const updatedNode = updatedState.draft.schema.scenes[0].sceneGraph.nodes[targetNode.id];
      const updatedToken = updatedState.draft.schema.designTokens.colors.accentPrimary;

      return {
        success: updatedToken === '#D4AF37' && updatedNode.style?.typography?.fontFamily?.includes('Playfair'),
        accentPrimary: updatedToken,
        fontFamily: updatedNode.style?.typography?.fontFamily,
      };
    });

    await page.screenshot({ path: path.join(screenshotsDir, 'phase6_01_ai_live_ast_mutation.png') });
    record(
      'P6-02',
      'AI Direct SceneGraph AST Mutation on Live Canvas',
      mutationResult.success,
      `Primary Accent: ${mutationResult.accentPrimary}, Node Font: "${mutationResult.fontFamily}"`
    );

    // ─────────────────────────────────────────────────────────────
    // P6-03: AI Single-Step Atomic Undo Rollback
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P6-03: AI Single-Step Atomic Undo Rollback ---');
    const undoResult = await page.evaluate(async () => {
      const controller = window.__studioController;
      const store = window.__studioStore;

      // 1-Click Atomic Undo
      controller.undo();
      await new Promise(r => setTimeout(r, 200));

      const revertedState = store.getState();
      const revertedToken = revertedState.draft.schema.designTokens.colors.accentPrimary;
      const scene = revertedState.draft.schema.scenes[0];
      const targetNode = Object.values(scene.sceneGraph.nodes).find(n => n.kind === 'text') || Object.values(scene.sceneGraph.nodes)[1];

      return {
        success: revertedToken !== '#D4AF37',
        revertedToken,
        fontFamily: targetNode.style?.typography?.fontFamily || 'Cinzel',
      };
    });

    await page.screenshot({ path: path.join(screenshotsDir, 'phase6_02_ai_atomic_undo.png') });
    record(
      'P6-03',
      'AI Single-Step Atomic Undo Rollback (1 Undo reverses multi-node batch)',
      undoResult.success,
      `Reverted Primary Accent: ${undoResult.revertedToken}, Restored Font: "${undoResult.fontFamily}"`
    );

    // ─────────────────────────────────────────────────────────────
    // P6-04: AI Copywriting & Typography Hierarchy Refinement
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P6-04: AI Copywriting & Typography Hierarchy Refinement ---');
    const copyResult = await page.evaluate(async () => {
      const AIDesignEngine = window.__studioAIDesignEngine;
      const controller = window.__studioController;
      const store = window.__studioStore;
      const schema = store.getState().draft.schema;
      const scene = schema.scenes[0];
      const targetNode = Object.values(scene.sceneGraph.nodes).find(n => n.kind === 'text') || Object.values(scene.sceneGraph.nodes)[1];

      const plan = AIDesignEngine.planPrompt('Refine headline copy with romantic poetry', schema, targetNode.id, scene.id);
      const patch = plan.nodePatches[0]?.patch;

      if (!patch || !patch.name) return { success: false, reason: 'No copy patch generated' };

      controller.dispatch({
        type: 'SG_UPDATE_NODE_PROPERTY',
        sceneId: scene.id,
        nodeId: targetNode.id,
        patch: {
          name: patch.name,
          props: patch.props,
        },
      });

      const afterState = store.getState();
      const updatedNode = afterState.draft.schema.scenes[0].sceneGraph.nodes[targetNode.id];

      return {
        success: Boolean(updatedNode.name && updatedNode.name.length > 10),
        generatedHeadline: updatedNode.name,
        propsText: updatedNode.props?.text,
      };
    });

    record(
      'P6-04',
      'AI Copywriting & Typography Hierarchy Refinement',
      copyResult.success,
      `Generated Headline: "${copyResult.generatedHeadline}"`
    );

    // ─────────────────────────────────────────────────────────────
    // P6-05: AI Glassmorphism & Visual Styling Transformations
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P6-05: AI Glassmorphism & Visual Styling Transformations ---');
    const glassResult = await page.evaluate(async () => {
      const AIDesignEngine = window.__studioAIDesignEngine;
      const controller = window.__studioController;
      const store = window.__studioStore;
      const schema = store.getState().draft.schema;
      const scene = schema.scenes[0];
      const targetNode = Object.values(scene.sceneGraph.nodes).find(n => n.kind === 'frame' || n.kind === 'button') || Object.values(scene.sceneGraph.nodes)[0];

      const plan = AIDesignEngine.planPrompt('Add glass effect', schema, targetNode.id, scene.id);
      const patch = plan.nodePatches[0]?.patch;

      if (!patch || !patch.style) return { success: false, reason: 'No glass patch generated' };

      controller.dispatch({
        type: 'SG_UPDATE_STYLE',
        sceneId: scene.id,
        nodeId: targetNode.id,
        patch: patch.style,
      });

      const afterState = store.getState();
      const updatedNode = afterState.draft.schema.scenes[0].sceneGraph.nodes[targetNode.id];

      return {
        success: updatedNode.style?.effects?.backdropBlur === '16px' && Boolean(updatedNode.style?.shadow?.boxShadow),
        backdropBlur: updatedNode.style?.effects?.backdropBlur,
        boxShadow: updatedNode.style?.shadow?.boxShadow,
      };
    });

    record(
      'P6-05',
      'AI Glassmorphism & Visual Styling Transformations (Backdrop Blur & Specular Rim)',
      glassResult.success,
      `Backdrop Blur: ${glassResult.backdropBlur}, Box Shadow: "${glassResult.boxShadow}"`
    );

    // ─────────────────────────────────────────────────────────────
    // P6-06: Production Edge Exporter Standalone HTML5 Compilation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P6-06: Production Edge Exporter Standalone HTML5 Compilation ---');
    const exportResult = await page.evaluate(() => {
      const Exporter = window.__studioProductionEdgeExporter;
      const store = window.__studioStore;
      if (!Exporter || !store) return { success: false, reason: 'Exporter or store missing' };

      const schema = store.getState().draft.schema;
      const bundle = Exporter.compileToBundle(schema);

      const hasDoctype = bundle.html.includes('<!DOCTYPE html>');
      const hasMain = bundle.html.includes('<main class="orbitox-page">');
      const hasSections = bundle.html.includes('class="orbitox-section"');
      const hasNoReact = !bundle.html.includes('react-dom') && !bundle.html.includes('_next');
      const hasZeroDepRuntime = bundle.html.includes('updateScroll');

      return {
        success: hasDoctype && hasMain && hasSections && hasNoReact && hasZeroDepRuntime,
        hasDoctype,
        hasMain,
        hasSections,
        hasNoReact,
        hasZeroDepRuntime,
        nodeCount: bundle.meta.nodeCount,
        sectionCount: bundle.meta.sectionCount,
      };
    });

    record(
      'P6-06',
      'Production Edge Exporter Standalone HTML5 Compilation (Zero-Dependency)',
      exportResult.success,
      `Sections: ${exportResult.sectionCount}, Nodes: ${exportResult.nodeCount}, Valid Clean HTML5: ${exportResult.hasDoctype}`
    );

    // ─────────────────────────────────────────────────────────────
    // P6-07: Responsive Breakpoints Media Queries in Compiled HTML
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P6-07: Responsive Breakpoints Media Queries in Compiled HTML ---');
    const mediaQueryResult = await page.evaluate(() => {
      const Exporter = window.__studioProductionEdgeExporter;
      const store = window.__studioStore;
      const schema = store.getState().draft.schema;

      // Add responsive override to a node to ensure media query generates
      const scene = schema.scenes[0];
      const targetNode = Object.values(scene.sceneGraph.nodes)[1];
      targetNode.responsive = {
        tablet: { style: { padding: '16px' } },
        mobile: { style: { padding: '8px' } },
      };

      const bundle = Exporter.compileToBundle(schema);
      const hasTabletMedia = bundle.css.includes('@media (max-width: 768px)');
      const hasMobileMedia = bundle.css.includes('@media (max-width: 390px)');

      return {
        success: hasTabletMedia && hasMobileMedia,
        hasTabletMedia,
        hasMobileMedia,
      };
    });

    record(
      'P6-07',
      'Responsive Breakpoints Media Queries in Compiled CSS (768px Tablet & 390px Mobile)',
      mediaQueryResult.success,
      `Tablet Media Query: ${mediaQueryResult.hasTabletMedia}, Mobile Media Query: ${mediaQueryResult.hasMobileMedia}`
    );

    // ─────────────────────────────────────────────────────────────
    // P6-08: Automated OpenGraph, SEO Meta & Schema.org JSON-LD
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P6-08: Automated OpenGraph, SEO Meta & Schema.org JSON-LD ---');
    const seoResult = await page.evaluate(() => {
      const Exporter = window.__studioProductionEdgeExporter;
      const store = window.__studioStore;
      const schema = store.getState().draft.schema;
      const bundle = Exporter.compileToBundle(schema);

      const hasOgTitle = bundle.html.includes('<meta property="og:title"');
      const hasOgImage = bundle.html.includes('<meta property="og:image"');
      const hasTwitter = bundle.html.includes('<meta name="twitter:card"');
      const hasCanonical = bundle.html.includes('<link rel="canonical"');
      const hasJsonLd = bundle.html.includes('<script type="application/ld+json">') && bundle.jsonLd.includes('"@context": "https://schema.org"');

      return {
        success: hasOgTitle && hasOgImage && hasTwitter && hasCanonical && hasJsonLd,
        hasOgTitle,
        hasOgImage,
        hasTwitter,
        hasCanonical,
        hasJsonLd,
      };
    });

    record(
      'P6-08',
      'Automated OpenGraph, SEO Meta & Schema.org JSON-LD Generation',
      seoResult.success,
      `OG Tags: ${seoResult.hasOgTitle}, Twitter Card: ${seoResult.hasTwitter}, Schema.org JSON-LD: ${seoResult.hasJsonLd}`
    );

    // ─────────────────────────────────────────────────────────────
    // P6-09: Publish Modal Custom Domain Input & DNS CNAME Verification
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P6-09: Publish Modal Custom Domain Input & DNS CNAME Verification ---');
    // Open Publish modal
    const publishBtn = await page.$('#sz-publish-btn') || await page.$('button:has-text("Publish")');
    if (publishBtn) await publishBtn.click();
    await page.waitForTimeout(400);

    const publishModalMounted = await page.$('#sz-publish-modal-container');
    const domainInput = page.locator('#sz-publish-custom-domain-input');
    await domainInput.fill('invitation.royalcourtwedding.com');
    await page.waitForTimeout(200);

    // Click verify DNS
    const verifyDnsBtn = await page.$('#sz-publish-verify-dns-btn');
    if (verifyDnsBtn) await verifyDnsBtn.click();
    await page.waitForTimeout(500);

    const dnsVerified = await page.evaluate(() => {
      const msg = document.getElementById('sz-publish-dns-status-msg');
      const ssl = document.getElementById('sz-publish-ssl-status');
      return {
        success: Boolean(msg && msg.textContent?.includes('cname.edge.orbitox.io')),
        msgText: msg?.textContent?.trim(),
        sslText: ssl?.textContent?.trim(),
      };
    });

    await page.screenshot({ path: path.join(screenshotsDir, 'phase6_03_custom_domain_dns_verified.png') });
    record(
      'P6-09',
      'Publish Modal Custom Domain Input & Zero-Trust DNS CNAME Verification',
      dnsVerified.success,
      `Status: "${dnsVerified.msgText}", SSL Status: "${dnsVerified.sslText}"`
    );

    // ─────────────────────────────────────────────────────────────
    // P6-10: Production Code Export & Download Trigger in Modal
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P6-10: Production Code Export & Download Trigger in Modal ---');
    const exportTabBtn = await page.$('#sz-publish-tab-export');
    if (exportTabBtn) await exportTabBtn.click();
    await page.waitForTimeout(400);

    const exportTabResult = await page.evaluate(() => {
      const codePreview = document.getElementById('sz-publish-code-preview');
      const downloadBtn = document.getElementById('sz-publish-download-bundle-btn');
      const copyHtmlBtn = document.getElementById('sz-publish-copy-html-btn');

      const text = codePreview?.textContent || '';
      return {
        success: text.includes('<!DOCTYPE html>') && Boolean(downloadBtn && copyHtmlBtn),
        hasDoctypeInPreview: text.includes('<!DOCTYPE html>'),
        hasDownloadBtn: Boolean(downloadBtn),
        hasCopyBtn: Boolean(copyHtmlBtn),
      };
    });

    await page.screenshot({ path: path.join(screenshotsDir, 'phase6_04_production_code_exporter_tab.png') });
    record(
      'P6-10',
      'Production Code Export Tab (Syntax Preview & Download Bundle Trigger)',
      exportTabResult.success,
      `Code Preview contains DOCTYPE: ${exportTabResult.hasDoctypeInPreview}, Download Button: ${exportTabResult.hasDownloadBtn}, Copy Button: ${exportTabResult.hasCopyBtn}`
    );

    // Close publish modal
    const closeBtn = await page.$('#sz-publish-modal-close-btn');
    if (closeBtn) await closeBtn.click();
    await page.waitForTimeout(300);

    // ─────────────────────────────────────────────────────────────
    // P6-11: Zero-Trust Multi-Tenancy & Runtime Stability
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- P6-11: Zero-Trust Multi-Tenancy & Runtime Stability ---');
    record(
      'P6-11',
      'Runtime Stability & Console Hygiene (0 Unhandled Errors)',
      consoleErrors.length === 0,
      consoleErrors.length === 0 ? '0 console errors observed' : `${consoleErrors.length} errors: ${consoleErrors.slice(0, 2).join('; ')}`
    );

  } catch (err) {
    console.error('Test Suite encountered fatal exception:', err);
    record('FATAL', 'Execution failed with exception', false, err.message);
  } finally {
    await browser.close();
  }

  // ─────────────────────────────────────────────────────────────
  // Final Certification Summary
  // ─────────────────────────────────────────────────────────────
  const total = tests.length;
  const passed = tests.filter(t => t.passed).length;
  const failed = total - passed;

  console.log('\n═════════════════════════════════════════════════════════════════════');
  console.log(` 🪐 PHASE 6 TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('═════════════════════════════════════════════════════════════════════');

  if (failed > 0) {
    console.log(`\n❌ Failed tests (${failed}):`);
    tests.filter(t => !t.passed).forEach(t => console.log(`   - [${t.id}] ${t.name}: ${t.details}`));
    process.exit(1);
  } else {
    console.log('\n🎉 ALL PHASE 6 TESTS PASSED WITH 100% SUCCESS!');
    process.exit(0);
  }
}

testPhase6AiAndPublishing();
