import { UrlCrawlerAdapter } from '../adapters/UrlCrawlerAdapter';
import { SceneGraphCompiler } from '../compiler/SceneGraphCompiler';

describe('UrlCrawlerAdapter (Phase P26.8)', () => {
  let adapter: UrlCrawlerAdapter;

  beforeEach(() => {
    adapter = new UrlCrawlerAdapter();
  });

  it('accurately identifies HTTP/HTTPS URLs and rejects Figma URLs in canHandle()', () => {
    expect(adapter.canHandle('https://celebrations.orbitox.io')).toBe(true);
    expect(adapter.canHandle('http://localhost:3000/landing')).toBe(true);
    expect(adapter.canHandle({ url: 'https://bespokeweddings.com' })).toBe(true);

    // Figma URLs must be handled by FigmaAdapter, not UrlCrawlerAdapter
    expect(adapter.canHandle('https://www.figma.com/design/AbCdEf123/OrbitoX')).toBe(false);
    expect(adapter.canHandle('https://figma.com/file/xyz')).toBe(false);

    expect(adapter.canHandle('<div>Regular HTML</div>')).toBe(false);
    expect(adapter.canHandle('')).toBe(false);
  });

  it('extracts metadata, CSS design tokens, and multi-section landmarks from pre-rendered HTML payload', async () => {
    const payload = {
      url: 'https://royal-celebrations.com',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Royal Celebrations | Bespoke Wedding & Gala Architecture</title>
          <meta name="description" content="World-class celebration design and bespoke digital invitations.">
          <meta name="author" content="Royal Celebrations Studio">
          <style>
            :root {
              --color-primary: #0A0F1D;
              --color-accent: #E5C378;
              --font-heading: 'Playfair Display, serif';
              --font-body: 'Inter, sans-serif';
            }
          </style>
        </head>
        <body>
          <header class="hero-header">
            <h1>Honoring Timeless Union</h1>
            <p>Join us under the celestial stars for an evening of luxury.</p>
            <a href="https://royal-celebrations.com/rsvp" class="cta-link">RSVP Now</a>
          </header>

          <section class="features-section">
            <h2>Gala Schedule & Highlights</h2>
            <p>Cocktail reception, fine dining symphony, and midnight toast.</p>
            <img src="https://images.unsplash.com/photo-venue.jpg" alt="Palace Venue" />
          </section>

          <section class="pricing-tier">
            <h2>Patron Sponsorship Tiers</h2>
            <p>Exclusive access packages for distinguished benefactors.</p>
            <button class="sponsor-btn">Inquire for Table</button>
          </section>

          <footer>
            <p>© 2026 Royal Celebrations Studio. All rights reserved.</p>
          </footer>
        </body>
        </html>
      `,
    };

    const result = await adapter.parse(payload);

    expect(result.success).toBe(true);
    expect(result.projectIR.sourceFormat).toBe('web_url');
    expect(result.projectIR.metadata.title).toBe('Royal Celebrations | Bespoke Wedding & Gala Architecture');
    expect(result.projectIR.metadata.description).toBe('World-class celebration design and bespoke digital invitations.');
    expect(result.projectIR.metadata.author).toBe('Royal Celebrations Studio');

    // Design Tokens
    const tokens = result.projectIR.designTokens;
    expect(tokens.colors.color_primary?.value).toBe('#0A0F1D');
    expect(tokens.colors.color_accent?.value).toBe('#E5C378');
    expect(tokens.typography.heading?.fontFamily).toBe('Playfair Display');
    expect(tokens.typography.body?.fontFamily).toBe('Inter');

    // Sections
    const sections = result.projectIR.pages[0]!.sections;
    expect(sections.length).toBeGreaterThanOrEqual(3);

    const headerSection = sections.find((s) => s.archetype === 'header');
    expect(headerSection).toBeDefined();

    const featuresSection = sections.find((s) => s.archetype === 'features');
    expect(featuresSection).toBeDefined();

    const pricingSection = sections.find((s) => s.archetype === 'pricing');
    expect(pricingSection).toBeDefined();

    // Check specific nodes
    const allNodes = sections.flatMap((s) => Object.values(s.nodes));
    const h1 = allNodes.find((n) => n.kind === 'text' && n.content?.text === 'Honoring Timeless Union');
    expect(h1).toBeDefined();

    const rsvpBtn = allNodes.find((n) => n.kind === 'button' && n.content?.text === 'RSVP Now');
    expect(rsvpBtn).toBeDefined();
    expect(rsvpBtn!.content?.buttonHref).toBe('https://royal-celebrations.com/rsvp');

    const venueImg = allNodes.find((n) => n.kind === 'image' && n.content?.altText === 'Palace Venue');
    expect(venueImg).toBeDefined();
  });

  it('quarantines third-party scripts into isolated sandbox boundaries', async () => {
    const payload = {
      url: 'https://ad-heavy-site.com',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <script src="https://connect.facebook.net/en_US/fbevents.js"></script>
        </head>
        <body>
          <section>
            <h1>Safe Web Content</h1>
            <p>Legitimate text that should be editable.</p>
            <script>window.pixelTracker = true;</script>
          </section>
        </body>
        </html>
      `,
    };

    const result = await adapter.parse(payload);

    expect(result.success).toBe(true);
    expect(result.projectIR.customCodeBoundaries!.length).toBeGreaterThan(0);

    const boundary = result.projectIR.customCodeBoundaries![0]!;
    expect(boundary.isolatedSandbox).toBe(true);
    expect(boundary.reason).toBe('arbitrary_js_script');
  });

  it('resiliently falls back to structured synthetic IR if network request fails', async () => {
    const unreachableUrl = 'https://this-domain-definitely-does-not-exist-1234567.com';

    const result = await adapter.parse(unreachableUrl);

    expect(result.success).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.projectIR.pages).toHaveLength(1);
    expect(result.projectIR.pages[0]!.sections.length).toBeGreaterThan(0);

    const firstNode = Object.values(result.projectIR.pages[0]!.sections[0]!.nodes)[0];
    expect(firstNode).toBeDefined();
  }, 10000);

  it('compiles parsed URL project IR cleanly through SceneGraphCompiler into TargetTemplateSchema', async () => {
    const payload = {
      url: 'https://minimal-test.com',
      html: `
        <header>
          <h1>Minimal Test Headline</h1>
          <p>Description text</p>
          <a href="/join">Get Started</a>
        </header>
      `,
    };

    const parseResult = await adapter.parse(payload);
    expect(parseResult.success).toBe(true);

    const compileResult = SceneGraphCompiler.compile(parseResult.projectIR);
    expect(compileResult.success).toBe(true);
    expect(compileResult.schema.scenes.length).toBeGreaterThan(0);

    const scene = compileResult.schema.scenes[0]!;
    expect(scene.sceneGraph.nodes).toBeDefined();
  });
});
