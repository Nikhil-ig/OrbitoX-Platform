# 🪐 OrbitoX P26 — External Source Format & Parser Research
**Document ID:** `docs/P26_SOURCE_FORMAT_RESEARCH.md`  
**Phase:** P26 Phase 0 (External Research)  
**Status:** COMPLETE RESEARCH SPECIFICATION  
**Author:** Combined Principal Creative Tool Architecture & Engineering Team  
**Date:** October 2026  

---

## 1. Executive Summary & Objective

To build a **Universal Import Engine** that satisfies the core principle:
$$\textbf{IMPORT} \ne \textbf{SCREENSHOT} \quad \text{and} \quad \textbf{IMPORT} \ne \textbf{FLATTEN EVERYTHING}$$
we have researched and analyzed the exact internal data structures, APIs, serialization schemas, and AST representations of the world's leading creative tools, web platforms, and code formats.

This document details the precise technical mechanics for extracting semantic layout, styles, vector paths, design tokens, responsive behaviors, and dynamic bindings from each source format.

---

## 2. Figma Research (REST API, Plugin API, & `.fig` Binary)

### 2.1 Figma Data Model Overview
Figma represents all documents as a tree of `Node` objects. Each node has a `type`, geometric bounds (`absoluteBoundingBox`), transformation matrix (`relativeTransform`), constraints, layout attributes (`layoutMode`, `primaryAxisAlignItems`, `counterAxisAlignItems`, `itemSpacing`), and styling arrays (`fills`, `strokes`, `effects`).

### 2.2 Integration Channels

| Channel | Input | Mechanism | Pros / Cons |
|:---|:---|:---|:---|
| **Figma REST API** | File Key + Personal Access Token (PAT) / OAuth | `GET https://api.figma.com/v1/files/{file_key}` | **Pros:** Official, structured JSON AST, image export endpoints.<br>**Cons:** Requires user authentication token; subject to API rate limits (Tier 1: 300 req/min). |
| **Figma Plugin Bridge** | JSON payload exported via custom OrbitoX Figma Plugin | `figma.currentPage.selection` exported via `postMessage` | **Pros:** Direct access to resolved vector geometries, local variables, component sets, and font metrics.<br>**Cons:** User must install plugin in Figma. |
| **Direct `.fig` File Upload** | Binary `.fig` file uploaded to OrbitoX | Decompression + Kiwi binary schema decoding | **Pros:** Frictionless drag-and-drop; no API key needed.<br>**Cons:** Proprietary binary schema (Kiwi format with zip encapsulation) requiring reverse-engineered schema decoding. |

### 2.3 Figma AST to Semantic Layout Mapping

```
Figma Node Hierarchy:
DOCUMENT
 └── CANVAS (Page)
      └── FRAME (Artboard / Section) [layoutMode: "VERTICAL", itemSpacing: 32]
           ├── TEXT [characters: "Headline", style: {...}]
           ├── FRAME (Auto-layout row) [layoutMode: "HORIZONTAL", gap: 16]
           │    ├── INSTANCE (Button) [overrides: {text: "Get Started"}]
           │    └── VECTOR (Icon) [vectorPaths: "M0 0 L10 10..."]
           └── RECTANGLE (Image Fill) [fills: [{type: "IMAGE", imageRef: "..."}]]
```

#### Mapping Algorithms:
1. **Auto-Layout $\longrightarrow$ CSS Flexbox / Stack:**
   - `layoutMode: "HORIZONTAL"` $\longrightarrow$ `layoutMode: "flex"`, `direction: "horizontal"`
   - `layoutMode: "VERTICAL"` $\longrightarrow$ `layoutMode: "flex"`, `direction: "vertical"`
   - `layoutMode: "NONE"` $\longrightarrow$ `layoutMode: "freeform"`, `position: "absolute"`
   - `primaryAxisAlignItems: "CENTER"` $\longrightarrow$ `justifyContent: "center"`
   - `counterAxisAlignItems: "CENTER"` $\longrightarrow$ `alignItems: "center"`
   - `itemSpacing: N` $\longrightarrow$ `gap: "${N}px"`
   - `paddingLeft/Right/Top/Bottom` $\longrightarrow$ `padding: "${top}px ${right}px ${bottom}px ${left}px"`
2. **Vector Geometry & Boolean Operations:**
   - Vector nodes (`VECTOR`, `STAR`, `LINE`, `ELLIPSE`, `BOOLEAN_OPERATION`) are parsed via `vectorPaths` SVG path strings (`d` attribute) into native OrbitoX vector nodes.
3. **Component Sets & Variants:**
   - `COMPONENT_SET` nodes map to OrbitoX Master Components with variant axes (e.g. `size=sm|md|lg`, `state=default|hover`).

---

## 3. Adobe XD Research (`.xd` Package Architecture)

