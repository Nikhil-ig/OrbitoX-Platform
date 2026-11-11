export interface TemplateSectionConfig {
  id: string;
  type: 'hero' | 'featured_dishes' | 'story' | 'menu_grid' | 'hours_contact' | 'testimonials' | 'cta_banner';
  title: string;
  subtitle?: string;
  content?: string;
  imageUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  visible: boolean;
  order: number;
  customProps?: Record<string, any>;
}

export interface TemplateComponentNode {
  id: string;
  type: string;
  name: string;
  layout:
    | 'flex-row'
    | 'flex-col'
    | 'grid-2'
    | 'grid-3'
    | 'grid-4'
    | 'split-asymmetric'
    | 'dense-stack'
    | 'editorial-timeline'
    | 'full-width'
    | 'overflow-row'
    | 'horizontal-spread';
  props?: Record<string, any>;
  children?: TemplateComponentNode[];
}

export interface TemplateCompositionSpec {
  pageArchitecture:
    | 'editorial-tasting-split'
    | 'scandinavian-spec-sheet'
    | 'tactile-stepper-cards'
    | 'cyber-izakaya-matrix'
    | 'rustic-trattoria-story'
    | 'kanji-menu-board'
    | 'split-asymmetric'
    | 'horizontal-ledger'
    | 'tactile-vitrine-grid'
    | 'dual-lane-market'
    | 'centered-editorial'
    | 'timber-plank-board'
    | 'marketplace-portal-feed'
    | 'express-split-ordering'
    | 'quick-commerce-shelf';
  heroArchitecture:
    | 'split-asymmetric'
    | 'minimal-harvest-header'
    | 'warm-carousel-showcase'
    | 'neon-banner-dual'
    | 'woodfired-hearth-story'
    | 'vertical-scroll-manifesto'
    | 'location-discovery-banner'
    | 'compact-speed-header'
    | 'dark-store-eta-banner';
  menuLayoutPattern:
    | 'course-progression-timeline'
    | 'two-column-harvest-sheet'
    | 'tactile-card-grid'
    | 'dual-stall-bump-lanes'
    | 'family-combo-story'
    | 'vertical-broth-checklist'
    | 'multi-stall-directory-grid'
    | 'frictionless-card-stack'
    | 'high-density-sku-grid';
  cardComposition:
    | 'editorial-sommelier'
    | 'mono-clean-spec'
    | 'tactile-stepper'
    | 'cyber-neon-bump'
    | 'trattoria-story-card'
    | 'shokunin-woodcut'
    | 'marketplace-restaurant-card'
    | 'speed-add-stepper-card'
    | 'grocery-sku-card';
  navigationPattern:
    | 'floating-dock'
    | 'monochrome-top-rail'
    | 'category-pill-bar'
    | 'neon-sticky-matrix'
    | 'story-anchor-strip'
    | 'vertical-zen-tabs'
    | 'cuisine-chip-rail'
    | 'left-rail-and-subcategories';
  cartPresentation:
    | 'sommelier-drawer'
    | 'minimal-bottom-bar'
    | 'tactile-floating-capsule'
    | 'neon-slide-sheet'
    | 'rustic-table-order-sheet'
    | 'zen-order-tray'
    | 'sticky-marketplace-drawer'
    | 'floating-capsule-drawer'
    | 'grocery-basket-sidebar';
  responsiveRules: {
    desktopColumns: number;
    tabletColumns: number;
    mobileColumns: number;
    layoutBehavior: string;
  };
  componentTree: TemplateComponentNode[];
}

export type ExperienceType =
  | 'restaurant_storefront'
  | 'food_marketplace'
  | 'food_ordering'
  | 'quick_commerce';

export type DeploymentScope =
  | 'single_restaurant'
  | 'restaurant_group'
  | 'multi_merchant_marketplace'
  | 'quick_commerce_dark_store';

export interface ExperienceCapabilityModel {
  experienceType: ExperienceType;
  compatibleScope: DeploymentScope;
  requiresTableContext: boolean;
  catalogType: 'restaurant_menu' | 'multi_restaurant_menus' | 'grocery_catalog';
  supportsMultiMerchant: boolean;
  supportsInventoryQuantities: boolean;
  supportsSubstitutionWorkflow: boolean;
  supportsDeliveryPincodeCheck: boolean;
}

export interface RestaurantPartner {
  id: string;
  name: string;
  tagline: string;
  cuisine: string[];
  rating: number;
  reviewCount: number;
  deliveryTimeMin: number;
  deliveryTimeMax: number;
  priceForTwoMinor: number;
  featuredOffer?: string;
  heroImage: string;
  city: string;
  isPureVeg?: boolean;
  menuItemIds: string[];
}

export interface GrocerySkuItem {
  id: string;
  name: string;
  brand: string;
  category:
    | 'Fresh Vegetables'
    | 'Fresh Fruits'
    | 'Dairy, Bread & Eggs'
    | 'Pantry Staples'
    | 'Cold Drinks & Juices'
    | 'Instant Food & Snacks'
    | 'Personal Care';
  packSize: string;
  mrpMinor: number;
  sellingPriceMinor: number;
  unitPriceDescription: string;
  stockQuantity: number;
  imageUrl: string;
  isOrganic?: boolean;
  badge?: string;
}

export type SubstitutionPolicy =
  | 'ASK_BEFORE_SUBSTITUTE'
  | 'ALLOW_STORE_REPLACEMENT'
  | 'DO_NOT_SUBSTITUTE';

export interface GroceryOrderItem {
  skuId: string;
  name: string;
  brand: string;
  packSize: string;
  quantity: number;
  unitPriceMinor: number;
  subtotalMinor: number;
}

export interface MarketplaceTemplate {
  id: string;
  slug: string;
  name: string;
  category:
    | 'Modern Minimal'
    | 'Cafe & Artisan Coffee'
    | 'Haute Gastronomy'
    | 'Neon Street Food'
    | 'Trattoria & Italian'
    | 'Asian & Ramen'
    | 'Bakery & Dessert'
    | 'Fast Casual'
    | 'Editorial Dining'
    | 'Food Discovery Marketplace'
    | 'Speed-First Food Ordering'
    | 'Grocery & Quick Commerce';
  experienceType?: ExperienceType;
  capabilities?: ExperienceCapabilityModel;
  targetBusinessModel?: string;
  supportedScopes?: DeploymentScope[];
  description: string;
  tagline: string;
  version: string;
  author: string;
  tierRequired: 'starter' | 'growth' | 'pro' | 'enterprise';
  priceLabel: string;
  accentColor: string;
  fontHeading: string;
  fontBody: string;
  previewThumbnail: string;
  previewHero: string;
  supportedComponents: string[];
  composition: TemplateCompositionSpec;
  defaultTokens: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    surfaceColor: string;
    textColor: string;
    mutedColor: string;
    fontFamilyHeading: string;
    fontFamilyBody: string;
    borderRadius: string;
    cardStyle:
      | 'flat'
      | 'bordered'
      | 'glass'
      | 'elevated'
      | 'tactile'
      | 'asymmetric-editorial'
      | 'horizontal-ledger'
      | 'tactile-vitrine'
      | 'high-contrast-ticket'
      | 'framed-rustic'
      | 'cedar-slat';
    heroHeight: string;
  };
  defaultSections: TemplateSectionConfig[];
}

