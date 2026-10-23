# P26.1 Architectural Specification: Multi-Source Adapters & Ingestion Pipeline

## 1. Architectural Overview

All source formats enter OrbitoX through specialized **Source Adapters** conforming to a common contract. Each adapter is responsible for parsing raw source data into the normalized `ImportedProjectIR` (defined in `P26_1_IMPORT_IR.md`).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        RAW SOURCE INPUTS                               │
│  [HTML/CSS] [React/Next] [Figma Bridge] [Shopify Theme] [WP Theme]     │
│  [Adobe XD] [Canva HTML] [Live Web URL] [SVG Vector] [Binary Assets]   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     UNIVERSAL ADAPTER LAYER                            │
│  - HtmlAdapter          - ReactAdapter       - FigmaBridgeAdapter      │
│  - ShopifyAdapter       - WordPressAdapter   - XdAdapter               │
│  - UrlCrawlerAdapter    - SvgAdapter         - AssetIngestionAdapter   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     ORBITOX IMPORT IR (v2.0)                           │
│  - Canonical Pages      - Canonical Sections - Canonical Nodes         │
│  - Design Tokens        - Components & Props - Source Trace Maps       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  SEMANTIC MAPPER & COMPILER                            │
│  - Design Token Merger  - Component Deduplicator - SceneGraphCompiler  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     CANONICAL SCENE GRAPH                              │
│  - 100% Vector Accurate - Deeply Frozen Facades - Live Canvas Render   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Adapter Specifications

### 2.1 HTML & CSS / Tailwind Adapter (`HtmlAdapter`)
- **Input**: Raw HTML5 documents, HTML string snippets, Tailwind utility classes.
- **Ingestion Logic**:
  - Traverses the DOM tree using lightweight DOM parser.
  - Extracts computed styles: `display: flex`, `grid-template-columns`, `gap`, `padding`, `background-color`, `border-radius`.
  - Parses Tailwind classes (e.g. `flex flex-col items-center justify-between p-8 bg-slate-900 rounded-2xl`) and translates them into explicit SceneGraph layout and style properties.
  - Heuristically detects semantic archetypes (`<nav>` / `header` → `header`, `<main> <section>` → `hero` / `features`, `<footer>` → `footer`).
- **Source Trace**: Records DOM selector, tag name, class names, and original line numbers.

### 2.2 React & Next.js Adapter (`ReactAdapter`)
- **Input**: JSX/TSX source strings, Next.js page components.
- **Ingestion Logic**:
  - Traverses Babel AST (`@babel/parser`).
  - Maps JSX elements (`<div className="...">`, `<p>`, `<button>`) to SceneGraph nodes.
  - Extracts static props (`title="Launch"`, `src="/img/hero.png"`).
  - Isolates dynamic JavaScript hooks (`useState`, `useEffect`, external API calls) into a declared `customCodeBoundary` so layout and styling remain 100% editable without executing unverified code in the design canvas.

### 2.3 Shopify OS 2.0 Theme Adapter (`ShopifyAdapter`)
Shopify's architecture separates layout, templates, sections, section groups, blocks, snippets, and assets:
- **Layout** (`layout/theme.liquid`) → Site Layout & Global Shell
- **Templates** (`templates/index.json`) → Page Template
- **Sections** (`sections/*.liquid`) → SceneGraph Sections
- **Blocks** (`schema.blocks`) → Nested Block Elements / Components
- **Theme Settings** (`config/settings_data.json`) → OrbitoX Design Tokens
- **Products & Collections** → CMS Commerce Collections
- **Unsupported Server Logic**: Unsupported Liquid tags (`{% paginate %}`, proprietary shop filters) are preserved in isolated `customCodeBoundaries`, keeping the visual layout 100% editable.

### 2.4 WordPress Full Site Editing (FSE) Adapter (`WordPressAdapter`)
Maps modern WordPress Block Theme structures:
- **Block Template** (`templates/index.html`) → Page Template
- **Template Parts** (`parts/header.html`) → Global Shared Component
- **Patterns** (`patterns/hero.php`) → Reusable Section
- **Gutenberg Blocks** (`<!-- wp:columns -->`) → Flex/Grid Frames
- **`theme.json`** → Global Design System (Typography, Color palette, Spacing presets).

### 2.5 Figma Authorized Bridge Adapter (`FigmaBridgeAdapter`)
- **Authorized Path**: Leverages official Figma REST API and authorized OrbitoX Figma Bridge plugin (no unsupported raw `.fig` reverse-engineering).
- **Node Mapping**:
  - `FRAME` with Auto Layout → Flexbox Frame
  - `FRAME` without Auto Layout → Absolute Frame
  - `COMPONENT` → Master Component (❖)
  - `INSTANCE` → Component Instance (◇) with property overrides
  - `VARIABLE` / `STYLE` → Design Tokens (Colors, Typography, Numbers)
  - `CONSTRAINTS` → Pin Constraints (Top/Bottom, Left/Right/Center)
  - Vector Bezier paths → Vector Path nodes.

### 2.6 Adobe XD Adapter (`XdAdapter`)
- Ingests exported XD JSON AST or authorized XD Plugin package.
- Maps artboards to Pages, repeat grids to Repeaters, and graphic symbols to Components.

### 2.7 Canva Adapter (`CanvaAdapter`)
- Ingests Canva HTML exports natively as vector-accurate layout trees.
- For raster/PDF uploads, clearly classifies output as **Visual Reconstruction** with explicit fidelity warnings.

### 2.8 Website URL Crawler Adapter (`UrlCrawlerAdapter`)
- **Input**: Public web URL (`https://...`).
- **Security Guard**: Enforces `SecuritySanitizer.validateUrl` to prevent SSRF against loopback (`127.0.0.1`), private RFC 1918 subnets, and AWS metadata services (`169.254.169.254`).
- **Extraction**: Ingests viewport DOM, CSS stylesheets, Google Font links, raster images, and OpenGraph metadata.
- **Runtime Sandboxing**: Third-party JavaScript trackers, ads, and authentication cookies are purged; layout structure is normalized into pure SceneGraph nodes.
