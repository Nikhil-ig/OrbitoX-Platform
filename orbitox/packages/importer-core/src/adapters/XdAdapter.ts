/**
 * OrbitoX Universal Importer — Adobe XD Archive & AGC Source Adapter
 * Package: @orbitox-io/importer-core
 * 
 * Supports:
 * - Adobe XD .xd archives and internal graphicContent.agc AST trees
 * - Artboard to Section / Page conversion
 * - Shapes: rect (with border-radius), ellipse, path vectors, lines
 * - Typography: paragraphs, runs, weights, font families, text styles
 * - Fills: solid colors, linear/radial gradients, image patterns
 * - Strokes and border styles
 * - Drop shadows and effects
 * - Flow & Flex Inferrer: converts absolute coordinates into responsive flex stacks
 * - Token extraction for colors and typography
 */

import {
  ImportedProject,
  ImportedPage,
  ImportedSection,
  ImportedNode,
  ImportedDesignTokens,
  ImportConfidenceReport,
} from '../types/ImportIR';
import { SourceAdapter, SourceAdapterOptions, AdapterParseResult } from '../types/Adapter';

export interface XdColorValue {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface XdFill {
  type?: 'color' | 'gradient' | 'pattern' | string;
  value?: XdColorValue | number;
  gradient?: {
    type?: 'linear' | 'radial';
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
    stops?: Array<{ offset: number; color: XdColorValue | number }>;
  };
  pattern?: {
    path?: string;
    width?: number;
    height?: number;
  };
}

export interface XdStroke {
  type?: string;
  value?: XdColorValue | number;
  width?: number;
  dash?: number[];
}

export interface XdFilter {
  type: string;
  params?: {
    dx?: number;
    dy?: number;
    r?: number;
    color?: XdColorValue | number;
  };
}

export interface XdStyle {
  fill?: XdFill;
  stroke?: XdStroke;
  filters?: XdFilter[];
  opacity?: number;
}

export interface XdShape {
  type: 'rect' | 'ellipse' | 'path' | 'line' | string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  r?: number | number[];
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;
  path?: string;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

export interface XdTextRun {
  from?: number;
  to?: number;
  font?: {
    family?: string;
    style?: string;
    size?: number;
  };
  fill?: XdFill;
  letterSpacing?: number;
  lineHeight?: number;
}

export interface XdText {
  rawText?: string;
  paragraphs?: Array<{
    lines?: Array<XdTextRun[]>;
  }>;
}

export interface XdNode {
  id?: string;
  name?: string;
  type: 'artboard' | 'group' | 'shape' | 'text' | string;
  style?: XdStyle;
  shape?: XdShape;
  text?: XdText;
  group?: { children?: XdNode[] };
  artboard?: { children?: XdNode[] };
  children?: XdNode[];
  transform?: {
    a?: number;
    b?: number;
    c?: number;
    d?: number;
    tx?: number;
    ty?: number;
  };
  meta?: {
    ux?: {
      width?: number;
      height?: number;
      symbolId?: string;
      customMetadata?: any;
    };
  };
}

export class XdAdapter implements SourceAdapter<string | object> {
  public readonly id = 'adobe-xd';
  public readonly name = 'Adobe XD Archive & AGC Source Adapter';
  public readonly version = '1.0.0';
  public readonly supportedSourceFormats = ['adobe_xd' as const];
  public readonly supportedExtensions = ['.xd', '.agc', '.json'];
  public readonly supportedMimeTypes = ['application/vnd.adobe.sparkler.project+dcx', 'application/json'];

  public canHandle(input: string | object): boolean {
    if (!input) return false;

    if (typeof input === 'object') {
      return this.isXdAst(input);
    }

    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        return false;
      }
      try {
        const parsed = JSON.parse(trimmed);
        return this.isXdAst(parsed);
      } catch {
        return false;
      }
    }

    return false;
  }

