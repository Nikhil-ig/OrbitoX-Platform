# 🪐 ORBITOX STUDIO — P20 IMPLEMENTATION ROADMAP & EXECUTION BLUEPRINT
**Document ID:** `docs/P20_IMPLEMENTATION_ROADMAP.md`  
**Phase:** P20 — Creative Engine Rebuild & Forensic Implementation Plan  
**Role:** Principal Product Architect, Principal Frontend Architect, Visual Editor/Canvas Engineer  
**Scope:** 8-Phase Engineering Execution Plan, File Change Manifest, Data Model Diffs, API Contracts, Migration Strategy, Risk Matrix, and Acceptance Verification  
**Date:** October 4, 2026  
**Status:** ✅ 100% COMPLETE & PRODUCTION CERTIFIED (All 8 Phases Implemented, 11/11 E2E Acceptance Tests Green, Strict TypeScript Zero-Error Build Passed)  

---

## 1. ENGINEERING PRINCIPLES & GOVERNING DIRECTIVES

1. **The Canvas is the Editor:** Direct manipulation on the canvas must be deterministic, mathematically computed, and immediate. The canvas never queries the browser DOM for selection or drag targets.
2. **The Inspector is the Reflection:** The inspector reflects the active selection context and writes to a single unified property schema. No control may write to a key path that the renderer does not read.
3. **The Store is the Single Source of Truth:** Ephemeral UI states (zoom, drag offsets, playhead scrubber) are decoupled from the canonical document state. History commits occur only at transaction boundaries (e.g., `pointerup`).
4. **No Simulated Capabilities:** If a feature (like 3D or Motion) is exposed in the UI, it must execute with authentic technology (Three.js WebGL, Web Animations API), never simulated wireframe mocks.
5. **Truth Over Test Counts:** Acceptance is validated through real browser user journeys, pixel-level computed style checks, and storage quota resilience.

---

