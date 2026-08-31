import { PageSection, ComponentType } from '../../types/component.types';
import { SectionLogicConfig } from '../../types/logic.types';

export interface StoreAutopilotProfile {
  storeName: string;
  niche: 'luxury_fashion' | 'tech_gadgets' | 'organic_beauty' | 'streetwear' | 'art_design' | 'general';
  vibe?: 'minimalist' | 'bold_dark' | 'warm_earth' | 'futuristic';
  targetAudience?: string;
}

export interface NextBestAction {
  id: string;
  title: string;
  category: 'storefront' | 'catalog' | 'conversion' | 'marketing' | 'automation';
  impact: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  description: string;
  icon: string;
  actionText: string;
  actionRoute: string;
}

export class AIAutopilotEngine {
  /**
   * Generates a complete, professionally curated set of PageSection blocks with AI copy, media, and logic.
   */
  generateFullStorefront(profile: StoreAutopilotProfile): PageSection[] {
    const storeName = profile.storeName || 'AURA Luxury';
    const isFashion = profile.niche === 'luxury_fashion' || profile.niche === 'streetwear';
    const isTech = profile.niche === 'tech_gadgets';
    const isOrganic = profile.niche === 'organic_beauty';

    const heroImages = {
      luxury_fashion: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1400&auto=format&fit=crop',
      tech_gadgets: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1400&auto=format&fit=crop',
      organic_beauty: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=1400&auto=format&fit=crop',
      streetwear: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=1400&auto=format&fit=crop',
      art_design: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=1400&auto=format&fit=crop',
      general: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1400&auto=format&fit=crop',
    };

    const heroImage = heroImages[profile.niche] || heroImages.luxury_fashion;

    const sections: PageSection[] = [
      // 1. Announcement Bar with Dynamic Welcome Logic
      {
        id: `sec_announce_${Date.now()}`,
        type: 'announcement-bar',
        name: 'Top Announcement Bar',
        enabled: true,
        order: 0,
        settings: {
          text: isTech
            ? '🚀 NEXT-GEN HARDWARE ARCHITECTURE — COMPLIMENTARY 2-DAY AIR DELIVERY'
            : isOrganic
            ? '🌿 100% CERTIFIED ORGANIC BOTANICALS — FREE GIFT WITH ORDERS OVER $75'
            : '✨ COMPLIMENTARY WORLDWIDE WHITE-GLOVE DELIVERY OVER $150',
          backgroundColor: '#D4AF37',
          textColor: '#000000',
        },
      },
      // 2. Navigation Header
      {
        id: `sec_header_${Date.now()}`,
        type: 'header',
        name: 'Main Brand Header',
        enabled: true,
        order: 1,
        settings: {
          sticky: true,
          showSearch: true,
          showCart: true,
        },
      },
      // 3. Hero Runway Banner
      {
        id: `sec_hero_${Date.now()}`,
        type: 'hero',
        name: 'Runway Hero Banner',
        enabled: true,
        order: 2,
        settings: {
          badge: isTech ? 'PRO SERIES 2026' : isOrganic ? 'HARVEST EDITION 2026' : 'RUNWAY COLLECTION 2026',
          title: isTech ? 'Pure Acoustic Architecture' : isOrganic ? 'Living Botanical Alchemy' : 'Sculptural Grandeur & Living Art',
          subtitle: isTech
            ? 'Precision CNC unibody hardware engineered for lossless audio fidelity and demanding creators.'
            : isOrganic
            ? 'Potent cold-pressed botanical extracts formulated to nourish skin and soul.'
            : 'Uncompromising Italian tailoring meets contemporary architectural silhouettes for the discerning patron.',
          imageUrl: heroImage,
          primaryButtonText: 'Explore Collection',
          primaryButtonLink: '/shop',
          secondaryButtonText: 'View Lookbook',
          secondaryButtonLink: '/about',
          textAlignment: 'center',
        },
      },
      // 4. Trust Badges
      {
        id: `sec_trust_${Date.now()}`,
        type: 'trust-badges',
        name: 'Confidence & Sovereign Badges',
        enabled: true,
        order: 3,
        settings: {
          title: 'Our Sovereign Guarantees',
        },
      },
      // 5. Featured Catalog Highlights
      {
        id: `sec_grid_${Date.now()}`,
        type: 'product-grid',
        name: 'Curated Highlights Grid',
        enabled: true,
        order: 4,
        settings: {
          title: isTech ? 'Flagship Hardware Series' : isOrganic ? 'Bestselling Formulations' : 'Curated Runway Highlights',
          subtitle: 'HIGHEST GLOBAL DEMAND',
          columns: 3,
          collectionId: 'all',
        },
      },
      // 6. VIP Exclusive Drop Section (With Logic Rules Pre-Applied!)
      {
        id: `sec_vip_banner_${Date.now()}`,
        type: 'banner',
        name: '👑 VIP Private Atelier Consultation',
        enabled: true,
        order: 5,
        settings: {
          tagline: 'PRIVATE ATELIER ACCESS',
          heading: 'Bespoke Made-to-Measure Service',
          description: 'Experience private digital fittings and tailored hand-cut suits crafted by our senior master cutters.',
          primaryButtonText: 'Book Private Appointment',
          primaryButtonLink: '/contact',
        },
        logic: {
          enabled: true,
          matchType: 'all',
          rules: [
            {
              id: `rule_vip_auto_${Date.now()}`,
              type: 'customer_segment',
              operator: 'equals',
              value: 'vip',
              enabled: true,
              label: 'VIP Patrons (Spent > $500)',
            },
          ],
        },
      },
      // 7. Testimonials & Social Proof
      {
        id: `sec_testim_${Date.now()}`,
        type: 'testimonials',
        name: 'Client Endorsements',
        enabled: true,
        order: 6,
        settings: {
          title: 'Echoes of Distinction',
        },
      },
      // 8. Newsletter Private Access
      {
        id: `sec_news_${Date.now()}`,
        type: 'newsletter',
        name: 'Private Inner Circle Newsletter',
        enabled: true,
        order: 7,
        settings: {
          title: 'Join the Inner Atelier',
          subtitle: 'Receive priority access to private runway viewings and seasonal drops.',
        },
      },
      // 9. Footer
      {
        id: `sec_footer_${Date.now()}`,
        type: 'footer',
        name: 'Storefront Footer',
        enabled: true,
        order: 8,
        settings: {},
      },
    ];

    return sections;
  }

