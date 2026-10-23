# 🪐 OrbitoX P26 — Comprehensive Current Import & Creative Interaction Audit
**Document ID:** `docs/P26_CURRENT_IMPORT_AUDIT.md`  
**Phase:** P26 Phase 0 (Forensic Audit)  
**Status:** COMPLETE FORENSIC AUDIT  
**Author:** Combined Principal Creative Tool Architecture & Engineering Team  
**Date:** October 2026  

---

## 1. Executive Summary

A comprehensive, ground-truth forensic audit of OrbitoX Studio Zero (located in `orbitox/apps/celebrations/components/template-studio/`) was performed to evaluate its readiness for **Universal Import**, **Figma/Canva-class Creative Interoperability**, **Right-Click Context Menu Systems**, and **Professional Clipboard Architecture**.

### Key Findings at a Glance
1. **Import Capability:** **0% External Interoperability.** The current editor can only load hardcoded internal template schemas (`BUILTIN_SCHEMAS`, `BLUEPRINT_CATALOG`) or deserialize previously saved JSON snapshots from `localStorage`/`IndexedDB`. There is **zero ability** to import HTML, CSS, JavaScript, React/JSX, Figma files/APIs, Adobe XD, Canva exports, Shopify themes, WordPress themes, or live website URLs.
2. **Right-Click Context System:** **0% Implementation.** The codebase contains **zero** `onContextMenu` or `contextmenu` event listeners across all canvas components, layer trees, and inspector panels. Right-clicking anywhere triggers the browser's default native context menu (`Back`, `Forward`, `Inspect`, `Save As...`), completely breaking the illusion of a native creative application.
3. **Clipboard Architecture:** **Isolated In-Memory Only.** `SceneGraphClipboard.ts` exists but operates purely as a private static in-memory JavaScript variable (`private static clipboard: ClipboardEntry | null`). It has no connection to the browser `navigator.clipboard` API, supports zero system MIME types (`text/html`, `image/png`, `application/json`), cannot copy/paste across browser tabs, lacks "Paste Special" or "Paste to Replace", and provides no "Copy as Code" (React/JSX/HTML/SVG) capabilities.
4. **Asset Pipeline:** **Local Blob Storage Only.** `AssetIndexedDBService.ts` can store binary Blobs up to browser storage limits, but lacks remote asset ingestion, CORS proxies, SVG optimization pipelines, automated CSS image URL rewriting, or font auto-registration (`@font-face` / Google Fonts API).
5. **Renderer & Canvas Selection:** High-fidelity scene graph rendering exists (`SceneGraphRenderer.tsx` + `CanvasInteractionLayer.tsx`), but selection is strictly single-pointer left-click with DOM delegation (`closest('[data-node-id]')`), lacking right-click hit testing, deep layer drill-down menus, and multi-selection context actions.

---

## 2. Detailed Forensic Audit by System

### 2.1 Current Import & Ingestion System

| Capability | Current Status | Code Location | Forensic Observation |
|:---|:---|:---|:---|
| **Raw HTML Import** | ❌ None | N/A | No parser, sanitizer, or AST converter exists. Any HTML pasted or uploaded is ignored or treated as plain text. |
| **CSS / Stylesheet Import** | ❌ None | N/A | No PostCSS AST parser or CSS cascade resolver exists. Styles cannot be extracted into design tokens. |
| **React / JSX Import** | ❌ None | N/A | No Babel/SWC parser exists to deconstruct JSX component trees into `SceneGraphNode` hierarchies. |
| **Figma API / .fig Import** | ❌ None | N/A | No Figma REST API connector, OAuth flow, or `.fig` binary Kiwi/Zip parser exists. |
| **Adobe XD Import** | ❌ None | N/A | No `.xd` ZIP container extractor or `artwork.json` parser exists. |
| **Canva Import** | ❌ None | N/A | No Canva Connect API or exported HTML reconstructor exists. |
| **Shopify Theme Ingestion** | ❌ None | `docs/P26_SHOPIFY_STRATEGY.md` (Spec only) | Architecture strategy drafted, but zero runtime parser or Liquid tokenizer implemented in code. |
| **WordPress Block Import** | ❌ None | N/A | No Gutenberg block comment tokenizer (`<!-- wp:paragraph -->`) or `theme.json` extractor exists. |
| **Website URL Ingestion** | ❌ None | N/A | No headless DOM crawler, computed style extractor, or asset bundle downloader exists. |
| **Template Schema Import** | ⚠️ Partial (Internal Only) | `TemplateSchemaService.ts:18` | Can load JSON schemas conforming to `TemplateSchema`, but requires full manual internal schema shape. |

