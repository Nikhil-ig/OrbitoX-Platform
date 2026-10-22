'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { BUILTIN_TEMPLATES, ExperienceTemplate } from '@orbitox-io/celebrations';

export type UserRole = 'PLATFORM_ADMIN' | 'AGENCY_PLANNER' | 'HOST_CONSUMER' | 'GUEST';

export type TemplatePricingType = 'FREE' | 'FREE_TRIAL' | 'PAID' | 'TIER_EXCLUSIVE';

export interface ManagedTemplate extends ExperienceTemplate {
  status: 'ACTIVE' | 'HIDDEN' | 'ARCHIVED';
  pricingType: TemplatePricingType;
  priceInr: number;
  priceUsd: number;
  freeTrialDays: number;
  watermarkDuringTrial: boolean;
  isFeatured: boolean;
  isPopular: boolean;
  isMaisonExclusive?: boolean;
}

export interface SubscriptionPlanItem {
  id: string;
  name: string;
  category: 'C2C_HOST' | 'O2O2B_AGENCY';
  priceInr: number;
  priceUsd: number;
  billingPeriod: 'ONE_TIME' | 'MONTHLY' | 'ANNUAL';
  trialDays: number;
  maxEvents: number;
  maxGuests: number;
  maxPhotos: number;
  customDomainAllowed: boolean;
  watermarkRemoved: boolean;
  offlineDoorCheckIn: boolean;
  whiteLabelClientPortal: boolean;
  features: string[];
  isPopular?: boolean;
}

export interface AgencyClientProject {
  id: string;
  clientName: string;
  eventTitle: string;
  occasionSlug: string;
  templateSlug: string;
  eventDate: string;
  venueName: string;
  venueCity: string;
  status: 'PLANNING' | 'DRAFT_REVIEW' | 'LIVE_READY' | 'COMPLETED';
  totalGuests: number;
  checkedInGuests: number;
  wholesaleCostInr: number;
  clientRetailPriceInr: number;
  clientReviewUrl: string;
  doorStaffPasscode: string;
  createdAt: string;
}

export interface EcosystemContextType {
  // Active Persona / Role
  currentRole: UserRole;
  setRole: (role: UserRole) => void;

  // Template Catalog Governance (Admin Managed)
  templates: ManagedTemplate[];
  visibleTemplates: ManagedTemplate[];
  toggleTemplateVisibility: (slug: string, isHidden: boolean) => void;
  updateTemplatePricing: (
    slug: string,
    updates: Partial<Pick<ManagedTemplate, 'pricingType' | 'priceInr' | 'priceUsd' | 'freeTrialDays' | 'watermarkDuringTrial' | 'isFeatured' | 'isPopular'>>
  ) => void;
  getTemplateBySlug: (slug: string) => ManagedTemplate | undefined;

  // Subscriptions & Plans (Admin Managed)
  subscriptionPlans: SubscriptionPlanItem[];
  c2cPlans: SubscriptionPlanItem[];
  agencyPlans: SubscriptionPlanItem[];
  updateSubscriptionPlan: (planId: string, updates: Partial<SubscriptionPlanItem>) => void;

  // O2O2B Agency Ecosystem
  agencyProjects: AgencyClientProject[];
  addAgencyClientProject: (project: Omit<AgencyClientProject, 'id' | 'createdAt' | 'checkedInGuests'>) => void;
  recordDoorCheckIn: (projectId: string, guestCount?: number) => void;

  // C2C Host Context
  hostCelebration: {
    id: string;
    coupleTitle: string;
    eventDate: string;
    venueName: string;
    activePlanId: string;
    isTrialActive: boolean;
    trialDaysRemaining: number;
    watermarkActive: boolean;
    guestCount: number;
    shagunTotalInr: number;
  };
  upgradeHostPlan: (planId: string) => void;

  // System Diagnostics
  resetEcosystemDefaults: () => void;
}

const STORAGE_KEY = 'orbitox_celebrations_ecosystem_v1';

