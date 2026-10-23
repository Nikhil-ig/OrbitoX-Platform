import { StoreMediaItem, MediaUploadPayload, MediaFolderType } from '../../types/media.types';

export interface StockPresetItem {
  id: string;
  category: 'Apparel' | 'Jewellery' | 'Audio & Tech' | 'Atelier & Runway' | 'Minimalist' | 'Lifestyle' | 'Punjabi Jutti & Heritage';
  title: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  altText: string;
}

export class MediaEngine {
  private mediaItems: Map<string, StoreMediaItem> = new Map();

  constructor(initialMedia: StoreMediaItem[] = []) {
    for (const m of initialMedia) this.mediaItems.set(m.id, m);

    // If empty, initialize with rich curated assets for stores
    if (this.mediaItems.size === 0) {
      const now = new Date().toISOString();
      const seedItems: StoreMediaItem[] = [
        {
          id: 'media_aura_hero_1',
          storeId: 'store_aura_luxury',
          tenantId: 'tenant_aura_corp',
          filename: 'milan-runway-solstice.jpg',
          url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop',
          mimeType: 'image/jpeg',
          sizeBytes: 1024 * 840,
          width: 2070,
          height: 1380,
          folder: 'banners',
          altText: 'Sculptural elegance couture model in virgin wool overcoat on Milan runway',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'media_aura_coat_front',
          storeId: 'store_aura_luxury',
          tenantId: 'tenant_aura_corp',
          filename: 'milano-double-breasted-coat.jpg',
          url: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?q=80&w=1000&auto=format&fit=crop',
          mimeType: 'image/jpeg',
          sizeBytes: 1024 * 420,
          width: 1000,
          height: 1500,
          folder: 'products',
          altText: '100% Italian virgin wool tailored double-breasted overcoat in obsidian black',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'media_aura_dress_silk',
          storeId: 'store_aura_luxury',
          tenantId: 'tenant_aura_corp',
          filename: 'venetian-draped-silk-dress.jpg',
          url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop',
          mimeType: 'image/jpeg',
          sizeBytes: 1024 * 510,
          width: 1000,
          height: 1500,
          folder: 'products',
          altText: 'Sculptural mulberry silk evening dress with fluid cowl neckline',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'media_aura_necklace_gold',
          storeId: 'store_aura_luxury',
          tenantId: 'tenant_aura_corp',
          filename: 'lumina-18k-gold-pendant.jpg',
          url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=1000&auto=format&fit=crop',
          mimeType: 'image/jpeg',
          sizeBytes: 1024 * 310,
          width: 1000,
          height: 1000,
          folder: 'products',
          altText: '18k solid gold minimalist geometric link pendant necklace with diamond pave',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'media_aura_atelier_banner',
          storeId: 'store_aura_luxury',
          tenantId: 'tenant_aura_corp',
          filename: 'bespoke-tailor-atelier.jpg',
          url: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=2070&auto=format&fit=crop',
          mimeType: 'image/jpeg',
          sizeBytes: 1024 * 960,
          width: 2070,
          height: 1100,
          folder: 'banners',
          altText: 'Private tailoring digital consultation and bespoke fabric master cutting',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'media_aura_runway_solstice',
          storeId: 'store_aura_luxury',
          tenantId: 'tenant_aura_corp',
          filename: 'solstice-lookbook-model.jpg',
          url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1200&auto=format&fit=crop',
          mimeType: 'image/jpeg',
          sizeBytes: 1024 * 630,
          width: 1200,
          height: 1600,
          folder: 'pages',
          altText: 'AURA Spring Solstice 2026 flagship lookbook showcase',
          createdAt: now,
          updatedAt: now,
        },
      ];

      for (const item of seedItems) {
        this.mediaItems.set(item.id, item);
      }
    }
  }

