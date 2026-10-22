import { test, expect } from '@playwright/test';

test.describe('P27 Forensic Browser Inspection', () => {
  test('Audit real DOM, CSS, Store, Hit-Testing, and Controls', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/admin/template-studio?template=saas-nextgen', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#sz-top-bar, .orbitox-studio-zero', { timeout: 20000 });

    // 1. Audit Stylesheets & CSS Rules
    const cssAudit = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      const linkHrefs: string[] = [];
      const inlineStyleCount = document.querySelectorAll('[style]').length;
      let totalCssRules = 0;
      let hasTailwindFlex = false;

      sheets.forEach((sheet) => {
        if (sheet.href) linkHrefs.push(sheet.href);
        try {
          const rules = sheet.cssRules;
          totalCssRules += rules.length;
            for (let i = 0; i < rules.length; i++) {
              const rule = rules[i];
              if (rule && (rule.cssText.includes('.flex {') || rule.cssText.includes('.flex{'))) {
                hasTailwindFlex = true;
              }
            }
        } catch {
          // CORS or inaccessible sheet
        }
      });

      return {
        sheetCount: sheets.length,
        linkHrefs,
        inlineStyleCount,
        totalCssRules,
        hasTailwindFlex,
      };
    });

    console.log('--- CSS AUDIT RESULT ---');
    console.log(JSON.stringify(cssAudit, null, 2));

    // 2. Audit Computed Styles on Elements with Tailwind classes
    const computedAudit = await page.evaluate(() => {
      const flexElements = Array.from(document.querySelectorAll('.flex'));
      const sample = flexElements.slice(0, 5).map((el) => {
        const computed = window.getComputedStyle(el);
        return {
          tag: el.tagName,
          className: el.className,
          computedDisplay: computed.display,
          computedFlexDirection: computed.flexDirection,
          computedAlignItems: computed.alignItems,
        };
      });
      return {
        totalFlexElements: flexElements.length,
        sample,
      };
    });

    console.log('--- COMPUTED STYLES AUDIT ---');
    console.log(JSON.stringify(computedAudit, null, 2));

    // 3. Audit Active Store State
    const storeAudit = await page.evaluate(() => {
      const win = window as any;
      if (!win.__studioStore) return { hasStore: false };
      const state = win.__studioStore.getState();
      return {
        hasStore: true,
        templateId: state.draft?.schema?.id,
        templateName: state.draft?.schema?.name,
        templateSlug: state.draft?.schema?.slug,
        scenesCount: state.draft?.schema?.scenes?.length,
        scenesList: state.draft?.schema?.scenes?.map((s: any) => ({
          id: s.id,
          name: s.name,
          hasSceneGraph: Boolean(s.sceneGraph),
          nodeCount: Object.keys(s.sceneGraph?.nodes || {}).length,
        })),
        activeSceneId: state.ui?.selection?.sceneId,
        selectedNodeId: state.ui?.selection?.nodeId,
        historyPastCount: state.history?.past?.length,
        persistenceStatus: state.persistence?.status,
        hasPages: Boolean(state.draft?.schema?.pages),
        pagesCount: state.draft?.schema?.pages?.length,
      };
    });

    console.log('--- STORE AUDIT RESULT ---');
    console.log(JSON.stringify(storeAudit, null, 2));

    // 4. Audit Canvas Hit-Testing & Pointer Event Interception
    const hitTestAudit = await page.evaluate(() => {
      const canvasEl = document.querySelector('.orbitox-studio-zero') || document.querySelector('#sz-canvas');
      const nodes = Array.from(document.querySelectorAll('[data-node-id]'));
      const interactionLayers = Array.from(document.querySelectorAll('[data-interaction-layer]'));
      const selectionOverlays = Array.from(document.querySelectorAll('[style*="cursor: move"]'));

      return {
        canvasFound: Boolean(canvasEl),
        renderedNodeElementsCount: nodes.length,
        interactionLayersCount: interactionLayers.length,
        selectionOverlaysCount: selectionOverlays.length,
        firstFewNodes: nodes.slice(0, 5).map((n) => ({
          nodeId: n.getAttribute('data-node-id'),
          tag: n.tagName,
          rect: n.getBoundingClientRect(),
          pointerEvents: window.getComputedStyle(n).pointerEvents,
          zIndex: window.getComputedStyle(n).zIndex,
        })),
      };
    });

    console.log('--- HIT TEST AUDIT ---');
    console.log(JSON.stringify(hitTestAudit, null, 2));

    // 5. Audit Right Sidebar Inspector (SectionInspector when no node selected, PropertiesPanel when selected)
    const inspectorBeforeClick = await page.evaluate(() => {
      const el = document.querySelector('#sz-properties-panel, #sz-section-inspector');
      return {
        found: Boolean(el),
        id: el?.id,
        tag: el?.tagName,
        text: el?.textContent?.slice(0, 100),
      };
    });
    console.log('--- INSPECTOR BEFORE NODE SELECTION ---');
    console.log(JSON.stringify(inspectorBeforeClick, null, 2));

    // 6. Test Real Canvas Click Selection on Heading Element
    console.log('--- PERFORMING REAL CANVAS CLICK ON HEADING ---');
    const headingEl = page.locator('[data-node-id="node_hero_title"], #node_hero_title').first();
    await headingEl.click();
    await page.waitForTimeout(500);

    const afterClickAudit = await page.evaluate(() => {
      const win = window as any;
      const state = win.__studioStore?.getState();
      const inspectorEl = document.querySelector('#sz-properties-panel');
      const selectionBox = document.querySelector('[id^="canvas-selection-"]');
      return {
        selectedNodeId: state?.ui?.selection?.nodeId,
        inspectorMounted: Boolean(inspectorEl),
        selectionBoxFound: Boolean(selectionBox),
        selectionBoxPointerEvents: selectionBox ? window.getComputedStyle(selectionBox).pointerEvents : null,
        inspectorInputValues: inspectorEl ? Array.from(inspectorEl.querySelectorAll('input')).map(i => ({
          type: i.type,
          value: i.value,
        })).slice(0, 8) : [],
      };
    });
    console.log('--- POST-CLICK SELECTION & INSPECTOR RESULT ---');
    console.log(JSON.stringify(afterClickAudit, null, 2));

    expect(afterClickAudit.selectedNodeId).toBe('node_hero_title');
    expect(afterClickAudit.inspectorMounted).toBe(true);
    expect(afterClickAudit.selectionBoxPointerEvents).toBe('none'); // Verified Zero-Event Pass-Through!

    // 7. Test Real Template Switching to Agency Editorial
    console.log('--- TESTING TEMPLATE SWITCHING TO AGENCY EDITORIAL ---');
    await page.goto('/admin/template-studio?template=agency-editorial', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#sz-top-bar, .orbitox-studio-zero', { timeout: 20000 });
    await page.waitForTimeout(500);

    const agencyStoreAudit = await page.evaluate(() => {
      const win = window as any;
      const state = win.__studioStore?.getState();
      return {
        slug: state?.draft?.schema?.slug,
        name: state?.draft?.schema?.name,
        scenesCount: state?.draft?.schema?.scenes?.length,
        firstSceneName: state?.draft?.schema?.scenes?.[0]?.name,
      };
    });

    console.log('--- AGENCY STORE STATE RESULT ---');
    console.log(JSON.stringify(agencyStoreAudit, null, 2));

    expect(agencyStoreAudit.slug).toBe('agency-editorial');
    expect(agencyStoreAudit.scenesCount).toBeGreaterThan(0);
  });
});