// Seed Initial Templates with Governance Metadata
const INITIAL_MANAGED_TEMPLATES: ManagedTemplate[] = BUILTIN_TEMPLATES.map((tmpl, idx) => {
  let pricingType: TemplatePricingType = 'PAID';
  let priceInr = 1499;
  let isFeatured = false;
  let isPopular = false;
  let isMaisonExclusive = false;

  if (tmpl.slug === 'surreal-organimo') {
    pricingType = 'FREE_TRIAL';
    priceInr = 1999;
    isFeatured = true;
    isPopular = true;
  } else if (tmpl.slug === 'royal-regalia') {
    pricingType = 'TIER_EXCLUSIVE';
    priceInr = 3999;
    isFeatured = true;
    isMaisonExclusive = true;
  } else if (tmpl.slug === 'minimal-editorial') {
    pricingType = 'FREE';
    priceInr = 0;
  } else if (tmpl.slug === 'party-nocturne') {
    pricingType = 'FREE_TRIAL';
    priceInr = 999;
    isPopular = true;
  } else if (tmpl.slug === 'celestial-parallax') {
    pricingType = 'TIER_EXCLUSIVE';
    priceInr = 4999;
    isMaisonExclusive = true;
  } else if (tmpl.slug === 'celestial-odyssey') {
    pricingType = 'TIER_EXCLUSIVE';
    priceInr = 5999;
    isFeatured = true;
    isPopular = true;
    isMaisonExclusive = true;
  }

  return {
    ...tmpl,
    status: 'ACTIVE',
    pricingType,
    priceInr,
    priceUsd: Math.round(priceInr / 80),
    freeTrialDays: 7,
    watermarkDuringTrial: true,
    isFeatured,
    isPopular,
    isMaisonExclusive,
  };
});

// Seed Initial Subscription Plans (C2C Host & O2O2B Agency)
const INITIAL_SUBSCRIPTION_PLANS: SubscriptionPlanItem[] = [
  // C2C Consumer Host Passes
  {
    id: 'c2c_free_trial',
    name: 'Complimentary Atelier Trial',
    category: 'C2C_HOST',
    priceInr: 0,
    priceUsd: 0,
    billingPeriod: 'ONE_TIME',
    trialDays: 7,
    maxEvents: 1,
    maxGuests: 50,
    maxPhotos: 15,
    customDomainAllowed: false,
    watermarkRemoved: false,
    offlineDoorCheckIn: false,
    whiteLabelClientPortal: false,
    features: [
      '7-Day Full Interactive 3D Preview',
      'Basic RSVP Guestbook (up to 50)',
      'Digital Shagun QR Collection',
      'OrbitoX Watermark Badge Included',
    ],
    isPopular: false,
  },
  {
    id: 'c2c_classic_pass',
    name: 'Curated Milestone Pass',
    category: 'C2C_HOST',
    priceInr: 1499,
    priceUsd: 19,
    billingPeriod: 'ONE_TIME',
    trialDays: 0,
    maxEvents: 1,
    maxGuests: 500,
    maxPhotos: 100,
    customDomainAllowed: false,
    watermarkRemoved: true,
    offlineDoorCheckIn: false,
    whiteLabelClientPortal: false,
    features: [
      'Active for 6 Full Months',
      'All Pro Themes & Ambient Audio',
      'Unlimited RSVPs & Dietary Tracking',
      'OrbitoX Watermark Removed',
      'High-DPI Printable Invitation QR',
    ],
    isPopular: true,
  },
  {
    id: 'c2c_royal_heritage',
    name: 'Grand Sovereign Royal Pass',
    category: 'C2C_HOST',
    priceInr: 3999,
    priceUsd: 49,
    billingPeriod: 'ONE_TIME',
    trialDays: 0,
    maxEvents: 1,
    maxGuests: 5000,
    maxPhotos: 500,
    customDomainAllowed: true,
    watermarkRemoved: true,
    offlineDoorCheckIn: true,
    whiteLabelClientPortal: false,
    features: [
      'Active for 1 Full Year',
      'Custom Domain (e.g. aaravandmeera.com)',
      'Automated SSL & Dedicated Routing',
      '4K WebGL Universes & Spatial Audio',
      'Door Staff Guest Check-in Terminal',
      'WhatsApp Broadcast Helper',
    ],
    isPopular: false,
  },

  // O2O2B Agency & Luxury Event Planner Subscriptions
  {
    id: 'agency_atelier_pro',
    name: 'Atelier Agency Studio',
    category: 'O2O2B_AGENCY',
    priceInr: 14999,
    priceUsd: 179,
    billingPeriod: 'MONTHLY',
    trialDays: 14,
    maxEvents: 10,
    maxGuests: 15000,
    maxPhotos: 2500,
    customDomainAllowed: true,
    watermarkRemoved: true,
    offlineDoorCheckIn: true,
    whiteLabelClientPortal: true,
    features: [
      '10 Active Client Celebrations / Month',
      'Wholesale Template Pricing (Up to 70% Margin)',
      'White-Label Client Preview Links',
      'Offline Door Staff QR Check-in Terminal',
      'Banquets & Caterer Dietary Matrix Export',
      'Multi-seat Agency Team Coordination',
    ],
    isPopular: true,
  },
  {
    id: 'agency_maison_enterprise',
    name: 'Maison Enterprise Concierge',
    category: 'O2O2B_AGENCY',
    priceInr: 49999,
    priceUsd: 599,
    billingPeriod: 'MONTHLY',
    trialDays: 0,
    maxEvents: 100,
    maxGuests: 100000,
    maxPhotos: 20000,
    customDomainAllowed: true,
    watermarkRemoved: true,
    offlineDoorCheckIn: true,
    whiteLabelClientPortal: true,
    features: [
      'Unlimited Client Celebrations',
      'Dedicated Custom 3D Universe Engineering',
      'Multi-Venue Banquet Network Management',
      'Private Custom Domain Cluster',
      '24/7 Red-Carpet Event Day Concierge',
      'Full CRM & ERP Pipeline Synchronization',
    ],
    isPopular: false,
  },
];

