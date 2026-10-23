# 🪐 OrbitoX P26 — Master Implementation Roadmap (P26.1 – P26.14)
**Document ID:** `docs/P26_IMPLEMENTATION_ROADMAP.md`  
**Phase:** P26 Phase 0 (Execution Planning)  
**Status:** CANONICAL SPECIFICATION  
**Author:** Principal Product Architect & Engineering Program Lead  
**Date:** October 2026  

---

## 1. Executive Summary & Phased Execution Strategy

To ensure zero regression of existing Studio Zero features and maintain flawless stability across each milestone, P26 is organized into **14 strictly sequenced engineering phases**.

Each phase has concrete deliverables, strict verification gates, automated test requirements, and a defined rollback strategy.

---

## 2. Master Implementation Gantt & Dependency Sequence

```
P26.1: Canonical Import IR Core
  │
  ├──► P26.2: Code Ingestion (HTML/CSS/React/Tailwind)
  ├──► P26.3: Asset & Font Ingestion Pipeline
  │
  ├──► P26.4: Figma Bridge (REST API + .fig)
  ├──► P26.5: Adobe XD Bridge (.xd)
  ├──► P26.6: Shopify OS 2.0 Theme Adapter
  ├──► P26.7: WordPress Block Theme Adapter
  ├──► P26.8: Live Website URL Ingestion
  │
  ├──► P26.9: Professional System Clipboard Bridge
  ├──► P26.10: First-Class Right-Click Context Menu System
  │
  ├──► P26.11: Template & Marketplace Packaging (Ed25519)
  ├──► P26.12: Visual Diff & Import Correction Studio
  ├──► P26.13: Zero-Trust Security & Egress Hardening
  │
  ▼
P26.14: Master Creator Acceptance & Final E2E Sign-Off
```

---

## 3. Detailed Phase Breakdown

### Phase P26.1: Canonical Import IR & Package Scaffolding
- **Objective:** Establish `@orbitox-io/importer-core` package, define strongly-typed `ImportIR.ts`, and implement `SceneGraphCompiler.ts`.
- **Deliverables:**
  - `packages/importer-core/src/types/ImportIR.ts`
  - `packages/importer-core/src/compiler/SceneGraphCompiler.ts`
  - Unit tests verifying IR-to-SceneGraph roundtripping.
- **Verification Gate:** 100% test coverage on IR validation schemas; zero regression in existing schema loading.

### Phase P26.2: Code Ingestion (HTML5, CSS3, React/Next.js, Tailwind)
- **Objective:** Ingest raw code snippets and projects into editable SceneGraph subtrees.
- **Deliverables:**
  - `HtmlAdapter.ts` using DOMParser and PostCSS.
  - `ReactAdapter.ts` using Babel/SWC JSX AST traversal.
  - `TailwindDecompiler.ts` decoding utility classes into tokens and styles.
- **Verification Gate:** Importing a modern Tailwind landing page produces editable nodes with correctly extracted primary colors and typography tokens.

### Phase P26.3: Asset & Font Ingestion Pipeline
- **Objective:** Eliminate broken images and missing fonts during external ingestion.
- **Deliverables:**
  - `AssetLocalizer.ts` with SHA-256 deduplication and IndexedDB caching.
  - `FontIngestionService.ts` resolving Google Fonts and dynamic `@font-face` links.
  - `SvgOptimizer.ts` parsing SVGs into editable SceneGraph vector paths.
- **Verification Gate:** Imported project renders custom web fonts and local blob images offline without remote network requests.

### Phase P26.4: Figma Bridge (REST API + `.fig` Binary)
- **Objective:** Complete Figma interoperability.
- **Deliverables:**
  - `FigmaAdapter.ts` handling Figma REST API JSON AST.
  - Kiwi binary de-serializer for direct `.fig` file drag-and-drop.
  - Auto-layout to CSS Flex/Stack mapping engine.
- **Verification Gate:** Real-world Figma design file imports with components, text styling, and auto-layout spacing intact.

### Phase P26.5: Adobe XD Bridge (`.xd` Packages)
- **Objective:** Unlock legacy Adobe XD archives.
- **Deliverables:**
  - `XdAdapter.ts` parsing `.xd` ZIP containers, `manifest`, and `graphicContent.agc`.
  - Flow & Flex Inferrer converting absolute coordinates to responsive flex rows.
- **Verification Gate:** Adobe XD artboards import as individual pages/sections with native vector paths.

### Phase P26.6: Shopify OS 2.0 Theme Adapter
- **Objective:** Convert Shopify Dawn and commercial themes into editable OrbitoX templates.
- **Deliverables:**
  - `ShopifyAdapter.ts` parsing theme ZIP archives, `templates/*.json`, `sections/*.liquid`, `settings_data.json`.
  - Deterministic Liquid AST parser binding commerce variables to OrbitoX CMS.
