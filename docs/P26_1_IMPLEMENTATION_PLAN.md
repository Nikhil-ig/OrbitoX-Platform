# 🪐 P26.1 Master Implementation Plan: Universal Creative Intake & Studio Architecture

**Document ID**: `docs/P26.1/IMPLEMENTATION_PLAN.md`  
**Document Version**: 2.0.0 (Master Production Specification)  
**Target Release**: OrbitoX Studio Zero v26.1  
**Governing Architectural Contract**: [AGENTS.md](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/AGENTS.md)  
**Scope**: Universal Creative Intake, Frictionless 3-Step Ingestion, Visual Template Marketplace & Multi-Device Live Preview, Universal `+ Add` Command Center, Centralized CAS Asset Management, 8-Target Spatial Right-Click Context Menus, Smart Multi-MIME OS Clipboard Bridge, Interactive SVG Box Model & Visual Corner Radius Presets, Dynamic CMS Collections & Canvas Repeaters, and CIELAB Design System Token Clustering.

---

## 1. Executive Summary & Paradigm Shift

The fundamental objective of **P26.1** is to eradicate the "internal developer console" feeling from OrbitoX Studio Zero and establish a fluid, desktop-grade creative authoring environment matching and exceeding **Figma**, **Framer**, **Canva**, and **Shopify Online Store 2.0**.

### 1.1 The Core Architectural Rule
> **"Never ask the creator to understand OrbitoX before they can use OrbitoX. A creator must be able to simply: Drag something in → OrbitoX understands what it found → Present a plain-English preview → Bring it in with non-destructive choices → Visually sculpt and edit."**

### 1.2 The Creative Paradigm Gap Analysis

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       THE ARCHITECTURAL GAP                                            │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  LEGACY STATE (P26 Console Mode):                                                                     │
│  User opens Importer ➔ Faces AST code <textarea>, regex format badges, JSON tree diffs, manual        │
│  override dropdowns ➔ User must be a compiler engineer to import HTML or Figma.                       │
│  User opens Templates ➔ 320px cramped drawer with 70px static gradient cards ➔ Clicking "Apply"      │
│  destructively wipes out the entire project canvas without warning or section extraction.              │
│                                                                                                        │
│  TARGET STATE (P26.1 Creative Desktop Mode):                                                           │
│  User drags any file (HTML, ZIP, Figma link, SVG, PNG, MP4, GLB, WOFF2) anywhere over the window ➔    │
│  Global glassmorphic overlay intercepts ➔ Silently analyzes & clusters tokens in <250ms ➔ Surfaces   │
│  plain-English summary ("8 Pages • 42 Sections • 218 Elements • 96% Native Editable") ➔ Offers        │
│  non-destructive insertion cards ➔ Compiles into native vector SceneGraph nodes with 100% undo safety. │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Subsystem Transformation Ledger

| Subsystem | Legacy State (P26) | Target State (P26.1) | Industry Benchmark |
| :--- | :--- | :--- | :--- |
| **Intake Experience** | Code `<textarea>`, AST regex dropdowns, technical error stacks | **Drop → Understand → Bring it in** (3 clicks) | Figma / Canva |
| **Drop Surface** | Modal-scoped hidden file input | **Global Window-Level Translucent Overlay** with target node hover detection | Figma Canvas |
| **Format Sniffing** | Manual format override dropdowns (`auto`, `html`, `shopify`) | **Automated Content Sniffer** with MIME, magic byte, and AST heuristic scoring | Framer / Canva |
| **Fidelity Transparency** | Raw AST JSON difference viewer | **Honest Scorecard**: Native vs. Hybrid vs. Custom Runtime with interactive "Why?" | Figma Dev Mode |
| **Template Discovery** | 320px sidebar with tiny text cards and destructive "Apply" | **Visual Template Marketplace** with 16:9 live responsive previews (Desktop/Tablet/Mobile) | Framer Marketplace |
| **Template Insertion** | Single-click destructive canvas obliteration (`handleReplaceSite`) | **Non-Destructive Actions**: Add Section to Page, Add as New Page, Branch Variant, Safe Replace | Shopify OS 2.0 |
| **Creation Hub** | Fragmented drawers across rail tabs (`add`, `library`, `assets`) | **Universal `+ Add` Command Center** (`⌘K` / `A`) unifying Elements, Layout, Sections, Assets, and AI | Webflow Quick Add |
| **Asset Ingestion** | Local `FileUploadService` in `AssetsPanel` | **Universal CAS Asset Service** (SHA-256 deduplication, IndexedDB persistence, in-place drop swap) | Figma Fill Manager |
| **Context Menus** | 4 generic targets, text-only items | **8 Specialized Targets** (Canvas, Node, Image, Frame, Section, Component, Multi-select, Layer Tree) | Figma Desktop |
| **Hierarchy Navigation** | Coordinate-based single parent select | **Interactive Ancestor Breadcrumbs (`Select Layer >`)** traversing coordinate stack | Figma `Cmd+Click` |
| **System Clipboard** | Internal SceneGraph nodes only | **Smart Multi-MIME Bridge** translating external HTML, SVG, and image blobs into native editable nodes | Webflow / Framer |
| **Box Model & Radius** | Text input fields and numeric range slider | **Interactive SVG Box Model Diagram** (Margin → Padding → Content) and **Corner Radius Visual Hotspots with 5 Presets** | Webflow Style Panel |
| **Design System** | Manual hex code picking and exact string matching | **Automated CIELAB Color Clustering ($\Delta E < 2.3$)** synthesizing a 6-role token palette | Figma Variables |
| **CMS & Data** | Flat local scalar `useState` array | **Structured Collections** (`Products`, `Blog`, `Team`), field schemas, and **Dynamic Canvas Repeaters** | Webflow CMS / Framer CMS |

---

## 2. High-Level System Architecture & Ingestion Topology

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                             EXTERNAL CREATIVE SOURCES                                           │
│   HTML5 / Tailwind CSS  •  React / JSX / Next.js  •  Figma Bridge / .fig  •  Shopify OS 2.0 Themes (ZIP)       │
│   WordPress FSE Block Themes  •  Adobe XD Archives (.xd)  •  Canva Export  •  Live Website URLs (SSRF-Safe)     │
│   Vector Graphics (SVG)  •  Binary Assets (PNG, JPG, WEBP, MP4, MOV, GLB/GLTF, WOFF2, TTF)                     │
└────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────┘
                                                         │ (Global Dropzone / Universal Add / System Clipboard)
                                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       UNIVERSAL INGESTION CONTROLLER                                            │
