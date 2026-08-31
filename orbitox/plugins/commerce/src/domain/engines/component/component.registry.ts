import { ComponentDefinition, ComponentType, ComponentCategory } from '../../types/component.types';

export class ComponentRegistry {
  private static registry: Map<ComponentType, ComponentDefinition> = new Map();

  static {
    this.registerBuiltinComponents();
  }

  static get(type: ComponentType): ComponentDefinition | undefined {
    return this.registry.get(type);
  }

  static getAll(): ComponentDefinition[] {
    return Array.from(this.registry.values());
  }

  static getByCategory(category: ComponentCategory): ComponentDefinition[] {
    return this.getAll().filter((c) => c.category === category);
  }

  static register(definition: ComponentDefinition): void {
    this.registry.set(definition.type, definition);
  }

  static createDefaultSection(
    type: ComponentType,
    order: number = 0,
    customSettings?: Record<string, any>
  ): {
    id: string;
    type: ComponentType;
    name: string;
    enabled: boolean;
    order: number;
    settings: Record<string, any>;
  } {
    const def = this.get(type);
    if (!def) {
      throw new Error(`Component type '${type}' not found in registry.`);
    }

    return {
      id: `sec_${type.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      name: def.name,
      enabled: true,
      order,
      settings: {
        ...JSON.parse(JSON.stringify(def.defaultSettings)),
        ...(customSettings || {}),
      },
    };
  }

  private static registerBuiltinComponents(): void {
    // 1. Announcement Bar
    this.register({
      type: 'announcement-bar',
      name: 'Announcement Bar',
      category: 'navigation',
      description: 'Top notification banner for sales, discounts, and free shipping notices.',
      icon: 'bell',
      schema: {
        text: { key: 'text', label: 'Message', type: 'text', defaultValue: '✨ FREE EXPRESS SHIPPING ON ALL ORDERS OVER $100' },
        link: { key: 'link', label: 'Destination Link', type: 'text', defaultValue: '/shop' },
        backgroundColor: { key: 'backgroundColor', label: 'Background Color', type: 'color', defaultValue: '' },
        textColor: { key: 'textColor', label: 'Text Color', type: 'color', defaultValue: '' },
        closable: { key: 'closable', label: 'Allow User to Dismiss', type: 'boolean', defaultValue: true },
      },
      defaultSettings: {
        text: '✨ FREE EXPRESS SHIPPING ON ALL ORDERS OVER $100',
        link: '/shop',
        backgroundColor: '',
        textColor: '',
        closable: true,
      },
    });

    // 2. Header / Navigation
    this.register({
      type: 'header',
      name: 'Header & Navigation',
      category: 'navigation',
      description: 'Main store header with logo, navigation links, search, and cart trigger.',
      icon: 'menu',
      schema: {
        showSearch: { key: 'showSearch', label: 'Show Search Bar', type: 'boolean', defaultValue: true },
        showWishlist: { key: 'showWishlist', label: 'Show Wishlist Icon', type: 'boolean', defaultValue: false },
        sticky: { key: 'sticky', label: 'Sticky On Scroll', type: 'boolean', defaultValue: true },
        logoPosition: {
          key: 'logoPosition',
          label: 'Logo Position',
          type: 'select',
          options: [
            { label: 'Left', value: 'left' },
            { label: 'Center', value: 'center' },
          ],
          defaultValue: 'left',
        },
      },
      defaultSettings: {
        showSearch: true,
        showWishlist: false,
        sticky: true,
        logoPosition: 'left',
      },
    });

    // 3. Hero Banner
    this.register({
      type: 'hero',
      name: 'Hero Showcase',
      category: 'hero-banners',
      description: 'Full-width cinematic hero section with headline, CTA button, and rich media background.',
      icon: 'sparkles',
      schema: {
        badge: { key: 'badge', label: 'Top Badge Tag', type: 'text', defaultValue: 'SPRING / SUMMER 2026' },
        title: { key: 'title', label: 'Headline', type: 'text', defaultValue: 'Elegance Redefined' },
        subtitle: { key: 'subtitle', label: 'Subtitle', type: 'textarea', defaultValue: 'Discover handcrafted luxury pieces designed for the modern connoisseur.' },
        primaryButtonText: { key: 'primaryButtonText', label: 'Primary Button Label', type: 'text', defaultValue: 'Explore Collection' },
        primaryButtonLink: { key: 'primaryButtonLink', label: 'Primary Button Link', type: 'text', defaultValue: '/shop' },
        secondaryButtonText: { key: 'secondaryButtonText', label: 'Secondary Button Label', type: 'text', defaultValue: 'Our Story' },
        secondaryButtonLink: { key: 'secondaryButtonLink', label: 'Secondary Button Link', type: 'text', defaultValue: '/about' },
        imageUrl: { key: 'imageUrl', label: 'Background Image URL', type: 'media', defaultValue: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop' },
        overlayOpacity: { key: 'overlayOpacity', label: 'Dark Overlay Opacity (%)', type: 'range', min: 0, max: 90, defaultValue: 40 },
        textAlignment: {
          key: 'textAlignment',
          label: 'Text Alignment',
          type: 'select',
          options: [
            { label: 'Left', value: 'left' },
            { label: 'Center', value: 'center' },
            { label: 'Right', value: 'right' },
          ],
          defaultValue: 'left',
        },
      },
      defaultSettings: {
        badge: 'SPRING / SUMMER 2026',
        title: 'Elegance Redefined',
        subtitle: 'Discover handcrafted luxury pieces designed for the modern connoisseur.',
        primaryButtonText: 'Explore Collection',
        primaryButtonLink: '/shop',
        secondaryButtonText: 'Our Story',
        secondaryButtonLink: '/about',
        imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop',
        overlayOpacity: 40,
        textAlignment: 'left',
      },
    });

    // 4. Product Grid
    this.register({
      type: 'product-grid',
      name: 'Product Grid',
      category: 'commerce',
      description: 'Responsive multi-column grid displaying products with filters, sorting, and quick add.',
      icon: 'grid',
      schema: {
        title: { key: 'title', label: 'Section Title', type: 'text', defaultValue: 'Trending Now' },
        subtitle: { key: 'subtitle', label: 'Section Subtitle', type: 'text', defaultValue: 'Curated essentials handpicked for your wardrobe' },
        collectionId: { key: 'collectionId', label: 'Filter by Collection', type: 'select', options: [{ label: 'All Products', value: 'all' }], defaultValue: 'all' },
        cardVariant: {
          key: 'cardVariant',
          label: 'Card UI Design Style',
          type: 'select',
          options: [
            { label: 'Auto (Match Active Theme Kit)', value: 'auto' },
            { label: 'Luxe Squircle (Deep Blue Nights)', value: 'luxe-squircle' },
            { label: 'OddaWorld CyberTech (Emerald Halo)', value: 'oddaworld-cyber' },
            { label: 'SneakConnect Editorial (Swiss Magazine)', value: 'sneakconnect-editorial' },
            { label: 'Pegasus Athletic (Frosted Glass Runner)', value: 'pegasus-athletic' },
            { label: 'Aura Sand (Warm Organic Linen)', value: 'aura-sand' },
            { label: 'Punjabi Royal Atelier (Gold Dabka)', value: 'punjabi-royal' },
            { label: 'Nova Luxe Neumorphic (Dark Gold)', value: 'neumorphic-gold' },
          ],
          defaultValue: 'auto',
        },
        columns: {
          key: 'columns',
          label: 'Columns per Row',
          type: 'select',
          options: [
            { label: '2 Columns', value: 2 },
            { label: '3 Columns', value: 3 },
            { label: '4 Columns', value: 4 },
          ],
          defaultValue: 4,
        },
        limit: { key: 'limit', label: 'Maximum Products to Display', type: 'number', min: 2, max: 24, defaultValue: 8 },
        showQuickAdd: { key: 'showQuickAdd', label: 'Enable Quick Add Button', type: 'boolean', defaultValue: true },
      },
      defaultSettings: {
        title: 'Trending Now',
        subtitle: 'Curated essentials handpicked for your wardrobe',
        collectionId: 'all',
        cardVariant: 'auto',
        columns: 4,
        limit: 8,
        showQuickAdd: true,
      },
    });

    // 5. Product Carousel
    this.register({
      type: 'product-carousel',
      name: 'Product Carousel',
      category: 'commerce',
      description: 'Smooth horizontal scrolling slider for showcasing new arrivals or related products.',
      icon: 'sliders',
      schema: {
        title: { key: 'title', label: 'Slider Title', type: 'text', defaultValue: 'New Arrivals' },
        subtitle: { key: 'subtitle', label: 'Subtitle', type: 'text', defaultValue: 'Fresh off the runway this week' },
        collectionId: { key: 'collectionId', label: 'Collection', type: 'select', options: [{ label: 'All Products', value: 'all' }], defaultValue: 'all' },
        limit: { key: 'limit', label: 'Product Limit', type: 'number', defaultValue: 10 },
      },
      defaultSettings: {
        title: 'New Arrivals',
        subtitle: 'Fresh off the runway this week',
        collectionId: 'all',
        limit: 10,
      },
    });

    // 6. Category Grid
    this.register({
      type: 'category-grid',
      name: 'Category Showcase',
      category: 'commerce',
      description: 'Visual category cards with hover zoom effects for intuitive collection browsing.',
      icon: 'layers',
      schema: {
        title: { key: 'title', label: 'Section Title', type: 'text', defaultValue: 'Shop by Department' },
        columns: {
          key: 'columns',
          label: 'Columns',
          type: 'select',
          options: [
            { label: '3 Columns', value: 3 },
            { label: '4 Columns', value: 4 },
          ],
          defaultValue: 3,
        },
      },
      defaultSettings: {
        title: 'Shop by Department',
        columns: 3,
      },
    });

    // 7. Promotional Banner
    this.register({
      type: 'banner',
      name: 'Promotional Banner',
      category: 'marketing',
      description: 'Split or full-width campaign banner for flash sales, collaborations, and discount codes.',
      icon: 'image',
      schema: {
        tagline: { key: 'tagline', label: 'Tagline', type: 'text', defaultValue: 'EXCLUSIVE OFFER' },
        heading: { key: 'heading', label: 'Banner Heading', type: 'text', defaultValue: 'Get 25% Off Your First Order' },
        description: { key: 'description', label: 'Description', type: 'textarea', defaultValue: 'Use code WELCOME25 at checkout. Valid on all premium collections.' },
        buttonText: { key: 'buttonText', label: 'Button Label', type: 'text', defaultValue: 'Claim Offer' },
        buttonLink: { key: 'buttonLink', label: 'Button Link', type: 'text', defaultValue: '/shop' },
        imageUrl: { key: 'imageUrl', label: 'Banner Image', type: 'media', defaultValue: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop' },
      },
      defaultSettings: {
        tagline: 'EXCLUSIVE OFFER',
        heading: 'Get 25% Off Your First Order',
        description: 'Use code WELCOME25 at checkout. Valid on all premium collections.',
        buttonText: 'Claim Offer',
        buttonLink: '/shop',
        imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop',
      },
    });

    // 8. Featured Single Product Spotlight
    this.register({
      type: 'featured-product',
      name: 'Product Spotlight',
      category: 'commerce',
      description: 'Deep-dive showcase for a single flagship product with variant selector and immediate add-to-cart.',
      icon: 'star',
      schema: {
        productId: { key: 'productId', label: 'Target Product', type: 'text', defaultValue: '' },
        badgeText: { key: 'badgeText', label: 'Badge Text', type: 'text', defaultValue: 'EDITOR’S CHOICE' },
      },
      defaultSettings: {
        productId: '',
        badgeText: 'EDITOR’S CHOICE',
      },
    });

    // 9. Customer Testimonials / Social Proof
    this.register({
      type: 'testimonials',
      name: 'Customer Testimonials',
      category: 'social-proof',
      description: 'Verified customer review cards with star ratings and avatar images.',
      icon: 'message-square',
      schema: {
        title: { key: 'title', label: 'Title', type: 'text', defaultValue: 'What Our Patrons Say' },
        subtitle: { key: 'subtitle', label: 'Subtitle', type: 'text', defaultValue: 'Over 50,000+ satisfied clients worldwide' },
      },
      defaultSettings: {
        title: 'What Our Patrons Say',
        subtitle: 'Over 50,000+ satisfied clients worldwide',
      },
    });

    // 10. FAQ Accordion
    this.register({
      type: 'faq',
      name: 'FAQ Accordion',
      category: 'content',
      description: 'Expandable frequently asked questions list for shipping, returns, and sizing.',
      icon: 'help-circle',
      schema: {
        title: { key: 'title', label: 'Section Title', type: 'text', defaultValue: 'Frequently Asked Questions' },
      },
      defaultSettings: {
        title: 'Frequently Asked Questions',
      },
    });

    // 11. Countdown Timer (Flash Sale)
    this.register({
      type: 'countdown',
      name: 'Flash Sale Countdown',
      category: 'marketing',
      description: 'Urgency-inducing live countdown timer for limited-time product drops.',
      icon: 'clock',
      schema: {
        title: { key: 'title', label: 'Sale Title', type: 'text', defaultValue: 'Midnight Flash Sale' },
        description: { key: 'description', label: 'Subtitle', type: 'text', defaultValue: 'Prices slash by 40% until midnight' },
        targetDate: { key: 'targetDate', label: 'End Timestamp', type: 'text', defaultValue: new Date(Date.now() + 86400000 * 3).toISOString() },
        buttonText: { key: 'buttonText', label: 'Shop Sale', type: 'text', defaultValue: 'Shop Now' },
        buttonLink: { key: 'buttonLink', label: 'Link', type: 'text', defaultValue: '/shop' },
      },
      defaultSettings: {
        title: 'Midnight Flash Sale',
        description: 'Prices slash by 40% until midnight',
        targetDate: new Date(Date.now() + 86400000 * 3).toISOString(),
        buttonText: 'Shop Now',
        buttonLink: '/shop',
      },
    });

    // 12. Newsletter Signup
    this.register({
      type: 'newsletter',
      name: 'Newsletter Signup',
      category: 'marketing',
      description: 'Clean lead capture form with instant discount code reward.',
      icon: 'mail',
      schema: {
        title: { key: 'title', label: 'Headline', type: 'text', defaultValue: 'Join The Inner Circle' },
        description: { key: 'description', label: 'Subtitle', type: 'text', defaultValue: 'Subscribe to receive private previews, VIP events, and 15% off your next order.' },
        buttonText: { key: 'buttonText', label: 'Button Text', type: 'text', defaultValue: 'Subscribe' },
      },
      defaultSettings: {
        title: 'Join The Inner Circle',
        description: 'Subscribe to receive private previews, VIP events, and 15% off your next order.',
        buttonText: 'Subscribe',
      },
    });

    // 13. Trust Badges / Value Props
    this.register({
      type: 'trust-badges',
      name: 'Trust Badges & Value Props',
      category: 'social-proof',
      description: 'Icons displaying Free Worldwide Shipping, 30-Day Returns, Secure Payments, and 24/7 Support.',
      icon: 'shield-check',
      schema: {},
      defaultSettings: {},
    });

    // 14. Instagram Feed / Lookbook
    this.register({
      type: 'instagram-feed',
      name: 'Instagram Lookbook',
      category: 'social-proof',
      description: 'Curated 4-6 image social lookbook with @username badge and modal viewer.',
      icon: 'camera',
      schema: {
        handle: { key: 'handle', label: 'Social Handle', type: 'text', defaultValue: '@orbitox.store' },
        title: { key: 'title', label: 'Section Title', type: 'text', defaultValue: 'Follow On Instagram' },
      },
      defaultSettings: {
        handle: '@orbitox.store',
        title: 'Follow On Instagram',
      },
    });

    // 15. Stats Counter
    this.register({
      type: 'stats-counter',
      name: 'Metrics & Numbers',
      category: 'content',
      description: 'Highlight key brand stats (e.g. 50k+ Happy Customers, 100% Organic, 24h Delivery).',
      icon: 'bar-chart-2',
      schema: {
        title: { key: 'title', label: 'Title', type: 'text', defaultValue: 'Crafted With Excellence' },
      },
      defaultSettings: {
        title: 'Crafted With Excellence',
      },
    });

    // 16. Rich Text Block
    this.register({
      type: 'text-block',
      name: 'Rich Text Section',
      category: 'content',
      description: 'Editorial article block for brand storytelling, manifesto, and designer notes.',
      icon: 'file-text',
      schema: {
        heading: { key: 'heading', label: 'Heading', type: 'text', defaultValue: 'Our Philosophy' },
        body: { key: 'body', label: 'Body Text', type: 'textarea', defaultValue: 'We believe that luxury should not compromise sustainability. Every piece in our collection is sustainably sourced and ethically manufactured.' },
      },
      defaultSettings: {
        heading: 'Our Philosophy',
        body: 'We believe that luxury should not compromise sustainability. Every piece in our collection is sustainably sourced and ethically manufactured.',
      },
    });

    // 17. Image Block
    this.register({
      type: 'image-block',
      name: 'Full Width Image',
      category: 'content',
      description: 'High-resolution full-width image with optional caption and CTA.',
      icon: 'image',
      schema: {
        imageUrl: { key: 'imageUrl', label: 'Image URL', type: 'media', defaultValue: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=2070&auto=format&fit=crop' },
        caption: { key: 'caption', label: 'Caption', type: 'text', defaultValue: 'Artisan Crafted in Milan' },
      },
      defaultSettings: {
        imageUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=2070&auto=format&fit=crop',
        caption: 'Artisan Crafted in Milan',
      },
    });

    // 18. Video Block
    this.register({
      type: 'video-block',
      name: 'Video Showcase',
      category: 'content',
      description: 'Cinematic video player supporting MP4 and streaming embeds.',
      icon: 'video',
      schema: {
        title: { key: 'title', label: 'Title', type: 'text', defaultValue: 'Behind The Scenes' },
        videoUrl: { key: 'videoUrl', label: 'Video URL', type: 'text', defaultValue: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
      },
      defaultSettings: {
        title: 'Behind The Scenes',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      },
    });

    // 19. Gallery Grid
    this.register({
      type: 'gallery',
      name: 'Image Gallery',
      category: 'content',
      description: 'Masonry or tiled image gallery for brand visuals and lookbooks.',
      icon: 'grid',
      schema: {
        title: { key: 'title', label: 'Gallery Title', type: 'text', defaultValue: 'Seasonal Lookbook' },
      },
      defaultSettings: {
        title: 'Seasonal Lookbook',
      },
    });

    // 20. Contact Form
    this.register({
      type: 'contact-form',
      name: 'Contact & Inquiry Form',
      category: 'content',
      description: 'Interactive customer inquiry form with name, email, subject, and message.',
      icon: 'send',
      schema: {
        title: { key: 'title', label: 'Title', type: 'text', defaultValue: 'Get In Touch' },
        subtitle: { key: 'subtitle', label: 'Subtitle', type: 'text', defaultValue: 'Our concierge team is available 24/7' },
      },
      defaultSettings: {
        title: 'Get In Touch',
        subtitle: 'Our concierge team is available 24/7',
      },
    });

    // 21. Custom HTML
    this.register({
      type: 'custom-html',
      name: 'Custom HTML Block',
      category: 'advanced',
      description: 'Raw HTML/CSS embed block for custom widgets, embeds, and third-party scripts.',
      icon: 'code',
      schema: {
        html: { key: 'html', label: 'HTML Content', type: 'textarea', defaultValue: '<div style="padding: 40px; text-align: center;"><h3>Custom Content Block</h3></div>' },
      },
      defaultSettings: {
        html: '<div style="padding: 40px; text-align: center;"><h3>Custom Content Block</h3></div>',
      },
    });

    // 22. Collection Grid
    this.register({
      type: 'collection-grid',
      name: 'Collections Grid',
      category: 'commerce',
      description: 'Curated collection tiles with item counts and direct links.',
      icon: 'archive',
      schema: {
        title: { key: 'title', label: 'Title', type: 'text', defaultValue: 'Curated Collections' },
      },
      defaultSettings: {
        title: 'Curated Collections',
      },
    });

    // 24. Video Hero
    this.register({
      type: 'video-hero',
      name: 'Cinematic Video Hero',
      category: 'hero-banners',
      description: 'Full-width auto-playing cinematic background video banner with dynamic typography & CTA buttons.',
      icon: 'video',
      schema: {
        badge: { key: 'badge', label: 'Badge', type: 'text', defaultValue: 'ROYAL HERITAGE ATELIER' },
        title: { key: 'title', label: 'Headline', type: 'text', defaultValue: 'Handcrafted Perfection in Motion' },
        subtitle: { key: 'subtitle', label: 'Subtitle', type: 'textarea', defaultValue: 'Witness master artisans weave pure gold zari and emerald velvet with ancestral precision.' },
        videoUrl: { key: 'videoUrl', label: 'Video URL (MP4 / WebM)', type: 'text', defaultValue: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
        primaryButtonText: { key: 'primaryButtonText', label: 'Primary Button Text', type: 'text', defaultValue: 'Explore Bridal Couture' },
        primaryButtonLink: { key: 'primaryButtonLink', label: 'Primary Button Link', type: 'text', defaultValue: '/shop' },
        overlayOpacity: { key: 'overlayOpacity', label: 'Overlay Opacity (%)', type: 'range', min: 0, max: 90, defaultValue: 50 },
      },
      defaultSettings: {
        badge: 'ROYAL HERITAGE ATELIER',
        title: 'Handcrafted Perfection in Motion',
        subtitle: 'Witness master artisans weave pure gold zari and emerald velvet with ancestral precision.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        primaryButtonText: 'Explore Bridal Couture',
        primaryButtonLink: '/shop',
        overlayOpacity: 50,
      },
    });

    // 25. Promo Ribbon (Marquee Ticker)
    this.register({
      type: 'promo-ribbon',
      name: 'Animated Promo Ribbon',
      category: 'marketing',
      description: 'High-energy infinite marquee ticker for limited flash drops, announcements, and trust claims.',
      icon: 'zap',
      schema: {
        text: { key: 'text', label: 'Ticker Message (Repeated)', type: 'text', defaultValue: '👑 ROYAL BRIDAL EDITION 2026 • 100% HANDMADE DABKA • FREE INSURED WORLDWIDE SHIPPING • NO BITE MEMORY FOAM • ' },
        speed: { key: 'speed', label: 'Animation Speed (seconds)', type: 'number', min: 5, max: 60, defaultValue: 20 },
        backgroundColor: { key: 'backgroundColor', label: 'Background Color', type: 'color', defaultValue: '#7A1113' },
        textColor: { key: 'textColor', label: 'Text Color', type: 'color', defaultValue: '#E5A93C' },
      },
      defaultSettings: {
        text: '👑 ROYAL BRIDAL EDITION 2026 • 100% HANDMADE DABKA • FREE INSURED WORLDWIDE SHIPPING • NO BITE MEMORY FOAM • ',
        speed: 20,
        backgroundColor: '#7A1113',
        textColor: '#E5A93C',
      },
    });

    // 26. Lookbook Mosaic
    this.register({
      type: 'lookbook-mosaic',
      name: 'Editorial Lookbook Mosaic',
      category: 'content',
      description: 'Asymmetric high-fashion editorial collage with product tags and exploration links.',
      icon: 'camera',
      schema: {
        title: { key: 'title', label: 'Section Title', type: 'text', defaultValue: 'The Royal Trousseau Lookbook' },
        subtitle: { key: 'subtitle', label: 'Subtitle', type: 'text', defaultValue: 'Curated pairings styled for royal grand celebrations and midnight sangeets' },
        mainImageUrl: { key: 'mainImageUrl', label: 'Hero Image URL', type: 'media', defaultValue: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=1200&auto=format&fit=crop' },
        secondaryImageUrl: { key: 'secondaryImageUrl', label: 'Secondary Image URL', type: 'media', defaultValue: 'https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?q=80&w=1200&auto=format&fit=crop' },
        tagline: { key: 'tagline', label: 'Editorial Note', type: 'textarea', defaultValue: 'Every pair is an heirloom, taking over 48 hours of meticulous needlework.' },
        buttonText: { key: 'buttonText', label: 'Button Text', type: 'text', defaultValue: 'View Full Lookbook' },
        buttonLink: { key: 'buttonLink', label: 'Button Link', type: 'text', defaultValue: '/lookbook' },
      },
      defaultSettings: {
        title: 'The Royal Trousseau Lookbook',
        subtitle: 'Curated pairings styled for royal grand celebrations and midnight sangeets',
        mainImageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=1200&auto=format&fit=crop',
        secondaryImageUrl: 'https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?q=80&w=1200&auto=format&fit=crop',
        tagline: 'Every pair is an heirloom, taking over 48 hours of meticulous needlework.',
        buttonText: 'View Full Lookbook',
        buttonLink: '/lookbook',
      },
    });

    // 27. Before / After Interactive Slider
    this.register({
      type: 'before-after-slider',
      name: 'Before / After Comparison Slider',
      category: 'content',
      description: 'Interactive visual comparison slider showing raw leather vs finished hand-embroidered craftsmanship.',
      icon: 'sliders',
      schema: {
        title: { key: 'title', label: 'Title', type: 'text', defaultValue: 'From Raw Silk to Royal Zardozi' },
        subtitle: { key: 'subtitle', label: 'Subtitle', type: 'text', defaultValue: 'Slide to inspect the transformative depth of 24K gold dabka bullion embroidery.' },
        beforeImage: { key: 'beforeImage', label: 'Before / Raw Image', type: 'media', defaultValue: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=1200&auto=format&fit=crop' },
        afterImage: { key: 'afterImage', label: 'After / Masterpiece Image', type: 'media', defaultValue: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1200&auto=format&fit=crop' },
        beforeLabel: { key: 'beforeLabel', label: 'Before Label', type: 'text', defaultValue: 'Raw Pure Velvet Base' },
        afterLabel: { key: 'afterLabel', label: 'After Label', type: 'text', defaultValue: 'Finished Royal Zardozi' },
      },
      defaultSettings: {
        title: 'From Raw Silk to Royal Zardozi',
        subtitle: 'Slide to inspect the transformative depth of 24K gold dabka bullion embroidery.',
        beforeImage: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=1200&auto=format&fit=crop',
        afterImage: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1200&auto=format&fit=crop',
        beforeLabel: 'Raw Pure Velvet Base',
        afterLabel: 'Finished Royal Zardozi',
      },
    });

    // 28. Size Guide & International Conversion Table
    this.register({
      type: 'size-guide-table',
      name: 'Size Guide & Conversion Matrix',
      category: 'content',
      description: 'Interactive shoe & apparel sizing chart with EU, US, UK, and CM measurement tips.',
      icon: 'table',
      schema: {
        title: { key: 'title', label: 'Title', type: 'text', defaultValue: 'Bite-Free Size & Fit Guide' },
        subtitle: { key: 'subtitle', label: 'Subtitle', type: 'text', defaultValue: 'Our juttis feature our proprietary double-padded memory foam soles. Find your perfect fit.' },
        fitAdvice: { key: 'fitAdvice', label: 'Fit Advice Note', type: 'textarea', defaultValue: 'True to size. If you have broad feet or wear half-sizes, we recommend sizing up one full size for optimal comfort.' },
      },
      defaultSettings: {
        title: 'Bite-Free Size & Fit Guide',
        subtitle: 'Our juttis feature our proprietary double-padded memory foam soles. Find your perfect fit.',
        fitAdvice: 'True to size. If you have broad feet or wear half-sizes, we recommend sizing up one full size for optimal comfort.',
      },
    });

    // 29. Brand Story Heritage Timeline
    this.register({
      type: 'brand-story-timeline',
      name: 'Brand Story Heritage Timeline',
      category: 'content',
      description: 'Multi-node interactive milestone journey highlighting royal lineage, artisan legacy, and modern innovations.',
      icon: 'calendar',
      schema: {
        title: { key: 'title', label: 'Timeline Title', type: 'text', defaultValue: 'A Century of Royal Heritage' },
        subtitle: { key: 'subtitle', label: 'Subtitle', type: 'text', defaultValue: 'From royal courts of Patiala to modern international catwalks.' },
        step1Year: { key: 'step1Year', label: 'Step 1 Year', type: 'text', defaultValue: '1924' },
        step1Title: { key: 'step1Title', label: 'Step 1 Title', type: 'text', defaultValue: 'The Royal Court Shoemakers' },
        step1Desc: { key: 'step1Desc', label: 'Step 1 Description', type: 'textarea', defaultValue: 'Crafting bespoke zardozi juttis exclusively for the Maharajas of Punjab.' },
        step2Year: { key: 'step2Year', label: 'Step 2 Year', type: 'text', defaultValue: '1988' },
        step2Title: { key: 'step2Title', label: 'Step 2 Title', type: 'text', defaultValue: 'The Artisan Guild Revival' },
        step2Desc: { key: 'step2Desc', label: 'Step 2 Description', type: 'textarea', defaultValue: 'Preserving dying bullion and dabka needlecraft across 40+ Punjabi villages.' },
        step3Year: { key: 'step3Year', label: 'Step 3 Year', type: 'text', defaultValue: '2026' },
        step3Title: { key: 'step3Title', label: 'Step 3 Title', type: 'text', defaultValue: 'Bite-Free Innovation' },
        step3Desc: { key: 'step3Desc', label: 'Step 3 Description', type: 'textarea', defaultValue: 'Pioneering aerospace-grade triple memory foam cushioning for effortless all-night wear.' },
      },
      defaultSettings: {
        title: 'A Century of Royal Heritage',
        subtitle: 'From royal courts of Patiala to modern international catwalks.',
        step1Year: '1924',
        step1Title: 'The Royal Court Shoemakers',
        step1Desc: 'Crafting bespoke zardozi juttis exclusively for the Maharajas of Punjab.',
        step2Year: '1988',
        step2Title: 'The Artisan Guild Revival',
        step2Desc: 'Preserving dying bullion and dabka needlecraft across 40+ Punjabi villages.',
        step3Year: '2026',
        step3Title: 'Bite-Free Innovation',
        step3Desc: 'Pioneering aerospace-grade triple memory foam cushioning for effortless all-night wear.',
      },
    });

    // 30. Masonry Visual Gallery
    this.register({
      type: 'masonry-gallery',
      name: 'Masonry Visual Showcase',
      category: 'content',
      description: 'Dynamic masonry photo grid with hover zoom badges and high-res lightbox styling.',
      icon: 'grid',
      schema: {
        title: { key: 'title', label: 'Gallery Title', type: 'text', defaultValue: 'Artisan Atelier in Focus' },
        subtitle: { key: 'subtitle', label: 'Subtitle', type: 'text', defaultValue: 'Behind the velvet curtains of our Patiala workshop' },
      },
      defaultSettings: {
        title: 'Artisan Atelier in Focus',
        subtitle: 'Behind the velvet curtains of our Patiala workshop',
      },
    });

    // 31. Accordion Features & Craftsmanship Specs
    this.register({
      type: 'accordion-features',
      name: 'Craftsmanship Specs & Features',
      category: 'content',
      description: 'Dual-column interactive feature explorer with image showcase and detailed craftsmanship specs.',
      icon: 'check-circle',
      schema: {
        title: { key: 'title', label: 'Section Title', type: 'text', defaultValue: 'Why Our Juttis Are Unmatched' },
        subtitle: { key: 'subtitle', label: 'Subtitle', type: 'text', defaultValue: 'Every single stitch is executed by hand with supreme royal grade materials.' },
        item1Title: { key: 'item1Title', label: 'Feature 1 Title', type: 'text', defaultValue: 'Proprietary Bite-Free Triple Cushioning' },
        item1Desc: { key: 'item1Desc', label: 'Feature 1 Details', type: 'textarea', defaultValue: 'Engineered with double-layered latex foam and medical-grade heel padding so you can dance all night without shoe bites.' },
        item2Title: { key: 'item2Title', label: 'Feature 2 Title', type: 'text', defaultValue: 'Pure 24K Gold & Silver Zardozi Dabka' },
        item2Desc: { key: 'item2Desc', label: 'Feature 2 Details', type: 'textarea', defaultValue: 'Imported metallic wires and Austrian seed pearls hand-embroidered by 3rd generation master artisans.' },
        item3Title: { key: 'item3Title', label: 'Feature 3 Title', type: 'text', defaultValue: '100% Genuine Vegetable-Tanned Leather' },
        item3Desc: { key: 'item3Desc', label: 'Feature 3 Details', type: 'textarea', defaultValue: 'Supple, breathable, chemical-free leather sole that molds gracefully to the shape of your feet.' },
        sideImageUrl: { key: 'sideImageUrl', label: 'Side Feature Image', type: 'media', defaultValue: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1200&auto=format&fit=crop' },
      },
      defaultSettings: {
        title: 'Why Our Juttis Are Unmatched',
        subtitle: 'Every single stitch is executed by hand with supreme royal grade materials.',
        item1Title: 'Proprietary Bite-Free Triple Cushioning',
        item1Desc: 'Engineered with double-layered latex foam and medical-grade heel padding so you can dance all night without shoe bites.',
        item2Title: 'Pure 24K Gold & Silver Zardozi Dabka',
        item2Desc: 'Imported metallic wires and Austrian seed pearls hand-embroidered by 3rd generation master artisans.',
        item3Title: '100% Genuine Vegetable-Tanned Leather',
        item3Desc: 'Supple, breathable, chemical-free leather sole that molds gracefully to the shape of your feet.',
        sideImageUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1200&auto=format&fit=crop',
      },
    });

    // 32. Footer
    this.register({
      type: 'footer',
      name: 'Storefront Footer',
      category: 'navigation',
      description: 'Multi-column store footer with copyright, links, newsletter, and payment badges.',
      icon: 'layout',
      schema: {
        copyright: { key: 'copyright', label: 'Copyright Text', type: 'text', defaultValue: '© 2026 OrbitoX Platform. All rights reserved.' },
        showPaymentBadges: { key: 'showPaymentBadges', label: 'Show Payment Icons', type: 'boolean', defaultValue: true },
      },
      defaultSettings: {
        copyright: '© 2026 OrbitoX Platform. All rights reserved.',
        showPaymentBadges: true,
      },
    });

    // 33. OddaWorld Gadgets Hero (Reference Image 5)
    this.register({
      type: 'oddaworld-gadgets-hero',
      name: 'OddaWorld Neon Halo Hero',
      category: 'hero-banners',
      description: 'Cyber-luxury gadgets hero with glowing emerald neon rings, luxury audio headphones, floating pill header, and video CTA.',
      icon: 'sparkles',
      schema: {
        tagline: { key: 'tagline', label: 'Top Tagline', type: 'text', defaultValue: 'NEXT-GEN GADGETS' },
        title: { key: 'title', label: 'Main Heading', type: 'text', defaultValue: 'Power Up Your World.' },
        subtitle: { key: 'subtitle', label: 'Subtitle', type: 'textarea', defaultValue: 'Smart. Sleek. Reliable. Gadgets that keep you ahead.' },
        primaryCtaText: { key: 'primaryCtaText', label: 'Primary Button', type: 'text', defaultValue: 'SHOP NOW →' },
        primaryCtaLink: { key: 'primaryCtaLink', label: 'Primary Link', type: 'text', defaultValue: '/shop' },
        secondaryCtaText: { key: 'secondaryCtaText', label: 'Secondary Button', type: 'text', defaultValue: 'Watch Collection' },
        secondaryCtaLink: { key: 'secondaryCtaLink', label: 'Secondary Link', type: 'text', defaultValue: '#video' },
        productImageUrl: { key: 'productImageUrl', label: 'Featured Product Image', type: 'media', defaultValue: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1200&auto=format&fit=crop' },
      },
      defaultSettings: {
        tagline: 'NEXT-GEN GADGETS',
        title: 'Power Up Your World.',
        subtitle: 'Smart. Sleek. Reliable. Gadgets that keep you ahead.',
        primaryCtaText: 'SHOP NOW →',
        primaryCtaLink: '/shop',
        secondaryCtaText: 'Watch Collection',
        secondaryCtaLink: '#video',
        productImageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1200&auto=format&fit=crop',
      },
    });

    // 34. OddaWorld Category Grid & Spotlight (Reference Image 5)
    this.register({
      type: 'oddaworld-categories',
      name: 'OddaWorld Category Matrix & New Arrivals',
      category: 'commerce',
      description: 'Futuristic category grid with illuminated emerald cards (Audio, Watches, Phones, Gaming) and wide New Arrival spotlight.',
      icon: 'grid',
      schema: {
        title: { key: 'title', label: 'Category Header', type: 'text', defaultValue: 'Shop By Category' },
        spotlightBadge: { key: 'spotlightBadge', label: 'Spotlight Badge', type: 'text', defaultValue: 'NEW ARRIVAL' },
        spotlightTitle: { key: 'spotlightTitle', label: 'Spotlight Title', type: 'text', defaultValue: 'Small Size. Big Performance.' },
        spotlightSubtitle: { key: 'spotlightSubtitle', label: 'Spotlight Subtitle', type: 'text', defaultValue: 'Experience sound like never before with active spatial noise cancellation.' },
        spotlightCtaText: { key: 'spotlightCtaText', label: 'Spotlight CTA', type: 'text', defaultValue: 'SHOP NOW →' },
      },
      defaultSettings: {
        title: 'Shop By Category',
        spotlightBadge: 'NEW ARRIVAL',
        spotlightTitle: 'Small Size. Big Performance.',
        spotlightSubtitle: 'Experience sound like never before with active spatial noise cancellation.',
        spotlightCtaText: 'SHOP NOW →',
      },
    });

    // 35. SneakConnect Editorial Hero (Reference Image 4)
    this.register({
      type: 'sneakconnect-editorial-hero',
      name: 'SneakConnect Editorial Luxe Hero',
      category: 'hero-banners',
      description: 'High-fashion editorial hero with oversized typography, integrated search bar, trust proof badge, and quick category pills.',
      icon: 'image',
      schema: {
        title: { key: 'title', label: 'Hero Title', type: 'text', defaultValue: 'SPORT FOOTWEAR FOR MOTION & STYLE' },
        subtitle: { key: 'subtitle', label: 'Hero Subtitle', type: 'textarea', defaultValue: 'Premium athletic footwear for every ambitious goal. Find your pair and move with velocity.' },
        searchPlaceholder: { key: 'searchPlaceholder', label: 'Search Placeholder', type: 'text', defaultValue: 'Search by model, brand, or category...' },
        trustCount: { key: 'trustCount', label: 'Trust Count Text', type: 'text', defaultValue: '10 000+ satisfied athletes' },
        heroImageUrl: { key: 'heroImageUrl', label: 'Editorial Model Image', type: 'media', defaultValue: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200&auto=format&fit=crop' },
      },
      defaultSettings: {
        title: 'SPORT FOOTWEAR FOR MOTION & STYLE',
        subtitle: 'Premium athletic footwear for every ambitious goal. Find your pair and move with velocity.',
        searchPlaceholder: 'Search by model, brand, or category...',
        trustCount: '10 000+ satisfied athletes',
        heroImageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200&auto=format&fit=crop',
      },
    });

    // 36. SneakConnect Popular Models Carousel (Reference Image 4)
    this.register({
      type: 'sneakconnect-popular-models',
      name: 'SneakConnect Popular Models Carousel',
      category: 'commerce',
      description: 'Horizontal sneaker models slider with heart wishlist buttons, badge chips (BEST SELLER / NEW), and instant add-to-bag.',
      icon: 'shopping-bag',
      schema: {
        title: { key: 'title', label: 'Section Title', type: 'text', defaultValue: 'POPULAR MODELS' },
        subtitle: { key: 'subtitle', label: 'Subtitle', type: 'text', defaultValue: 'Top customer choices for supreme comfort and runway performance.' },
      },
      defaultSettings: {
        title: 'POPULAR MODELS',
        subtitle: 'Top customer choices for supreme comfort and runway performance.',
      },
    });

    // 37. SneakConnect Feature Stories Grid (Reference Image 4)
    this.register({
      type: 'sneakconnect-feature-grid',
      name: 'SneakConnect Discipline Stories Grid',
      category: 'content',
      description: '4-column discipline story tiles (Running, Basketball, Training, Lifestyle) with dark gradient overlays.',
      icon: 'columns',
      schema: {
        title: { key: 'title', label: 'Section Title', type: 'text', defaultValue: 'COLLECTIONS & ADVANTAGES' },
        subtitle: { key: 'subtitle', label: 'Subtitle', type: 'text', defaultValue: 'More than a store — your partner in sports and athletic culture.' },
      },
      defaultSettings: {
        title: 'COLLECTIONS & ADVANTAGES',
        subtitle: 'More than a store — your partner in sports and athletic culture.',
      },
    });

    // 38. HyperFlux 3D Drop Showcase (Reference Image 3)
    this.register({
      type: 'hyperflux-showcase',
      name: 'HyperFlux Sunset 3D Drop Card',
      category: 'commerce',
      description: 'Sunset burgundy-violet neumorphic glass card with floating illuminated footwear, color swatches, and size pill matrix.',
      icon: 'sparkles',
      schema: {
        brandTag: { key: 'brandTag', label: 'Brand Tag', type: 'text', defaultValue: 'NIKE HYPERFLUX 90+' },
        edition: { key: 'edition', label: 'Edition Label', type: 'text', defaultValue: 'ULTRA ESSENTIAL' },
        price: { key: 'price', label: 'Price', type: 'text', defaultValue: '£120' },
        mainShoeImage: { key: 'mainShoeImage', label: 'Shoe Hero Image', type: 'media', defaultValue: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1200&auto=format&fit=crop' },
      },
      defaultSettings: {
        brandTag: 'NIKE HYPERFLUX 90+',
        edition: 'ULTRA ESSENTIAL',
        price: '£120',
        mainShoeImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1200&auto=format&fit=crop',
      },
    });

    // 39. Pegasus Split Glass Banner (Reference Image 2)
    this.register({
      type: 'pegasus-split-banner',
      name: 'Pegasus Minimalist Split Showcase',
      category: 'hero-banners',
      description: 'Frosted glass split banner with large bold typography, floating sneaker with elevation shadow, and vertical size selector.',
      icon: 'layout',
      schema: {
        title: { key: 'title', label: 'Hero Title', type: 'text', defaultValue: 'NIKE PEGASUS' },
        subtitle: { key: 'subtitle', label: 'Subtitle', type: 'textarea', defaultValue: 'Engineered for responsive cushioning with dual Air Zoom units and breathable engineered mesh.' },
        slogan: { key: 'slogan', label: 'Brand Slogan', type: 'text', defaultValue: 'JUST DO IT' },
        shoeImage: { key: 'shoeImage', label: 'Shoe Image', type: 'media', defaultValue: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?q=80&w=1200&auto=format&fit=crop' },
      },
      defaultSettings: {
        title: 'NIKE PEGASUS',
        subtitle: 'Engineered for responsive cushioning with dual Air Zoom units and breathable engineered mesh.',
        slogan: 'JUST DO IT',
        shoeImage: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?q=80&w=1200&auto=format&fit=crop',
      },
    });

    // 40. Aura Sand Organic Carousel (Reference Image 1)
    this.register({
      type: 'aura-sand-carousel',
      name: 'Aura Sand Elevated Products Carousel',
      category: 'commerce',
      description: 'Warm organic oat/sand product carousel with 3D elevated center card (Best Seller), star ratings, and soft round pagination.',
      icon: 'sliders',
      schema: {
        collectionLabel: { key: 'collectionLabel', label: 'Top Label', type: 'text', defaultValue: 'OUR COLLECTION' },
        title: { key: 'title', label: 'Main Heading', type: 'text', defaultValue: 'Featured Products' },
        subtitle: { key: 'subtitle', label: 'Subtitle', type: 'text', defaultValue: 'Explore our most popular items loved by customers worldwide.' },
      },
      defaultSettings: {
        collectionLabel: 'OUR COLLECTION',
        title: 'Featured Products',
        subtitle: 'Explore our most popular items loved by customers worldwide.',
      },
    });

    // 41. OddaWorld Acoustic Driver & Noise Cancellation Spotlight
    this.register({
      type: 'oddaworld-feature-spotlight',
      name: 'OddaWorld Acoustic Driver Spotlight',
      category: 'content',
      description: 'Interactive cyberpunk hardware breakdown with acoustic frequency visualizer and active noise cancellation metrics.',
      icon: 'zap',
      schema: {
        badge: { key: 'badge', label: 'Badge', type: 'text', defaultValue: 'ACOUSTIC ARCHITECTURE' },
        title: { key: 'title', label: 'Title', type: 'text', defaultValue: 'Engineered for Pure Sonic Precision' },
        subtitle: { key: 'subtitle', label: 'Subtitle', type: 'textarea', defaultValue: 'Custom 50mm dynamic beryllium drivers tuned for studio-grade low distortion and binaural depth.' },
      },
      defaultSettings: {
        badge: 'ACOUSTIC ARCHITECTURE',
        title: 'Engineered for Pure Sonic Precision',
        subtitle: 'Custom 50mm dynamic beryllium drivers tuned for studio-grade low distortion and binaural depth.',
      },
    });

    // 42. Luxe Card Showcase ("Card I Like" Light & Dark Mode)
    this.register({
      type: 'luxe-card-showcase',
      name: 'Luxe Minimalist Card Showcase',
      category: 'commerce',
      description: 'Ultra-aesthetic squircle product cards matching user reference with image pagination dots, floating pill price, poetic caption, Top Pick badges, and full-width pill Add to Cart.',
      icon: 'sparkles',
      schema: {
        title: { key: 'title', label: 'Section Title', type: 'text', defaultValue: 'Curated Atmospheres' },
        subtitle: { key: 'subtitle', label: 'Subtitle', type: 'text', defaultValue: 'For those who crave peace louder than the city. Designed for deep resets.' },
        cardTheme: { key: 'cardTheme', label: 'Card Color Mode', type: 'select', options: [{ label: 'Auto (Dual Mode Showcase)', value: 'both' }, { label: 'Light Luxe Only', value: 'light' }, { label: 'Dark Obsidian Only', value: 'dark' }], defaultValue: 'both' },
      },
      defaultSettings: {
        title: 'Curated Atmospheres',
        subtitle: 'For those who crave peace louder than the city. Designed for deep resets.',
        cardTheme: 'both',
      },
    });

    // 43. Neumorphic Gold Dashboard UI Kit
    this.register({
      type: 'neumorphic-gold-dashboard',
      name: 'Nova Luxe Neumorphic Gold Dashboard',
      category: 'commerce',
      description: 'Luxury dark neumorphic UI suite featuring pill nav with gold search button, destination story card with like/comment pills, ticket booking card, vital pulse monitor (120 bpm), and bonus points transaction card.',
      icon: 'layout',
      schema: {
        headline: { key: 'headline', label: 'Dashboard Headline', type: 'text', defaultValue: 'EXPLORE & TRANSACT' },
        title: { key: 'title', label: 'Main Title', type: 'text', defaultValue: 'Live Luxury Interface Suite' },
      },
      defaultSettings: {
        headline: 'EXPLORE & TRANSACT',
        title: 'Live Luxury Interface Suite',
      },
    });
  }
}
