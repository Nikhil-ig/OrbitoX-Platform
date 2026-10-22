/**
 * OrbitoX Universal Importer - WordPress FSE & Block Theme Adapter
 * Package: @orbitox-io/importer-core
 * 
 * Spec: docs/P26_WORDPRESS_STRATEGY.md
 * Handles WordPress Full Site Editing (FSE) block themes, Gutenberg block HTML comments,
 * and theme.json design token extraction.
 */

import {
  ImportedProject,
  ImportedPage,
  ImportedSection,
  ImportedNode,
  ImportedDesignTokens,
  ImportConfidenceReport,
  ImportedCustomCodeBoundary,
} from '../types/ImportIR';
import { SourceAdapter, SourceAdapterOptions, AdapterParseResult } from '../types/Adapter';

export interface GutenbergParsedBlock {
  blockName: string;
  attrs: Record<string, any>;
  innerBlocks: GutenbergParsedBlock[];
  innerHTML: string;
}

export interface WpThemeJson {
  version?: number;
  settings?: {
    color?: {
      palette?: Array<{ slug: string; color: string; name?: string }>;
      gradients?: Array<{ slug: string; gradient: string; name?: string }>;
    };
    typography?: {
      fontFamilies?: Array<{ slug: string; fontFamily: string; name?: string }>;
      fontSizes?: Array<{ slug: string; size: string; name?: string }>;
    };
    spacing?: {
      spacingSizes?: Array<{ slug: string; size: string; name?: string }>;
    };
  };
}

export class WordPressAdapter implements SourceAdapter<string | object> {
  public readonly id = 'wordpress';
  public readonly name = 'WordPress FSE & Block Theme Adapter';
  public readonly version = '1.0.0';
  public readonly supportedSourceFormats = ['wordpress' as const];
  public readonly supportedExtensions = ['.html', '.json', '.zip'];
  public readonly supportedMimeTypes = ['text/html', 'application/json', 'application/zip'];