│   1. Magic-Byte Sniffer & MIME Detection           2. SHA-256 Content-Addressable Storage (CAS)                 │
│   3. Zip Bomb & Security Quarantine Defense        4. AST Adapter Router                                        │
└────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────┘
                                                         │
                                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                          UNIVERSAL ADAPTER REGISTRY                                             │
│   ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐                   │
│   │    HtmlAdapter     │ │    ReactAdapter    │ │   ShopifyAdapter   │ │  WordPressAdapter  │                   │
│   └────────────────────┘ └────────────────────┘ └────────────────────┘ └────────────────────┘                   │
│   ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐                   │
│   │ FigmaBridgeAdapter │ │     XdAdapter      │ │  UrlCrawlerAdapter │ │  SvgVectorAdapter  │                   │
│   └────────────────────┘ └────────────────────┘ └────────────────────┘ └────────────────────┘                   │
└────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────┘
                                                         │
                                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      ORBITOX IMPORT IR v2.0 PIPELINE                                            │
│   ┌───────────────────────────────────┐ ┌───────────────────────────────────┐ ┌───────────────────────────────┐ │
│   │      DesignSystemExtractor        │ │         ComponentDetector         │ │        FidelityAuditor        │ │
│   │  - CIELAB Perceptual Clustering   │ │  - Structural Subtree Merkle Hash │ │  - Native / Hybrid Score      │ │
│   │  - 6-Role Semantic Palette        │ │  - Master & Instance Synthesis    │ │  - Heuristic "Why?" Tree      │ │
│   └───────────────────────────────────┘ └───────────────────────────────────┘ └───────────────────────────────┘ │
└────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────┘
                                                         │
                                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    ATOMIC TRANSACTION COMPILER & ENGINE                                         │
│   - SceneGraphCompiler (Pure Immutable Transformations)                                                         │
│   - Single-Tick Rollback Transaction Manager                                                                    │
│   - SandboxGuard.freezeAllFacades (Anti-Tamper Lock)                                                            │
└────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────┘
                                                         │
                                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                          STUDIO ZERO CANVAS INTERACTION                                         │
│   ┌────────────────────────────────┐ ┌────────────────────────────────┐ ┌─────────────────────────────────────┐ │
│   │ Visual Template Marketplace    │ │ Universal + Add Command Center │ │ 8-Target Context Menus & Drilldown  │ │
│   │ (Live 3-Device Viewport)       │ │ (Fuzzy Search & Direct Insert) │ │ (Ancestor Spatial Breadcrumbs)      │ │
│   └────────────────────────────────┘ └────────────────────────────────┘ └─────────────────────────────────────┘ │
│   ┌────────────────────────────────┐ ┌────────────────────────────────┐ ┌─────────────────────────────────────┐ │
│   │ Interactive SVG Box Model      │ │ Visual Corner Radius Presets   │ │ Dynamic CMS Repeaters               │ │
│   │ (Concentric Drag-Scrubbing)    │ │ (4 Hotspots & 5 Instant Styles)│ │ (Reactive Collection Data-Binding)  │ │
│   └────────────────────────────────┘ └────────────────────────────────┘ └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Mathematical & Algorithmic Foundations

### 3.1 Perceptual Color Clustering via CIELAB and $\Delta E$

Legacy design systems use naive hex equality (`#111827 !== #0f172a`), generating hundreds of duplicate, fragmented color tokens from imported websites. P26.1 introduces **perceptual color space clustering** using the International Commission on Illumination (CIE) $L^*a^*b^*$ color model and Euclidean color difference metrics.

#### Mathematical Conversion Workflow:

1. **Inverse sRGB Companding ($sRGB \to RGB_{linear}$)**:
   For each color channel $C \in \{R, G, B\}$, normalized to $[0, 1]$:
   $$\begin{aligned}
   C_{linear} = \begin{cases}
   \frac{C}{12.92} & \text{if } C \le 0.04045 \\
   \left(\frac{C + 0.055}{1.055}\right)^{2.4} & \text{if } C > 0.04045
   \end{cases}
   \end{aligned}$$

2. **Linear RGB to CIE XYZ Transform (D65 Standard Illuminant)**:
   $$\begin{bmatrix} X \\ Y \\ Z \end{bmatrix} = \begin{bmatrix}
   0.4124564 & 0.3575761 & 0.1804375 \\
   0.2126729 & 0.7151522 & 0.0721750 \\
   0.0193339 & 0.1191920 & 0.9503041
   \end{bmatrix} \begin{bmatrix} R_{linear} \\ G_{linear} \\ B_{linear} \end{bmatrix}$$

3. **CIE XYZ to CIE $L^*a^*b^*$**:
   Using standard reference white $X_n = 95.0489, Y_n = 100.0, Z_n = 108.8840$:
   $$L^* = 116 \cdot f\left(\frac{Y}{Y_n}\right) - 16$$
   $$a^* = 500 \cdot \left[ f\left(\frac{X}{X_n}\right) - f\left(\frac{Y}{Y_n}\right) \right]$$
   $$b^* = 200 \cdot \left[ f\left(\frac{Y}{Y_n}\right) - f\left(\frac{Z}{Z_n}\right) \right]$$
   where:
   $$\begin{aligned}
   f(t) = \begin{cases}
   t^{1/3} & \text{if } t > \left(\frac{6}{29}\right)^3 \\
   \frac{1}{3}\left(\frac{29}{6}\right)^2 t + \frac{4}{29} & \text{otherwise}
   \end{cases}
   \end{aligned}$$

4. **Perceptual Distance Metric ($\Delta E^*_{76}$ and $\Delta E^*_{00}$)**:
   $$\Delta E^*_{76} = \sqrt{(\Delta L^*)^2 + (\Delta a^*)^2 + (\Delta b^*)^2}$$
   - **Clustering Rule**: Two colors $C_1, C_2$ are clustered into the same semantic token if $\Delta E^*_{76} \le 2.3$ (the standard human **Just Noticeable Difference (JND)** threshold).
   - **Centroid Representative**: The cluster representative is computed as the weighted average coordinate in $L^*a^*b^*$ space based on total occurrence count across all nodes.

