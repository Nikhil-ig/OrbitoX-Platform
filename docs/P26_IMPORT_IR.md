# 🪐 OrbitoX P26 — Universal Import Intermediate Representation (Import IR)
**Document ID:** `docs/P26_IMPORT_IR.md`  
**Phase:** P26 Phase 0 (Data Architecture)  
**Status:** CANONICAL SPECIFICATION  
**Author:** Principal Product Architect & Creative Tool Architecture Team  
**Date:** October 2026  

---

## 1. Executive Summary & Design Principle

The **OrbitoX Import Intermediate Representation (Import IR)** is the central normalization layer of the Universal Import Engine.

Instead of writing $N \times M$ separate converters between $N$ source formats and $M$ internal target subsystems, OrbitoX adopts the canonical compiler architecture:
$$\text{Source Formats } (N) \xrightarrow[\text{Adapters}]{\quad} \textbf{OrbitoX Import IR} \xrightarrow[\text{Normalizer \& Mapper}]{\quad} \text{Canonical SceneGraph } (1)$$

Every adapter—whether parsing Figma JSON, Adobe XD packages, Shopify Liquid themes, WordPress block templates, React JSX trees, or live headless browser DOM snapshots—must emit this exact, validated, strongly-typed IR.

---

## 2. Canonical TypeScript Definitions

```typescript
/**
 * OrbitoX Universal Import IR Schema (v1.0)
 * Location: packages/importer-core/src/types/ImportIR.ts
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
  | 'pdf_visual';

export interface ImportedProject {
  irVersion: '1.0';
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
  archetype?: 'hero' | 'features' | 'pricing' | 'testimonials' | 'cta' | 'header' | 'footer' | 'custom';
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

  sourceTrace: {
    originalSelector?: string;
    originalTag?: string;
    originalClasses?: string[];
    originalLine?: number;
    fidelityConfidence: number; // 0.0 to 1.0
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
  highConfidenceCount: number; // >= 0.9
  mediumConfidenceCount: number; // 0.6 - 0.89
  lowConfidenceCount: number; // < 0.6
  unsupportedFeatures: Array<{
    feature: string;
    occurrences: number;
    fallbackApplied: string;
  }>;
  warnings: string[];
}

export interface ImportedSourceTraceMap {
  [nodeId: string]: {
    sourceFilePath?: string;
    sourceLine?: number;
    sourceColumn?: number;
    sourceFigmaNodeId?: string;
    sourceDOMSelector?: string;
    sourceTag?: string;
  };
}
```

---

## 3. Data Integrity & Validation Pipeline

Before any `ImportedProject` is converted into a native OrbitoX `TemplateSchema` and `SceneGraph`, it passes through strict validation gates:

```
┌─────────────────────────────────┐
│     Raw Source Payload          │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│     Source Adapter Parser       │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│     Import IR Generator         │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│   Strict Zod / JSON Schema Gate │ ──► Invalids flagged / quarantined
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│   Semantic Normalizer & Dedup   │ ──► Tokens reconciled, images localized
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│   OrbitoX SceneGraph Compiler   │ ──► Target Editable Project
└─────────────────────────────────┘
```

### Validation Invariants:
1. **Tree Coherence:** Every `node.parentId` must point to an existing node in `section.nodes` or `null` for the root. Circular references trigger immediate validation rejection.
2. **Deterministic IDs:** IDs are generated using content hashing + collision-proof nanoids (`imp_${type}_${hash}`).
3. **No Flatted Bitmaps:** An imported section cannot consist of a single image node covering the whole viewport unless the source was explicitly an image/PDF fallback.
4. **Token Deduping:** Hex colors differing by less than 2% Euclidean distance in LAB color space are clustered into a single canonical design token.

*This concludes the Universal Import IR specification. Proceed to `docs/P26_ADAPTER_ARCHITECTURE.md` for adapter pipeline mechanics.*
