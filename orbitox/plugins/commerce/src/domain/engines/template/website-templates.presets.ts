import { WebsiteTemplate } from '../../types/template.types';
import { COMMERCE_THEME_PRESETS } from '../theme/theme.presets';
import { ComponentRegistry } from '../component/component.registry';

const getPresetConfig = (id: string) => {
  const preset = COMMERCE_THEME_PRESETS.find((p) => p.id === id);
  return preset ? preset.config : COMMERCE_THEME_PRESETS[0]!.config;
};

const punjabiTheme = getPresetConfig('punjabi-jutti-royal');
const oddaTheme = getPresetConfig('oddaworld-emerald-tech');
const sneakTheme = getPresetConfig('sneakconnect-editorial-luxe');
const hyperfluxTheme = getPresetConfig('hyperflux-sunset-neon');
const pegasusTheme = getPresetConfig('pegasus-mint-glass');
const auraSandTheme = getPresetConfig('aura-sand-organic');
const cyberTheme = getPresetConfig('cyber-neon-streetwear');
const verdeTheme = getPresetConfig('verde-organic-earth');
const novaDarkGoldTheme = getPresetConfig('nova-luxe-dark-gold');

export const WEBSITE_TEMPLATES: WebsiteTemplate[] = [
  // ─── THEME KIT 1: ODDAWORLD EMERALD CYBERTECH (Reference Image 5) ─────────────
  {
    id: 'template_oddaworld_tech',
    name: 'OddaWorld Emerald CyberTech',
    tagline: 'Next-Gen Audio & Smart Electronics Showcase',
    description:
      'Ultra-luxury dark forest emerald & neon lime e-commerce storefront with glowing halo rings, floating pill navigation, category matrix, acoustic driver breakdown, and high-conversion product spotlights.',
    category: 'tech-gadgets',
    categoryLabel: 'Tech & Next-Gen Gadgets',
    tags: ['Audio & Sound', 'Headphones', 'Smartwatches', 'Gaming', 'Cyberpunk', 'Luxury Electronics'],
    previewImage:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1200&auto=format&fit=crop',
    badge: 'Trending',
    author: 'OrbitoX Cyber Lab',
    rating: 4.99,
    reviewCount: 238,
    themePresetId: 'oddaworld-emerald-tech',
    themeConfig: oddaTheme,
    signatureStyle: {
      mood: 'Futuristic Cyber-Luxury & Neon Lime Ambient Glow',
      colors: ['#040C07', '#A3E635', '#0B2316', '#E5A93C'],
      fontPairing: 'Plus Jakarta Sans & Inter',
    },
    features: [
      '⚡ Glowing Neon Halo ambient backdrop with high-end matte hardware render',
      '🛸 Floating Pill Navigation Bar with active blur & quick cart badge',
      '📦 5-Category Matrix (Audio, Smartwatches, Phones, Accessories, Gaming)',
      '🎧 Wireless Earbuds New Arrival spotlight with instant checkout CTA',
      '🔊 Interactive 50mm Beryllium Acoustic Driver & ANC spectrum analyzer',
      '🛡️ 4-Pill Trust Bar (Premium Quality, 1-Yr Warranty, Free Ship, Secure Pay)',
      '📱 100% Ultra-Responsive Mobile & Desktop fluid layout',
    ],
    pages: [
      {
        slug: '/',
        title: 'Home',
        isHome: true,
        sections: [
          ComponentRegistry.createDefaultSection('oddaworld-gadgets-hero', 0, {
            tagline: 'NEXT-GEN GADGETS',
            title: 'Power Up Your World.',
            subtitle: 'Smart. Sleek. Reliable. Gadgets that keep you ahead.',
            primaryCtaText: 'SHOP NOW →',
            primaryCtaLink: '/store/punjabi-jutti/shop',
            secondaryCtaText: 'Watch Collection',
            secondaryCtaLink: '#video',
            productImageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1200&auto=format&fit=crop',
          }),
          ComponentRegistry.createDefaultSection('trust-badges', 1, {
            badge1Title: 'Premium Quality',
            badge1Subtitle: 'Aerospace-grade materials',
            badge2Title: '1 Year Warranty',
            badge2Subtitle: 'Comprehensive hardware cover',
            badge3Title: 'Free Global Shipping',
            badge3Subtitle: 'On all orders above $50',
            badge4Title: 'Secure Payments',
            badge4Subtitle: '256-bit encrypted checkout',
            accentTone: '#A3E635',
          }),
          ComponentRegistry.createDefaultSection('oddaworld-categories', 2, {
            title: 'Shop By Category',
            spotlightBadge: 'NEW ARRIVAL',
            spotlightTitle: 'Small Size. Big Performance.',
            spotlightSubtitle: 'Experience spatial sound like never before with active noise cancellation.',
            spotlightCtaText: 'SHOP NOW →',
          }),
          ComponentRegistry.createDefaultSection('oddaworld-feature-spotlight', 3, {
            badge: 'ACOUSTIC ARCHITECTURE',
            title: 'Engineered for Pure Sonic Precision',
            subtitle: 'Custom 50mm dynamic beryllium drivers tuned for studio-grade low distortion and binaural depth.',
          }),
          ComponentRegistry.createDefaultSection('product-grid', 4, {
            title: 'Bestselling Audio & Gadgets',
            subtitle: 'Engineered for high fidelity and unmatched everyday endurance.',
            limit: 4,
            accentTone: '#A3E635',
          }),
          ComponentRegistry.createDefaultSection('newsletter', 5, {
            title: 'Stay Ahead of the Curve',
            subtitle: 'Subscribe to receive secret gadget drop alerts and 15% off your next purchase.',
            buttonText: 'JOIN INSIDERS',
            backgroundColor: '#08170F',
          }),
          ComponentRegistry.createDefaultSection('footer', 6, {
            copyright: '© 2026 ODDAWORLD Inc. All rights reserved.',
            showPaymentBadges: true,
          }),
        ],
      },
      {
        slug: '/shop',
        title: 'Shop All Gadgets',
        sections: [
          ComponentRegistry.createDefaultSection('header', 0, {
            storeName: 'ODDAWORLD',
            logoText: 'ODDAWORLD',
            tagline: 'NEXT-GEN TECH & AUDIO',
          }),
          ComponentRegistry.createDefaultSection('oddaworld-categories', 1, {
            title: 'Explore All Departments',
          }),
          ComponentRegistry.createDefaultSection('product-grid', 2, {
            title: 'Full Hardware Catalog',
            subtitle: 'Filter by audio specs, driver architecture, and wireless protocols.',
          }),
          ComponentRegistry.createDefaultSection('footer', 3, {
            copyright: '© 2026 ODDAWORLD Inc. All rights reserved.',
          }),
        ],
      },
      {
        slug: '/about',
        title: 'Acoustic Engineering Story',
        sections: [
          ComponentRegistry.createDefaultSection('header', 0, {
            storeName: 'ODDAWORLD',
            logoText: 'ODDAWORLD',
          }),
          ComponentRegistry.createDefaultSection('oddaworld-feature-spotlight', 1, {
            title: 'The OddaWorld Sound Standard',
            subtitle: 'How our Tokyo acoustic lab engineers zero-distortion soundscapes.',
          }),
          ComponentRegistry.createDefaultSection('accordion-features', 2, {
            title: 'Hardware & Driver Specifications',
          }),
          ComponentRegistry.createDefaultSection('footer', 3, {
            copyright: '© 2026 ODDAWORLD Inc. All rights reserved.',
          }),
        ],
      },
    ],
  },

  // ─── THEME KIT 2: SNEAKCONNECT EDITORIAL LUXE (Reference Image 4) ───────────
  {
    id: 'template_sneakconnect_luxe',
    name: 'SneakConnect Editorial Luxe',
    tagline: 'High-Fashion Editorial Sportswear & Footwear Retail',
    description:
      'Magazine-style athletic e-commerce storefront with integrated search bar hero, customer trust proof overlays (10k+ reviews), popular models carousel with wishlist hearts, and 4-column discipline story tiles.',
    category: 'athletic-shoes',
    categoryLabel: 'Sportswear & Athletic Shoes',
    tags: ['Sneakers', 'Sportswear', 'Athletic', 'Running', 'Street Fashion', 'Editorial'],
    previewImage:
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200&auto=format&fit=crop',
    badge: 'Editor Choice',
    author: 'OrbitoX Editorial Studio',
    rating: 4.97,
    reviewCount: 312,
    themePresetId: 'sneakconnect-editorial-luxe',
    themeConfig: sneakTheme,
    signatureStyle: {
      mood: 'Crisp Editorial Magazine & Bold Athletic Typography',
      colors: ['#0F172A', '#F8FAFC', '#2563EB', '#10B981'],
      fontPairing: 'Plus Jakarta Sans & Inter',
    },
    features: [
      '📰 High-Fashion Editorial Hero with integrated pill search bar',
      '⭐ Customer Trust Overlay Badge with real customer avatars & 10k+ reviews',
      '👟 Horizontal Popular Models slider with heart wishlist and instant cart',
      '🏆 4-Column Discipline Grid (Running, Basketball, Training, Lifestyle)',
      '✉️ Minimalist Newsletter subscription banner with discount hook',
      '⚡ Complete modern e-commerce navigation header & footer',
    ],
    pages: [
      {
        slug: '/',
        title: 'Home',
        isHome: true,
        sections: [
          ComponentRegistry.createDefaultSection('announcement-bar', 0, {
            text: '🔥 FREE EXPRESS DELIVERY ON ALL SNEAKER ORDERS OVER $100 • 30-DAY HASSLE-FREE RETURNS',
            backgroundColor: '#0F172A',
            textColor: '#FFFFFF',
            link: '/store/punjabi-jutti/shop',
          }),
          ComponentRegistry.createDefaultSection('sneakconnect-editorial-hero', 1, {
            title: 'SPORT FOOTWEAR FOR MOTION & STYLE',
            subtitle: 'Premium athletic footwear for every ambitious goal. Find your pair and move with velocity.',
            searchPlaceholder: 'Search by model, brand, or category...',
            trustCount: '10 000+ satisfied athletes',
            heroImageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200&auto=format&fit=crop',
          }),
          ComponentRegistry.createDefaultSection('sneakconnect-popular-models', 2, {
            title: 'POPULAR MODELS',
            subtitle: 'Top customer choices for supreme comfort and runway performance.',
          }),
          ComponentRegistry.createDefaultSection('sneakconnect-feature-grid', 3, {
            title: 'COLLECTIONS & ADVANTAGES',
            subtitle: 'More than a store — your partner in sports and athletic culture.',
          }),
          ComponentRegistry.createDefaultSection('trust-badges', 4, {
            badge1Title: 'Verified Authentic',
            badge1Subtitle: 'Direct from brand manufacturers',
            badge2Title: 'Global Express',
            badge2Subtitle: 'Doorstep dispatch in 24 hours',
            badge3Title: 'Easy Size Swaps',
            badge3Subtitle: 'Free 30-day returns',
            badge4Title: 'Athlete Support',
            badge4Subtitle: 'Expert shoe fitting advice',
          }),
          ComponentRegistry.createDefaultSection('footer', 5, {
            copyright: '© 2026 SNEAK CONNECT. Premium Athletic Goods.',
            showPaymentBadges: true,
          }),
        ],
      },
      {
        slug: '/shop',
        title: 'Shop All Footwear',
        sections: [
          ComponentRegistry.createDefaultSection('header', 0, {
            storeName: 'SNEAK CONNECT',
          }),
          ComponentRegistry.createDefaultSection('sneakconnect-popular-models', 1, {
            title: 'All Seasonal Releases',
          }),
          ComponentRegistry.createDefaultSection('product-grid', 2, {
            title: 'Complete Footwear Collection',
          }),
          ComponentRegistry.createDefaultSection('footer', 3, {
            copyright: '© 2026 SNEAK CONNECT.',
          }),
        ],
      },
      {
        slug: '/lookbook',
        title: 'Editorial Lookbook',
        sections: [
          ComponentRegistry.createDefaultSection('header', 0, {
            storeName: 'SNEAK CONNECT',
          }),
          ComponentRegistry.createDefaultSection('lookbook-mosaic', 1, {
            title: 'Motion & Streetwear In Real Life',
          }),
          ComponentRegistry.createDefaultSection('sneakconnect-popular-models', 2),
          ComponentRegistry.createDefaultSection('footer', 3),
        ],
      },
    ],
  },

  // ─── THEME KIT 3: HYPERFLUX SUNSET NEON (Reference Image 3) ────────────────
  {
    id: 'template_hyperflux_sunset',
    name: 'HyperFlux Sunset 3D Drop',
    tagline: 'Futuristic Streetwear & Limited Edition Shoe Drops',
    description:
      'Twilight sunset burgundy-to-violet neumorphic glass cards with floating illuminated sneakers, "People Also Viewed" side cards, dual color swatches, and size pill grid.',
    category: 'streetwear',
    categoryLabel: 'Streetwear & Drop Stores',
    tags: ['Futuristic', 'Sneaker Drop', 'Neumorphic', 'Glassmorphic', 'Limited Edition'],
    previewImage:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1200&auto=format&fit=crop',
    badge: 'New Release',
    author: 'OrbitoX Streetwear Division',
    rating: 4.95,
    reviewCount: 189,
    themePresetId: 'hyperflux-sunset-neon',
    themeConfig: hyperfluxTheme,
    signatureStyle: {
      mood: 'Twilight Sunset & Neumorphic 3D Illuminated Floating Drops',
      colors: ['#0F0715', '#E11D48', '#2E1065', '#F97316'],
      fontPairing: 'Plus Jakarta Sans & Inter',
    },
    features: [
      '🔥 3D Floating Illuminated Sneaker Card with multi-perspective thumbnails',
      '🎨 Dual-Tone Color Swatches with instant live preview',
      '📐 Interactive Size Selector Grid (7, 7.5, 8, 8.5, 9, 9.5)',
      '👀 "People Also Viewed" companion cards overlay',
      '🛍️ High-Contrast Coral ADD TO CART action button',
      '⚡ Responsive countdown ticker for limited drop hype',
    ],
    pages: [
      {
        slug: '/',
        title: 'Home',
        isHome: true,
        sections: [
          ComponentRegistry.createDefaultSection('announcement-bar', 0, {
            text: '⚡ EXCLUSIVE HYPERFLUX 90+ DROP LIVE • ONLY 500 PAIRS WORLDWIDE',
            backgroundColor: '#E11D48',
            textColor: '#FFFFFF',
            link: '/store/punjabi-jutti/shop',
          }),
          ComponentRegistry.createDefaultSection('hyperflux-showcase', 1, {
            brandTag: 'NIKE HYPERFLUX 90+',
            edition: 'ULTRA ESSENTIAL',
            price: '£120',
            mainShoeImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1200&auto=format&fit=crop',
          }),
          ComponentRegistry.createDefaultSection('countdown', 2, {
            title: 'Midnight Tokyo Drop Countdown',
            subtitle: 'Vault closes permanently once the allocation counter reaches zero.',
            accentTone: '#E11D48',
          }),
          ComponentRegistry.createDefaultSection('product-grid', 3, {
            title: 'Limited Release Vault',
            subtitle: 'Hand-inspected deadstock sneakers available while stock lasts.',
            limit: 4,
            accentTone: '#E11D48',
          }),
          ComponentRegistry.createDefaultSection('footer', 4, {
            copyright: '© 2026 HYPERFLUX Lab. All rights reserved.',
            showPaymentBadges: true,
          }),
        ],
      },
      {
        slug: '/shop',
        title: 'Deadstock Releases',
        sections: [
          ComponentRegistry.createDefaultSection('header', 0, {
            storeName: 'HYPERFLUX',
          }),
          ComponentRegistry.createDefaultSection('hyperflux-showcase', 1),
          ComponentRegistry.createDefaultSection('product-grid', 2, {
            title: 'All Vault Archives',
          }),
          ComponentRegistry.createDefaultSection('footer', 3),
        ],
      },
    ],
  },

  // ─── THEME KIT 4: PEGASUS SLATE & MINT GLASS (Reference Image 2) ───────────
  {
    id: 'template_pegasus_mint',
    name: 'Pegasus Slate & Mint Glass',
    tagline: 'Minimalist Athletic Glass & Technical Footwear',
    description:
      'Sleek frosted glass split banner with deep sage backdrop, giant sans-serif title, floating cutout runner, vertical size pills (1-4+), and "JUST DO IT" branding.',
    category: 'athletic-shoes',
    categoryLabel: 'Sportswear & Athletic Shoes',
    tags: ['Athletic', 'Running', 'Minimal Glass', 'Frosted UI', 'Performance'],
    previewImage:
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?q=80&w=1200&auto=format&fit=crop',
    badge: 'Trending',
    author: 'OrbitoX Performance Lab',
    rating: 4.96,
    reviewCount: 245,
    themePresetId: 'pegasus-mint-glass',
    themeConfig: pegasusTheme,
    signatureStyle: {
      mood: 'Slate Mint Frosted Glass & Minimalist Athletic Stride',
      colors: ['#B5CAD4', '#0F766E', '#134E4A', '#0F172A'],
      fontPairing: 'Plus Jakarta Sans & Inter',
    },
    features: [
      '🏃 Frosted Glass Split Banner with deep sage overlay',
      '👟 Floating Cutout Sneaker with dynamic directional drop shadow',
      '🔢 Vertical Size Selector Numbered Pills (1, 2, 3, 4, +)',
      '🎯 Iconic "JUST DO IT" minimal typography badge',
      '⚡ Dual Air Zoom technical spec breakdown accordion',
      '📱 Touch-optimized mobile layout with glassmorphism',
    ],
    pages: [
      {
        slug: '/',
        title: 'Home',
        isHome: true,
        sections: [
          ComponentRegistry.createDefaultSection('pegasus-split-banner', 0, {
            title: 'NIKE PEGASUS',
            subtitle: 'Engineered for responsive cushioning with dual Air Zoom units and breathable engineered mesh for everyday runners.',
            slogan: 'JUST DO IT',
            shoeImage: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?q=80&w=1200&auto=format&fit=crop',
          }),
          ComponentRegistry.createDefaultSection('product-grid', 1, {
            title: 'Performance Running Lineup',
            subtitle: 'Engineered to support every kilometre of your marathon training.',
            limit: 4,
            accentTone: '#0F766E',
          }),
          ComponentRegistry.createDefaultSection('accordion-features', 2, {
            title: 'Engineered Cushioning & Aerodynamics',
          }),
          ComponentRegistry.createDefaultSection('footer', 3, {
            copyright: '© 2026 NIKE PEGASUS Edition. All rights reserved.',
            showPaymentBadges: true,
          }),
        ],
      },
      {
        slug: '/shop',
        title: 'Performance Catalog',
        sections: [
          ComponentRegistry.createDefaultSection('header', 0, {
            storeName: 'PEGASUS',
          }),
          ComponentRegistry.createDefaultSection('pegasus-split-banner', 1),
          ComponentRegistry.createDefaultSection('product-grid', 2, {
            title: 'Road, Trail & Track Runners',
          }),
          ComponentRegistry.createDefaultSection('footer', 3),
        ],
      },
    ],
  },

  // ─── THEME KIT 5: AURA SAND MINIMAL ORGANIC (Reference Image 1) ─────────────
  {
    id: 'template_aura_sand_organic',
    name: 'Aura Sand Minimal Organic',
    tagline: 'Warm Oat & Linen Minimalist Lifestyle E-Commerce',
    description:
      'Warm organic oat and sand aesthetic with 3D elevated product carousel cards, center "Best Seller" spotlight, star ratings, and circular soft pagination.',
    category: 'minimal-organic',
    categoryLabel: 'Minimalist & Lifestyle',
    tags: ['Minimalist', 'Organic', 'Warm Beige', 'Lifestyle', 'Clean Aesthetic', 'E-Commerce'],
    previewImage:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1200&auto=format&fit=crop',
    badge: 'Best Seller',
    author: 'OrbitoX Nordic Studio',
    rating: 4.98,
    reviewCount: 420,
    themePresetId: 'aura-sand-organic',
    themeConfig: auraSandTheme,
    signatureStyle: {
      mood: 'Warm Organic Oat, Sand Linen & Elevated 3D Cards',
      colors: ['#FAF6F0', '#A37D4E', '#EAE1D5', '#292524'],
      fontPairing: 'Playfair Display & Plus Jakarta Sans',
    },
    features: [
      '🌿 5-Card Product Carousel with center 3D elevated card',
      '⭐ Real Star Rating indicators with review volume badges',
      '🏷️ Soft Category Pill Badges (NEW, TRENDING, BEST SELLER, POPULAR)',
      '🛒 Warm Beige Add to Cart button with instant alert',
      '⚪ Soft Pill Pagination indicators with active states',
      '✨ Clean Scandinavian-Japanese fusion typography',
    ],
    pages: [
      {
        slug: '/',
        title: 'Home',
        isHome: true,
        sections: [
          ComponentRegistry.createDefaultSection('announcement-bar', 0, {
            text: '✨ COMPLIMENTARY CARBON-NEUTRAL DELIVERY ON ORDERS OVER $75',
            backgroundColor: '#A37D4E',
            textColor: '#FFFFFF',
          }),
          ComponentRegistry.createDefaultSection('aura-sand-carousel', 1, {
            collectionLabel: 'OUR COLLECTION',
            title: 'Featured Products',
            subtitle: 'Explore our most popular items loved by conscious customers worldwide.',
          }),
          ComponentRegistry.createDefaultSection('trust-badges', 2, {
            badge1Title: '100% Sustainable',
            badge1Subtitle: 'Ethically sourced organic materials',
            badge2Title: 'Plastic Free',
            badge2Subtitle: 'Recycled zero-waste packaging',
            badge3Title: 'Carbon Neutral',
            badge3Subtitle: 'Offset on every single delivery',
            badge4Title: 'Lifetime Care',
            badge4Subtitle: 'Repair and reuse promise',
            accentTone: '#A37D4E',
          }),
          ComponentRegistry.createDefaultSection('product-grid', 3, {
            title: 'Conscious Everyday Essentials',
            subtitle: 'Designed for calm spaces and intentional living.',
            limit: 4,
            accentTone: '#A37D4E',
          }),
          ComponentRegistry.createDefaultSection('footer', 4, {
            copyright: '© 2026 AURA SAND ATELIER. Minimal Living.',
            showPaymentBadges: true,
          }),
        ],
      },
      {
        slug: '/shop',
        title: 'Conscious Collection',
        sections: [
          ComponentRegistry.createDefaultSection('header', 0, {
            storeName: 'AURA SAND',
          }),
          ComponentRegistry.createDefaultSection('aura-sand-carousel', 1),
          ComponentRegistry.createDefaultSection('product-grid', 2, {
            title: 'Curated Goods & Ceramics',
          }),
          ComponentRegistry.createDefaultSection('footer', 3),
        ],
      },
    ],
  },

  // ─── THEME KIT 6: MAHARAJA ROYAL PUNJABI JUTTI ──────────────────────────────
  {
    id: 'template_punjabi_jutti_royal',
    name: 'Maharaja Royal Punjabi Jutti',
    tagline: 'Opulent Royal Heritage Footwear & Bridal Couture',
    description:
      'Ultra-luxury royal gold & crimson zari aesthetic celebrating authentic handcrafted Punjabi juttis with bite-free memory foam comfort, artisan heritage storytelling, and bridal lookbook.',
    category: 'ethnic-wear',
    categoryLabel: 'Heritage & Couture',
    tags: ['Luxury Ethnic', 'Royal Punjabi Jutti', 'Bridal Wear', 'Handmade Zardozi', 'Artisan Craft'],
    previewImage:
      'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1200&auto=format&fit=crop',
    badge: 'Featured',
    author: 'OrbitoX Couture Labs',
    rating: 5.0,
    reviewCount: 512,
    themePresetId: 'punjabi-jutti-royal',
    themeConfig: punjabiTheme,
    signatureStyle: {
      mood: 'Royal Mughal Opulence & Handcrafted Gold Zari Zardozi',
      colors: ['#0A0B0E', '#E5A93C', '#7A1113', '#F59E0B'],
      fontPairing: 'Playfair Display & Plus Jakarta Sans',
    },
    features: [
      '👑 Royal Gold & Deep Crimson Zari aesthetic with gold metallic halos',
      '🥿 100% Bite-Free Leather Guarantee badge strip & memory foam soles',
      '👳 Ancestral Artisan Heritage story timeline with Patiala master cobblers',
      '👰 Royal Bridal & Festive Lookbook Mosaic with high-resolution models',
      '💬 Instant WhatsApp VIP Concierge for bespoke wedding matching colors',
      '✨ 5 Full E-Commerce pages (Home, Artisans, Lookbook, Shop, Product Detail)',
    ],
    pages: [
      {
        slug: '/',
        title: 'Home',
        isHome: true,
        sections: [
          ComponentRegistry.createDefaultSection('announcement-bar', 0, {
            text: '👑 WORLDWIDE EXPRESS SHIPPING • 100% BITE-FREE LEATHER GUARANTEE • CODE: ROYAL15',
            backgroundColor: '#7A1113',
            textColor: '#E5A93C',
          }),
          ComponentRegistry.createDefaultSection('header', 1, {
            storeName: 'AURA LUXURY ATELIER',
            logoText: 'AURA ATELIER',
            tagline: 'HANDCRAFTED PUNJABI JUTTI',
            sticky: true,
            showSearch: true,
            showCart: true,
            showWishlist: true,
          }),
          ComponentRegistry.createDefaultSection('hero', 2, {
            badge: 'ROYAL HERITAGE COLLECTION 2026',
            title: 'Pure Gold Zardozi & Velvet Craftsmanship',
            subtitle: 'Hand-embroidered by 4th-generation master artisans of Patiala. Engineered with double-padded memory foam soles for zero shoe bites on your wedding day.',
            primaryButtonText: 'Explore Royal Juttis',
            primaryButtonLink: '/store/punjabi-jutti/shop',
            secondaryButtonText: 'Artisan Story',
            secondaryButtonLink: '/store/punjabi-jutti/artisans',
            overlayOpacity: 55,
            imageUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1200&auto=format&fit=crop',
          }),
          ComponentRegistry.createDefaultSection('trust-badges', 3, {
            badge1Title: '100% Bite-Free Leather',
            badge1Subtitle: 'Double-padded memory foam sole',
            badge2Title: 'Handmade by Artisans',
            badge2Subtitle: 'Patiala heritage needlework',
            badge3Title: 'Express Global Shipping',
            badge3Subtitle: '4-Day delivery worldwide',
            badge4Title: 'Easy Doorstep Exchange',
            badge4Subtitle: 'Zero questions asked',
          }),
          ComponentRegistry.createDefaultSection('product-grid', 4, {
            title: 'Royal Bridal & Festive Bestsellers',
            subtitle: 'Worn by celebrity brides and royalty across the globe.',
            limit: 4,
          }),
          ComponentRegistry.createDefaultSection('brand-story-timeline', 5, {
            title: 'Four Generations of Needlework Mastery',
            subtitle: 'Preserving the centuries-old art of Dabka, Tilla, and Phulkari embroidery.',
          }),
          ComponentRegistry.createDefaultSection('testimonials', 6, {
            title: 'Royal Bride Testimonials',
            subtitle: 'Real stories from brides who danced all night with zero pain.',
          }),
          ComponentRegistry.createDefaultSection('footer', 7, {
            copyright: '© 2026 AURA LUXURY ATELIER. All rights reserved.',
          }),
        ],
      },
      {
        slug: '/artisans',
        title: 'Artisans of Punjab',
        sections: [
          ComponentRegistry.createDefaultSection('header', 0, { storeName: 'AURA ATELIER' }),
          ComponentRegistry.createDefaultSection('hero', 1, {
            title: 'The Master Hands Behind Every Stitch',
            subtitle: 'Meet the 4th-generation artisan families in Patiala keeping royal heritage alive.',
            imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=1200&auto=format&fit=crop',
          }),
          ComponentRegistry.createDefaultSection('brand-story-timeline', 2),
          ComponentRegistry.createDefaultSection('trust-badges', 3),
          ComponentRegistry.createDefaultSection('footer', 4),
        ],
      },
      {
        slug: '/lookbook',
        title: 'Bridal Lookbook',
        sections: [
          ComponentRegistry.createDefaultSection('header', 0, { storeName: 'AURA ATELIER' }),
          ComponentRegistry.createDefaultSection('lookbook-mosaic', 1, {
            title: 'Royal Wedding & Festive Lookbook 2026',
          }),
          ComponentRegistry.createDefaultSection('product-carousel', 2),
          ComponentRegistry.createDefaultSection('footer', 3),
        ],
      },
    ],
  },

  // ─── THEME KIT 7: KURO TOKYO BRUTALIST STREETWEAR ───────────────────────────
  {
    id: 'template_cyber_streetwear',
    name: 'Kuro Tokyo Brutalist',
    tagline: 'High-Impact Brutalist Streetwear & Scarcity Drops',
    description:
      'High-contrast volt lime & pitch-black brutalist drop store with live countdown tickers, scarce quantities, and lookbook reveals.',
    category: 'streetwear',
    categoryLabel: 'Streetwear & Drop Stores',
    tags: ['Brutalist', 'Streetwear', 'Drop Model', 'Tokyo Fashion', 'Scarcity'],
    previewImage:
      'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=1200&auto=format&fit=crop',
    badge: 'Trending',
    author: 'OrbitoX Streetwear Division',
    rating: 4.93,
    reviewCount: 284,
    themePresetId: 'cyber-neon-streetwear',
    themeConfig: cyberTheme,
    signatureStyle: {
      mood: 'Brutalist High-Contrast Tokyo Night Drops & Scarcity',
      colors: ['#000000', '#A3E635', '#111111', '#FFFFFF'],
      fontPairing: 'Plus Jakarta Sans & Inter',
    },
    features: [
      '⚡ High-voltage Lime on Pitch Black Brutalist typography',
      '⏱️ Live Countdown Timer for scarce season drops',
      '🔥 Lookbook Mosaic for oversized hoodies and tactical gear',
    ],
    pages: [
      {
        slug: '/',
        title: 'Home',
        isHome: true,
        sections: [
          ComponentRegistry.createDefaultSection('announcement-bar', 0, {
            text: '⚡ SEASON 04 DROP 02 LIVE • WORLDWIDE SHIPPING • NO RESTOCKS',
            backgroundColor: '#A3E635',
            textColor: '#000000',
          }),
          ComponentRegistry.createDefaultSection('hero', 1, {
            title: 'KURO TOKYO // SEASON 04',
            subtitle: 'Engineered heavyweight fleece and tactical technical outerwear. Limited allocation per region.',
            primaryButtonText: 'Access The Drop',
            primaryButtonLink: '/store/punjabi-jutti/shop',
            imageUrl: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=1200&auto=format&fit=crop',
          }),
          ComponentRegistry.createDefaultSection('countdown', 2, {
            title: 'Season 04 Drop Closes In',
            accentTone: '#A3E635',
          }),
          ComponentRegistry.createDefaultSection('product-grid', 3, {
            title: 'Active Allocations',
            accentTone: '#A3E635',
          }),
          ComponentRegistry.createDefaultSection('footer', 4),
        ],
      },
    ],
  },

  // ─── THEME KIT 8: VERDE BOTANICA CLEAN SKINCARE ─────────────────────────────
  {
    id: 'template_verde_skincare',
    name: 'Verde Botanica Clean Skincare',
    tagline: 'Earth Sage & Terracotta Organic Apothecary',
    description:
      'Gentle earthy sage and terracotta aesthetic with botanical breakdown accordions, clinical trial proof, and sustainable apothecary.',
    category: 'beauty-wellness',
    categoryLabel: 'Clean Beauty & Wellness',
    tags: ['Organic Skincare', 'Clean Beauty', 'Apothecary', 'Dermatologist Tested'],
    previewImage:
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=1200&auto=format&fit=crop',
    badge: 'Popular',
    author: 'OrbitoX Wellness Collective',
    rating: 4.95,
    reviewCount: 340,
    themePresetId: 'verde-organic-earth',
    themeConfig: verdeTheme,
    signatureStyle: {
      mood: 'Calm Sage, Terracotta & Organic Botanicals',
      colors: ['#0A0F0D', '#34D399', '#15251F', '#D1FAE5'],
      fontPairing: 'Playfair Display & Plus Jakarta Sans',
    },
    features: [
      '🍃 Earth Sage, Terracotta & Forest green calm palette',
      '🔬 Clinical Trial Proof and Botanical Breakdown Tabs',
      '🌱 100% Vegan, Cruelty-Free and Dermatologist Approved Badges',
    ],
    pages: [
      {
        slug: '/',
        title: 'Home',
        isHome: true,
        sections: [
          ComponentRegistry.createDefaultSection('announcement-bar', 0, {
            text: '🌿 100% COLD-PRESSED BOTANICALS • DERMATOLOGIST TESTED • FREE SAMPLES',
            backgroundColor: '#064E3B',
            textColor: '#A7F3D0',
          }),
          ComponentRegistry.createDefaultSection('hero', 1, {
            title: 'Pure Botanical Elixirs for Radiant Skin',
            subtitle: 'Clinically proven cold-pressed barrier serums formulated with wildcrafted alpine adaptogens.',
            primaryButtonText: 'Explore Apothecary',
            imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=1200&auto=format&fit=crop',
          }),
          ComponentRegistry.createDefaultSection('trust-badges', 2, {
            badge1Title: '100% Cold Pressed',
            badge2Title: 'Dermatologist Tested',
            badge3Title: 'Zero Synthetic Fragrance',
            badge4Title: '100% Recyclable Glass',
          }),
          ComponentRegistry.createDefaultSection('product-grid', 3, {
            title: 'Bestselling Formulations',
          }),
          ComponentRegistry.createDefaultSection('footer', 4),
        ],
      },
    ],
  },
  // ─── THEME KIT 9: NOVA LUXE DARK GOLD & DEEP BLUE NIGHTS (User Reference Images 1, 2, 3) ─────────────
  {
    id: 'template_nova_luxe_gold',
    name: 'Nova Luxe Neumorphic Gold',
    tagline: 'Dark Neumorphic Gold UI Suite & Deep Blue Nights Squircle Cards',
    description:
      'Ultra-aesthetic dark neumorphic storefront featuring gold-accented search pills, Bangkok luxury destination cards, flight booking widgets ($420), 120 bpm equalizer bars, and Deep Blue Nights squircle cards.',
    category: 'tech-gadgets',
    categoryLabel: 'Luxury & Lifestyle Tech',
    tags: ['Neumorphic', 'Dark Gold', 'Travel Luxury', 'Squircle Cards', 'Minimalist UI', 'High Aesthetics'],
    previewImage:
      'https://images.unsplash.com/photo-1508009603885-50cf7c579365?q=80&w=1200&auto=format&fit=crop',
    badge: 'Trending',
    author: 'OrbitoX Neumorphic Lab',
    rating: 5.0,
    reviewCount: 388,
    themePresetId: 'nova-luxe-dark-gold',
    themeConfig: novaDarkGoldTheme,
    signatureStyle: {
      mood: 'Dark Neumorphic Squircles & Glowing Warm Sun Gold Accents',
      colors: ['#121216', '#EAB308', '#22222D', '#FDE047'],
      fontPairing: 'Plus Jakarta Sans & Inter',
    },
    features: [
      '🛸 Sleek Top Pill Navigation Bar with integrated gold search button & avatar',
      '🏖️ Bangkok Luxury Travel & Story card with like/comment pills & quick post',
      '✈️ Flight Booking widget ($420 SVO->BKK) with squircle OK button',
      '📊 120 bpm Vital Pulse monitor with animated vertical gold equalizer bars',
      '💳 Bonus Points & Transaction table widget with token badges',
      '🌌 "Deep Blue Nights" Minimalist Dual-Mode Squircle Cards with scarcity pills',
    ],
    pages: [
      {
        slug: '/',
        title: 'Home',
        isHome: true,
        sections: [
          ComponentRegistry.createDefaultSection('neumorphic-gold-dashboard', 0, {
            headline: 'EXPLORE & TRANSACT',
            title: 'Live Luxury Interface Suite',
          }),
          ComponentRegistry.createDefaultSection('luxe-card-showcase', 1, {
            title: 'Card I like',
            subtitle: 'For those who crave peace louder than the city. This view isn\'t just scenery, it\'s a whole reset.',
          }),
          ComponentRegistry.createDefaultSection('product-grid', 2, {
            title: 'Curated Luxury Artifacts',
            subtitle: 'Hand-inspected limited editions crafted with obsession.',
            limit: 4,
            accentTone: '#EAB308',
          }),
          ComponentRegistry.createDefaultSection('footer', 3, {
            copyright: '© 2026 NOVA LUXE NEUMORPHIC. All rights reserved.',
          }),
        ],
      },
      {
        slug: '/shop',
        title: 'Curated Catalog',
        sections: [
          ComponentRegistry.createDefaultSection('header', 0, { storeName: 'NOVA LUXE' }),
          ComponentRegistry.createDefaultSection('luxe-card-showcase', 1),
          ComponentRegistry.createDefaultSection('product-grid', 2, {
            title: 'All Luxury Destinations & Artifacts',
          }),
          ComponentRegistry.createDefaultSection('footer', 3),
        ],
      },
    ],
  },
];