5. **Semantic Role Classification Heuristic**:
   - **Background Dark**: $L^* < 18$, Chroma $C^* = \sqrt{a^{*2} + b^{*2}} < 10$
   - **Background Light**: $L^* > 92$, Chroma $C^* < 10$
   - **Surface**: $18 \le L^* \le 30$ (dark theme) or $85 \le L^* \le 92$ (light theme)
   - **Accent / Primary**: Highest saturation $C^* > 30$, occurring on interactive nodes (`button`, `a`, `cta`) with contrast ratio $\ge 4.5:1$ against the background.
   - **Text**: Contrast ratio $\ge 7:1$ against inferred background.

---

### 3.2 Structural Subtree Merkle Hashing for Component Detection

When an external site (or Shopify / HTML archive) is imported, repeating visual components (e.g. pricing cards, team cards, product cards) must be synthesized into **Master Components** rather than flat duplicate nodes.

#### Merkle Hashing Algorithm:
1. For every non-leaf node $u$, compute its structural signature $S(u)$:
   $$S(u) = \text{MD5}\Big( \text{kind}(u) \,\|\, \text{layoutMode}(u) \,\|\, \text{direction}(u) \,\|\, \text{childCount}(u) \,\|\, \bigoplus_{v \in \text{children}(u)} S(v) \Big)$$
   *Note: Text string values and image URLs are masked during structural hashing to identify layout templates independent of localized content.*
2. **Frequency Map**: Accumulate subtrees by signature into a multi-map $\mathcal{M}: S \to \{u_1, u_2, \dots, u_k\}$.
3. **Thresholding**: If $|\mathcal{M}(S)| \ge 2$ and depth $\ge 2$, the cluster is promoted to:
   - `MasterComponent`: Created with schema slots for dynamic fields (Heading Text, Image URL, Button Link).
   - `ComponentInstance`: Node substituted with instance pointer and content override patch.

---

### 3.3 Heuristic Confidence Calculation & Explainability Tree

Fidelity must never be an opaque percentage. It must be computed from an explicit weighted scoring function:

$$\text{Confidence} = \frac{w_L \cdot S_{\text{layout}} + w_S \cdot S_{\text{style}} + w_T \cdot S_{\text{typography}} + w_A \cdot S_{\text{assets}} - \sum P_{\text{unsupported}}}{\text{Total Weight}} \times 100$$

- $w_L = 0.35$ (Flexbox/Grid layout reproduction)
- $w_S = 0.25$ (Fills, borders, shadows, radii)
- $w_T = 0.20$ (Font family, weight, size, line-height)
- $w_A = 0.20$ (Vectors, images, media resolutions)
- **Penalties ($P_{\text{unsupported}}$)**:
  - Custom JavaScript event handlers (`onclick`, React hooks) $\to -5\%$
  - Server-side template tags (`{% liquid %}`, `<?php`) $\to -3\%$
  - Unresolved external fonts with fallback $\to -2\%$

#### Explainability Rule Engine:
Every penalty produces an explainable human breakdown:
- *"96% Native Editable — 4% quarantined as interactive JavaScript embed (PayPal widget)."*
- *"All typography preserved; 1 custom font (Canela) substituted with Google Fonts match (Cinzel)."*

---

## 4. Canonical Data Contracts & TypeScript Interface Specifications

### 4.1 Upgraded `ImportIR.ts` (v2.0)

```typescript
// orbitox/packages/importer-core/src/types/ImportIR.ts

export type IngestionFidelityClassification = 
  | 'native'        // 100% native SceneGraph nodes (Frame, Stack, Text, Image)
  | 'hybrid'        // Native layout shell with isolated SVG or embed children
  | 'custom_runtime'// Sandboxed interactive code boundary
  | 'unsupported';  // Requires manual creator review or static fallback

export interface IngestionConfidenceHeuristic {
  score: number; // 0.00 to 1.00
  category: 'layout' | 'style' | 'typography' | 'assets' | 'scripts';
  reason: string;
  remediation?: string;
  sourceNodeId?: string;
}

export interface IngestionFidelityReport {
  overallScore: number; // 0 to 100
  classification: IngestionFidelityClassification;
  summaryText: string;
  stats: {
    totalPages: number;
    totalSections: number;
    totalElements: number;
    totalComponents: number;
    totalImages: number;
    totalFonts: number;
    totalTokens: number;
  };
  heuristics: IngestionConfidenceHeuristic[];
  quarantinedScripts: Array<{
    id: string;
    tag: string;
    reason: string;
    snippet: string;
  }>;
}

export interface ClusteredColorToken {
  id: string;
  name: string;
  hex: string;
  cielab: { L: number; a: number; b: number };
  role: 'primary' | 'secondary' | 'background' | 'surface' | 'accent' | 'text';
  occurrences: number;
  clusteredHexVariants: string[];
}
```

### 4.2 Centralized CAS Asset Ingestion Contract

```typescript
// orbitox/apps/celebrations/components/template-studio/services/AssetIngestionService.ts

export interface CASAssetMetadata {
  id: string;             // SHA-256 hash prefixed with 'ast_'
  name: string;           // Original filename
  mimeType: string;       // Normalized MIME type
  sizeBytes: number;      // Exact byte size
  dimensions?: {
    width: number;
    height: number;
  };
  durationSeconds?: number; // Video / Audio duration
  fontFamilyName?: string;  // WOFF2 / TTF font family
  objectUrl: string;      // Ephemeral browser blob URL
  persistedToIndexedDB: boolean;
  uploadedAt: string;
}

export interface AssetIngestionQueueEvent {
  totalFiles: number;
  processedFiles: number;
  currentFileName: string;
  progressPercent: number;
  completedAssets: CASAssetMetadata[];
  errors: Array<{ fileName: string; error: string }>;
}
```

### 4.3 Structured CMS Collections Contract

