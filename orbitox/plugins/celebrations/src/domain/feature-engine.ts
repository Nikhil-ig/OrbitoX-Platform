import { FeatureDefinition, TierLevel } from './types';

export const DEFAULT_FEATURE_DEFINITIONS: FeatureDefinition[] = [
  {
    key: 'rsvp_tracking',
    name: 'RSVP Management',
    description: 'Collect digital RSVPs with meal options, plus-ones, and headcount reporting.',
    category: 'core',
    minTier: 'FREE',
    isAddon: false,
    priceInr: 0
  },
  {
    key: 'photo_gallery',
    name: 'High-Res Photo Gallery',
    description: 'Upload up to 50 high-resolution photos with lightbox zoom.',
    category: 'media',
    minTier: 'FREE',
    isAddon: false,
    priceInr: 0
  },
  {
    key: 'wishes_wall',
    name: 'Guest Wishes & Guestbook',
    description: 'Guests can post heartfelt wishes, blessings, and photos directly to your page.',
    category: 'personalization',
    minTier: 'FREE',
    isAddon: false,
    priceInr: 0
  },
  {
    key: 'background_music',
    name: 'Background Music Player',
    description: 'Custom background soundtrack that plays softly when guests visit.',
    category: 'media',
    minTier: 'PRO',
    isAddon: false,
    priceInr: 299
  },
  {
    key: 'password_protection',
    name: 'Password Protected Access',
    description: 'Keep your celebration private with an optional passcode for invited guests only.',
    category: 'personalization',
    minTier: 'PRO',
    isAddon: false,
    priceInr: 399
  },
  {
    key: 'no_watermark',
    name: 'Remove OrbitoX Branding',
    description: '100% white-label experience without OrbitoX badge or footer links.',
    category: 'personalization',
    minTier: 'PRO',
    isAddon: false,
    priceInr: 499
  },
  {
    key: 'custom_domain',
    name: 'Custom Domain (e.g. aaravandmeera.com)',
    description: 'Connect your own custom root or subdomain with automated SSL.',
    category: 'custom_domain',
    minTier: 'PREMIUM',
    isAddon: false,
    priceInr: 999
  },
  {
    key: 'detailed_analytics',
    name: 'Live Guest & Engagement Analytics',
    description: 'Track real-time page visits, device breakdowns, RSVP conversion rates.',
    category: 'analytics',
    minTier: 'PREMIUM',
    isAddon: false,
    priceInr: 499
  },
  {
    key: 'qr_invite_card',
    name: 'Printable QR Code Invitation Cards',
    description: 'Download print-ready high-DPI cards with QR code linking directly to your page.',
    category: 'personalization',
    minTier: 'PRO',
    isAddon: false,
    priceInr: 349
  }
];

const TIER_RANKS: Record<TierLevel, number> = {
  FREE: 1,
  PRO: 2,
  PREMIUM: 3
};

export class FeatureEngine {
  private features: FeatureDefinition[] = [];

  constructor(initialFeatures: FeatureDefinition[] = DEFAULT_FEATURE_DEFINITIONS) {
    this.features = [...initialFeatures];
  }

  getAllFeatures(): FeatureDefinition[] {
    return [...this.features];
  }

  getFeature(key: string): FeatureDefinition | undefined {
    return this.features.find((f) => f.key === key);
  }

  isFeatureAllowedInTier(featureKey: string, tier: TierLevel): boolean {
    const feat = this.getFeature(featureKey);
    if (!feat) return false;
    return TIER_RANKS[tier] >= TIER_RANKS[feat.minTier];
  }

  getAvailableFeaturesForTier(tier: TierLevel): FeatureDefinition[] {
    const tierRank = TIER_RANKS[tier];
    return this.features.filter((f) => TIER_RANKS[f.minTier] <= tierRank);
  }
}
