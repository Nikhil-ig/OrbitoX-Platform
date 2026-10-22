'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Occasion,
  Theme,
  Experience,
  ExperienceSection,
  ExperienceGuest,
  ExperienceWish,
  ExperienceFilter,
  ThemeFilter,
  PricingPlan,
  TierLevel,
  CreateExperiencePayload,
  UpdateExperiencePayload,
  RsvpStatus
} from '../domain/types';
import { OccasionEngine } from '../domain/occasion-engine';
import { ThemeEngine } from '../domain/theme-engine';
import { SectionEngine } from '../domain/section-engine';
import { FeatureEngine } from '../domain/feature-engine';
import { PricingEngine } from '../domain/pricing-engine';
import { ExperienceEngine } from '../domain/experience-engine';

// Singleton default services
const defaultOccasionEngine = new OccasionEngine();
const defaultThemeEngine = new ThemeEngine();
const defaultSectionEngine = new SectionEngine();
const defaultFeatureEngine = new FeatureEngine();
const defaultPricingEngine = new PricingEngine();
const defaultExperienceEngine = new ExperienceEngine(
  defaultOccasionEngine,
  defaultThemeEngine,
  defaultSectionEngine
);

export function useOccasions() {
  const [occasionEngine] = useState(() => defaultOccasionEngine);
  const occasions = useMemo(() => occasionEngine.getActiveOccasions(), [occasionEngine]);
  const categories = useMemo(() => occasionEngine.getCategories(), [occasionEngine]);

  const getOccasionBySlug = useCallback(
    (slug: string): Occasion | undefined => {
      return occasionEngine.getOccasionBySlug(slug);
    },
    [occasionEngine]
  );

  return { occasions, categories, getOccasionBySlug };
}

export function useThemes(filter?: ThemeFilter) {
  const [themeEngine] = useState(() => defaultThemeEngine);
  const [themes, setThemes] = useState<Theme[]>(() => themeEngine.filterThemes(filter));

  const refreshThemes = useCallback(
    (newFilter?: ThemeFilter) => {
      setThemes(themeEngine.filterThemes(newFilter || filter));
    },
    [themeEngine, filter]
  );

  const getThemeBySlug = useCallback(
    (slug: string): Theme | undefined => {
      return themeEngine.getThemeBySlug(slug);
    },
    [themeEngine]
  );

  const getThemesForOccasion = useCallback(
    (occasionSlug: string): Theme[] => {
      return themeEngine.getThemesForOccasion(occasionSlug);
    },
    [themeEngine]
  );

  return { themes, refreshThemes, getThemeBySlug, getThemesForOccasion };
}

export function useExperiences(filter?: ExperienceFilter) {
  const [expEngine] = useState(() => defaultExperienceEngine);
  const [experiences, setExperiences] = useState<Experience[]>(() =>
    expEngine.filterExperiences(filter)
  );

  const refreshExperiences = useCallback(() => {
    setExperiences(expEngine.filterExperiences(filter));
  }, [expEngine, filter]);

  const createExperience = useCallback(
    (payload: CreateExperiencePayload): Experience => {
      const exp = expEngine.createExperience(payload);
      refreshExperiences();
      return exp;
    },
    [expEngine, refreshExperiences]
  );

  const getExperienceBySlug = useCallback(
    (slug: string, tenantId?: string): Experience | undefined => {
      return expEngine.getExperienceBySlug(slug, tenantId);
    },
    [expEngine]
  );

  const getExperienceById = useCallback(
    (id: string, tenantId?: string): Experience | undefined => {
      return expEngine.getExperienceById(id, tenantId);
    },
    [expEngine]
  );

  const updateExperience = useCallback(
    (id: string, payload: UpdateExperiencePayload, tenantId?: string): Experience => {
      const updated = expEngine.updateExperience(id, payload, tenantId);
      refreshExperiences();
      return updated;
    },
    [expEngine, refreshExperiences]
  );

  return {
    experiences,
    refreshExperiences,
    createExperience,
    getExperienceBySlug,
    getExperienceById,
    updateExperience
  };
}

export function useExperienceSections(experienceId: string, initialSections: ExperienceSection[] = []) {
  const [expEngine] = useState(() => defaultExperienceEngine);
  const [sections, setSections] = useState<ExperienceSection[]>(initialSections);

  const updateConfig = useCallback(
    (sectionId: string, config: Record<string, unknown>, tenantId?: string) => {
      const updatedExp = expEngine.updateSectionConfig(experienceId, sectionId, config, tenantId);
      setSections([...updatedExp.sections]);
    },
    [expEngine, experienceId]
  );

  const toggleSection = useCallback(
    (sectionId: string, isEnabled: boolean, tenantId?: string) => {
      const updatedExp = expEngine.toggleSection(experienceId, sectionId, isEnabled, tenantId);
      setSections([...updatedExp.sections]);
    },
    [expEngine, experienceId]
  );

  const reorderSections = useCallback(
    (sectionIds: string[], tenantId?: string) => {
      const updatedExp = expEngine.reorderSections(experienceId, sectionIds, tenantId);
      setSections([...updatedExp.sections]);
    },
    [expEngine, experienceId]
  );

  return {
    sections,
    updateConfig,
    toggleSection,
    reorderSections
  };
}

export function useRsvp(experienceId: string) {
  const [expEngine] = useState(() => defaultExperienceEngine);
  const [guests, setGuests] = useState<ExperienceGuest[]>(() =>
    expEngine.getGuestsForExperience(experienceId)
  );

  const submitRsvp = useCallback(
    (data: {
      tenantId: string;
      guestName: string;
      email?: string;
      phone?: string;
      attending: RsvpStatus;
      partySize?: number;
      dietaryRequirements?: string;
      message?: string;
      plusOneName?: string;
      attendedEvents?: string[];
    }) => {
      const guest = expEngine.recordRsvp(experienceId, data);
      setGuests(expEngine.getGuestsForExperience(experienceId));
      return guest;
    },
    [expEngine, experienceId]
  );

  return {
    guests,
    submitRsvp
  };
}

export function useWishes(experienceId: string) {
  const [expEngine] = useState(() => defaultExperienceEngine);
  const [wishes, setWishes] = useState<ExperienceWish[]>(() =>
    expEngine.getWishesForExperience(experienceId)
  );

  const submitWish = useCallback(
    (data: { tenantId: string; guestName: string; message: string; mediaUrl?: string }) => {
      const wish = expEngine.recordWish(experienceId, data);
      setWishes(expEngine.getWishesForExperience(experienceId));
      return wish;
    },
    [expEngine, experienceId]
  );

  return {
    wishes,
    submitWish
  };
}

export function usePricing() {
  const [pricingEngine] = useState(() => defaultPricingEngine);
  const plans = useMemo(() => pricingEngine.getPlans(), [pricingEngine]);

  const calculateTotal = useCallback(
    (tier: TierLevel, addons?: { priceInr: number }[]) => {
      return pricingEngine.calculateOrderTotal(tier, addons);
    },
    [pricingEngine]
  );

  return {
    plans,
    calculateTotal
  };
}
