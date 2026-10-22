import { ShopifyAdapter } from '../adapters/ShopifyAdapter';
import { SceneGraphCompiler } from '../compiler/SceneGraphCompiler';

describe('Phase P26.6: Shopify OS 2.0 Theme Adapter (ShopifyAdapter)', () => {
  let adapter: ShopifyAdapter;

  beforeEach(() => {
    adapter = new ShopifyAdapter();
  });

  it('correctly identifies Shopify OS 2.0 templates, bundles, and Liquid schemas via canHandle', () => {
    // 1. Template JSON
    expect(
      adapter.canHandle(
        JSON.stringify({
          sections: { banner: { type: 'image-banner' } },
          order: ['banner'],
        })
      )
    ).toBe(true);

    // 2. Multi-file theme bundle
    expect(
      adapter.canHandle(
        JSON.stringify({
          'templates/index.json': { sections: {}, order: [] },
          'config/settings_data.json': { current: {} },
        })
      )
    ).toBe(true);

    // 3. Liquid section with {% schema %}
    expect(
      adapter.canHandle(`
        <section class="banner">
          <h1>{{ section.settings.heading }}</h1>
        </section>
        {% schema %}
        { "name": "Image Banner" }
        {% endschema %}
      `)
    ).toBe(true);

    expect(adapter.canHandle('<div>Not Shopify</div>')).toBe(false);
    expect(adapter.canHandle('random non-json string')).toBe(false);
  });

  it('parses Shopify OS 2.0 Dawn theme bundle with tokens and sections', async () => {
    const dawnBundle = {
      'templates/index.json': {
        name: 'Home page',
        sections: {
          banner: {
            type: 'image-banner',
            settings: {
              heading: 'Bespoke Celebration Couture',
              text: 'Luxury handcrafted attires and curated event gifts.',
              button_label: 'Explore Store',
              button_link: '/collections/all',
            },
            blocks: {
              heading_1: {
                type: 'heading',
                settings: { heading: 'Bespoke Celebration Couture' },
              },
              button_1: {
                type: 'button',
                settings: { button_label: 'Explore Store', button_link: '/collections/all' },
              },
            },
            block_order: ['heading_1', 'button_1'],
          },
          featured_products: {
            type: 'featured-collection',
            settings: {
              title: 'Curated Bridal Collections',
              collection: 'bridal_wear',
              products_per_row: 3,
            },
          },
        },
        order: ['banner', 'featured_products'],
      },
      'config/settings_data.json': {
        current: {
          colors_accent_1: '#DFBA6B',
          colors_background_1: '#060B1A',
          colors_text: '#FFFFFF',
          type_header_font: 'Cinzel Decorative',
          type_body_font: 'Outfit',
        },
      },
    };

    const result = await adapter.parse(JSON.stringify(dawnBundle));

    expect(result.success).toBe(true);
    expect(result.projectIR.sourceFormat).toBe('shopify');
    expect(result.projectIR.pages).toHaveLength(1);

    const page = result.projectIR.pages[0]!;
    expect(page.sections).toHaveLength(2);

    // Section 1: Hero Banner
    const heroSection = page.sections[0]!;
    expect(heroSection.archetype).toBe('hero');
    const heroNodes = Object.values(heroSection.nodes);
    expect(heroNodes.some((n) => n.kind === 'heading' && n.content?.text === 'Bespoke Celebration Couture')).toBe(true);
    expect(heroNodes.some((n) => n.kind === 'button' && n.content?.text === 'Explore Store')).toBe(true);

    // Section 2: Featured Collection Repeater
    const collectionSection = page.sections[1]!;
    expect(collectionSection.archetype).toBe('features');
    const collectionNodes = Object.values(collectionSection.nodes);
    const repeaterNode = collectionNodes.find((n) => n.kind === 'repeater');
    expect(repeaterNode).toBeDefined();
    expect(repeaterNode?.dataBinding?.model).toBe('collection');

    // Design Tokens extracted
    const tokens = result.projectIR.designTokens;
    expect(tokens.colors['accent_gold']?.value).toBe('#DFBA6B');
    expect(tokens.colors['bg_primary']?.value).toBe('#060B1A');
    expect(tokens.typography['font_header']?.fontFamily).toBe('Cinzel Decorative');
    expect(tokens.typography['font_body']?.fontFamily).toBe('Outfit');
  });

  it('binds commerce variables like {{ product.title }} into dataBinding schema', async () => {
    const productTemplate = {
      sections: {
        main_product: {
          type: 'main-product',
          blocks: {
            title: {
              type: 'title',
              settings: {
                heading: '{{ product.title }}',
              },
            },
          },
          block_order: ['title'],
        },
      },
      order: ['main_product'],
    };

    const result = await adapter.parse(JSON.stringify(productTemplate));
    expect(result.success).toBe(true);

    const section = result.projectIR.pages[0]!.sections[0]!;
    const titleNode = Object.values(section.nodes).find((n) => n.kind === 'heading');
    expect(titleNode).toBeDefined();
    expect(titleNode?.dataBinding?.model).toBe('product');
    expect(titleNode?.dataBinding?.field).toBe('title');
  });

  it('compiles Shopify projectIR cleanly into TargetSchema with SceneGraphCompiler', async () => {
    const shopifyPayload = {
      sections: {
        banner: {
          type: 'image-banner',
          settings: {
            heading: 'Royal Celebration Emporium',
            button_label: 'Shop Now',
          },
        },
      },
      order: ['banner'],
    };

    const parseResult = await adapter.parse(JSON.stringify(shopifyPayload));
    expect(parseResult.success).toBe(true);

    const compileResult = SceneGraphCompiler.compile(parseResult.projectIR);
    expect(compileResult.schema).toBeDefined();
    expect(compileResult.schema.scenes).toHaveLength(1);
    expect(compileResult.schema.scenes[0]!.name).toBe('Image Banner');
  });

  it('handles raw Liquid template files with schema blocks safely', async () => {
    const rawLiquid = `
      <div class="announcement-bar">
        <p>{{ section.settings.message }}</p>
      </div>
      {% schema %}
      {
        "name": "Announcement Bar",
        "settings": [
          { "id": "message", "type": "text", "default": "Free worldwide shipping on all wedding stationery" }
        ]
      }
      {% endschema %}
    `;

    const result = await adapter.parse(rawLiquid);
    expect(result.success).toBe(true);
    expect(result.projectIR.pages[0]!.sections[0]!.name).toBe('Announcement Bar');
  });
});
