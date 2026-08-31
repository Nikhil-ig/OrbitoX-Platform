import { StorefrontResolvedPayload, EnrichedPageSection } from '../../types/storefront.types';
import { StoreEngine } from '../store/store.engine';
import { ThemeEngine } from '../theme/theme.engine';
import { PageBuilderEngine } from '../page-builder/page-builder.engine';
import { ProductEngine } from '../product/product.engine';

export class StorefrontEngine {
  constructor(
    private readonly storeEngine: StoreEngine,
    private readonly themeEngine: ThemeEngine,
    private readonly pageBuilderEngine: PageBuilderEngine,
    private readonly productEngine: ProductEngine
  ) {}

  resolveStorefrontSync(options: {
    slugOrDomain: string;
    pageSlug?: string;
    previewDraft?: boolean;
  }): StorefrontResolvedPayload | null {
    // 1. Resolve Store
    let store = this.storeEngine.getStoreBySlug(options.slugOrDomain);
    if (!store) {
      store = this.storeEngine.resolveStoreByHostname(options.slugOrDomain);
    }
    if (!store) {
      store = this.storeEngine.getStoreById(options.slugOrDomain);
    }
    if (!store) {
      return null;
    }

    // 2. Resolve Active Theme
    const preset = this.themeEngine.getPresetById(store.activeThemeId);
    const theme = preset ? preset.config : this.themeEngine.getDefaultTheme();
    const cssVariables = this.themeEngine.compileThemeToCssVariables(theme);
    const cssVariablesStyleString = this.themeEngine.generateCssStyleString(theme);

    // 3. Resolve Page
    const pagePath = options.pageSlug || '/';
    let page = this.pageBuilderEngine.getPageBySlug(store.id, pagePath);

    if (!page && pagePath === '/') {
      page = this.pageBuilderEngine.createDefaultHomePage(store.id);
    }

    if (!page) {
      return null;
    }

    // Choose draft or published sections
    const rawSections = options.previewDraft ? page.sectionsDraft : page.sectionsPublished;
    const activeSections = rawSections.length > 0 ? rawSections.filter((s) => s.enabled) : page.sectionsDraft.filter((s) => s.enabled);

    // 4. Enrich Sections with Live Data
    const categories = this.productEngine.listCategoriesByStore(store.id);
    const collections = this.productEngine.listCollectionsByStore(store.id);
    const allProductsRes = this.productEngine.listProducts(store.id, { limit: 50 });
    const allProducts = allProductsRes.products;

    const enrichedSections: EnrichedPageSection[] = activeSections.map((sec) => {
      const enriched: EnrichedPageSection = { ...sec };

      switch (sec.type) {
        case 'product-grid': {
          const limit = sec.settings.limit || 8;
          const colId = sec.settings.collectionId;
          const res = this.productEngine.listProducts(store!.id, {
            collectionId: colId && colId !== 'all' ? colId : undefined,
            limit,
          });
          enriched.enrichedData = { products: res.products };
          break;
        }
        case 'product-carousel': {
          const limit = sec.settings.limit || 10;
          const res = this.productEngine.listProducts(store!.id, { limit });
          enriched.enrichedData = { products: res.products };
          break;
        }
        case 'featured-product': {
          const targetId = sec.settings.productId;
          const featured = targetId ? this.productEngine.getProductById(targetId) : allProducts[0];
          enriched.enrichedData = { featuredProduct: featured || undefined };
          break;
        }
        case 'category-grid': {
          enriched.enrichedData = { categories };
          break;
        }
        case 'collection-grid': {
          enriched.enrichedData = { collections };
          break;
        }
        case 'lookbook-mosaic':
        case 'gallery':
        case 'masonry-gallery':
        case 'instagram-feed': {
          enriched.enrichedData = { products: allProducts.slice(0, 8), categories };
          break;
        }
        default:
          break;
      }

      return enriched;
    });

    // 5. Navigation Menus
    const headerMenu = [
      { label: 'Home', href: `/store/${store.slug}` },
      { label: 'Shop All', href: `/store/${store.slug}/shop` },
      ...categories.slice(0, 4).map((c) => ({
        label: c.name,
        href: `/store/${store!.slug}/category/${c.slug}`,
      })),
      { label: 'About', href: `/store/${store.slug}/about` },
    ];

    const footerMenu = [
      { label: 'Privacy Policy', href: `/store/${store.slug}/privacy` },
      { label: 'Terms of Service', href: `/store/${store.slug}/terms` },
      { label: 'Shipping & Returns', href: `/store/${store.slug}/shipping` },
      { label: 'Contact Us', href: `/store/${store.slug}/contact` },
    ];

    return {
      store,
      theme,
      cssVariables,
      cssVariablesStyleString,
      currentPage: page,
      sections: enrichedSections,
      navigation: {
        categories,
        collections,
        headerMenu,
        footerMenu,
      },
      seo: {
        title: page.seo.title || `${store.name} | ${store.tagline || 'Online Store'}`,
        description: page.seo.description || store.description || 'Welcome to our official online store.',
        ogImage: page.seo.ogImage || store.logoUrl,
      },
    };
  }

  async resolveStorefront(options: {
    slugOrDomain: string;
    pageSlug?: string;
    previewDraft?: boolean;
  }): Promise<StorefrontResolvedPayload | null> {
    return this.resolveStorefrontSync(options);
  }
}