  private isXdAst(parsed: any): boolean {
    if (!parsed || typeof parsed !== 'object') return false;

    if (parsed.mimetype && typeof parsed.mimetype === 'string' && parsed.mimetype.includes('adobe.sparkler')) {
      return true;
    }
    if (parsed.manifest && (parsed.artwork || parsed.graphicContent)) {
      return true;
    }
    if (parsed.type === 'artboard') {
      return true;
    }
    if (Array.isArray(parsed.children) && parsed.children.some((c: any) => c && (c.type === 'artboard' || c.shape || c.artboard))) {
      return true;
    }
    if (parsed.version && (parsed.artboards || (parsed.children && parsed.children[0]?.type === 'artboard'))) {
      return true;
    }
    if (parsed.graphicContent || parsed.resources?.graphics?.['graphicContent.agc']) {
      return true;
    }
    return false;
  }

  public async parse(source: string | object, options: Partial<SourceAdapterOptions> = {}): Promise<AdapterParseResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      const parsedJson = typeof source === 'string' ? JSON.parse(source.trim()) : source;
      const artboardNodes = this.extractArtboardNodes(parsedJson, warnings);

      if (artboardNodes.length === 0) {
        return {
          success: false,
          projectIR: undefined as any,
          errors: ['No valid artboards or graphic content found in Adobe XD payload.'],
          warnings,
          executionTimeMs: Date.now() - startTime,
        };
      }

      const designTokens: ImportedDesignTokens = {
        colors: {},
        typography: {},
        spacing: {},
        shadows: {},
        radii: {},
      };

      const extractedColorSet = new Set<string>();
      const extractedFontMap = new Map<string, Set<number>>();

      const sections: ImportedSection[] = [];

      for (let i = 0; i < artboardNodes.length; i++) {
        const artboard = artboardNodes[i]!;
        const section = this.convertArtboardToSection(
          artboard,
          i,
          extractedColorSet,
          extractedFontMap,
          warnings
        );
        sections.push(section);
      }

      // Design tokens compilation
      if (options.extractDesignTokens !== false) {
        let colorIdx = 1;
        for (const hex of extractedColorSet) {
          const role = colorIdx === 1 ? 'background' : colorIdx === 2 ? 'primary' : 'accent';
          designTokens.colors[`xd_color_${colorIdx++}`] = {
            value: hex,
            inferredRole: role as any,
          };
        }

        let fontIdx = 1;
        for (const [family, weightSet] of extractedFontMap.entries()) {
          const weights = Array.from(weightSet).sort((a, b) => a - b);
          designTokens.typography[`xd_font_${fontIdx++}`] = {
            fontFamily: family,
            fallback: 'sans-serif',
            weights,
            googleFontUrl: `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weights.join(';')}&display=swap`,
          };
        }
      }

      const primaryTitle = artboardNodes[0]?.name || 'Adobe XD Project';
      const page: ImportedPage = {
        id: 'page_xd_1',
        name: primaryTitle,
        route: '/',
        isHome: true,
        sections,
      };

      let totalNodesCount = 0;
      for (const sec of sections) {
        totalNodesCount += Object.keys(sec.nodes).length;
      }

      const confidenceReport: ImportConfidenceReport = {
        overallScore: warnings.length === 0 ? 98 : Math.max(85, 98 - warnings.length * 2),
        totalNodes: totalNodesCount,
        highConfidenceCount: totalNodesCount,
        mediumConfidenceCount: 0,
        lowConfidenceCount: 0,
        unsupportedFeatures: warnings.map((w) => ({
          feature: w,
          occurrences: 1,
          fallbackApplied: 'Standard vector and layout inference fallback',
        })),
        warnings,
      };

      const projectIR: ImportedProject = {
        irVersion: '1.0',
        sourceFormat: 'adobe_xd',
        sourceOrigin: {
          importedAt: new Date().toISOString(),
        },
        metadata: {
          title: primaryTitle,
          description: 'Imported from Adobe XD Archive via OrbitoX Universal Importer',
          originalToolVersion: 'Adobe XD v57+',
        },
        designTokens,
        pages: [page],
        globalComponents: {},
        assets: {},
        sourceTrace: {
          nodeToSourceMap: {},
          unsupportedProperties: {},
        },
        confidenceReport,
      };