// Seed Initial O2O2B Client Projects
const INITIAL_AGENCY_PROJECTS: AgencyClientProject[] = [
  {
    id: 'proj_singhania_udaipur',
    clientName: 'The Singhania Family',
    eventTitle: 'Imperial Palace Wedding of Veer & Rhea',
    occasionSlug: 'wedding',
    templateSlug: 'royal-regalia',
    eventDate: '2026-11-28',
    venueName: 'Taj Lake Palace',
    venueCity: 'Udaipur, Rajasthan',
    status: 'LIVE_READY',
    totalGuests: 550,
    checkedInGuests: 384,
    wholesaleCostInr: 2499,
    clientRetailPriceInr: 18500,
    clientReviewUrl: '/e/royal-wedding-demo?client=singhania',
    doorStaffPasscode: 'LAKE-7788',
    createdAt: '2026-09-01T10:00:00Z',
  },
  {
    id: 'proj_kapoor_jubilee',
    clientName: 'Sunil & Sunita Kapoor',
    eventTitle: 'Golden Jubilee & Vow Renewal',
    occasionSlug: 'anniversary',
    templateSlug: 'celestial-parallax',
    eventDate: '2026-10-15',
    venueName: 'The Leela Palace',
    venueCity: 'Bengaluru',
    status: 'DRAFT_REVIEW',
    totalGuests: 250,
    checkedInGuests: 192,
    wholesaleCostInr: 1499,
    clientRetailPriceInr: 12000,
    clientReviewUrl: '/e/royal-wedding-demo?client=kapoor',
    doorStaffPasscode: 'LEELA-3321',
    createdAt: '2026-09-08T14:30:00Z',
  },
  {
    id: 'proj_zephyr_gala',
    clientName: 'Zephyr Capital Partners',
    eventTitle: 'Global Founders Summit & Annual Gala',
    occasionSlug: 'corporate-event',
    templateSlug: 'party-nocturne',
    eventDate: '2026-12-05',
    venueName: 'Grand Hyatt Convention Hall',
    venueCity: 'Mumbai',
    status: 'PLANNING',
    totalGuests: 800,
    checkedInGuests: 0,
    wholesaleCostInr: 3999,
    clientRetailPriceInr: 35000,
    clientReviewUrl: '/e/royal-wedding-demo?client=zephyr',
    doorStaffPasscode: 'GALA-9900',
    createdAt: '2026-09-15T09:15:00Z',
  },
];

const EcosystemContext = createContext<EcosystemContextType | null>(null);