- **Verification Gate:** Dawn theme ZIP imports into a multi-section page with functional product cards and theme colors.

### Phase P26.7: WordPress FSE & Block Theme Adapter
- **Objective:** Full Gutenberg block theme ingestion.
- **Deliverables:**
  - `WordPressAdapter.ts` tokenizing block comments (`<!-- wp:columns -->`) and extracting `theme.json` design tokens.
- **Verification Gate:** WordPress block theme imports into structured SceneGraph nodes with editable text and query loops.

### Phase P26.8: Live Website URL Ingestion
- **Objective:** Turn any live website into an editable OrbitoX project.
- **Deliverables:**
  - `UrlCrawlerAdapter.ts` running sandboxed headless browser to capture computed styles, DOM layout, and responsive breakpoints.
- **Verification Gate:** Pasting a live URL produces a responsive, editable multi-section canvas.

### Phase P26.9: Professional System Clipboard & Paste Special
- **Objective:** Operating-system-level clipboard interoperability.
- **Deliverables:**
  - `SystemClipboardBridge.ts` writing multi-MIME payloads (`application/vnd.orbitox.scenegraph+json`, `text/html`, `image/svg+xml`, `text/plain`).
  - Paste Special handlers ("Paste to Replace", "Paste into Selection", "Paste Styles Only").
  - "Copy as Code" generators (JSX, HTML, SVG, JSON).
- **Verification Gate:** Copying in one browser window and pasting into another window creates an exact duplicate with fresh IDs; external HTML pastes create editable nodes.

### Phase P26.10: First-Class Right-Click Context Menu System
- **Objective:** Figma-class contextual speed workflows.
- **Deliverables:**
  - `ContextMenuManager.tsx` and `CanvasContextMenu.tsx` overlay.
  - Full menu definitions for Canvas, Element, Component Instance, Section, Page, Asset, and Multi-Selection.
  - "Select Layer" deep ancestral drill-down submenu.
  - Full keyboard accessibility and edge-clamping logic.
- **Verification Gate:** Right-clicking anywhere on canvas, elements, or layer trees displays custom context menus with 100% functional command dispatching.

### Phase P26.11: Template & Marketplace Packaging (Ed25519)
- **Objective:** Safe packaging and publishing of imported designs.
- **Deliverables:**
  - Marketplace packager generating signed `.orbitox-template` bundles.
  - Ed25519 digital signature generation and verification.
  - License attribution scanner.
- **Verification Gate:** Templates cannot be published without valid cryptographic signature and license compliance checks.

### Phase P26.12: Visual Diff & Import Correction Studio
- **Objective:** Creator transparency and visual verification.
- **Deliverables:**
  - `ImportCorrectionStudio.tsx` with split-screen before/after slider.
  - Difference heatmap and one-click quick fix suggestions.
  - Confidence Score HUD badges.
- **Verification Gate:** Users can inspect discrepancies before committing the import transaction.

### Phase P26.13: Zero-Trust Security & Egress Hardening
- **Objective:** Uncompromising defense against malicious uploads.
- **Deliverables:**
  - DOMPurify HTML/SVG sanitizer.
  - Sandboxed iframe runtime boundary for custom code embeds.
  - SSRF egress proxy blocking private IP ranges.
- **Verification Gate:** Automated penetration tests verifying XSS payloads and zip bombs are neutralized without crashing the application.

### Phase P26.14: Master Creator Acceptance & Full Verification
- **Objective:** Complete end-to-end audit and sign-off.
- **Deliverables:**
  - Execution of all 11 Master P26 Acceptance Tests.
  - End-to-end browser walkthrough recording.
  - `P26_MASTER_ACCEPTANCE_REPORT.md`.
- **Verification Gate:** All tests pass with zero console errors and 100% creator workflow acceptance.

---

## 4. Rollback & Disaster Recovery Strategy

Each phase is committed as an isolated, atomic pull request. If an unexpected regression or performance degradation occurs:
1. **Feature Flags:** Ingestion adapters and context menus are guarded by feature flags (`FEATURE_UNIVERSAL_IMPORT`, `FEATURE_CONTEXT_MENU`).
2. **Atomic Rollback:** Reverting the feature flag instantly restores legacy behavior without requiring database rollbacks.
3. **Transaction Safety:** Failed imports dispatch `CANCEL_TRANSACTION`, leaving the active user project completely untouched.

*This concludes the Implementation Roadmap. Proceed to `docs/P26_ACCEPTANCE_PLAN.md`.*
