import { CustomComponentDefinition, PrimitiveBlock } from '../../types/primitives.types';
import { ComponentDefinition } from '../../types/component.types';
import { ComponentRegistry } from './component.registry';

const STORAGE_KEY = 'orbitox_commerce_custom_components';

export class CustomComponentEngine {
  private customComponents: Map<string, CustomComponentDefinition> = new Map();

  constructor() {
    this.hydrateFromStorage();
    this.ensureDefaultPresets();
  }

  private hydrateFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const list: CustomComponentDefinition[] = JSON.parse(raw);
        if (Array.isArray(list)) {
          for (const item of list) {
            this.customComponents.set(item.id, item);
            this.registerInComponentRegistry(item);
          }
        }
      }
    } catch (e) {
      console.warn('[CustomComponentEngine] Failed to hydrate custom components', e);
    }
  }

  private persistToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const list = Array.from(this.customComponents.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

      window.dispatchEvent(
        new CustomEvent('orbitox:custom_components_updated', {
          detail: { components: list },
        })
      );
    } catch (e) {
      console.warn('[CustomComponentEngine] Failed to persist custom components', e);
    }
  }

  private registerInComponentRegistry(comp: CustomComponentDefinition): void {
    const schema: ComponentDefinition['schema'] = {};
    const defaultSettings: Record<string, any> = {};

    for (const exp of comp.exposedSettings) {
      schema[exp.propertyKey] = {
        key: exp.propertyKey,
        label: exp.label,
        type: exp.type,
        defaultValue: exp.defaultValue,
        options: exp.options,
        description: exp.description,
      };
      defaultSettings[exp.propertyKey] = exp.defaultValue;
    }

    const def: ComponentDefinition = {
      type: comp.type as any,
      name: comp.name,
      category: 'custom',
      description: comp.description,
      icon: comp.icon || '🧩',
      schema,
      defaultSettings: { ...defaultSettings, ...comp.defaultSettings },
      isCustom: true,
      customComponentId: comp.id,
    };

    ComponentRegistry.register(def);
  }

  private ensureDefaultPresets(): void {
    if (this.customComponents.size >= 8) return;

    const presets: CustomComponentDefinition[] = [
      // 1. VIP Royal Members Card
      {
        id: 'comp_vip_club_card',
        type: 'custom_vip_club_card',
        name: 'VIP Royal Privilege Card',
        icon: '👑',
        description: 'Luxury member tier invitation box with gold trim & instant WhatsApp concierge CTA.',
        category: 'custom',
        blocks: [
          {
            id: 'blk_cont_vip',
            type: 'container',
            label: 'Card Wrapper',
            style: {
              background: 'linear-gradient(135deg, rgba(212,175,55,0.18), rgba(122,17,19,0.35))',
              border: '1px solid rgba(212,175,55,0.4)',
              borderRadius: '16px',
              padding: '36px 24px',
              textAlign: 'center',
              alignItems: 'center',
              gap: '14px',
              boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
            },
            properties: {},
            children: [
              {
                id: 'blk_badge_vip',
                type: 'badge',
                label: 'Top Tier Badge',
                properties: { text: '👑 ROYAL PRIVILEGE CIRCLE' },
                style: {
                  background: 'rgba(212,175,55,0.25)',
                  color: '#D4AF37',
                  padding: '5px 14px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: '800',
                },
              },
              {
                id: 'blk_txt_vip_h',
                type: 'text',
                label: 'Main Heading',
                properties: { text: 'Unlock Bespoke Concierge & 20% Off All Bridal Sets', tag: 'h3' },
                style: { fontSize: '26px', fontWeight: '900', color: '#FFFFFF', margin: '0' },
              },
              {
                id: 'blk_txt_vip_sub',
                type: 'text',
                label: 'Subtitle',
                properties: { text: 'Complimentary royal beeswax care kit and direct bridal stylist on WhatsApp.' },
                style: { fontSize: '13px', color: 'rgba(255,255,255,0.85)', maxWidth: '540px' },
              },
              {
                id: 'blk_btn_vip',
                type: 'button',
                label: 'Action CTA Button',
                properties: { text: 'Claim VIP Privileges', link: '/shop', icon: '✨' },
                style: {
                  background: 'linear-gradient(135deg, #D4AF37, #F59E0B)',
                  color: '#000000',
                  padding: '14px 32px',
                  borderRadius: '8px',
                  fontWeight: '900',
                  fontSize: '13px',
                  boxShadow: '0 0 20px rgba(212,175,55,0.4)',
                },
              },
            ],
          },
        ],
        exposedSettings: [
          {
            id: 'exp_heading',
            blockId: 'blk_txt_vip_h',
            propertyKey: 'text',
            label: 'Header Text',
            type: 'text',
            defaultValue: 'Unlock Bespoke Concierge & 20% Off All Bridal Sets',
          },
          {
            id: 'exp_btn_text',
            blockId: 'blk_btn_vip',
            propertyKey: 'text',
            label: 'Button CTA Text',
            type: 'text',
            defaultValue: 'Claim VIP Privileges',
          },
        ],
        defaultSettings: {
          text: 'Unlock Bespoke Concierge & 20% Off All Bridal Sets',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },

      // 2. Heritage Guarantee 3-Column Shield
      {
        id: 'comp_delivery_guarantee',
        type: 'custom_delivery_guarantee',
        name: 'Heritage Guarantee Shield',
        icon: '🛡️',
        description: 'Three-pillar trust shield highlighting Handcrafted Authenticity, Express Shipping & No-Bite Comfort.',
        category: 'custom',
        blocks: [
          {
            id: 'blk_cols_main',
            type: 'columns',
            label: '3 Column Trust Grid',
            style: {
              gap: '16px',
              padding: '28px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.08)',
            },
            properties: { columnCount: 3 },
            children: [
              {
                id: 'blk_col_1',
                type: 'card',
                label: 'Shield 1',
                style: { textAlign: 'center', padding: '16px', gap: '8px', alignItems: 'center' },
                properties: {
                  icon: '👑',
                  title: 'Pure Dabka & Zardozi',
                  subtitle: '100% Hand-embroidered by 3rd-gen master karigars in Punjab.',
                },
              },
              {
                id: 'blk_col_2',
                type: 'card',
                label: 'Shield 2',
                style: { textAlign: 'center', padding: '16px', gap: '8px', alignItems: 'center' },
                properties: {
                  icon: '⚡',
                  title: 'Express 48-Hour Dispatch',
                  subtitle: 'Insured worldwide courier with live tracking to your doorstep.',
                },
              },
              {
                id: 'blk_col_3',
                type: 'card',
                label: 'Shield 3',
                style: { textAlign: 'center', padding: '16px', gap: '8px', alignItems: 'center' },
                properties: {
                  icon: '☁️',
                  title: 'Double Memory Foam Sole',
                  subtitle: 'Zero shoe-bite guarantee for 12+ hours of celebration dance.',
                },
              },
            ],
          },
        ],
        exposedSettings: [],
        defaultSettings: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },

      // 3. Limited Edition Flash Sale 24H Banner
      {
        id: 'comp_flash_sale_banner',
        type: 'custom_flash_sale_banner',
        name: 'Flash Sale 24H Countdown',
        icon: '⏱️',
        description: 'Ticking countdown timer bar with luxury gold gradients and instant promo redemption.',
        category: 'custom',
        blocks: [
          {
            id: 'blk_cont_flash',
            type: 'container',
            label: 'Flash Sale Bar',
            style: {
              background: 'linear-gradient(90deg, #4A0A0B, #7A1113, #4A0A0B)',
              border: '1px solid #D4AF37',
              borderRadius: '12px',
              padding: '24px 32px',
              textAlign: 'center',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 0 24px rgba(122, 17, 19, 0.6)',
            },
            properties: {},
            children: [
              {
                id: 'blk_badge_flash',
                type: 'badge',
                label: 'Flash Badge',
                properties: { text: '⚡ LIMITED 24-HOUR MAHARANI DROP' },
                style: { background: '#D4AF37', color: '#000', padding: '4px 12px', borderRadius: '999px', fontWeight: '900', fontSize: '11px' },
              },
              {
                id: 'blk_timer_flash',
                type: 'countdown',
                label: 'Countdown Timer',
                properties: { targetDate: '2026-12-31T23:59:59', title: 'Offer Expires In:' },
                style: { color: '#D4AF37', fontSize: '18px', fontWeight: '900' },
              },
              {
                id: 'blk_btn_flash',
                type: 'button',
                label: 'Redeem CTA',
                properties: { text: 'Shop Flash Drop (Code: ROYAL25)', link: '/shop', icon: '🛍️' },
                style: { background: '#D4AF37', color: '#000', padding: '12px 24px', borderRadius: '6px', fontWeight: '800', fontSize: '12px' },
              },
            ],
          },
        ],
        exposedSettings: [],
        defaultSettings: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },

      // 4. Master Karigar Artisan Story
      {
        id: 'comp_artisan_story',
        type: 'custom_artisan_story',
        name: 'Master Karigar Artisan Story',
        icon: '🧵',
        description: 'Visual tribute to heritage embroidery karigars with quote, portrait and authenticity stamp.',
        category: 'custom',
        blocks: [
          {
            id: 'blk_cols_story',
            type: 'columns',
            label: 'Story Grid',
            style: { gap: '24px', padding: '32px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(212,175,55,0.2)' },
            properties: { columnCount: 2 },
            children: [
              {
                id: 'blk_img_karigar',
                type: 'image',
                label: 'Karigar Photo',
                properties: {
                  url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=800&auto=format&fit=crop',
                  altText: 'Master Karigar Hand-embroidery',
                  height: '280px',
                },
                style: { borderRadius: '12px' },
              },
              {
                id: 'blk_cont_quote',
                type: 'container',
                label: 'Quote Text',
                style: { textAlign: 'left', alignItems: 'flex-start', gap: '12px' },
                properties: {},
                children: [
                  {
                    id: 'blk_badge_heritage',
                    type: 'badge',
                    label: 'Badge',
                    properties: { text: '🏛️ HERITAGE PATIALA ATELIER' },
                    style: { background: 'rgba(212,175,55,0.15)', color: '#D4AF37', padding: '3px 10px', borderRadius: '999px', fontSize: '10px', fontWeight: '800' },
                  },
                  {
                    id: 'blk_txt_quote_h',
                    type: 'text',
                    label: 'Quote Title',
                    properties: { text: '"Each stitch carries the soul of 100 years of Punjab."', tag: 'h3' },
                    style: { fontSize: '20px', fontWeight: '900', color: '#FFF' },
                  },
                  {
                    id: 'blk_txt_quote_body',
                    type: 'text',
                    label: 'Quote Body',
                    properties: { text: 'Our master artisans spend up to 40 hours crafting a single pair of Zardozi juttis, using pure silver-plated threads and genuine vegetable-tanned leather.' },
                    style: { fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' },
                  },
                ],
              },
            ],
          },
        ],
        exposedSettings: [],
        defaultSettings: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },

      // 5. Customer UGC Video & Review Card
      {
        id: 'comp_ugc_review',
        type: 'custom_ugc_review',
        name: 'Bride Spotlight & UGC Review',
        icon: '⭐',
        description: 'Interactive verified customer review card with star rating and celebration video/photo.',
        category: 'custom',
        blocks: [
          {
            id: 'blk_cont_ugc',
            type: 'container',
            label: 'Review Card',
            style: {
              padding: '24px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center',
              alignItems: 'center',
              gap: '10px',
            },
            properties: {},
            children: [
              {
                id: 'blk_stars_1',
                type: 'star-rating',
                label: '5 Stars',
                properties: { rating: 5, reviewCount: 'Verified Bride' },
                style: {},
              },
              {
                id: 'blk_txt_review',
                type: 'text',
                label: 'Review text',
                properties: { text: '"Danced for 14 hours at my Sangeet with ZERO shoe bites! The memory padding is magic."' },
                style: { fontSize: '15px', fontWeight: '700', color: '#FFF', maxWidth: '480px' },
              },
              {
                id: 'blk_txt_author',
                type: 'text',
                label: 'Author',
                properties: { text: '— Simran K., London (Wore Maharani Gold Zardozi)' },
                style: { fontSize: '12px', color: '#D4AF37', fontWeight: '800' },
              },
            ],
          },
        ],
        exposedSettings: [],
        defaultSettings: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },

      // 6. Size Guide & Comfort Box
      {
        id: 'comp_size_guide',
        type: 'custom_size_guide',
        name: 'Size & Fit Recommendation',
        icon: '📐',
        description: 'Helpful fit guide with interactive conversion matrix and width advice.',
        category: 'custom',
        blocks: [
          {
            id: 'blk_cont_size',
            type: 'container',
            label: 'Fit Container',
            style: { padding: '24px', background: 'rgba(212,175,55,0.06)', borderRadius: '12px', border: '1px dashed rgba(212,175,55,0.4)', textAlign: 'center', alignItems: 'center', gap: '8px' },
            properties: {},
            children: [
              {
                id: 'blk_txt_fit_h',
                type: 'text',
                label: 'Fit Title',
                properties: { text: '📐 Unsure About Your Jutti Size?', tag: 'h4' },
                style: { fontSize: '16px', fontWeight: '900', color: '#D4AF37' },
              },
              {
                id: 'blk_txt_fit_p',
                type: 'text',
                label: 'Fit Description',
                properties: { text: 'Our juttis fit true to standard EU sizing. If in-between sizes or broad feet, we recommend choosing 1 size up for cloud-like comfort.' },
                style: { fontSize: '12px', color: 'rgba(255,255,255,0.8)', maxWidth: '460px' },
              },
            ],
          },
        ],
        exposedSettings: [],
        defaultSettings: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },

      // 7. Bespoke Wedding WhatsApp Concierge Box
      {
        id: 'comp_whatsapp_concierge',
        type: 'custom_whatsapp_concierge',
        name: 'Bespoke Wedding Concierge Box',
        icon: '💬',
        description: 'Direct 1-click WhatsApp stylist booking for bridal trousseau color-matching.',
        category: 'custom',
        blocks: [
          {
            id: 'blk_cont_wa',
            type: 'container',
            label: 'WhatsApp Box',
            style: { padding: '28px 20px', background: 'linear-gradient(135deg, rgba(37,211,102,0.15), rgba(0,0,0,0.4))', borderRadius: '12px', border: '1px solid rgba(37,211,102,0.4)', textAlign: 'center', alignItems: 'center', gap: '10px' },
            properties: {},
            children: [
              {
                id: 'blk_txt_wa_h',
                type: 'text',
                label: 'WhatsApp Title',
                properties: { text: '💬 Match Your Lehenga Color with Our Stylist', tag: 'h3' },
                style: { fontSize: '18px', fontWeight: '900', color: '#FFF' },
              },
              {
                id: 'blk_txt_wa_p',
                type: 'text',
                label: 'WhatsApp Sub',
                properties: { text: 'Send us your bridal lehenga fabric sample on WhatsApp for custom thread dyeing.' },
                style: { fontSize: '12px', color: 'rgba(255,255,255,0.8)' },
              },
              {
                id: 'blk_btn_wa',
                type: 'button',
                label: 'WhatsApp Button',
                properties: { text: 'Chat with Master Stylist', link: 'https://wa.me/919876543210', icon: '💬', action: 'whatsapp' },
                style: { background: '#25D366', color: '#FFF', padding: '10px 24px', borderRadius: '6px', fontWeight: '800', fontSize: '12px' },
              },
            ],
          },
        ],
        exposedSettings: [],
        defaultSettings: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },

      // 8. Comparison Matrix (Handmade vs Machine-made)
      {
        id: 'comp_comparison_matrix',
        type: 'custom_comparison_matrix',
        name: 'Handmade vs Machine Matrix',
        icon: '⚖️',
        description: 'Detailed feature comparison between authentic handcrafted juttis and mass-market synthetic shoes.',
        category: 'custom',
        blocks: [
          {
            id: 'blk_cols_matrix',
            type: 'columns',
            label: 'Matrix Grid',
            style: { gap: '16px', padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' },
            properties: { columnCount: 2 },
            children: [
              {
                id: 'blk_card_handmade',
                type: 'card',
                label: 'Handmade Card',
                style: { padding: '18px', background: 'rgba(212,175,55,0.1)', borderRadius: '8px', border: '1px solid #D4AF37', textAlign: 'left', gap: '6px' },
                properties: {
                  icon: '👑',
                  title: 'AURA Royal Atelier',
                  subtitle: '✓ 100% Genuine Leather\n✓ Pure Gold/Silver Dabka\n✓ Zero Shoe-Bite Memory Sole\n✓ Heirloom Preservation Box',
                },
              },
              {
                id: 'blk_card_commercial',
                type: 'card',
                label: 'Commercial Card',
                style: { padding: '18px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'left', gap: '6px' },
                properties: {
                  icon: '🏭',
                  title: 'Mass Commercial Market',
                  subtitle: '✕ Synthetic Rexine Sole\n✕ Machine Plastic Sequins\n✕ Stiff, Blister-prone Back\n✕ Polybag Packaging',
                },
              },
            ],
          },
        ],
        exposedSettings: [],
        defaultSettings: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const p of presets) {
      this.customComponents.set(p.id, p);
      this.registerInComponentRegistry(p);
    }
  }

  saveCustomComponent(component: CustomComponentDefinition): CustomComponentDefinition {
    this.hydrateFromStorage();
    const now = new Date().toISOString();
    const clean: CustomComponentDefinition = {
      ...component,
      id: component.id || `comp_custom_${Date.now()}`,
      type: component.type || `custom_${Date.now()}`,
      category: 'custom',
      updatedAt: now,
      createdAt: component.createdAt || now,
    };

    this.customComponents.set(clean.id, clean);
    this.registerInComponentRegistry(clean);
    this.persistToStorage();
    return clean;
  }

  getCustomComponent(idOrType: string): CustomComponentDefinition | undefined {
    this.hydrateFromStorage();
    for (const comp of this.customComponents.values()) {
      if (comp.id === idOrType || comp.type === idOrType) {
        return comp;
      }
    }
    return undefined;
  }

  listCustomComponents(storeId?: string): CustomComponentDefinition[] {
    this.hydrateFromStorage();
    const all = Array.from(this.customComponents.values());
    if (!storeId) return all;
    return all.filter((c) => !c.storeId || c.storeId === storeId);
  }

  deleteCustomComponent(id: string): boolean {
    this.hydrateFromStorage();
    const deleted = this.customComponents.delete(id);
    if (deleted) {
      this.persistToStorage();
    }
    return deleted;
  }

  exportComponentJson(id: string): string {
    const comp = this.getCustomComponent(id);
    if (!comp) throw new Error(`Custom component ${id} not found.`);
    return JSON.stringify(comp, null, 2);
  }

  importComponentJson(jsonStr: string): CustomComponentDefinition {
    const parsed = JSON.parse(jsonStr) as CustomComponentDefinition;
    if (!parsed.name || !parsed.blocks) {
      throw new Error('Invalid custom component JSON schema.');
    }
    parsed.id = `comp_imported_${Date.now()}`;
    parsed.type = `custom_imported_${Date.now()}`;
    return this.saveCustomComponent(parsed);
  }
}