      return {
        success: true,
        projectIR,
        warnings,
        errors,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (err: any) {
      errors.push(`Adobe XD parse exception: ${err?.message || 'Invalid format'}`);
      return {
        success: false,
        projectIR: undefined as any,
        errors,
        warnings,
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  private extractArtboardNodes(json: any, warnings: string[]): XdNode[] {
    if (!json || typeof json !== 'object') {
      return [];
    }

    // 1. Direct artboard node
    if (json.type === 'artboard') {
      return [json];
    }

    // 2. Direct graphicContent with children
    if (json.children && Array.isArray(json.children)) {
      const artboards = json.children.filter((c: any) => c && c.type === 'artboard');
      if (artboards.length > 0) return artboards;
      const hasXdNodes = json.children.some((c: any) => c && (c.type || c.shape || c.text || c.group));
      if (hasXdNodes) {
        return [{
          id: json.id || 'root-artboard',
          name: json.name || 'Adobe XD Scene',
          type: 'artboard',
          children: json.children,
        }];
      }
      return [];
    }

    // 3. Container with graphicContent.agc inside
    if (json.graphicContent && Array.isArray(json.graphicContent.children)) {
      const artboards = json.graphicContent.children.filter((c: any) => c && c.type === 'artboard');
      if (artboards.length > 0) return artboards;
      return [{
        id: 'graphic-content-root',
        name: 'Adobe XD Scene',
        type: 'artboard',
        children: json.graphicContent.children,
      }];
    }

    // 4. Archive structure with resources/artwork
    if (json.resources?.graphics?.['graphicContent.agc']?.children) {
      return json.resources.graphics['graphicContent.agc'].children;
    }

    // 5. Array of nodes
    if (Array.isArray(json)) {
      const hasXdNodes = json.some((c: any) => c && (c.type || c.shape || c.text || c.group));
      if (hasXdNodes) {
        return [{
          id: 'array-root',
          name: 'Adobe XD Scene',
          type: 'artboard',
          children: json,
        }];
      }
      return [];
    }

    // 6. Single shape or text node directly
    if (json.type === 'shape' || json.type === 'text' || json.type === 'group') {
      return [{
        id: 'single-node-root',
        name: json.name || 'Adobe XD Scene',
        type: 'artboard',
        children: [json],
      }];
    }

    return [];
  }

  private convertArtboardToSection(
    artboard: XdNode,
    index: number,
    colorSet: Set<string>,
    fontMap: Map<string, Set<number>>,
    warnings: string[]
  ): ImportedSection {
    const sectionId = `sec_xd_${index + 1}`;
    const rootNodeId = `node_xd_root_${index + 1}`;

    const width = artboard.meta?.ux?.width || 1440;
    const height = artboard.meta?.ux?.height || 'auto';

    let backgroundColor: string | undefined;
    if (artboard.style?.fill) {
      backgroundColor = this.parseColorToHex(artboard.style.fill) || undefined;
      if (backgroundColor) colorSet.add(backgroundColor);
    }

    const section: ImportedSection = {
      id: sectionId,
      name: artboard.name || `Artboard ${index + 1}`,
      archetype: 'custom',
      geometry: {
        height: typeof height === 'number' ? height : 'auto',
        maxWidth: width,
      },
      style: {
        backgroundColor: backgroundColor || '#0A0A14',
      },
      rootNodeId,
      nodes: {},
      renderOrder: [],
    };

    // Create root stack node
    const rootStack: ImportedNode = {
      id: rootNodeId,
      sourceNodeId: artboard.id || `artboard-${index}`,
      name: artboard.name || 'Artboard Root',
      kind: 'stack',
      parentId: null,
      children: [],
      layout: {
        mode: 'flex',
        direction: 'vertical',
        wrap: false,
        gap: 20,
        padding: { top: 32, right: 32, bottom: 32, left: 32 },
        justifyContent: 'start',
        alignItems: 'stretch',
      },
      geometry: {
        width: 100,
        height: 'auto',
        rotation: 0,
        opacity: artboard.style?.opacity ?? 1,
      },
      style: {
        fills: backgroundColor
          ? [{ type: 'solid', color: backgroundColor, opacity: 1 }]
          : [{ type: 'solid', color: '#0A0A14', opacity: 1 }],
      },
      content: {},
    };

    section.nodes[rootNodeId] = rootStack;

    // Children are in artboard.artboard.children or artboard.children
    const rawChildren = artboard.artboard?.children || artboard.children || [];
    
    // Sort children by vertical coordinate (ty or shape.y) to infer responsive linear flow
    const sortedChildren = this.sortNodesByGeometry(rawChildren);

    for (const child of sortedChildren) {
      this.recursivelyConvertNode(
        child,
        rootNodeId,
        section,
        colorSet,
        fontMap,
        warnings
      );
    }

    section.renderOrder = Object.keys(section.nodes);
    return section;
  }

  private sortNodesByGeometry(nodes: XdNode[]): XdNode[] {
    return [...nodes].sort((a, b) => {
      const yA = (a.transform?.ty ?? 0) + (a.shape?.y ?? 0);
      const yB = (b.transform?.ty ?? 0) + (b.shape?.y ?? 0);
      return yA - yB;
    });
  }

  private recursivelyConvertNode(
    xdNode: XdNode,
    parentId: string,
    section: ImportedSection,
    colorSet: Set<string>,
    fontMap: Map<string, Set<number>>,
    warnings: string[]
  ): string | null {
    if (!xdNode) return null;

    const nodeId = `node_xd_${Math.random().toString(36).substring(2, 9)}`;
    const name = xdNode.name || `${xdNode.type || 'node'}`;

    if (xdNode.type === 'text') {
      return this.convertTextNode(xdNode, nodeId, parentId, name, section, colorSet, fontMap);
    } else if (xdNode.type === 'shape') {
      return this.convertShapeNode(xdNode, nodeId, parentId, name, section, colorSet, fontMap, warnings);
    } else if (xdNode.type === 'group' || (xdNode.group && xdNode.group.children)) {
      return this.convertGroupNode(xdNode, nodeId, parentId, name, section, colorSet, fontMap, warnings);
    } else {
      // Fallback for custom or unrecognized node
      return this.convertGenericNode(xdNode, nodeId, parentId, name, section, colorSet, warnings);
    }
  }

  private convertTextNode(
    xdNode: XdNode,
    nodeId: string,
    parentId: string,
    name: string,
    section: ImportedSection,
    colorSet: Set<string>,
    fontMap: Map<string, Set<number>>
  ): string {
    const rawText = xdNode.text?.rawText || '';
    let fontFamily = 'Inter';
    let fontWeight = 400;
    let fontSize = 16;
    let textColor = '#FFFFFF';
    let lineHeight = 1.5;

    // Extract from first paragraph run
    const firstRun = xdNode.text?.paragraphs?.[0]?.lines?.[0]?.[0];
    if (firstRun) {
      if (firstRun.font?.family) {
        fontFamily = firstRun.font.family;
      }
      if (firstRun.font?.size) {
        fontSize = Math.round(firstRun.font.size);
      }
      if (firstRun.font?.style) {
        fontWeight = this.mapFontStyleToWeight(firstRun.font.style);
      }
      if (firstRun.fill) {
        const parsedColor = this.parseColorToHex(firstRun.fill);
        if (parsedColor) textColor = parsedColor;
      }
      if (firstRun.lineHeight && firstRun.font?.size) {
        lineHeight = Number((firstRun.lineHeight / firstRun.font.size).toFixed(2));
      }
    }

    colorSet.add(textColor);
    if (!fontMap.has(fontFamily)) {
      fontMap.set(fontFamily, new Set());
    }
    fontMap.get(fontFamily)!.add(fontWeight);

    const isHeading = fontSize >= 24;

    const importedNode: ImportedNode = {
      id: nodeId,
      sourceNodeId: xdNode.id,
      name,
      kind: isHeading ? 'heading' : 'text',
      parentId,
      children: [],
      layout: { mode: 'flow' },
      geometry: {
        width: 100,
        height: 'auto',
        rotation: 0,
        opacity: xdNode.style?.opacity ?? 1,
      },
      style: {},
      typography: {
        fontFamily,
        fontSize,
        fontWeight,
        lineHeight,
        textAlign: 'left',
        color: textColor,
      },
      content: {
        text: rawText,
      },
    };

    section.nodes[nodeId] = importedNode;
    if (section.nodes[parentId]) {
      section.nodes[parentId].children.push(nodeId);
    }
    return nodeId;
  }

  private convertShapeNode(
    xdNode: XdNode,
    nodeId: string,
    parentId: string,
    name: string,
    section: ImportedSection,
    colorSet: Set<string>,
    fontMap: Map<string, Set<number>>,
    warnings: string[]
  ): string {
    const shape = xdNode.shape || { type: 'rect' };
    let borderRadius: number | undefined;

    if (shape.type === 'rect') {
      if (typeof shape.r === 'number') {
        borderRadius = shape.r;
      } else if (Array.isArray(shape.r) && shape.r.length > 0) {
        borderRadius = shape.r[0];
      }
    } else if (shape.type === 'ellipse') {
      borderRadius = 9999;
    }

    const fills = this.parseFills(xdNode.style?.fill, colorSet);
    const stroke = this.parseStroke(xdNode.style?.stroke, colorSet);
    const strokes = stroke ? [stroke] : undefined;
    const boxShadow = this.parseDropShadow(xdNode.style?.filters, colorSet);

    // If it's a vector path shape
    if (shape.type === 'path' && shape.path) {
      const importedNode: ImportedNode = {
        id: nodeId,
        sourceNodeId: xdNode.id,
        name,
        kind: 'vector_path',
        parentId,
        children: [],
        layout: { mode: 'flow' },
        geometry: {
          width: shape.width || 48,
          height: shape.height || 48,
          rotation: 0,
          opacity: xdNode.style?.opacity ?? 1,
        },
        style: {
          fills,
          strokes,
        },
        content: {
          vectorSvgPath: shape.path,
        },
      };

      section.nodes[nodeId] = importedNode;
      if (section.nodes[parentId]) {
        section.nodes[parentId].children.push(nodeId);
      }
      return nodeId;
    }

    // Default container or frame shape
    const importedNode: ImportedNode = {
      id: nodeId,
      sourceNodeId: xdNode.id,
      name,
      kind: 'frame',
      parentId,
      children: [],
      layout: {
        mode: 'flex',
        direction: 'vertical',
        wrap: false,
        gap: 12,
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
        justifyContent: 'start',
        alignItems: 'stretch',
      },
      geometry: {
        width: 100,
        height: shape.height ? shape.height : 'auto',
        rotation: 0,
        opacity: xdNode.style?.opacity ?? 1,
      },
      style: {
        fills,
        strokes,
        borderRadius,
        boxShadow,
      },
      content: {},
    };

    section.nodes[nodeId] = importedNode;
    if (section.nodes[parentId]) {
      section.nodes[parentId].children.push(nodeId);
    }
    return nodeId;
  }

  private convertGroupNode(
    xdNode: XdNode,
    nodeId: string,
    parentId: string,
    name: string,
    section: ImportedSection,
    colorSet: Set<string>,
    fontMap: Map<string, Set<number>>,
    warnings: string[]
  ): string {
    const rawChildren = xdNode.group?.children || xdNode.children || [];
    const sortedChildren = this.sortNodesByGeometry(rawChildren);

    const fills = this.parseFills(xdNode.style?.fill, colorSet);
    const stroke = this.parseStroke(xdNode.style?.stroke, colorSet);
    const strokes = stroke ? [stroke] : undefined;

    const importedNode: ImportedNode = {
      id: nodeId,
      sourceNodeId: xdNode.id,
      name,
      kind: 'stack',
      parentId,
      children: [],
      layout: {
        mode: 'flex',
        direction: 'vertical',
        wrap: false,
        gap: 16,
        padding: { top: 12, right: 12, bottom: 12, left: 12 },
        justifyContent: 'start',
        alignItems: 'stretch',
      },
      geometry: {
        width: 100,
        height: 'auto',
        rotation: 0,
        opacity: xdNode.style?.opacity ?? 1,
      },
      style: {
        fills,
        strokes,
      },
      content: {},
    };

    section.nodes[nodeId] = importedNode;
    if (section.nodes[parentId]) {
      section.nodes[parentId].children.push(nodeId);
    }

    for (const child of sortedChildren) {
      this.recursivelyConvertNode(
        child,
        nodeId,
        section,
        colorSet,
        fontMap,
        warnings
      );
    }

    return nodeId;
  }

  private convertGenericNode(
    xdNode: XdNode,
    nodeId: string,
    parentId: string,
    name: string,
    section: ImportedSection,
    colorSet: Set<string>,
    warnings: string[]
  ): string {
    const importedNode: ImportedNode = {
      id: nodeId,
      sourceNodeId: xdNode.id,
      name,
      kind: 'frame',
      parentId,
      children: [],
      layout: { mode: 'flow' },
      geometry: {
        width: 100,
        height: 'auto',
        rotation: 0,
        opacity: xdNode.style?.opacity ?? 1,
      },
      style: {},
      content: {},
    };

    section.nodes[nodeId] = importedNode;
    if (section.nodes[parentId]) {
      section.nodes[parentId].children.push(nodeId);
    }
    return nodeId;
  }

  private parseFills(fill: XdFill | undefined, colorSet: Set<string>): any[] {
    if (!fill) return [];

    if (fill.type === 'color' || (!fill.type && fill.value)) {
      const hex = this.parseColorToHex(fill);
      if (hex) {
        colorSet.add(hex);
        return [{ type: 'solid', color: hex, opacity: 1 }];
      }
    } else if (fill.type === 'gradient' && fill.gradient) {
      const gradType = fill.gradient.type === 'radial' ? 'gradient_radial' : 'gradient_linear';
      const stops = fill.gradient.stops?.map((s) => {
        const hex = this.parseColorValue(s.color);
        if (hex) colorSet.add(hex);
        return `${hex} ${(s.offset * 100).toFixed(0)}%`;
      }).join(', ') || '#DFBA6B 0%, #060B1A 100%';

      return [{
        type: gradType,
        gradient: `linear-gradient(135deg, ${stops})`,
        opacity: 1,
      }];
    } else if (fill.type === 'pattern' && fill.pattern?.path) {
      return [{
        type: 'image_pattern',
        tokenRef: fill.pattern.path,
        opacity: 1,
      }];
    }

    return [];
  }

  private parseStroke(stroke: XdStroke | undefined, colorSet: Set<string>): { color: string; width: number; style: 'solid' | 'dashed' | 'dotted' } | undefined {
    if (!stroke || !stroke.value) return undefined;
    const hex = this.parseColorValue(stroke.value);
    if (!hex) return undefined;
    colorSet.add(hex);
    return {
      width: stroke.width || 1,
      color: hex,
      style: stroke.dash && stroke.dash.length > 0 ? 'dashed' : 'solid',
    };
  }

  private parseDropShadow(filters: XdFilter[] | undefined, colorSet: Set<string>): any[] | undefined {
    if (!filters || !Array.isArray(filters)) return undefined;
    const shadowFilter = filters.find((f) => f.type === 'drop-shadow');
    if (!shadowFilter || !shadowFilter.params) return undefined;

    const p = shadowFilter.params;
    const hex = this.parseColorValue(p.color) || 'rgba(0, 0, 0, 0.4)';
    return [{
      x: p.dx || 0,
      y: p.dy || 4,
      blur: p.r || 12,
      spread: 0,
      color: hex,
    }];
  }

  private parseColorToHex(fill: XdFill): string | null {
    if (!fill) return null;
    return this.parseColorValue(fill.value);
  }

  private parseColorValue(value: XdColorValue | number | undefined): string | null {
    if (!value) return null;

    if (typeof value === 'object' && 'r' in value && 'g' in value && 'b' in value) {
      const r = Math.min(255, Math.max(0, Math.round(value.r)));
      const g = Math.min(255, Math.max(0, Math.round(value.g)));
      const b = Math.min(255, Math.max(0, Math.round(value.b)));
      const a = value.a !== undefined ? value.a : 1;

      if (a < 1) {
        return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(2))})`;
      }

      const hexR = r.toString(16).padStart(2, '0');
      const hexG = g.toString(16).padStart(2, '0');
      const hexB = b.toString(16).padStart(2, '0');
      return `#${hexR}${hexG}${hexB}`.toUpperCase();
    }

    if (typeof value === 'number') {
      // 0xAARRGGBB or 0xRRGGBB
      const hex = value.toString(16).padStart(6, '0');
      return `#${hex.slice(-6)}`.toUpperCase();
    }

    return null;
  }

  private mapFontStyleToWeight(style: string): number {
    const s = style.toLowerCase();
    if (s.includes('black') || s.includes('heavy')) return 900;
    if (s.includes('extrabold') || s.includes('ultra')) return 800;
    if (s.includes('bold')) return 700;
    if (s.includes('semibold') || s.includes('demi')) return 600;
    if (s.includes('medium')) return 500;
    if (s.includes('light')) return 300;
    if (s.includes('thin') || s.includes('hairline')) return 100;
    return 400;
  }
}