export function EcosystemProvider({ children }: { children: React.ReactNode }) {
  const [currentRole, setCurrentRole] = useState<UserRole>('PLATFORM_ADMIN');
  const [templates, setTemplates] = useState<ManagedTemplate[]>(INITIAL_MANAGED_TEMPLATES);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlanItem[]>(INITIAL_SUBSCRIPTION_PLANS);
  const [agencyProjects, setAgencyProjects] = useState<AgencyClientProject[]>(INITIAL_AGENCY_PROJECTS);

  const [hostCelebration, setHostCelebration] = useState({
    id: 'host_aarav_meera',
    coupleTitle: 'Aarav & Meera Wedding',
    eventDate: '2026-12-18',
    venueName: 'Umaid Bhawan Palace, Jodhpur',
    activePlanId: 'c2c_free_trial',
    isTrialActive: true,
    trialDaysRemaining: 5,
    watermarkActive: true,
    guestCount: 284,
    shagunTotalInr: 185000,
  });

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.currentRole) setCurrentRole(parsed.currentRole);
        if (Array.isArray(parsed.templates)) setTemplates(parsed.templates);
        if (Array.isArray(parsed.subscriptionPlans)) setSubscriptionPlans(parsed.subscriptionPlans);
        if (Array.isArray(parsed.agencyProjects)) setAgencyProjects(parsed.agencyProjects);
        if (parsed.hostCelebration) setHostCelebration(parsed.hostCelebration);
      }
    } catch {
      // ignore
    }
  }, []);

  // Save to localStorage
  const saveState = (
    newRole = currentRole,
    newTemplates = templates,
    newPlans = subscriptionPlans,
    newProjects = agencyProjects,
    newHost = hostCelebration
  ) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          currentRole: newRole,
          templates: newTemplates,
          subscriptionPlans: newPlans,
          agencyProjects: newProjects,
          hostCelebration: newHost,
        })
      );
    } catch {
      // ignore
    }
  };

  const handleSetRole = (role: UserRole) => {
    setCurrentRole(role);
    saveState(role, templates, subscriptionPlans, agencyProjects, hostCelebration);
  };

  // Toggle template visibility (SHOW / HIDE)
  const toggleTemplateVisibility = (slug: string, isHidden: boolean) => {
    setTemplates((prev) => {
      const updated = prev.map((t) =>
        t.slug === slug ? { ...t, status: isHidden ? ('HIDDEN' as const) : ('ACTIVE' as const) } : t
      );
      saveState(currentRole, updated, subscriptionPlans, agencyProjects, hostCelebration);
      return updated;
    });
  };

  // Update template pricing & free trial config
  const updateTemplatePricing = (
    slug: string,
    updates: Partial<Pick<ManagedTemplate, 'pricingType' | 'priceInr' | 'priceUsd' | 'freeTrialDays' | 'watermarkDuringTrial' | 'isFeatured' | 'isPopular'>>
  ) => {
    setTemplates((prev) => {
      const updated = prev.map((t) => (t.slug === slug ? { ...t, ...updates } : t));
      saveState(currentRole, updated, subscriptionPlans, agencyProjects, hostCelebration);
      return updated;
    });
  };

  // Update subscription plans
  const updateSubscriptionPlan = (planId: string, updates: Partial<SubscriptionPlanItem>) => {
    setSubscriptionPlans((prev) => {
      const updated = prev.map((p) => (p.id === planId ? { ...p, ...updates } : p));
      saveState(currentRole, templates, updated, agencyProjects, hostCelebration);
      return updated;
    });
  };

  // Add Agency client project
  const addAgencyClientProject = (project: Omit<AgencyClientProject, 'id' | 'createdAt' | 'checkedInGuests'>) => {
    setAgencyProjects((prev) => {
      const created: AgencyClientProject = {
        ...project,
        id: `proj_${Date.now()}`,
        checkedInGuests: 0,
        createdAt: new Date().toISOString(),
      };
      const updated = [created, ...prev];
      saveState(currentRole, templates, subscriptionPlans, updated, hostCelebration);
      return updated;
    });
  };

  // Record Door Check-In for physical events
  const recordDoorCheckIn = (projectId: string, guestCount = 1) => {
    setAgencyProjects((prev) => {
      const updated = prev.map((proj) =>
        proj.id === projectId
          ? { ...proj, checkedInGuests: Math.min(proj.totalGuests, proj.checkedInGuests + guestCount) }
          : proj
      );
      saveState(currentRole, templates, subscriptionPlans, updated, hostCelebration);
      return updated;
    });
  };

  // Upgrade Host Plan
  const upgradeHostPlan = (planId: string) => {
    setHostCelebration((prev) => {
      const updated = {
        ...prev,
        activePlanId: planId,
        isTrialActive: false,
        trialDaysRemaining: 0,
        watermarkActive: false,
      };
      saveState(currentRole, templates, subscriptionPlans, agencyProjects, updated);
      return updated;
    });
  };

  const resetEcosystemDefaults = () => {
    setCurrentRole('PLATFORM_ADMIN');
    setTemplates(INITIAL_MANAGED_TEMPLATES);
    setSubscriptionPlans(INITIAL_SUBSCRIPTION_PLANS);
    setAgencyProjects(INITIAL_AGENCY_PROJECTS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const visibleTemplates = useMemo(() => {
    return templates.filter((t) => t.status !== 'HIDDEN');
  }, [templates]);

  const getTemplateBySlug = (slug: string) => {
    return templates.find((t) => t.slug === slug);
  };

  const c2cPlans = useMemo(() => {
    return subscriptionPlans.filter((p) => p.category === 'C2C_HOST');
  }, [subscriptionPlans]);

  const agencyPlans = useMemo(() => {
    return subscriptionPlans.filter((p) => p.category === 'O2O2B_AGENCY');
  }, [subscriptionPlans]);

  return (
    <EcosystemContext.Provider
      value={{
        currentRole,
        setRole: handleSetRole,
        templates,
        visibleTemplates,
        toggleTemplateVisibility,
        updateTemplatePricing,
        getTemplateBySlug,
        subscriptionPlans,
        c2cPlans,
        agencyPlans,
        updateSubscriptionPlan,
        agencyProjects,
        addAgencyClientProject,
        recordDoorCheckIn,
        hostCelebration,
        upgradeHostPlan,
        resetEcosystemDefaults,
      }}
    >
      {children}
    </EcosystemContext.Provider>
  );
}

export function useEcosystem() {
  const ctx = useContext(EcosystemContext);
  if (!ctx) {
    throw new Error('useEcosystem must be used within an EcosystemProvider');
  }
  return ctx;
}