### 2.2 Right-Click & Context Menu System

| Feature | Current Status | Forensic Reality | Impact on Creator |
|:---|:---|:---|:---|
| **Canvas Background Context Menu** | ❌ Missing | No listener on `OrbitoXVisualCanvas.tsx` or `CanvasInteractionLayer.tsx`. | Native browser context menu pops up. Cannot right-click to Paste, Add Section, or Reset Zoom. |
| **Node / Element Context Menu** | ❌ Missing | No listener on `SceneGraphRenderer.tsx` or `NodeRenderer.tsx`. | Cannot right-click to Duplicate, Delete, Lock, Hide, Group, Rename, or Copy Styles. |
| **Nested Layer Submenu ("Select Layer")** | ❌ Missing | Deep hierarchy cannot be inspected from canvas right-click. | When elements overlap, users are forced to hunt through the left rail layer tree. |
| **Section Context Menu** | ❌ Missing | No listener on section dividers or artboard headers. | Cannot right-click to Duplicate Section, Save to Library, Reorder Up/Down, or Delete. |
| **Page Context Menu** | ❌ Missing | No listener on page tabs in left rail. | Cannot right-click to Rename, Duplicate, Set as Home, or Delete Page. |
| **Asset Library Context Menu** | ❌ Missing | No listener on media asset grid items. | Cannot right-click to Copy URL, Replace, Download, or Delete Asset. |
| **Multi-Selection Context Menu** | ❌ Missing | `selectedNodeIds` handles multiple IDs, but right-click actions are absent. | Cannot right-click multiple nodes to Group, Align, Distribute, or Multi-Delete. |
| **Text Editing Context Menu** | ❌ Native Only | Text editing in `InlineEditOverlay.tsx` uses native contenteditable without custom actions. | Inconsistent UI; lacks typography presets or AI copy actions on right-click. |

### 2.3 Clipboard System (`SceneGraphClipboard.ts`)

| Feature | Current Status | Analysis of Limitations |
|:---|:---|:---|
| **In-Memory Subtree Copy/Cut/Paste** | ✅ Functional | Works cleanly within single session via `SceneGraphClipboard.copy()` and `paste()`. Remaps IDs and handles parent/child relationships. |
| **System Clipboard (`navigator.clipboard`)** | ❌ Missing | Clipboard operations do not write to or read from the OS clipboard. Closing or reloading the tab loses copied nodes. |
| **Cross-Tab / Cross-Project Paste** | ❌ Missing | Cannot copy a hero section in Tab A and paste it into Tab B because memory is isolated to the JS process. |
| **MIME Type Serialization** | ❌ Missing | No custom MIME type (`application/vnd.orbitox.scenegraph+json`). Does not expose fallback `text/html` or `text/plain`. |
| **External Clipboard Ingestion** | ❌ Missing | If a user copies HTML from a website or SVG from Figma and hits Cmd+V, the editor ignores it or fails silently. |
| **Paste Special** | ❌ Missing | No "Paste as Plain Text", "Paste to Replace", "Paste into Selection (as Child)", or "Paste Styles Only". |
| **Copy as Code** | ❌ Missing | Cannot right-click or use shortcuts to "Copy as JSX", "Copy as HTML", "Copy as SVG", or "Copy as CSS". |

### 2.4 Canvas Interaction & Selection (`CanvasInteractionLayer.tsx`)

| Component | Status | Architectural Observation |
|:---|:---|:---|
| **Hit Testing** | ✅ SceneGraph-Based | P20 migration successfully replaced pure DOM hit testing with mathematical coordinate transformation (`CanvasCoordinates.ts`). |
| **Multi-Selection** | ✅ Partial | Box marquee selection and Shift+Click select multiple nodes, but right-click immediately cancels or bypasses selection. |
| **Drag & Resize** | ✅ Functional | Supports 8-handle resizing, flow-vs-absolute dragging with Alt modifier, and alignment guides (`AlignmentEngine.ts`). |
| **Direct Double-Click Inline Edit** | ✅ Functional | Launches `InlineEditOverlay.tsx` on text and rich-text nodes. |
| **Floating Action Bar** | ⚠️ Limited | `CanvasFloatingContextBar.tsx` displays basic actions (Duplicate, Delete, AI), but is not context-aware for complex AST operations. |

