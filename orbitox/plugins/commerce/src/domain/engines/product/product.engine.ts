import {
  Product,
  ProductVariant,
  ProductOption,
  ProductFilter,
  Category,
  Collection,
  ProductStatus,
} from '../../types/product.types';

export class ProductEngine {
  private products: Map<string, Product> = new Map();
  private categories: Map<string, Category> = new Map();
  private collections: Map<string, Collection> = new Map();

  constructor(
    initialProducts: Product[] = [],
    initialCategories: Category[] = [],
    initialCollections: Collection[] = []
  ) {
    for (const p of initialProducts) this.products.set(p.id, p);
    for (const c of initialCategories) this.categories.set(c.id, c);
    for (const col of initialCollections) this.collections.set(col.id, col);
  }

  // ─── Categories ───────────────────────────────────────────────

  createCategory(storeId: string, name: string, description?: string, imageUrl?: string, parentId?: string): Category {
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');
    const now = new Date().toISOString();
    const category: Category = {
      id: `cat_${globalThis.crypto.randomUUID()}`,
      storeId,
      name: name.trim(),
      slug,
      description,
      imageUrl,
      parentId,
      displayOrder: this.listCategoriesByStore(storeId).length,
      createdAt: now,
      updatedAt: now,
    };

    this.categories.set(category.id, category);
    return category;
  }