  uploadMedia(storeId: string, tenantId: string, payload: MediaUploadPayload): StoreMediaItem {
    const now = new Date().toISOString();
    const mediaId = `media_${globalThis.crypto.randomUUID()}`;

    const url = payload.dataBase64
      ? payload.dataBase64
      : `https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1999&auto=format&fit=crop`;

    const item: StoreMediaItem = {
      id: mediaId,
      storeId,
      tenantId,
      filename: payload.filename.trim() || 'upload.jpg',
      url,
      mimeType: payload.mimeType || 'image/jpeg',
      sizeBytes: payload.sizeBytes || 1024 * 350,
      width: 1200,
      height: 800,
      folder: payload.folder || 'general',
      altText: payload.altText || payload.filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      createdAt: now,
      updatedAt: now,
    };

    this.mediaItems.set(item.id, item);
    return item;
  }

  addMediaFromUrl(
    storeId: string,
    tenantId: string,
    payload: {
      url: string;
      filename?: string;
      folder?: MediaFolderType;
      altText?: string;
      sizeBytes?: number;
    }
  ): StoreMediaItem {
    const now = new Date().toISOString();
    const mediaId = `media_${globalThis.crypto.randomUUID()}`;
    const filename = payload.filename || `asset_${Date.now()}.jpg`;

    const item: StoreMediaItem = {
      id: mediaId,
      storeId,
      tenantId,
      filename,
      url: payload.url.trim(),
      mimeType: 'image/jpeg',
      sizeBytes: payload.sizeBytes || 1024 * 400,
      width: 1200,
      height: 800,
      folder: payload.folder || 'general',
      altText: payload.altText || filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      createdAt: now,
      updatedAt: now,
    };

    this.mediaItems.set(item.id, item);
    return item;
  }

  updateMedia(
    mediaId: string,
    updates: {
      filename?: string;
      altText?: string;
      folder?: MediaFolderType;
    }
  ): StoreMediaItem | null {
    const item = this.mediaItems.get(mediaId);
    if (!item) return null;

    if (updates.filename !== undefined) item.filename = updates.filename.trim();
    if (updates.altText !== undefined) item.altText = updates.altText.trim();
    if (updates.folder !== undefined) item.folder = updates.folder;
    item.updatedAt = new Date().toISOString();

    return item;
  }

  deleteMedia(mediaId: string): boolean {
    return this.mediaItems.delete(mediaId);
  }

  getMediaById(mediaId: string): StoreMediaItem | null {
    return this.mediaItems.get(mediaId) || null;
  }

