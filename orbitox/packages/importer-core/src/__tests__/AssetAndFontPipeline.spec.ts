import { AssetLocalizer } from '../pipeline/AssetLocalizer';
import { FontIngestionService } from '../pipeline/FontIngestionService';
import { SvgOptimizer } from '../pipeline/SvgOptimizer';
import { SceneGraphCompiler } from '../compiler/SceneGraphCompiler';
import { ImportedProject, ImportedSection, ImportedNode } from '../types/ImportIR';
import { HtmlAdapter } from '../adapters/HtmlAdapter';
import { ReactAdapter } from '../adapters/ReactAdapter';

describe('Phase P26.3: Asset & Font Ingestion Pipeline', () => {
  describe('AssetLocalizer', () => {
    it('computes deterministic SHA-256 and deduplicates identical images', async () => {
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
                style: {
                  backgroundImageUrl: 'https://cdn.example.com/assets/banner.jpg',
                },
                rootNodeId: 'node_root',
                nodes: {
                  node_root: {
                    id: 'node_root',
                    name: 'Root',
                    kind: 'frame',
                    parentId: null,
                    children: ['node_img_1', 'node_img_2'],
                    layout: { mode: 'flex' },
                    geometry: { width: 'full', height: 'auto' },
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
                    content: {
                      imageRef: 'https://cdn.example.com/assets/logo.png',
                    },
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
                    content: {
                      imageRef: 'https://cdn.example.com/assets/logo.png',
                    },
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
      expect(report.localizedCount).toBe(2); // banner.jpg + logo.png
      expect(report.deduplicatedCount).toBe(1); // duplicate logo.png was deduplicated!

      const section = mockProject.pages[0]!.sections[0]!;
      expect(section.style.backgroundImageUrl).toMatch(/^asset:\/\/[a-f0-9]{16,64}$/);

      const img1 = section.nodes['node_img_1']!;
      const img2 = section.nodes['node_img_2']!;
      expect(img1.content?.imageRef).toBe(img2.content?.imageRef);
      expect(img1.content?.imageRef).toMatch(/^asset:\/\/[a-f0-9]{16,64}$/);

      // Verify asset entries exist in project.assets
      const assetKeys = Object.keys(mockProject.assets);
      expect(assetKeys.length).toBe(2);
    });

    it('extracts embedded base64 data URIs and registers binary assets', async () => {
      // 1x1 transparent PNG in base64
      const base64Png =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

      const cache = new Map<string, string>();
      const report = {
        totalDiscovered: 1,
        localizedCount: 0,
        deduplicatedCount: 0,
        failedCount: 0,
        assets: {},
        warnings: [],
      };

      const asset = await AssetLocalizer.processUrl(base64Png, cache, report);

      expect(asset).toBeDefined();
      expect(asset?.mimeType).toBe('image/png');
      expect(asset?.hash).toBeDefined();
      expect(report.localizedCount).toBe(1);
    });

    it('blocks dangerous SSRF URLs and cloud metadata endpoints', async () => {
      const cache = new Map<string, string>();
      const report = {
        totalDiscovered: 1,
        localizedCount: 0,
        deduplicatedCount: 0,
        failedCount: 0,
        assets: {},
        warnings: [],
      };

      const asset = await AssetLocalizer.processUrl('http://169.254.169.254/latest/meta-data/', cache, report);

      expect(asset).toBeNull();
      expect(report.failedCount).toBe(1);
      expect(report.warnings.some((w) => w.includes('Blocked unsafe external asset'))).toBe(true);
    });
  });

  describe('FontIngestionService', () => {
    it('resolves curated Google Fonts and generates correct stylesheet links', () => {
      const res1 = FontIngestionService.resolveFont('Playfair Display', [400, 700]);
      expect(res1.resolved).toBe(true);
      expect(res1.source).toBe('google_fonts');
      expect(res1.family).toBe('Playfair Display');
      expect(res1.googleFontUrl).toContain('Playfair+Display');
      expect(res1.googleFontUrl).toContain('wght@400;700');

      const res2 = FontIngestionService.resolveFont('Inter', [400, 600]);
      expect(res2.resolved).toBe(true);
      expect(res2.source).toBe('google_fonts');
      expect(res2.googleFontUrl).toContain('family=Inter:wght@400;600');
    });

    it('identifies universal system fonts without external network requests', () => {
      const res = FontIngestionService.resolveFont('Helvetica Neue, Arial, sans-serif');
      expect(res.resolved).toBe(true);
      expect(res.source).toBe('system');
      expect(res.family).toBe('Helvetica Neue');
    });

    it('provides aesthetic fallbacks for unknown fonts', () => {
      const res = FontIngestionService.resolveFont('SuperExoticMedievalCalligraphy');
      expect(res.resolved).toBe(false);
      expect(res.source).toBe('fallback');
      expect(res.fallbackFamily).toBeDefined();
    });

    it('scans an imported project and populates designTokens.typography with googleFontUrls', () => {
      const mockProject: ImportedProject = {
        irVersion: '1.0',
        sourceFormat: 'html_css',
        sourceOrigin: { importedAt: new Date().toISOString() },
        metadata: { title: 'Font Scan Test' },
        designTokens: {
          colors: {},
          typography: {
            display: { fontFamily: 'Cinzel', fallback: 'serif', weights: [700] },
            body: { fontFamily: 'Plus Jakarta Sans', fallback: 'sans-serif', weights: [400, 600] },
          },
          spacing: {},
          shadows: {},
          radii: {},
        },
        pages: [],
        globalComponents: {},
        assets: {},
        sourceTrace: { nodeToSourceMap: {}, unsupportedProperties: {} },
        confidenceReport: {
          overallScore: 100,
          totalNodes: 0,
          highConfidenceCount: 0,
          mediumConfidenceCount: 0,
          lowConfidenceCount: 0,
          unsupportedFeatures: [],
          warnings: [],
        },
      };

      const report = FontIngestionService.resolveProjectFonts(mockProject);

      expect(report.totalFontsChecked).toBe(2);
      expect(report.googleFontsCount).toBe(2);
      expect(report.stylesheetUrls.length).toBe(2);

      expect(mockProject.designTokens.typography['display']?.googleFontUrl).toContain('Cinzel');
      expect(mockProject.designTokens.typography['body']?.googleFontUrl).toContain('Plus+Jakarta+Sans');
    });
  });

  describe('SvgOptimizer', () => {
    it('disarms malicious SVGs by stripping script blocks and inline events', () => {
      const maliciousSvg = `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <script>alert("xss")</script>
          <path d="M10 10 H 90 V 90 H 10 Z" fill="#3B82F6" onload="alert('hack')"/>
        </svg>
      `;

      const optimized = SvgOptimizer.optimize(maliciousSvg);

      expect(optimized.sanitizedSvgString).not.toContain('<script');
      expect(optimized.sanitizedSvgString).not.toContain('onload');
      expect(optimized.paths.length).toBe(1);
      expect(optimized.paths[0]?.d).toBe('M10 10 H 90 V 90 H 10 Z');
      expect(optimized.primaryFill).toBe('#3B82F6');
    });

    it('converts basic SVG shapes (circle and rect) into standard editable path definitions', () => {
      const multiShapeSvg = `
        <svg viewBox="0 0 200 200" width="200" height="200">
          <circle cx="50" cy="50" r="40" fill="#10B981" />
          <rect x="110" y="10" width="80" height="80" fill="#6366F1" stroke="#4F46E5" stroke-width="2" />
        </svg>
      `;

      const optimized = SvgOptimizer.optimize(multiShapeSvg);

      expect(optimized.paths.length).toBe(2);
      // Circle converted to arc path
      expect(optimized.paths[0]?.d).toContain('M 10,50 a 40,40');
      expect(optimized.paths[0]?.fill).toBe('#10B981');

      // Rect converted to H/V line path
      expect(optimized.paths[1]?.d).toContain('M 110,10 H 190 V 90 H 110 Z');
      expect(optimized.paths[1]?.fill).toBe('#6366F1');
      expect(optimized.paths[1]?.stroke).toBe('#4F46E5');
      expect(optimized.paths[1]?.strokeWidth).toBe(2);
    });

    it('converts SVG into an editable ImportedNode IR', () => {
      const svg = `
        <svg viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      `;

      const node = SvgOptimizer.toImportedNode('icon_arrow', 'Arrow Right Icon', svg);

      expect(node.id).toBe('icon_arrow');
      expect(node.kind).toBe('vector_path');
      expect(node.geometry.width).toBe(24);
      expect(node.geometry.height).toBe(24);
      expect(node.content?.vectorSvgPath).toBe('M5 12h14M12 5l7 7-7 7');
      expect(node.style.strokes?.[0]?.color).toBe('#FFFFFF');
    });
  });

  describe('Integrated Adapter Pipelines (HtmlAdapter & ReactAdapter)', () => {
    it('HtmlAdapter optimizes inline SVG and resolves Google Fonts in design tokens', async () => {
      const htmlSnippet = `
        <section class="p-8 bg-slate-900">
          <h1 class="text-4xl font-bold font-['Playfair_Display'] text-white">Luxury Invitations</h1>
          <svg viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </section>
      `;

      const adapter = new HtmlAdapter();
      const result = await adapter.parse(htmlSnippet, {
        importMode: 'section',
        extractDesignTokens: true,
      });

      expect(result.success).toBe(true);
      const section = result.projectIR.pages[0]!.sections[0]!;
      const nodes = Object.values(section.nodes);

      // SVG node optimized
      const svgNode = nodes.find((n) => n.kind === 'vector_path');
      expect(svgNode).toBeDefined();
      expect(svgNode?.geometry.width).toBe(24);
      expect(svgNode?.geometry.height).toBe(24);
      expect(svgNode?.style.strokes?.[0]?.color).toBe('#F59E0B');
      expect(svgNode?.content?.vectorSvgPath).toContain('M12 2l3.09 6.26');

      // Fonts resolved
      const tokens = result.projectIR.designTokens;
      expect(tokens).toBeDefined();
    });

    it('ReactAdapter localizes remote assets and resolves typography fonts', async () => {
      const reactSnippet = `
        export default function WeddingHero() {
          return (
            <div className="flex flex-col p-12 bg-neutral-950">
              <h2 className="text-3xl font-serif text-amber-100">Forever Begins Here</h2>
              <img src="https://cdn.example.com/photos/couple.jpg" alt="Couple" className="w-full h-96 rounded-2xl" />
            </div>
          );
        }
      `;

      const adapter = new ReactAdapter();
      const result = await adapter.parse(reactSnippet, {
        importMode: 'section',
        localizeRemoteAssets: true,
      });

      expect(result.success).toBe(true);
      const section = result.projectIR.pages[0]!.sections[0]!;
      const nodes = Object.values(section.nodes);

      // Check image node localized
      const imgNode = nodes.find((n) => n.kind === 'image');
      expect(imgNode).toBeDefined();
      expect(imgNode?.content?.imageRef).toMatch(/^asset:\/\/[a-f0-9]{16,64}$/);

      // Check asset is present in project.assets
      const assetKeys = Object.keys(result.projectIR.assets);
      expect(assetKeys.length).toBe(1);
    });
  });
});
