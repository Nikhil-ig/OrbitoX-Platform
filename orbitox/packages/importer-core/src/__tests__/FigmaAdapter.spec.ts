import { FigmaAdapter } from '../adapters/FigmaAdapter';
import { SceneGraphCompiler } from '../compiler/SceneGraphCompiler';

describe('Phase P26.4: Figma Ingestion Bridge', () => {
  const adapter = new FigmaAdapter();

  describe('canHandle heuristic', () => {
    it('recognizes Figma file and design URLs', () => {
      expect(adapter.canHandle('https://www.figma.com/design/AbCdEf123456/Mobile-Banking-App?node-id=0-1')).toBe(true);
      expect(adapter.canHandle('https://figma.com/file/XyZ98765/E-Commerce-Design-System')).toBe(true);
      expect(adapter.canHandle('https://notfigma.com/file/123')).toBe(false);
    });

    it('recognizes Figma Document AST JSON', () => {
      const ast = {
        document: {
          id: '0:0',
          name: 'Document',
          type: 'DOCUMENT',
          children: [],
        },
      };
      expect(adapter.canHandle(ast)).toBe(true);
      expect(adapter.canHandle(JSON.stringify(ast))).toBe(true);
    });

    it('recognizes standalone Figma Frame / Node objects', () => {
      const frameNode = {
        id: '1:2',
        name: 'Hero Frame',
        type: 'FRAME',
        children: [],
      };
      expect(adapter.canHandle(frameNode)).toBe(true);
      expect(adapter.canHandle(JSON.stringify(frameNode))).toBe(true);
    });

    it('rejects HTML or arbitrary JSON', () => {
      expect(adapter.canHandle('<div class="p-4">Hello</div>')).toBe(false);
      expect(adapter.canHandle({ foo: 'bar' })).toBe(false);
    });
  });

  describe('Auto-Layout & Geometry Mapping', () => {
    it('correctly maps horizontal auto-layout, spacing, padding, and alignment', async () => {
      const figmaFrame = {
        id: '10:20',
        name: 'Navigation Bar',
        type: 'FRAME',
        layoutMode: 'HORIZONTAL',
        layoutWrap: 'NO_WRAP',
        primaryAxisAlignItems: 'SPACE_BETWEEN',
        counterAxisAlignItems: 'CENTER',
        itemSpacing: 32,
        paddingTop: 16,
        paddingRight: 40,
        paddingBottom: 16,
        paddingLeft: 40,
        absoluteBoundingBox: { x: 0, y: 0, width: 1440, height: 72 },
        fills: [
          {
            type: 'SOLID',
            color: { r: 0.04, g: 0.05, b: 0.09, a: 1 },
          },
        ],
        children: [
          {
            id: '10:21',
            name: 'Logo',
            type: 'TEXT',
            characters: 'OrbitoX Platform',
            style: { fontFamily: 'Outfit', fontWeight: 700, fontSize: 22 },
            fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 } }],
          },
          {
            id: '10:22',
            name: 'CTA Button',
            type: 'FRAME',
            layoutMode: 'HORIZONTAL',
            itemSpacing: 8,
            paddingTop: 10,
            paddingRight: 20,
            paddingBottom: 10,
            paddingLeft: 20,
            cornerRadius: 8,
            fills: [{ type: 'SOLID', color: { r: 0.87, g: 0.73, b: 0.42, a: 1 } }],
            children: [
              {
                id: '10:23',
                name: 'Button Label',
                type: 'TEXT',
                characters: 'Get Started',
                style: { fontFamily: 'Inter', fontWeight: 600, fontSize: 14 },
                fills: [{ type: 'SOLID', color: { r: 0.04, g: 0.05, b: 0.09, a: 1 } }],
              },
            ],
          },
        ],
      };

      const result = await adapter.parse(figmaFrame);
      expect(result.success).toBe(true);

      const section = result.projectIR.pages[0]!.sections[0]!;
      const navNode = section.nodes['node_10_20']!;
      expect(navNode).toBeDefined();
      expect(navNode.layout.mode).toBe('flex');
      expect(navNode.layout.direction).toBe('horizontal');
      expect(navNode.layout.gap).toBe(32);
      expect(navNode.layout.padding?.top).toBe(16);
      expect(navNode.layout.padding?.right).toBe(40);
      expect(navNode.layout.justifyContent).toBe('space-between');
      expect(navNode.layout.alignItems).toBe('center');

      // Check Button Child
      const btnNode = section.nodes['node_10_22']!;
      expect(btnNode).toBeDefined();
      expect(btnNode.kind).toBe('button');
      expect(btnNode.style.borderRadius).toBe(8);
      expect(btnNode.style.fills?.[0]?.color).toBe('#deba6b');
    });

    it('maps vertical auto-layout and corner radii', async () => {
      const cardNode = {
        id: '20:1',
        name: 'Feature Card',
        type: 'FRAME',
        layoutMode: 'VERTICAL',
        primaryAxisAlignItems: 'MIN',
        counterAxisAlignItems: 'MIN',
        itemSpacing: 16,
        paddingTop: 32,
        paddingRight: 32,
        paddingBottom: 32,
        paddingLeft: 32,
        cornerRadius: 16,
        fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.15, a: 1 } }],
        children: [
          {
            id: '20:2',
            name: 'Title',
            type: 'TEXT',
            characters: 'Cryptographic Security',
            style: { fontFamily: 'Cinzel', fontWeight: 700, fontSize: 28 },
          },
        ],
      };

      const result = await adapter.parse(cardNode);
      expect(result.success).toBe(true);

      const section = result.projectIR.pages[0]!.sections[0]!;
      const card = section.nodes['node_20_1']!;
      expect(card.layout.mode).toBe('flex');
      expect(card.layout.direction).toBe('vertical');
      expect(card.layout.gap).toBe(16);
      expect(card.style.borderRadius).toBe(16);
    });
  });

  describe('Figma Vectors, Typography & Design Tokens', () => {
    it('extracts vector paths into vector_path nodes', async () => {
      const vectorNode = {
        id: '30:1',
        name: 'Star Icon',
        type: 'VECTOR',
        absoluteBoundingBox: { x: 0, y: 0, width: 24, height: 24 },
        vectorPaths: [
          {
            data: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
            windingRule: 'NONZERO',
          },
        ],
        fills: [{ type: 'SOLID', color: { r: 0.87, g: 0.73, b: 0.42, a: 1 } }],
      };

      const result = await adapter.parse(vectorNode);
      expect(result.success).toBe(true);

      const section = result.projectIR.pages[0]!.sections[0]!;
      const node = section.nodes['node_30_1']!;
      expect(node.kind).toBe('vector_path');
      expect(node.content?.vectorSvgPath).toContain('M12 2l3.09 6.26');
      expect(node.style.fills?.[0]?.color).toBe('#deba6b');
    });

    it('harvests typography tokens and auto-links Google Fonts', async () => {
      const textFrame = {
        id: '40:1',
        name: 'Typography Frame',
        type: 'FRAME',
        children: [
          {
            id: '40:2',
            name: 'Heading Text',
            type: 'TEXT',
            characters: 'Royal Wedding Celebration',
            style: { fontFamily: 'Playfair Display', fontWeight: 700, fontSize: 44 },
          },
        ],
      };

      const result = await adapter.parse(textFrame);
      expect(result.success).toBe(true);

      const tokens = result.projectIR.designTokens;
      expect(tokens).toBeDefined();

      const node = result.projectIR.pages[0]!.sections[0]!.nodes['node_40_2']!;
      expect(node.typography?.fontFamily).toBe('Playfair Display');
      expect(node.typography?.fontSize).toBe(44);
    });

    it('compiles parsed Figma project into valid SceneGraph target schema', async () => {
      const fullDoc = {
        name: 'Landing Page System',
        document: {
          id: '0:0',
          type: 'DOCUMENT',
          name: 'Document',
          children: [
            {
              id: '0:1',
              type: 'CANVAS',
              name: 'Desktop Pages',
              children: [
                {
                  id: '100:1',
                  type: 'FRAME',
                  name: 'Hero Section Frame',
                  layoutMode: 'VERTICAL',
                  itemSpacing: 24,
                  children: [
                    {
                      id: '100:2',
                      type: 'TEXT',
                      name: 'Hero Title',
                      characters: 'OrbitoX Sovereign Cloud',
                      style: { fontFamily: 'Inter', fontWeight: 800, fontSize: 52 },
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      const parseResult = await adapter.parse(fullDoc);
      expect(parseResult.success).toBe(true);

      const compileResult = SceneGraphCompiler.compile(parseResult.projectIR);
      expect(compileResult.success).toBe(true);
      expect(compileResult.schema.scenes.length).toBe(1);

      const scene = compileResult.schema.scenes[0]!;
      expect(scene.name).toBe('Hero Section Frame');
      expect(scene.sceneGraph.nodes['node_100_1']?.layoutMode).toBe('flex');
      expect(scene.sceneGraph.nodes['node_100_2']?.textContent).toBe('OrbitoX Sovereign Cloud');
    });
  });

  describe('Figma URL Bridge', () => {
    it('parses Figma URL and provides scaffolded bridge project', async () => {
      const url = 'https://www.figma.com/design/MySecretFileKey/Celestial-SaaS-Template?node-id=10-5';
      const result = await adapter.parse(url);

      expect(result.success).toBe(true);
      expect(result.projectIR.sourceFormat).toBe('figma');
      expect(result.projectIR.metadata.title).toBe('Celestial SaaS Template');
      expect(result.projectIR.pages.length).toBe(1);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