  listMediaByStore(storeId: string, folder?: MediaFolderType, search?: string): StoreMediaItem[] {
    let list = Array.from(this.mediaItems.values()).filter((m) => m.storeId === storeId);

    if (folder && folder !== 'general' as any && (folder as any) !== 'all') {
      list = list.filter((m) => m.folder === folder);
    }

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.filename.toLowerCase().includes(q) ||
          (m.altText && m.altText.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getStorageUsageBytes(storeId: string): number {
    return this.listMediaByStore(storeId).reduce((sum, item) => sum + item.sizeBytes, 0);
  }

  /**
   * Curated high-resolution stock photography presets ready for 1-click import
   */
  getCuratedStockPresets(): StockPresetItem[] {
    return [
      {
        id: 'stock_apparel_1',
        category: 'Apparel',
        title: 'Italian Wool Overcoat',
        url: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?q=80&w=1200&auto=format&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?q=80&w=400&auto=format&fit=crop',
        width: 1200,
        height: 1600,
        altText: 'Tailored virgin wool overcoat with structured shoulders',
      },
      {
        id: 'stock_apparel_2',
        category: 'Apparel',
        title: 'Silk Evening Gown',
        url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200&auto=format&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=400&auto=format&fit=crop',
        width: 1200,
        height: 1600,
        altText: 'Mulberry silk draped evening dress in champagne gold',
      },
      {
        id: 'stock_jewellery_1',
        category: 'Jewellery',
        title: '18K Gold Geometric Necklace',
        url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=1200&auto=format&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=400&auto=format&fit=crop',
        width: 1200,
        height: 1200,
        altText: '18k solid gold necklace with diamond accent',
      },
      {
        id: 'stock_jewellery_2',
        category: 'Jewellery',
        title: 'Diamond Solitaire Ring',
        url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=1200&auto=format&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=400&auto=format&fit=crop',
        width: 1200,
        height: 1200,
        altText: 'Platinum conflict-free brilliant cut diamond ring',
      },
      {
        id: 'stock_tech_1',
        category: 'Audio & Tech',
        title: 'Studio Planar Headphones',
        url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1200&auto=format&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=400&auto=format&fit=crop',
        width: 1200,
        height: 900,
        altText: 'Precision machined anodized aluminum wireless studio headphones',
      },
      {
        id: 'stock_tech_2',
        category: 'Audio & Tech',
        title: 'Minimalist Mechanical Keyboard',
        url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?q=80&w=1200&auto=format&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?q=80&w=400&auto=format&fit=crop',
        width: 1200,
        height: 800,
        altText: 'Custom CNC aluminum mechanical keyboard with tactile switches',
      },
      {
        id: 'stock_runway_1',
        category: 'Atelier & Runway',
        title: 'Milan Runway Solstice',
        url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2000&auto=format&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=400&auto=format&fit=crop',
        width: 2000,
        height: 1200,
        altText: 'Architectural couture garments showcased at Milan fashion week',
      },
      {
        id: 'stock_atelier_1',
        category: 'Atelier & Runway',
        title: 'Senior Master Cutter Atelier',
        url: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=2000&auto=format&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=400&auto=format&fit=crop',
        width: 2000,
        height: 1100,
        altText: 'Private tailor cutting bespoke suit fabrics in luxury atelier',
      },
      {
        id: 'stock_minimal_1',
        category: 'Minimalist',
        title: 'Monochrome Architectural Interior',
        url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=400&auto=format&fit=crop',
        width: 1200,
        height: 800,
        altText: 'Minimalist contemporary gallery interior with natural light',
      },
      {
        id: 'stock_lifestyle_1',
        category: 'Lifestyle',
        title: 'Fine Living Morning Ritual',
        url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1200&auto=format&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop',
        width: 1200,
        height: 1500,
        altText: 'High fashion lifestyle editorial in natural daylight',
      },
      {
        id: 'stock_jutti_1',
        category: 'Punjabi Jutti & Heritage',
        title: 'Royal Zardozi Gold Bridal Jutti',
        url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1200&auto=format&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=400&auto=format&fit=crop',
        width: 1200,
        height: 1200,
        altText: 'Authentic royal zardozi and gold thread embroidered Punjabi bridal jutti',
      },
      {
        id: 'stock_jutti_2',
        category: 'Punjabi Jutti & Heritage',
        title: 'Emerald Velvet Dabka Jutti',
        url: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=1200&auto=format&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=400&auto=format&fit=crop',
        width: 1200,
        height: 1200,
        altText: 'Plush emerald green velvet jutti with antique silver dabka embroidery',
      },
      {
        id: 'stock_jutti_3',
        category: 'Punjabi Jutti & Heritage',
        title: 'Phulkari Heritage Silk Jutti',
        url: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=1200&auto=format&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=400&auto=format&fit=crop',
        width: 1200,
        height: 1200,
        altText: 'Traditional Patiala phulkari embroidery with pure leather sole',
      },
      {
        id: 'stock_jutti_4',
        category: 'Punjabi Jutti & Heritage',
        title: 'Royal Heritage Footwear Atelier',
        url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2000&auto=format&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=400&auto=format&fit=crop',
        width: 2000,
        height: 1200,
        altText: 'Artisanal handcrafting and leather stitching atelier in Punjab',
      },
    ];
  }
}