```typescript
// orbitox/apps/celebrations/components/template-studio/engine/CMSCollectionStore.ts

export type CMSFieldType = 
  | 'text'
  | 'rich_text'
  | 'image'
  | 'number'
  | 'boolean'
  | 'date'
  | 'slug'
  | 'relation';

export interface CMSFieldDefinition {
  id: string;
  name: string;
  key: string;
  type: CMSFieldType;
  required: boolean;
  defaultValue?: any;
  options?: string[]; // For select / dropdown
}

export interface CMSCollectionItem {
  id: string;
  slug: string;
  fields: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CMSCollection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  schema: CMSFieldDefinition[];
  items: CMSCollectionItem[];
}

export interface CMSRepeaterBinding {
  collectionId: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  filterField?: string;
  filterValue?: any;
  limit?: number;
  fieldMappings: Record<string, string>; // { 'nodePropertyPath': 'cmsFieldKey' }
}
```

---

## 5. Phased Implementation Roadmap (10 Core Phases)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 PHASED IMPLEMENTATION TIMELINE                                  │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│  PHASE 1:  Import IR v2.0 & CIELAB Perceptual Clustering Engine                                 │
│  PHASE 2:  Universal Desktop Drag-and-Drop Overlay & Centralized CAS Storage                    │
│  PHASE 3:  Frictionless 3-Step Creative Intake Experience (Drop → Understand → Bring it in)     │
│  PHASE 4:  Visual Template Marketplace & Live Multi-Device Interactive Preview                  │
│  PHASE 5:  Universal `+ Add` Command Center (Fuzzy Command Palette & Direct Insertion)         │
│  PHASE 6:  Universal 8-Target Context Menu & Spatial Ancestor Drill-Down (`Select Layer >`)     │
│  PHASE 7:  Smart Multi-MIME OS Clipboard Bridge & External Media Paste Engine                   │
│  PHASE 8:  Interactive SVG Box Model & Visual Corner Radius Presets                            │
│  PHASE 9:  Dynamic CMS Collections & Canvas Repeater Binding Engine                             │
│  PHASE 10: End-to-End Test Suite, Production Build & Master Verification Gates                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Phase 1: Import IR v2.0 & CIELAB Perceptual Clustering Engine

**Package**: `@orbitox-io/importer-core`  
**Target Files**:
- [`orbitox/packages/importer-core/src/types/ImportIR.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/packages/importer-core/src/types/ImportIR.ts)
- [`orbitox/packages/importer-core/src/pipeline/DesignSystemExtractor.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/packages/importer-core/src/pipeline/DesignSystemExtractor.ts)
- [`orbitox/packages/importer-core/src/pipeline/ComponentDetector.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/packages/importer-core/src/pipeline/ComponentDetector.ts)
- [`orbitox/packages/importer-core/src/pipeline/FidelityAuditor.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/packages/importer-core/src/pipeline/FidelityAuditor.ts)
- [`orbitox/packages/importer-core/src/__tests__/DesignSystemExtractor.spec.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/packages/importer-core/src/__tests__/DesignSystemExtractor.spec.ts)

#### Implementation Steps:
1. **Extend `ImportIR.ts`**:
   - Add `IngestionFidelityReport` to `ImportedProject`.
   - Add `conversionClassification: 'native' | 'hybrid' | 'custom' | 'unsupported'` to `ImportedNode`.
   - Add `clusteredTokenRef` to node fills and strokes.
2. **Implement `DesignSystemExtractor.ts`**:
   - Construct sRGB $\leftrightarrow$ CIELAB transformation matrix.
   - Implement Euclidean $\Delta E^*_{76}$ clustering algorithm with $2.3$ JND threshold.
   - Auto-synthesize semantic role tokens (`primary`, `secondary`, `accent`, `background`, `surface`, `text`).
   - Remap all node fills, borders, and typography to newly clustered tokens.
3. **Implement `ComponentDetector.ts`**:
   - Traverse the node graph; compute MD5 Merkle signatures for each sub-tree ignoring literal text content.
   - Extract clusters with frequency $\ge 2$ into `ImportedComponent` structures in `project.globalComponents`.
   - Replace repeating subtrees with instance nodes pointing to the Master.
4. **Implement `FidelityAuditor.ts`**:
   - Compute mathematical confidence score and compile plain-English heuristic explanations.
5. **Unit Verification**:
   - Run `npm test` in `orbitox/packages/importer-core` to verify all existing and new unit tests pass with 100% success.

---

### Phase 2: Universal Desktop Drag-and-Drop Overlay & Centralized CAS Storage

**Package / App**: `orbitox/apps/celebrations`  
**Target Files**:
- [`orbitox/apps/celebrations/components/template-studio/services/AssetIngestionService.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/template-studio/services/AssetIngestionService.ts)
- [`orbitox/apps/celebrations/components/studio-zero/GlobalDropzoneOverlay.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/studio-zero/GlobalDropzoneOverlay.tsx)
- [`orbitox/apps/celebrations/components/studio-zero/StudioShell.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/studio-zero/StudioShell.tsx)
- [`orbitox/apps/celebrations/components/studio-zero/CanvasWorkspace.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/studio-zero/CanvasWorkspace.tsx)

#### Implementation Steps:
1. **Implement `AssetIngestionService.ts`**:
   - Use `crypto.subtle.digest('SHA-256', buffer)` for content hashing.
   - Check if asset hash already exists in `AssetIndexedDBService`. If so, deduplicate instantly.
   - Extract natural width/height for images, duration for videos, and font family metadata for WOFF2.
   - Expose `ingestFiles(files: FileList | File[])` with reactive event emitter for upload progress.
2. **Implement `GlobalDropzoneOverlay.tsx`**:
   - Attach global listeners to `window` for `dragenter`, `dragover`, `dragleave`, `drop`.
   - Prevent default browser file-opening behavior (`e.preventDefault()`).
   - Render full-screen glassmorphic overlay with animated boundary:
     *"Drop anything to bring it into OrbitoX — HTML, ZIP, Figma, Images, Videos, Fonts, 3D"*.
   - **Target Node Detection**:
     - On `dragover`, perform spatial hit-test against canvas coordinate transform.
     - If cursor is positioned over an `image` or `video` node, highlight the target node with a pulsing cyan border and display tooltip: **"Drop to Replace Asset"**.
3. **Wire `StudioShell.tsx`**:
   - Mount `GlobalDropzoneOverlay` at root viewport level.
   - Route dropped payloads:
     - Web archives (`.zip`, `.html`, `.json`, Figma URL) $\to$ launch **Creative Intake Modal**.
     - Media assets (`.png`, `.jpg`, `.mp4`, `.woff2`, `.glb`) $\to$ route to `AssetIngestionService`.
     - In-place drop over existing node $\to$ dispatch `UPDATE_NODE_CONTENT` with new asset URL.

---

### Phase 3: Frictionless 3-Step Creative Intake Experience

**App**: `orbitox/apps/celebrations`  
**Target Files**:
- [`orbitox/apps/celebrations/components/template-studio/components/OrbitoXCreativeIntakeModal.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/template-studio/components/OrbitoXCreativeIntakeModal.tsx)
- [`orbitox/apps/celebrations/components/template-studio/components/OrbitoXUniversalImportModal.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/template-studio/components/OrbitoXUniversalImportModal.tsx)
- [`orbitox/apps/celebrations/components/studio-zero/StudioTopBar.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/studio-zero/StudioTopBar.tsx)

