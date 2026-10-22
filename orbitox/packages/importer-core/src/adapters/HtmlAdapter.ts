/**
 * @orbitox-io/importer-core - HTML5 & CSS Adapter
 * Ingests raw HTML/CSS strings into normalized OrbitoX Import IR
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
import { TailwindDecompiler } from '../pipeline/TailwindDecompiler';
import { LayoutInferrer } from '../pipeline/LayoutInferrer';
import { TokenExtractor } from '../pipeline/TokenExtractor';
import { AssetLocalizer } from '../pipeline/AssetLocalizer';
import { FontIngestionService } from '../pipeline/FontIngestionService';
import { SvgOptimizer } from '../pipeline/SvgOptimizer';

export class HtmlAdapter implements SourceAdapter<string> {
  public readonly id = 'html_css';
  public readonly name = 'HTML5 & CSS Source Adapter';
  public readonly supportedExtensions = ['.html', '.htm', '.xhtml'];
  public readonly supportedMimeTypes = ['text/html', 'application/xhtml+xml'];

  public canHandle(input: string): boolean {
    if (typeof input !== 'string') return false;
    const trimmed = input.trim();
    return (
      trimmed.startsWith('<!DOCTYPE html') ||
      trimmed.startsWith('<html') ||
      trimmed.startsWith('<head') ||
      trimmed.startsWith('<body') ||
      /<(div|section|header|footer|main|article|h[1-6]|p|button|a|img|ul|ol|table|form|nav)[^>]*>/i.test(trimmed)
    );
  }

  public async parse(input: string, options?: Partial<SourceAdapterOptions>): Promise<AdapterParseResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];

    // Step 1: Security Sanitization
    const sanitizeResult = SecuritySanitizer.sanitize(input);
    if (sanitizeResult.removedNodes.length > 0) {
      warnings.push(`SecuritySanitizer stripped unsafe elements: ${sanitizeResult.removedNodes.join(', ')}`);
    }

    // Step 2: Parse HTML into AST / DOM
    const rawNodes = this.parseHtmlToElements(sanitizeResult.sanitizedCode);

    // Step 3: Convert into IR Nodes and Section Structure
    const sectionNodes: Record<string, ImportedNode> = {};
    const rootChildrenIds: string[] = [];

    const rootSectionId = options?.targetSectionId || 'sec_imported_root';
    const rootNodeId = 'node_root_container';

    // Root Container Node
    sectionNodes[rootNodeId] = {
      id: rootNodeId,
      name: 'Section Root Container',
      kind: 'frame',
      parentId: null,
      children: rootChildrenIds,
      layout: {
        mode: 'flex',
        direction: 'vertical',
        gap: 24,
        padding: { top: 32, right: 32, bottom: 32, left: 32 },
      },
      geometry: {
        width: 'full',
        height: 'auto',
      },
      style: {},
    };

    let nodeCounter = 1;
    const processElement = (el: ParsedHtmlElement, parentId: string): string => {
      const currentId = `node_html_${nodeCounter++}`;
      const kind = this.mapTagToKind(el.tagName, el.attributes);
      const name = this.generateNodeName(el.tagName, el.attributes, kind);

      // Decompile Tailwind Classes
      const classAttr = el.attributes['class'] || el.attributes['className'] || '';
      const decompiled = TailwindDecompiler.decompile(classAttr);

      // Parse Inline CSS
      const inlineStyle = this.parseInlineStyle(el.attributes['style'] || '');

      // Create base ImportedNode
      const irNode: ImportedNode = {
        id: currentId,
        sourceNodeId: el.attributes['id'] || undefined,
        name,
        kind,
        parentId,
        children: [],
        layout: {
          mode: decompiled.layout.mode || inlineStyle.layout?.mode || 'flow',
          direction: decompiled.layout.direction || inlineStyle.layout?.direction,
          wrap: decompiled.layout.wrap,
          justifyContent: decompiled.layout.justifyContent,
          alignItems: decompiled.layout.alignItems,
          gap: decompiled.layout.gap || inlineStyle.layout?.gap,
          padding: decompiled.layout.padding || inlineStyle.layout?.padding,
        },
        geometry: {
          width: decompiled.geometry.width || inlineStyle.geometry?.width || 'full',
          height: decompiled.geometry.height || inlineStyle.geometry?.height || 'auto',
          maxWidth: decompiled.geometry.maxWidth,
        },
        style: {
          fills: decompiled.style.fills || inlineStyle.style?.fills,
          strokes: decompiled.style.strokes || inlineStyle.style?.strokes,
          borderRadius: decompiled.style.borderRadius || inlineStyle.style?.borderRadius,
          boxShadow: decompiled.style.boxShadow || inlineStyle.style?.boxShadow,
        },
        typography: (kind === 'text' || kind === 'heading' || kind === 'paragraph' || kind === 'button')
          ? {
              fontFamily: 'Inter, sans-serif',
              fontSize: decompiled.typography?.fontSize || this.getDefaultFontSize(el.tagName),
              fontWeight: decompiled.typography?.fontWeight || (el.tagName.startsWith('h') ? 700 : 400),
              lineHeight: 1.4,
              color: decompiled.typography?.color || '#FFFFFF',
              textAlign: decompiled.typography?.textAlign || 'left',
            }
          : undefined,
        content: {},
        responsiveOverrides: decompiled.responsive,
      };

      // Populate content
      if (el.textContent && (kind === 'text' || kind === 'heading' || kind === 'paragraph' || kind === 'button')) {
        irNode.content = { text: el.textContent };
      }
      if (el.tagName === 'img') {
        irNode.content = {
          imageRef: el.attributes['src'] || '',
          altText: el.attributes['alt'] || '',
        };
      }
      if (el.tagName === 'a') {
        irNode.content = {
          text: el.textContent || '',
          buttonHref: el.attributes['href'] || '#',
          buttonTarget: el.attributes['target'] === '_blank' ? '_blank' : '_self',
        };
      }
      if (el.tagName === 'svg') {
        const fullSvg = `<svg ${Object.entries(el.attributes).map(([k, v]) => `${k}="${v}"`).join(' ')}>${el.rawInnerHtml}</svg>`;
        const optimized = SvgOptimizer.optimize(fullSvg);
        irNode.content = {
          vectorSvgPath: optimized.paths.map((p) => p.d).join(' ') || el.rawInnerHtml,
          htmlSnippet: optimized.sanitizedSvgString,
        };
        if (optimized.primaryFill && (!irNode.style.fills || irNode.style.fills.length === 0)) {
          irNode.style.fills = [{ type: 'solid', color: optimized.primaryFill }];
        }
        if (optimized.primaryStroke && (!irNode.style.strokes || irNode.style.strokes.length === 0)) {
          irNode.style.strokes = [{ color: optimized.primaryStroke, width: 1.5, style: 'solid' }];
        }
        if (optimized.viewBox.width && (irNode.geometry.width === 'full' || irNode.geometry.width === 'auto')) {
          irNode.geometry.width = optimized.viewBox.width;
        }
        if (optimized.viewBox.height && (irNode.geometry.height === 'auto' || irNode.geometry.height === 'full')) {
          irNode.geometry.height = optimized.viewBox.height;
        }
      }

      // Process children
      for (const child of el.children) {
        const childId = processElement(child, currentId);
        irNode.children.push(childId);
      }

      // Layout Inference refinement
      const childrenNodes = irNode.children
        .map((cid) => sectionNodes[cid])
        .filter((n): n is ImportedNode => Boolean(n));
      irNode.layout = LayoutInferrer.inferNodeLayout(irNode, childrenNodes);

      sectionNodes[currentId] = irNode;
      return currentId;
    };

    for (const topEl of rawNodes) {
      const childId = processElement(topEl, rootNodeId);
      rootChildrenIds.push(childId);
    }

    const section: ImportedSection = {
      id: rootSectionId,
      name: 'Imported Web Section',
      archetype: this.detectSectionArchetype(rawNodes),
      geometry: {
        height: 'auto',
        minHeight: 400,
        maxWidth: 1440,
      },
      style: {
        backgroundColor: '#0B0F19',
      },
      rootNodeId,
      nodes: sectionNodes,
      renderOrder: Object.keys(sectionNodes),
    };

    const page: ImportedPage = {
      id: options?.targetPageId || 'page_imported_main',
      name: 'Main Page',
      route: '/',
      isHome: true,
      sections: [section],
    };

    let project: ImportedProject = {
      irVersion: '1.0',
      sourceFormat: 'html_css',
      sourceOrigin: {
        importedAt: new Date().toISOString(),
      },
      metadata: {
        title: 'Imported HTML Project',
        description: 'Converted from raw HTML5 / Tailwind code snippet via OrbitoX Universal Importer',
      },
      designTokens: {
        colors: {},
        typography: {},
        spacing: {},
        shadows: {},
        radii: {},
      },
      pages: [page],
      globalComponents: {},
      assets: {},
      sourceTrace: {
        nodeToSourceMap: {},
        unsupportedProperties: {},
      },
      confidenceReport: {
        overallScore: 95,
        totalNodes: Object.keys(sectionNodes).length,
        highConfidenceCount: Object.keys(sectionNodes).length,
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

    // Step 5: Resolve Google Fonts and Universal System Fonts
    FontIngestionService.resolveProjectFonts(project);

    // Step 6: Localize Remote Assets if requested
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

  private mapTagToKind(tagName: string, attributes: Record<string, string>): ImportedNodeKind {
    const tag = tagName.toLowerCase();
    const classStr = (attributes['class'] || attributes['className'] || '').toLowerCase();

    if (tag === 'header' || tag === 'footer' || tag === 'section' || tag === 'article' || tag === 'main' || tag === 'nav') {
      return 'frame';
    }
    if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') {
      return 'heading';
    }
    if (tag === 'p') return 'paragraph';
    if (tag === 'button' || classStr.includes('btn') || classStr.includes('button')) return 'button';
    if (tag === 'a') return classStr.includes('btn') || classStr.includes('button') ? 'button' : 'text';
    if (tag === 'img' || tag === 'picture') return 'image';
    if (tag === 'svg') return 'vector_path';
    if (tag === 'hr') return 'divider';
    if (tag === 'ul' || tag === 'ol') return 'stack';
    if (tag === 'li' || tag === 'div') return 'frame';
    if (tag === 'span' || tag === 'strong' || tag === 'em' || tag === 'b' || tag === 'i' || tag === 'label') {
      return 'text';
    }
    return 'frame';
  }

  private generateNodeName(tagName: string, attributes: Record<string, string>, kind: ImportedNodeKind): string {
    if (attributes['id']) return attributes['id'];
    if (attributes['aria-label']) return attributes['aria-label'];
    const classFirst = (attributes['class'] || '').split(' ')[0];
    if (classFirst) return `${tagName}.${classFirst}`;
    return `${kind.charAt(0).toUpperCase() + kind.slice(1)} <${tagName}>`;
  }

  private getDefaultFontSize(tagName: string): number {
    switch (tagName.toLowerCase()) {
      case 'h1': return 40;
      case 'h2': return 32;
      case 'h3': return 24;
      case 'h4': return 20;
      case 'h5': return 16;
      case 'h6': return 14;
      case 'p': return 16;
      case 'button': return 14;
      default: return 14;
    }
  }

  private detectSectionArchetype(nodes: ParsedHtmlElement[]): ImportedSection['archetype'] {
    for (const node of nodes) {
      const text = (node.textContent || '').toLowerCase();
      const cls = ((node.attributes['class'] || '') + ' ' + (node.attributes['id'] || '')).toLowerCase();
      if (cls.includes('hero') || text.includes('welcome') || text.includes('get started')) return 'hero';
      if (cls.includes('pricing') || text.includes('pricing') || text.includes('/month')) return 'pricing';
      if (cls.includes('feature') || text.includes('features')) return 'features';
      if (cls.includes('testimonial') || text.includes('testimonials')) return 'testimonials';
      if (cls.includes('cta') || text.includes('call to action')) return 'cta';
    }
    return 'custom';
  }

  private parseInlineStyle(styleStr: string): {
    layout: Partial<ImportedNode['layout']>;
    geometry: Partial<ImportedNode['geometry']>;
    style: Partial<ImportedNode['style']>;
  } {
    const result = {
      layout: {} as Partial<ImportedNode['layout']>,
      geometry: {} as Partial<ImportedNode['geometry']>,
      style: {} as Partial<ImportedNode['style']>,
    };
    if (!styleStr) return result;

    const declarations = styleStr.split(';').map((s) => s.trim()).filter(Boolean);
    for (const decl of declarations) {
      const [prop, val] = decl.split(':').map((s) => s.trim());
      if (!prop || !val) continue;

      const p = prop.toLowerCase();
      if (p === 'display' && val === 'flex') {
        result.layout.mode = 'flex';
      } else if (p === 'flex-direction') {
        result.layout.direction = val === 'column' ? 'vertical' : 'horizontal';
      } else if (p === 'gap') {
        result.layout.gap = parseInt(val, 10) || val;
      } else if (p === 'background' || p === 'background-color') {
        result.style.fills = [{ type: 'solid', color: val }];
      } else if (p === 'border-radius') {
        result.style.borderRadius = parseInt(val, 10) || 0;
      } else if (p === 'width') {
        result.geometry.width = val === '100%' ? 'full' : parseInt(val, 10) || val;
      } else if (p === 'height') {
        result.geometry.height = parseInt(val, 10) || val;
      }
    }
    return result;
  }

  /**
   * Universal HTML Parser: works in both browser (DOMParser) and Node (lightweight regex parser)
   */
  private parseHtmlToElements(html: string): ParsedHtmlElement[] {
    // If in browser environment
    if (typeof window !== 'undefined' && typeof window.DOMParser !== 'undefined') {
      const parser = new window.DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const body = doc.body;
      return Array.from(body.children).map((el) => this.domToParsedElement(el));
    }

    // Node environment lightweight tree builder
    return this.lightweightParseHtml(html);
  }

  private domToParsedElement(el: Element): ParsedHtmlElement {
    const attributes: Record<string, string> = {};
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      if (attr) {
        attributes[attr.name] = attr.value;
      }
    }

    return {
      tagName: el.tagName.toLowerCase(),
      attributes,
      textContent: el.textContent?.trim() || '',
      rawInnerHtml: el.innerHTML,
      children: Array.from(el.children).map((c) => this.domToParsedElement(c)),
    };
  }

  private lightweightParseHtml(html: string): ParsedHtmlElement[] {
    const results: ParsedHtmlElement[] = [];
    // Clean comments and doctype
    const cleaned = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<!DOCTYPE[^>]*>/gi, '').trim();

    // Regex to match opening tags, self-closing tags, and text
    const tagRegex = /<([a-z0-9]+)([^>]*)>([\s\S]*?)<\/\1>|<([a-z0-9]+)([^>]*)\/>/gi;
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(cleaned)) !== null) {
      const matchTag = match[1];
      const matchSelfClose = match[4];
      if (matchTag) {
        // Paired tag: <tag attrs>content</tag>
        const tagName = matchTag.toLowerCase();
        const rawAttrs = match[2] || '';
        const innerContent = match[3] || '';

        const attributes = this.parseAttributes(rawAttrs);
        const childElements = this.lightweightParseHtml(innerContent);
        const textContent = childElements.length === 0 ? innerContent.replace(/<[^>]+>/g, '').trim() : '';

        results.push({
          tagName,
          attributes,
          textContent,
          rawInnerHtml: innerContent,
          children: childElements,
        });
      } else if (matchSelfClose) {
        // Self-closing: <tag attrs/>
        const tagName = matchSelfClose.toLowerCase();
        const rawAttrs = match[5] || '';
        results.push({
          tagName,
          attributes: this.parseAttributes(rawAttrs),
          textContent: '',
          rawInnerHtml: '',
          children: [],
        });
      }
    }

    // If regex found no elements but there's a single top tag or fragment
    if (results.length === 0 && cleaned.startsWith('<')) {
      const simpleTagMatch = cleaned.match(/^<([a-z0-9]+)([^>]*)>([\s\S]*)/i);
      if (simpleTagMatch && simpleTagMatch[1]) {
        const tagName = simpleTagMatch[1].toLowerCase();
        const attrs = this.parseAttributes(simpleTagMatch[2] || '');
        const inner = (simpleTagMatch[3] || '').replace(new RegExp(`</${tagName}>$`, 'i'), '');
        results.push({
          tagName,
          attributes: attrs,
          textContent: inner.replace(/<[^>]+>/g, '').trim(),
          rawInnerHtml: inner,
          children: this.lightweightParseHtml(inner),
        });
      }
    }

    return results;
  }

  private parseAttributes(rawAttrs: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    if (!rawAttrs) return attrs;
    const attrRegex = /([a-z0-9_-]+)(?:=["']([^"']*)["'])?/gi;
    let m: RegExpExecArray | null;
    while ((m = attrRegex.exec(rawAttrs)) !== null) {
      const key = m[1];
      if (key) {
        attrs[key] = m[2] !== undefined ? m[2] : 'true';
      }
    }
    return attrs;
  }
}

interface ParsedHtmlElement {
  tagName: string;
  attributes: Record<string, string>;
  textContent: string;
  rawInnerHtml: string;
  children: ParsedHtmlElement[];
}
