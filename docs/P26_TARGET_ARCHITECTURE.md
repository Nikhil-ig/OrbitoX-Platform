# 🪐 OrbitoX P26 — Target System Architecture Specification
**Document ID:** `docs/P26_TARGET_ARCHITECTURE.md`  
**Phase:** P26 Phase 0 (System Blueprint)  
**Status:** CANONICAL SPECIFICATION  
**Author:** Combined Principal Product Architect & Systems Engineering Team  
**Date:** October 2026  

---

## 1. Executive System Overview

The **OrbitoX P26 Target Architecture** elevates OrbitoX Studio Zero from a localized template editor into a **Universal Creative Operating System**. It establishes a modular, decoupled architecture consisting of two primary tiers:
1. **`@orbitox-io/importer-core` (Standalone Ingestion Engine):** An independent, headless, framework-agnostic TypeScript engine that transforms external formats into the canonical **Import IR**.
2. **Studio Zero Creative Interaction Layer:** First-class right-click context menus, multi-MIME OS clipboard bridges, visual diff correction studios, and transaction-safe store dispatchers.

---

## 2. Complete End-to-End Target Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 EXTERNAL INGESTION INPUTS                              │
│   Figma URL / .fig  │  Shopify Theme ZIP  │  WordPress Theme  │  React/JSX  │  Web URL │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        PACKAGE: @orbitox-io/importer-core                              │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                              SOURCE ADAPTER LAYER                              │   │
│   │   FigmaAdapter │ ShopifyAdapter │ WordPressAdapter │ HtmlAdapter │ ReactAdapter    │   │
│   │   XdAdapter    │ CanvaAdapter   │ WixAdapter       │ SvgAdapter  │ UrlAdapter      │   │
│   └───────────────────────────────────────┬────────────────────────────────────────┘   │
│                                           │                                            │
│                                           ▼                                            │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                     UNIVERSAL IMPORT IR (ImportedProject)                      │   │
│   │   - Metadata        - Design Tokens     - Pages & Sections                     │   │
│   │   - Normalized AST  - Asset Manifest    - Source Trace Map                     │   │
│   └───────────────────────────────────────┬────────────────────────────────────────┘   │
│                                           │                                            │
│                                           ▼                                            │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                      SEMANTIC PIPELINE & INFERENCE ENGINES                     │   │
│   │   ├── TokenExtractor (Delta-E Color Clustering, Google Fonts Matcher)          │   │
│   │   ├── LayoutInferrer (Bounding-Box Clustering, Absolute -> Flex/Grid)          │   │
│   │   ├── ComponentDetector (Pattern Clustering, Variant Matrix Builder)           │   │
│   │   ├── AssetLocalizer (Fetch, SHA-256 Deduplication, WebP Transcoding)          │   │
│   │   └── SecuritySanitizer (DOMPurify, Script Neutralizer, Egress Proxy)          │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                      STUDIO ZERO APPLICATION INTEGRATION LAYER                         │
│                                                                                        │
│   ┌─────────────────────────────────┐           ┌──────────────────────────────────┐   │
│   │       IMPORT CENTER UX          │           │     INTERACTION SYSTEMS          │   │
│   │   - Drag-and-Drop Ingestion Hub │           │   - ContextMenuManager           │   │
│   │   - Interactive Mapping Modal   │           │   - SystemClipboardBridge        │   │
│   │   - Split-Screen Visual Diff    │           │   - Nested Layer Drill-Down      │   │
│   │   - Confidence Score HUD        │           │   - Paste Special Handler        │   │
│   └────────────────┬────────────────┘           └────────────────┬─────────────────┘   │
│                    │                                             │                     │
│                    └──────────────────────┬──────────────────────┘                     │
│                                           │                                            │
│                                           ▼                                            │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                      TRANSACTIONAL EDITOR STATE STORE                          │   │
│   │   TemplateEditorStore (BEGIN_TRANSACTION -> Hydrate SceneGraph -> COMMIT)      │   │
│   │   - History & Undo/Redo Stacks                                                 │   │
│   │   - SceneGraphEngine & Validation Gates                                        │   │
│   │   - AssetIndexedDBService & Persistence                                        │   │
│   └───────────────────────────────────────┬────────────────────────────────────────┘   │
│                                           │                                            │
│                                           ▼                                            │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                        HIGH-FIDELITY CANVAS RENDERER                           │   │
│   │   SceneGraphRenderer │ CanvasInteractionLayer │ SmartGuides │ NodeAdapters     │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Package Blueprint: `@orbitox-io/importer-core`

A new high-performance, strictly-typed package created in `orbitox/packages/importer-core/`:

```
orbitox/packages/importer-core/
├── package.json               ──► Published under @orbitox-io/importer-core
├── tsconfig.json
├── src/
│   ├── index.ts               ──► Public API exports
│   ├── types/
│   │   ├── ImportIR.ts        ──► Canonical IR types (ImportedProject, ImportedNode, etc.)
│   │   └── Adapter.ts         ──► SourceAdapter interface contracts
│   ├── adapters/
│   │   ├── BaseAdapter.ts
│   │   ├── FigmaAdapter.ts
│   │   ├── ShopifyAdapter.ts
│   │   ├── WordPressAdapter.ts
│   │   ├── HtmlAdapter.ts
│   │   ├── ReactAdapter.ts
│   │   ├── XdAdapter.ts
│   │   ├── CanvaAdapter.ts
│   │   ├── WixAdapter.ts
│   │   ├── SvgAdapter.ts
│   │   └── UrlCrawlerAdapter.ts
│   ├── pipeline/
│   │   ├── TokenExtractor.ts
│   │   ├── LayoutInferrer.ts
│   │   ├── ComponentDetector.ts
│   │   ├── AssetLocalizer.ts
│   │   └── SecuritySanitizer.ts
│   └── compiler/
│       └── SceneGraphCompiler.ts──► Converts Import IR into native OrbitoX SceneGraph
```

---

## 4. Studio Zero Interaction Architecture Components

### 4.1 `ContextMenuManager.tsx` & `CanvasContextMenu.tsx`
- Mounts as a top-level overlay in `OrbitoXVisualCanvas.tsx`.
- Listens to `onContextMenu` across canvas backdrop, nodes, section dividers, and layer items.
- Manages positioning, edge flipping, keyboard accessibility, and submenus.

### 4.2 `SystemClipboardBridge.ts`
- Global singleton listening to `copy`, `cut`, `paste` events.
- Writes multi-MIME payloads (`application/vnd.orbitox.scenegraph+json`, `text/html`, `image/svg+xml`, `text/plain`).
- Handles external pastes by piping payloads directly into `importer-core`.

### 4.3 `ImportCenterModal.tsx` & `ImportCorrectionStudio.tsx`
- Modern, glassmorphic modal accessible from the Top Bar and Command Palette (`⌘K -> Import`).
- Allows drag-and-drop of ZIP files, `.fig`, `.xd`, HTML, or pasting URLs/code.
- Provides live confidence reports, token inspection, and side-by-side visual diff before committing.

*This concludes the Target System Architecture. Proceed to `docs/P26_IMPLEMENTATION_ROADMAP.md`.*
