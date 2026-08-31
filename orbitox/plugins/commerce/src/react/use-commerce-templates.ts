'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  WebsiteTemplate,
  WebsiteTemplateCategory,
  TemplateApplyMode,
  ApplyTemplateResult,
} from '../domain/types/template.types';
import { commerceEngine } from '../domain/commerce.engine';

export function useCommerceTemplates(storeId: string = 'store_aura_luxury') {
  const [activeCategory, setActiveCategory] = useState<WebsiteTemplateCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [appliedResult, setAppliedResult] = useState<ApplyTemplateResult | null>(null);
  const [previewingTemplate, setPreviewingTemplate] = useState<WebsiteTemplate | null>(null);

  const categories = useMemo(() => {
    return commerceEngine.templates.getCategories();
  }, []);

  const templates = useMemo(() => {
    return commerceEngine.templates.getTemplates(activeCategory, searchQuery);
  }, [activeCategory, searchQuery]);

  const applyTemplate = useCallback(
    async (templateId: string, mode: TemplateApplyMode = 'full'): Promise<ApplyTemplateResult> => {
      setIsApplying(true);
      try {
        const res = commerceEngine.templates.applyTemplate(storeId, templateId, mode);
        setAppliedResult(res);
        return res;
      } finally {
        setIsApplying(false);
      }
    },
    [storeId]
  );

  return {
    templates,
    categories,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    previewingTemplate,
    setPreviewingTemplate,
    applyTemplate,
    isApplying,
    appliedResult,
  };
}