  listCategoriesByStore(storeId: string): Category[] {
    const all = Array.from(this.categories.values()).filter((c) => c.storeId === storeId);
    all.forEach((cat) => {
      cat.productCount = Array.from(this.products.values()).filter(
        (p) => p.storeId === storeId && p.categoryId === cat.id
      ).length;
    });
    return all.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  getCategoryById(categoryId: string): Category | null {
    return this.categories.get(categoryId) || null;
  }

  getCategoryBySlug(storeId: string, slug: string): Category | null {
    for (const cat of this.categories.values()) {
      if (cat.storeId === storeId && cat.slug === slug) return cat;
    }
    return null;
  }

  // ─── Collections ──────────────────────────────────────────────

  createCollection(
    storeId: string,
    title: string,
    ruleType: 'manual' | 'smart' = 'manual',
    productIds: string[] = [],
    description?: string,
    imageUrl?: string
  ): Collection {
    const slug = title.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');
    const now = new Date().toISOString();
    const collection: Collection = {
      id: `col_${globalThis.crypto.randomUUID()}`,
      storeId,
      title: title.trim(),
      slug,
      description,
      imageUrl,
      ruleType,
      productIds: ruleType === 'manual' ? productIds : [],
      productCount: productIds.length,
      createdAt: now,
      updatedAt: now,
    };

    this.collections.set(collection.id, collection);
    return collection;
  }

  listCollectionsByStore(storeId: string): Collection[] {
    return Array.from(this.collections.values()).filter((c) => c.storeId === storeId);
  }

  getCollectionBySlug(storeId: string, slug: string): Collection | null {
    for (const col of this.collections.values()) {
      if (col.storeId === storeId && col.slug === slug) return col;
    }
    return null;
  }

  // ─── Products ─────────────────────────────────────────────────

  createProduct(
    storeId: string,
    tenantId: string,
    payload: {
      title: string;
      description: string;
      shortDescription?: string;
      price: number;
      compareAtPrice?: number;
      costPrice?: number;
      sku: string;
      categoryId?: string;
      collectionIds?: string[];
      tags?: string[];
      media?: Array<{ url: string; type?: 'image' | 'video'; isPrimary?: boolean }>;
      options?: ProductOption[];
      inventoryQuantity?: number;
      isFeatured?: boolean;
    }
  ): Product {
    if (!payload.title || payload.price === undefined) {
      throw new Error('Product creation failed: title and price are required.');
    }

    const slug = payload.title.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');
    const now = new Date().toISOString();
    const productId = `prod_${globalThis.crypto.randomUUID()}`;

    // Generate variants if options exist
    let variants: ProductVariant[] = [];
    const hasVariants = Boolean(payload.options && payload.options.length > 0);

    if (hasVariants && payload.options) {
      variants = this.generateVariantMatrix(productId, payload.sku, payload.price, payload.options);
    }

    const media = (payload.media || []).map((m, idx) => ({
      id: `media_${Date.now()}_${idx}`,
      url: m.url,
      type: m.type || 'image',
      isPrimary: m.isPrimary ?? idx === 0,
      order: idx,
    }));

    const category = payload.categoryId ? this.categories.get(payload.categoryId) : undefined;

    const newProduct: Product = {
      id: productId,
      storeId,
      tenantId,
      title: payload.title.trim(),
      slug,
      description: payload.description,
      shortDescription: payload.shortDescription,
      price: payload.price,
      compareAtPrice: payload.compareAtPrice,
      costPrice: payload.costPrice,
      sku: payload.sku || `SKU-${globalThis.crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      status: 'active',
      categoryId: payload.categoryId,
      categoryName: category?.name,
      collectionIds: payload.collectionIds || [],
      tags: payload.tags || [],
      media,
      hasVariants,
      options: payload.options || [],
      variants,
      trackQuantity: true,
      inventoryQuantity: payload.inventoryQuantity ?? 100,
      isFeatured: payload.isFeatured ?? false,
      isNewArrival: true,
      isOnSale: Boolean(payload.compareAtPrice && payload.compareAtPrice > payload.price),
      rating: 4.8,
      reviewsCount: 12,
      seo: {
        metaTitle: payload.title,
        metaDescription: payload.shortDescription || payload.description.substring(0, 160),
        slug,
      },
      attributes: {},
      createdAt: now,
      updatedAt: now,
    };

    this.products.set(productId, newProduct);
    return newProduct;
  }

  generateVariantMatrix(
    productId: string,
    baseSku: string,
    basePrice: number,
    options: ProductOption[]
  ): ProductVariant[] {
    if (options.length === 0) return [];

    // Cartesian product of option values
    const cartesian = (arrays: Array<any[]>): any[][] => {
      return arrays.reduce((acc, curr) => acc.flatMap((d) => curr.map((e) => [...d, e])), [[]]);
    };

    const valueArrays = options.map((opt) => opt.values.map((v) => ({ optionName: opt.name, value: v.label })));
    const combinations = cartesian(valueArrays);
    const now = new Date().toISOString();

    return combinations.map((combo, idx) => {
      const selectedOptions: Record<string, string> = {};
      const titleParts: string[] = [];

      combo.forEach((item: { optionName: string; value: string }) => {
        selectedOptions[item.optionName] = item.value;
        titleParts.push(item.value);
      });

      const title = titleParts.join(' / ');
      const skuSuffix = titleParts.map((t) => t.toUpperCase().replace(/[^A-Z0-9]/g, '')).join('-');

      return {
        id: `var_${productId}_${idx}_${globalThis.crypto.randomUUID().slice(0, 8)}`,
        productId,
        title,
        sku: `${baseSku}-${skuSuffix}`,
        price: basePrice,
        inventoryQuantity: 50,
        selectedOptions,
        createdAt: now,
        updatedAt: now,
      };
    });
  }

  getProductById(productId: string): Product | null {
    return this.products.get(productId) || null;
  }

  getProductBySlug(storeId: string, slug: string): Product | null {
    for (const prod of this.products.values()) {
      if (prod.storeId === storeId && prod.slug === slug) {
        return prod;
      }
    }
    return null;
  }

  listProducts(storeId: string, filter: ProductFilter = {}): { products: Product[]; total: number } {
    let list = Array.from(this.products.values()).filter((p) => p.storeId === storeId);

    if (filter.status) {
      list = list.filter((p) => p.status === filter.status);
    } else {
      // default to active if not specified in storefront
      list = list.filter((p) => p.status !== 'archived');
    }

    if (filter.categoryId) {
      list = list.filter((p) => p.categoryId === filter.categoryId);
    }

    if (filter.collectionId && filter.collectionId !== 'all') {
      list = list.filter((p) => p.collectionIds.includes(filter.collectionId!));
    }

    if (filter.isFeatured !== undefined) {
      list = list.filter((p) => p.isFeatured === filter.isFeatured);
    }

    if (filter.inStockOnly) {
      list = list.filter((p) => p.inventoryQuantity > 0);
    }

    if (filter.minPrice !== undefined) {
      list = list.filter((p) => p.price >= filter.minPrice!);
    }

    if (filter.maxPrice !== undefined) {
      list = list.filter((p) => p.price <= filter.maxPrice!);
    }

    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Sorting
    switch (filter.sortBy) {
      case 'price_asc':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'created_desc':
      default:
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    const total = list.length;
    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const paginated = list.slice((page - 1) * limit, page * limit);

    return { products: paginated, total };
  }

  updateProduct(productId: string, updates: Partial<Product>): Product {
    const product = this.products.get(productId);
    if (!product) throw new Error(`Product '${productId}' not found.`);

    const updated: Product = {
      ...product,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.products.set(productId, updated);
    return updated;
  }

  deleteProduct(productId: string): boolean {
    return this.products.delete(productId);
  }

  deductInventory(productId: string, quantity: number, variantId?: string): boolean {
    const product = this.products.get(productId);
    if (!product) return false;

    if (variantId && product.variants.length > 0) {
      const variant = product.variants.find((v) => v.id === variantId);
      if (variant) {
        variant.inventoryQuantity = Math.max(0, variant.inventoryQuantity - quantity);
      }
    }

    product.inventoryQuantity = Math.max(0, product.inventoryQuantity - quantity);
    product.updatedAt = new Date().toISOString();
    return true;
  }

  // ─── Smart Inventory & Variant Matrix ────────────────────────

  getInventorySummary(storeId: string): {
    totalProducts: number;
    totalVariants: number;
    totalStockUnits: number;
    inStockCount: number;
    lowStockCount: number;
    outOfStockCount: number;
  } {
    const prods = Array.from(this.products.values()).filter((p) => p.storeId === storeId);
    let totalVariants = 0;
    let totalStockUnits = 0;
    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    prods.forEach((p) => {
      const stock = p.inventoryQuantity;
      totalStockUnits += stock;
      totalVariants += Math.max(1, p.variants.length);

      if (stock === 0) {
        outOfStockCount += 1;
      } else if (stock < 5) {
        lowStockCount += 1;
      } else {
        inStockCount += 1;
      }
    });

    return {
      totalProducts: prods.length,
      totalVariants,
      totalStockUnits,
      inStockCount,
      lowStockCount,
      outOfStockCount,
    };
  }

  getLowStockProducts(storeId: string, threshold: number = 5): Product[] {
    return Array.from(this.products.values()).filter(
      (p) => p.storeId === storeId && p.inventoryQuantity <= threshold
    );
  }

  bulkUpdateInventory(updates: Array<{ productId: string; variantId?: string; quantity: number }>): boolean {
    updates.forEach((u) => {
      const product = this.products.get(u.productId);
      if (product) {
        if (u.variantId && product.variants.length > 0) {
          const variant = product.variants.find((v) => v.id === u.variantId);
          if (variant) {
            variant.inventoryQuantity = u.quantity;
          }
        }
        product.inventoryQuantity = u.quantity;
        product.updatedAt = new Date().toISOString();
      }
    });
    return true;
  }

  generateQuickVariantMatrix(options: {
    productId?: string;
    basePrice: number;
    sizes: string[];
    colors: string[];
    defaultStock?: number;
  }): ProductVariant[] {
    const variants: ProductVariant[] = [];
    const stock = options.defaultStock !== undefined ? options.defaultStock : 15;
    const now = new Date().toISOString();
    const prodId = options.productId || `prod_${Date.now()}`;

    const sizes = options.sizes.length > 0 ? options.sizes : ['One Size'];
    const colors = options.colors.length > 0 ? options.colors : ['Standard'];

    sizes.forEach((size) => {
      colors.forEach((color) => {
        const title = sizes.length > 1 && colors.length > 1 ? `${size} / ${color}` : sizes.length > 1 ? size : color;
        const skuSuffix = `${size.replace(/\s+/g, '')}-${color.replace(/\s+/g, '')}`.toUpperCase();

        variants.push({
          id: `var_${globalThis.crypto.randomUUID()}`,
          productId: prodId,
          title,
          sku: `SKU-${skuSuffix}`,
          price: options.basePrice,
          inventoryQuantity: stock,
          selectedOptions: {
            Size: size,
            Color: color,
          },
          createdAt: now,
          updatedAt: now,
        });
      });
    });

    return variants;
  }
}

