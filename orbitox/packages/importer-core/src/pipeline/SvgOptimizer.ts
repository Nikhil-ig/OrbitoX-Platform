/**
 * @orbitox-io/importer-core - SVG Optimizer & Vector Extractor
 * Disarms, cleans, and converts raw SVGs into editable SceneGraph vector paths.
 */

import { ImportedNode } from '../types/ImportIR';
import { SecuritySanitizer } from './SecuritySanitizer';

export interface OptimizedSvgResult {
  viewBox: { x: number; y: number; width: number; height: number };
  paths: Array<{
    d: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    fillRule?: 'nonzero' | 'evenodd';
  }>;
  primaryFill?: string;
  primaryStroke?: string;
  sanitizedSvgString: string;
}

export class SvgOptimizer {
  /**
   * Disarms raw SVG string and extracts vector path geometry and styles
   */
  public static optimize(rawSvg: string): OptimizedSvgResult {
    // 1. Disarm scripts & inline events
    const sanitized = SecuritySanitizer.sanitizeSvg(rawSvg);

    // 2. Extract ViewBox or Dimensions and Root SVG Styles
    const viewBox = this.extractViewBox(sanitized);
    const svgTagMatch = sanitized.match(/<svg\b([^>]*)>/i);
    const rootAttrs = svgTagMatch && svgTagMatch[1] ? this.parseAttributes(svgTagMatch[1]) : {};
    const rootFill = rootAttrs['fill'] !== 'none' ? rootAttrs['fill'] : undefined;
    const rootStroke = rootAttrs['stroke'] !== 'none' ? rootAttrs['stroke'] : undefined;
    const rootStrokeWidth = rootAttrs['stroke-width'] ? parseFloat(rootAttrs['stroke-width']) : undefined;

    // 3. Extract all vector paths & convert basic shapes to paths
    const paths: OptimizedSvgResult['paths'] = [];

    // Extract <path d="..." ...>
    const pathRegex = /<path\b([^>]*)\/?>/gi;
    let match: RegExpExecArray | null;
    while ((match = pathRegex.exec(sanitized)) !== null) {
      const attrs = this.parseAttributes(match[1] || '');
      if (attrs['d']) {
        paths.push({
          d: attrs['d'],
          fill: attrs['fill'] ? (attrs['fill'] !== 'none' ? attrs['fill'] : undefined) : rootFill,
          stroke: attrs['stroke'] ? (attrs['stroke'] !== 'none' ? attrs['stroke'] : undefined) : rootStroke,
          strokeWidth: attrs['stroke-width'] ? parseFloat(attrs['stroke-width']) : rootStrokeWidth,
          fillRule: attrs['fill-rule'] === 'evenodd' ? 'evenodd' : 'nonzero',
        });
      }
    }

    // Convert <circle cx="..." cy="..." r="..." ...> to path
    const circleRegex = /<circle\b([^>]*)\/?>/gi;
    while ((match = circleRegex.exec(sanitized)) !== null) {
      const attrs = this.parseAttributes(match[1] || '');
      const cx = parseFloat(attrs['cx'] || '0');
      const cy = parseFloat(attrs['cy'] || '0');
      const r = parseFloat(attrs['r'] || '0');
      if (r > 0) {
        // Circle as two SVG arc commands
        const d = `M ${cx - r},${cy} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 -${r * 2},0`;
        paths.push({
          d,
          fill: attrs['fill'] ? (attrs['fill'] !== 'none' ? attrs['fill'] : undefined) : rootFill,
          stroke: attrs['stroke'] ? (attrs['stroke'] !== 'none' ? attrs['stroke'] : undefined) : rootStroke,
          strokeWidth: attrs['stroke-width'] ? parseFloat(attrs['stroke-width']) : rootStrokeWidth,
        });
      }
    }

    // Convert <rect x="..." y="..." width="..." height="..." ...> to path
    const rectRegex = /<rect\b([^>]*)\/?>/gi;
    while ((match = rectRegex.exec(sanitized)) !== null) {
      const attrs = this.parseAttributes(match[1] || '');
      const x = parseFloat(attrs['x'] || '0');
      const y = parseFloat(attrs['y'] || '0');
      const w = parseFloat(attrs['width'] || '0');
      const h = parseFloat(attrs['height'] || '0');
      if (w > 0 && h > 0) {
        const d = `M ${x},${y} H ${x + w} V ${y + h} H ${x} Z`;
        paths.push({
          d,
          fill: attrs['fill'] ? (attrs['fill'] !== 'none' ? attrs['fill'] : undefined) : rootFill,
          stroke: attrs['stroke'] ? (attrs['stroke'] !== 'none' ? attrs['stroke'] : undefined) : rootStroke,
          strokeWidth: attrs['stroke-width'] ? parseFloat(attrs['stroke-width']) : rootStrokeWidth,
        });
      }
    }

    // Determine primary fill and stroke
    let primaryFill: string | undefined;
    let primaryStroke: string | undefined;
    for (const p of paths) {
      if (!primaryFill && p.fill && p.fill !== 'none' && p.fill !== 'currentColor') {
        primaryFill = p.fill;
      }
      if (!primaryStroke && p.stroke && p.stroke !== 'none' && p.stroke !== 'currentColor') {
        primaryStroke = p.stroke;
      }
    }

    if (!primaryFill && rootFill) primaryFill = rootFill;
    if (!primaryStroke && rootStroke) primaryStroke = rootStroke;

    return {
      viewBox,
      paths,
      primaryFill,
      primaryStroke,
      sanitizedSvgString: sanitized,
    };
  }