### 2.5 Asset Management Pipeline (`AssetIndexedDBService.ts`)

| Asset Capability | Status | Architectural Observation |
|:---|:---|:---|
| **Binary Blob Storage** | ✅ Functional | Uses browser IndexedDB (`orbitox_studio_storage`) to store images, audio, video up to hundreds of megabytes. |
| **Blob URL Generation** | ✅ Functional | Creates local `blob:http://...` URLs with in-memory registry. |
| **External Asset Ingestion** | ❌ Missing | When importing an external project or URL, external image URLs (`https://images.unsplash.com/...`) are not downloaded or localized. |
| **SVG Ingestion & Vector Parsing** | ❌ Missing | SVGs are treated as static `<img>` blobs rather than editable vector SceneGraph paths. |
| **Font Registration Pipeline** | ❌ Missing | No dynamic `@font-face` injector or Google Fonts manifest resolver. Imported custom fonts fail to render. |
| **Remote CDN Staging** | ❌ Local Only | Assets exist only in the creator's local browser IndexedDB; no S3/Cloudflare R2 multi-tenant tenant-scoped sync. |

### 2.6 Persistence & Schema Versioning

| Component | Status | Architectural Observation |
|:---|:---|:---|
| **LocalStorage Autosave** | ✅ Functional | `TemplateEditorPersistence.ts` debounces saves (600ms) into `orbitox_celebrations_template_schema_<slug>`. |
| **IndexedDB Backup** | ✅ Functional | Asynchronously stores schemas in `schemas` object store in IndexedDB. |
| **Project Schema Versioning** | ⚠️ Static | Schema format is versioned (`schemaVersion: 1`), but lacks semantic migration pipelines for third-party imported projects. |
| **Multi-Page Architecture** | ✅ Supported | `TemplateSchema` supports `pages: TemplatePageDefinition[]`, where each page has an ordered list of `sectionIds`. |

---

## 3. Root Cause Analysis: Why External Import Has Not Existed

1. **Monolithic Schema Coupling:** The editor was originally conceived for predefined wedding/celebration invitation templates with fixed data models (`CelebrationState`), rather than an open-ended generic web canvas.
2. **Missing Intermediate Representation (IR):** Previous architecture attempted to map external concepts directly to concrete components (e.g., trying to map an arbitrary `<div>` directly to an RSVP module). Without a normalized **Universal Import IR**, every external source required an entirely different parser and data structure.
3. **Event Trap in Canvas Layer:** The top-level canvas wrapper intercepted left clicks for zoom/pan and node selection, but left right-click events unhandled, allowing them to bubble up to the browser window.
4. **Isolated Clipboard Model:** Clipboard was implemented as a localized internal feature for node duplication rather than an operating-system-level bridge capable of receiving multi-format clipboard payloads.

---

## 4. Audit Conclusion & Phase 0 Mandate

To fulfill the vision of:
> **"BRING ANYTHING IN. MAKE IT EDITABLE. MAKE IT BETTER."**

OrbitoX Studio Zero cannot simply patch individual file uploaders. It requires:
1. **A Canonical Universal Import IR:** An intermediate AST decoupling source formats from the internal SceneGraph.
2. **Modular Source Adapters:** Clean, sandboxed parsers for HTML/CSS, React/Next.js, Figma, Adobe XD, Canva, Shopify, WordPress, and live URLs.
3. **First-Class Right-Click Context Architecture:** Complete coverage of Canvas, Elements, Sections, Pages, Assets, and Multi-Selections with real transactional commands.
4. **Multi-Format System Clipboard:** Deep integration with `navigator.clipboard`, supporting custom binary/JSON types, HTML fallbacks, and Paste Special workflows.
5. **Asset & Font Ingestion Pipeline:** Automated crawling, sanitization, vector conversion, and font loading.

*This concludes the current state audit. Proceed to `docs/P26_SOURCE_FORMAT_RESEARCH.md` for external format specifications.*
