import { XdAdapter } from '../adapters/XdAdapter';
import { SceneGraphCompiler } from '../compiler/SceneGraphCompiler';

describe('Phase P26.5: Adobe XD Bridge (XdAdapter)', () => {
  let adapter: XdAdapter;

  beforeEach(() => {
    adapter = new XdAdapter();
  });

  it('correctly identifies Adobe XD payloads via canHandle', () => {
    expect(
      adapter.canHandle(
        JSON.stringify({ mimetype: 'application/vnd.adobe.sparkler.project+dcx' })
      )
    ).toBe(true);

    expect(
      adapter.canHandle(
        JSON.stringify({
          manifest: { id: 'test' },
          graphicContent: { children: [] },
        })
      )
    ).toBe(true);

    expect(
      adapter.canHandle(
        JSON.stringify({
          type: 'artboard',
          name: 'Home Screen',
          children: [],
        })
      )
    ).toBe(true);

    expect(adapter.canHandle('<div>Not Adobe XD</div>')).toBe(false);
    expect(adapter.canHandle('invalid json string')).toBe(false);
  });

  it('parses Adobe XD Artboard with shapes, text runs, and vectors', async () => {
    const xdPayload = {
      version: '1.0.0',
      children: [
        {
          id: 'artboard-wedding',
          type: 'artboard',
          name: 'Gilded Invitation Screen',
          meta: {
            ux: { width: 1440, height: 900 },
          },
          style: {
            fill: {
              type: 'color',
              value: { r: 10, g: 10, b: 20 },
            },
          },
          artboard: {
            children: [
              {
                id: 'shape-badge',
                type: 'shape',
                name: 'VIP Badge',
                shape: {
                  type: 'rect',
                  x: 50,
                  y: 40,
                  width: 140,
                  height: 32,
                  r: [16, 16, 16, 16],
                },
                style: {
                  fill: {
                    type: 'color',
                    value: { r: 223, g: 186, b: 107, a: 0.2 },
                  },
                  stroke: {
                    type: 'color',
                    value: { r: 223, g: 186, b: 107 },
                    width: 1,
                  },
                },
              },
              {
                id: 'text-heading',
                type: 'text',
                name: 'Main Title',
                transform: { tx: 50, ty: 90 },
                text: {
                  rawText: 'The Royal Celestial Gala',
                  paragraphs: [
                    {
                      lines: [
                        [
                          {
                            from: 0,
                            to: 24,
                            font: {
                              family: 'Cinzel Decorative',
                              style: 'Bold',
                              size: 44,
                            },
                            fill: {
                              type: 'color',
                              value: { r: 255, g: 255, b: 255 },
                            },
                          },
                        ],
                      ],
                    },
                  ],
                },
              },
              {
                id: 'vector-emblem',
                type: 'shape',
                name: 'Emblem Crest',
                transform: { tx: 50, ty: 150 },
                shape: {
                  type: 'path',
                  path: 'M20,10 L30,40 L10,40 Z',
                  width: 40,
                  height: 40,
                },
                style: {
                  fill: {
                    type: 'color',
                    value: { r: 223, g: 186, b: 107 },
                  },
                },
              },
            ],
          },
        },
      ],
    };

    const result = await adapter.parse(JSON.stringify(xdPayload));

    expect(result.success).toBe(true);
    expect(result.projectIR.sourceFormat).toBe('adobe_xd');
    expect(result.projectIR.pages).toHaveLength(1);

    const section = result.projectIR.pages[0]!.sections[0]!;
    expect(section.name).toBe('Gilded Invitation Screen');
    expect(section.geometry.maxWidth).toBe(1440);

    // Verify nodes created
    const nodeValues = Object.values(section.nodes);
    expect(nodeValues.length).toBeGreaterThanOrEqual(4); // root + badge + text + vector

    const headingNode = nodeValues.find((n) => n.kind === 'heading');
    expect(headingNode).toBeDefined();
    expect(headingNode?.content.text).toBe('The Royal Celestial Gala');
    expect(headingNode?.typography?.fontFamily).toBe('Cinzel Decorative');
    expect(headingNode?.typography?.fontWeight).toBe(700);

    const vectorNode = nodeValues.find((n) => n.kind === 'vector_path');
    expect(vectorNode).toBeDefined();
    expect(vectorNode?.content?.vectorSvgPath).toBe('M20,10 L30,40 L10,40 Z');

    // Verify design tokens extracted
    expect(result.projectIR.designTokens.typography).toBeDefined();
    const cinzelToken = Object.values(result.projectIR.designTokens.typography).find(
      (t) => t.fontFamily === 'Cinzel Decorative'
    );
    expect(cinzelToken).toBeDefined();
    expect(cinzelToken?.weights).toContain(700);
  });

  it('converts XD group nodes into nested flex stacks', async () => {
    const xdGroupPayload = {
      type: 'artboard',
      name: 'Card Group Test',
      children: [
        {
          id: 'card-group',
          type: 'group',
          name: 'Feature Card',
          transform: { tx: 100, ty: 100 },
          children: [
            {
              id: 'card-bg',
              type: 'shape',
              name: 'Card Background',
              shape: { type: 'rect', width: 320, height: 200, r: 12 },
              style: {
                fill: { type: 'color', value: { r: 20, g: 24, b: 36 } },
              },
            },
            {
              id: 'card-title',
              type: 'text',
              name: 'Card Header',
              text: {
                rawText: 'End-to-End Encryption',
                paragraphs: [
                  {
                    lines: [
                      [
                        {
                          font: { family: 'Outfit', style: 'SemiBold', size: 20 },
                          fill: { type: 'color', value: { r: 240, g: 240, b: 245 } },
                        },
                      ],
                    ],
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const result = await adapter.parse(JSON.stringify(xdGroupPayload));
    expect(result.success).toBe(true);

    const section = result.projectIR.pages[0]!.sections[0]!;
    const stackNodes = Object.values(section.nodes).filter((n) => n.kind === 'stack');
    expect(stackNodes.length).toBeGreaterThanOrEqual(2); // rootStack + featureCard stack
  });

  it('compiles Adobe XD projectIR seamlessly with SceneGraphCompiler', async () => {
    const xdPayload = {
      type: 'artboard',
      name: 'Compiler Test Artboard',
      children: [
        {
          id: 'xd-text-1',
          type: 'text',
          name: 'Welcome Headline',
          text: {
            rawText: 'OrbitoX Creative Studio',
            paragraphs: [
              {
                lines: [
                  [
                    {
                      font: { family: 'Playfair Display', style: 'Bold', size: 36 },
                      fill: { type: 'color', value: { r: 223, g: 186, b: 107 } },
                    },
                  ],
                ],
              },
            ],
          },
        },
      ],
    };

    const parseResult = await adapter.parse(JSON.stringify(xdPayload));
    expect(parseResult.success).toBe(true);

    const compileResult = SceneGraphCompiler.compile(parseResult.projectIR);
    expect(compileResult.schema).toBeDefined();
    expect(compileResult.schema.scenes).toHaveLength(1);

    const scene = compileResult.schema.scenes[0]!;
    expect(scene.renderMode).toBe('graph');
    expect(Object.keys(scene.sceneGraph.nodes).length).toBeGreaterThanOrEqual(2);
  });

  it('returns graceful error for empty or invalid payload', async () => {
    const emptyResult = await adapter.parse(JSON.stringify({ someEmpty: true }));
    expect(emptyResult.success).toBe(false);
    expect(emptyResult.errors.length).toBeGreaterThan(0);
  });
});
