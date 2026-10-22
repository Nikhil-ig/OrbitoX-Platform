import {
  Experience,
  ExperienceStatus,
  ExperienceSection,
  ExperienceGuest,
  ExperienceWish,
  ExperienceAnalytics,
  CreateExperiencePayload,
  UpdateExperiencePayload,
  ExperienceFilter,
  RsvpStatus
} from './types';
import { OccasionEngine } from './occasion-engine';
import { ThemeEngine } from './theme-engine';
import { SectionEngine } from './section-engine';

export class ExperienceEngine {
  private experiences: Experience[] = [];
  private guests: ExperienceGuest[] = [];
  private wishes: ExperienceWish[] = [];
  private analytics: Map<string, ExperienceAnalytics> = new Map();

  private occasionEngine: OccasionEngine;
  private themeEngine: ThemeEngine;
  private sectionEngine: SectionEngine;

  constructor(
    occasionEngine = new OccasionEngine(),
    themeEngine = new ThemeEngine(),
    sectionEngine = new SectionEngine(),
    initialExperiences: Experience[] = []
  ) {
    this.occasionEngine = occasionEngine;
    this.themeEngine = themeEngine;
    this.sectionEngine = sectionEngine;
    this.experiences = [...initialExperiences];
  }

  // --- Slug Generator ---
  static generateSlug(title: string): string {
    return (
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') +
      '-' +
      Math.random().toString(36).substring(2, 6)
    );
  }

