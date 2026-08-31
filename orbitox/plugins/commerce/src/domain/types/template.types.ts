import { PageSection } from './component.types';
import { PageSEO } from './page.types';
import { ThemeConfig } from './theme.types';

export interface WebsiteTemplatePage {
  slug: string;
  title: string;
  isHome?: boolean;
  sections: PageSection[];
  seo?: PageSEO;
}

export type WebsiteTemplateCategory =
  | 'all'
  | 'tech-gadgets'
  | 'athletic-shoes'
  | 'streetwear'
  | 'luxury'
  | 'minimal-organic'
  | 'ethnic-wear'
  | 'beauty-wellness'
  | 'bridal'
  | 'artisan';

export interface WebsiteTemplate {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: WebsiteTemplateCategory;
  categoryLabel: string;
  tags: string[];
  previewImage: string;
  badge?: 'Featured' | 'Best Seller' | 'Trending' | 'High Converting' | 'New Release' | 'Editor Choice' | 'Popular';
  themePresetId: string;
  themeConfig: ThemeConfig;
  pages: WebsiteTemplatePage[];
  features: string[];
  author?: string;
  rating?: number;
  reviewCount?: number;
  signatureStyle?: {
    mood: string;
    colors: string[];
    fontPairing: string;
  };
}

export type TemplateApplyMode = 'full' | 'sections-only' | 'styles-only';

export interface ApplyTemplateResult {
  templateId: string;
  storeId: string;
  appliedPagesCount: number;
  activeThemeId: string;
  mode: TemplateApplyMode;
  appliedAt: string;
}
