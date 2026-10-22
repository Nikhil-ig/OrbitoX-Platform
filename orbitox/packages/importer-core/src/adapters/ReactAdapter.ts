/**
 * @orbitox-io/importer-core - React / JSX / Next.js Source Adapter
 * Decompiles React and Next.js functional components, props, and JSX into OrbitoX Import IR
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
import { TokenExtractor } from '../pipeline/TokenExtractor';
import { LayoutInferrer } from '../pipeline/LayoutInferrer';
import { AssetLocalizer } from '../pipeline/AssetLocalizer';
import { FontIngestionService } from '../pipeline/FontIngestionService';
import { SvgOptimizer } from '../pipeline/SvgOptimizer';

export class ReactAdapter implements SourceAdapter<string> {
  public readonly id = 'react_jsx';
  public readonly name = 'React / JSX / Next.js Source Adapter';
  public readonly supportedExtensions = ['.jsx', '.tsx', '.js', '.ts'];
  public readonly supportedMimeTypes = ['text/javascript', 'text/typescript', 'application/javascript'];

  public canHandle(input: string): boolean {
    if (typeof input !== 'string') return false;
    const trimmed = input.trim();
    return (
      trimmed.includes('import React') ||
      trimmed.includes('from \'react\'') ||
      trimmed.includes('from "react"') ||
      /export\s+default\s+function\s+([A-Za-z0-9_]+)/.test(trimmed) ||
      /export\s+const\s+([A-Za-z0-9_]+)\s*=\s*\(/.test(trimmed) ||
      (/className=/i.test(trimmed) && /<[A-Z][A-Za-z0-9]*|<[a-z]+[^>]*>/i.test(trimmed))
    );
  }

  public async parse(input: string, options?: Partial<SourceAdapterOptions>): Promise<AdapterParseResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];

    // Step 1: Security Sanitization
    const sanitizeResult = SecuritySanitizer.sanitize(input);
    if (sanitizeResult.removedNodes.length > 0) {
      warnings.push(`SecuritySanitizer stripped unsafe expressions: ${sanitizeResult.removedNodes.join(', ')}`);
    }

    // Step 2: Extract JSX Template from React Component Body
    const componentName = this.extractComponentName(sanitizeResult.sanitizedCode) || 'ReactComponent';
    const jsxSnippet = this.extractJsxSnippet(sanitizeResult.sanitizedCode);

    if (!jsxSnippet) {
      errors.push('Could not locate return (...) JSX block in React component source.');
      return {
        success: false,
        projectIR: this.createEmptyProject(componentName),
        warnings,
        errors,
        executionTimeMs: Date.now() - startTime,
      };
    }

    // Step 3: Parse JSX into structured element tree
    const rawElements = this.parseJsxToElements(jsxSnippet);

    const sectionNodes: Record<string, ImportedNode> = {};
    const rootChildrenIds: string[] = [];
    const rootSectionId = options?.targetSectionId || `sec_${componentName.toLowerCase()}`;
    const rootNodeId = 'node_react_root';

    sectionNodes[rootNodeId] = {
      id: rootNodeId,
      name: `${componentName} Root`,
      kind: 'frame',
      parentId: null,
      children: rootChildrenIds,
      layout: {
        mode: 'flex',
        direction: 'vertical',
        gap: 24,
      },
      geometry: {
        width: 'full',
        height: 'auto',
      },
      style: {},
    };

    let nodeCounter = 1;
    const processJsxElement = (el: ParsedJsxElement, parentId: string): string => {
      const currentId = `node_jsx_${nodeCounter++}`;
      const isCustomComponent = /^[A-Z]/.test(el.tagName);
      const kind = isCustomComponent
        ? this.mapComponentToKind(el.tagName)
        : this.mapTagToKind(el.tagName, el.attributes);

      const name = isCustomComponent
        ? `<${el.tagName} />`
        : el.attributes['id'] || `${el.tagName}.${(el.attributes['className'] || '').split(' ')[0] || kind}`;

      // Decompile Tailwind from className
      const classAttr = el.attributes['className'] || el.attributes['class'] || '';
      const decompiled = TailwindDecompiler.decompile(classAttr);

      const irNode: ImportedNode = {
        id: currentId,
        name,
        kind,
        parentId,
        children: [],
        layout: {
          mode: decompiled.layout.mode || 'flow',
          direction: decompiled.layout.direction,
          wrap: decompiled.layout.wrap,
          justifyContent: decompiled.layout.justifyContent,
          alignItems: decompiled.layout.alignItems,
          gap: decompiled.layout.gap,
          padding: decompiled.layout.padding,
        },
        geometry: {
          width: decompiled.geometry.width || 'full',
          height: decompiled.geometry.height || 'auto',
          maxWidth: decompiled.geometry.maxWidth,
        },
        style: {
          fills: decompiled.style.fills,
          strokes: decompiled.style.strokes,
          borderRadius: decompiled.style.borderRadius,
          boxShadow: decompiled.style.boxShadow,
        },
        typography: (kind === 'text' || kind === 'heading' || kind === 'paragraph' || kind === 'button')
          ? {
              fontFamily: 'Inter, sans-serif',
              fontSize: decompiled.typography?.fontSize || (el.tagName.startsWith('h') ? 28 : 14),
              fontWeight: decompiled.typography?.fontWeight || (el.tagName.startsWith('h') ? 700 : 400),
              lineHeight: 1.4,
              color: decompiled.typography?.color || '#FFFFFF',
              textAlign: decompiled.typography?.textAlign || 'left',
            }
          : undefined,
        content: {},
        responsiveOverrides: decompiled.responsive,
      };

      // Handle text or dynamic binding
      if (el.textContent) {
        if (el.isDynamicExpression) {
          irNode.content = { text: el.textContent };
          irNode.dataBinding = {
            model: 'props',
            field: el.textContent.replace(/[{}]/g, '').trim(),
          };
        } else {
          irNode.content = { text: el.textContent };
        }
      }

      if (el.tagName.toLowerCase() === 'img') {
        irNode.content = {
          imageRef: el.attributes['src'] || '',
          altText: el.attributes['alt'] || '',
        };
      }

      if (el.tagName.toLowerCase() === 'a' || kind === 'button') {
        irNode.content = {
          text: el.textContent || '',
          buttonHref: el.attributes['href'] || '#',
        };
      }

      if (el.tagName.toLowerCase() === 'svg') {
        const fullSvg = `<svg ${Object.entries(el.attributes).map(([k, v]) => `${k}="${v}"`).join(' ')}>${el.textContent || ''}</svg>`;
        const optimized = SvgOptimizer.optimize(fullSvg);
        irNode.content = {
          vectorSvgPath: optimized.paths.map((p) => p.d).join(' ') || undefined,
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
        const childId = processJsxElement(child, currentId);
        irNode.children.push(childId);
      }

      // Infer flex/grid layouts
      const childrenNodes = irNode.children
        .map((cid) => sectionNodes[cid])
        .filter((n): n is ImportedNode => Boolean(n));
      irNode.layout = LayoutInferrer.inferNodeLayout(irNode, childrenNodes);

      sectionNodes[currentId] = irNode;
      return currentId;
    };

    for (const topEl of rawElements) {
      const childId = processJsxElement(topEl, rootNodeId);
      rootChildrenIds.push(childId);
    }

    const section: ImportedSection = {
      id: rootSectionId,
      name: `${componentName} Section`,
      archetype: this.detectArchetype(componentName, rawElements),
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
      id: options?.targetPageId || 'page_react_preview',
      name: `${componentName} Preview`,
      route: '/',
      isHome: true,
      sections: [section],
    };

    const project: ImportedProject = {
      irVersion: '1.0',
      sourceFormat: 'react_jsx',
      sourceOrigin: {
        importedAt: new Date().toISOString(),
      },
      metadata: {
        title: `${componentName} Component`,
        description: 'Imported from React / JSX component via OrbitoX Universal Importer',
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
        overallScore: 96,
        totalNodes: Object.keys(sectionNodes).length,
        highConfidenceCount: Object.keys(sectionNodes).length,
        mediumConfidenceCount: 0,
        lowConfidenceCount: 0,
        unsupportedFeatures: [],
        warnings,
      },
    };

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

  private extractComponentName(code: string): string | null {
    const fnMatch = code.match(/export\s+default\s+function\s+([A-Za-z0-9_]+)/);
    if (fnMatch && fnMatch[1]) return fnMatch[1];
    const constMatch = code.match(/export\s+const\s+([A-Za-z0-9_]+)\s*=\s*\(/);
    if (constMatch && constMatch[1]) return constMatch[1];
    return null;
  }

  private extractJsxSnippet(code: string): string {
    const trimmed = code.trim();
    if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
      return trimmed;
    }

    const returnParenMatch = code.match(/return\s*\(\s*([\s\S]*?)\s*\)\s*;/);
    if (returnParenMatch && returnParenMatch[1]) return returnParenMatch[1].trim();

    const returnDirectMatch = code.match(/return\s*(<[\s\S]*?>[\s\S]*?<\/[a-zA-Z0-9]+>)\s*;/);
    if (returnDirectMatch && returnDirectMatch[1]) return returnDirectMatch[1].trim();

    return trimmed;
  }

  private mapComponentToKind(componentName: string): ImportedNodeKind {
    const name = componentName.toLowerCase();
    if (name.includes('button') || name.includes('btn') || name.includes('cta')) return 'button';
    if (name.includes('card') || name.includes('container') || name.includes('wrapper') || name.includes('box')) return 'frame';
    if (name.includes('heading') || name.includes('title')) return 'heading';
    if (name.includes('text') || name.includes('label')) return 'text';
    if (name.includes('icon')) return 'icon';
    if (name.includes('avatar') || name.includes('image')) return 'image';
    return 'component_instance';
  }

  private mapTagToKind(tagName: string, attributes: Record<string, string>): ImportedNodeKind {
    const tag = tagName.toLowerCase();
    const classStr = (attributes['className'] || attributes['class'] || '').toLowerCase();

    if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') return 'heading';
    if (tag === 'p') return 'paragraph';
    if (tag === 'button' || classStr.includes('button') || classStr.includes('btn')) return 'button';
    if (tag === 'a') return classStr.includes('btn') || classStr.includes('button') ? 'button' : 'text';
    if (tag === 'img') return 'image';
    if (tag === 'svg') return 'vector_path';
    if (tag === 'span' || tag === 'strong' || tag === 'b' || tag === 'i') return 'text';
    return 'frame';
  }

  private detectArchetype(name: string, elements: ParsedJsxElement[]): ImportedSection['archetype'] {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('hero')) return 'hero';
    if (lowerName.includes('pricing')) return 'pricing';
    if (lowerName.includes('feature')) return 'features';
    if (lowerName.includes('cta')) return 'cta';
    if (lowerName.includes('testimonial')) return 'testimonials';
    return 'custom';
  }

  private parseJsxToElements(jsx: string): ParsedJsxElement[] {
    const results: ParsedJsxElement[] = [];
    const cleaned = jsx.trim();

    // Regex matching JSX tags (both self-closing and paired)
    const tagRegex = /<([A-Za-z0-9_.-]+)([^>]*)>([\s\S]*?)<\/\1>|<([A-Za-z0-9_.-]+)([^>]*)\/>/gi;
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(cleaned)) !== null) {
      const matchTag = match[1];
      const matchSelfClose = match[4];
      if (matchTag) {
        const tagName = matchTag;
        const rawAttrs = match[2] || '';
        const innerContent = match[3] || '';

        const attributes = this.parseJsxAttributes(rawAttrs);
        const children = this.parseJsxToElements(innerContent);
        const isDynamic = /^{[^}]+}$/.test(innerContent.trim());
        const textContent = children.length === 0 ? innerContent.replace(/<[^>]+>/g, '').trim() : '';

        results.push({
          tagName,
          attributes,
          textContent,
          isDynamicExpression: isDynamic,
          children,
        });
      } else if (matchSelfClose) {
        const tagName = matchSelfClose;
        const rawAttrs = match[5] || '';
        results.push({
          tagName,
          attributes: this.parseJsxAttributes(rawAttrs),
          textContent: '',
          isDynamicExpression: false,
          children: [],
        });
      }
    }

    // Single element wrapper fallback
    if (results.length === 0 && cleaned.startsWith('<')) {
      const singleMatch = cleaned.match(/^<([A-Za-z0-9_.-]+)([^>]*)>([\s\S]*)/i);
      if (singleMatch && singleMatch[1]) {
        const tagName = singleMatch[1];
        const attrs = this.parseJsxAttributes(singleMatch[2] || '');
        const inner = (singleMatch[3] || '').replace(new RegExp(`</${tagName}>$`, 'i'), '');
        results.push({
          tagName,
          attributes: attrs,
          textContent: inner.replace(/<[^>]+>/g, '').trim(),
          isDynamicExpression: /^{[^}]+}$/.test(inner.trim()),
          children: this.parseJsxToElements(inner),
        });
      }
    }

    return results;
  }

  private parseJsxAttributes(rawAttrs: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    if (!rawAttrs) return attrs;

    // Matches key="val", key={'val'}, key={val}
    const attrRegex = /([A-Za-z0-9_]+)(?:=(?:["']([^"']*)["']|{([^}]+)}))?/g;
    let m: RegExpExecArray | null;
    while ((m = attrRegex.exec(rawAttrs)) !== null) {
      const key = m[1];
      if (!key) continue;
      const stringVal = m[2];
      const exprVal = m[3];
      if (stringVal !== undefined) {
        attrs[key] = stringVal;
      } else if (exprVal !== undefined) {
        attrs[key] = exprVal.replace(/^['"]|['"]$/g, '').trim();
      } else {
        attrs[key] = 'true';
      }
    }
    return attrs;
  }

  private createEmptyProject(componentName: string): ImportedProject {
    return {
      irVersion: '1.0',
      sourceFormat: 'react_jsx',
      sourceOrigin: { importedAt: new Date().toISOString() },
      metadata: { title: componentName },
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
        warnings: ['Empty or invalid component'],
      },
    };
  }
}

interface ParsedJsxElement {
  tagName: string;
  attributes: Record<string, string>;
  textContent: string;
  isDynamicExpression: boolean;
  children: ParsedJsxElement[];
}
