import { PageSection } from './component.types';

export interface PageSEO {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
}

export interface StorePage {
  id: string;
  storeId: string;
  slug: string; // e.g. "/" for home, "/about", "/contact", "/sale"
  title: string;
  isHome: boolean;
  isSystem: boolean; // system pages: home, shop, product, cart, checkout, order-tracking
  publishedVersion: number;
  draftVersion: number;
  sectionsDraft: PageSection[];
  sectionsPublished: PageSection[];
  seo: PageSEO;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePagePayload {
  slug: string;
  title: string;
  isHome?: boolean;
  sections?: PageSection[];
  seo?: PageSEO;
}

export interface UpdatePageSectionsPayload {
  sections: PageSection[];
}

export interface PublishPageResult {
  pageId: string;
  publishedVersion: number;
  sectionsCount: number;
  publishedAt: string;
}
