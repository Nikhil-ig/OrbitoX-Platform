import { StorePage, CreatePagePayload, PublishPageResult } from '../../types/page.types';
import { PageSection, ComponentType } from '../../types/component.types';
import { ComponentRegistry } from '../component/component.registry';

const STORAGE_KEY = 'orbitox_commerce_pages';

export class PageBuilderEngine {
  private pages: Map<string, StorePage> = new Map();

  constructor(initialPages: StorePage[] = []) {
    for (const page of initialPages) {
      this.pages.set(page.id, page);
    }
    this.hydrateFromStorage();
  }

  private hydrateFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const storedPages: StorePage[] = JSON.parse(raw);
        if (Array.isArray(storedPages)) {
          for (const p of storedPages) {
            this.pages.set(p.id, p);
          }
        }
      }
    } catch (e) {
      console.warn('[PageBuilderEngine] Failed to hydrate from localStorage', e);
    }
  }

  private persistToStorage(publishedEvent?: { pageId: string; storeId: string }): void {
    if (typeof window === 'undefined') return;
    try {
      const list = Array.from(this.pages.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

      // Dispatch window event for same-tab hooks
      window.dispatchEvent(new CustomEvent('orbitox:pages_updated', { detail: { pages: list } }));

      if (publishedEvent) {
        window.dispatchEvent(
          new CustomEvent('orbitox:storefront:published', {
            detail: publishedEvent,
          })
        );
      }

      // Dispatch BroadcastChannel for cross-tab realtime sync
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('orbitox_commerce_sync');
        channel.postMessage({
          type: publishedEvent ? 'STOREFRONT_PUBLISHED' : 'PAGES_UPDATED',
          payload: publishedEvent || { pages: list },
        });
        channel.close();
      }
    } catch (e) {
      console.warn('[PageBuilderEngine] Failed to persist to localStorage', e);
    }
  }

  createDefaultHomePage(storeId: string): StorePage {
    this.hydrateFromStorage();

    // Check if already created in storage
    const existing = Array.from(this.pages.values()).find(
      (p) => p.storeId === storeId && p.slug === '/'
    );
    if (existing) return existing;

    const now = new Date().toISOString();
    const defaultSections: PageSection[] = [
      ComponentRegistry.createDefaultSection('announcement-bar', 0),
      ComponentRegistry.createDefaultSection('header', 1),
      ComponentRegistry.createDefaultSection('hero', 2),
      ComponentRegistry.createDefaultSection('trust-badges', 3),
      ComponentRegistry.createDefaultSection('category-grid', 4),
      ComponentRegistry.createDefaultSection('product-grid', 5),
      ComponentRegistry.createDefaultSection('banner', 6),
      ComponentRegistry.createDefaultSection('product-carousel', 7),
      ComponentRegistry.createDefaultSection('testimonials', 8),
      ComponentRegistry.createDefaultSection('newsletter', 9),
      ComponentRegistry.createDefaultSection('footer', 10),
    ];

    const homePage: StorePage = {
      id: `page_home_${storeId}`,
      storeId,
      slug: '/',
      title: 'Home',
      isHome: true,
      isSystem: true,
      publishedVersion: 1,
      draftVersion: 1,
      sectionsDraft: defaultSections,
      sectionsPublished: JSON.parse(JSON.stringify(defaultSections)),
      seo: {
        title: 'Home | Premium Online Store',
        description: 'Explore our latest collection of premium curated goods.',
      },
      createdAt: now,
      updatedAt: now,
    };

    this.pages.set(homePage.id, homePage);
    this.persistToStorage();
    return homePage;
  }

  createPage(storeId: string, payload: CreatePagePayload): StorePage {
    this.hydrateFromStorage();
    const now = new Date().toISOString();
    let cleanSlug = payload.slug.startsWith('/') ? payload.slug : `/${payload.slug}`;
    cleanSlug = cleanSlug.toLowerCase().trim().replace(/[^a-z0-9\-_/]/g, '-');

    // If marked isHome, unset other homepages for this store
    if (payload.isHome) {
      for (const p of this.pages.values()) {
        if (p.storeId === storeId && p.isHome) {
          p.isHome = false;
        }
      }
    }

    const newPage: StorePage = {
      id: `page_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      storeId,
      slug: cleanSlug,
      title: payload.title.trim(),
      isHome: payload.isHome || false,
      isSystem: false,
      publishedVersion: 1,
      draftVersion: 1,
      sectionsDraft: payload.sections || [
        ComponentRegistry.createDefaultSection('header', 0),
        ComponentRegistry.createDefaultSection('hero', 1),
        ComponentRegistry.createDefaultSection('footer', 2),
      ],
      sectionsPublished: payload.sections ? JSON.parse(JSON.stringify(payload.sections)) : [
        ComponentRegistry.createDefaultSection('header', 0),
        ComponentRegistry.createDefaultSection('hero', 1),
        ComponentRegistry.createDefaultSection('footer', 2),
      ],
      seo: payload.seo || { title: payload.title },
      createdAt: now,
      updatedAt: now,
    };

    this.pages.set(newPage.id, newPage);
    this.persistToStorage({ pageId: newPage.id, storeId });
    return newPage;
  }

  createPageWithTemplate(
    storeId: string,
    payload: {
      title: string;
      slug: string;
      template: 'blank' | 'lookbook' | 'about' | 'sale' | 'faq';
      isHome?: boolean;
      seo?: any;
    }
  ): StorePage {
    let sections: PageSection[] = [];

    switch (payload.template) {
      case 'lookbook':
        sections = [
          ComponentRegistry.createDefaultSection('announcement-bar', 0),
          ComponentRegistry.createDefaultSection('header', 1),
          ComponentRegistry.createDefaultSection('hero', 2),
          ComponentRegistry.createDefaultSection('banner', 3),
          ComponentRegistry.createDefaultSection('category-grid', 4),
          ComponentRegistry.createDefaultSection('testimonials', 5),
          ComponentRegistry.createDefaultSection('newsletter', 6),
          ComponentRegistry.createDefaultSection('footer', 7),
        ];
        break;

      case 'about':
        sections = [
          ComponentRegistry.createDefaultSection('header', 0),
          ComponentRegistry.createDefaultSection('hero', 1),
          ComponentRegistry.createDefaultSection('trust-badges', 2),
          ComponentRegistry.createDefaultSection('banner', 3),
          ComponentRegistry.createDefaultSection('testimonials', 4),
          ComponentRegistry.createDefaultSection('footer', 5),
        ];
        break;

      case 'sale':
        sections = [
          ComponentRegistry.createDefaultSection('announcement-bar', 0),
          ComponentRegistry.createDefaultSection('header', 1),
          ComponentRegistry.createDefaultSection('hero', 2),
          ComponentRegistry.createDefaultSection('product-grid', 3),
          ComponentRegistry.createDefaultSection('banner', 4),
          ComponentRegistry.createDefaultSection('trust-badges', 5),
          ComponentRegistry.createDefaultSection('newsletter', 6),
          ComponentRegistry.createDefaultSection('footer', 7),
        ];
        break;

      case 'faq':
        sections = [
          ComponentRegistry.createDefaultSection('announcement-bar', 0),
          ComponentRegistry.createDefaultSection('header', 1),
          ComponentRegistry.createDefaultSection('hero', 2),
          ComponentRegistry.createDefaultSection('trust-badges', 3),
          ComponentRegistry.createDefaultSection('newsletter', 4),
          ComponentRegistry.createDefaultSection('footer', 5),
        ];
        break;

      case 'blank':
      default:
        sections = [
          ComponentRegistry.createDefaultSection('header', 0),
          ComponentRegistry.createDefaultSection('hero', 1),
          ComponentRegistry.createDefaultSection('footer', 2),
        ];
        break;
    }

    return this.createPage(storeId, {
      title: payload.title,
      slug: payload.slug,
      isHome: payload.isHome,
      seo: payload.seo,
      sections,
    });
  }

  updatePageMeta(
    pageId: string,
    updates: { title?: string; slug?: string; isHome?: boolean; seo?: any }
  ): StorePage {
    this.hydrateFromStorage();
    const page = this.pages.get(pageId);
    if (!page) throw new Error(`Page '${pageId}' not found.`);

    if (updates.title) page.title = updates.title.trim();
    if (updates.slug) {
      const clean = updates.slug.startsWith('/') ? updates.slug : `/${updates.slug}`;
      page.slug = clean.toLowerCase().trim().replace(/[^a-z0-9\-_/]/g, '-');
    }
    if (updates.isHome !== undefined) {
      if (updates.isHome) {
        for (const p of this.pages.values()) {
          if (p.storeId === page.storeId && p.id !== pageId) {
            p.isHome = false;
          }
        }
      }
      page.isHome = updates.isHome;
    }
    if (updates.seo) page.seo = { ...page.seo, ...updates.seo };

    page.updatedAt = new Date().toISOString();
    this.persistToStorage();
    return page;
  }

  deletePage(pageId: string): boolean {
    this.hydrateFromStorage();
    const page = this.pages.get(pageId);
    if (!page) return false;
    if (page.isHome) {
      throw new Error('Cannot delete the primary homepage. Please assign another homepage first.');
    }

    this.pages.delete(pageId);
    this.persistToStorage();
    return true;
  }

  duplicatePage(pageId: string, newTitle?: string, newSlug?: string): StorePage {
    this.hydrateFromStorage();
    const source = this.pages.get(pageId);
    if (!source) throw new Error(`Source page '${pageId}' not found.`);

    const now = new Date().toISOString();
    const copyTitle = newTitle || `${source.title} (Copy)`;
    const copySlug = newSlug || `${source.slug}-copy-${Math.random().toString(36).substring(2, 5)}`;

    const newPage: StorePage = {
      ...JSON.parse(JSON.stringify(source)),
      id: `page_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: copyTitle,
      slug: copySlug.startsWith('/') ? copySlug : `/${copySlug}`,
      isHome: false,
      isSystem: false,
      publishedVersion: 1,
      draftVersion: 1,
      createdAt: now,
      updatedAt: now,
    };

    this.pages.set(newPage.id, newPage);
    this.persistToStorage();
    return newPage;
  }

  getPageById(pageId: string): StorePage | null {
    this.hydrateFromStorage();
    return this.pages.get(pageId) || null;
  }

  getPageBySlug(storeId: string, slug: string): StorePage | null {
    this.hydrateFromStorage();
    const cleanSlug = slug === '' || slug === '/' ? '/' : slug.startsWith('/') ? slug : `/${slug}`;
    for (const page of this.pages.values()) {
      if (page.storeId === storeId && page.slug === cleanSlug) {
        return page;
      }
    }
    return null;
  }

  listPagesByStore(storeId: string): StorePage[] {
    this.hydrateFromStorage();
    const pages = Array.from(this.pages.values()).filter((p) => p.storeId === storeId);
    if (pages.length === 0) {
      const home = this.createDefaultHomePage(storeId);
      return [home];
    }
    return pages;
  }

  addSectionToPage(pageId: string, type: ComponentType, insertAtIndex?: number): PageSection {
    this.hydrateFromStorage();
    const page = this.pages.get(pageId);
    if (!page) throw new Error(`Page '${pageId}' not found.`);

    const newSection = ComponentRegistry.createDefaultSection(type, page.sectionsDraft.length);

    if (insertAtIndex !== undefined && insertAtIndex >= 0 && insertAtIndex <= page.sectionsDraft.length) {
      page.sectionsDraft.splice(insertAtIndex, 0, newSection);
    } else {
      page.sectionsDraft.push(newSection);
    }

    // Re-index orders
    page.sectionsDraft.forEach((sec, idx) => {
      sec.order = idx;
    });

    page.draftVersion += 1;
    page.updatedAt = new Date().toISOString();
    this.persistToStorage();
    return newSection;
  }

  updateSectionSettings(pageId: string, sectionId: string, settings: Record<string, any>): PageSection {
    this.hydrateFromStorage();
    const page = this.pages.get(pageId);
    if (!page) throw new Error(`Page '${pageId}' not found.`);

    const section = page.sectionsDraft.find((s) => s.id === sectionId);
    if (!section) throw new Error(`Section '${sectionId}' not found on page '${pageId}'.`);

    section.settings = {
      ...section.settings,
      ...settings,
    };

    page.draftVersion += 1;
    page.updatedAt = new Date().toISOString();
    this.persistToStorage();
    return section;
  }

  updateSectionLogic(pageId: string, sectionId: string, logic: any): PageSection {
    this.hydrateFromStorage();
    const page = this.pages.get(pageId);
    if (!page) throw new Error(`Page '${pageId}' not found.`);

    const section = page.sectionsDraft.find((s) => s.id === sectionId);
    if (!section) throw new Error(`Section '${sectionId}' not found on page '${pageId}'.`);

    section.logic = logic;

    page.draftVersion += 1;
    page.updatedAt = new Date().toISOString();
    this.persistToStorage();
    return section;
  }

  replaceDraftSections(pageId: string, sections: PageSection[]): StorePage {
    this.hydrateFromStorage();
    const page = this.pages.get(pageId);
    if (!page) throw new Error(`Page '${pageId}' not found.`);

    sections.forEach((sec, idx) => {
      sec.order = idx;
    });

    page.sectionsDraft = sections;
    page.draftVersion += 1;
    page.updatedAt = new Date().toISOString();
    this.persistToStorage();
    return page;
  }

  reorderSections(pageId: string, orderedSectionIds: string[]): PageSection[] {
    this.hydrateFromStorage();
    const page = this.pages.get(pageId);
    if (!page) throw new Error(`Page '${pageId}' not found.`);

    const sectionMap = new Map(page.sectionsDraft.map((s) => [s.id, s]));
    const reordered: PageSection[] = [];

    orderedSectionIds.forEach((id, idx) => {
      const sec = sectionMap.get(id);
      if (sec) {
        sec.order = idx;
        reordered.push(sec);
      }
    });

    page.sectionsDraft = reordered;
    page.draftVersion += 1;
    page.updatedAt = new Date().toISOString();
    this.persistToStorage();
    return reordered;
  }

  toggleSection(pageId: string, sectionId: string, enabled?: boolean): PageSection {
    this.hydrateFromStorage();
    const page = this.pages.get(pageId);
    if (!page) throw new Error(`Page '${pageId}' not found.`);

    const section = page.sectionsDraft.find((s) => s.id === sectionId);
    if (!section) throw new Error(`Section '${sectionId}' not found.`);

    section.enabled = enabled !== undefined ? enabled : !section.enabled;
    page.draftVersion += 1;
    page.updatedAt = new Date().toISOString();
    this.persistToStorage();
    return section;
  }

  deleteSection(pageId: string, sectionId: string): boolean {
    this.hydrateFromStorage();
    const page = this.pages.get(pageId);
    if (!page) throw new Error(`Page '${pageId}' not found.`);

    const initialLen = page.sectionsDraft.length;
    page.sectionsDraft = page.sectionsDraft.filter((s) => s.id !== sectionId);

    if (page.sectionsDraft.length !== initialLen) {
      page.sectionsDraft.forEach((s, idx) => (s.order = idx));
      page.draftVersion += 1;
      page.updatedAt = new Date().toISOString();
      this.persistToStorage();
      return true;
    }

    return false;
  }

  duplicateSection(pageId: string, sectionId: string): PageSection {
    this.hydrateFromStorage();
    const page = this.pages.get(pageId);
    if (!page) throw new Error(`Page '${pageId}' not found.`);

    const index = page.sectionsDraft.findIndex((s) => s.id === sectionId);
    if (index === -1) throw new Error(`Section '${sectionId}' not found.`);

    const original = page.sectionsDraft[index]!;
    const duplicate: PageSection = {
      ...JSON.parse(JSON.stringify(original)),
      id: `sec_${original.type}_copy_${Date.now()}`,
      name: `${original.name || original.type} (Copy)`,
    };

    page.sectionsDraft.splice(index + 1, 0, duplicate);
    page.sectionsDraft.forEach((s, idx) => (s.order = idx));

    page.draftVersion += 1;
    page.updatedAt = new Date().toISOString();
    this.persistToStorage();
    return duplicate;
  }

  publishPage(pageId: string): PublishPageResult {
    this.hydrateFromStorage();
    const page = this.pages.get(pageId);
    if (!page) throw new Error(`Page '${pageId}' not found.`);

    // Atomic Swap: copy draft sections to published sections
    page.sectionsPublished = JSON.parse(JSON.stringify(page.sectionsDraft));
    page.publishedVersion = page.draftVersion;
    page.updatedAt = new Date().toISOString();

    this.persistToStorage({ pageId: page.id, storeId: page.storeId });

    return {
      pageId,
      publishedVersion: page.publishedVersion,
      sectionsCount: page.sectionsPublished.length,
      publishedAt: page.updatedAt,
    };
  }

  discardDraft(pageId: string): StorePage {
    this.hydrateFromStorage();
    const page = this.pages.get(pageId);
    if (!page) throw new Error(`Page '${pageId}' not found.`);

    // Revert draft to published
    page.sectionsDraft = JSON.parse(JSON.stringify(page.sectionsPublished));
    page.draftVersion = page.publishedVersion;
    page.updatedAt = new Date().toISOString();

    this.persistToStorage();
    return page;
  }
}