#### The 3-Step User Journey:
```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 THE 3-STEP FRICTIONLESS INTAKE MODAL                                   │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  STEP 1: DROP                                                                                          │
│  [  Drag & drop any creative file, folder, theme ZIP, or paste URL / Figma link here  ]               │
│                                                                                                        │
│  STEP 2: UNDERSTAND (Auto-Computed in <250ms)                                                          │
│  ✓ Website Structure Detected:                                                                         │
│    • 1 Page • 4 Sections • 38 Elements • 2 Components • 8 Images • 2 Fonts • 6 Color Tokens           │
│  ✓ Fidelity: 96% Native Editable (Framer / Figma Quality)                                             │
│    [ Why? Explainability Pill ] ➔ "All layout, text & tokens native. 1 script quarantined safely."    │
│                                                                                                        │
│  STEP 3: BRING IT IN (Non-Destructive Target Cards)                                                    │
│  ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐   │
│  │ Add to Current Page  │ │  Add as New Page     │ │  Create New Project  │ │ Replace Selected Sec │   │
│  │ Append cleanly below │ │ Route: /imported     │ │ Clean canvas branch  │ │ In-place swap        │   │
│  └──────────────────────┘ └──────────────────────┘ └──────────────────────┘ └──────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Implementation Steps:
1. **Build `OrbitoXCreativeIntakeModal.tsx`**:
   - Step 1: Drag-and-drop zone accepting `.html`, `.zip`, `.json`, `.svg`, `.xd`, image files, or URL strings.
   - Step 2: Live summary card displaying iconographic counts of pages, sections, elements, components, images, fonts, and clustered tokens.
   - Step 3: 4 distinct non-destructive action cards.
   - Progressive Disclosure: Sequester raw AST trees, JSON diffs, and format overrides under a collapsible *"Developer Diagnostics"* accordion at the bottom.
2. **Refactor `OrbitoXUniversalImportModal.tsx`**:
   - Act as backwards-compatible facade delegating directly to `OrbitoXCreativeIntakeModal`.
3. **Update `StudioTopBar.tsx`**:
   - Wire the top "Import" button to open `OrbitoXCreativeIntakeModal`.

---

### Phase 4: Visual Template Marketplace & Live Multi-Device Preview

**App**: `orbitox/apps/celebrations`  
**Target Files**:
- [`orbitox/apps/celebrations/components/studio-zero/TemplateMarketplaceModal.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/studio-zero/TemplateMarketplaceModal.tsx)
- [`orbitox/apps/celebrations/components/studio-zero/LiveTemplatePreview.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/studio-zero/LiveTemplatePreview.tsx)
- [`orbitox/apps/celebrations/components/studio-zero/TemplatePanel.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/studio-zero/TemplatePanel.tsx)
- [`orbitox/apps/celebrations/components/studio-zero/StudioShell.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/studio-zero/StudioShell.tsx)

#### Implementation Steps:
1. **Implement `TemplateMarketplaceModal.tsx`**:
   - Large, spacious visual grid with 16:9 cinematic cards and hover video/motion loops.
   - Filter pills: `All`, `SaaS`, `Portfolio`, `Ecommerce`, `Agency`, `Celebrations & Events`, `3D & Immersive`.
   - Search bar with instant debounced keyword matching.
   - Template metadata badge showing total sections count, component count, design system palette, and CMS readiness.
2. **Implement `LiveTemplatePreview.tsx`**:
   - Dedicated interactive sandbox viewport.
   - **Device Toggle**:
     - **Desktop** (1440px viewport frame)
     - **Tablet** (768px viewport frame)
     - **Mobile** (375px viewport frame)
   - Interactive live scrolling, button hover animations, and section navigation inside the sandbox.
   - Non-destructive insertion action bar:
     - `[ Add Section to Active Page ]` (with section selector dropdown: Hero, Features, Pricing, Footer).
     - `[ Add as New Page ]` (creates new route without altering active page).
     - `[ Use as New Project ]` (starts fresh project).
     - `[ Safe Replace Site ]` (requires explicit confirmation modal and creates an undo snapshot).
3. **Refactor `TemplatePanel.tsx` & `StudioShell.tsx`**:
   - Deprecate the cramped 320px text-card drawer.
   - Remove destructive direct bindings to `handleReplaceSite` at lines 963 and 1319 in `StudioShell.tsx`.
   - Wire the left rail `Templates` button to open the full `TemplateMarketplaceModal`.

---

### Phase 5: Universal `+ Add` Command Center

**App**: `orbitox/apps/celebrations`  
**Target Files**:
- [`orbitox/apps/celebrations/components/studio-zero/UniversalAddCommandCenter.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/studio-zero/UniversalAddCommandCenter.tsx)
- [`orbitox/apps/celebrations/components/studio-zero/StudioRail.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/studio-zero/StudioRail.tsx)
- [`orbitox/apps/celebrations/components/studio-zero/StudioShell.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/studio-zero/StudioShell.tsx)

#### Implementation Steps:
1. **Implement `UniversalAddCommandCenter.tsx`**:
   - Modal dialog / command palette triggerable via `A`, `⌘K`, or the primary `+` rail button.
   - Instant fuzzy search filtering across all creative primitives.
   - **8 Unified Creative Categories**:
     1. **Elements**: Heading, Paragraph, Button, Image, Video, Shape, Icon, Divider, Embed.
     2. **Layout**: Frame (Auto Layout), Stack (Horizontal / Vertical), Grid (2, 3, 4 Column), Container.
     3. **Sections**: Hero, Features Bento, Pricing Tiers, Testimonials, FAQ Accordion, CTA Banner, Footer.
     4. **Components**: Master Components, Instances, Team Library.
     5. **Assets**: Media Library, Upload Media, WOFF2 Custom Fonts, 3D GLB Models.
     6. **Templates**: Full Websites, Section Packs, Design System Universes.
     7. **AI Generation**: Generate Section, AI Remix, Copy Polisher.
     8. **Intake**: Drop Files, Paste URL, Figma Bridge.
