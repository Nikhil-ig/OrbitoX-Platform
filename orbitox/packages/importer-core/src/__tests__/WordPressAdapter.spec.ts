import { WordPressAdapter } from '../adapters/WordPressAdapter';
import { SceneGraphCompiler } from '../compiler/SceneGraphCompiler';

describe('WordPressAdapter (Phase P26.7)', () => {
  let adapter: WordPressAdapter;

  beforeEach(() => {
    adapter = new WordPressAdapter();
  });

  it('correctly detects WordPress Gutenberg block HTML and theme bundles in canHandle()', () => {
    const gutenbergSnippet = `
      <!-- wp:columns {"align":"wide"} -->
      <div class="wp-block-columns alignwide">
        <!-- wp:column -->
        <div class="wp-block-column">
          <!-- wp:heading {"level":1} -->
          <h1>Welcome to OrbitoX</h1>
          <!-- /wp:heading -->
        </div>
        <!-- /wp:column -->
      </div>
      <!-- /wp:columns -->
    `;
    expect(adapter.canHandle(gutenbergSnippet)).toBe(true);

    const themeBundle = {
      'theme.json': {
        version: 2,
        settings: {
          color: {
            palette: [{ slug: 'primary', color: '#0F172A', name: 'Primary' }],
          },
        },
      },
      'templates/index.html': gutenbergSnippet,
    };
    expect(adapter.canHandle(themeBundle)).toBe(true);

    const themeJsonDirect = {
      version: 2,
      settings: {
        color: {
          palette: [{ slug: 'gold', color: '#DFBA6B' }],
        },
      },
    };
    expect(adapter.canHandle(themeJsonDirect)).toBe(true);

    expect(adapter.canHandle('<div>Just regular HTML</div>')).toBe(false);
    expect(adapter.canHandle('')).toBe(false);
  });

  it('parses nested Gutenberg columns, headings, paragraphs, and buttons with accurate styling', async () => {
    const gutenbergHtml = `
      <!-- wp:columns {"align":"wide","style":{"spacing":{"blockGap":"32px"}}} -->
      <div class="wp-block-columns alignwide">
        <!-- wp:column {"width":"66.66%"} -->
        <div class="wp-block-column" style="flex-basis:66.66%">
          <!-- wp:heading {"level":1,"style":{"typography":{"fontWeight":"700"}}} -->
          <h1 class="wp-block-heading">OrbitoX Gala Celebration</h1>
          <!-- /wp:heading -->
          <!-- wp:paragraph -->
          <p>Experience the next generation of celebration architecture.</p>
          <!-- /wp:paragraph -->
          <!-- wp:buttons -->
          <div class="wp-block-buttons">
            <!-- wp:button {"backgroundColor":"accent","style":{"border":{"radius":"12px"}}} -->
            <div class="wp-block-button">
              <a class="wp-block-button__link" href="/rsvp">Reserve Seat</a>
            </div>
            <!-- /wp:button -->
          </div>
          <!-- /wp:buttons -->
        </div>
        <!-- /wp:column -->
        <!-- wp:column {"width":"33.33%"} -->
        <div class="wp-block-column" style="flex-basis:33.33%">
          <!-- wp:image {"url":"https://images.unsplash.com/photo-test.jpg","alt":"Gala Preview"} -->
          <figure class="wp-block-image"><img src="https://images.unsplash.com/photo-test.jpg" alt="Gala Preview"/></figure>
          <!-- /wp:image -->
        </div>
        <!-- /wp:column -->
      </div>
      <!-- /wp:columns -->
    `;

    const result = await adapter.parse(gutenbergHtml);

    expect(result.success).toBe(true);
    expect(result.projectIR.sourceFormat).toBe('wordpress');
    expect(result.projectIR.pages).toHaveLength(1);

    const section = result.projectIR.pages[0]!.sections[0]!;
    expect(section).toBeDefined();

    const nodes = section.nodes;
    const nodeValues = Object.values(nodes);

    // Columns container
    const columnsNode = nodeValues.find((n) => n.name === 'Columns Layout Container');
    expect(columnsNode).toBeDefined();
    expect(columnsNode!.layout.mode).toBe('flex');
    expect(columnsNode!.layout.direction).toBe('horizontal');

    // Column widths
    const columnCells = nodeValues.filter((n) => n.name === 'Column Cell');
    expect(columnCells).toHaveLength(2);
    expect(columnCells[0]!.geometry.width).toBe('66.66%');
    expect(columnCells[1]!.geometry.width).toBe('33.33%');

    // Heading
    const headingNode = nodeValues.find((n) => n.name.includes('Heading (H1)'));
    expect(headingNode).toBeDefined();
    expect(headingNode!.kind).toBe('text');
    expect(headingNode!.content?.text).toBe('OrbitoX Gala Celebration');
    expect(headingNode!.typography?.fontSize).toBe(44);

    // Button
    const buttonNode = nodeValues.find((n) => n.kind === 'button');
    expect(buttonNode).toBeDefined();
    expect(buttonNode!.content?.text).toBe('Reserve Seat');
    expect(buttonNode!.content?.buttonHref).toBe('/rsvp');
    expect(buttonNode!.style.borderRadius).toBe(12);

    // Image
    const imageNode = nodeValues.find((n) => n.kind === 'image');
    expect(imageNode).toBeDefined();
    expect(imageNode!.content?.imageRef).toBe('https://images.unsplash.com/photo-test.jpg');
    expect(imageNode!.content?.altText).toBe('Gala Preview');
  });

  it('converts Gutenberg Query Loop blocks into native OrbitoX repeater nodes with dynamic bindings', async () => {
    const queryLoopHtml = `
      <!-- wp:query {"query":{"postType":"post","perPage":6}} -->
      <div class="wp-block-query">
        <!-- wp:post-template -->
        <!-- wp:post-title {"level":2} /-->
        <!-- wp:post-excerpt /-->
        <!-- wp:post-featured-image /-->
        <!-- /wp:post-template -->
      </div>
      <!-- /wp:query -->
    `;

    const result = await adapter.parse(queryLoopHtml);

    expect(result.success).toBe(true);
    const section = result.projectIR.pages[0]!.sections[0]!;
    const nodes = section.nodes;

    const repeaterNode = Object.values(nodes).find((n) => n.kind === 'repeater');
    expect(repeaterNode).toBeDefined();
    expect(repeaterNode!.layout.mode).toBe('grid');
    expect(repeaterNode!.layout.gridColumns).toBe('repeat(3, 1fr)');
    expect(repeaterNode!.dataBinding).toEqual({
      model: 'posts',
      field: 'items',
    });

    const boundTitle = Object.values(nodes).find((n) => n.dataBinding?.field === 'title');
    expect(boundTitle).toBeDefined();
    expect(boundTitle!.dataBinding?.model).toBe('post');

    const boundExcerpt = Object.values(nodes).find((n) => n.dataBinding?.field === 'excerpt');
    expect(boundExcerpt).toBeDefined();

    const boundImage = Object.values(nodes).find((n) => n.dataBinding?.field === 'featured_image');
    expect(boundImage).toBeDefined();
  });

  it('extracts theme.json palette and typography into standard OrbitoX design tokens', async () => {
    const payload = {
      'theme.json': {
        version: 2,
        settings: {
          color: {
            palette: [
              { slug: 'primary', color: '#0F172A', name: 'Primary Slate' },
              { slug: 'accent', color: '#DFBA6B', name: 'Gold Accent' },
              { slug: 'background', color: '#060B1A', name: 'Cosmic Black' },
            ],
          },
          typography: {
            fontFamilies: [
              { slug: 'heading', fontFamily: 'Cinzel, Georgia, serif', name: 'Cinzel Serif' },
              { slug: 'body', fontFamily: 'Inter, system-ui, sans-serif', name: 'Inter Body' },
            ],
          },
        },
      },
      'templates/index.html': `
        <!-- wp:cover {"dimRatio":60,"overlayColor":"background"} -->
        <div class="wp-block-cover">
          <!-- wp:heading {"level":1,"textColor":"accent"} -->
          <h1 class="wp-block-heading has-accent-color">Couture Celebrations</h1>
          <!-- /wp:heading -->
        </div>
        <!-- /wp:cover -->
      `,
    };

    const result = await adapter.parse(payload);

    expect(result.success).toBe(true);
    const tokens = result.projectIR.designTokens;

    expect(tokens.colors.primary?.value).toBe('#0F172A');
    expect(tokens.colors.accent?.value).toBe('#DFBA6B');
    expect(tokens.colors.background?.value).toBe('#060B1A');
    expect(tokens.typography.heading?.fontFamily).toBe('Cinzel');
    expect(tokens.typography.body?.fontFamily).toBe('Inter');

    const headingNode = Object.values(result.projectIR.pages[0]!.sections[0]!.nodes).find(
      (n) => n.kind === 'text' && n.content?.text === 'Couture Celebrations'
    );
    expect(headingNode).toBeDefined();
    expect(headingNode!.typography?.color).toBe('#DFBA6B');
  });

  it('quarantines arbitrary unparseable HTML into an isolated custom code sandbox boundary', async () => {
    const maliciousGutenberg = `
      <!-- wp:html -->
      <div class="custom-widget">
        <script>window.__evil = true;</script>
        <iframe src="https://untrusted-ad-network.com/banner"></iframe>
      </div>
      <!-- /wp:html -->
    `;

    const result = await adapter.parse(maliciousGutenberg);

    expect(result.success).toBe(true);
    expect(result.projectIR.customCodeBoundaries).toHaveLength(1);

    const boundary = result.projectIR.customCodeBoundaries![0]!;
    expect(boundary.isolatedSandbox).toBe(true);
    expect(boundary.reason).toBe('unparseable_web_component');
    expect(boundary.rawSnippet).toContain('<script>');

    const sandboxNode = Object.values(result.projectIR.pages[0]!.sections[0]!.nodes).find(
      (n) => n.kind === 'custom_embed'
    );
    expect(sandboxNode).toBeDefined();
  });

  it('compiles WordPress project IR cleanly through SceneGraphCompiler into TargetTemplateSchema', async () => {
    const gutenbergHtml = `
      <!-- wp:columns -->
      <div class="wp-block-columns">
        <!-- wp:column -->
        <div class="wp-block-column">
          <!-- wp:heading {"level":2} -->
          <h2>Full Fidelity Verification</h2>
          <!-- /wp:heading -->
        </div>
        <!-- /wp:column -->
      </div>
      <!-- /wp:columns -->
    `;

    const parseResult = await adapter.parse(gutenbergHtml);
    expect(parseResult.success).toBe(true);

    const compileResult = SceneGraphCompiler.compile(parseResult.projectIR);
    expect(compileResult.success).toBe(true);
    expect(compileResult.schema.scenes).toHaveLength(1);

    const scene = compileResult.schema.scenes[0]!;
    expect(scene.sceneGraph.nodes).toBeDefined();
    expect(Object.keys(scene.sceneGraph.nodes).length).toBeGreaterThan(1);
  });
});
