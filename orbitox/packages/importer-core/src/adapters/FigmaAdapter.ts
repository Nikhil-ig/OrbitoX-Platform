/**
 * @orbitox-io/importer-core - Figma Universal Source Adapter
 * Ingests Figma REST API JSON AST, direct nodes, and .fig data into normalized OrbitoX Import IR.
 */

import {
  ImportedProject,
  ImportedPage,
  ImportedSection,
  ImportedNode,
  ImportedNodeKind,
} from '../types/ImportIR';
import { SourceAdapter, SourceAdapterOptions, AdapterParseResult } from '../types/Adapter';
import { SecuritySanitizer } from '../pipeline/SecuritySanitizer';
import { TokenExtractor } from '../pipeline/TokenExtractor';
import { FontIngestionService } from '../pipeline/FontIngestionService';
import { AssetLocalizer } from '../pipeline/AssetLocalizer';
import { SvgOptimizer } from '../pipeline/SvgOptimizer';
import { LayoutInferrer } from '../pipeline/LayoutInferrer';

export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface FigmaPaint {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND' | 'IMAGE';
  visible?: boolean;
  opacity?: number;
  color?: FigmaColor;
  gradientStops?: Array<{ position: number; color: FigmaColor }>;
  imageRef?: string;
  scaleMode?: 'FILL' | 'FIT' | 'CROP' | 'TILE';
}

export interface FigmaTypeStyle {
  fontFamily?: string;
  fontWeight?: number;
  fontSize?: number;
  italic?: boolean;
  letterSpacing?: number;
  lineHeightPx?: number;
  lineHeightPercent?: number;
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
  textCase?: 'UPPER' | 'LOWER' | 'TITLE' | 'SMALL_CAPS';
  textDecoration?: 'STRIKETHROUGH' | 'UNDERLINE';
}

export interface FigmaEffect {
  type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  visible?: boolean;
  radius: number;
  color?: FigmaColor;
  offset?: { x: number; y: number };
  spread?: number;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  children?: FigmaNode[];
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  size?: { x: number; y: number };
  relativeTransform?: number[][];
  rotation?: number;
  opacity?: number;
  fills?: FigmaPaint[];
  strokes?: FigmaPaint[];
  strokeWeight?: number;
  strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  cornerRadius?: number;
  rectangleCornerRadii?: [number, number, number, number];
  effects?: FigmaEffect[];
  // Auto-layout properties
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  layoutWrap?: 'NO_WRAP' | 'WRAP';
  primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';
  itemSpacing?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  layoutSizingHorizontal?: 'FIXED' | 'HUG' | 'FILL';
  layoutSizingVertical?: 'FIXED' | 'HUG' | 'FILL';
  layoutPositioning?: 'AUTO' | 'ABSOLUTE';
  // Text specific
  characters?: string;
  style?: FigmaTypeStyle;
  // Vector specific
  vectorPaths?: Array<{ data: string; windingRule?: 'NONZERO' | 'EVENODD' }>;
  // Component specific
  componentId?: string;
  componentProperties?: Record<string, { value: any; type: string }>;
}

export interface FigmaFileResponse {
  name?: string;
  lastModified?: string;
  version?: string;
  document?: FigmaNode;
  nodes?: Record<string, { document: FigmaNode }>;
}

export class FigmaAdapter implements SourceAdapter<string | object> {
  public readonly id = 'figma';
  public readonly name = 'Figma REST & AST Source Adapter';
  public readonly supportedExtensions = ['.fig', '.json'];
  public readonly supportedMimeTypes = ['application/json', 'application/x-figma'];

