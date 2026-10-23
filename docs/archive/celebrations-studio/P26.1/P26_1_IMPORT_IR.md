# P26.1 Specification: OrbitoX Universal Import IR (v2.0)

## 1. Architectural Philosophy

The **OrbitoX Import Intermediate Representation (Import IR v2.0)** is the universal, normalized lingua franca of the OrbitoX ingestion engine. Regardless of whether input originates from an HTML/Tailwind snippet, a Figma component library, a Shopify Dawn theme ZIP, an Adobe XD artboard, a WordPress block theme, an SVG vector, or a live crawled website, all adapters translate their source AST into this single, canonical IR.

### Foundational Invariants:
1. **Zero Flattening**: Layouts are preserved as true flexbox/grid containers (`frame`, `stack`, `grid`) rather than rasterized pixel snapshots or flat absolute coordinates.
2. **Honest Fidelity Reporting**: Every single node declares its exact conversion fidelity (`native`, `hybrid`, `custom`, `unsupported`) and a mathematical confidence score (0.00 to 1.00).
3. **Lossless Source Traceability**: Every node records its origin (source file, component, DOM selector, line number, or Figma node ID) enabling developer inspection and reverse synchronization.
4. **Atomic Transactionality**: Projects are never partially imported. The engine stages the entire IR, allows visual preview, validates integrity, and commits in a single undoable transaction.

---

## 2. Complete TypeScript Schema Specification