  /**
   * Converts an SVG into an editable ImportedNode IR
   */
  public static toImportedNode(
    id: string,
    name: string,
    rawSvg: string,
    parentId: string | null = null
  ): ImportedNode {
    const optimized = this.optimize(rawSvg);
    const combinedPath = optimized.paths.map((p) => p.d).join(' ');

    return {
      id,
      name,
      kind: 'vector_path',
      parentId,
      children: [],
      layout: {
        mode: 'flow',
      },
      geometry: {
        width: optimized.viewBox.width || 24,
        height: optimized.viewBox.height || 24,
      },
      style: {
        fills: optimized.primaryFill ? [{ type: 'solid', color: optimized.primaryFill }] : undefined,
        strokes: optimized.primaryStroke
          ? [{ color: optimized.primaryStroke, width: 1.5, style: 'solid' }]
          : undefined,
      },
      content: {
        vectorSvgPath: combinedPath || undefined,
        htmlSnippet: optimized.sanitizedSvgString,
      },
    };
  }

  private static extractViewBox(svg: string): { x: number; y: number; width: number; height: number } {
    const vbMatch = svg.match(/viewBox=["']\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*["']/i);
    if (vbMatch) {
      return {
        x: parseFloat(vbMatch[1] || '0'),
        y: parseFloat(vbMatch[2] || '0'),
        width: parseFloat(vbMatch[3] || '24'),
        height: parseFloat(vbMatch[4] || '24'),
      };
    }

    const widthMatch = svg.match(/width=["']([\d.]+)p?x?["']/i);
    const heightMatch = svg.match(/height=["']([\d.]+)p?x?["']/i);
    return {
      x: 0,
      y: 0,
      width: widthMatch ? parseFloat(widthMatch[1] || '24') : 24,
      height: heightMatch ? parseFloat(heightMatch[1] || '24') : 24,
    };
  }

  private static parseAttributes(attrStr: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const regex = /([a-z0-9_-]+)=["']([^"']*)["']/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(attrStr)) !== null) {
      const k = match[1];
      if (k) {
        attrs[k] = match[2] || '';
      }
    }
    return attrs;
  }
}