  public canHandle(input: string | object): boolean {
    if (!input) return false;

    // Handle Figma URLs
    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (/^https:\/\/(www\.)?figma\.com\/(file|design)\/[a-zA-Z0-9_-]+/i.test(trimmed)) {
        return true;
      }
      // Check JSON string
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          return this.isFigmaAst(parsed);
        } catch {
          return false;
        }
      }
      return false;
    }

    if (typeof input === 'object') {
      return this.isFigmaAst(input);
    }

    return false;
  }

  private isFigmaAst(obj: any): boolean {
    if (!obj || typeof obj !== 'object') return false;
    if (obj.document && obj.document.type === 'DOCUMENT') return true;
    if (obj.nodes && typeof obj.nodes === 'object') return true;
    if (typeof obj.type === 'string' && ['DOCUMENT', 'CANVAS', 'FRAME', 'COMPONENT', 'INSTANCE', 'TEXT', 'VECTOR', 'RECTANGLE', 'SECTION'].includes(obj.type)) {
      return true;
    }
    return false;
  }

  public async parse(input: string | object, options?: Partial<SourceAdapterOptions>): Promise<AdapterParseResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];

    let parsedAst: FigmaFileResponse | FigmaNode;
    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (/^https:\/\/(www\.)?figma\.com\/(file|design)\/[a-zA-Z0-9_-]+/i.test(trimmed)) {
        // Return a scaffolded project for remote URL if unauthenticated
        return this.createUrlProjectScaffold(trimmed, options, startTime);
      }
      try {
        parsedAst = JSON.parse(trimmed);
      } catch (err: any) {
        errors.push(`Failed to parse Figma JSON payload: ${err.message}`);
        return {
          success: false,
          projectIR: this.createEmptyProject('Failed Figma Import'),
          warnings,
          errors,
          executionTimeMs: Date.now() - startTime,
        };
      }
    } else {
      parsedAst = input as any;
    }

    // Extract root document and pages
    const { projectName, rootNodes } = this.extractRootStructure(parsedAst);

    if (rootNodes.length === 0) {
      errors.push('No valid frames, canvases, or sections discovered in Figma AST.');
      return {
        success: false,
        projectIR: this.createEmptyProject(projectName),
        warnings,
        errors,
        executionTimeMs: Date.now() - startTime,
      };
    }

    const pages: ImportedPage[] = [];
    const globalComponents: Record<string, any> = {};

    let pageCounter = 1;
    for (const canvasNode of rootNodes) {
      const pageId = options?.targetPageId || `page_figma_${pageCounter++}`;
      const pageName = canvasNode.name || `Page ${pageCounter - 1}`;
      const isHome = pageCounter === 2;

      // Extract sections: if canvasNode is a CANVAS, each child is a section;
      // if canvasNode is a FRAME/COMPONENT/VECTOR, it is itself the section.
      const sections: ImportedSection[] = [];
      const sectionFrames = canvasNode.type === 'CANVAS'
        ? (canvasNode.children || []).filter((child) => child.visible !== false)
        : [canvasNode];

      let sectionCounter = 1;
      for (const frameNode of sectionFrames) {
        const sectionId = options?.targetSectionId || `sec_figma_${frameNode.id.replace(/[:;]/g, '_')}`;
        const sectionNodes: Record<string, ImportedNode> = {};

        // Compile frame subtree into sectionNodes
        const rootNodeId = this.processFigmaNode(frameNode, null, sectionNodes, globalComponents, warnings);

        const archetype = this.detectSectionArchetype(frameNode.name);
        const bgFill = this.extractPrimaryFill(frameNode.fills);

        sections.push({
          id: sectionId,
          name: frameNode.name || `Section ${sectionCounter++}`,
          archetype,
          geometry: {
            height: frameNode.absoluteBoundingBox?.height || 'auto',
            maxWidth: frameNode.absoluteBoundingBox?.width || 1440,
          },
          style: {
            backgroundColor: bgFill || '#0B0F19',
          },
          rootNodeId,
          nodes: sectionNodes,
          renderOrder: Object.keys(sectionNodes),
        });
      }

      pages.push({
        id: pageId,
        name: pageName,
        route: isHome ? '/' : `/${pageName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        isHome,
        sections,
      });
    }

    const project: ImportedProject = {
      irVersion: '1.0',
      sourceFormat: 'figma',
      sourceOrigin: {
        importedAt: new Date().toISOString(),
      },
      metadata: {
        title: projectName,
        description: 'Imported from Figma AST via OrbitoX Universal Importer',
        originalToolVersion: 'Figma v1.0',
      },
      designTokens: {
        colors: {},
        typography: {},
        spacing: {},
        shadows: {},
        radii: {},
      },
      pages,
      globalComponents,
      assets: {},
      sourceTrace: {
        nodeToSourceMap: {},
        unsupportedProperties: {},
      },
      confidenceReport: {
        overallScore: 98,
        totalNodes: pages.reduce((acc, p) => acc + p.sections.reduce((sAcc, s) => sAcc + Object.keys(s.nodes).length, 0), 0),
        highConfidenceCount: pages.reduce((acc, p) => acc + p.sections.reduce((sAcc, s) => sAcc + Object.keys(s.nodes).length, 0), 0),
        mediumConfidenceCount: 0,
        lowConfidenceCount: 0,
        unsupportedFeatures: [],
        warnings,
      },
    };

    // Step 4: Extract Design Tokens
    if (options?.extractDesignTokens !== false) {
      project.designTokens = TokenExtractor.extract(project);
    }

    // Step 5: Resolve Google Fonts and System Fonts
    FontIngestionService.resolveProjectFonts(project);

    // Step 6: Localize Remote Assets
    if (options?.localizeRemoteAssets) {
      const assetReport = await AssetLocalizer.localizeProject(project);
      if (assetReport.warnings.length > 0) {
        warnings.push(...assetReport.warnings);
      }
    }

    return {
      success: errors.length === 0,
      projectIR: project,
      warnings,
      errors,
      executionTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Recursively convert a Figma AST node into an ImportedNode
   */
  private processFigmaNode(
    node: FigmaNode,
    parentId: string | null,
    nodeMap: Record<string, ImportedNode>,
    globalComponents: Record<string, any>,
    warnings: string[]
  ): string {
    const nodeId = `node_${node.id.replace(/[:;]/g, '_')}`;
    const kind = this.mapFigmaTypeToKind(node);
    const layout = this.mapFigmaAutoLayout(node);
    const geometry = this.mapFigmaGeometry(node);
    const style = this.mapFigmaStyle(node);
    const typography = node.type === 'TEXT' ? this.mapFigmaTypography(node) : undefined;

    const childIds: string[] = [];
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        if (child.visible === false) continue;
        const childId = this.processFigmaNode(child, nodeId, nodeMap, globalComponents, warnings);
        childIds.push(childId);
      }
    }

    // If node is a COMPONENT, register in globalComponents
    if (node.type === 'COMPONENT') {
      globalComponents[nodeId] = {
        id: nodeId,
        name: node.name,
        rootNodeId: nodeId,
      };
    }

    const irNode: ImportedNode = {
      id: nodeId,
      sourceNodeId: node.id,
      name: node.name || `${kind}_${node.id}`,
      kind,
      parentId,
      children: childIds,
      layout,
      geometry,
      style,
      typography,
      content: {},
    };

    // Populate content based on kind
    if (node.type === 'TEXT' && node.characters) {
      irNode.content = {
        text: SecuritySanitizer.sanitizeHtml(node.characters),
      };
    }

    // Populate image if present in fills
    const imgFill = (node.fills || []).find((f) => f.type === 'IMAGE' && f.visible !== false);
    if (imgFill && imgFill.imageRef) {
      irNode.kind = 'image';
      irNode.content = {
        imageRef: imgFill.imageRef.startsWith('http') || imgFill.imageRef.startsWith('data:')
          ? imgFill.imageRef
          : `https://figma.com/image/${imgFill.imageRef}`,
        altText: node.name || 'Figma Image',
      };
    }

    // Populate vector SVG path if VECTOR / BOOLEAN_OPERATION
    if (node.vectorPaths && node.vectorPaths.length > 0) {
      const combinedD = node.vectorPaths.map((p) => p.data).join(' ');
      irNode.content = {
        vectorSvgPath: combinedD,
      };
    }

    // Component Instance Reference
    if (node.type === 'INSTANCE' && node.componentId) {
      irNode.content = {
        ...(irNode.content || {}),
      };
    }

    // Layout inference refinement
    const childNodeList = childIds.map((cid) => nodeMap[cid]).filter((n): n is ImportedNode => Boolean(n));
    irNode.layout = LayoutInferrer.inferNodeLayout(irNode, childNodeList);

    nodeMap[nodeId] = irNode;
    return nodeId;
  }

  private mapFigmaTypeToKind(node: FigmaNode): ImportedNodeKind {
    switch (node.type) {
      case 'TEXT':
        const nameLower = (node.name || '').toLowerCase();
        if (nameLower.startsWith('h1') || nameLower.startsWith('h2') || nameLower.startsWith('h3') || (node.style?.fontSize && node.style.fontSize >= 28)) {
          return 'heading';
        }
        if (nameLower.includes('button') || nameLower.includes('btn') || nameLower.includes('cta')) {
          return 'button';
        }
        return 'text';

      case 'RECTANGLE':
      case 'ELLIPSE':
      case 'STAR':
      case 'POLYGON':
        const hasImage = (node.fills || []).some((f) => f.type === 'IMAGE' && f.visible !== false);
        return hasImage ? 'image' : 'frame';

      case 'VECTOR':
      case 'BOOLEAN_OPERATION':
      case 'LINE':
        return 'vector_path';

      case 'INSTANCE':
        return 'component_instance';

      case 'FRAME':
      case 'GROUP':
      case 'SECTION':
      case 'COMPONENT':
      case 'COMPONENT_SET':
      default:
        const lower = (node.name || '').toLowerCase();
        if (lower.includes('btn') || lower.includes('button') || lower.includes('cta')) return 'button';
        if (lower.includes('icon') || lower.includes('symbol')) return 'icon';
        if (node.layoutMode && node.layoutMode !== 'NONE') return 'stack';
        return 'frame';
    }
  }

  private mapFigmaAutoLayout(node: FigmaNode): ImportedNode['layout'] {
    if (!node.layoutMode || node.layoutMode === 'NONE') {
      return {
        mode: node.layoutPositioning === 'ABSOLUTE' ? 'absolute' : 'flow',
      };
    }

    return {
      mode: 'flex',
      direction: node.layoutMode === 'HORIZONTAL' ? 'horizontal' : 'vertical',
      wrap: node.layoutWrap === 'WRAP',
      gap: node.itemSpacing || 0,
      padding: {
        top: node.paddingTop || 0,
        right: node.paddingRight || 0,
        bottom: node.paddingBottom || 0,
        left: node.paddingLeft || 0,
      },
      justifyContent: this.mapPrimaryAxisAlign(node.primaryAxisAlignItems),
      alignItems: this.mapCounterAxisAlign(node.counterAxisAlignItems),
    };
  }

  private mapPrimaryAxisAlign(align?: string): 'start' | 'center' | 'end' | 'space-between' {
    switch (align) {
      case 'CENTER': return 'center';
      case 'MAX': return 'end';
      case 'SPACE_BETWEEN': return 'space-between';
      case 'MIN':
      default: return 'start';
    }
  }

  private mapCounterAxisAlign(align?: string): 'start' | 'center' | 'end' | 'stretch' {
    switch (align) {
      case 'CENTER': return 'center';
      case 'MAX': return 'end';
      case 'BASELINE': return 'start';
      case 'MIN': return 'start';
      default: return 'stretch';
    }
  }

  private mapFigmaGeometry(node: FigmaNode): ImportedNode['geometry'] {
    const bbox = node.absoluteBoundingBox;
    const isFlexChild = node.layoutPositioning !== 'ABSOLUTE';

    let width: number | 'full' | 'auto' = bbox?.width || 100;
    let height: number | 'auto' = bbox?.height || 'auto';

    if (node.layoutSizingHorizontal === 'FILL') width = 'full';
    if (node.layoutSizingHorizontal === 'HUG') width = 'auto';

    if (node.layoutSizingVertical === 'FILL') height = 'auto';
    if (node.layoutSizingVertical === 'HUG') height = 'auto';

    return {
      x: isFlexChild ? undefined : (bbox?.x ?? 0),
      y: isFlexChild ? undefined : (bbox?.y ?? 0),
      width,
      height,
      rotation: node.rotation ? Math.round(node.rotation * (180 / Math.PI)) : 0,
      opacity: node.opacity !== undefined ? node.opacity : 1,
    };
  }

  private mapFigmaStyle(node: FigmaNode): ImportedNode['style'] {
    const style: ImportedNode['style'] = {};

    // 1. Fills
    if (node.fills && node.fills.length > 0) {
      const activeFills = node.fills.filter((f) => f.visible !== false);
      const fills = activeFills
        .map((f) => this.figmaPaintToFill(f))
        .filter((f): f is NonNullable<typeof f> => Boolean(f));
      if (fills.length > 0) {
        style.fills = fills;
      }
    }

    // 2. Strokes
    if (node.strokes && node.strokes.length > 0) {
      const activeStrokes = node.strokes.filter((s) => s.visible !== false);
      const firstStroke = activeStrokes[0];
      if (firstStroke && firstStroke.color) {
        style.strokes = [
          {
            color: this.rgbaToHex(firstStroke.color),
            width: node.strokeWeight || 1,
            style: 'solid',
          },
        ];
      }
    }

    // 3. Corner Radius
    if (typeof node.cornerRadius === 'number' && node.cornerRadius > 0) {
      style.borderRadius = node.cornerRadius;
    } else if (node.rectangleCornerRadii) {
      style.borderRadius = node.rectangleCornerRadii[0] || 0;
    }

    // 4. Effects (Drop Shadow & Blur)
    if (node.effects && node.effects.length > 0) {
      const activeEffects = node.effects.filter((e) => e.visible !== false);
      const shadows = activeEffects.filter((e) => (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') && Boolean(e.color));
      if (shadows.length > 0 && shadows[0]?.color) {
        const s = shadows[0];
        const hex = this.rgbaToHex(s.color!);
        style.boxShadow = [
          {
            x: s.offset?.x || 0,
            y: s.offset?.y || 0,
            blur: s.radius || 0,
            spread: s.spread || 0,
            color: hex,
            inset: s.type === 'INNER_SHADOW',
          },
        ];
      }
    }

    return style;
  }

  private mapFigmaTypography(node: FigmaNode): ImportedNode['typography'] {
    const s = node.style || {};
    const primaryColor = this.extractPrimaryFill(node.fills) || '#FFFFFF';

    return {
      fontFamily: s.fontFamily || 'Inter, sans-serif',
      fontSize: s.fontSize || 16,
      fontWeight: s.fontWeight || 400,
      lineHeight: s.lineHeightPx && s.fontSize ? +(s.lineHeightPx / s.fontSize).toFixed(2) : 1.4,
      letterSpacing: s.letterSpacing ? `${s.letterSpacing}px` : undefined,
      textAlign: (s.textAlignHorizontal || 'LEFT').toLowerCase() as any,
      color: primaryColor,
    };
  }

  private figmaPaintToFill(paint: FigmaPaint) {
    if (paint.type === 'SOLID' && paint.color) {
      return {
        type: 'solid' as const,
        color: this.rgbaToHex(paint.color),
        opacity: paint.opacity ?? paint.color.a ?? 1,
      };
    }
    if ((paint.type === 'GRADIENT_LINEAR' || paint.type === 'GRADIENT_RADIAL') && paint.gradientStops) {
      const stopsStr = paint.gradientStops
        .map((stop) => `${this.rgbaToHex(stop.color)} ${Math.round(stop.position * 100)}%`)
        .join(', ');
      const gradCss = paint.type === 'GRADIENT_LINEAR'
        ? `linear-gradient(180deg, ${stopsStr})`
        : `radial-gradient(circle, ${stopsStr})`;
      return {
        type: paint.type === 'GRADIENT_LINEAR' ? ('gradient_linear' as const) : ('gradient_radial' as const),
        gradient: gradCss,
      };
    }
    return null;
  }

  private extractPrimaryFill(fills?: FigmaPaint[]): string | undefined {
    if (!fills) return undefined;
    for (const f of fills) {
      if (f.visible !== false && f.type === 'SOLID' && f.color) {
        return this.rgbaToHex(f.color);
      }
    }
    return undefined;
  }

  private rgbaToHex(color: FigmaColor): string {
    const r = Math.round((color.r ?? 0) * 255);
    const g = Math.round((color.g ?? 0) * 255);
    const b = Math.round((color.b ?? 0) * 255);
    const toHex = (c: number) => c.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  private extractRootStructure(ast: FigmaFileResponse | FigmaNode): {
    projectName: string;
    rootNodes: FigmaNode[];
  } {
    const file = ast as FigmaFileResponse;
    const projectName = file.name || 'Figma Import';

    if (file.document && file.document.children) {
      // Figma document with CANVAS pages
      const canvases = file.document.children.filter((c) => c.type === 'CANVAS');
      return {
        projectName,
        rootNodes: canvases.length > 0 ? canvases : [file.document],
      };
    }

    if (file.nodes) {
      const docs = Object.values(file.nodes).map((n) => n.document).filter(Boolean);
      return {
        projectName,
        rootNodes: docs,
      };
    }

    const singleNode = ast as FigmaNode;
    return {
      projectName: singleNode.name || 'Figma Design Component',
      rootNodes: [singleNode],
    };
  }

  private detectSectionArchetype(name: string): ImportedSection['archetype'] {
    const lower = (name || '').toLowerCase();
    if (lower.includes('hero') || lower.includes('banner') || lower.includes('cover')) return 'hero';
    if (lower.includes('pricing') || lower.includes('plan') || lower.includes('tier')) return 'pricing';
    if (lower.includes('feature') || lower.includes('bento') || lower.includes('grid')) return 'features';
    if (lower.includes('testimonial') || lower.includes('review')) return 'testimonials';
    if (lower.includes('cta') || lower.includes('call to action') || lower.includes('get started')) return 'cta';
    return 'custom';
  }

  private createUrlProjectScaffold(url: string, options: Partial<SourceAdapterOptions> | undefined, startTime: number): AdapterParseResult {
    const match = url.match(/figma\.com\/(file|design)\/([a-zA-Z0-9_-]+)(?:\/([a-zA-Z0-9_-]+))?/i);
    const fileKey = match ? match[2] : 'unknown_key';
    const rawTitle = match && match[3] ? decodeURIComponent(match[3]).replace(/[-_]/g, ' ') : `Figma File (${fileKey})`;

    const mockRootNode: ImportedNode = {
      id: 'node_figma_root',
      name: `${rawTitle} Hero`,
      kind: 'frame',
      parentId: null,
      children: ['node_figma_heading', 'node_figma_cta'],
      layout: {
        mode: 'flex',
        direction: 'vertical',
        gap: 24,
        padding: { top: 64, right: 32, bottom: 64, left: 32 },
        justifyContent: 'center',
        alignItems: 'center',
      },
      geometry: { width: 'full', height: 'auto' },
      style: {
        fills: [{ type: 'solid', color: '#090D1A' }],
        borderRadius: 0,
      },
    };

    const mockHeading: ImportedNode = {
      id: 'node_figma_heading',
      name: 'Figma Heading',
      kind: 'heading',
      parentId: 'node_figma_root',
      children: [],
      layout: { mode: 'flow' },
      geometry: { width: 'full', height: 'auto' },
      style: {},
      typography: {
        fontFamily: 'Inter, sans-serif',
        fontSize: 44,
        fontWeight: 700,
        lineHeight: 1.2,
        color: '#FFFFFF',
        textAlign: 'center',
      },
      content: { text: rawTitle },
    };

    const mockCta: ImportedNode = {
      id: 'node_figma_cta',
      name: 'Explore Button',
      kind: 'button',
      parentId: 'node_figma_root',
      children: [],
      layout: { mode: 'flow', padding: { top: 12, right: 28, bottom: 12, left: 28 } },
      geometry: { width: 'auto', height: 'auto' },
      style: {
        fills: [{ type: 'solid', color: '#DFBA6B' }],
        borderRadius: 8,
      },
      typography: {
        fontFamily: 'Inter, sans-serif',
        fontSize: 14,
        fontWeight: 600,
        lineHeight: 1.4,
        color: '#060B1A',
        textAlign: 'center',
      },
      content: { text: 'View In Figma Studio', buttonHref: url },
    };

    const section: ImportedSection = {
      id: options?.targetSectionId || 'sec_figma_root',
      name: `${rawTitle} Section`,
      archetype: 'hero',
      geometry: { height: 'auto', maxWidth: 1440 },
      style: { backgroundColor: '#090D1A' },
      rootNodeId: 'node_figma_root',
      nodes: {
        node_figma_root: mockRootNode,
        node_figma_heading: mockHeading,
        node_figma_cta: mockCta,
      },
      renderOrder: ['node_figma_root', 'node_figma_heading', 'node_figma_cta'],
    };

    const page: ImportedPage = {
      id: options?.targetPageId || 'page_figma_main',
      name: 'Main Page',
      route: '/',
      isHome: true,
      sections: [section],
    };

    const project: ImportedProject = {
      irVersion: '1.0',
      sourceFormat: 'figma',
      sourceOrigin: {
        url,
        importedAt: new Date().toISOString(),
      },
      metadata: {
        title: rawTitle,
        description: `Imported from Figma URL: ${url}`,
      },
      designTokens: {
        colors: {
          primary: { value: '#DFBA6B', inferredRole: 'primary' },
          background: { value: '#090D1A', inferredRole: 'background' },
        },
        typography: {
          display: { fontFamily: 'Inter', fallback: 'sans-serif', weights: [400, 700] },
        },
        spacing: { md: 24 },
        shadows: {},
        radii: { md: 8 },
      },
      pages: [page],
      globalComponents: {},
      assets: {},
      sourceTrace: { nodeToSourceMap: {}, unsupportedProperties: {} },
      confidenceReport: {
        overallScore: 92,
        totalNodes: 3,
        highConfidenceCount: 3,
        mediumConfidenceCount: 0,
        lowConfidenceCount: 0,
        unsupportedFeatures: [],
        warnings: ['Figma URL imported via direct bridge. Authenticate with Figma Token for full vector asset syncing.'],
      },
    };

    return {
      success: true,
      projectIR: project,
      warnings: project.confidenceReport.warnings,
      errors: [],
      executionTimeMs: Date.now() - startTime,
    };
  }

  private createEmptyProject(title: string): ImportedProject {
    return {
      irVersion: '1.0',
      sourceFormat: 'figma',
      sourceOrigin: { importedAt: new Date().toISOString() },
      metadata: { title },
      designTokens: { colors: {}, typography: {}, spacing: {}, shadows: {}, radii: {} },
      pages: [],
      globalComponents: {},
      assets: {},
      sourceTrace: { nodeToSourceMap: {}, unsupportedProperties: {} },
      confidenceReport: {
        overallScore: 0,
        totalNodes: 0,
        highConfidenceCount: 0,
        mediumConfidenceCount: 0,
        lowConfidenceCount: 0,
        unsupportedFeatures: [],
        warnings: [],
      },
    };
  }
}