  public canHandle(input: string | object): boolean {
    if (!input) return false;

    if (typeof input === 'object') {
      return this.isWpObject(input);
    }

    if (typeof input === 'string') {
      const trimmed = input.trim();
      // Gutenberg block comment delimiter
      if (trimmed.includes('<!-- wp:') || trimmed.includes('<!-- /wp:')) {
        return true;
      }
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          return this.isWpObject(parsed);
        } catch {
          return false;
        }
      }
    }

    return false;
  }

  private isWpObject(obj: any): boolean {
    if (!obj || typeof obj !== 'object') return false;

    // Theme archive dictionary
    if (obj['theme.json'] || obj['templates/index.html'] || obj['parts/header.html']) {
      return true;
    }

    // Direct theme.json payload
    if (obj.settings && (obj.settings.color || obj.settings.typography) && (obj.version === 2 || obj.version === 3 || obj.settings.color?.palette)) {
      return true;
    }

    return false;
  }

  public async parse(
    source: string | object,
    options: Partial<SourceAdapterOptions> = {}
  ): Promise<AdapterParseResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];
    const customCodeBoundaries: ImportedCustomCodeBoundary[] = [];

    try {
      let rawData: any = typeof source === 'string' ? source.trim() : source;
      let themeJson: WpThemeJson | undefined;
      let templateHtml: string = '';

      if (typeof rawData === 'string' && (rawData.startsWith('{') && rawData.endsWith('}'))) {
        try {
          rawData = JSON.parse(rawData);
        } catch {
          // treat as raw block HTML
        }
      }

      if (typeof rawData === 'object' && rawData !== null) {
        if (rawData['theme.json']) {
          themeJson = typeof rawData['theme.json'] === 'string'
            ? JSON.parse(rawData['theme.json'])
            : rawData['theme.json'];
        } else if (rawData.settings && (rawData.settings.color || rawData.settings.typography)) {
          themeJson = rawData;
        }

        if (rawData['templates/index.html']) {
          templateHtml = String(rawData['templates/index.html']);
        } else if (rawData['templates/home.html']) {
          templateHtml = String(rawData['templates/home.html']);
        } else if (rawData.content) {
          templateHtml = String(rawData.content);
        }
      } else if (typeof rawData === 'string') {
        templateHtml = rawData;
      }

      if (!templateHtml && themeJson) {
        // Mock a preview template from theme.json tokens
        templateHtml = `<!-- wp:group {"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
  <!-- wp:heading {"level":1} -->
  <h1 class="wp-block-heading">WordPress FSE Theme Preview</h1>
  <!-- /wp:heading -->
  <!-- wp:paragraph -->
  <p>Ingested design tokens from theme.json.</p>
  <!-- /wp:paragraph -->
</div>
<!-- /wp:group -->`;
      }

      if (!templateHtml) {
        return {
          success: false,
          projectIR: undefined as any,
          errors: ['No valid WordPress Gutenberg block HTML or theme.json found in payload.'],
          warnings,
          executionTimeMs: Date.now() - startTime,
        };
      }

      // Extract Design Tokens from theme.json
      const designTokens = this.extractTokensFromThemeJson(themeJson);

      // Parse Gutenberg block grammar
      const parsedBlocks = this.tokenizeGutenbergBlocks(templateHtml, warnings);

      // Build ImportedSections and Node trees
      const sections = this.buildSectionsFromBlocks(
        parsedBlocks,
        designTokens,
        warnings,
        customCodeBoundaries
      );

      const page: ImportedPage = {
        id: 'page_wp_index',
        name: 'WordPress FSE Home',
        route: '/',
        isHome: true,
        sections,
      };

      let totalNodes = 0;
      for (const sec of sections) {
        totalNodes += Object.keys(sec.nodes).length;
      }

      const confidenceReport: ImportConfidenceReport = {
        overallScore: warnings.length === 0 ? 98 : Math.max(88, 98 - warnings.length * 2),
        totalNodes,
        highConfidenceCount: totalNodes,
        mediumConfidenceCount: 0,
        lowConfidenceCount: 0,
        unsupportedFeatures: warnings.map((w) => ({
          feature: w,
          occurrences: 1,
          fallbackApplied: 'Standard WordPress Gutenberg component mapping fallback',
        })),
        warnings,
      };

      const projectIR: ImportedProject = {
        irVersion: '1.0',
        sourceFormat: 'wordpress',
        sourceOrigin: {
          importedAt: new Date().toISOString(),
        },
        metadata: {
          title: 'WordPress Block Theme',
          description: 'Imported from WordPress FSE & Gutenberg blocks via OrbitoX Universal Importer',
          originalToolVersion: 'WordPress 6.x FSE',
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
        customCodeBoundaries,
      };

      return {
        success: true,
        projectIR,
        warnings,
        errors: [],
        executionTimeMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        projectIR: undefined as any,
        errors: [`WordPress import failed: ${err?.message || String(err)}`],
        warnings,
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Tokenizes Gutenberg Block Comment grammar into a structured AST hierarchy
   */
  public tokenizeGutenbergBlocks(html: string, warnings: string[]): GutenbergParsedBlock[] {
    const rootBlocks: GutenbergParsedBlock[] = [];
    const stack: GutenbergParsedBlock[] = [];

    // Match Gutenberg comments:
    // Open: <!-- wp:name {"attr":"val"} -->
    // Close: <!-- /wp:name -->
    // Self-closing: <!-- wp:name {"attr":"val"} /-->
    const blockRegex = /<!--\s*(\/)?wp:([a-z0-9_\-\/]+)(?:\s+(\{[\s\S]*?\}))?\s*(\/)?\s*-->/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = blockRegex.exec(html)) !== null) {
      const matchIndex = match.index;
      const isClosing = match[1] === '/';
      const rawBlockName = match[2]!;
      const attrsStr = match[3]?.trim() || '';
      const isSelfClosing = match[4] === '/';

      const blockName = this.normalizeBlockName(rawBlockName);

      // Collect HTML between last tag and this tag
      if (matchIndex > lastIndex && stack.length > 0) {
        const interstitialHtml = html.slice(lastIndex, matchIndex);
        stack[stack.length - 1]!.innerHTML += interstitialHtml;
      }

      lastIndex = blockRegex.lastIndex;

      if (isClosing) {
        // Closing tag
        if (stack.length > 0) {
          const current = stack.pop()!;
          if (stack.length > 0) {
            stack[stack.length - 1]!.innerBlocks.push(current);
          } else {
            rootBlocks.push(current);
          }
        } else {
          warnings.push(`Unmatched closing tag for Gutenberg block: ${blockName}`);
        }
      } else {
        // Opening or Self-closing tag
        let attrs: Record<string, any> = {};
        if (attrsStr && attrsStr.startsWith('{')) {
          try {
            attrs = JSON.parse(attrsStr);
          } catch (e: any) {
            warnings.push(`Failed to parse JSON attributes for block ${blockName}: ${e.message}`);
          }
        }

        const newBlock: GutenbergParsedBlock = {
          blockName,
          attrs,
          innerBlocks: [],
          innerHTML: '',
        };

        if (isSelfClosing) {
          if (stack.length > 0) {
            stack[stack.length - 1]!.innerBlocks.push(newBlock);
          } else {
            rootBlocks.push(newBlock);
          }
        } else {
          stack.push(newBlock);
        }
      }
    }

    // Flush any unclosed blocks on stack
    while (stack.length > 0) {
      const remaining = stack.pop()!;
      if (stack.length > 0) {
        stack[stack.length - 1]!.innerBlocks.push(remaining);
      } else {
        rootBlocks.push(remaining);
      }
    }

    return rootBlocks;
  }

  private normalizeBlockName(name: string): string {
    if (!name.includes('/')) {
      return `core/${name}`;
    }
    return name;
  }

  /**
   * Extract design tokens from WordPress theme.json
   */
  private extractTokensFromThemeJson(themeJson?: WpThemeJson): ImportedDesignTokens {
    const tokens: ImportedDesignTokens = {
      colors: {
        bg_primary: { value: '#060B1A', inferredRole: 'background' },
        text_primary: { value: '#FFFFFF', inferredRole: 'text' },
        accent: { value: '#DFBA6B', inferredRole: 'accent' },
      },
      typography: {
        body: {
          fontFamily: 'Inter',
          fallback: 'sans-serif',
          weights: [400, 500, 600, 700],
        },
        heading: {
          fontFamily: 'Cinzel',
          fallback: 'serif',
          weights: [600, 700, 800],
        },
      },
      spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        '2xl': 48,
        '3xl': 64,
      },
      radii: {
        sm: 4,
        md: 8,
        lg: 16,
        full: 9999,
      },
      shadows: {
        card: '0 4px 16px rgba(0, 0, 0, 0.4)',
      },
    };

    if (!themeJson?.settings) return tokens;

    // Palette
    if (Array.isArray(themeJson.settings.color?.palette)) {
      for (const item of themeJson.settings.color.palette) {
        if (!item.slug || !item.color) continue;
        const role = this.inferTokenRole(item.slug, item.name);
        tokens.colors[item.slug] = {
          value: item.color,
          inferredRole: role,
        };
      }
    }

    // Typography
    if (Array.isArray(themeJson.settings.typography?.fontFamilies)) {
      for (const item of themeJson.settings.typography.fontFamilies) {
        if (!item.slug || !item.fontFamily) continue;
        const [family, fallback] = this.parseFontFamily(item.fontFamily);
        tokens.typography[item.slug] = {
          fontFamily: family,
          fallback: fallback || 'sans-serif',
          weights: [400, 600, 700],
        };
      }
    }

    return tokens;
  }

  private inferTokenRole(slug: string, name?: string): 'primary' | 'secondary' | 'accent' | 'background' | 'surface' | 'text' {
    const s = `${slug} ${name || ''}`.toLowerCase();
    if (s.includes('bg') || s.includes('background') || s.includes('base')) return 'background';
    if (s.includes('text') || s.includes('foreground') || s.includes('body')) return 'text';
    if (s.includes('accent') || s.includes('gold') || s.includes('highlight')) return 'accent';
    if (s.includes('surface') || s.includes('card')) return 'surface';
    if (s.includes('muted') || s.includes('subtle') || s.includes('secondary')) return 'secondary';
    return 'primary';
  }

  private parseFontFamily(fontFamily: string): [string, string] {
    const parts = fontFamily.split(',').map((p) => p.trim().replace(/['"]/g, ''));
    return [parts[0] || 'Inter', parts.slice(1).join(', ') || 'sans-serif'];
  }

  /**
   * Builds ImportedSections and node trees from parsed Gutenberg blocks
   */
  private buildSectionsFromBlocks(
    blocks: GutenbergParsedBlock[],
    tokens: ImportedDesignTokens,
    warnings: string[],
    customCodeBoundaries: ImportedCustomCodeBoundary[]
  ): ImportedSection[] {
    const sections: ImportedSection[] = [];

    // Group blocks into logical sections.
    // If top-level block is a core/group, core/cover, or core/columns, make each its own section.
    // Otherwise group sequential blocks into a main section.
    let currentBlocksGroup: GutenbergParsedBlock[] = [];
    let sectionIdx = 0;

    const flushGroup = () => {
      if (currentBlocksGroup.length === 0) return;
      const section = this.convertBlockClusterToSection(
        `section_wp_${sectionIdx}`,
        `WordPress Section ${sectionIdx + 1}`,
        currentBlocksGroup,
        sectionIdx,
        tokens,
        warnings,
        customCodeBoundaries
      );
      sections.push(section);
      sectionIdx++;
      currentBlocksGroup = [];
    };

    for (const block of blocks) {
      if (['core/group', 'core/cover', 'core/columns', 'core/query'].includes(block.blockName)) {
        flushGroup();
        const sectionName = this.getBlockHumanTitle(block);
        const section = this.convertBlockClusterToSection(
          `section_wp_${sectionIdx}`,
          sectionName,
          [block],
          sectionIdx,
          tokens,
          warnings,
          customCodeBoundaries
        );
        sections.push(section);
        sectionIdx++;
      } else {
        currentBlocksGroup.push(block);
      }
    }

    flushGroup();

    if (sections.length === 0) {
      // Create empty section
      sections.push({
        id: 'section_wp_default',
        name: 'WordPress Content',
        archetype: 'custom',
        geometry: {
          height: 'auto',
          maxWidth: 1440,
        },
        style: {
          backgroundColor: tokens.colors.bg_primary?.value || '#060B1A',
        },
        rootNodeId: 'node_wp_empty',
        nodes: {
          node_wp_empty: {
            id: 'node_wp_empty',
            name: 'Empty Container',
            kind: 'frame',
            parentId: null,
            children: [],
            layout: { mode: 'flex', direction: 'vertical', gap: 16 },
            geometry: { width: 'full', height: 'auto' },
            style: {},
          },
        },
        renderOrder: ['node_wp_empty'],
      });
    }

    return sections;
  }

  private getBlockHumanTitle(block: GutenbergParsedBlock): string {
    switch (block.blockName) {
      case 'core/cover': return 'Hero Cover Section';
      case 'core/columns': return 'Multi-Column Grid';
      case 'core/query': return 'Posts Query Loop';
      case 'core/group': return 'Content Group';
      default: return 'WordPress Section';
    }
  }

  private convertBlockClusterToSection(
    sectionId: string,
    sectionName: string,
    blocks: GutenbergParsedBlock[],
    order: number,
    tokens: ImportedDesignTokens,
    warnings: string[],
    customCodeBoundaries: ImportedCustomCodeBoundary[]
  ): ImportedSection {
    const nodes: Record<string, ImportedNode> = {};
    const rootNodeId = `node_root_${sectionId}`;

    const rootNode: ImportedNode = {
      id: rootNodeId,
      name: `${sectionName} Container`,
      kind: 'frame',
      parentId: null,
      children: [],
      layout: {
        mode: 'flex',
        direction: 'vertical',
        gap: 24,
        padding: { top: 48, right: 32, bottom: 48, left: 32 },
        alignItems: 'stretch',
        justifyContent: 'start',
      },
      geometry: {
        width: 'full',
        height: 'auto',
      },
      style: {
        fills: [{ type: 'solid', color: tokens.colors.bg_primary?.value || '#060B1A' }],
      },
    };

    nodes[rootNodeId] = rootNode;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]!;
      const childNodeId = this.convertBlockToNode(
        block,
        rootNodeId,
        `${sectionId}_b${i}`,
        nodes,
        tokens,
        warnings,
        customCodeBoundaries
      );
      if (childNodeId) {
        rootNode.children.push(childNodeId);
      }
    }

    return {
      id: sectionId,
      name: sectionName,
      archetype: this.inferSectionArchetype(blocks),
      geometry: {
        height: 'auto',
        maxWidth: 1440,
      },
      style: {
        backgroundColor: tokens.colors.bg_primary?.value || '#060B1A',
      },
      rootNodeId,
      nodes,
      renderOrder: [rootNodeId],
    };
  }

  private inferSectionArchetype(blocks: GutenbergParsedBlock[]): 'hero' | 'features' | 'pricing' | 'testimonials' | 'cta' | 'header' | 'footer' | 'custom' {
    for (const b of blocks) {
      if (b.blockName === 'core/cover') return 'hero';
      if (b.blockName === 'core/query') return 'features';
      if (b.blockName === 'core/columns' && b.innerBlocks.length >= 3) return 'features';
    }
    return 'custom';
  }

  private convertBlockToNode(
    block: GutenbergParsedBlock,
    parentId: string,
    prefix: string,
    nodes: Record<string, ImportedNode>,
    tokens: ImportedDesignTokens,
    warnings: string[],
    customCodeBoundaries: ImportedCustomCodeBoundary[]
  ): string | null {
    const nodeId = `node_${prefix}`;

    switch (block.blockName) {
      case 'core/heading': {
        const level = block.attrs.level || 2;
        const textContent = this.stripHtmlTags(block.innerHTML) || 'WordPress Heading';
        const fontSize = level === 1 ? 44 : level === 2 ? 32 : level === 3 ? 24 : 20;
        const color = this.resolveColor(block.attrs.textColor, block.attrs.style?.color?.text, tokens, '#FFFFFF');

        const node: ImportedNode = {
          id: nodeId,
          name: `Heading (H${level})`,
          kind: 'text',
          parentId,
          children: [],
          layout: { mode: 'flow' },
          geometry: { width: 'full', height: 'auto' },
          style: {},
          typography: {
            fontFamily: tokens.typography.heading?.fontFamily || 'Cinzel',
            fontSize,
            fontWeight: level === 1 ? 700 : 600,
            lineHeight: 1.25,
            color,
          },
          content: {
            text: textContent,
          },
        };
        nodes[nodeId] = node;
        return nodeId;
      }

      case 'core/paragraph': {
        const textContent = this.stripHtmlTags(block.innerHTML) || 'Paragraph content...';
        const color = this.resolveColor(block.attrs.textColor, block.attrs.style?.color?.text, tokens, 'rgba(255, 255, 255, 0.7)');

        const node: ImportedNode = {
          id: nodeId,
          name: 'Paragraph Text',
          kind: 'text',
          parentId,
          children: [],
          layout: { mode: 'flow' },
          geometry: { width: 'full', height: 'auto' },
          style: {},
          typography: {
            fontFamily: tokens.typography.body?.fontFamily || 'Inter',
            fontSize: 16,
            fontWeight: 400,
            lineHeight: 1.6,
            color,
          },
          content: {
            text: textContent,
          },
        };
        nodes[nodeId] = node;
        return nodeId;
      }

      case 'core/buttons': {
        const node: ImportedNode = {
          id: nodeId,
          name: 'Buttons Row',
          kind: 'frame',
          parentId,
          children: [],
          layout: {
            mode: 'flex',
            direction: 'horizontal',
            gap: 12,
            alignItems: 'center',
            wrap: true,
          },
          geometry: { width: 'auto', height: 'auto' },
          style: {},
        };
        nodes[nodeId] = node;

        for (let i = 0; i < block.innerBlocks.length; i++) {
          const btnBlock = block.innerBlocks[i]!;
          const btnNodeId = this.convertBlockToNode(
            btnBlock,
            nodeId,
            `${prefix}_btn${i}`,
            nodes,
            tokens,
            warnings,
            customCodeBoundaries
          );
          if (btnNodeId) node.children.push(btnNodeId);
        }
        return nodeId;
      }

      case 'core/button': {
        const label = this.stripHtmlTags(block.innerHTML) || 'Click Here';
        const href = this.extractLinkHref(block.innerHTML) || block.attrs.url || '#';
        const bgColor = this.resolveColor(block.attrs.backgroundColor, block.attrs.style?.color?.background, tokens, tokens.colors.accent?.value || '#DFBA6B');
        const textColor = this.resolveColor(block.attrs.textColor, block.attrs.style?.color?.text, tokens, '#060B1A');
        const rawRadius = block.attrs.borderRadius || block.attrs.style?.border?.radius || 8;
        const borderRadius = typeof rawRadius === 'number' ? rawRadius : parseInt(String(rawRadius), 10) || 8;

        const node: ImportedNode = {
          id: nodeId,
          name: `Button (${label})`,
          kind: 'button',
          parentId,
          children: [],
          layout: {
            mode: 'flex',
            direction: 'horizontal',
            alignItems: 'center',
            justifyContent: 'center',
            padding: { top: 12, right: 24, bottom: 12, left: 24 },
          },
          geometry: { width: 'auto', height: 'auto' },
          style: {
            fills: [{ type: 'solid', color: bgColor }],
            borderRadius,
          },
          typography: {
            fontFamily: tokens.typography.body?.fontFamily || 'Inter',
            fontSize: 15,
            fontWeight: 600,
            lineHeight: 1.2,
            color: textColor,
          },
          content: {
            text: label,
            buttonHref: href,
          },
        };
        nodes[nodeId] = node;
        return nodeId;
      }

      case 'core/image': {
        const src = block.attrs.url || this.extractImageSrc(block.innerHTML) || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80';
        const alt = block.attrs.alt || this.extractImageAlt(block.innerHTML) || 'Imported WordPress Image';

        const node: ImportedNode = {
          id: nodeId,
          name: 'Image Element',
          kind: 'image',
          parentId,
          children: [],
          layout: { mode: 'flow' },
          geometry: { width: 'full', height: 360 },
          style: {
            fills: [
              { type: 'solid', color: '#1E293B' },
              { type: 'image_pattern', color: src },
            ],
            borderRadius: 12,
          },
          content: {
            imageRef: src,
            altText: alt,
          },
        };
        nodes[nodeId] = node;
        return nodeId;
      }

      case 'core/columns': {
        const gap = block.attrs.style?.spacing?.blockGap || 24;
        const node: ImportedNode = {
          id: nodeId,
          name: 'Columns Layout Container',
          kind: 'frame',
          parentId,
          children: [],
          layout: {
            mode: 'flex',
            direction: 'horizontal',
            gap: typeof gap === 'number' ? gap : 24,
            alignItems: 'stretch',
            wrap: true,
          },
          geometry: { width: 'full', height: 'auto' },
          style: {},
        };
        nodes[nodeId] = node;

        for (let i = 0; i < block.innerBlocks.length; i++) {
          const colBlock = block.innerBlocks[i]!;
          const colNodeId = this.convertBlockToNode(
            colBlock,
            nodeId,
            `${prefix}_col${i}`,
            nodes,
            tokens,
            warnings,
            customCodeBoundaries
          );
          if (colNodeId) node.children.push(colNodeId);
        }
        return nodeId;
      }

      case 'core/column': {
        const width = block.attrs.width || 'auto';
        const node: ImportedNode = {
          id: nodeId,
          name: 'Column Cell',
          kind: 'frame',
          parentId,
          children: [],
          layout: {
            mode: 'flex',
            direction: 'vertical',
            gap: 16,
            alignItems: 'stretch',
          },
          geometry: {
            width: width === 'auto' ? 'auto' : width,
            height: 'auto',
          },
          style: {},
        };
        nodes[nodeId] = node;

        for (let i = 0; i < block.innerBlocks.length; i++) {
          const childBlock = block.innerBlocks[i]!;
          const childId = this.convertBlockToNode(
            childBlock,
            nodeId,
            `${prefix}_c${i}`,
            nodes,
            tokens,
            warnings,
            customCodeBoundaries
          );
          if (childId) node.children.push(childId);
        }
        return nodeId;
      }

      case 'core/cover': {
        const url = block.attrs.url || this.extractImageSrc(block.innerHTML);
        const overlayColor = this.resolveColor(block.attrs.overlayColor, block.attrs.style?.color?.background, tokens, '#060B1A');
        const dimRatio = typeof block.attrs.dimRatio === 'number' ? block.attrs.dimRatio / 100 : 0.5;

        const node: ImportedNode = {
          id: nodeId,
          name: 'Hero Cover Block',
          kind: 'frame',
          parentId,
          children: [],
          layout: {
            mode: 'flex',
            direction: 'vertical',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: { top: 80, right: 32, bottom: 80, left: 32 },
          },
          geometry: { width: 'full', height: 'auto', minHeight: 450 },
          style: {
            fills: [
              { type: 'solid', color: overlayColor, opacity: dimRatio },
              ...(url ? [{ type: 'image_pattern' as const, color: url }] : []),
            ],
            borderRadius: 16,
          },
        };
        nodes[nodeId] = node;

        for (let i = 0; i < block.innerBlocks.length; i++) {
          const childBlock = block.innerBlocks[i]!;
          const childId = this.convertBlockToNode(
            childBlock,
            nodeId,
            `${prefix}_cov${i}`,
            nodes,
            tokens,
            warnings,
            customCodeBoundaries
          );
          if (childId) node.children.push(childId);
        }
        return nodeId;
      }

      case 'core/group': {
        const bgColor = this.resolveColor(block.attrs.backgroundColor, block.attrs.style?.color?.background, tokens, 'transparent');
        const node: ImportedNode = {
          id: nodeId,
          name: 'Group Container',
          kind: 'frame',
          parentId,
          children: [],
          layout: {
            mode: 'flex',
            direction: 'vertical',
            gap: 16,
            alignItems: 'stretch',
          },
          geometry: { width: 'full', height: 'auto' },
          style: {
            fills: bgColor !== 'transparent' ? [{ type: 'solid', color: bgColor }] : [],
          },
        };
        nodes[nodeId] = node;

        for (let i = 0; i < block.innerBlocks.length; i++) {
          const childBlock = block.innerBlocks[i]!;
          const childId = this.convertBlockToNode(
            childBlock,
            nodeId,
            `${prefix}_grp${i}`,
            nodes,
            tokens,
            warnings,
            customCodeBoundaries
          );
          if (childId) node.children.push(childId);
        }
        return nodeId;
      }

      case 'core/query':
      case 'core/post-template': {
        // Query Loop Repeater
        const postType = block.attrs.query?.postType || 'post';
        const node: ImportedNode = {
          id: nodeId,
          name: `Query Loop Repeater (${postType})`,
          kind: 'repeater',
          parentId,
          children: [],
          layout: {
            mode: 'grid',
            gridColumns: 'repeat(3, 1fr)',
            gap: 24,
          },
          geometry: { width: 'full', height: 'auto' },
          style: {},
          dataBinding: {
            model: 'posts',
            field: 'items',
          },
        };
        nodes[nodeId] = node;

        // Convert template blocks inside query loop
        const inner = block.blockName === 'core/query' && block.innerBlocks[0]?.blockName === 'core/post-template'
          ? block.innerBlocks[0].innerBlocks
          : block.innerBlocks;

        for (let i = 0; i < inner.length; i++) {
          const tBlock = inner[i]!;
          const tId = this.convertBlockToNode(
            tBlock,
            nodeId,
            `${prefix}_tpl${i}`,
            nodes,
            tokens,
            warnings,
            customCodeBoundaries
          );
          if (tId) node.children.push(tId);
        }

        // If no inner template blocks, synthesize post card
        if (node.children.length === 0) {
          const cardId = `node_${prefix}_post_card`;
          const titleId = `node_${prefix}_post_title`;
          const excerptId = `node_${prefix}_post_excerpt`;

          nodes[cardId] = {
            id: cardId,
            name: 'Post Item Template Card',
            kind: 'frame',
            parentId: nodeId,
            children: [titleId, excerptId],
            layout: { mode: 'flex', direction: 'vertical', gap: 8, padding: { top: 16, right: 16, bottom: 16, left: 16 } },
            geometry: { width: 'full', height: 'auto' },
            style: {
              fills: [{ type: 'solid', color: 'rgba(255, 255, 255, 0.04)' }],
              borderRadius: 12,
            },
          };

          nodes[titleId] = {
            id: titleId,
            name: 'Post Title Bound',
            kind: 'text',
            parentId: cardId,
            children: [],
            layout: { mode: 'flow' },
            geometry: { width: 'full', height: 'auto' },
            style: {},
            typography: {
              fontFamily: tokens.typography.heading?.fontFamily || 'Cinzel',
              fontSize: 20,
              fontWeight: 600,
              lineHeight: 1.3,
              color: '#FFFFFF',
            },
            dataBinding: { model: 'post', field: 'title' },
            content: { text: 'Bound: {{ post.title }}' },
          };

          nodes[excerptId] = {
            id: excerptId,
            name: 'Post Excerpt Bound',
            kind: 'text',
            parentId: cardId,
            children: [],
            layout: { mode: 'flow' },
            geometry: { width: 'full', height: 'auto' },
            style: {},
            typography: {
              fontFamily: tokens.typography.body?.fontFamily || 'Inter',
              fontSize: 14,
              fontWeight: 400,
              lineHeight: 1.5,
              color: 'rgba(255, 255, 255, 0.6)',
            },
            dataBinding: { model: 'post', field: 'excerpt' },
            content: { text: 'Bound: {{ post.excerpt }}' },
          };

          node.children.push(cardId);
        }

        return nodeId;
      }

      case 'core/post-title': {
        const level = block.attrs.level || 2;
        const node: ImportedNode = {
          id: nodeId,
          name: 'Post Title Bound',
          kind: 'text',
          parentId,
          children: [],
          layout: { mode: 'flow' },
          geometry: { width: 'full', height: 'auto' },
          style: {},
          typography: {
            fontFamily: tokens.typography.heading?.fontFamily || 'Cinzel',
            fontSize: level === 1 ? 32 : 22,
            fontWeight: 600,
            lineHeight: 1.3,
            color: '#FFFFFF',
          },
          dataBinding: {
            model: 'post',
            field: 'title',
          },
          content: {
            text: 'Bound: {{ post.title }}',
          },
        };
        nodes[nodeId] = node;
        return nodeId;
      }

      case 'core/post-featured-image': {
        const node: ImportedNode = {
          id: nodeId,
          name: 'Post Featured Image Bound',
          kind: 'image',
          parentId,
          children: [],
          layout: { mode: 'flow' },
          geometry: { width: 'full', height: 220 },
          style: {
            fills: [{ type: 'solid', color: '#1E293B' }],
            borderRadius: 8,
          },
          dataBinding: {
            model: 'post',
            field: 'featured_image',
          },
        };
        nodes[nodeId] = node;
        return nodeId;
      }

      case 'core/post-excerpt': {
        const node: ImportedNode = {
          id: nodeId,
          name: 'Post Excerpt Bound',
          kind: 'text',
          parentId,
          children: [],
          layout: { mode: 'flow' },
          geometry: { width: 'full', height: 'auto' },
          style: {},
          typography: {
            fontFamily: tokens.typography.body?.fontFamily || 'Inter',
            fontSize: 14,
            fontWeight: 400,
            lineHeight: 1.5,
            color: 'rgba(255, 255, 255, 0.7)',
          },
          dataBinding: {
            model: 'post',
            field: 'excerpt',
          },
          content: {
            text: 'Bound: {{ post.excerpt }}',
          },
        };
        nodes[nodeId] = node;
        return nodeId;
      }

      case 'core/html':
      default: {
        // Disarm and wrap unrecognized or custom HTML blocks into sandbox boundary
        const boundaryId = `wp_custom_${nodeId}`;
        customCodeBoundaries.push({
          id: boundaryId,
          title: `WordPress Block: ${block.blockName}`,
          reason: 'unparseable_web_component',
          rawSnippet: block.innerHTML || JSON.stringify(block.attrs),
          isolatedSandbox: true,
        });

        const node: ImportedNode = {
          id: nodeId,
          name: `Custom Block Sandbox (${block.blockName})`,
          kind: 'custom_embed',
          parentId,
          children: [],
          layout: { mode: 'flow' },
          geometry: { width: 'full', height: 'auto' },
          style: {},
          content: {
            htmlSnippet: block.innerHTML,
          },
        };
        nodes[nodeId] = node;
        return nodeId;
      }
    }
  }

  private resolveColor(slugOrColor: string | undefined, inlineColor: string | undefined, tokens: ImportedDesignTokens, fallback: string): string {
    if (inlineColor) return inlineColor;
    if (!slugOrColor) return fallback;
    if (slugOrColor.startsWith('#') || slugOrColor.startsWith('rgb')) return slugOrColor;
    if (tokens.colors[slugOrColor]) return tokens.colors[slugOrColor]!.value;
    return fallback;
  }

  private stripHtmlTags(html?: string): string {
    if (!html) return '';
    return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
  }

  private extractLinkHref(html?: string): string | null {
    if (!html) return null;
    const match = /href=["']([^"']+)["']/.exec(html);
    return match ? match[1]! : null;
  }

  private extractImageSrc(html?: string): string | null {
    if (!html) return null;
    const match = /src=["']([^"']+)["']/.exec(html);
    return match ? match[1]! : null;
  }

  private extractImageAlt(html?: string): string | null {
    if (!html) return null;
    const match = /alt=["']([^"']+)["']/.exec(html);
    return match ? match[1]! : null;
  }
}