2. **Direct Visual Insertion & Drag-Out**:
   - Clicking an item inserts it directly at the canvas center or selected container.
   - Dragging an item drags a ghost preview directly onto the canvas at exact mouse coordinates.
3. **Wire Shortcuts in `StudioShell.tsx`**:
   - Register global keybinding `A` and `⌘K` to open `UniversalAddCommandCenter`.

---

### Phase 6: Universal 8-Target Context Menu & Spatial Ancestor Drill-Down

**App**: `orbitox/apps/celebrations`  
**Target Files**:
- [`orbitox/apps/celebrations/components/template-studio/components/context-menu/CanvasContextMenu.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/template-studio/components/context-menu/CanvasContextMenu.tsx)
- [`orbitox/apps/celebrations/components/template-studio/components/context-menu/ContextMenuManager.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/template-studio/components/context-menu/ContextMenuManager.tsx)
- [`orbitox/apps/celebrations/components/studio-zero/CanvasWorkspace.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/studio-zero/CanvasWorkspace.tsx)

#### The 8 Specialized Context Targets:
```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       8 SPECIALIZED CONTEXT TARGETS                                    │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  1. Canvas Background : Paste Here, Select All, Add Section, Zoom Fit, Toggle Grid, Import             │
│  2. Single Element    : Cut, Copy, Duplicate, Delete, Lock, Hide, Arrange, Copy Styles, Component       │
│  3. Image & Media     : Replace Asset (Library/Upload/URL), Fit & Fill, Crop Image, AI Enhance         │
│  4. Layout Frame      : Add Child, Direction (Row/Col), Wrap, Align, Auto-Tidy, Convert to Section     │
│  5. Section Container : Rename, Duplicate, Move Order (Up/Down), Insert Above/Below, Save Section      │
│  6. Component Node    : Edit Master Component, Push to Master, Reset Overrides, Detach Instance       │
│  7. Multi-Selection   : Group (⌘G), Wrap Auto Layout (⌥⌘G), Align, Distribute Spacing, Batch Delete   │
│  8. Layer Tree Item   : Focus in Viewport, Rename, Duplicate, Collapse/Expand Children, Delete        │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Implementation Steps:
1. **Expand `CanvasContextMenu.tsx`**:
   - Update `ContextMenuType = 'canvas' | 'node' | 'image' | 'frame' | 'section' | 'component' | 'multi_node' | 'layer_tree'`.
   - Implement dedicated action groups and keyboard shortcuts for all 8 targets.
2. **Implement Spatial Ancestor Drill-Down (`Select Layer >`)**:
   - Traverse the DOM tree from hit-tested leaf node upward to root scene.
   - Render interactive cascading breadcrumb:
     `Heading "Get Started" ▶ Button Frame ▶ CTA Container ▶ Hero Section`.
   - Hovering an ancestor highlights its bounding box on canvas; clicking selects it immediately.
3. **Keyboard Accessibility**:
   - Arrow keys (`↑`, `↓`) navigate menu items, `Enter` activates, `Escape` dismounts menu.

---

### Phase 7: Smart Multi-MIME OS Clipboard Bridge & External Media Paste Engine

**Package / App**: `@orbitox-io/importer-core` & `orbitox/apps/celebrations`  
**Target Files**:
- [`orbitox/apps/celebrations/components/template-studio/engine/SceneGraphClipboard.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/template-studio/engine/SceneGraphClipboard.ts)
- [`orbitox/packages/importer-core/src/clipboard/SystemClipboardBridge.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/packages/importer-core/src/clipboard/SystemClipboardBridge.ts)
- [`orbitox/apps/celebrations/components/template-studio/components/context-menu/SmartPastePrompt.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/template-studio/components/context-menu/SmartPastePrompt.tsx)

#### Implementation Steps:
1. **Extend `SceneGraphClipboard.ts` with Multi-MIME Decoding**:
   - Read system clipboard via `navigator.clipboard.read()`:
     - `application/x-orbitox-scenegraph`: Native lossless paste with newly generated UUIDs.
     - `image/png`, `image/jpeg`, `image/webp`: Extract blob, stream to `AssetIngestionService`, compute SHA-256 ID, and insert native `image` node at mouse cursor.
     - `image/svg+xml`: Parse SVG vector paths and insert editable vector `frame` node.
     - `text/html`: If an external HTML snippet or `<section>` is pasted:
       - Spawn non-intrusive floating **Smart Paste Prompt** at cursor:
         `[ Paste as Native Elements ]` (Default) | `[ Paste as New Section ]` | `[ Paste as HTML Embed ]`.
       - Compiles HTML/CSS through `HtmlAdapter` directly into native nodes.
     - `text/plain`: If URL $\to$ create link/button; if text $\to$ insert typography node.
2. **Implement `SmartPastePrompt.tsx`**:
   - Sleek glassmorphic floating prompt positioned at mouse coordinates with 1-click decision pills.

---

### Phase 8: Interactive SVG Box Model & Visual Corner Radius Presets

**App**: `orbitox/apps/celebrations`  
**Target Files**:
- [`orbitox/apps/celebrations/components/studio-zero/inspectors/BoxModelControl.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/studio-zero/inspectors/BoxModelControl.tsx)
- [`orbitox/apps/celebrations/components/studio-zero/inspectors/CornerRadiusControl.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/studio-zero/inspectors/CornerRadiusControl.tsx)
- [`orbitox/apps/celebrations/components/studio-zero/PropertiesPanel.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/studio-zero/PropertiesPanel.tsx)

#### Implementation Steps:
1. **Implement `BoxModelControl.tsx`**:
   - Interactive concentric SVG diagram:
     - **Margin Box** (outer dashed amber border)
     - **Padding Box** (middle dashed blue border)
     - **Content Dimensions** (center solid card showing `Width × Height`)
   - **Interactive Scrubbing**:
     - Click-and-drag horizontal scrub on any padding/margin value to adjust in real time (60fps).
     - Individual inputs for Top, Right, Bottom, Left.
     - Mode toggles: **4-Way Independent** vs **2-Axis (X/Y)** vs **Uniform (All)**.
     - Unit selectors: `px`, `%`, `rem`, `auto`.
2. **Implement `CornerRadiusControl.tsx`**:
   - Interactive rounded rectangle diagram with 4 clickable corner hotspots (Top-Left, Top-Right, Bottom-Right, Bottom-Left).
   - **5 Instant 1-Click Presets**:
     - `None` (0px)
     - `Small` (4px)
     - `Medium` (8px)
     - `Large` (16px)
     - `Pill` (9999px)
   - Linked vs. Decoupled slider and numeric inputs.
3. **Embed into `PropertiesPanel.tsx`**:
   - Replace legacy plain text inputs in the Layout and Design tabs with `BoxModelControl` and `CornerRadiusControl`.

---

### Phase 9: Dynamic CMS Collections & Canvas Repeater Binding Engine

**App**: `orbitox/apps/celebrations`  
**Target Files**:
- [`orbitox/apps/celebrations/components/template-studio/engine/CMSCollectionStore.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/template-studio/engine/CMSCollectionStore.ts)
- [`orbitox/apps/celebrations/components/studio-zero/DataPanel.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/studio-zero/DataPanel.tsx)
- [`orbitox/apps/celebrations/components/studio-zero/PropertiesPanel.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/studio-zero/PropertiesPanel.tsx)
- [`orbitox/apps/celebrations/components/template-studio/engine/NodeRendererRegistry.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/template-studio/engine/NodeRendererRegistry.tsx)

#### Implementation Steps:
1. **Implement `CMSCollectionStore.ts`**:
   - Built-in schema templates: `Products`, `Blog Posts`, `Team Members`, `Client Testimonials`, `Events`.
   - Support for custom collection schema definitions with field types: `Text`, `RichText`, `Image`, `Number`, `Boolean`, `Date`, `Slug`.
   - Full CRUD operations with IndexedDB persistence.
2. **Rebuild `DataPanel.tsx`**:
   - Replace flat string scalar state with structured Collection Manager.
   - Data table view with in-line item editing, adding rows, and schema customization.
3. **Repeater Node Engine & Data Binding**:
   - In `PropertiesPanel.tsx` (Data Tab), allow any Grid or Stack node to toggle: **"Bind to CMS Collection"**.
   - Select collection (e.g. `Products`), filter criteria, and sort order.
   - Child node property binding: `node.content.text = item.title`, `node.content.imageRef = item.thumbnail`, `node.content.buttonHref = '/products/' + item.slug`.
   - Update `NodeRendererRegistry.tsx` to dynamically project collection items through template cards reactively.

---

### Phase 10: End-to-End Test Suite, Production Build & Master Verification Gates

**Files to Create & Execute**:
- [`orbitox/apps/celebrations/tests/e2e/p26-1-creative-intake.spec.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/tests/e2e/p26-1-creative-intake.spec.ts)
- Compilation target: `npm run build:prod` across all packages and apps.

#### The 10 Master Acceptance Gates:
1. **Gate G1: 3-Step Creative Intake**: Dragging HTML landing page triggers global overlay; reports plain-English summary; "Add to current page" produces fully editable SceneGraph nodes.
2. **Gate G2: Template Marketplace & Multi-Device Preview**: Opens marketplace, selects template, previews interactively across Desktop/Tablet/Mobile; "Add Section" inserts only Hero without touching canvas.
3. **Gate G3: Universal `+ Add` Command Center**: Pressing `A` opens command palette; typing "Pricing" filters 3-tier card; clicking inserts cleanly at target position.
4. **Gate G4: Centralized CAS Asset Ingestion & Drop Swap**: Dragging image file over canvas image node highlights with "Drop to Replace Asset"; updates image URL in-place while preserving layout.
5. **Gate G5: 8-Target Context Menu & Ancestor Drilldown**: Right-clicking nested text shows `Select Layer >` breadcrumbs (`Text ▶ Button ▶ Card ▶ Section`); clicking Card switches selection.
6. **Gate G6: Smart Multi-MIME OS Clipboard Bridge**: Copying external HTML or image blob and pressing `Cmd+V` compiles into native editable vector nodes.
7. **Gate G7: Interactive SVG Box Model & Corner Radius Presets**: Scrubbing padding on SVG box model resizes element live; clicking "Pill" applies 9999px radius.
8. **Gate G8: CIELAB Color Token Clustering**: Ingesting HTML with 6 similar dark hex codes clusters them into 1 semantic `Background Dark` token.
9. **Gate G9: Dynamic CMS Repeaters**: Binding `Products` collection to canvas Grid renders 3 dynamic cards; editing price in CMS updates canvas reactively.
10. **Gate G10: Zero Regression Production Build**: Running `npm run build:prod` compiles with zero TypeScript errors (`sourceMap: false`), and Playwright test suite passes 100%.

---

## 6. Security, Zero-Trust Multi-Tenancy & Anti-Tamper Guarantees

Strictly conforming to [AGENTS.md](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/AGENTS.md):

1. **Scoped Package Integrity**:
   - All modules, adapters, and plugins are packaged under `@orbitox-io/*` and published to GitHub Packages.
2. **SSRF Immunity on URL Ingestion**:
   - Remote URL crawls pass through `SecuritySanitizer.validateUrl`, strictly rejecting loopback (`127.0.0.1`, `localhost`), private RFC 1918 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and cloud metadata endpoints (`169.254.169.254`).
3. **Zip Bomb Defense**:
   - Decompression enforces a strict 100MB uncompressed limit and 10:1 compression ratio threshold to prevent memory exhaustion attacks.
4. **Script & Iframe Quarantine**:
   - Ingested `<script>`, `<iframe>`, `onload`, and `onclick` tags are stripped from native trees and safely quarantined in `customCodeBoundaries` with isolated sandboxing.
5. **Ed25519 Cryptographic Signatures**:
   - All project templates and marketplace packages are verified using `TemplatePackager.verifySignature`.
6. **Facade & Kernel Freezing**:
   - `SandboxGuard.freezeAllFacades` deeply freezes kernel internals to prevent prototype pollution or unauthorized runtime monkey-patching.
7. **Zero-Trust Multi-Tenancy**:
   - All asset and CMS persistent records are scoped by `tenantId` via `session.scopeData(payload)` using `AsyncLocalStorage.getActiveTenant()`.

---

## 7. Rollback & Atomic Commit Protocol

1. **Single Transaction Boundary**:
   - Every intake operation, template insertion, asset drop, and clipboard paste is executed inside a transaction boundary (`SceneGraphEngine.beginTransaction`).
2. **One-Tick Reversal**:
   - If any step in AST translation, token extraction, or asset indexing throws an exception, `SceneGraphEngine.rollbackTransaction` restores the prior state snapshot in 1 tick.
3. **Undo/Redo Integrity**:
   - All completed operations commit as a discrete entry in the `undoStack`, ensuring a single `Cmd+Z` completely unwinds any intake operation.

---

## 8. Complete File Ledger & Modification Manifest

| Subsystem | File Path | Action | Description |
| :--- | :--- | :---: | :--- |
| **Import IR** | [`orbitox/packages/importer-core/src/types/ImportIR.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/packages/importer-core/src/types/ImportIR.ts) | Modify | Add `IngestionFidelityReport`, heuristics, and classifications |
| **Token Pipeline** | [`orbitox/packages/importer-core/src/pipeline/DesignSystemExtractor.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/packages/importer-core/src/pipeline/DesignSystemExtractor.ts) | Create | Implement CIELAB color conversion, $\Delta E < 2.3$ clustering |
| **Component Pipeline** | [`orbitox/packages/importer-core/src/pipeline/ComponentDetector.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/packages/importer-core/src/pipeline/ComponentDetector.ts) | Create | Implement structural subtree Merkle hashing for component mining |
| **Asset Service** | [`orbitox/apps/celebrations/components/template-studio/services/AssetIngestionService.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/template-studio/services/AssetIngestionService.ts) | Create | Centralized CAS storage with SHA-256 deduplication and progress events |
| **Drop Surface** | [`orbitox/apps/celebrations/components/studio-zero/GlobalDropzoneOverlay.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/studio-zero/GlobalDropzoneOverlay.tsx) | Create | Window-level translucent overlay with hover node target highlight |
| **Creative Intake** | [`orbitox/apps/celebrations/components/template-studio/components/OrbitoXCreativeIntakeModal.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/template-studio/components/OrbitoXCreativeIntakeModal.tsx) | Create | 3-step intake workflow (Drop → Understand → Bring it in) |
| **Universal Import** | [`orbitox/apps/celebrations/components/template-studio/components/OrbitoXUniversalImportModal.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/template-studio/components/OrbitoXUniversalImportModal.tsx) | Modify | Delegate to Creative Intake Modal; sequester AST console under expert tab |
| **Template Marketplace**| [`orbitox/apps/celebrations/components/studio-zero/TemplateMarketplaceModal.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/studio-zero/TemplateMarketplaceModal.tsx) | Create | Visual 16:9 cards, filter categories, non-destructive insertion |
| **Live Preview** | [`orbitox/apps/celebrations/components/studio-zero/LiveTemplatePreview.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/studio-zero/LiveTemplatePreview.tsx) | Create | Interactive multi-device sandbox (Desktop, Tablet, Mobile) |
| **Template Drawer** | [`orbitox/apps/celebrations/components/studio-zero/TemplatePanel.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/studio-zero/TemplatePanel.tsx) | Modify | Remove destructive single-click apply; launch Marketplace Modal |
| **Command Center** | [`orbitox/apps/celebrations/components/studio-zero/UniversalAddCommandCenter.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/studio-zero/UniversalAddCommandCenter.tsx) | Create | Universal `+ Add` hub (`⌘K` / `A`) across 8 creative categories |
| **Context Menus** | [`orbitox/apps/celebrations/components/template-studio/components/context-menu/CanvasContextMenu.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/template-studio/components/context-menu/CanvasContextMenu.tsx) | Modify | 8 specialized target menus and `Select Layer >` ancestor drill-down |
| **Clipboard Bridge** | [`orbitox/apps/celebrations/components/template-studio/engine/SceneGraphClipboard.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/template-studio/engine/SceneGraphClipboard.ts) | Modify | Multi-MIME decoding, image blob paste, and smart HTML prompt |
| **Smart Paste** | [`orbitox/apps/celebrations/components/template-studio/components/context-menu/SmartPastePrompt.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/template-studio/components/context-menu/SmartPastePrompt.tsx) | Create | Floating non-intrusive cursor prompt for HTML ingestion choices |
| **Box Model** | [`orbitox/apps/celebrations/components/studio-zero/inspectors/BoxModelControl.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/studio-zero/inspectors/BoxModelControl.tsx) | Create | Interactive SVG concentric diagram with drag-scrubbing & units |
| **Corner Radius** | [`orbitox/apps/celebrations/components/studio-zero/inspectors/CornerRadiusControl.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/studio-zero/inspectors/CornerRadiusControl.tsx) | Create | Visual 4-hotspot rounded rect with 5 presets (None, Small, Medium, Large, Pill) |
| **Properties Panel** | [`orbitox/apps/celebrations/components/studio-zero/PropertiesPanel.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/studio-zero/PropertiesPanel.tsx) | Modify | Embed BoxModelControl and CornerRadiusControl into layout & styles tabs |
| **CMS Store** | [`orbitox/apps/celebrations/components/template-studio/engine/CMSCollectionStore.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/template-studio/engine/CMSCollectionStore.ts) | Create | Structured Collections store, field schemas, and persistence |
| **Data Panel** | [`orbitox/apps/celebrations/components/studio-zero/DataPanel.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/studio-zero/DataPanel.tsx) | Modify | Replace flat scalar `useState` with Collections Manager |
| **Studio Shell** | [`orbitox/apps/celebrations/components/studio-zero/StudioShell.tsx`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/components/studio-zero/StudioShell.tsx) | Modify | Mount GlobalDropzone, wire UniversalAdd, fix destructive template bindings |
| **E2E Test Suite** | [`orbitox/apps/celebrations/tests/e2e/p26-1-creative-intake.spec.ts`](file:///Users/apple/Documents/Office/company/Orbito/OrbitoX%20Platform/orbitox/apps/celebrations/tests/e2e/p26-1-creative-intake.spec.ts) | Create | Playwright test script validating all 10 acceptance gates |
