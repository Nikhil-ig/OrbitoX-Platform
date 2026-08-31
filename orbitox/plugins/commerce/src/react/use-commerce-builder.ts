'use client';

import { useState, useEffect, useCallback } from 'react';
import { StorePage } from '../domain/types/page.types';
import { PageSection, ComponentType, ComponentDefinition } from '../domain/types/component.types';
import { commerceEngine } from '../domain/commerce.engine';

export function useCommerceBuilder(storeId: string = 'store_aura_luxury', initialPageSlug: string = '/') {
  const targetStoreId = storeId || 'store_aura_luxury';
  const [activePageSlug, setActivePageSlug] = useState<string>(initialPageSlug || '/');

  const [allPages, setAllPages] = useState<StorePage[]>(() =>
    commerceEngine.pages.listPagesByStore(targetStoreId)
  );

  const [page, setPage] = useState<StorePage | null>(() => {
    let p = commerceEngine.pages.getPageBySlug(targetStoreId, activePageSlug);
    if (!p && activePageSlug === '/') {
      p = commerceEngine.pages.createDefaultHomePage(targetStoreId);
    }
    return p ? { ...p, sectionsDraft: [...p.sectionsDraft] } : null;
  });

  const [availableComponents, setAvailableComponents] = useState<ComponentDefinition[]>(() =>
    commerceEngine.components.getAll()
  );

  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(() => {
    let p = commerceEngine.pages.getPageBySlug(targetStoreId, activePageSlug);
    if (!p && activePageSlug === '/') {
      p = commerceEngine.pages.createDefaultHomePage(targetStoreId);
    }
    if (p && p.sectionsDraft.length > 0) {
      const hero = p.sectionsDraft.find((s) => s.type === 'hero');
      return hero ? hero.id : p.sectionsDraft[0]!.id;
    }
    return null;
  });

  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isDirty, setIsDirty] = useState<boolean>(() => {
    let p = commerceEngine.pages.getPageBySlug(targetStoreId, activePageSlug);
    return Boolean(p && p.draftVersion > p.publishedVersion);
  });
  const [publishSuccessMessage, setPublishSuccessMessage] = useState<string | null>(null);

  const refreshPage = useCallback(() => {
    const sId = storeId || 'store_aura_luxury';
    const pagesList = commerceEngine.pages.listPagesByStore(sId);
    setAllPages(pagesList);

    let p = commerceEngine.pages.getPageBySlug(sId, activePageSlug);
    if (!p && activePageSlug === '/') {
      p = commerceEngine.pages.createDefaultHomePage(sId);
    }
    setPage(p ? { ...p, sectionsDraft: [...p.sectionsDraft] } : null);
    setAvailableComponents(commerceEngine.components.getAll());
    if (p && p.sectionsDraft.length > 0 && !selectedSectionId) {
      const hero = p.sectionsDraft.find((s) => s.type === 'hero');
      setSelectedSectionId(hero ? hero.id : p.sectionsDraft[0]!.id);
    }
    setIsDirty(Boolean(p && p.draftVersion > p.publishedVersion));
  }, [storeId, activePageSlug, selectedSectionId]);

  useEffect(() => {
    refreshPage();

    if (typeof window === 'undefined') return;

    const handlePagesUpdated = () => {
      refreshPage();
    };

    window.addEventListener('orbitox:pages_updated', handlePagesUpdated);
    return () => {
      window.removeEventListener('orbitox:pages_updated', handlePagesUpdated);
    };
  }, [refreshPage]);

  const selectedSection = page?.sectionsDraft.find((s) => s.id === selectedSectionId) || null;

  const createNewPage = (payload: {
    title: string;
    slug: string;
    template?: 'blank' | 'lookbook' | 'about' | 'sale' | 'faq';
    isHome?: boolean;
    seo?: any;
  }) => {
    const sId = storeId || 'store_aura_luxury';
    const newPage = commerceEngine.pages.createPageWithTemplate(sId, {
      title: payload.title,
      slug: payload.slug,
      template: payload.template || 'blank',
      isHome: payload.isHome,
      seo: payload.seo,
    });
    setActivePageSlug(newPage.slug);
    setSelectedSectionId(newPage.sectionsDraft[0]?.id || null);
    refreshPage();
    return newPage;
  };

  const deleteStorePage = (pageId: string) => {
    const success = commerceEngine.pages.deletePage(pageId);
    if (success) {
      const remaining = commerceEngine.pages.listPagesByStore(storeId || 'store_aura_luxury');
      if (remaining.length > 0) {
        setActivePageSlug(remaining[0]!.slug);
      }
      refreshPage();
    }
    return success;
  };

  const duplicateStorePage = (pageId: string, title?: string, slug?: string) => {
    const copy = commerceEngine.pages.duplicatePage(pageId, title, slug);
    setActivePageSlug(copy.slug);
    refreshPage();
    return copy;
  };

  const updatePageMeta = (
    pageId: string,
    updates: { title?: string; slug?: string; isHome?: boolean; seo?: any }
  ) => {
    const updated = commerceEngine.pages.updatePageMeta(pageId, updates);
    if (updates.slug) {
      setActivePageSlug(updated.slug);
    }
    refreshPage();
    return updated;
  };

  const addSection = (type: ComponentType, index?: number) => {
    if (!page) return;
    const newSec = commerceEngine.pages.addSectionToPage(page.id, type, index);
    setSelectedSectionId(newSec.id);
    refreshPage();
    return newSec;
  };

  const updateSectionSettings = (sectionId: string, settings: Record<string, any>) => {
    if (!page) return;
    const updated = commerceEngine.pages.updateSectionSettings(page.id, sectionId, settings);
    refreshPage();
    return updated;
  };

  const updateSectionLogic = (sectionId: string, logic: any) => {
    if (!page) return;
    const updated = commerceEngine.pages.updateSectionLogic(page.id, sectionId, logic);
    refreshPage();
    return updated;
  };

  const replaceDraftSections = (sections: PageSection[]) => {
    if (!page) return;
    const updated = commerceEngine.pages.replaceDraftSections(page.id, sections);
    if (sections.length > 0) {
      setSelectedSectionId(sections[0]?.id || null);
    }
    refreshPage();
    return updated;
  };

  const reorderSections = (orderedIds: string[]) => {
    if (!page) return;
    commerceEngine.pages.reorderSections(page.id, orderedIds);
    refreshPage();
  };

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    if (!page) return;
    const list = [...page.sectionsDraft];
    const index = list.findIndex((s) => s.id === sectionId);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const temp = list[index]!;
      list[index] = list[index - 1]!;
      list[index - 1] = temp;
      reorderSections(list.map((s) => s.id));
    } else if (direction === 'down' && index < list.length - 1) {
      const temp = list[index]!;
      list[index] = list[index + 1]!;
      list[index + 1] = temp;
      reorderSections(list.map((s) => s.id));
    }
  };

  const toggleSection = (sectionId: string) => {
    if (!page) return;
    commerceEngine.pages.toggleSection(page.id, sectionId);
    refreshPage();
  };

  const deleteSection = (sectionId: string) => {
    if (!page) return;
    commerceEngine.pages.deleteSection(page.id, sectionId);
    if (selectedSectionId === sectionId) {
      setSelectedSectionId(page.sectionsDraft[0]?.id || null);
    }
    refreshPage();
  };

  const duplicateSection = (sectionId: string) => {
    if (!page) return;
    const dup = commerceEngine.pages.duplicateSection(page.id, sectionId);
    setSelectedSectionId(dup.id);
    refreshPage();
  };

  const publishPage = () => {
    if (!page) return;
    const result = commerceEngine.pages.publishPage(page.id);
    refreshPage();
    setPublishSuccessMessage(`🎉 Version ${result.publishedVersion} of "${page.title}" published! Live storefront updated.`);
    setTimeout(() => setPublishSuccessMessage(null), 4000);
    return result;
  };

  const discardDraft = () => {
    if (!page) return;
    commerceEngine.pages.discardDraft(page.id);
    refreshPage();
  };

  return {
    page,
    allPages,
    activePageSlug,
    setActivePageSlug,
    createNewPage,
    deleteStorePage,
    duplicateStorePage,
    updatePageMeta,
    selectedSection,
    selectedSectionId,
    setSelectedSectionId,
    availableComponents,
    previewDevice,
    setPreviewDevice,
    isDirty,
    publishSuccessMessage,
    addSection,
    updateSectionSettings,
    updateSectionLogic,
    replaceDraftSections,
    reorderSections,
    moveSection,
    toggleSection,
    deleteSection,
    duplicateSection,
    publishPage,
    discardDraft,
    refreshPage,
  };
}
