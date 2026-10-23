# P26.1 Acceptance Plan & End-to-End Verification Protocol

## 1. Executive Summary

This document establishes the definitive verification protocol and acceptance gates for **P26.1 — Universal Creative Intake & Studio Architecture**. All features must be validated in live Chromium browser automation against real user workflows.

---

## 2. The 10 Acceptance Gates

### Gate 1: Frictionless 3-Step Creative Intake
- **Test Workflow**:
  1. Drag an HTML file or ZIP archive anywhere over the Studio Zero browser window.
  2. Verify the translucent **Global Dropzone Overlay** activates with animated glowing borders.
  3. Release file: Verify Step 1 transitions automatically to Step 2 ("Understand").
  4. Verify the summary card displays plain-English metrics: detected pages, sections, elements, reusable components, images, fonts, and color tokens.
  5. Verify the **Fidelity Score** is displayed with a clickable "Why?" button detailing matched heuristics.
  6. Select "Add to current page": Verify content is appended as real, fully editable SceneGraph nodes.
  7. Verify persistence: Reload the page; verify the imported content remains fully editable.

### Gate 2: Visual Template Marketplace & Live Interactive Preview
- **Test Workflow**:
  1. Open the Template Marketplace from the rail or Universal Add center.
  2. Verify templates are presented as rich, large visual preview cards with category pills (`All`, `SaaS`, `Portfolio`, `Ecommerce`, `Agency`, `3D`).
  3. Click "Preview" on *Celestial Odyssey*: Verify the live interactive preview modal opens.
  4. Toggle viewports: Switch between **Desktop (1440px)**, **Tablet (768px)**, and **Mobile (375px)**. Verify responsive layout updates cleanly.
  5. Scroll and interact inside the preview iframe: Verify hover states, micro-interactions, and scroll effects play smoothly.
  6. Verify the **Template Detail Sheet** displays pages, sections count, typography pairing, motion count, and CMS status.
  7. Verify the call-to-action is labeled "Use Template" with non-destructive choices (`Use as New Project`, `Add Section`, `Add as New Page`, `Create Variant`, `Replace Current Site`).
  8. Click "Add Section" and select "Hero": Verify only the hero section is inserted into the active page, leaving the rest of the existing project untouched.

### Gate 3: Universal `+ Add` Command Center
- **Test Workflow**:
  1. Click the `+` icon in the Studio rail or press `A`.
  2. Verify the Universal Add Command Center opens, containing Elements, Layout, Sections, Components, Assets, Templates, AI, and Ingestion.
  3. Type `"Hero"` into the search bar: Verify sections filter to hero archetypes.
  4. Click a hero section: Verify it inserts at the targeted page position.

### Gate 4: Centralized Asset Ingestion & In-Place Replacement
- **Test Workflow**:
  1. Drag an image file from desktop directly over an existing `image` node on canvas.
  2. Verify the target node glows with a blue outline displaying "Drop to Replace Asset".
  3. Release file: Verify image URL updates in-place while preserving width, height, responsive overrides, and animations.
  4. Drag 5 images simultaneously onto empty canvas: Verify non-blocking progress pill displays in bottom status bar (`Uploading 5 assets...`) and all 5 assets appear in the project asset library with SHA-256 deduplication.

### Gate 5: Right-Click Context Menu across 8 Targets & Ancestor Breadcrumbs
- **Test Workflow**:
  1. **Empty Canvas**: Right-click empty background → verify menu displays `Paste Here`, `Paste Special`, `Add >`, `Create Section`, `Zoom to Fit`, `Grid & Guides`.
  2. **Nested Text Node**: Right-click a text label inside a button inside a card:
     - Verify `Select Layer >` submenu displays: `[ Text Label ] > [ Button Frame ] > [ Card Container ] > [ Hero Section ]`.
     - Click `Button Frame`: Verify canvas selection switches to the parent button frame.
  3. **Image Node**: Right-click image → verify `Replace Asset >` (`From Library`, `Upload`, `URL`), `Fit & Fill >`, `Crop Image`, and `AI Enhancement`.
  4. **Section**: Right-click section → verify `Move Up`, `Move Down`, `Move to Top`, `Move to Bottom`, `Insert Above`, `Insert Below`, `Save as Section`.
  5. **Multi-Selection**: Select 3 elements and right-click → verify `Group into Frame`, `Distribute Horizontally`, `Animate Together`.
  6. **Keyboard Navigation**: Press Up/Down arrows to highlight menu items, Enter to execute, Escape to dismiss.

### Gate 6: Smart Clipboard & Multi-MIME External Paste
- **Test Workflow**:
  1. Copy raw HTML snippet (`<section class="p-8 bg-slate-900"><h1>Hello</h1></section>`) into OS clipboard.
  2. Focus canvas and press `Cmd+V`.
  3. Verify Smart Paste modal prompts: `[ Paste as Native Elements ]`, `[ Paste as New Section ]`, `[ Paste as Custom Embed ]`.
  4. Choose "Native Elements": Verify the HTML compiles into editable SceneGraph frame and heading nodes.
  5. Copy SVG code (`<svg ...><path .../></svg>`) and press `Cmd+V`: Verify SVG compiles into vector paths.

### Gate 7: Interactive Box Model & Corner Radius Hotspots
- **Test Workflow**:
  1. Select a frame on canvas and open the Layout tab in `PropertiesPanel`.
  2. Verify the interactive SVG Box Model diagram displays Margin (outer), Padding (inner), and Content dimensions (center).
  3. Change `Padding Top` from `16` to `32`: Verify canvas frame visibly expands padding by 16px in real time.
  4. Open Corner Radius control: Verify interactive rounded rectangle graphic with 4 corner anchor points and 5 preset buttons (`None`, `Small`, `Medium`, `Large`, `Pill`).
  5. Click `Pill`: Verify border radius changes to `9999px` and node renders as a pill on canvas.

### Gate 8: Automated Design System Token Extraction
- **Test Workflow**:
  1. Import a multi-color HTML snippet containing 6 variations of dark grays (`#111111`, `#111`, `rgb(17,17,17)`, `#121212`).
  2. Verify the CIELAB color clustering algorithm clusters them into a single primary background token (`#111111`).
  3. Change the token color in `StylesPanel`: Verify all bound nodes on canvas immediately reflect the updated color.

### Gate 9: Dynamic CMS Collections & Repeater Binding
- **Test Workflow**:
  1. Create a `Products` collection with 3 records (Title, Price, Image).
  2. Bind a canvas Grid to `Products`: Verify 3 product cards render with dynamic fields.
  3. Edit product price in CMS panel: Verify the canvas card label updates reactively.

### Gate 10: Production Verification & Zero Regression
- **Test Workflow**:
  1. Run TypeScript production compiler: `npm run build:prod` (`tsconfig.prod.json`). Ensure 0 errors, `sourceMap: false`, `removeComments: true`.
  2. Run Playwright E2E suite: `tests/e2e/p26-1-creative-intake.spec.ts`. Ensure 100% passing tests in live Chromium on `http://localhost:3010`.