### 3.1 Adobe XD Archive Structure
An `.xd` file is a ZIP archive containing JSON metadata and SQLite/binary assets:

```
project.xd (unzipped)
├── manifest
├── resources/
│   └── graphics/
│       └── graphicContent.agc   ──► JSON/Binary Artboard Scenegraph
├── interactions/
│   └── interactions.json        ──► Prototyping links & wire flows
└── artwork/
    ├── artboard-uuid-1/
    │   └── graphics/graphicContent.agc
    └── artboard-uuid-2/
        └── graphics/graphicContent.agc
```

### 3.2 Parsing Strategy
1. **Unzip:** Extract archive using in-browser Web Streams (`JSZip` or native `DecompressionStream`).
2. **Manifest Parsing:** Read `manifest` to discover artboards, canvas dimensions, and global colors.
3. **Graphic Content Resolution (`graphicContent.agc`):**
   - Each artboard has a `children` array with types: `shape`, `text`, `group`, `artboard`.
   - Coordinates (`x`, `y`, `width`, `height`) are absolute.
   - Text elements contain formatting runs (`rawText`, `style: { font: { family, size, postscriptName }, fill }`).
4. **Layout Normalization:** Run OrbitoX's **Flow & Flex Inferrer** to convert absolute XD coordinates into responsive flex rows/columns where elements align horizontally or vertically.

---

## 4. Canva Research (Exported HTML & Canva Connect API)

### 4.1 Canva Data Characteristics
1. **Canva Web Export:** Canva exports websites as static HTML with high reliance on absolute positioning, nested `<div>` wrappers, SVG masks, and inline SVG text paths.
2. **Canva Connect API:** Provides REST access to design metadata, pages, asset exports, and brand templates.

### 4.2 Ingestion & Semantic De-Flattening Strategy
- **Text Reconstruction:** Canva frequently outputs text with granular character spans (`<span style="letter-spacing: ...">`). The importer must normalize these into coherent paragraph/heading strings while preserving text style tokens.
- **Group Hierarchy Ingestion:** Canva groups are nested `div.canva-group`. These map directly to `kind: "group"` or `kind: "stack"`.
- **Media Ingestion:** Canva uses background-image CSS or clipped SVG rectangles for images. The asset extractor pulls image URLs, checks resolutions, and stages them into IndexedDB.

---

## 5. Shopify Online Store 2.0 Research

### 5.1 Architecture Hierarchy
$$\text{Template (.json)} \longrightarrow \text{Sections (.liquid)} \longrightarrow \text{Blocks (.liquid)} \longrightarrow \text{Settings (.json)}$$

### 5.2 Key Ingestion Files
- `templates/*.json`: Declares the order of sections on each page (e.g. `index.json`, `product.json`, `collection.json`).
- `sections/*.liquid`: Self-contained HTML + Liquid + `{% schema %}` JSON blocks declaring configurable properties (image pickers, ranges, text fields).
- `config/settings_data.json`: Global design tokens for colors, typography scale, container max-widths, and button border-radii.

### 5.3 Deterministic Liquid AST Compiler
1. **No Ruby Runtime Needed:** We do not execute server-side Ruby. We parse Liquid tags using a deterministic static AST tokenizer (`liquidjs` parser mode).
2. **Commerce Bindings:**
   - `{{ product.title }}` $\longrightarrow$ bound to `cms.product.title`.
   - `{{ product.featured_image }}` $\longrightarrow$ bound to `cms.product.image`.
   - `{% for item in collection.products %}` $\longrightarrow$ converted to OrbitoX `repeater` node with collection query `collection: "products"`.
3. **Safety Fallback:** Third-party app scripts (`{% include 'app-embed' %}`) are isolated inside a `CustomCodeRuntimeBoundary`.

---

## 6. WordPress Block Theme Research (Gutenberg & Full Site Editing)

### 6.1 WordPress Theme Structure
```
wp-block-theme/
├── theme.json                 ──► Global design tokens & block settings
├── templates/
│   ├── index.html             ──► Gutenberg block markup
│   ├── single.html
│   └── archive.html
└── parts/
    ├── header.html            ──► Header template part
    └── footer.html            ──► Footer template part
```

### 6.2 Gutenberg Block Comment Grammar
WordPress stores block trees as HTML with structured HTML comments:
```html
<!-- wp:group {"layout":{"type":"flex","orientation":"vertical"}} -->
<div class="wp-block-group">
  <!-- wp:heading {"level":1,"style":{"color":{"text":"#dfba6b"}}} -->
  <h1 class="wp-block-heading has-text-color" style="color:#dfba6b">Celestial Gala</h1>
  <!-- /wp:heading -->
  <!-- wp:paragraph {"fontSize":"medium"} -->
  <p class="has-medium-font-size">Join us for an unforgettable evening under the stars.</p>
  <!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
```

