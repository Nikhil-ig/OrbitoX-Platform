# P26.1 Forensic Audit: Current Import Studio & Ingestion Architecture

## 1. Executive Summary & Problem Definition

The current import implementation in OrbitoX (`OrbitoXUniversalImportModal.tsx` and related subcomponents) treats the creator as an AST compiler technician rather than a visual creator. Upon launching the Import Studio, the user is presented with:
- **Detected Format badges** (e.g. `HTML & Tailwind`, `WordPress FSE`, `Shopify OS 2.0`, `Adobe XD AST`)
- **Format Override dropdowns** requiring technical knowledge of AST structures
- **Large raw code textareas** (requiring copy-pasting HTML/JSON directly)
- **Import Destination radios** (`new_section` vs `active_section`)
- **Ingestion Optimization checkboxes** (`Extract Design Tokens`, `Localize Remote Assets`, `Resolve Custom Fonts`)
- **AST Inspector & Diff Visualizer** displaying raw JSON nodes and AST hierarchies

This design violates the foundational premise of professional visual creative platforms (Figma, Framer, Canva, Shopify, Webflow):
> **"Never ask the user to understand OrbitoX before they can use OrbitoX. The creator should simply drag something in, OrbitoX understands what it found, presents a plain-English preview, and imports it as real editable elements."**

---

## 2. Forensic Codebase Audit of Existing Import Components

### 2.1 File: `orbitox/apps/celebrations/components/template-studio/components/OrbitoXUniversalImportModal.tsx`
- **Total Lines**: 1,024 lines
- **Primary Flaws**:
  1. **Premature Exposure of AST Internals**: Lines 372–383 expose manual heuristics (`detectedFormat = useMemo(...)`) and force user scrutiny on whether a snippet is `Figma AST JSON` or `HTML5 & Tailwind`.
  2. **Technical Input Requirement**: Lines 452–490 render a `<textarea>` expecting raw stringified JSON or HTML source code, rather than offering a native desktop-grade file drag-and-drop intake zone.
  3. **Fragmented Ingestion vs Asset Library**: The import modal does not accept binary images, videos, audio, fonts, 3D GLB/GLTF models, or theme ZIP packages directly. If a creator drops an image or a zip, the modal errors out or displays unparsed garbage.
  4. **Direct SceneGraph Injection without Safe Transaction Preview**: Although `ImportCorrectionStudio` exists, the default "Import to Canvas" directly compiles the first section (`firstSection = result.projectIR.pages[0]?.sections[0]`) and mutates the active canvas without non-destructive sandboxing.

### 2.2 Package: `@orbitox-io/importer-core` (`orbitox/packages/importer-core`)
- **Current State**:
  - High quality compiler, 12 passing test suites (112 tests).
  - Strong AST parsing across HTML, React, Figma, XD, Shopify, WordPress, and URL Crawler.
- **Architectural Gaps**:
  - The adapters expect raw strings or uncompressed strings; zip package decompression (`JSZip` / streaming) is split between `TemplatePackager` and client-side helpers.
  - Multi-file ingestion queue is lacking: dropping `website.zip`, `images.zip`, and `fonts.zip` simultaneously is not supported in a single atomic transaction.
  - Honest fidelity reporting (`native`, `hybrid`, `custom runtime`, `unsupported`) is calculated in `ImportIR`, but was previously submerged beneath developer diagnostic tabs rather than surfaced as a clear creator scorecard.

---

## 3. UI/UX Paradigm Comparison: Current vs. Target P26.1

| Dimension | Current P26 Implementation | Target P26.1 Universal Intake |
| :--- | :--- | :--- |
| **Trigger Point** | Dedicated "Universal Import" button in top toolbar | Global Drag-and-Drop over entire Studio + `+ Add` Universal Command Center |
| **Initial Screen** | Code textarea + format selector + AST options | Minimalist, elegant drop surface: "Bring anything into OrbitoX" |
| **Supported Ingestion** | Pasted HTML, JSX, JSON text | HTML, ZIP, Figma bridge, SVG, PDF, PNG/WEBP, MP4, GLB/GLTF, Fonts, Shopify, WP |
| **Detection Step** | User watches regex badges change | OrbitoX silently auto-detects and reports human summary: "Website detected: 8 pages, 42 sections, 218 elements" |
| **Fidelity Display** | AST tree viewer with confidence numbers | Visual honest scorecard: 96% Native, 4% Hybrid, with "Why?" explainability |
| **Destination Choice** | Radio buttons (`New Section` / `Active Section`) | Explicit cards: `Add to current page`, `Add as new page`, `Create new project`, `Replace selected section` |
| **Undo Safety** | Standard undo/redo stack | Single-transaction atomic commit with complete rollback protection |

---

## 4. Root Causes of Current Technical Design
1. **Developer-First Incremental Evolution**: The importer was built bottom-up from AST parsers (`HtmlAdapter`, `FigmaAdapter`, `ShopifyAdapter`), exposing adapter levers to verify compiler correctness.
2. **Conflation of Ingestion and Diagnostics**: The `ImportCorrectionStudio` and diagnostic diff were placed in the default intake path rather than behind an "Advanced / Inspect" progressive disclosure drawer.
3. **Decoupled Asset Upload Service**: `FileUploadService.ts` was implemented for `AssetsPanel.tsx`, while `OrbitoXUniversalImportModal.tsx` had its own manual string handling, preventing seamless drag-and-drop of arbitrary multi-asset packages.

---

## 5. Architectural Mandates for P26.1
1. **Retire the Developer Console**: Replace the raw code textarea and format override selects with the 3-step intake workflow: **Drop → Understand → Bring it in**.
2. **Whole-App Drag-and-Drop Dropzone**: Dragging any valid web or creative file anywhere over the browser window activates a translucent desktop-grade drop overlay.
3. **Progressive Disclosure**: Technical source maps, AST tree views, and overrides must be sequestered under an "Advanced / Expert" toggle.
4. **Honest Multi-Adapter Ingestion**: Never fake native rendering; isolate unsupported dynamic server scripts (Liquid filters, unparseable React hooks, PHP tags) in isolated sandboxes while converting layout and visual nodes into 100% editable SceneGraph elements.