```typescript
/**
 * OrbitoX Universal Import IR Schema (v2.0)
 * Package: @orbitox-io/importer-core
 */

export type SourceFormatType =
  | 'figma'
  | 'adobe_xd'
  | 'canva'
  | 'shopify'
  | 'wordpress'
  | 'wix'
  | 'web_url'
  | 'html_css'
  | 'react_jsx'
  | 'vue'
  | 'svelte'
  | 'svg_vector'
  | 'pdf_visual'
  | 'binary_asset';

export type NodeConversionKind =
  | 'native'         // 100% editable SceneGraph node with full visual & layout fidelity
  | 'hybrid'         // Native frame hosting isolated dynamic micro-runtime
  | 'custom'         // Custom script / WebGL / Canvas runtime sandbox
  | 'unsupported';   // Preserved raw code snippet in an isolated non-destructive boundary

export interface ImportedProjectIR {
  irVersion: '2.0';
  sourceFormat: SourceFormatType;
  sourceOrigin: {
    url?: string;
    fileName?: string;
    fileSize?: number;
    importedAt: string;
    clientUserAgent?: string;
  };
  metadata: {
    title: string;
    description?: string;
    author?: string;
    originalToolVersion?: string;
    originalThemeName?: string;
  };
  designTokens: ImportedDesignTokens;
  pages: ImportedPage[];
  globalComponents: Record<string, ImportedComponent>;
  assets: Record<string, ImportedAsset>;
  sourceTrace: ImportedSourceTraceMap;
  confidenceReport: ImportConfidenceReport;
  customCodeBoundaries?: ImportedCustomCodeBoundary[];
}

export interface ImportedPage {
  id: string;
  name: string;
  route: string;
  isHome: boolean;
  sections: ImportedSection[];
  meta?: {
    title?: string;
    description?: string;
    ogImage?: string;
  };
}

export interface ImportedSection {
  id: string;
  name: string;
  archetype?: 'hero' | 'features' | 'pricing' | 'testimonials' | 'cta' | 'header' | 'footer' | 'faq' | 'gallery' | 'custom';
  sourceTag?: string;
  geometry: {
    height: 'auto' | 'screen' | number;
    minHeight?: number;
    paddingTop?: number;
    paddingBottom?: number;
    maxWidth?: number | 'full';
  };
  style: {
    backgroundColor?: string;
    backgroundImageUrl?: string;
    backgroundGradient?: string;
  };
  rootNodeId: string;
  nodes: Record<string, ImportedNode>;
  renderOrder: string[];
}

export type ImportedNodeKind =
  | 'frame'
  | 'stack'
  | 'grid'
  | 'text'
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'video'
  | 'audio'
  | 'button'
  | 'icon'
  | 'vector_path'
  | 'divider'
  | 'repeater'
  | 'component_instance'
  | 'custom_embed';

export interface ImportedNode {
  id: string;
  sourceNodeId?: string;
  name: string;
  kind: ImportedNodeKind;
  parentId: string | null;
  children: string[];

  // Conversion Fidelity & Confidence
  conversion: NodeConversionKind;
  confidence: number; // 0.00 to 1.00
  confidenceHeuristics?: {
    tagMatched: boolean;
    classesInferred: boolean;
    layoutPreserved: boolean;
    computedStyleExact: boolean;
    reasons: string[]; // e.g. ["h1 hierarchy verified", "large viewport hero container", "CTA button detected"]
  };

  layout: {
    mode: 'flex' | 'grid' | 'absolute' | 'flow';
    direction?: 'horizontal' | 'vertical';
    wrap?: boolean;
    justifyContent?: 'start' | 'center' | 'end' | 'space-between' | 'space-around';
    alignItems?: 'start' | 'center' | 'end' | 'stretch';
    gap?: number | string;
    padding?: { top: number; right: number; bottom: number; left: number };
    gridColumns?: string;
    gridRows?: string;
  };

  geometry: {
    x?: number;
    y?: number;
    width: number | string | 'auto' | 'full';
    height: number | string | 'auto' | 'full';
    minWidth?: number | string;
    maxWidth?: number | string;
    minHeight?: number | string;
    maxHeight?: number | string;
    rotation?: number;
    opacity?: number;
    zIndex?: number;
  };

  style: {
    fills?: Array<{
      type: 'solid' | 'gradient_linear' | 'gradient_radial' | 'image_pattern';
      color?: string;
      gradient?: string;
      tokenRef?: string;
      opacity?: number;
    }>;
    strokes?: Array<{
      color: string;
      width: number;
      style: 'solid' | 'dashed' | 'dotted';
      tokenRef?: string;
    }>;
    borderRadius?: number | { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number };
    boxShadow?: Array<{
      x: number;
      y: number;
      blur: number;
      spread: number;
      color: string;
      inset?: boolean;
    }>;
    backdropFilter?: string;
    overflow?: 'visible' | 'hidden' | 'scroll';
  };

  typography?: {
    fontFamily: string;
    fontFamilyTokenRef?: string;
    fontSize: number;
    fontSizeTokenRef?: string;
    fontWeight: number | string;
    lineHeight: number | string;
    letterSpacing?: number | string;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
    color: string;
    colorTokenRef?: string;
  };

  content?: {
    text?: string;
    htmlSnippet?: string;
    imageRef?: string;
    altText?: string;
    vectorSvgPath?: string;
    buttonHref?: string;
    buttonTarget?: '_self' | '_blank';
  };

  responsiveOverrides?: {
    tablet?: Partial<ImportedNode>;
    mobile?: Partial<ImportedNode>;
  };

  dataBinding?: {
    model: string;
    field: string;
    expression?: string;
    repeaterCollection?: string;
  };

  motion?: {
    preset?: 'fade' | 'slideUp' | 'zoom' | 'parallax' | 'reveal';
    durationMs?: number;
    delayMs?: number;
    trigger?: 'scroll' | 'load' | 'hover';
  };

  sourceTrace?: {
    sourceType: SourceFormatType;
    sourceFile?: string;
    sourcePath?: string;
    sourceSelector?: string;
    sourceTag?: string;
    sourceClasses?: string[];
    sourceLine?: number;
    sourceColumn?: number;
    sourceComponent?: string;
    sourceFigmaNodeId?: string;
  };
}

export interface ImportedDesignTokens {
  colors: Record<string, { value: string; originalName?: string; inferredRole: 'primary' | 'secondary' | 'background' | 'surface' | 'accent' | 'text' }>;
  typography: Record<string, { fontFamily: string; fallback: string; weights: number[]; googleFontUrl?: string }>;
  spacing: Record<string, number>;
  radii: Record<string, number>;
  shadows: Record<string, string>;
}

export interface ImportedAsset {
  id: string;
  name: string;
  mimeType: string;
  originalUrl?: string;
  localBlobId?: string;
  dimensions?: { width: number; height: number };
  sizeBytes?: number;
  hash: string;
}

export interface ImportedComponent {
  id: string;
  name: string;
  description?: string;
  sourceMasterId?: string;
  rootNodeId: string;
  nodes: Record<string, ImportedNode>;
  propertySchema: Record<string, {
    type: 'text' | 'image' | 'color' | 'boolean' | 'select';
    default: any;
    label: string;
  }>;
}

export interface ImportedCustomCodeBoundary {
  id: string;
  title: string;
  reason: 'unsupported_liquid_filter' | 'arbitrary_js_script' | 'unparseable_web_component' | 'third_party_app_block';
  rawSnippet: string;
  isolatedSandbox: boolean;
}

export interface ImportConfidenceReport {
  overallScore: number; // 0 to 100
  totalNodes: number;
  nativeCount: number;
  hybridCount: number;
  customRuntimeCount: number;
  unsupportedCount: number;
  unsupportedFeatures: Array<{
    feature: string;
    occurrences: number;
    fallbackApplied: string;
  }>;
  warnings: string[];
}
```

---

## 3. Explainability Engine: "Why Did OrbitoX Detect This?"

When the creator inspects any imported section (e.g. `Hero Section: 96% Confidence`), clicking the info icon reveals:
```
┌────────────────────────────────────────────────────────┐
│  Section Detected: Hero Banner (Confidence: 96%)       │
├────────────────────────────────────────────────────────┤
│  Detected Heuristics:                                  │
│  ✓ Semantic <header> / <section> tag                   │
│  ✓ High-prominence H1 heading ("Elevate Celebrations") │
│  ✓ Full-viewport height container (height: 80vh)       │
│  ✓ Prominent Call-to-Action button detected            │
│  ✓ Hero background image / gradient fill               │
│                                                        │
│  Source Mapping:                                       │
│  Next.js components/Hero.tsx:31 (.hero-container)      │
│                                                        │
│  [Change Archetype] (Features / CTA / Custom)          │
└────────────────────────────────────────────────────────┘
```
This guarantees complete transparency and lets the creator correct any misidentified sections before committing.