### 6.3 Block Tokenizer Strategy
- Parse `<!-- wp:block-name {json-attributes} -->` using regex/grammar parser into structured block nodes.
- Map `wp:group` $\longrightarrow$ `kind: "stack"` / `kind: "container"`.
- Map `wp:heading` $\longrightarrow$ `kind: "text"`, `variant: "h1"|"h2"|...`.
- Map `wp:columns` and `wp:column` $\longrightarrow$ `kind: "grid"` or flex row.
- Map `wp:image` $\longrightarrow$ `kind: "image"`.
- Extract design tokens from `theme.json` (`settings.color.palette`, `settings.typography.fontFamilies`).

---

## 7. Wix & Live Website URL Scraping Research

### 7.1 Web Scraping & DOM Serialization Pipeline
When a user inputs a URL (e.g. `https://example-restaurant.com` or a Wix/Squarespace site):
1. **Headless Browser Capture:** Spin up a sandboxed browser subagent or backend headless worker (Playwright/Puppeteer).
2. **Computed Style Snapshotting:**
   - Execute a traversal script in the target DOM that extracts:
     - Computed bounding rects (`getBoundingClientRect()`).
     - Computed CSS styles (`window.getComputedStyle(el)`): `display`, `flexDirection`, `gridTemplateColumns`, `gap`, `color`, `backgroundColor`, `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `borderRadius`, `boxShadow`, `zIndex`, `overflow`.
     - Asset URLs (image `src`, `srcset`, background-images, video sources, SVGs).
     - Responsive viewport captures at 1440px (Desktop), 768px (Tablet), and 390px (Mobile).
3. **Semantic Hierarchy Compression:**
   - Strip invisible or zero-sized nodes (`display: none`, `opacity: 0`, width/height 0).
   - Collapse redundant wrapper `<div>`s that contribute no styles, layout, or border.
   - Detect sections using `<section>`, `<header>`, `<footer>`, `<main>`, or major full-width container boundaries.

---

## 8. Code Ingestion Research (HTML5, CSS3, React/Next.js, Vue, Svelte)

### 8.1 HTML5 & Modern CSS AST
- **HTML Parser:** Native `DOMParser` in browser, producing a clean W3C DOM tree.
- **CSS Parser:** `PostCSS` AST tokenizer to parse stylesheets into selector rules, declarations, and `@media` queries.
- **Cascade Resolver:** Match CSS rules to DOM nodes using standard specificity scoring to calculate computed styles without requiring a full live render.

### 8.2 React / Next.js JSX De-compilation
- **AST Compiler:** Use `@babel/parser` or SWC in WASM mode with `jsx` and `typescript` plugins.
- **Component AST Traversal:**
  - `JSXElement` $\longrightarrow$ `ImportedNode`.
  - Intrinsic elements (`<div/>`, `<span/>`, `<h1/>`, `<button/>`, `<img/>`) map directly to primitive node kinds.
  - Component declarations (`<HeroSection/>`, `<Navbar/>`) map to Component Master or Section boundaries.
  - Tailwind CSS classes (e.g. `flex flex-col items-center justify-between p-8 bg-slate-900 text-white`) are decoded via a **Tailwind Class Resolver** into concrete CSS design tokens and geometry properties.

### 8.3 Vue & Svelte Single-File Components (SFC)
- **Vue SFC:** Parse `.vue` file via `@vue/compiler-sfc` into `<template>`, `<script>`, `<style>`.
- **Svelte SFC:** Parse `.svelte` file via `svelte/compiler` into template AST, script AST, style AST.
- Output from both SFC compilers feeds directly into the **Universal Import IR**.

---

## 9. Synthesis: Comparison Matrix of Source Formats

| Format | Structure Fidelity | Layout Model | Vector Fidelity | Dynamic Bindings | Ingestion Complexity |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Figma API** | High | Auto-layout (Flex) | 100% Native Path | Components & Variables | Medium |
| **Adobe XD** | Medium-High | Mixed (Absolute + Group) | 100% Native Path | Prototyping links | Medium |
| **Canva HTML** | Medium | Absolute / Flat | High (SVG heavy) | None | Medium-Low |
| **Shopify OS 2.0** | Very High | Section & Block | Medium | Full Commerce Models | Low-Medium |
| **WordPress FSE** | High | Flex / Column / Block | Low-Medium | Dynamic WP Post/Query | Low |
| **Live Web URL** | High | Real Computed CSS | High | Inferred Repeater | High |
| **React / JSX** | Very High | Flex / Grid / Tailwind | High | Props & State Models | Medium-High |

*This concludes the external format research. Proceed to `docs/P26_IMPORT_IR.md` for the Intermediate Representation specification.*
