/**
 * OrbitoX Universal Importer — Shopify OS 2.0 Theme Adapter
 * Package: @orbitox-io/importer-core
 * 
 * Supports:
 * - Shopify Online Store 2.0 Theme Templates (templates/index.json, product.json, etc.)
 * - Theme Configuration & Design Tokens (config/settings_data.json)
 * - Section & Block hierarchy with block_order
 * - Liquid schema extraction ({% schema %} ... {% endschema %})
 * - Dynamic commerce CMS data bindings ({{ product.title }}, {{ product.price }}, {{ collection.products }})
 * - Repeater nodes for collection/product grids
 * - Custom code boundary wrapping for isolated Liquid runtime blocks
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

export interface ShopifySectionDefinition {
  type: string;
  name?: string;
  settings?: Record<string, any>;
  blocks?: Record<string, { type: string; settings?: Record<string, any> }>;
  block_order?: string[];
  custom_css?: string[];
}

export interface ShopifyTemplateJson {
  name?: string;
  layout?: string;
  wrapper?: string;
  sections: Record<string, ShopifySectionDefinition>;
  order: string[];
}

export interface ShopifySettingsData {
  current?: Record<string, any>;
  presets?: Record<string, Record<string, any>>;
}

export class ShopifyAdapter implements SourceAdapter<string | object> {
  public readonly id = 'shopify';
  public readonly name = 'Shopify OS 2.0 Theme Adapter';
  public readonly version = '1.0.0';
  public readonly supportedSourceFormats = ['shopify' as const];
  public readonly supportedExtensions = ['.json', '.liquid', '.zip'];
  public readonly supportedMimeTypes = ['application/json', 'application/zip', 'text/x-liquid'];

  public canHandle(input: string | object): boolean {
    if (!input) return false;

    if (typeof input === 'object') {
      return this.isShopifyObject(input);
    }

    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (trimmed.includes('{% schema %}') && trimmed.includes('{% endschema %}')) {
        return true;
      }
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          return this.isShopifyObject(parsed);
        } catch {
          return false;
        }
      }
    }

    return false;
  }

  private isShopifyObject(obj: any): boolean {
    if (!obj || typeof obj !== 'object') return false;

    // Multi-file theme bundle
    if (obj['templates/index.json'] || obj['config/settings_data.json']) {
      return true;
    }

    // Single Shopify OS 2.0 template JSON
    if (obj.sections && Array.isArray(obj.order)) {
      return true;
    }

    // settings_data.json directly
    if (obj.current && (obj.current.colors_accent_1 || obj.current.colors_background_1 || obj.current.type_header_font)) {
      return true;
    }

    return false;
  }

  public async parse(source: string | object, options: Partial<SourceAdapterOptions> = {}): Promise<AdapterParseResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];
    const customCodeBoundaries: ImportedCustomCodeBoundary[] = [];

    try {
      let rawData: any = typeof source === 'string' ? source.trim() : source;

      // If it's raw liquid file with schema
      if (typeof rawData === 'string' && rawData.includes('{% schema %}')) {
        rawData = this.convertLiquidToTemplateJson(rawData, warnings, customCodeBoundaries);
      } else if (typeof rawData === 'string') {
        rawData = JSON.parse(rawData);
      }

      // Check for theme bundle vs standalone template
      let templateJson: ShopifyTemplateJson;
      let settingsData: ShopifySettingsData | undefined;

      if (rawData['templates/index.json']) {
        templateJson = typeof rawData['templates/index.json'] === 'string'
          ? JSON.parse(rawData['templates/index.json'])
          : rawData['templates/index.json'];

        if (rawData['config/settings_data.json']) {
          settingsData = typeof rawData['config/settings_data.json'] === 'string'
            ? JSON.parse(rawData['config/settings_data.json'])
            : rawData['config/settings_data.json'];
        }
      } else if (rawData.sections && Array.isArray(rawData.order)) {
        templateJson = rawData;
      } else if (rawData.current) {
        // Just settings_data.json passed
        settingsData = rawData;
        templateJson = {
          name: 'Shopify Global Theme Settings',
          sections: {
            theme_preview: {
              type: 'image-banner',
              settings: {
                heading: 'Shopify Storefront Preview',
                subheading: 'Generated from theme settings_data.json',
              },
            },
          },
          order: ['theme_preview'],
        };
      } else {
        return {
          success: false,
          projectIR: undefined as any,
          errors: ['Invalid Shopify OS 2.0 payload. Expected template JSON or theme package.'],
          warnings,
          executionTimeMs: Date.now() - startTime,
        };
      }

      // Extract Design Tokens from settings_data.json
      const designTokens = this.extractTokensFromSettings(settingsData);

      // Parse Sections and Blocks
      const sections: ImportedSection[] = [];
      const sectionKeys = templateJson.order || Object.keys(templateJson.sections);

      for (let i = 0; i < sectionKeys.length; i++) {
        const sectionKey = sectionKeys[i]!;
        const sectionDef = templateJson.sections[sectionKey];
        if (!sectionDef) continue;

        const importedSection = this.convertSection(
          sectionKey,
          sectionDef,
          i,
          designTokens,
          warnings,
          customCodeBoundaries
        );
        sections.push(importedSection);
      }

      const pageTitle = templateJson.name || 'Shopify OS 2.0 Home';
      const page: ImportedPage = {
        id: 'page_shopify_home',
        name: pageTitle,
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
          fallbackApplied: 'Standard Shopify OS 2.0 component mapping fallback',
        })),
        warnings,
      };

      const projectIR: ImportedProject = {
        irVersion: '1.0',
        sourceFormat: 'shopify',
        sourceOrigin: {
          importedAt: new Date().toISOString(),
        },
        metadata: {
          title: pageTitle,
          description: 'Imported from Shopify OS 2.0 Theme via OrbitoX Universal Importer',
          originalToolVersion: 'Shopify OS 2.0 (Dawn Architecture)',
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
        customCodeBoundaries: customCodeBoundaries.length > 0 ? customCodeBoundaries : undefined,
      };

      return {
        success: true,
        projectIR,
        warnings,
        errors,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (err: any) {
      errors.push(`Shopify parse exception: ${err?.message || 'Invalid format'}`);
      return {
        success: false,
        projectIR: undefined as any,
        errors,
        warnings,
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  private convertLiquidToTemplateJson(
    liquidCode: string,
    warnings: string[],
    boundaries: ImportedCustomCodeBoundary[]
  ): ShopifyTemplateJson {
    const schemaMatch = liquidCode.match(/{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/);
    let sectionType = 'liquid-section';
    let sectionSettings: Record<string, any> = {};

    if (schemaMatch && schemaMatch[1]) {
      try {
        const schemaJson = JSON.parse(schemaMatch[1].trim());
        sectionType = schemaJson.name ? schemaJson.name.toLowerCase().replace(/\s+/g, '-') : 'custom-liquid';

        if (Array.isArray(schemaJson.settings)) {
          for (const setting of schemaJson.settings) {
            if (setting.id && setting.default !== undefined) {
              sectionSettings[setting.id] = setting.default;
            }
          }
        }
      } catch (e: any) {
        warnings.push(`Could not parse Liquid schema JSON: ${e.message}`);
      }
    }

    // Preserve non-schema liquid code in custom code boundary
    const strippedLiquid = liquidCode.replace(/{%\s*schema\s*%}[\s\S]*?{%\s*endschema\s*%}/g, '').trim();
    if (strippedLiquid.length > 0) {
      boundaries.push({
        id: `boundary_liquid_${Date.now()}`,
        title: 'Liquid Logic Block',
        rawSnippet: strippedLiquid,
        isolatedSandbox: true,
        reason: 'unsupported_liquid_filter',
      });
    }

    return {
      name: 'Imported Liquid Section',
      sections: {
        custom_section: {
          type: sectionType,
          settings: sectionSettings,
        },
      },
      order: ['custom_section'],
    };
  }

  private extractTokensFromSettings(settingsData?: ShopifySettingsData): ImportedDesignTokens {
    const tokens: ImportedDesignTokens = {
      colors: {},
      typography: {},
      spacing: {},
      shadows: {},
      radii: {},
    };

    const current = settingsData?.current || {};

    // Standard Shopify Dawn color keys
    const colorMap: Record<string, string> = {
      colors_background_1: 'bg_primary',
      colors_background_2: 'bg_secondary',
      colors_text: 'text_primary',
      colors_accent_1: 'accent_gold',
      colors_accent_2: 'accent_purple',
      colors_solid_button_labels: 'button_text',
    };

    for (const [shopifyKey, role] of Object.entries(colorMap)) {
      if (current[shopifyKey]) {
        tokens.colors[role] = {
          value: current[shopifyKey],
          inferredRole: role.startsWith('bg') ? 'background' : role.startsWith('text') ? 'text' : 'accent',
        };
      }
    }

    // Fallbacks if empty
    if (Object.keys(tokens.colors).length === 0) {
      tokens.colors['bg_primary'] = { value: '#060B1A', inferredRole: 'background' };
      tokens.colors['text_primary'] = { value: '#FFFFFF', inferredRole: 'text' };
      tokens.colors['accent_gold'] = { value: '#DFBA6B', inferredRole: 'accent' };
    }

    // Typography
    const headerFont = current.type_header_font || 'Playfair Display';
    const bodyFont = current.type_body_font || 'Inter';

    tokens.typography['font_header'] = {
      fontFamily: headerFont,
      fallback: 'serif',
      weights: [600, 700],
      googleFontUrl: `https://fonts.googleapis.com/css2?family=${encodeURIComponent(headerFont)}:wght@600;700&display=swap`,
    };

    tokens.typography['font_body'] = {
      fontFamily: bodyFont,
      fallback: 'sans-serif',
      weights: [400, 500],
      googleFontUrl: `https://fonts.googleapis.com/css2?family=${encodeURIComponent(bodyFont)}:wght@400;500&display=swap`,
    };

    return tokens;
  }

  private convertSection(
    sectionKey: string,
    sectionDef: ShopifySectionDefinition,
    index: number,
    designTokens: ImportedDesignTokens,
    warnings: string[],
    boundaries: ImportedCustomCodeBoundary[]
  ): ImportedSection {
    const sectionId = `sec_shopify_${sectionKey}_${index + 1}`;
    const rootNodeId = `node_root_${sectionKey}`;

    const typeLower = (sectionDef.type || '').toLowerCase();
    const archetype = this.inferArchetype(typeLower);

    const section: ImportedSection = {
      id: sectionId,
      name: this.formatTitle(sectionDef.type || sectionKey),
      archetype,
      geometry: {
        height: 'auto',
        maxWidth: 1440,
      },
      style: {
        backgroundColor: designTokens.colors['bg_primary']?.value || '#060B1A',
      },
      rootNodeId,
      nodes: {},
      renderOrder: [],
    };

    // Root Stack Container
    const rootStack: ImportedNode = {
      id: rootNodeId,
      sourceNodeId: sectionKey,
      name: `${section.name} Container`,
      kind: 'stack',
      parentId: null,
      children: [],
      layout: {
        mode: 'flex',
        direction: 'vertical',
        wrap: false,
        gap: 24,
        padding: { top: 48, right: 32, bottom: 48, left: 32 },
        justifyContent: 'start',
        alignItems: 'center',
      },
      geometry: {
        width: 100,
        height: 'auto',
        rotation: 0,
        opacity: 1,
      },
      style: {
        fills: [{ type: 'solid', color: designTokens.colors['bg_primary']?.value || '#060B1A' }],
      },
      content: {},
    };

    section.nodes[rootNodeId] = rootStack;

    // Process blocks if present
    const blocks = sectionDef.blocks || {};
    const blockOrder = sectionDef.block_order || Object.keys(blocks);

    if (blockOrder.length > 0) {
      for (const blockId of blockOrder) {
        const block = blocks[blockId];
        if (!block) continue;

        this.convertBlock(
          blockId,
          block,
          rootNodeId,
          section,
          designTokens,
          warnings,
          boundaries
        );
      }
    } else {
      // If no blocks, synthesize nodes from section settings
      this.synthesizeNodesFromSettings(
        sectionDef.settings || {},
        sectionDef.type,
        rootNodeId,
        section,
        designTokens,
        boundaries
      );
    }

    section.renderOrder = Object.keys(section.nodes);
    return section;
  }

  private convertBlock(
    blockId: string,
    block: { type: string; settings?: Record<string, any> },
    parentId: string,
    section: ImportedSection,
    designTokens: ImportedDesignTokens,
    warnings: string[],
    boundaries: ImportedCustomCodeBoundary[]
  ) {
    const s = block.settings || {};
    const nodeId = `node_block_${blockId}`;
    const blockType = (block.type || '').toLowerCase();

    if (blockType.includes('heading') || blockType.includes('title')) {
      const headingText = s.heading || s.title || s.text || 'Shopify Section Heading';
      const node: ImportedNode = {
        id: nodeId,
        sourceNodeId: blockId,
        name: 'Heading Block',
        kind: 'heading',
        parentId,
        children: [],
        layout: { mode: 'flow' },
        geometry: { width: 100, height: 'auto', rotation: 0, opacity: 1 },
        style: {},
        typography: {
          fontFamily: designTokens.typography['font_header']?.fontFamily || 'Playfair Display',
          fontSize: 36,
          fontWeight: 700,
          lineHeight: 1.2,
          textAlign: 'center',
          color: designTokens.colors['text_primary']?.value || '#FFFFFF',
        },
        content: {
          text: this.stripLiquidTags(headingText),
        },
        dataBinding: this.extractBinding(headingText),
      };

      section.nodes[nodeId] = node;
      section.nodes[parentId]?.children.push(nodeId);
    } else if (blockType.includes('button')) {
      const buttonLabel = s.button_label || s.label || s.text || 'Shop Now';
      const buttonLink = s.button_link || s.link || '/collections/all';

      const node: ImportedNode = {
        id: nodeId,
        sourceNodeId: blockId,
        name: 'Action Button',
        kind: 'button',
        parentId,
        children: [],
        layout: { mode: 'flow' },
        geometry: { width: 'auto', height: 48, rotation: 0, opacity: 1 },
        style: {
          fills: [{ type: 'solid', color: designTokens.colors['accent_gold']?.value || '#DFBA6B' }],
          borderRadius: 12,
        },
        typography: {
          fontFamily: designTokens.typography['font_body']?.fontFamily || 'Inter',
          fontSize: 15,
          fontWeight: 600,
          lineHeight: 1,
          textAlign: 'center',
          color: '#060B1A',
        },
        content: {
          text: buttonLabel,
          buttonHref: buttonLink,
        },
      };

      section.nodes[nodeId] = node;
      section.nodes[parentId]?.children.push(nodeId);
    } else if (blockType.includes('product') || blockType.includes('collection')) {
      // Dynamic commerce product repeater node
      const node: ImportedNode = {
        id: nodeId,
        sourceNodeId: blockId,
        name: 'Commerce Product Grid',
        kind: 'repeater',
        parentId,
        children: [],
        layout: {
          mode: 'grid',
          gridColumns: 'repeat(3, 1fr)',
          gap: 24,
          padding: { top: 16, right: 0, bottom: 16, left: 0 },
        },
        geometry: { width: 100, height: 'auto', rotation: 0, opacity: 1 },
        style: {},
        content: {},
        dataBinding: {
          model: 'collection',
          field: s.collection || 'all_products',
        },
      };

      section.nodes[nodeId] = node;
      section.nodes[parentId]?.children.push(nodeId);
    } else {
      // Generic text or custom embed
      const textContent = s.text || s.subheading || s.caption || '';
      const node: ImportedNode = {
        id: nodeId,
        sourceNodeId: blockId,
        name: `${this.formatTitle(block.type)} Block`,
        kind: 'paragraph',
        parentId,
        children: [],
        layout: { mode: 'flow' },
        geometry: { width: 100, height: 'auto', rotation: 0, opacity: 1 },
        style: {},
        typography: {
          fontFamily: designTokens.typography['font_body']?.fontFamily || 'Inter',
          fontSize: 16,
          fontWeight: 400,
          lineHeight: 1.6,
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.75)',
        },
        content: {
          text: this.stripLiquidTags(textContent),
        },
        dataBinding: this.extractBinding(textContent),
      };

      section.nodes[nodeId] = node;
      section.nodes[parentId]?.children.push(nodeId);
    }
  }

  private synthesizeNodesFromSettings(
    settings: Record<string, any>,
    sectionType: string,
    parentId: string,
    section: ImportedSection,
    designTokens: ImportedDesignTokens,
    boundaries: ImportedCustomCodeBoundary[]
  ) {
    // 1. Heading
    const heading = settings.heading || settings.title;
    if (heading) {
      const headingId = `${parentId}_heading`;
      const node: ImportedNode = {
        id: headingId,
        name: 'Section Heading',
        kind: 'heading',
        parentId,
        children: [],
        layout: { mode: 'flow' },
        geometry: { width: 100, height: 'auto', rotation: 0, opacity: 1 },
        style: {},
        typography: {
          fontFamily: designTokens.typography['font_header']?.fontFamily || 'Playfair Display',
          fontSize: 38,
          fontWeight: 700,
          lineHeight: 1.2,
          textAlign: 'center',
          color: designTokens.colors['text_primary']?.value || '#FFFFFF',
        },
        content: { text: this.stripLiquidTags(heading) },
        dataBinding: this.extractBinding(heading),
      };
      section.nodes[headingId] = node;
      section.nodes[parentId]?.children.push(headingId);
    }

    // 2. Subheading / text
    const text = settings.text || settings.subheading || settings.description;
    if (text) {
      const textId = `${parentId}_text`;
      const node: ImportedNode = {
        id: textId,
        name: 'Section Description',
        kind: 'paragraph',
        parentId,
        children: [],
        layout: { mode: 'flow' },
        geometry: { width: 100, height: 'auto', rotation: 0, opacity: 1 },
        style: {},
        typography: {
          fontFamily: designTokens.typography['font_body']?.fontFamily || 'Inter',
          fontSize: 16,
          fontWeight: 400,
          lineHeight: 1.6,
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.75)',
        },
        content: { text: this.stripLiquidTags(text) },
        dataBinding: this.extractBinding(text),
      };
      section.nodes[textId] = node;
      section.nodes[parentId]?.children.push(textId);
    }

    // 3. Button
    const btnLabel = settings.button_label || settings.btn_label;
    if (btnLabel) {
      const btnId = `${parentId}_button`;
      const node: ImportedNode = {
        id: btnId,
        name: 'CTA Button',
        kind: 'button',
        parentId,
        children: [],
        layout: { mode: 'flow' },
        geometry: { width: 'auto', height: 48, rotation: 0, opacity: 1 },
        style: {
          fills: [{ type: 'solid', color: designTokens.colors['accent_gold']?.value || '#DFBA6B' }],
          borderRadius: 12,
        },
        typography: {
          fontFamily: designTokens.typography['font_body']?.fontFamily || 'Inter',
          fontSize: 15,
          fontWeight: 600,
          lineHeight: 1,
          textAlign: 'center',
          color: '#060B1A',
        },
        content: {
          text: btnLabel,
          buttonHref: settings.button_link || '/collections/all',
        },
      };
      section.nodes[btnId] = node;
      section.nodes[parentId]?.children.push(btnId);
    }

    // 4. If product collection section
    if (sectionType.includes('collection') || sectionType.includes('product')) {
      const repeaterId = `${parentId}_product_repeater`;
      const node: ImportedNode = {
        id: repeaterId,
        name: 'Featured Products Grid',
        kind: 'repeater',
        parentId,
        children: [],
        layout: {
          mode: 'grid',
          gridColumns: `repeat(${settings.products_per_row || 4}, 1fr)`,
          gap: 20,
        },
        geometry: { width: 100, height: 'auto', rotation: 0, opacity: 1 },
        style: {},
        content: {},
        dataBinding: {
          model: 'collection',
          field: settings.collection || 'featured',
        },
      };
      section.nodes[repeaterId] = node;
      section.nodes[parentId]?.children.push(repeaterId);
    }
  }

  private inferArchetype(type: string): ImportedSection['archetype'] {
    if (type.includes('banner') || type.includes('hero') || type.includes('slideshow')) return 'hero';
    if (type.includes('feature') || type.includes('collection') || type.includes('grid')) return 'features';
    if (type.includes('pricing') || type.includes('plan')) return 'pricing';
    if (type.includes('testimonial') || type.includes('review')) return 'testimonials';
    if (type.includes('header') || type.includes('nav')) return 'header';
    if (type.includes('footer')) return 'footer';
    if (type.includes('cta') || type.includes('newsletter')) return 'cta';
    return 'custom';
  }

  private extractBinding(val: string): { model: string; field: string } | undefined {
    if (!val || typeof val !== 'string') return undefined;
    const match = val.match(/{{\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*}}/);
    if (match && match[1] && match[2]) {
      return { model: match[1], field: match[2] };
    }
    return undefined;
  }

  private stripLiquidTags(text: string): string {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/{{\s*[^}]+?\s*}}/g, (match) => {
      // If it looks like {{ product.title }}, provide aesthetic fallback
      if (match.includes('title')) return 'Celebration Masterpiece';
      if (match.includes('price')) return '$149';
      return '';
    }).trim();
  }

  private formatTitle(str: string): string {
    return str
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