  // --- Experience Lifecycle ---
  createExperience(payload: CreateExperiencePayload): Experience {
    const occasion = this.occasionEngine.getOccasionBySlug(payload.occasionSlug);
    if (!occasion) {
      throw new Error(`Invalid occasion slug: ${payload.occasionSlug}`);
    }

    const theme = this.themeEngine.getThemeBySlug(payload.themeSlug);
    if (!theme) {
      throw new Error(`Invalid theme slug: ${payload.themeSlug}`);
    }

    // Default sections based on occasion
    const sections: ExperienceSection[] = payload.sections?.length
      ? (payload.sections as ExperienceSection[])
      : this.sectionEngine.buildDefaultSections(occasion.defaultSections);

    const slug = payload.customPath || ExperienceEngine.generateSlug(payload.title);

    const expId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const experience: Experience = {
      id: expId,
      tenantId: payload.tenantId,
      title: payload.title.trim(),
      slug,
      occasionId: occasion.id,
      occasionSlug: occasion.slug,
      themeId: theme.id,
      themeSlug: theme.slug,
      status: 'DRAFT',
      eventDate: payload.eventDate,
      sections,
      featuresEnabled: payload.featuresEnabled || ['rsvp_tracking', 'photo_gallery', 'wishes_wall'],
      styleOverrides: payload.styleOverrides || {},
      metadata: payload.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.experiences.unshift(experience);

    this.analytics.set(expId, {
      experienceId: expId,
      tenantId: payload.tenantId,
      totalViews: 0,
      uniqueVisitors: 0,
      rsvpCount: 0,
      wishesCount: 0,
      engagementRate: 0
    });

    return experience;
  }

  getExperienceById(id: string, tenantId?: string): Experience | undefined {
    return this.experiences.find(
      (e) => e.id === id && (!tenantId || e.tenantId === tenantId)
    );
  }

  getExperienceBySlug(slug: string, tenantId?: string): Experience | undefined {
    return this.experiences.find(
      (e) => e.slug.toLowerCase() === slug.toLowerCase() && (!tenantId || e.tenantId === tenantId)
    );
  }

  filterExperiences(filter: ExperienceFilter = {}): Experience[] {
    return this.experiences.filter((exp) => {
      if (filter.tenantId && exp.tenantId !== filter.tenantId) return false;
      if (filter.occasionSlug && exp.occasionSlug !== filter.occasionSlug) return false;
      if (filter.status && exp.status !== filter.status) return false;
      if (filter.search) {
        const q = filter.search.toLowerCase();
        const matchesTitle = exp.title.toLowerCase().includes(q);
        const matchesSlug = exp.slug.toLowerCase().includes(q);
        if (!matchesTitle && !matchesSlug) return false;
      }
      return true;
    });
  }

  updateExperience(id: string, payload: UpdateExperiencePayload, tenantId?: string): Experience {
    const exp = this.getExperienceById(id, tenantId);
    if (!exp) {
      throw new Error(`Experience not found or tenant unauthorized: ${id}`);
    }

    const updated: Experience = {
      ...exp,
      title: payload.title !== undefined ? payload.title : exp.title,
      eventDate: payload.eventDate !== undefined ? payload.eventDate : exp.eventDate,
      themeSlug: payload.themeSlug !== undefined ? payload.themeSlug : exp.themeSlug,
      customPath: payload.customPath !== undefined ? payload.customPath : exp.customPath,
      customDomain: payload.customDomain !== undefined ? payload.customDomain : exp.customDomain,
      passwordProtection: payload.passwordProtection !== undefined ? payload.passwordProtection : exp.passwordProtection,
      sections: payload.sections !== undefined ? payload.sections : exp.sections,
      featuresEnabled: payload.featuresEnabled !== undefined ? payload.featuresEnabled : exp.featuresEnabled,
      styleOverrides: payload.styleOverrides !== undefined ? payload.styleOverrides : exp.styleOverrides,
      metadata: payload.metadata !== undefined ? { ...exp.metadata, ...payload.metadata } : exp.metadata,
      updatedAt: new Date().toISOString()
    };

    const index = this.experiences.findIndex((e) => e.id === id);
    if (index !== -1) {
      this.experiences[index] = updated;
    }

    return updated;
  }

  updateStatus(id: string, nextStatus: ExperienceStatus, tenantId?: string): Experience {
    const exp = this.getExperienceById(id, tenantId);
    if (!exp) throw new Error(`Experience not found: ${id}`);

    exp.status = nextStatus;
    exp.updatedAt = new Date().toISOString();
    return exp;
  }

  // --- Section Management ---
  updateSectionConfig(
    experienceId: string,
    sectionId: string,
    config: Record<string, unknown>,
    tenantId?: string
  ): Experience {
    const exp = this.getExperienceById(experienceId, tenantId);
    if (!exp) throw new Error(`Experience not found: ${experienceId}`);

    const sec = exp.sections.find((s) => s.id === sectionId);
    if (!sec) throw new Error(`Section not found: ${sectionId}`);

    sec.config = { ...sec.config, ...config };
    exp.updatedAt = new Date().toISOString();
    return exp;
  }

  toggleSection(experienceId: string, sectionId: string, isEnabled: boolean, tenantId?: string): Experience {
    const exp = this.getExperienceById(experienceId, tenantId);
    if (!exp) throw new Error(`Experience not found: ${experienceId}`);

    const sec = exp.sections.find((s) => s.id === sectionId);
    if (!sec) throw new Error(`Section not found: ${sectionId}`);

    sec.isEnabled = isEnabled;
    exp.updatedAt = new Date().toISOString();
    return exp;
  }

  reorderSections(experienceId: string, sectionIdsInOrder: string[], tenantId?: string): Experience {
    const exp = this.getExperienceById(experienceId, tenantId);
    if (!exp) throw new Error(`Experience not found: ${experienceId}`);

    const newSections: ExperienceSection[] = [];
    sectionIdsInOrder.forEach((secId, index) => {
      const existing = exp.sections.find((s) => s.id === secId);
      if (existing) {
        newSections.push({ ...existing, order: index + 1 });
      }
    });

    exp.sections = newSections;
    exp.updatedAt = new Date().toISOString();
    return exp;
  }

  // --- RSVP Handlers ---
  recordRsvp(
    experienceId: string,
    data: {
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
    }
  ): ExperienceGuest {
    const exp = this.getExperienceById(experienceId);
    if (!exp) throw new Error(`Experience not found: ${experienceId}`);

    const newGuest: ExperienceGuest = {
      id: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      experienceId,
      tenantId: data.tenantId,
      guestName: data.guestName.trim(),
      email: data.email?.trim(),
      phone: data.phone?.trim(),
      attending: data.attending,
      partySize: data.partySize || 1,
      dietaryRequirements: data.dietaryRequirements,
      message: data.message,
      plusOneName: data.plusOneName,
      attendedEvents: data.attendedEvents,
      createdAt: new Date().toISOString()
    };

    this.guests.push(newGuest);

    // Update analytics
    const stats = this.analytics.get(experienceId);
    if (stats) {
      stats.rsvpCount += 1;
    }

    return newGuest;
  }

  getGuestsForExperience(experienceId: string, tenantId?: string): ExperienceGuest[] {
    return this.guests.filter(
      (g) => g.experienceId === experienceId && (!tenantId || g.tenantId === tenantId)
    );
  }

  // --- Wishes Handlers ---
  recordWish(
    experienceId: string,
    data: {
      tenantId: string;
      guestName: string;
      message: string;
      mediaUrl?: string;
    }
  ): ExperienceWish {
    const exp = this.getExperienceById(experienceId);
    if (!exp) throw new Error(`Experience not found: ${experienceId}`);

    const wish: ExperienceWish = {
      id: `wish_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      experienceId,
      tenantId: data.tenantId,
      guestName: data.guestName.trim(),
      message: data.message.trim(),
      mediaUrl: data.mediaUrl,
      isApproved: true,
      createdAt: new Date().toISOString()
    };

    this.wishes.unshift(wish);

    const stats = this.analytics.get(experienceId);
    if (stats) {
      stats.wishesCount += 1;
    }

    return wish;
  }

  getWishesForExperience(experienceId: string, tenantId?: string): ExperienceWish[] {
    return this.wishes.filter(
      (w) => w.experienceId === experienceId && w.isApproved && (!tenantId || w.tenantId === tenantId)
    );
  }

  // --- Analytics Handlers ---
  recordPageView(experienceId: string, isUnique = false): void {
    let stats = this.analytics.get(experienceId);
    if (!stats) {
      const exp = this.getExperienceById(experienceId);
      stats = {
        experienceId,
        tenantId: exp?.tenantId || 'default',
        totalViews: 0,
        uniqueVisitors: 0,
        rsvpCount: 0,
        wishesCount: 0,
        engagementRate: 0
      };
      this.analytics.set(experienceId, stats);
    }

    stats.totalViews += 1;
    if (isUnique) {
      stats.uniqueVisitors += 1;
    }
    stats.lastViewedAt = new Date().toISOString();
    if (stats.totalViews > 0) {
      stats.engagementRate = Math.min(
        100,
        Math.round(((stats.rsvpCount + stats.wishesCount) / Math.max(1, stats.uniqueVisitors)) * 100)
      );
    }
  }

  getAnalytics(experienceId: string): ExperienceAnalytics | undefined {
    return this.analytics.get(experienceId);
  }
}