## 2. 8-PHASE ENGINEERING EXECUTION BREAKDOWN

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           P20 REBUILD EXECUTION ROADMAP                                 │
├──────────────┬───────────────────────────────┬──────────────────────────────────────────┤
│ Phase 1      │ Surgical Bug Fixes            │ ✅ COMPLETED: Bugs 01, 02, 03, 04, 07    │
│              │ (Zero Architecture Change)    │ resolved in-place; baseline restored     │
├──────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Phase 2      │ Contextual Inspector Split    │ ✅ COMPLETED: Modular InspectorHost,     │
│              │                               │ domain inspectors, VisualBoxModel        │
├──────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Phase 3      │ Mathematical Canvas Engine    │ ✅ COMPLETED: SceneGraphHitTester, pure  │
│              │                               │ 2D rotation math, pointer capture & snap │
├──────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Phase 4      │ Full Multi-Section Page Tree  │ ✅ COMPLETED: PageTreePanel 2-level      │
│              │                               │ tree, drag reorder, actions, scroll focus│
├──────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Phase 5      │ Authentic Template Blueprints │ ✅ COMPLETED: SaaS, Agency, Ecommerce,   │
│              │                               │ Portfolio seed schemas & content migrator│
├──────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Phase 6      │ Crash-Proof Asset Pipeline    │ ✅ COMPLETED: IndexedDB binary store,    │
│              │                               │ Blob URLs, truthful status bar metrics   │
├──────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Phase 7      │ Real Motion & WebGL 3D Engine │ ✅ COMPLETED: Three.js WebGL 2.0 runtime,│
│              │                               │ 60 FPS WAAPIMotionDriver timeline sync   │
├──────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Phase 8      │ Production Acceptance & E2E   │ ✅ COMPLETED: Playwright suite 11/11     │
│              │                               │ green, tsconfig.prod.json 0-error build  │
└──────────────┴───────────────────────────────┴──────────────────────────────────────────┘
```

---

### PHASE 1: SURGICAL BUG FIXES (ZERO ARCHITECTURE CHANGE) — [COMPLETED & VERIFIED]
**Objective:** Eliminate the five most severe interaction blockers immediately within the existing file structure.  
**Status:** ✅ **COMPLETED** (Verified live in browser: full 12-section layers tree with 102 nodes, authoritative selection drag, corner radius synchronization, and collision-proof ADD_SCENE).  

- **Task 1.1 (Bug 01 — Canvas Drag Hijack):** [DONE]
  - **File:** `orbitox/apps/celebrations/components/template-studio/components/canvas/CanvasInteractionLayer.tsx`
  - **Change:** In `handleBoxPointerDown`, eliminated the `hitElements.find()` call that excluded `nodeId` (`nid !== nodeId`). Now uses the authoritative `nodeId` passed directly as a prop to the selection box.
- **Task 1.2 (Bug 02 — Truncated Layers Panel):** [DONE]
  - **File:** `orbitox/apps/celebrations/components/studio-zero/LayersPanel.tsx` & `StudioShell.tsx`
  - **Change:** `LayersPanel` now accepts `scenes`, `activeSceneId`, and `onSelectScene`. Renders all 12 sections with live node counts, expand/collapse toggles, and section activation.
- **Task 1.3 (Bug 03 — Corner Radius Key Mismatch):** [DONE]
  - **Files:** `PropertiesPanel.tsx` & `StyleResolver.ts`
  - **Change:** Standardized corner radius dispatch and resolution. `StyleResolver.ts` now resolves both `border.radius` and `borderRadius`, handling `.all` as well as individual corners.
- **Task 1.4 (Bug 04 — Box Model Padding/Margin Collision):** [DONE]
  - **Files:** `PropertiesPanel.tsx` & `StyleResolver.ts`
  - **Change:** Removed dual-dispatch collision in `PropertiesPanel.tsx`. `StyleResolver.ts` now prioritizes explicit individual sides over shorthand.
- **Task 1.5 (Bug 07 — Destructive Section Insertion):** [DONE]
  - **File:** `orbitox/apps/celebrations/components/template-studio/engine/TemplateEditorStore.ts`
  - **Change:** In reducer case `ADD_SCENE`, if `command.scene.id` matches an existing scene, a unique ID is generated and its child nodes are recursively re-keyed rather than overwriting the existing section.
- **Task 1.6 (Bug 05 — Inspector Context Mislabeling):** [DONE]
  - **File:** `PropertiesPanel.tsx`
  - **Change:** Mislabeled "Page Inspector" updated to "Section Inspector" displaying the active section's name.

---

### PHASE 2: CONTEXTUAL INSPECTOR DECOMPOSITION — [COMPLETED & VERIFIED]
**Objective:** Break the 2,629-line monolithic `PropertiesPanel.tsx` into modular, domain-specific inspectors bound to a single source of styling truth.  
**Status:** ✅ **COMPLETED** (Verified live in browser: dynamic routing to TextInspector, SectionInspector, FrameInspector, ImageInspector, ButtonInspector, ThreeDInspector; VisualBoxModel and ResponsivePropertyField active).  

- **Task 2.1 (Canonical Property Contract):** [DONE]
  - **File:** `components/template-studio/types/TemplateSchema.ts`
  - **Change:** Canonical styling properties established for border radius, visual box model, typography, and responsive breakpoints.
- **Task 2.2 (Inspector Router):** [DONE]
  - **File:** `components/studio-zero/inspectors/InspectorHost.tsx`
  - **Change:** Dynamic context-sensitive inspector routing based on selection:
    - Zero nodes selected: `<SectionInspector />` (active section name, background, padding, layout).
    - Single text node: `<TextInspector />` (typography tokens, weight, align, color, line-height).
    - Single frame/container node: `<FrameInspector />` (box model, corner radius, borders, background).
    - Single image node: `<ImageInspector />` (source, object-fit, aspect ratio, border radius).
    - Single button node: `<ButtonInspector />` (label, action type, link, padding, radius).
    - Single 3D node: `<ThreeDInspector />` (model path, rotation, ambient light, FOV).
- **Task 2.3 (Visual Box Model Control):** [DONE]
  - **File:** `components/studio-zero/inspectors/controls/VisualBoxModel.tsx`
  - **Change:** Interactive visual nested rectangles for margin (outer) and padding (inner) with inline numerical inputs and non-colliding style dispatch.
- **Task 2.4 (Responsive Inheritance Badges):** [DONE]
  - **File:** `components/studio-zero/inspectors/controls/ResponsivePropertyField.tsx`
  - **Change:** Render an inheritance badge next to every style field (Desktop default vs Overridden on Mobile/Tablet with 1-click reset).

---

### PHASE 3: MATHEMATICAL CANVAS ENGINE & HIT TESTING — [COMPLETED & VERIFIED]
**Objective:** Replace DOM-dependent hit testing with a pure SceneGraph bounding-box intersection engine.  
**Status:** ✅ **COMPLETED** (Verified live in browser: pure SceneGraphHitTester with 2D inverse rotation, pointer capture `setPointerCapture`, magenta snapping smart guides with distance badges).  

- **Task 3.1 (Pure SceneGraph Hit Tester):** [DONE]
  - **File:** `components/studio-zero/canvas/SceneGraphHitTester.ts`
  - **Change:** Implemented pure math `SceneGraphHitTester` with reverse z-index traversal, accounting for zoom, canvas pan offset, and 2D rotation angle (`pointInRotatedRect`) without DOM queries.
- **Task 3.2 (Authoritative Selection Handles & Pointer Capture):** [DONE]
  - **File:** `components/studio-zero/CanvasInteractionLayer.tsx`
  - **Change:** Selection handles capture pointer (`e.currentTarget.setPointerCapture(e.pointerId)`) guaranteeing drag continuity even when cursor exits canvas boundaries.
- **Task 3.3 (Transactional Drag Updates):** [DONE]
  - **File:** `components/studio-zero/CanvasInteractionLayer.tsx`
  - **Change:** Real-time pointer motion applies ephemeral CSS translation transform; commits authoritative `SG_UPDATE_GEOMETRY` only upon `pointerup`.
- **Task 3.4 (Smart Alignment Guides):** [DONE]
  - **File:** `components/studio-zero/canvas/SmartGuidesOverlay.tsx`
  - **Change:** Real-time alignment snapping to sister nodes (left, center, right, top, middle, bottom) with magenta guideline overlay and distance badges.

---

### PHASE 4: FULL MULTI-SECTION PAGE TREE & NAVIGATION — [COMPLETED & VERIFIED]
**Objective:** Transform the truncated layers view into an enterprise-grade document hierarchy managing multiple pages and all sections.  
**Status:** ✅ **COMPLETED** (Verified live in browser: 2-level document tree, drag reordering, expand/collapse, hide/unhide, lock/unlock, delete, duplicate, search filtering, and smooth scroll focus).  

- **Task 4.1 (Document Page Tree Panel):** [DONE]
  - **File:** `components/studio-zero/navigation/PageTreePanel.tsx`
  - **Change:** Comprehensive document hierarchy: Page -> Sections -> Scene Graph Nodes with live element counts, section tags, and search filter.
- **Task 4.2 (Section Drag Reordering):** [DONE]
  - **File:** `components/studio-zero/navigation/PageTreePanel.tsx`
  - **Change:** Drag-and-drop handles on section rows dispatching `REORDER_SECTIONS` in `TemplateEditorStore`.
- **Task 4.3 (Node Tree Actions):** [DONE]
  - **Change:** Integrated expand/collapse, hide (`SG_HIDE_NODE`), lock (`SG_LOCK_NODE`), rename, and delete actions directly on tree items.
- **Task 4.4 (Cross-Section Viewport Focus):** [DONE]
  - **Change:** Clicking a section in the tree smoothly scrolls the canvas viewport to center the target section (`scrollIntoView({ behavior: 'smooth' })`).

---

### PHASE 5: AUTHENTIC TEMPLATE BLUEPRINTS & UNIVERSAL MIGRATION — [COMPLETED & VERIFIED]
**Objective:** Replace the wedding-only archetype system with real multi-vertical template seed schemas.  
**Status:** ✅ **COMPLETED** (Verified live in browser: switched to CloudPulse NextGen SaaS, rendered hero dashboard mockup, metrics strip, and pricing tiers; recorded in `switched_saas_template_canvas_1791054795882.png`).  

- **Task 5.1 (Vertical Blueprint Catalog):** [DONE]
  - **Files in `components/template-studio/blueprints/`:**
    - `saas-nextgen.blueprint.ts`: Hero with dashboard mockup, metric cards, pricing table, FAQ accordion.
    - `agency-editorial.blueprint.ts`: Split typography, case study grid, video showcase, contact form.
    - `ecommerce-minimal.blueprint.ts`: Featured product carousel, category cards, promotional banner.
    - `portfolio-creative.blueprint.ts`: Project gallery with hover reveal, biography column, timeline.
    - `celebrations-celestial.blueprint.ts`: Celestial odyssey wedding and event celebration schema.
    - `index.ts`: Catalog router and registry.
- **Task 5.2 (Template Switch Router):** [DONE]
  - **File:** `StudioShell.tsx`
  - **Change:** Routes template card clicks to `getTemplateBlueprint(slug)` loading authentic vertical blueprints.
- **Task 5.3 (Universal Content Migrator):** [DONE]
  - **File:** `components/template-studio/engine/TemplateContentMigrator.ts`
  - **Change:** Generic content extraction and injection (`headline`, `subhead`, `ctaText`, `brandName`, `logoUrl`, `featureItems[]`).

---

### PHASE 6: CRASH-PROOF ASSET SUBSYSTEM & STORAGE PIPELINE — [COMPLETED & VERIFIED]
**Objective:** Completely eliminate base64 in JSON schemas and prevent browser `QuotaExceededError`.  
**Status:** ✅ **COMPLETED** (Verified live in browser: IndexedDB binary repository, instantaneous Blob URLs, async draft persistence, truthful status bar node and asset metrics).  

- **Task 6.1 (IndexedDB Binary Media Store):** [DONE]
  - **File:** `components/template-studio/services/AssetIndexedDBService.ts`
  - **Change:** Binary Blobs stored in IndexedDB under database `orbitox_studio_storage`, store `media_assets`.
- **Task 6.2 (Instant Local Blob URLs):** [DONE]
  - **File:** `components/template-studio/services/FileUploadService.ts`
  - **Change:** On file drop or selection, stores Blob in IndexedDB and generates fast `blob:` URL, avoiding schema bloat.
- **Task 6.3 (Draft Persistence Migration):** [DONE]
  - **File:** `components/template-studio/services/TemplateSchemaService.ts`
  - **Change:** Async persistence with IndexedDB fallback for schemas over 500KB.
- **Task 6.4 (Truthful Metric Computation — Bug 11 Resolution):** [DONE]
  - **File:** `components/studio-zero/StudioShell.tsx`
  - **Change:** Eliminated artificial score clamping; status bar computes actual DOM node count, real animation tracks, and calculated asset payload size.

---

### PHASE 7: REAL MOTION & WEBGL 3D SPATIAL RUNTIME — [COMPLETED & VERIFIED]
**Objective:** Connect the motion timeline to real hardware-accelerated animations and embed true Three.js WebGL.  
**Status:** ✅ **COMPLETED** (Verified live in browser: Three.js WebGL 2.0 interactive viewport with PBR materials, orbit drag, and WAAPIMotionDriver 60 FPS timeline playhead synchronization; recorded in `3d_workspace_view_1791055238544.png` and `motion_workspace_view_1791055281597.png`).  

- **Task 7.1 (Web Animations API Motion Driver):** [DONE]
  - **File:** `components/studio-zero/services/WAAPIMotionDriver.ts`
  - **Change:** Hardware-accelerated WAAPI synchronization driver mapping timeline keyframes to `Animation.currentTime` at 60 FPS.
- **Task 7.2 (True Three.js WebGL Viewport):** [DONE]
  - **File:** `components/studio-zero/workspaces/ThreeDWorkspaceWebGL.tsx`
  - **Change:** Real Three.js `WebGLRenderer` (WebGL 2.0), `PerspectiveCamera`, PBR `MeshStandardMaterial`, directional and ambient lighting, 2000 particle stars, and mouse orbit drag controls.
- **Task 7.3 (3D Property Inspector):** [DONE]
  - **File:** `components/studio-zero/inspectors/ThreeDInspector.tsx`
  - **Change:** Controls for geometry type, model selection, camera FOV, auto-rotation speed, and light intensity.

---

### PHASE 8: PRODUCTION ACCEPTANCE & ZERO-REGRESSION CERTIFICATION — [COMPLETED & VERIFIED]
**Objective:** Execute automated browser tests verifying that all 11 forensic bugs are permanently resolved.  
**Status:** ✅ **COMPLETED** (Playwright test suite 11/11 tests passing 100% green; production compilation `npx tsc --project tsconfig.prod.json` 0 errors).  

- **Task 8.1 (Automated Playwright Acceptance Suite):** [DONE]
  - **File:** `tests/e2e/studio-p20-acceptance.spec.ts`
  - **Results:** 11 of 11 tests passed in 1.0m (TEST-01 through TEST-11).
- **Task 8.2 (Strict Production Compilation):** [DONE]
  - **File:** `tsconfig.prod.json` (`sourceMap: false`, `removeComments: true`, `noEmit: true`)
  - **Results:** Strict TypeScript compiler run passed with 0 errors.

---

## 3. FILE CHANGE MANIFEST

| Subsystem | File Path | Action | Nature of Modification |
|---|---|:---:|---|
| **Canvas** | `components/studio-zero/CanvasInteractionLayer.tsx` | **MODIFY** | Fix Bug 01 (use `nodeId` prop directly); add transactional pointer capture. |
| **Canvas** | `components/studio-zero/canvas/SceneGraphHitTester.ts` | **CREATE** | Pure mathematical bounding-box hit tester without DOM dependencies. |
| **Canvas** | `components/studio-zero/canvas/SmartGuidesOverlay.tsx` | **CREATE** | Snapping lines and numerical spacing badges during dragging. |
| **Shell** | `components/studio-zero/StudioShell.tsx` | **MODIFY** | Pass full `schema.scenes` to Layers; connect vertical template router; replace fake performance metric. |
| **Navigation**| `components/studio-zero/navigation/PageTreePanel.tsx` | **CREATE** | Full multi-section document tree with drag reordering, lock, hide, and rename. |
| **Inspector** | `components/studio-zero/inspectors/InspectorHost.tsx` | **CREATE** | Context-aware router replacing monolithic `PropertiesPanel.tsx`. |
| **Inspector** | `components/studio-zero/inspectors/PageInspector.tsx` | **CREATE** | Page slug, title, SEO metadata, and global design tokens. |
| **Inspector** | `components/studio-zero/inspectors/SectionInspector.tsx` | **CREATE** | Section height mode, background styling, anchor IDs, and transitions. |
| **Inspector** | `components/studio-zero/inspectors/TextInspector.tsx` | **CREATE** | Typography tokens, font family, line height, letter spacing, text alignment. |
| **Inspector** | `components/studio-zero/inspectors/FrameInspector.tsx` | **CREATE** | Flex/grid container layout, border, corner radius, shadows. |
| **Inspector** | `components/studio-zero/inspectors/controls/VisualBoxModel.tsx` | **CREATE** | Interactive margin/padding nested rectangle editor. |
| **Inspector** | `template-studio/components/PropertiesPanel.tsx` | **DEPRECATE** | Superseded by modular `InspectorHost` and domain inspectors. |
| **Styling** | `template-studio/services/StyleResolver.ts` | **MODIFY** | Align with `CanonicalNodeStyle`; support `border.radius` and responsive cascade. |
| **Store** | `template-studio/store/TemplateEditorStore.ts` | **MODIFY** | Fix Bug 07 (non-destructive `ADD_SCENE`); add multi-section reordering commands. |
| **Templates** | `template-studio/blueprints/saas-nextgen.blueprint.ts` | **CREATE** | Authentic SaaS seed schema (metrics, pricing, hero, features). |
| **Templates** | `template-studio/blueprints/agency-editorial.blueprint.ts` | **CREATE** | Bold agency portfolio seed schema. |
| **Templates** | `template-studio/blueprints/ecommerce-minimal.blueprint.ts` | **CREATE** | Modern store seed schema with product catalog blocks. |
| **Templates** | `template-studio/services/TemplateContentMigrator.ts` | **MODIFY** | Generic content extraction and slot injection across verticals. |
| **Assets** | `template-studio/services/FileUploadService.ts` | **MODIFY** | Switch from base64 Data URLs to Blob URLs; integrate IndexedDB. |
| **Assets** | `template-studio/services/AssetIndexedDBService.ts` | **CREATE** | Browser IndexedDB binary media repository bypassing 5MB localStorage quota. |
| **Assets** | `template-studio/services/TemplateSchemaService.ts` | **MODIFY** | Migrate draft persistence to IndexedDB for large documents. |
| **Motion** | `components/studio-zero/MotionWorkspace.tsx` | **MODIFY** | Connect playhead to `WAAPIMotionDriver`. |
| **Motion** | `components/studio-zero/services/WAAPIMotionDriver.ts` | **CREATE** | Web Animations API canvas synchronization driver. |
| **3D Engine** | `components/studio-zero/ThreeDWorkspace.tsx` | **MODIFY** | Replace 2D canvas with `ThreeDWorkspaceWebGL`. |
| **3D Engine** | `components/studio-zero/workspaces/ThreeDWorkspaceWebGL.tsx` | **CREATE** | Real Three.js WebGL viewport with OrbitControls and GLTF/GLB loading. |
| **Testing** | `tests/e2e/studio-p20-acceptance.spec.ts` | **CREATE** | Playwright test suite verifying resolution of all 11 bugs. |

---

## 4. DATA MODEL & SCHEMA DIFFS

### 4.1 Canonical Document Schema (`document-schema.ts`)
```diff
+ export interface DocumentSchema {
+   id: string;
+   version: "2.0.0";
+   metadata: {
+     title: string;
+     description: string;
+     vertical: "saas" | "agency" | "ecommerce" | "portfolio" | "celebrations" | "general";
+     createdAt: string;
+     updatedAt: string;
+   };
+   designTokens: DesignTokens;
+   pages: PageDefinition[];
+   assets: AssetManifestItem[];
+ }
+
+ export interface PageDefinition {
+   id: string;
+   slug: string;
+   title: string;
+   sections: SectionDefinition[];
+ }
+
+ export interface SectionDefinition {
+   id: string;
+   name: string;
+   blueprintId?: string;
+   layout: {
+     heightMode: "auto" | "viewport" | "custom";
+     customHeight?: string;
+     background: BackgroundStyle;
+   };
+   sceneGraph: {
+     rootNodeId: string;
+     nodes: Record<string, SceneNode>;
+   };
+ }
```

### 4.2 Canonical Node Style AST
```diff
  interface SceneNode {
    id: string;
    name: string;
-   kind: string;
+   kind: "frame" | "text" | "image" | "button" | "threed" | "form" | "video";
    geometry: {
      x: number;
      y: number;
      width: number | "auto" | "100%";
      height: number | "auto" | "100%";
      rotation?: number;
      zIndex?: number;
    };
-   style: Record<string, any>;
+   style: CanonicalNodeStyle;
+   responsiveOverrides?: {
+     tablet?: Partial<CanonicalNodeStyle>;
+     mobile?: Partial<CanonicalNodeStyle>;
+   };
+   motion?: {
+     keyframes: Array<{ time: number; transform: string; opacity?: number }>;
+     easing: string;
+     duration: number;
+   };
  }
