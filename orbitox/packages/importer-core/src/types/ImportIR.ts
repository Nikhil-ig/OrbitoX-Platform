/**
 * OrbitoX Universal Import IR Schema (v1.0)
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
  | 'pdf_visual';

export type IngestionFidelityClassification =
  | 'native'
  | 'hybrid'
  | 'custom_runtime'
  | 'unsupported';

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

export interface ImportedProject {
  irVersion: '1.0' | '2.0';
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
  fidelityReport?: IngestionFidelityReport;
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

export interface ImportedResponsiveOverride {
  layout?: Partial<ImportedNode['layout']>;
  geometry?: Partial<ImportedNode['geometry']>;
  style?: Partial<ImportedNode['style']>;
  typography?: Partial<ImportedNode['typography']>;
  content?: Partial<ImportedNode['content']>;
}

export interface ImportedNode {
  id: string;
  sourceNodeId?: string;
  name: string;
  kind: ImportedNodeKind;
  parentId: string | null;
  children: string[];
  conversionClassification?: IngestionFidelityClassification;

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
      clusteredTokenRef?: string;
      opacity?: number;
    }>;
    strokes?: Array<{
      color: string;
      width: number;
      style: 'solid' | 'dashed' | 'dotted';
      tokenRef?: string;
      clusteredTokenRef?: string;
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
    colorClusteredTokenRef?: string;
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
    tablet?: ImportedResponsiveOverride;
    mobile?: ImportedResponsiveOverride;
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
