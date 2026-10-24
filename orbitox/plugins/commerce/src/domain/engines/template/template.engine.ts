import {
  WebsiteTemplate,
  WebsiteTemplateCategory,
  TemplateApplyMode,
  ApplyTemplateResult,
} from '../../types/template.types';
import { WEBSITE_TEMPLATES } from './website-templates.presets';
import { ThemeEngine } from '../theme/theme.engine';
import { PageBuilderEngine } from '../page-builder/page-builder.engine';
import { StoreEngine } from '../store/store.engine';

export class TemplateEngine {
  private templates: WebsiteTemplate[] = WEBSITE_TEMPLATES;
  private themeEngine: ThemeEngine;
  private pageBuilderEngine: PageBuilderEngine;
  private storeEngine: StoreEngine;

  constructor(
    themeEngine: ThemeEngine,
    pageBuilderEngine: PageBuilderEngine,
    storeEngine: StoreEngine
  ) {
    this.themeEngine = themeEngine;
    this.pageBuilderEngine = pageBuilderEngine;
    this.storeEngine = storeEngine;
  }

  getTemplates(category?: WebsiteTemplateCategory | 'all', query?: string): WebsiteTemplate[] {
    let list = this.templates;

    if (category && category !== 'all') {
      list = list.filter((t) => t.category === category);
    }

    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.tagline.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    return list;
  }

  getTemplateById(templateId: string): WebsiteTemplate | undefined {
    return this.templates.find((t) => t.id === templateId);
  }

  getCategories(): { id: string; label: string; count: number }[] {
    const categories: { id: string; label: string; count: number }[] = [
      { id: 'all', label: 'All Theme Kits', count: this.templates.length },
      {
        id: 'tech-gadgets',
        label: 'Tech & Gadgets',
        count: this.templates.filter((t) => t.category === 'tech-gadgets').length,
      },
      {
        id: 'athletic-shoes',
        label: 'Athletic & Footwear',
        count: this.templates.filter((t) => t.category === 'athletic-shoes').length,
      },
      {
        id: 'streetwear',
        label: 'Streetwear & Drops',
        count: this.templates.filter((t) => t.category === 'streetwear').length,
      },
      {
        id: 'minimal-organic',
        label: 'Minimal & Organic',
        count: this.templates.filter((t) => t.category === 'minimal-organic').length,
      },
      {
        id: 'ethnic-wear',
        label: 'Heritage & Couture',
        count: this.templates.filter((t) => t.category === 'ethnic-wear').length,
      },
      {
        id: 'beauty-wellness',
        label: 'Clean Beauty & Wellness',
        count: this.templates.filter((t) => t.category === 'beauty-wellness').length,
      },
    ];

    return categories;
  }

  applyTemplate(
    storeId: string,
    templateId: string,
    mode: TemplateApplyMode = 'full'
  ): ApplyTemplateResult {
    const template = this.getTemplateById(templateId);
    if (!template) {
      throw new Error(`Website template '${templateId}' not found.`);
    }

    const now = new Date().toISOString();

    // 1. Apply Theme Design Tokens (if full or styles-only)
    if (mode === 'full' || mode === 'styles-only') {
      this.themeEngine.saveCustomTheme(template.themePresetId, template.themeConfig);

      // Update active theme ID on the store record
      try {
        this.storeEngine.updateStore(storeId, {
          activeThemeId: template.themePresetId,
        });
      } catch (e) {
        console.warn('[TemplateEngine] Could not update store activeThemeId directly:', e);
      }
    }

    let appliedPagesCount = 0;

    // 2. In 'full' or 'sections-only' mode, install all pre-built website pages & rich sections
    if (mode === 'full' || mode === 'sections-only') {
      for (const tPage of template.pages) {
        // Deep clone sections with new distinct IDs to prevent collision
        const clonedSections = tPage.sections.map((sec, idx) => ({
          ...JSON.parse(JSON.stringify(sec)),
          id: `sec_${globalThis.crypto.randomUUID()}`,
          order: idx,
        }));

        const existingPage = this.pageBuilderEngine.getPageBySlug(storeId, tPage.slug);

        if (existingPage) {
          // Update existing page with the template's rich sections
          existingPage.sectionsDraft = clonedSections;
          existingPage.sectionsPublished = JSON.parse(JSON.stringify(clonedSections));
          existingPage.title = tPage.title;
          existingPage.updatedAt = now;
          if (tPage.seo) existingPage.seo = tPage.seo;

          // Force page-builder engine to persist
          this.pageBuilderEngine.replaceDraftSections(existingPage.id, clonedSections);
          this.pageBuilderEngine.publishPage(existingPage.id);
          appliedPagesCount++;
        } else {
          // Create new page for this store
          const created = this.pageBuilderEngine.createPage(storeId, {
            slug: tPage.slug,
            title: tPage.title,
            isHome: tPage.isHome,
            sections: clonedSections,
            seo: tPage.seo,
          });
          this.pageBuilderEngine.publishPage(created.id);
          appliedPagesCount++;
        }
      }
    }

    // 3. Broadcast sync events
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('orbitox:template_applied', {
          detail: {
            storeId,
            templateId,
            mode,
            themeConfig: template.themeConfig,
          },
        })
      );
      window.dispatchEvent(
        new CustomEvent('orbitox:theme_updated', {
          detail: { [template.themePresetId]: template.themeConfig },
        })
      );
    }

    return {
      templateId,
      storeId,
      appliedPagesCount,
      activeThemeId: template.themePresetId,
      mode,
      appliedAt: now,
    };
  }
}
