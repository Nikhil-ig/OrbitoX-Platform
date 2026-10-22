'use client';

export type CMSFieldType = 'text' | 'richtext' | 'image' | 'number' | 'boolean' | 'date' | 'slug';

export interface CMSField {
  id: string;
  key: string;
  label: string;
  type: CMSFieldType;
  required?: boolean;
  defaultValue?: any;
}

export interface CMSCollection {
  id: string;
  name: string;
  slug: string;
  description: string;
  fields: CMSField[];
  items: Record<string, any>[];
}

const STORAGE_KEY = 'orbitox_cms_collections_store_v1';

const DEFAULT_COLLECTIONS: CMSCollection[] = [
  {
    id: 'col_products',
    name: 'Products',
    slug: 'products',
    description: 'Hardware and software products in the catalog',
    fields: [
      { id: 'f1', key: 'title', label: 'Product Name', type: 'text', required: true },
      { id: 'f2', key: 'price', label: 'Price ($)', type: 'number', required: true },
      { id: 'f3', key: 'thumbnail', label: 'Thumbnail', type: 'image' },
      { id: 'f4', key: 'category', label: 'Category', type: 'text' },
      { id: 'f5', key: 'inStock', label: 'In Stock', type: 'boolean' },
      { id: 'f6', key: 'slug', label: 'URL Slug', type: 'slug' },
    ],
    items: [
      {
        id: 'prod_1',
        title: 'OrbitoX Spatial Vision Pro',
        price: 1299,
        thumbnail: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=600&auto=format&fit=crop&q=80',
        category: 'Hardware',
        inStock: true,
        slug: 'spatial-vision-pro',
      },
      {
        id: 'prod_2',
        title: 'Haptic Spatial Controller Set',
        price: 249,
        thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
        category: 'Accessories',
        inStock: true,
        slug: 'haptic-controllers',
      },
      {
        id: 'prod_3',
        title: 'Neural Audio Headphones',
        price: 389,
        thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
        category: 'Audio',
        inStock: true,
        slug: 'neural-audio-headphones',
      },
    ],
  },
  {
    id: 'col_blog_posts',
    name: 'Blog Posts',
    slug: 'blog_posts',
    description: 'Editorial insights and product changelogs',
    fields: [
      { id: 'b1', key: 'title', label: 'Article Title', type: 'text', required: true },
      { id: 'b2', key: 'excerpt', label: 'Excerpt', type: 'text' },
      { id: 'b3', key: 'coverImage', label: 'Cover Image', type: 'image' },
      { id: 'b4', key: 'author', label: 'Author', type: 'text' },
      { id: 'b5', key: 'publishedDate', label: 'Published Date', type: 'date' },
      { id: 'b6', key: 'slug', label: 'Slug', type: 'slug' },
    ],
    items: [
      {
        id: 'post_1',
        title: 'Zero-Latency Spatial Streaming with WebRTC 2.0',
        excerpt: 'How we reduced rendering delay to sub-10 milliseconds in the browser canvas.',
        coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
        author: 'Alex Vance',
        publishedDate: '2026-10-01',
        slug: 'zero-latency-spatial-streaming',
      },
      {
        id: 'post_2',
        title: 'Designing for 6 Viewports: The Art of Responsive Canvas',
        excerpt: 'A deep dive into fluid layout systems from mobile small to ultra-wide displays.',
        coverImage: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=600&auto=format&fit=crop&q=80',
        author: 'Elena Rostova',
        publishedDate: '2026-09-28',
        slug: 'responsive-art-direction-guide',
      },
    ],
  },
  {
    id: 'col_testimonials',
    name: 'Client Testimonials',
    slug: 'testimonials',
    description: 'Customer reviews and feedback',
    fields: [
      { id: 't1', key: 'clientName', label: 'Client Name', type: 'text', required: true },
      { id: 't2', key: 'company', label: 'Company', type: 'text' },
      { id: 't3', key: 'quote', label: 'Testimonial Quote', type: 'text' },
      { id: 't4', key: 'avatar', label: 'Avatar URL', type: 'image' },
      { id: 't5', key: 'rating', label: 'Star Rating', type: 'number' },
    ],
    items: [
      {
        id: 't_1',
        clientName: 'Sarah Jenkins',
        company: 'Apex Media',
        quote: 'OrbitoX transformed our creative workflow from days into 20 minutes flat.',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        rating: 5,
      },
      {
        id: 't_2',
        clientName: 'Marcus Aurelius',
        company: 'Solaria Labs',
        quote: 'The visual box model and multi-MIME paste make this feel like desktop software in the web.',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        rating: 5,
      },
    ],
  },
];

