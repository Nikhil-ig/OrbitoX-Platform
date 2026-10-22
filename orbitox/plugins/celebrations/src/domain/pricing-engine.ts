import { PricingPlan, TierLevel } from './types';

export const DEFAULT_PRICING_PLANS: PricingPlan[] = [
  {
    id: 'plan_free',
    name: 'Classic Starter',
    tier: 'FREE',
    priceInr: 0,
    maxGuests: 50,
    maxPhotos: 15,
    customDomainAllowed: false,
    passwordProtectionAllowed: false,
    musicPlayerAllowed: false,
    analyticsAllowed: false,
    watermarkRemoved: false,
    durationDays: 30,
    features: ['Standard Themes', 'Basic RSVP (up to 50)', 'Photo Gallery (15 photos)', 'Interactive Venue Map'],
    isPopular: false
  },
  {
    id: 'plan_pro',
    name: 'Elegance Suite',
    tier: 'PRO',
    priceInr: 1499,
    maxGuests: 500,
    maxPhotos: 100,
    customDomainAllowed: false,
    passwordProtectionAllowed: true,
    musicPlayerAllowed: true,
    analyticsAllowed: true,
    watermarkRemoved: true,
    durationDays: 180,
    features: [
      'All Pro & Premium Themes',
      'Unlimited RSVPs & Guestbook',
      'Ambient Background Music',
      'Password Protected Access',
      'No OrbitoX Branding / Watermark',
      'Printable High-DPI QR Card',
      'Photo Gallery (100 photos)',
      'Active for 6 Months'
    ],
    isPopular: true
  },
  {
    id: 'plan_premium',
    name: 'Royal Heritage',
    tier: 'PREMIUM',
    priceInr: 3999,
    maxGuests: 5000,
    maxPhotos: 500,
    customDomainAllowed: true,
    passwordProtectionAllowed: true,
    musicPlayerAllowed: true,
    analyticsAllowed: true,
    watermarkRemoved: true,
    durationDays: 365,
    features: [
      'Everything in Elegance',
      'Custom Domain (e.g. aaravandmeera.com)',
      'Dedicated SSL Certificate',
      'Live Guest Engagement Analytics',
      'Ultra High-Resolution Gallery (500 photos)',
      'WhatsApp RSVP Broadcast Helper',
      'Active for 1 Full Year',
      'Priority 24/7 Concierge Support'
    ],
    isPopular: false
  }
];

export class PricingEngine {
  private plans: PricingPlan[] = [];

  constructor(initialPlans: PricingPlan[] = DEFAULT_PRICING_PLANS) {
    this.plans = [...initialPlans];
  }

  getPlans(): PricingPlan[] {
    return [...this.plans];
  }

  getPlanByTier(tier: TierLevel): PricingPlan | undefined {
    return this.plans.find((p) => p.tier === tier);
  }

  getPlanById(id: string): PricingPlan | undefined {
    return this.plans.find((p) => p.id === id);
  }

  calculateOrderTotal(tier: TierLevel, addons: { priceInr: number }[] = []): {
    subtotal: number;
    tax: number;
    total: number;
  } {
    const plan = this.getPlanByTier(tier);
    const planBase = plan ? plan.priceInr : 0;
    const addonTotal = addons.reduce((sum, a) => sum + a.priceInr, 0);
    const subtotal = planBase + addonTotal;
    const tax = Math.round(subtotal * 0.18); // 18% GST standard in India
    return {
      subtotal,
      tax,
      total: subtotal + tax
    };
  }
}