export const DEFAULT_TEMPLATES: MarketplaceTemplate[] = [
  {
    id: 'tmpl_haute_gastronomy',
    slug: 'haute-gastronomy',
    name: 'Atelier Étoile Noir',
    category: 'Haute Gastronomy',
    description: '50/50 Asymmetric editorial tasting progression with sommelier cellar folio and poetic course narratives.',
    tagline: '50/50 Asymmetric Editorial Tasting Progression & Sommelier Cellar Folio',
    version: '4.1.0',
    author: 'OrbitoX Atelier Studio',
    tierRequired: 'pro',
    priceLabel: 'Included in Pro',
    accentColor: '#C5A059',
    fontHeading: '"Cormorant Garamond", Georgia, serif',
    fontBody: '"Inter", -apple-system, sans-serif',
    previewThumbnail: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
    previewHero: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1600&auto=format&fit=crop&q=85',
    supportedComponents: ['split_editorial_canvas', 'tasting_timeline', 'circular_plate_modules', 'sommelier_cellar_folio', 'chef_manifesto'],
    composition: {
      pageArchitecture: 'split-asymmetric',
      heroArchitecture: 'split-asymmetric',
      menuLayoutPattern: 'course-progression-timeline',
      cardComposition: 'editorial-sommelier',
      navigationPattern: 'story-anchor-strip',
      cartPresentation: 'sommelier-drawer',
      responsiveRules: {
        desktopColumns: 2,
        tabletColumns: 1,
        mobileColumns: 1,
        layoutBehavior: 'asymmetric-split-with-course-timeline',
      },
      componentTree: [
        {
          id: 'haute-hero',
          type: 'HeroSplitAsymmetric',
          name: '50/50 Asymmetric Visual Canvas',
          layout: 'split-asymmetric',
          props: { showManifesto: true, elevation: 'inset' },
        },
        {
          id: 'haute-story',
          type: 'ChefManifestoSection',
          name: 'Sal Wood Coals Philosophy',
          layout: 'editorial-timeline',
          props: { quoteAuthor: 'Executive Chef', quoteRole: 'Curator' },
        },
        {
          id: 'haute-tasting',
          type: 'TastingCourseTimeline',
          name: 'Chronological Movement Progression',
          layout: 'editorial-timeline',
          props: { courses: ['Movement I: Amuse & Starters', 'Movement II: Charcoal Hearth', 'Movement III: Royal Mains', 'Movement IV: Grand Finale'] },
          children: [
            { id: 'haute-course-1', type: 'CourseGroup', name: 'Movement I: Amuse & Starters', layout: 'dense-stack', props: { winePairing: '2021 Blanc de Blancs Brut Nature' } },
            { id: 'haute-course-2', type: 'CourseGroup', name: 'Movement II: Wood-Fired Hearth', layout: 'dense-stack', props: { winePairing: '2019 Sula Dindori Reserve Viognier' } },
            { id: 'haute-course-3', type: 'CourseGroup', name: 'Movement III: Royal Curries', layout: 'dense-stack', props: { winePairing: '2018 Domaine Barolo Riserva' } },
            { id: 'haute-course-4', type: 'CourseGroup', name: 'Movement IV: Desserts & Elixirs', layout: 'dense-stack', props: { winePairing: 'Tawny Port 20-Year Aged' } },
          ],
        },
        {
          id: 'haute-cellar',
          type: 'SommelierPairingDrawer',
          name: 'Sommelier Cellar Folio',
          layout: 'flex-col',
          props: { defaultExpanded: false },
        },
      ],
    },
    defaultTokens: {
      primaryColor: '#C5A059',
      secondaryColor: '#C86B3C',
      backgroundColor: '#080A0D',
      surfaceColor: '#12161E',
      textColor: '#F5F0E6',
      mutedColor: '#8C857B',
      fontFamilyHeading: '"Cormorant Garamond", Georgia, serif',
      fontFamilyBody: '"Inter", sans-serif',
      borderRadius: '8px',
      cardStyle: 'asymmetric-editorial',
      heroHeight: '100vh',
    },
    defaultSections: [
      {
        id: 'sec_hero_noir',
        type: 'hero',
        title: 'Culinary Narrative & Charcoal Embers',
        subtitle: '50/50 Asymmetric editorial tasting progression with sommelier cellar folio.',
        imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop&q=80',
        ctaText: 'Experience Tasting Movements',
        ctaLink: '#menu',
        visible: true,
        order: 1,
      },
      {
        id: 'sec_featured_noir',
        type: 'featured_dishes',
        title: 'Chef Curated Tasting Movements',
        subtitle: 'Chronological progression across smoke, brass, and generational spice formulation.',
        visible: true,
        order: 2,
      },
      {
        id: 'sec_story_noir',
        type: 'story',
        title: 'The Sal Wood Coals Philosophy',
        subtitle: '24-hour slow simmer undisturbed over sal wood coals.',
        content: 'Founded on ancestral tandoor techniques, OrbitoX Bistro bridges centuries-old royal culinary recipes with contemporary operational mastery.',
        imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&auto=format&fit=crop&q=80',
        visible: true,
        order: 3,
      },
      {
        id: 'sec_hours_noir',
        type: 'hours_contact',
        title: 'Cellar & Evening Seating',
        subtitle: 'Dinner service 19:00 - 23:30. Sommelier pairings prepared table-side.',
        visible: true,
        order: 4,
      },
    ],
  },
  {
    id: 'tmpl_nordic_minimal',
    slug: 'nordic-minimal',
    name: 'Fjord & Form Botanical',
    category: 'Modern Minimal',
    description: 'Scandinavian architectural botanical specimen ledger. High negative space, zero traditional card boxes, precision hairline lot rows with inline unrolling spec sheets.',
    tagline: 'Scandinavian Architectural Botanical Ledger & Farm-to-Table Spec Sheet',
    version: '4.1.0',
    author: 'Copenhagen Botanical Atelier',
    tierRequired: 'starter',
    priceLabel: 'Free',
    accentColor: '#2D5A43',
    fontHeading: '"Inter", -apple-system, sans-serif',
    fontBody: '"Inter", -apple-system, sans-serif',
    previewThumbnail: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80',
    previewHero: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&auto=format&fit=crop&q=85',
    supportedComponents: ['botanical_ledger', 'hairline_lot_rows', 'inline_unrolling_specs', 'minimal_receipt_dock'],
    composition: {
      pageArchitecture: 'horizontal-ledger',
      heroArchitecture: 'minimal-harvest-header',
      menuLayoutPattern: 'two-column-harvest-sheet',
      cardComposition: 'mono-clean-spec',
      navigationPattern: 'monochrome-top-rail',
      cartPresentation: 'minimal-bottom-bar',
      responsiveRules: {
        desktopColumns: 2,
        tabletColumns: 2,
        mobileColumns: 1,
        layoutBehavior: 'two-column-tabular-spec-sheet',
      },
      componentTree: [
        {
          id: 'nord-header',
          type: 'HarvestSeasonalHeader',
          name: 'Botanical Origin Header',
          layout: 'flex-row',
          props: { showForagedDate: true, daylightIndicator: true },
        },
        {
          id: 'nord-sheet',
          type: 'TabularSpecSheet',
          name: 'Hairline Botanical Specimen Rows',
          layout: 'grid-2',
          props: { showEstateOrigin: true, showDietaryBadges: true },
          children: [
            { id: 'nord-col-botanicals', type: 'BotanicalCategory', name: '01 / Foraged Harvest Botanicals', layout: 'dense-stack' },
            { id: 'nord-col-bakery', type: 'BakeryCategory', name: '02 / Sourdough & Hearth Provisions', layout: 'dense-stack' },
          ],
        },
        {
          id: 'nord-footer',
          type: 'MinimalServiceBar',
          name: 'Monochrome Receipt Status Dock',
          layout: 'flex-row',
          props: { quietTypography: true },
        },
      ],
    },
    defaultTokens: {
      primaryColor: '#121314',
      secondaryColor: '#2D5A43',
      backgroundColor: '#F7F5F0',
      surfaceColor: '#FFFFFF',
      textColor: '#121314',
      mutedColor: '#64748B',
      fontFamilyHeading: '"Inter", sans-serif',
      fontFamilyBody: '"Inter", sans-serif',
      borderRadius: '4px',
      cardStyle: 'horizontal-ledger',
      heroHeight: '320px',
    },
    defaultSections: [
      {
        id: 'sec_hero_minimal',
        type: 'hero',
        title: 'Pure Form. Honest Botanicals.',
        subtitle: 'Scandinavian architectural simplicity with hairline provenance specimen ledger.',
        imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
        ctaText: 'View Today’s Harvest',
        ctaLink: '#menu',
        visible: true,
        order: 1,
      },
      {
        id: 'sec_featured_minimal',
        type: 'featured_dishes',
        title: 'Current Botanical Harvest Ledger',
        subtitle: 'Foraged daily by estate cultivators and hearth specialists.',
        visible: true,
        order: 2,
      },
      {
        id: 'sec_hours_minimal',
        type: 'hours_contact',
        title: 'Harvest Times & Origin Coordinates',
        subtitle: 'Origin 30°54\'N 75°51\'E · Lunch 12:00 - 15:00 · Dinner 18:30 - 22:30',
        visible: true,
        order: 3,
      },
    ],
  },
  {
    id: 'tmpl_artisan_coffee',
    slug: 'artisan-coffee',
    name: 'Roastery 1984 Vitrine',
    category: 'Cafe & Artisan Coffee',
    description: 'Specialty roastery vitrine counter with aroma tasting dials, generous product photography, and tactile [- 1 +] quantity steppers mounted directly on card faces.',
    tagline: 'Tactile Counter Ordering with Direct Card-Mounted [- 1 +] Steppers',
    version: '4.1.0',
    author: 'Roastworks Collective',
    tierRequired: 'growth',
    priceLabel: 'Included in Growth',
    accentColor: '#C86B3C',
    fontHeading: '"Space Grotesk", sans-serif',
    fontBody: '"Outfit", sans-serif',
    previewThumbnail: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&auto=format&fit=crop&q=80',
    previewHero: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1600&auto=format&fit=crop&q=85',
    supportedComponents: ['roastery_vitrine_carousel', 'aroma_spectrum_dials', 'card_face_stepper', 'tactile_capsule_pill'],
    composition: {
      pageArchitecture: 'tactile-vitrine-grid',
      heroArchitecture: 'warm-carousel-showcase',
      menuLayoutPattern: 'tactile-card-grid',
      cardComposition: 'tactile-stepper',
      navigationPattern: 'category-pill-bar',
      cartPresentation: 'tactile-floating-capsule',
      responsiveRules: {
        desktopColumns: 3,
        tabletColumns: 2,
        mobileColumns: 1,
        layoutBehavior: 'tactile-cards-with-direct-steppers',
      },
      componentTree: [
        {
          id: 'cafe-hero',
          type: 'RoasterVitrineHero',
          name: 'Micro-Lot Roastery Showcase',
          layout: 'flex-row',
          props: { showRoastProfile: true, origin: 'Ratnagiri Estate Micro-Lot' },
        },
        {
          id: 'cafe-notes',
          type: 'AromaSpectrumBar',
          name: 'Cupping Notes Spectrum',
          layout: 'flex-row',
          props: { notes: ['Jasmine Florals', 'Wild Bergamot', 'Raw Honey', 'Toasted Hazelnut'] },
        },
        {
          id: 'cafe-grid',
          type: 'TactileProductGrid',
          name: 'Tactile Vitrine Grid with Mounted [- 1 +] Steppers',
          layout: 'grid-3',
          props: { directStepper: true, customizableMilk: true, customizableShots: true },
          children: [
            { id: 'cafe-card-espresso', type: 'TactileFoodCard', name: 'Espresso Bar Card', layout: 'flex-col' },
            { id: 'cafe-card-brew', type: 'TactileFoodCard', name: 'Slow Manual Brews', layout: 'flex-col' },
            { id: 'cafe-card-bakery', type: 'TactileFoodCard', name: 'Laminated Pastries', layout: 'flex-col' },
          ],
        },
      ],
    },
    defaultTokens: {
      primaryColor: '#C86B3C',
      secondaryColor: '#8C532B',
      backgroundColor: '#FDFBF7',
      surfaceColor: '#FFFFFF',
      textColor: '#241D17',
      mutedColor: '#786C60',
      fontFamilyHeading: '"Space Grotesk", sans-serif',
      fontFamilyBody: '"Outfit", sans-serif',
      borderRadius: '16px',
      cardStyle: 'tactile-vitrine',
      heroHeight: '420px',
    },
    defaultSections: [
      {
        id: 'sec_hero_cafe',
        type: 'hero',
        title: 'Micro-Lot Roastery & Slow Vitrine Counter',
        subtitle: 'Roasted in-house daily. Paired with laminated sourdough pastries and tactile card steppers.',
        imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1200&auto=format&fit=crop&q=80',
        ctaText: 'Browse Morning Brews',
        ctaLink: '#menu',
        visible: true,
        order: 1,
      },
      {
        id: 'sec_featured_cafe',
        type: 'featured_dishes',
        title: 'Fresh From the Hearth & Barista Bar',
        subtitle: 'Small-batch creations made before dawn with mounted [- 1 +] quantity controls.',
        visible: true,
        order: 2,
      },
      {
        id: 'sec_hours_cafe',
        type: 'hours_contact',
        title: 'Roastery Extraction Hours',
        subtitle: 'Daily 07:00 - 20:00 · Wifi & specialty coffee flights available',
        visible: true,
        order: 3,
      },
    ],
  },
  {
    id: 'tmpl_neon_street',
    slug: 'neon-street',
    name: 'Neon Yokocho Night Alley',
    category: 'Neon Street Food',
    description: 'High-energy Tokyo night market alley. Parallel dual-stall market lanes (Skewers vs Wok & Bao), live night market heat BPM ticker, flame meters, and instant + BUMP triggers.',
    tagline: 'High-BPM Parallel Dual-Stall Market Lanes & Rapid-Tap BUMP Triggers',
    version: '4.1.0',
    author: 'Shibuya Underground Labs',
    tierRequired: 'pro',
    priceLabel: 'Included in Pro',
    accentColor: '#00F2FE',
    fontHeading: '"Syne", "Cabinet Grotesk", sans-serif',
    fontBody: '"Space Grotesk", sans-serif',
    previewThumbnail: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
    previewHero: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1600&auto=format&fit=crop&q=85',
    supportedComponents: ['bpm_heat_ticker', 'dual_stall_matrix', 'flame_spice_meters', 'rapid_bump_triggers', 'street_order_bag'],
    composition: {
      pageArchitecture: 'dual-lane-market',
      heroArchitecture: 'neon-banner-dual',
      menuLayoutPattern: 'dual-stall-bump-lanes',
      cardComposition: 'cyber-neon-bump',
      navigationPattern: 'neon-sticky-matrix',
      cartPresentation: 'neon-slide-sheet',
      responsiveRules: {
        desktopColumns: 2,
        tabletColumns: 2,
        mobileColumns: 1,
        layoutBehavior: 'dense-dual-stall-bump-matrix',
      },
      componentTree: [
        {
          id: 'neon-banner',
          type: 'CyberStreetBanner',
          name: 'Night Market Marquee & 128 BPM Ticker',
          layout: 'flex-row',
          props: { strobeAccents: true, bpmTicker: 128 },
        },
        {
          id: 'neon-matrix',
          type: 'DualStallMatrix',
          name: 'Dual Stall Matrix (Skewers vs Smashed Bao)',
          layout: 'grid-2',
          props: { rapidAddBump: true, spiceLevelIndicator: true },
          children: [
            { id: 'stall-yakitori', type: 'StreetStallLane', name: 'Stall 01: Bincho-tan Charcoal Skewers', layout: 'dense-stack' },
            { id: 'stall-bao', type: 'StreetStallLane', name: 'Stall 02: Wok Fire & Smashed Bao', layout: 'dense-stack' },
          ],
        },
        {
          id: 'neon-dj',
          type: 'LateNightSessionBanner',
          name: 'Live DJ Resident Schedule & Late Pour Bar',
          layout: 'flex-col',
          props: { barOpenUntil: '02:00 AM' },
        },
      ],
    },
    defaultTokens: {
      primaryColor: '#00F2FE',
      secondaryColor: '#FE0979',
      backgroundColor: '#07090E',
      surfaceColor: '#0F131D',
      textColor: '#FFFFFF',
      mutedColor: '#7E8B9B',
      fontFamilyHeading: '"Syne", sans-serif',
      fontFamilyBody: '"Space Grotesk", sans-serif',
      borderRadius: '10px',
      cardStyle: 'high-contrast-ticket',
      heroHeight: '360px',
    },
    defaultSections: [
      {
        id: 'sec_hero_neon',
        type: 'hero',
        title: 'Tokyo Night Market // 東京夜市',
        subtitle: 'Crispy charcoal yakitori, smashed bao burgers, and late-night izakaya bites served at 128 BPM.',
        imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80',
        ctaText: 'Order Street Bites',
        ctaLink: '#menu',
        visible: true,
        order: 1,
      },
      {
        id: 'sec_featured_neon',
        type: 'featured_dishes',
        title: 'Dual Stall Rush Menu (Skewers & Bao)',
        subtitle: 'Direct from the open fire pit to your table with instant + BUMP triggers.',
        visible: true,
        order: 2,
      },
      {
        id: 'sec_hours_neon',
        type: 'hours_contact',
        title: 'Late Night Nightclub Shift',
        subtitle: 'Open till 02:00 AM Thursday to Sunday with resident DJ set',
        visible: true,
        order: 3,
      },
    ],
  },
  {
    id: 'tmpl_trattoria_bella',
    slug: 'trattoria-bella',
    name: 'Osteria Rustica Convivial',
    category: 'Trattoria & Italian',
    description: 'Convivial Tuscan family feasting. Centered editorial column, classic Italian course progression, Tavola Grande family sharing combo builder (-15% bundle savings), and DOP seals.',
    tagline: 'Centered Tuscan Hearth Narrative & Tavola Grande Family Feasting Combos',
    version: '4.1.0',
    author: 'Firenze Heritage Guild',
    tierRequired: 'growth',
    priceLabel: 'Included in Growth',
    accentColor: '#8C3820',
    fontHeading: '"Playfair Display", Georgia, serif',
    fontBody: '"Alegreya", serif',
    previewThumbnail: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80',
    previewHero: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1600&auto=format&fit=crop&q=85',
    supportedComponents: ['woodfired_hearth_story', 'tavola_grande_combo_builder', 'framed_dop_cards', 'leather_folio_presenter'],
    composition: {
      pageArchitecture: 'centered-editorial',
      heroArchitecture: 'woodfired-hearth-story',
      menuLayoutPattern: 'family-combo-story',
      cardComposition: 'trattoria-story-card',
      navigationPattern: 'floating-dock',
      cartPresentation: 'rustic-table-order-sheet',
      responsiveRules: {
        desktopColumns: 2,
        tabletColumns: 1,
        mobileColumns: 1,
        layoutBehavior: 'story-first-family-sharing-builder',
      },
      componentTree: [
        {
          id: 'trattoria-story',
          type: 'HearthStorytellingSection',
          name: '72-Hour Fermented Dough & Volcanic Oven',
          layout: 'split-asymmetric',
          props: { ovenTempCelsius: 480, flourType: 'Caputo 00' },
        },
        {
          id: 'trattoria-feast',
          type: 'FamilyFeastBuilder',
          name: 'Tavola Grande: Family Sharing Feast Combo (-15%)',
          layout: 'flex-col',
          props: { discountPercent: 15 },
        },
        {
          id: 'trattoria-menu',
          type: 'RusticDishListing',
          name: 'Pizzeria & Pasta Fresca Showcase',
          layout: 'grid-2',
          children: [
            { id: 'trattoria-pizza', type: 'PizzaCategoryWithCrustSelector', name: 'Le Pizze al Forno', layout: 'dense-stack' },
            { id: 'trattoria-pasta', type: 'PastaCategoryWithShapeSelector', name: 'La Pasta Fatta a Mano', layout: 'dense-stack' },
          ],
        },
      ],
    },
    defaultTokens: {
      primaryColor: '#8C3820',
      secondaryColor: '#3D4A39',
      backgroundColor: '#FBF8F2',
      surfaceColor: '#FFFFFF',
      textColor: '#241D17',
      mutedColor: '#7C6F62',
      fontFamilyHeading: '"Playfair Display", Georgia, serif',
      fontFamilyBody: '"Alegreya", Georgia, serif',
      borderRadius: '12px',
      cardStyle: 'framed-rustic',
      heroHeight: '460px',
    },
    defaultSections: [
      {
        id: 'sec_hero_trattoria',
        type: 'hero',
        title: 'Forno a Legna & Pasta Fresca dal 1974',
        subtitle: 'Fermented 72-hour dough baked at 480°C in volcanic stone ovens with San Marzano tomatoes.',
        imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&auto=format&fit=crop&q=80',
        ctaText: 'Explore Pizzas & Pastas',
        ctaLink: '#menu',
        visible: true,
        order: 1,
      },
      {
        id: 'sec_featured_trattoria',
        type: 'featured_dishes',
        title: 'Tavola Grande & Specialità della Casa',
        subtitle: 'Imported burrata, guanciale di Amatrice, and family sharing bundles.',
        visible: true,
        order: 2,
      },
      {
        id: 'sec_hours_trattoria',
        type: 'hours_contact',
        title: 'Orari del Pranzo e della Cena',
        subtitle: 'Pranzo 12:30 - 15:30 · Cena 19:00 - 23:30 con servizio al tavolo',
        visible: true,
        order: 3,
      },
    ],
  },
  {
    id: 'tmpl_tokyo_izakaya',
    slug: 'tokyo-izakaya',
    name: 'Shokunin Ramen & Robata',
    category: 'Asian & Ramen',
    description: 'Disciplined Japanese craftsmanship (*Shokunin*). Vertical timber plank navigation rail with kanji crest, 4-step ramen customizer (Broth, Noodle, Tare, Toppings), and 18h dashi timer badges.',
    tagline: 'Hinoki Timber Plank Rhythm & Step-by-Step Ramen Customizer Flow',
    version: '4.1.0',
    author: 'Ginza Craft Collective',
    tierRequired: 'pro',
    priceLabel: 'Included in Pro',
    accentColor: '#D3381C',
    fontHeading: '"Noto Serif JP", serif',
    fontBody: '"DM Sans", sans-serif',
    previewThumbnail: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80',
    previewHero: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=1600&auto=format&fit=crop&q=85',
    supportedComponents: ['vertical_timber_rail', 'kanji_crest_banner', 'ramen_step_customizer', 'cedar_slat_cards', 'bento_tray_check'],
    composition: {
      pageArchitecture: 'timber-plank-board',
      heroArchitecture: 'vertical-scroll-manifesto',
      menuLayoutPattern: 'vertical-broth-checklist',
      cardComposition: 'shokunin-woodcut',
      navigationPattern: 'vertical-zen-tabs',
      cartPresentation: 'zen-order-tray',
      responsiveRules: {
        desktopColumns: 3,
        tabletColumns: 2,
        mobileColumns: 1,
        layoutBehavior: 'vertical-kanji-rhythm-with-broth-builder',
      },
      componentTree: [
        {
          id: 'shokunin-manifesto',
          type: 'ShokuninRamenManifesto',
          name: '18-Hour Tonkotsu & Kansui Noodle Philosophy',
          layout: 'flex-col',
          props: { brothSimmerHours: 18, noodleHydrationPercent: 32 },
        },
        {
          id: 'ramen-checklist-sheet',
          type: 'CustomBowlChecklist',
          name: 'Craft Your Ramen Bowl (Broth, Noodle, Tare, Toppings)',
          layout: 'flex-col',
          props: {
            brothOptions: ['Kotteri (Rich/Full Oil)', 'Assari (Light Dashi)'],
            noodleOptions: ['Katame (Firm)', 'Futsuu (Standard)', 'Yawarakame (Soft)'],
          },
        },
        {
          id: 'ramen-board',
          type: 'WoodenBoardMenuGrid',
          name: 'Cedar Menu Board (Signature Bowls & Robata Grill)',
          layout: 'grid-3',
          children: [
            { id: 'board-ramen', type: 'RamenItemTile', name: 'Tonkotsu, Miso & Shoyu Bowls', layout: 'dense-stack' },
            { id: 'board-robata', type: 'RobataTile', name: 'Bincho-tan Charcoal Skewers', layout: 'dense-stack' },
            { id: 'board-sake', type: 'SakeFlightTile', name: 'Junmai Daiginjo Flights', layout: 'dense-stack' },
          ],
        },
      ],
    },
    defaultTokens: {
      primaryColor: '#D3381C',
      secondaryColor: '#10B981',
      backgroundColor: '#1E1915',
      surfaceColor: '#26201B',
      textColor: '#F7F4EB',
      mutedColor: '#9E9285',
      fontFamilyHeading: '"Noto Serif JP", serif',
      fontFamilyBody: '"DM Sans", sans-serif',
      borderRadius: '6px',
      cardStyle: 'cedar-slat',
      heroHeight: '400px',
    },
    defaultSections: [
      {
        id: 'sec_hero_ramen',
        type: 'hero',
        title: '職人魂 · 極上出汁 (18-Hour Simmered Dashi)',
        subtitle: 'Simmered overnight with umami dashi, springy alkaline noodles, and flame-torched chashu.',
        imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=1200&auto=format&fit=crop&q=80',
        ctaText: 'Customize Your Bowl',
        ctaLink: '#menu',
        visible: true,
        order: 1,
      },
      {
        id: 'sec_featured_ramen',
        type: 'featured_dishes',
        title: 'Signature Bowls & Bincho-tan Robata Grill',
        subtitle: 'Crafted with precision by seasoned ramen shokunin with step-by-step customizer.',
        visible: true,
        order: 2,
      },
      {
        id: 'sec_hours_ramen',
        type: 'hours_contact',
        title: 'Izakaya Hours & Table Bell Service',
        subtitle: 'Open daily 11:30 - 23:00 without afternoon closure',
        visible: true,
        order: 3,
      },
    ],
  },
  {
    id: 'tmpl_crave_atlas',
    slug: 'crave-atlas',
    name: 'CraveAtlas Discovery Marketplace',
    category: 'Food Discovery Marketplace',
    experienceType: 'food_marketplace',
    targetBusinessModel: 'Multi-Restaurant Marketplace / Food Discovery',
    supportedScopes: ['multi_merchant_marketplace', 'restaurant_group'],
    capabilities: {
      experienceType: 'food_marketplace',
      compatibleScope: 'multi_merchant_marketplace',
      requiresTableContext: false,
      catalogType: 'multi_restaurant_menus',
      supportsMultiMerchant: true,
      supportsInventoryQuantities: false,
      supportsSubstitutionWorkflow: false,
      supportsDeliveryPincodeCheck: true,
    },
    description: 'Discovery-first multi-restaurant food marketplace with location selection, cross-entity search, cuisine carousels, and single-restaurant cart rules.',
    tagline: 'Discovery-First Multi-Restaurant Food Marketplace · Powered by OrbitoX',
    version: '5.1.0',
    author: 'OrbitoX Consumer Commerce Team',
    tierRequired: 'pro',
    priceLabel: 'Included in Pro',
    accentColor: '#E23744',
    fontHeading: '"Plus Jakarta Sans", -apple-system, sans-serif',
    fontBody: '"Inter", -apple-system, sans-serif',
    previewThumbnail: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80',
    previewHero: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&auto=format&fit=crop&q=85',
    supportedComponents: ['location_selector_bar', 'global_search_bar', 'cuisine_carousel', 'curated_collections_grid', 'restaurant_directory_card', 'single_restaurant_cart_guard'],
    composition: {
      pageArchitecture: 'marketplace-portal-feed',
      heroArchitecture: 'location-discovery-banner',
      menuLayoutPattern: 'multi-stall-directory-grid',
      cardComposition: 'marketplace-restaurant-card',
      navigationPattern: 'cuisine-chip-rail',
      cartPresentation: 'sticky-marketplace-drawer',
      responsiveRules: {
        desktopColumns: 3,
        tabletColumns: 2,
        mobileColumns: 1,
        layoutBehavior: 'discovery-first-grid-with-filter-rail',
      },
      componentTree: [
        { id: 'ca-loc-bar', type: 'LocationSelectorBar', name: 'Delivery Location Bar', layout: 'horizontal-spread' },
        { id: 'ca-search', type: 'GlobalMarketplaceSearch', name: 'Restaurants & Cuisines Search', layout: 'full-width' },
        { id: 'ca-cuisines', type: 'CuisinePillsCarousel', name: 'Top Cuisines Scroller', layout: 'overflow-row' },
        { id: 'ca-collections', type: 'CuratedCollectionsGrid', name: 'Trending & Top Rated Collections', layout: 'grid-4' },
        { id: 'ca-restaurants', type: 'RestaurantDirectoryGrid', name: 'Nearby Verified Partner Kitchens', layout: 'grid-3' },
      ],
    },
    defaultTokens: {
      primaryColor: '#E23744',
      secondaryColor: '#E5A118',
      backgroundColor: '#F8F9FA',
      surfaceColor: '#FFFFFF',
      textColor: '#1C1C27',
      mutedColor: '#6B7280',
      fontFamilyHeading: '"Plus Jakarta Sans", sans-serif',
      fontFamilyBody: '"Inter", sans-serif',
      borderRadius: '12px',
      cardStyle: 'bordered',
      heroHeight: '260px',
    },
    defaultSections: [
      {
        id: 'sec_ca_hero',
        type: 'hero',
        title: 'Discover the Finest Dining & Cravings Around You',
        subtitle: 'Explore curated chef tables, authentic dum biryanis, and artisanal kitchens.',
        imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&auto=format&fit=crop&q=80',
        visible: true,
        order: 1,
      },
    ],
  },
  {
    id: 'tmpl_swift_bite',
    slug: 'swift-bite',
    name: 'SwiftBite Express Food Ordering',
    category: 'Speed-First Food Ordering',
    experienceType: 'food_ordering',
    targetBusinessModel: 'Fast-Casual Food Delivery & Quick Ordering',
    supportedScopes: ['single_restaurant', 'restaurant_group'],
    capabilities: {
      experienceType: 'food_ordering',
      compatibleScope: 'single_restaurant',
      requiresTableContext: false,
      catalogType: 'restaurant_menu',
      supportsMultiMerchant: false,
      supportsInventoryQuantities: false,
      supportsSubstitutionWorkflow: false,
      supportsDeliveryPincodeCheck: true,
    },
    description: 'Speed-first consumer food ordering app with instant 1-tap fast add, targeted customization sheets only when required, repeat-order carousels, and idempotent checkout.',
    tagline: 'Speed-First Food Ordering App · Instant Cravings to Order',
    version: '5.1.0',
    author: 'OrbitoX Consumer Commerce Team',
    tierRequired: 'starter',
    priceLabel: 'Included in Starter',
    accentColor: '#FC8019',
    fontHeading: '"Plus Jakarta Sans", -apple-system, sans-serif',
    fontBody: '"Inter", -apple-system, sans-serif',
    previewThumbnail: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=80',
    previewHero: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1600&auto=format&fit=crop&q=85',
    supportedComponents: ['speed_header_bar', 'cravings_search', 'instant_add_card', 'targeted_customizer_modal', 'reorder_carousel', 'idempotent_checkout_sheet'],
    composition: {
      pageArchitecture: 'express-split-ordering',
      heroArchitecture: 'compact-speed-header',
      menuLayoutPattern: 'frictionless-card-stack',
      cardComposition: 'speed-add-stepper-card',
      navigationPattern: 'category-pill-bar',
      cartPresentation: 'floating-capsule-drawer',
      responsiveRules: {
        desktopColumns: 2,
        tabletColumns: 2,
        mobileColumns: 1,
        layoutBehavior: 'split-feed-with-sticky-cart',
      },
      componentTree: [
        { id: 'sb-header', type: 'SpeedHeaderBar', name: 'Delivery ETA & Location Pill', layout: 'flex-row' },
        { id: 'sb-search', type: 'CravingsSearchBar', name: 'Instant Craving Search', layout: 'full-width' },
        { id: 'sb-chips', type: 'CategoryChipScroller', name: 'Fast Category Scroller', layout: 'overflow-row' },
        { id: 'sb-reorder', type: 'RepeatOrderCarousel', name: 'Recent Orders & Quick Picks', layout: 'overflow-row' },
        { id: 'sb-menu', type: 'HighVelocityMenuGrid', name: 'One-Tap Menu Feed', layout: 'grid-2' },
      ],
    },
    defaultTokens: {
      primaryColor: '#FC8019',
      secondaryColor: '#48C479',
      backgroundColor: '#F7F7F8',
      surfaceColor: '#FFFFFF',
      textColor: '#171A29',
      mutedColor: '#686B78',
      fontFamilyHeading: '"Plus Jakarta Sans", sans-serif',
      fontFamilyBody: '"Inter", sans-serif',
      borderRadius: '10px',
      cardStyle: 'flat',
      heroHeight: '140px',
    },
    defaultSections: [
      {
        id: 'sec_sb_hero',
        type: 'hero',
        title: 'Craving Delivered in 20 Mins',
        subtitle: 'Hot, fresh, and zero friction. One tap to add, zero wait.',
        imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&auto=format&fit=crop&q=80',
        visible: true,
        order: 1,
      },
    ],
  },
  {
    id: 'tmpl_pantry_rush',
    slug: 'pantry-rush',
    name: 'PantryRush Quick-Commerce Grocery',
    category: 'Grocery & Quick Commerce',
    experienceType: 'quick_commerce',
    targetBusinessModel: 'Dark-Store Quick Commerce / Grocery & Essentials',
    supportedScopes: ['quick_commerce_dark_store'],
    capabilities: {
      experienceType: 'quick_commerce',
      compatibleScope: 'quick_commerce_dark_store',
      requiresTableContext: false,
      catalogType: 'grocery_catalog',
      supportsMultiMerchant: false,
      supportsInventoryQuantities: true,
      supportsSubstitutionWorkflow: true,
      supportsDeliveryPincodeCheck: true,
    },
    description: 'Quick-commerce grocery application with real SKU pack sizes, live stock inventory counters, explicit substitution preferences, and dark-store fulfillment serviceability.',
    tagline: 'Quick-Commerce Grocery & Daily Essentials · 15-Minute Dark-Store Dispatch',
    version: '5.1.0',
    author: 'OrbitoX Consumer Commerce Team',
    tierRequired: 'growth',
    priceLabel: 'Included in Growth',
    accentColor: '#22C55E',
    fontHeading: '"Inter", -apple-system, sans-serif',
    fontBody: '"Inter", -apple-system, sans-serif',
    previewThumbnail: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80',
    previewHero: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1600&auto=format&fit=crop&q=85',
    supportedComponents: ['dark_store_serviceability_header', 'grocery_category_rail', 'sku_stepper_card', 'stock_limit_guard', 'substitution_preference_selector', 'quick_basket_drawer'],
    composition: {
      pageArchitecture: 'quick-commerce-shelf',
      heroArchitecture: 'dark-store-eta-banner',
      menuLayoutPattern: 'high-density-sku-grid',
      cardComposition: 'grocery-sku-card',
      navigationPattern: 'left-rail-and-subcategories',
      cartPresentation: 'grocery-basket-sidebar',
      responsiveRules: {
        desktopColumns: 4,
        tabletColumns: 3,
        mobileColumns: 2,
        layoutBehavior: 'dense-shelf-with-floating-basket',
      },
      componentTree: [
        { id: 'pr-eta', type: 'DarkStoreEtaHeader', name: 'Dark Store ETA & Pincode Pill', layout: 'flex-row' },
        { id: 'pr-search', type: 'GrocerySkuSearchBar', name: 'Search 2,000+ Groceries & Essentials', layout: 'full-width' },
        { id: 'pr-cats', type: 'GroceryCategoryPills', name: 'Pantry & Fresh Category Rail', layout: 'overflow-row' },
        { id: 'pr-shelf', type: 'HighDensitySkuGrid', name: 'SKU Inventory Shelf', layout: 'grid-4' },
      ],
    },
    defaultTokens: {
      primaryColor: '#22C55E',
      secondaryColor: '#0C2D1C',
      backgroundColor: '#F8FAF8',
      surfaceColor: '#FFFFFF',
      textColor: '#0F172A',
      mutedColor: '#64748B',
      fontFamilyHeading: '"Inter", sans-serif',
      fontFamilyBody: '"Inter", sans-serif',
      borderRadius: '8px',
      cardStyle: 'bordered',
      heroHeight: '120px',
    },
    defaultSections: [
      {
        id: 'sec_pr_hero',
        type: 'hero',
        title: 'Groceries Delivered in 15 Minutes',
        subtitle: 'Farm fresh produce, dairy, bakery, and daily staples from our hyper-local dark store.',
        imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&auto=format&fit=crop&q=80',
        visible: true,
        order: 1,
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 🏪 DEFAULT MULTI-RESTAURANT PARTNERS DIRECTORY (CRAVEATLAS)
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_RESTAURANT_PARTNERS: RestaurantPartner[] = [
  {
    id: 'rest_heritage_bistro',
    name: 'OrbitoX Heritage Charcoal & Dum',
    tagline: 'Slow-simmered 24hr dal, charcoal tandoor, and royal Mughlai recipes',
    cuisine: ['North Indian', 'Biryani', 'Mughlai', 'Tandoor'],
    rating: 4.8,
    reviewCount: 1420,
    deliveryTimeMin: 25,
    deliveryTimeMax: 35,
    priceForTwoMinor: 80000,
    featuredOffer: 'Flat ₹100 OFF on orders above ₹499',
    heroImage: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80',
    city: 'Ludhiana',
    isPureVeg: false,
    menuItemIds: ['item_dal_makhani', 'item_paneer_tikka', 'item_butter_chicken', 'item_butter_naan', 'item_garlic_naan', 'item_mango_lassi', 'item_gulab_jamun'],
  },
  {
    id: 'rest_tokyo_yokocho',
    name: 'Tokyo Yokocho Ramen & Robata',
    tagline: '18-hour tonkotsu dashi, alkaline noodles, and binchotan yakitori skewers',
    cuisine: ['Japanese', 'Ramen', 'Robata', 'Asian'],
    rating: 4.7,
    reviewCount: 980,
    deliveryTimeMin: 30,
    deliveryTimeMax: 40,
    priceForTwoMinor: 110000,
    featuredOffer: 'Complimentary Gyoza with any 2 Ramen Bowls',
    heroImage: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=80',
    city: 'Ludhiana',
    isPureVeg: false,
    menuItemIds: ['item_paneer_tikka', 'item_mango_lassi', 'item_garlic_naan'],
  },
  {
    id: 'rest_osteria_bella',
    name: 'Osteria Rustica Bella Trattoria',
    tagline: 'Handmade fresh pastas, wood-fired Neapolitan crusts, and Tuscan DOP cheeses',
    cuisine: ['Italian', 'Pasta', 'Wood-Fired Pizza', 'Mediterranean'],
    rating: 4.9,
    reviewCount: 1150,
    deliveryTimeMin: 35,
    deliveryTimeMax: 45,
    priceForTwoMinor: 140000,
    featuredOffer: '20% OFF on Tavola Grande Sharing Feasts',
    heroImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
    city: 'Chandigarh',
    isPureVeg: false,
    menuItemIds: ['item_paneer_tikka', 'item_dal_makhani', 'item_garlic_naan', 'item_gulab_jamun'],
  },
  {
    id: 'rest_roastery_1984',
    name: 'Roastery 1984 Artisan Coffee & Bakes',
    tagline: 'Single-origin micro-lot pour-overs, flaky laminated sourdough pastries',
    cuisine: ['Artisan Cafe', 'Bakery', 'Coffee', 'Desserts'],
    rating: 4.6,
    reviewCount: 740,
    deliveryTimeMin: 15,
    deliveryTimeMax: 25,
    priceForTwoMinor: 45000,
    featuredOffer: 'Free Cookie with Single-Origin Cold Brews',
    heroImage: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop&q=80',
    city: 'Chandigarh',
    isPureVeg: true,
    menuItemIds: ['item_mango_lassi', 'item_gulab_jamun', 'item_garlic_naan'],
  },
  {
    id: 'rest_punjab_sweets',
    name: 'Punjab Sweets & Chaat Chowk',
    tagline: 'Traditional pure desi ghee confections, crispy samosas, and chilled rabri',
    cuisine: ['Street Food', 'Sweets', 'Chaat', 'Beverages'],
    rating: 4.5,
    reviewCount: 2100,
    deliveryTimeMin: 20,
    deliveryTimeMax: 30,
    priceForTwoMinor: 35000,
    featuredOffer: 'Flat ₹50 OFF on Festival Sweet Boxes',
    heroImage: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=80',
    city: 'New Delhi',
    isPureVeg: true,
    menuItemIds: ['item_gulab_jamun', 'item_mango_lassi', 'item_butter_naan'],
  },
  {
    id: 'rest_fjord_botanical',
    name: 'Fjord & Form Botanical Harvest',
    tagline: 'Nordic cold forage, sea buckthorn crudo, and wild herb sourdough breads',
    cuisine: ['Contemporary', 'European', 'Healthy', 'Salads'],
    rating: 4.8,
    reviewCount: 620,
    deliveryTimeMin: 40,
    deliveryTimeMax: 50,
    priceForTwoMinor: 180000,
    featuredOffer: 'Chef Table Tasting Flight Included',
    heroImage: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
    city: 'New Delhi',
    isPureVeg: false,
    menuItemIds: ['item_paneer_tikka', 'item_dal_makhani', 'item_mango_lassi'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 🛒 DEFAULT GROCERY SKU CATALOG (PANTRYRUSH)
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_GROCERY_SKUS: GrocerySkuItem[] = [
  {
    id: 'sku_amul_taaza',
    name: 'Amul Taaza Homogenised Toned Milk',
    brand: 'Amul',
    category: 'Dairy, Bread & Eggs',
    packSize: '1 L Tetra',
    mrpMinor: 7400,
    sellingPriceMinor: 7200,
    unitPriceDescription: '₹72.00 / L',
    stockQuantity: 18,
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=80',
    badge: 'Daily Essential',
  },
  {
    id: 'sku_amul_butter',
    name: 'Amul Pasteurised Salted Butter',
    brand: 'Amul',
    category: 'Dairy, Bread & Eggs',
    packSize: '500 g',
    mrpMinor: 28500,
    sellingPriceMinor: 27500,
    unitPriceDescription: '₹55.00 / 100g',
    stockQuantity: 12,
    imageUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500&auto=format&fit=crop&q=80',
    badge: 'Popular',
  },
  {
    id: 'sku_english_oven_bread',
    name: 'English Oven 100% Whole Wheat Brown Bread',
    brand: 'English Oven',
    category: 'Dairy, Bread & Eggs',
    packSize: '400 g',
    mrpMinor: 5500,
    sellingPriceMinor: 5000,
    unitPriceDescription: '₹12.50 / 100g',
    stockQuantity: 8,
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80',
    badge: 'Zero Maida',
  },
  {
    id: 'sku_farm_fresh_eggs',
    name: 'Farm Fresh White Eggs (Pack of 12)',
    brand: 'Eggoz',
    category: 'Dairy, Bread & Eggs',
    packSize: 'Pack of 12',
    mrpMinor: 13000,
    sellingPriceMinor: 11500,
    unitPriceDescription: '₹9.58 / egg',
    stockQuantity: 14,
    imageUrl: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=500&auto=format&fit=crop&q=80',
    badge: 'UV Sanitized',
  },
  {
    id: 'sku_shimla_apples',
    name: 'Royal Delicious Red Apples (Shimla Fresh)',
    brand: 'Farm Fresh Direct',
    category: 'Fresh Fruits',
    packSize: '1 kg (4-5 pcs)',
    mrpMinor: 22000,
    sellingPriceMinor: 18900,
    unitPriceDescription: '₹18.90 / 100g',
    stockQuantity: 9,
    imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500&auto=format&fit=crop&q=80',
    isOrganic: true,
    badge: 'Direct Farm Harvest',
  },
  {
    id: 'sku_robusta_bananas',
    name: 'Fresh Robusta Golden Bananas',
    brand: 'Farm Fresh Direct',
    category: 'Fresh Fruits',
    packSize: '1 kg (6-8 pcs)',
    mrpMinor: 6500,
    sellingPriceMinor: 5400,
    unitPriceDescription: '₹5.40 / 100g',
    stockQuantity: 15,
    imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'sku_hyderabad_onions',
    name: 'Pink Nasik Onions (Medium Grade)',
    brand: 'Farm Fresh Direct',
    category: 'Fresh Vegetables',
    packSize: '2 kg Net Bag',
    mrpMinor: 9000,
    sellingPriceMinor: 7800,
    unitPriceDescription: '₹39.00 / kg',
    stockQuantity: 22,
    imageUrl: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=500&auto=format&fit=crop&q=80',
    badge: 'Kitchen Staple',
  },
  {
    id: 'sku_hybrid_tomatoes',
    name: 'Hydroponic Vine Ripe Red Tomatoes',
    brand: 'Farm Fresh Direct',
    category: 'Fresh Vegetables',
    packSize: '1 kg',
    mrpMinor: 6000,
    sellingPriceMinor: 4800,
    unitPriceDescription: '₹48.00 / kg',
    stockQuantity: 16,
    imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'sku_kashmiri_potatoes',
    name: 'Pahadi White Potatoes (New Crop)',
    brand: 'Farm Fresh Direct',
    category: 'Fresh Vegetables',
    packSize: '2 kg Net Bag',
    mrpMinor: 8000,
    sellingPriceMinor: 6800,
    unitPriceDescription: '₹34.00 / kg',
    stockQuantity: 20,
    imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'sku_aashirvaad_atta',
    name: 'Aashirvaad Shudh Chakki Whole Wheat Atta',
    brand: 'Aashirvaad',
    category: 'Pantry Staples',
    packSize: '5 kg Pack',
    mrpMinor: 27500,
    sellingPriceMinor: 25500,
    unitPriceDescription: '₹51.00 / kg',
    stockQuantity: 11,
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80',
    badge: 'High Fiber',
  },
  {
    id: 'sku_daawat_basmati',
    name: 'Daawat Rozana Super Basmati Rice',
    brand: 'Daawat',
    category: 'Pantry Staples',
    packSize: '5 kg Bag',
    mrpMinor: 44000,
    sellingPriceMinor: 39500,
    unitPriceDescription: '₹79.00 / kg',
    stockQuantity: 7,
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'sku_tata_sampann_dal',
    name: 'Tata Sampann Unpolished Toor Dal',
    brand: 'Tata Sampann',
    category: 'Pantry Staples',
    packSize: '1 kg Pouch',
    mrpMinor: 19500,
    sellingPriceMinor: 17800,
    unitPriceDescription: '₹17.80 / 100g',
    stockQuantity: 14,
    imageUrl: 'https://images.unsplash.com/photo-1585994192701-f1a505c817ea?w=500&auto=format&fit=crop&q=80',
    badge: 'Unpolished',
  },
  {
    id: 'sku_coca_cola_zero',
    name: 'Coca-Cola Zero Sugar Sparkling Drink',
    brand: 'Coca-Cola',
    category: 'Cold Drinks & Juices',
    packSize: '750 ml Pet Bottle',
    mrpMinor: 4500,
    sellingPriceMinor: 4000,
    unitPriceDescription: '₹5.33 / 100ml',
    stockQuantity: 24,
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=80',
    badge: 'Zero Sugar',
  },
  {
    id: 'sku_raw_coconut_water',
    name: 'Raw Pressery 100% Natural Coconut Water',
    brand: 'Raw Pressery',
    category: 'Cold Drinks & Juices',
    packSize: '200 ml Bottle',
    mrpMinor: 6500,
    sellingPriceMinor: 5900,
    unitPriceDescription: '₹29.50 / 100ml',
    stockQuantity: 16,
    imageUrl: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=500&auto=format&fit=crop&q=80',
    isOrganic: true,
  },
  {
    id: 'sku_lays_gourmet',
    name: "Lay's Gourmet Vintage Cheese & Paprika Chips",
    brand: "Lay's",
    category: 'Instant Food & Snacks',
    packSize: '55 g',
    mrpMinor: 3500,
    sellingPriceMinor: 3200,
    unitPriceDescription: '₹5.81 / 10g',
    stockQuantity: 19,
    imageUrl: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'sku_dettol_handwash',
    name: 'Dettol Skincare Germ Protection Liquid Handwash Refill',
    brand: 'Dettol',
    category: 'Personal Care',
    packSize: '675 ml Pouch',
    mrpMinor: 11900,
    sellingPriceMinor: 10500,
    unitPriceDescription: '₹15.55 / 100ml',
    stockQuantity: 0,
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
    badge: 'Out of Stock Demo',
  },
];