export class CMSCollectionStore {
  private static collections: CMSCollection[] = [];
  private static listeners: Set<() => void> = new Set();
  private static initialized = false;

  private static init() {
    if (this.initialized) return;
    this.initialized = true;

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          this.collections = JSON.parse(stored);
          return;
        }
      } catch (e) {
        console.warn('Failed to load collections from localStorage', e);
      }
    }
    this.collections = JSON.parse(JSON.stringify(DEFAULT_COLLECTIONS));
    this.persist();
  }

  private static persist() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.collections));
      } catch (e) {
        console.warn('Failed to persist collections to localStorage', e);
      }
    }
    this.notify();
  }

  private static notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('Error notifying CMSCollectionStore listener:', err);
      }
    });
  }

  static subscribe(listener: () => void): () => void {
    this.init();
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  static getCollections(): CMSCollection[] {
    this.init();
    return [...this.collections];
  }

  static getCollection(idOrSlug: string): CMSCollection | undefined {
    this.init();
    return this.collections.find((c) => c.id === idOrSlug || c.slug === idOrSlug);
  }

  static getCollectionItems(idOrSlug: string): Record<string, any>[] {
    const col = this.getCollection(idOrSlug);
    return col ? col.items : [];
  }

  static createCollection(colData: Partial<CMSCollection>): CMSCollection {
    this.init();
    const id = `col_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const name = colData.name || 'New Collection';
    const slug = colData.slug || name.toLowerCase().replace(/[^a-z0-9]/g, '_');

    const newCollection: CMSCollection = {
      id,
      name,
      slug,
      description: colData.description || '',
      fields: colData.fields || [
        { id: 'f_title', key: 'title', label: 'Title', type: 'text', required: true },
      ],
      items: colData.items || [],
    };

    this.collections.push(newCollection);
    this.persist();
    return newCollection;
  }

  static updateCollection(id: string, patch: Partial<CMSCollection>): void {
    this.init();
    const idx = this.collections.findIndex((c) => c.id === id);
    const col = this.collections[idx];
    if (col) {
      this.collections[idx] = { ...col, ...patch, id: col.id };
      this.persist();
    }
  }

  static deleteCollection(id: string): void {
    this.init();
    this.collections = this.collections.filter((c) => c.id !== id);
    this.persist();
  }

  static addItem(collectionId: string, itemData: Record<string, any>): Record<string, any> {
    this.init();
    const col = this.collections.find((c) => c.id === collectionId || c.slug === collectionId);
    if (!col) throw new Error(`Collection not found: ${collectionId}`);

    const id = itemData.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const item = { ...itemData, id };
    col.items.push(item);
    this.persist();
    return item;
  }

  static updateItem(collectionId: string, itemId: string, patch: Record<string, any>): void {
    this.init();
    const col = this.collections.find((c) => c.id === collectionId || c.slug === collectionId);
    if (!col) return;

    const idx = col.items.findIndex((it) => it.id === itemId);
    if (idx !== -1) {
      col.items[idx] = { ...col.items[idx], ...patch };
      this.persist();
    }
  }

  static deleteItem(collectionId: string, itemId: string): void {
    this.init();
    const col = this.collections.find((c) => c.id === collectionId || c.slug === collectionId);
    if (!col) return;

    col.items = col.items.filter((it) => it.id !== itemId);
    this.persist();
  }
}