  /**
   * Generates prioritized proactive recommendations for store growth
   */
  suggestNextBestActions(currentState: {
    productCount: number;
    hasHeroImage: boolean;
    hasDiscounts: boolean;
    hasLogicRules: boolean;
    activeThemeId?: string;
  }): NextBestAction[] {
    const actions: NextBestAction[] = [];

    if (currentState.productCount < 3) {
      actions.push({
        id: 'act_add_products',
        title: 'Add Bestseller Products to Catalog',
        category: 'catalog',
        impact: 'CRITICAL',
        description: 'Your storefront has fewer than 3 products. Add items with high-res photography and pricing.',
        icon: '🛍️',
        actionText: 'Add Products Now',
        actionRoute: '/commerce/products',
      });
    }

    if (!currentState.hasDiscounts) {
      actions.push({
        id: 'act_create_discount',
        title: 'Launch Welcome Discount Voucher',
        category: 'marketing',
        impact: 'HIGH',
        description: 'New visitors convert 38% faster when a first-purchase coupon (e.g. WELCOME20) is active.',
        icon: '🏷️',
        actionText: 'Create Coupon',
        actionRoute: '/commerce/discounts',
      });
    }

    if (!currentState.hasLogicRules) {
      actions.push({
        id: 'act_enable_logic',
        title: 'Activate Dynamic VIP & Cart Rules',
        category: 'conversion',
        impact: 'HIGH',
        description: 'Show conditional free shipping progress bars and exclusive VIP lookbooks to boost AOV.',
        icon: '⚡',
        actionText: 'Open Page Builder',
        actionRoute: '/commerce/store/builder',
      });
    }

    actions.push({
      id: 'act_setup_automation',
      title: 'Deploy Abandoned Cart Recovery Workflow',
      category: 'automation',
      impact: 'HIGH',
      description: 'Automatically email shoppers who leave items in their cart with an instant 10% off incentive.',
      icon: '🤖',
      actionText: 'View Automations',
      actionRoute: '/commerce/automations',
    });

    actions.push({
      id: 'act_theme_tuning',
      title: 'Fine-Tune Typography & Palette Tokens',
      category: 'storefront',
      impact: 'MEDIUM',
      description: 'Elevate brand luxury by pairing custom typography and tailored CSS accent hues.',
      icon: '✨',
      actionText: 'Theme Studio',
      actionRoute: '/commerce/store/theme',
    });

    return actions;
  }
}
