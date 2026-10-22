/**
 * OrbitoX Universal Import Engine — Master Integration & Verification Suite
 * Verifying Phases P26.1 through P26.5 End-to-End
 */

import {
  HtmlAdapter,
  ReactAdapter,
  FigmaAdapter,
  XdAdapter,
  ShopifyAdapter,
  WordPressAdapter,
  UrlCrawlerAdapter,
  SystemClipboardBridge,
  TemplatePackager,
  SceneGraphCompiler,
  LayoutInferrer,
  TokenExtractor,
  SecuritySanitizer,
  TailwindDecompiler,
  AssetLocalizer,
  FontIngestionService,
  SvgOptimizer,
  ImportedProject,
} from '../index';

describe('🪐 OrbitoX Universal Importer: Master Verification Suite (P26.1 - P26.11)', () => {
  // =========================================================================
  // PHASE P26.1: CANONICAL IR, PIPELINE & SCENEGRAPH COMPILER
  // =========================================================================
  describe('Phase P26.1: Core Architecture & Compiler', () => {
    it('P26.1.1 - LayoutInferrer accurately infers flex stacks vs absolute coordinates', () => {
      const verticalBoxes = [
        { id: '1', x: 0, y: 0, width: 200, height: 40 },
        { id: '2', x: 0, y: 60, width: 200, height: 40 },
        { id: '3', x: 0, y: 120, width: 200, height: 40 },
      ];
      const verticalResult = LayoutInferrer.inferLayout(verticalBoxes);
      expect(verticalResult.mode).toBe('flex');
      expect(verticalResult.direction).toBe('vertical');

      const overlappingBoxes = [
        { id: '1', x: 0, y: 0, width: 100, height: 100 },
        { id: '2', x: 50, y: 50, width: 100, height: 100 },
      ];
      const overlapResult = LayoutInferrer.inferLayout(overlappingBoxes);
      expect(overlapResult.mode).toBe('absolute');
    });

    it('P26.1.2 - TokenExtractor compiles tokens into theme design system', () => {
      const rawTokens = {
        colors: {
          bg: { value: '#080B16', inferredRole: 'background' as const },
          accent: { value: '#DFBA6B', inferredRole: 'accent' as const },
        },
        typography: {
          display: { fontFamily: 'Cinzel Decorative', fallback: 'serif', weights: [700] },
          body: { fontFamily: 'Inter', fallback: 'sans-serif', weights: [400] },
        },
        spacing: { md: 16 },
        radii: { full: 9999 },
        shadows: {},
      };

      const compiled = TokenExtractor.compileDesignTokens(rawTokens);
      expect(compiled.colors.backgroundPrimary).toBe('#080B16');
      expect(compiled.colors.accentPrimary).toBe('#DFBA6B');
      expect(compiled.typography.fontDisplay).toBe('Cinzel Decorative');
      expect(compiled.typography.fontBody).toBe('Inter');
    });

    it('P26.1.3 - SecuritySanitizer neutralizes XSS, malicious script injections, and event handlers', () => {
      const maliciousHtml = `
        <div onclick="alert('pwned')">
          <script>document.location='http://evil.com'</script>
          <a href="javascript:stealTokens()">Click me</a>
          <img src="x" onerror="alert(1)" />
          <p>Clean text</p>
        </div>
      `;

      const sanitized = SecuritySanitizer.sanitizeHtml(maliciousHtml);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).toContain('Clean text');

      // SSRF validation
      expect(SecuritySanitizer.isSafeExternalUrl('http://169.254.169.254/latest/meta-data')).toBe(false);
      expect(SecuritySanitizer.isSafeExternalUrl('https://images.unsplash.com/photo-luxury')).toBe(true);
    });

    it('P26.1.4 - SceneGraphCompiler compiles canonical projectIR into valid SceneGraph schemas', () => {
      const projectIR: ImportedProject = {
        irVersion: '1.0',
        sourceFormat: 'html_css',
        sourceOrigin: { importedAt: new Date().toISOString() },
        metadata: { title: 'Test Project' },
        designTokens: {
          colors: { bg_1: { value: '#05070E', inferredRole: 'background' } },
          typography: { font_1: { fontFamily: 'Inter', fallback: 'sans-serif', weights: [400] } },
          spacing: {},
          shadows: {},
          radii: {},
        },
        pages: [
          {
            id: 'page_1',
            name: 'Home',
            route: '/',
            isHome: true,
            sections: [
              {
                id: 'sec_1',
                name: 'Hero Section',
                archetype: 'hero',
                geometry: { height: 'auto', maxWidth: 1440 },
                style: { backgroundColor: '#05070E' },
                rootNodeId: 'node_root',
                nodes: {
                  node_root: {
                    id: 'node_root',
                    name: 'Root Stack',
                    kind: 'stack',
                    parentId: null,
                    children: ['node_text'],
                    layout: { mode: 'flex', direction: 'vertical', gap: 16 },
                    geometry: { width: 100, height: 'auto', rotation: 0, opacity: 1 },
                    style: {},
                    content: {},
                  },
                  node_text: {
                    id: 'node_text',
                    name: 'Title Text',
                    kind: 'heading',
                    parentId: 'node_root',
                    children: [],
                    layout: { mode: 'flow' },
                    geometry: { width: 100, height: 'auto', rotation: 0, opacity: 1 },
                    style: {},
                    typography: { fontFamily: 'Inter', fontSize: 32, fontWeight: 700, lineHeight: 1.2, textAlign: 'center', color: '#FFFFFF' },
                    content: { text: 'Welcome to OrbitoX' },
                  },
                },
                renderOrder: ['node_root', 'node_text'],
              },
            ],
          },
        ],
        globalComponents: {},
        assets: {},
        sourceTrace: { nodeToSourceMap: {}, unsupportedProperties: {} },
        confidenceReport: {
          overallScore: 100,
          totalNodes: 2,
          highConfidenceCount: 2,
          mediumConfidenceCount: 0,
          lowConfidenceCount: 0,
          unsupportedFeatures: [],
          warnings: [],
        },
      };

      const result = SceneGraphCompiler.compile(projectIR);
      expect(result.schema).toBeDefined();
      expect(result.schema.scenes).toHaveLength(1);
      expect(result.schema.scenes[0]!.sceneGraph.rootNodeId).toBe('node_root');
      expect(result.schema.scenes[0]!.sceneGraph.nodes['node_text']?.textContent).toBe('Welcome to OrbitoX');
    });
  });

  // =========================================================================
  // PHASE P26.2: TAILWIND DECOMPILER, HTML & REACT ADAPTERS
  // =========================================================================
  describe('Phase P26.2: Tailwind & Code Ingestion Adapters', () => {
    it('P26.2.1 - TailwindDecompiler parses responsive and utility tokens into computed styles', () => {
      const decompiled = TailwindDecompiler.decompile(
        'flex flex-col items-center justify-between p-8 bg-slate-900 rounded-2xl shadow-xl'
      );

      expect(decompiled.layout.mode).toBe('flex');
      expect(decompiled.layout.direction).toBe('vertical');
      expect(decompiled.layout.alignItems).toBe('center');
      expect(decompiled.layout.justifyContent).toBe('space-between');
      expect(decompiled.layout.padding).toEqual({ top: 32, right: 32, bottom: 32, left: 32 });
      expect(decompiled.style.borderRadius).toBe(16);
      expect(decompiled.style.fills?.[0]?.color).toBe('#0f172a');
    });

    it('P26.2.2 - HtmlAdapter parses HTML5 snippets with Tailwind classes into editable SceneGraph nodes', async () => {
      const adapter = new HtmlAdapter();
      const htmlSnippet = `
        <section class="py-16 px-6 bg-black text-center flex flex-col gap-4">
          <h2 class="text-4xl font-bold text-amber-400">Golden Celebration</h2>
          <p class="text-neutral-400 text-base">Unmatched fidelity and luxury event portals.</p>
          <button class="px-6 py-3 bg-amber-500 rounded-xl text-black font-semibold">RSVP Now</button>
        </section>
      `;

      const result = await adapter.parse(htmlSnippet);
      expect(result.success).toBe(true);
      expect(result.projectIR.pages).toHaveLength(1);
      const section = result.projectIR.pages[0]!.sections[0]!;
      expect(section.archetype).toBeDefined();

      const nodes = Object.values(section.nodes);
      expect(nodes.some((n) => n.kind === 'heading' && n.content?.text === 'Golden Celebration')).toBe(true);
      expect(nodes.some((n) => n.kind === 'button' || n.content?.text === 'RSVP Now')).toBe(true);
    });

    it('P26.2.3 - ReactAdapter decompiles React functional component JSX into SceneGraph IR', async () => {
      const adapter = new ReactAdapter();
      const jsxSnippet = `
        export default function LuxuryHero() {
          return (
            <div className="flex flex-col items-center p-12 bg-zinc-950">
              <h1 className="text-5xl font-extrabold text-white">OrbitoX Gala</h1>
              <p className="mt-4 text-zinc-400">Exclusive wedding and celebration templates.</p>
            </div>
          );
        }
      `;

      expect(adapter.canHandle(jsxSnippet)).toBe(true);
      const result = await adapter.parse(jsxSnippet);
      expect(result.success).toBe(true);
      expect(result.projectIR.sourceFormat).toBe('react_jsx');
    });
  });

  // =========================================================================
  // PHASE P26.3: ASSET LOCALIZER, FONT INGESTION & SVG OPTIMIZER
  // =========================================================================
  describe('Phase P26.3: Asset, Font & SVG Pipeline', () => {
    it('P26.3.1 - AssetLocalizer discovers, dedupes, and maps external image assets', async () => {
      const mockProject: ImportedProject = {
        irVersion: '1.0',
        sourceFormat: 'html_css',
        sourceOrigin: { importedAt: new Date().toISOString() },
        metadata: { title: 'Asset Localization Test' },
        designTokens: { colors: {}, typography: {}, spacing: {}, shadows: {}, radii: {} },
        pages: [
          {
            id: 'page_1',
            name: 'Home',
            route: '/',
            isHome: true,
            sections: [
              {
                id: 'sec_1',
                name: 'Hero Section',
                geometry: { height: 'auto' },
                style: { backgroundImageUrl: 'https://cdn.example.com/assets/banner.jpg' },
                rootNodeId: 'node_root',
                nodes: {
                  node_root: {
                    id: 'node_root',
                    name: 'Root',
                    kind: 'frame',
                    parentId: null,
                    children: ['node_img_1', 'node_img_2'],
                    layout: { mode: 'flex' },
                    geometry: { width: 100, height: 'auto' },
                    style: {},
                  },
                  node_img_1: {
                    id: 'node_img_1',
                    name: 'Logo 1',
                    kind: 'image',
                    parentId: 'node_root',
                    children: [],
                    layout: { mode: 'flow' },
                    geometry: { width: 200, height: 100 },
                    style: {},
                    content: { imageRef: 'https://cdn.example.com/assets/logo.png' },
                  },
                  node_img_2: {
                    id: 'node_img_2',
                    name: 'Logo 2 (Duplicate)',
                    kind: 'image',
                    parentId: 'node_root',
                    children: [],
                    layout: { mode: 'flow' },
                    geometry: { width: 200, height: 100 },
                    style: {},
                    content: { imageRef: 'https://cdn.example.com/assets/logo.png' },
                  },
                },
                renderOrder: ['node_root', 'node_img_1', 'node_img_2'],
              },
            ],
          },
        ],
        globalComponents: {},
        assets: {},
        sourceTrace: { nodeToSourceMap: {}, unsupportedProperties: {} },
        confidenceReport: {
          overallScore: 100,
          totalNodes: 3,
          highConfidenceCount: 3,
          mediumConfidenceCount: 0,
          lowConfidenceCount: 0,
          unsupportedFeatures: [],
          warnings: [],
        },
      };

      const report = await AssetLocalizer.localizeProject(mockProject);
      expect(report.totalDiscovered).toBe(3);
      expect(report.localizedCount).toBe(2);
      expect(report.deduplicatedCount).toBe(1);
    });

    it('P26.3.2 - FontIngestionService normalizes Google fonts and generates standard CSS links', () => {
      const res = FontIngestionService.resolveFont('Playfair Display', [400, 700]);
      expect(res.resolved).toBe(true);
      expect(res.source).toBe('google_fonts');
      expect(res.family).toBe('Playfair Display');
      expect(res.googleFontUrl).toContain('family=Playfair+Display:wght@400;700');
    });

    it('P26.3.3 - SvgOptimizer sanitizes scripts and optimizes viewBox attributes', () => {
      const rawSvg = `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <script>evil()</script>
          <circle cx="50" cy="50" r="40" fill="#DFBA6B" />
        </svg>
      `;

      const optimized = SvgOptimizer.optimize(rawSvg);
      expect(optimized.sanitizedSvgString).not.toContain('<script>');
      expect(optimized.paths.length).toBeGreaterThanOrEqual(1);
      expect(optimized.primaryFill).toBe('#DFBA6B');
    });
  });

  // =========================================================================
  // PHASE P26.4: FIGMA INGESTION BRIDGE
  // =========================================================================
  describe('Phase P26.4: Figma Ingestion Bridge', () => {
    it('P26.4.1 - FigmaAdapter parses complex frames with auto-layout and typography', async () => {
      const adapter = new FigmaAdapter();
      const figmaAst = {
        id: '1:1',
        name: 'Figma Auto-Layout Card',
        type: 'FRAME',
        layoutMode: 'HORIZONTAL',
        itemSpacing: 12,
        paddingLeft: 24,
        paddingRight: 24,
        paddingTop: 16,
        paddingBottom: 16,
        primaryAxisAlignItems: 'CENTER',
        counterAxisAlignItems: 'CENTER',
        cornerRadius: 12,
        fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.15, a: 1 } }],
        strokes: [{ type: 'SOLID', color: { r: 0.87, g: 0.73, b: 0.42, a: 0.5 } }],
        strokeWeight: 1,
        children: [
          {
            id: '1:2',
            name: 'Card Title',
            type: 'TEXT',
            characters: 'Celestial Invitation',
            style: {
              fontFamily: 'Playfair Display',
              fontWeight: 700,
              fontSize: 28,
              fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 } }],
            },
          },
        ],
      };

      const result = await adapter.parse(JSON.stringify(figmaAst));
      expect(result.success).toBe(true);
      expect(result.projectIR.sourceFormat).toBe('figma');

      const section = result.projectIR.pages[0]!.sections[0]!;
      const rootNode = section.nodes[section.rootNodeId]!;
      expect(rootNode.layout.mode).toBe('flex');
      expect(rootNode.layout.direction).toBe('horizontal');
      expect(rootNode.layout.gap).toBe(12);

      // Verify SceneGraphCompiler compiles it cleanly
      const compiled = SceneGraphCompiler.compile(result.projectIR);
      expect(compiled.schema).toBeDefined();
    });
  });

  // =========================================================================
  // PHASE P26.5: ADOBE XD BRIDGE
  // =========================================================================
  describe('Phase P26.5: Adobe XD Bridge', () => {
    it('P26.5.1 - XdAdapter parses artboard with shapes, paths, text runs and infers flow layout', async () => {
      const adapter = new XdAdapter();
      const xdPayload = {
        version: '1.0.0',
        children: [
          {
            id: 'artboard-xd-1',
            type: 'artboard',
            name: 'XD Wedding Showcase',
            meta: { ux: { width: 1440, height: 900 } },
            style: { fill: { type: 'color', value: { r: 12, g: 14, b: 24 } } },
            artboard: {
              children: [
                {
                  id: 'xd-shape-pill',
                  type: 'shape',
                  name: 'Golden Pill',
                  shape: { type: 'rect', x: 40, y: 30, width: 120, height: 28, r: 14 },
                  style: {
                    fill: { type: 'color', value: { r: 223, g: 186, b: 107, a: 0.2 } },
                    stroke: { type: 'color', value: { r: 223, g: 186, b: 107 }, width: 1 },
                  },
                },
                {
                  id: 'xd-text-headline',
                  type: 'text',
                  name: 'Main Headline',
                  transform: { tx: 40, ty: 80 },
                  text: {
                    rawText: 'Honoring Half a Century',
                    paragraphs: [
                      {
                        lines: [
                          [
                            {
                              font: { family: 'Cinzel Decorative', style: 'Bold', size: 38 },
                              fill: { type: 'color', value: { r: 255, g: 255, b: 255 } },
                            },
                          ],
                        ],
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      };

      expect(adapter.canHandle(JSON.stringify(xdPayload))).toBe(true);
      const result = await adapter.parse(JSON.stringify(xdPayload));
      expect(result.success).toBe(true);
      expect(result.projectIR.sourceFormat).toBe('adobe_xd');

      const section = result.projectIR.pages[0]!.sections[0]!;
      expect(section.name).toBe('XD Wedding Showcase');

      // Verify node creation and token extraction
      const nodes = Object.values(section.nodes);
      expect(nodes.some((n) => n.name === 'Golden Pill' && n.style.borderRadius === 14)).toBe(true);
      expect(nodes.some((n) => n.kind === 'heading' && n.content?.text === 'Honoring Half a Century')).toBe(true);

      const compiled = SceneGraphCompiler.compile(result.projectIR);
      expect(compiled.schema.scenes[0]!.sceneGraph.rootNodeId).toBeDefined();
    });
  });

  // =========================================================================
  // PHASE P26.6: SHOPIFY OS 2.0 THEME ADAPTER
  // =========================================================================
  describe('Phase P26.6: Shopify OS 2.0 Theme Adapter', () => {
    it('P26.6.1 - Parses Shopify Dawn template JSON and compiles repeater grids', async () => {
      const adapter = new ShopifyAdapter();
      const shopifyTemplate = {
        name: 'Shopify Storefront Dawn',
        sections: {
          banner: {
            type: 'image-banner',
            settings: { heading: 'Summer Gala 2026' },
            blocks: {
              b1: { type: 'heading', settings: { heading: 'Summer Gala 2026' } },
            },
            block_order: ['b1'],
          },
          grid: {
            type: 'featured-collection',
            settings: { title: 'Signature Invitations', products_per_row: 3 },
          },
        },
        order: ['banner', 'grid'],
      };

      expect(adapter.canHandle(JSON.stringify(shopifyTemplate))).toBe(true);
      const result = await adapter.parse(JSON.stringify(shopifyTemplate));
      expect(result.success).toBe(true);
      expect(result.projectIR.sourceFormat).toBe('shopify');
      expect(result.projectIR.pages[0]!.sections).toHaveLength(2);

      const compiled = SceneGraphCompiler.compile(result.projectIR);
      expect(compiled.success).toBe(true);
      expect(compiled.schema.scenes).toHaveLength(2);
    });
  });

  // =========================================================================
  // PHASE P26.7: WORDPRESS FSE & BLOCK THEME ADAPTER
  // =========================================================================
  describe('Phase P26.7: WordPress FSE & Block Theme Adapter', () => {
    it('P26.7.1 - Tokenizes Gutenberg block comments and theme.json design tokens', async () => {
      const adapter = new WordPressAdapter();
      const wpPayload = {
        'theme.json': {
          version: 2,
          settings: {
            color: {
              palette: [
                { slug: 'primary', color: '#0F172A', name: 'Primary' },
                { slug: 'accent', color: '#DFBA6B', name: 'Gold' },
              ],
            },
          },
        },
        'templates/index.html': `
          <!-- wp:columns -->
          <div class="wp-block-columns">
            <!-- wp:column {"width":"50%"} -->
            <div class="wp-block-column">
              <!-- wp:heading {"level":1} -->
              <h1>WordPress Sovereign Theme</h1>
              <!-- /wp:heading -->
              <!-- wp:paragraph -->
              <p>Direct Gutenberg block tree to SceneGraph conversion.</p>
              <!-- /wp:paragraph -->
            </div>
            <!-- /wp:column -->
          </div>
          <!-- /wp:columns -->
        `,
      };

      expect(adapter.canHandle(wpPayload)).toBe(true);
      const result = await adapter.parse(wpPayload);
      expect(result.success).toBe(true);
      expect(result.projectIR.sourceFormat).toBe('wordpress');
      expect(result.projectIR.designTokens.colors.primary?.value).toBe('#0F172A');
      expect(result.projectIR.designTokens.colors.accent?.value).toBe('#DFBA6B');

      const compiled = SceneGraphCompiler.compile(result.projectIR);
      expect(compiled.success).toBe(true);
      expect(compiled.schema.scenes).toHaveLength(1);
      expect(compiled.schema.scenes[0]!.name).toBe('Multi-Column Grid');
    });
  });

  // =========================================================================
  // PHASE P26.8: LIVE WEBSITE URL INGESTION
  // =========================================================================
  describe('Phase P26.8: Live Website URL Ingestion', () => {
    it('P26.8.1 - Ingests live website HTML, extracts CSS tokens, segments sections, and compiles to SceneGraph', async () => {
      const adapter = new UrlCrawlerAdapter();
      const payload = {
        url: 'https://orbitox-showcase.io',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Orbitox Showcase | Universal Creative Studio</title>
            <meta name="description" content="Next-generation celebratory experiences.">
            <style>
              :root {
                --brand-gold: #DFBA6B;
                --brand-dark: #040711;
                --font-heading: 'Cinzel, serif';
              }
            </style>
          </head>
          <body>
            <header>
              <h1>Next-Gen Celebration Experiences</h1>
              <p>Experience zero-latency, graph-native authoring.</p>
              <a href="/explore">Explore Gallery</a>
            </header>
            <section class="features">
              <h2>Universal Creative Engine</h2>
              <p>Import anything, compose anywhere, render everywhere.</p>
            </section>
          </body>
          </html>
        `,
      };

      expect(adapter.canHandle(payload)).toBe(true);
      const result = await adapter.parse(payload);
      expect(result.success).toBe(true);
      expect(result.projectIR.sourceFormat).toBe('web_url');
      expect(result.projectIR.metadata.title).toBe('Orbitox Showcase | Universal Creative Studio');
      expect(result.projectIR.designTokens.colors.brand_gold?.value).toBe('#DFBA6B');

      const compiled = SceneGraphCompiler.compile(result.projectIR);
      expect(compiled.success).toBe(true);
      expect(compiled.schema.scenes.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // PHASE P26.9: PROFESSIONAL SYSTEM CLIPBOARD & PASTE SPECIAL
  // =========================================================================
  describe('Phase P26.9: Professional System Clipboard & Paste Special', () => {
    it('P26.9.1 - Serializes multi-MIME payloads and executes Paste to Replace with remapped IDs', () => {
      const sampleGraph = {
        nodes: {
          wrapper: { id: 'wrapper', parentId: null, children: ['hero_node', 'footer_node'] },
          hero_node: { id: 'hero_node', parentId: 'wrapper', children: [], geometry: { width: 1200, height: 400 } },
          footer_node: { id: 'footer_node', parentId: 'wrapper', children: [] },
        },
      };

      const clipboardNodes = {
        new_hero: {
          id: 'new_hero',
          name: 'Celebration Masterpiece Hero',
          kind: 'frame',
          parentId: null,
          children: ['new_title'],
          geometry: { position: 'flow', x: 0, y: 0, width: 800, height: 300 },
          style: { fills: [{ type: 'solid', color: '#040711' }] },
        },
        new_title: {
          id: 'new_title',
          name: 'Hero Title',
          kind: 'heading',
          parentId: 'new_hero',
          children: [],
          content: { text: 'Next-Generation Invitation Architecture' },
          typography: { fontFamily: 'Cinzel', fontSize: 36, color: '#DFBA6B' },
        },
      };

      // 1. Verify multi-MIME export
      const multiMime = SystemClipboardBridge.serializeToMultiMime(['new_hero'], clipboardNodes);
      expect(multiMime.orbitoxJson).toContain('Celebration Masterpiece Hero');
      expect(multiMime.html).toContain('Celebration Masterpiece Hero');
      expect(multiMime.svg).toContain('<svg');
      expect(multiMime.plainText).toContain('Next-Generation Invitation Architecture');

      // 2. Verify Paste to Replace
      const pasteRes = SystemClipboardBridge.pasteToReplace(
        sampleGraph,
        'hero_node',
        clipboardNodes,
        ['new_hero'],
        { preserveDimensions: true }
      );

      expect(pasteRes.replacedByRootId).toBeDefined();
      const freshHeroId = pasteRes.replacedByRootId!;
      expect(freshHeroId).not.toBe('new_hero'); // fresh ID
      expect(pasteRes.nodes['hero_node']).toBeUndefined(); // deleted
      expect(pasteRes.nodes['wrapper']!.children).toEqual([freshHeroId, 'footer_node']); // exact index
      expect(pasteRes.nodes[freshHeroId]!.geometry.width).toBe(1200); // dimension preserved

      // 3. Verify Copy as Code JSX generator
      const jsx = SystemClipboardBridge.copyAsJsx('new_hero', clipboardNodes);
      expect(jsx).toContain('export function CelebrationMasterpieceHero()');
      expect(jsx).toContain('Next-Generation Invitation Architecture');
    });
  });

  // =========================================================================
  // PHASE P26.11: TEMPLATE & MARKETPLACE PACKAGING (ED25519)
  // =========================================================================
  describe('Phase P26.11: Template & Marketplace Packaging (Ed25519)', () => {
    it('P26.11.1 - Packages, signs with Ed25519, verifies checksums, and audits license compliance', () => {
      const keys = TemplatePackager.generateSigningKeyPair('ed25519');

      const manifest = {
        id: 'tpl_royal_celebration_001',
        name: 'Royal Celebration Suite',
        version: '1.0.0',
        author: { name: 'OrbitoX Creative Studio', email: 'studio@orbitox.io' },
        license: 'Commercial',
        description: 'Elite Royal Celebration Experience Template.',
        category: 'gala' as const,
        targetPlatform: 'orbitox-celebrations' as const,
        designTokens: {
          colors: { gold: '#DFBA6B' },
          typography: {
            heading: { fontFamily: 'Cinzel', weights: [700], sizes: { xl: '32px' } },
            body: { fontFamily: 'Inter', weights: [400], sizes: { base: '14px' } },
          },
          spacing: { md: '16px' },
          shadows: { md: '0 4px 12px rgba(0,0,0,0.5)' },
          radii: { md: '8px' },
        },
        assets: [
          {
            id: 'ast_1',
            filename: 'gala.webp',
            mimeType: 'image/webp',
            sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            sizeBytes: 154000,
          },
        ],
        fonts: [
          { family: 'Cinzel', source: 'google' as const },
          { family: 'Inter', source: 'google' as const },
        ],
      };

      const scenes = [
        {
          id: 'sc_1',
          name: 'Main Invitation',
          sceneGraph: {
            rootNodeId: 'root',
            nodes: {
              root: { id: 'root', kind: 'frame', name: 'Artboard', children: [] },
            },
          },
        },
      ];

      // 1. Create and sign bundle
      const bundle = TemplatePackager.createPackage({
        manifest,
        scenes,
        privateKeyPem: keys.privateKey,
        publicKeyPem: keys.publicKey,
      });

      expect(bundle.signature.algorithm).toBe('ed25519');
      expect(bundle.checksum).toHaveLength(64);

      // 2. Verify signature & checksum
      const verifyResult = TemplatePackager.verifyPackage(bundle);
      expect(verifyResult.valid).toBe(true);

      // 3. Scan license compliance
      const audit = TemplatePackager.scanLicenseCompliance(bundle.manifest);
      expect(audit.compliant).toBe(true);
      expect(audit.riskLevel).toBe('low');
    });
  });
});
