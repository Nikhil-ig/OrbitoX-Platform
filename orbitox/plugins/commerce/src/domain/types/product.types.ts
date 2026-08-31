export type ProductStatus = 'draft' | 'active' | 'archived';

export interface ProductMediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  altText?: string;
  isPrimary?: boolean;
  order: number;
}

export interface ProductOptionValue {
  id: string;
  label: string; // e.g. "Small", "Medium", "Red", "Black"
  hexColor?: string; // e.g. "#000000" for color options
}

export interface ProductOption {
  id: string;
  name: string; // e.g. "Size", "Color", "Material"
  values: ProductOptionValue[];
}

export interface ProductVariant {
  id: string;
  productId: string;
  title: string; // e.g. "Black / M"
  sku: string;
  barcode?: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  inventoryQuantity: number;
  allowBackorder?: boolean;
  weightGrams?: number;
  imageUrl?: string;
  selectedOptions: Record<string, string>; // e.g. { "Size": "M", "Color": "Black" }
  createdAt: string;
  updatedAt: string;
}

export interface ProductSEO {
  metaTitle?: string;
  metaDescription?: string;
  slug?: string;
}

export interface Category {
  id: string;
  storeId: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: string; // for nested sub-categories
  displayOrder: number;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionRule {
  field: 'price' | 'category' | 'tag' | 'title' | 'inventory';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: string | number;
}

export interface Collection {
  id: string;
  storeId: string;
  title: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  ruleType: 'manual' | 'smart';
  rules?: CollectionRule[];
  productIds?: string[];
  productCount?: number;
  featured?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  storeId: string;
  tenantId: string;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  sku: string;
  barcode?: string;
  status: ProductStatus;
  categoryId?: string;
  categoryName?: string;
  collectionIds: string[];
  tags: string[];
  media: ProductMediaItem[];
  hasVariants: boolean;
  options: ProductOption[];
  variants: ProductVariant[];
  trackQuantity: boolean;
  inventoryQuantity: number;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isOnSale?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  rating?: number;
  reviewsCount?: number;
  seo: ProductSEO;
  attributes: Record<string, string>;
  // Vertical-specific Traditional Fashion & Footwear attributes
  material?: string;
  embroideryWork?: string;
  occasion?: string;
  solePadding?: string;
  careGuide?: string;
  fitGuide?: string;
  customizationAvailable?: boolean;
  instagramReelUrl?: string;
  whatsappInquiryText?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilter {
  categoryId?: string;
  collectionId?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: ProductStatus;
  search?: string;
  tags?: string[];
  isFeatured?: boolean;
  inStockOnly?: boolean;
  sortBy?: 'price_asc' | 'price_desc' | 'created_desc' | 'popular' | 'rating';
  page?: number;
  limit?: number;
}
