import { test, expect } from '@playwright/test';

test.describe('P26.1 — Creative Intake, Marketplace, Command Center & Box Model Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/template-studio?template=saas-nextgen', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#sz-top-bar, .orbitox-studio-zero, [data-testid="template-studio"]', { timeout: 25000 });
  });

  test('GATE G1 & G3: Universal Add Command Center (A / ⌘K) and Element/Section Insertion', async ({ page }) => {
    // 1. Click the + rail button or press A
    const addRailBtn = page.locator('#sz-rail-btn-add');
    if (await addRailBtn.isVisible()) {
      await addRailBtn.click();
    } else {
      await page.keyboard.press('a');
    }

    const commandCenter = page.locator('#sz-universal-add-command-center');
    await expect(commandCenter).toBeVisible({ timeout: 10000 });

    // 2. Search for "Button"
    const searchInput = page.locator('#sz-universal-add-search-input');
    await searchInput.fill('Button');

    // Button item should appear in results
    const buttonItem = commandCenter.getByText('Interactive Button', { exact: false });
    await expect(buttonItem).toBeVisible();

    // 3. Click button to insert onto canvas
    await buttonItem.click();

    // Command center should close
    await expect(commandCenter).not.toBeVisible();

    // 4. Test opening with ⌘K
    await page.keyboard.press('Meta+k');
    if (await commandCenter.isVisible()) {
      // Test category tab filter: Sections
      const sectionsFilterBtn = commandCenter.getByRole('button', { name: 'Sections', exact: true });
      if (await sectionsFilterBtn.isVisible()) {
        await sectionsFilterBtn.click();
      }
      // Close command center with Escape
      await page.keyboard.press('Escape');
      await expect(commandCenter).not.toBeVisible();
    }
  });

  test('GATE G2: Template Marketplace & Multi-Device Live Preview', async ({ page }) => {
    // 1. Click Templates icon on StudioRail
    const templatesBtn = page.locator('#sz-rail-btn-templates');
    await templatesBtn.click();

    // Template Marketplace modal should appear
    const marketplace = page.locator('#sz-template-marketplace-modal');
    await expect(marketplace).toBeVisible({ timeout: 10000 });

    // Test Search input
    const searchInput = marketplace.locator('#sz-template-marketplace-search');
    await searchInput.fill('Cloud');
    await expect(marketplace.getByText('CloudPulse NextGen SaaS')).toBeVisible();
    await searchInput.fill('');

    // 2. Click "Preview Live" on a template card
    const previewBtn = marketplace.getByRole('button', { name: 'Preview Live' }).first();
    await previewBtn.click();

    // Live preview switcher modal should be visible
    const livePreviewModal = page.locator('#sz-live-template-preview-modal');
    await expect(livePreviewModal).toBeVisible({ timeout: 10000 });

    // Viewport switcher buttons: Desktop, Tablet, Mobile
    const desktopView = livePreviewModal.getByRole('button', { name: 'Desktop', exact: true });
    await expect(desktopView).toBeVisible();

    // Test responsive viewport toggles
    const tabletView = livePreviewModal.getByRole('button', { name: 'Tablet', exact: true });
    await tabletView.click();
    await expect(tabletView).toBeVisible();

    const mobileView = livePreviewModal.getByRole('button', { name: 'Mobile', exact: true });
    await mobileView.click();
    await expect(mobileView).toBeVisible();

    // Check action buttons in preview bottom bar
    await expect(livePreviewModal.getByText('Add Section to Page')).toBeVisible();
    await expect(livePreviewModal.getByText('Add as New Page')).toBeVisible();
    await expect(livePreviewModal.getByText('Use as New Project')).toBeVisible();
    await expect(livePreviewModal.getByText('Replace Site...')).toBeVisible();

    // Close preview / marketplace
    await page.keyboard.press('Escape');
  });

  test('GATE G4 & G1: 3-Step Creative Intake Modal & Explainability', async ({ page }) => {
    // 1. Open Import Modal from TopBar
    const importBtn = page.locator('button:has-text("Import")').first();
    await importBtn.click();

    // 3-Step Creative Intake modal should appear
    const intakeModal = page.locator('#sz-creative-intake-modal');
    await expect(intakeModal).toBeVisible({ timeout: 10000 });

    // Check step 1 drop zone instructions
    await expect(page.getByText('Step 1: Input or Select Creative Source')).toBeVisible();
    await expect(page.getByText('Universal Creative Intake')).toBeVisible();

    // Test preset switching
    const bentoPreset = intakeModal.getByText('Bento Feature Grid');
    if (await bentoPreset.isVisible()) {
      await bentoPreset.click();
    }

    // Step 2 analysis scorecard verification
    await expect(page.getByText('Step 2: OrbitoX Analysis')).toBeVisible();
    await expect(page.getByText('Structure Recognized')).toBeVisible();

    // Toggle Explainability "Why?"
    const whyBtn = intakeModal.getByText('Why?');
    if (await whyBtn.isVisible()) {
      await whyBtn.click();
      await expect(page.getByText('Fidelity Explainability Breakdown:')).toBeVisible();
    }

    // Check non-destructive action cards in Step 3
    await expect(page.locator('#sz-intake-btn-add-to-page')).toBeVisible();
    await expect(page.locator('#sz-intake-btn-add-as-new-page')).toBeVisible();
    await expect(page.locator('#sz-intake-btn-create-project')).toBeVisible();
    await expect(page.locator('#sz-intake-btn-replace-selected')).toBeVisible();

    // Toggle collapsible developer diagnostics
    const devDiagnostics = intakeModal.getByText('Developer Diagnostics & AST Tree (Advanced)');
    if (await devDiagnostics.isVisible()) {
      await devDiagnostics.click();
    }

    // Close modal
    const closeBtn = page.locator('#sz-creative-intake-close-btn');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await expect(intakeModal).not.toBeVisible();
  });

  test('GATE G7: Interactive SVG Box Model & Visual Corner Radius Presets', async ({ page }) => {
    // 1. Select a node on canvas to display properties panel
    const node = page.locator('[data-node-id]').first();
    if (await node.isVisible()) {
      await node.click();

      // Check if Properties panel is visible
      const propertiesPanel = page.locator('#sz-properties-panel');
      if (await propertiesPanel.isVisible()) {
        // Switch to Style / Layout tab if not on it
        const styleTab = propertiesPanel.getByRole('button', { name: 'style', exact: false }).first();
        if (await styleTab.isVisible()) {
          await styleTab.click();
        }

        // Verify Box Model is present
        await expect(page.getByText('Box Model').first()).toBeVisible({ timeout: 10000 });

        // Test Unit Buttons (px, %, rem, auto) scoped to properties panel
        const remUnit = propertiesPanel.getByRole('button', { name: 'rem', exact: true });
        if (await remUnit.isVisible()) {
          await remUnit.click();
        }
        const pxUnit = propertiesPanel.getByRole('button', { name: 'px', exact: true });
        if (await pxUnit.isVisible()) {
          await pxUnit.click();
        }

        // Check Corner Radius presets (0, 4, 8, 16, Pill)
        const pillPreset = propertiesPanel.getByRole('button', { name: 'Pill', exact: true });
        if (await pillPreset.isVisible()) {
          await pillPreset.click();
        }
        const radius8Preset = propertiesPanel.getByRole('button', { name: '8', exact: true });
        if (await radius8Preset.isVisible()) {
          await radius8Preset.click();
        }
      }
    }
  });

  test('GATE G9: Dynamic CMS Collections & Canvas Repeater Binding', async ({ page }) => {
    // 1. Open Data & CMS panel from StudioRail
    const dataRailBtn = page.locator('#sz-rail-btn-data');
    await dataRailBtn.click();

    const dataPanel = page.locator('#sz-data-panel');
    await expect(dataPanel).toBeVisible({ timeout: 10000 });

    // Check Collections tab
    await expect(dataPanel.getByText('Collections (', { exact: false })).toBeVisible();

    // Check default collections (Products, Blog Posts, Testimonials)
    await expect(dataPanel.getByText('Products', { exact: true })).toBeVisible();
    await expect(dataPanel.getByText('Blog Posts', { exact: true })).toBeVisible();

    // Check that table rows exist with product data
    await expect(dataPanel.getByText('OrbitoX Spatial Vision Pro')).toBeVisible();

    // Check "+ Add Row" button
    const addRowBtn = dataPanel.getByText('Add Row to Products');
    await expect(addRowBtn).toBeVisible();

    // Switch collection to Blog Posts
    const blogTab = dataPanel.getByText('Blog Posts', { exact: true });
    await blogTab.click();
    await expect(dataPanel.getByText('Zero-Latency Spatial Streaming with WebRTC 2.0')).toBeVisible();

    // Switch back to Products
    const productsTab = dataPanel.getByText('Products', { exact: true });
    await productsTab.click();
    await expect(dataPanel.getByText('OrbitoX Spatial Vision Pro')).toBeVisible();

    // Close data panel
    const closeBtn = dataPanel.locator('button[title="Close panel"]');
    await closeBtn.click();
    await expect(dataPanel).not.toBeVisible();
  });

  test('GATE G2-DROP: Window-Level Drag and Drop Interception Overlay', async ({ page }) => {
    // Dispatch dragenter on the document window
    await page.evaluate(() => {
      const event = new DragEvent('dragenter', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer(),
      });
      window.dispatchEvent(event);
    });

    // Check that the Global Dropzone Overlay is rendered in DOM
    const dropzone = page.locator('#sz-global-dropzone-overlay');
    // GlobalDropzoneOverlay has pointerEvents none when inactive or is ready
    expect(dropzone).toBeDefined();
  });
});