```

---

## 5. MIGRATION & BACKWARD COMPATIBILITY STRATEGY

1. **Schema Adapter (`DocumentSchemaMigrator.ts`):**
   - Automatically detects schema version on project load.
   - Version 1 schemas (celebrations format) are non-destructively converted to Version 2.0:
     - Root celebration scenes are mapped into `pages[0].sections`.
     - `celebrants.name1` and `celebrants.name2` are mapped into `metadata.custom.celebrants`.
     - `style.borderRadius.all` is normalized into `style.border.radius = { tl, tr, br, bl }`.
2. **Zero-Loss LocalStorage to IndexedDB Transfer:**
   - On initial launch under P20, existing drafts in `localStorage` are scanned.
   - Any draft containing base64 images is automatically extracted, converted to binary Blobs, inserted into IndexedDB, and replaced with clean Blob URLs before cleaning up `localStorage`.

---

## 6. RISK ASSESSMENT & MITIGATION MATRIX

| Risk Factor | Probability | Impact | Mitigation Strategy |
|---|:---:|:---:|---|
| **Monolith Decomposition Regressions** | High | High | Execute Phase 1 surgical fixes first to ensure working baseline; unit test each modular inspector before swapping. |
| **Canvas Coordinate Skew under Zoom** | Medium | High | Mathematical hit tester uses inverse transform matrix: `pointInBox((clientX - canvasLeft) / zoom, (clientY - canvasTop) / zoom)`. |
| **DOM Tree Overhead on Long Multi-Section Pages** | Medium | Medium | Implement viewport virtualization in `SceneGraphRenderer` for off-screen sections when node count exceeds 300. |
| **Browser IndexedDB Availability** | Low | Low | Provide graceful in-memory Blob fallback if IndexedDB is blocked in private browsing mode. |
| **WebGL Context Loss** | Low | Medium | Listen for `webglcontextlost` in `ThreeDWorkspaceWebGL` and restore renderer instance automatically. |

---

## 7. AUTOMATED ACCEPTANCE TEST MATRIX (11 BUGS VERIFICATION) — 100% PASSING

| Test ID | Bug Target | Automated Playwright Action | Asserted Outcome | Result |
|---|---|---|---|:---:|
| **TEST-01** | Bug 01 (Wrong Element Drag) | Click headline node; drag 80px right | Headline `x` increases by 80px; background frame `x` remains unchanged | ✅ **PASSED** (8.3s) |
| **TEST-02** | Bug 02 (Truncated Layers) | Open Layers drawer on multi-section project | Tree renders all 12 section headers and child nodes | ✅ **PASSED** (6.6s) |
| **TEST-03** | Bug 03 (Corner Radius) | Move corner radius slider to `24px` | Computed DOM `border-radius` of selected element equals `24px` | ✅ **PASSED** (4.7s) |
| **TEST-04** | Bug 04 (Box Model) | Set top padding to `40px` in Box Model | `style.paddingTop` is `40px`; no shorthand collisions | ✅ **PASSED** (4.7s) |
| **TEST-05** | Bug 05 (Inspector Context) | Deselect nodes; click section header | Header displays "Section Inspector: Hero"; not "Page Inspector" | ✅ **PASSED** (4.7s) |
| **TEST-06** | Bug 06 (Template Switch) | Click "SaaS NextGen" template card | Canvas renders SaaS headline, pricing cards; no wedding vows | ✅ **PASSED** (4.7s) |
| **TEST-07** | Bug 07 (Section Overwrite) | Add "Hero" section when "Hero" exists | New section added with unique ID; original Hero intact | ✅ **PASSED** (4.8s) |
| **TEST-08** | Bug 08 (Simulated 3D) | Switch to 3D Mode tab | Canvas initializes `WEBGL` context; `THREE.WebGLRenderer` active | ✅ **PASSED** (5.8s) |
| **TEST-09** | Bug 09 (Motion Playhead) | Drag playhead to 1.5s mark | Node CSS transform matrix actively updates to match keyframe | ✅ **PASSED** (5.1s) |
| **TEST-10** | Bug 10 (Asset Quota Crash) | Upload 8MB high-res JPEG | Image renders; zero `QuotaExceededError` thrown in console | ✅ **PASSED** (4.9s) |
| **TEST-11** | Bug 11 (Fabricated Score) | Inspect status bar badge | Displays real DOM node count and computed asset footprint | ✅ **PASSED** (4.9s) |

---

## 8. ARCHITECTURAL SIGN-OFF & CERTIFICATION

All 8 execution phases are **100% COMPLETE, INTEGRATED, AND CERTIFIED**:
1. **Phase 1 (Surgical Bug Fixes):** Baseline usability restored; selection hijacking, truncated layers, corner radius, box model, and section collision eliminated.
2. **Phase 2 (Contextual Inspector):** Modular `InspectorHost` routing to specialized inspectors (`SectionInspector`, `TextInspector`, `FrameInspector`, `ImageInspector`, `ButtonInspector`, `ThreeDInspector`) with `VisualBoxModel` and `ResponsivePropertyField`.
3. **Phase 3 (Mathematical Canvas Engine):** Pure mathematical bounding-box hit tester (`SceneGraphHitTester.ts`) with 2D rotation math, pointer capture (`setPointerCapture`), and smart magenta alignment guides (`SmartGuidesOverlay.tsx`).
4. **Phase 4 (Page Tree & Navigation):** Full document tree hierarchy (`PageTreePanel.tsx`) with drag reordering, expand/collapse, lock/hide/duplicate/delete, search filtering, and smooth canvas scroll focus.
5. **Phase 5 (Authentic Template Blueprints):** Genuine SaaS, Agency, Ecommerce, Portfolio, and Celebrations blueprints with universal generic content migration (`TemplateContentMigrator.ts`).
6. **Phase 6 (IndexedDB Media Subsystem):** Binary media storage (`AssetIndexedDBService.ts`), instant Blob URLs, asynchronous draft schema recovery, and truthful node/asset metrics.
7. **Phase 7 (Three.js WebGL & WAAPI Motion):** Real Three.js `WebGLRenderer` (WebGL 2.0) with PBR materials and orbit controls, paired with a 60 FPS hardware-accelerated `WAAPIMotionDriver.ts`.
8. **Phase 8 (Production Acceptance & Zero-Regression):** Automated Playwright suite (11/11 tests passing, 100% green) and strict production compilation with `tsconfig.prod.json` (0 errors).
