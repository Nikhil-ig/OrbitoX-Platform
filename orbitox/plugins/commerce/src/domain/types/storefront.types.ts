import { Store } from './store.types';
import { ThemeConfig } from './theme.types';
import { StorePage } from './page.types';
import { PageSection } from './component.types';
import { Product, Category, Collection } from './product.types';

export interface EnrichedPageSection extends PageSection {
  enrichedData?: {
    products?: Product[];
    categories?: Category[];
    collections?: Collection[];
    featuredProduct?: Product;
    [key: string]: any;
  };
}

export interface StorefrontResolvedPayload {
  store: Store;
  theme: ThemeConfig;
  cssVariables: Record<string, string>;
  cssVariablesStyleString: string;
  currentPage: StorePage;
  sections: EnrichedPageSection[];
  navigation: {
    categories: Category[];
    collections: Collection[];
    headerMenu: Array<{ label: string; href: string }>;
    footerMenu: Array<{ label: string; href: string }>;
  };
  seo: {
    title: string;
    description: string;
    keywords?: string[];
    ogImage?: string;
    canonicalUrl?: string;
  };
}
