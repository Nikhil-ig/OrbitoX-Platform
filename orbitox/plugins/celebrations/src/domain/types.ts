export type OccasionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface OccasionCategory {
  id: string;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
}

export interface Occasion {
  id: string;
  slug: string;
  name: string;
  category: string; // e.g. 'personal', 'milestone', 'cultural', 'corporate'
  icon: string;
  description: string;
  defaultSections: string[];
  allowedFeatures: string[];
  status: OccasionStatus;
  sortOrder: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type AnimationPreset = 'subtle' | 'romantic' | 'festive' | 'modern' | 'minimal' | 'luxury';

export interface ThemeStyle {
  fontHeading: string;
  fontBody: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  cardBackgroundColor: string;
  textColor: string;
  mutedTextColor: string;
  borderRadius: string; // 'none' | 'sm' | 'md' | 'lg' | 'full'
  animationPreset: AnimationPreset;
  customCss?: string;
}

export type TierLevel = 'FREE' | 'PRO' | 'PREMIUM';

export interface Theme {
  id: string;
  slug: string;
  name: string;
  description: string;
  occasionId: string;
  occasionSlug: string;
  previewImages: string[];
  thumbnailUrl: string;
  styleConfig: ThemeStyle;
  supportedSections: string[];
  tier: TierLevel;
  isFeatured: boolean;
  isPopular: boolean;
  author?: string;
  status: 'ACTIVE' | 'ARCHIVED';
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export type SectionType =
  | 'hero'
  | 'countdown'
  | 'couple_profile'
  | 'person_profile'
  | 'story'
  | 'events_schedule'
  | 'venue_map'
  | 'gallery'
  | 'rsvp'
  | 'wishes_guestbook'
  | 'dress_code'
  | 'travel_stay'
  | 'qna'
  | 'music_player'
  | 'gift_registry'
  | 'live_poll'
  | 'social_wall'
  | 'video_message'
  | 'custom_content';

export type SectionCategory = 'essential' | 'media' | 'engagement' | 'logistics' | 'custom';

export interface SectionFieldSchema {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'time' | 'image' | 'array' | 'boolean' | 'select' | 'color';
  required?: boolean;
  defaultValue?: unknown;
  options?: { label: string; value: string }[];
  description?: string;
}

export interface SectionDefinition {
  type: SectionType;
  name: string;
  description: string;
  category: SectionCategory;
  isPremium: boolean;
  defaultEnabled: boolean;
  fields: SectionFieldSchema[];
  defaultConfig: Record<string, unknown>;
}

export interface ExperienceSection {
  id: string;
  sectionType: SectionType;
  title?: string;
  subtitle?: string;
  order: number;
  isEnabled: boolean;
  config: Record<string, unknown>;
}

export type ExperienceStatus = 'DRAFT' | 'PREVIEW' | 'PUBLISHED' | 'ARCHIVED' | 'EXPIRED';

export interface Experience {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  occasionId: string;
  occasionSlug: string;
  occasionType?: string;
  themeId: string;
  themeSlug: string;
  templateSlug?: string;
  status: ExperienceStatus;
  customDomain?: string;
  customPath?: string;
  passwordProtection?: boolean;
  passwordHash?: string;
  eventDate?: string;
  expiresAt?: string;
  sections: ExperienceSection[];
  featuresEnabled: string[];
  styleOverrides?: Partial<ThemeStyle>;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type RsvpStatus = 'ATTENDING' | 'DECLINED' | 'TENTATIVE';

export interface ExperienceGuest {
  id: string;
  experienceId: string;
  tenantId: string;
  guestName: string;
  email?: string;
  phone?: string;
  attending: RsvpStatus;
  partySize: number;
  dietaryRequirements?: string;
  message?: string;
  plusOneName?: string;
  attendedEvents?: string[];
  checkInStatus?: 'PENDING' | 'CHECKED_IN';
  tableNumber?: number;
  isVip?: boolean;
  createdAt: string;
}

export type GiftFundType = 'honeymoon' | 'new_home' | 'baby_fund' | 'blessing' | 'charity';

export interface ShagunContribution {
  id: string;
  experienceId: string;
  tenantId: string;
  contributorName: string;
  email?: string;
  amount: number;
  currency: string;
  fundType: GiftFundType;
  blessingNote?: string;
  paymentMethod: 'UPI' | 'CARD' | 'NETBANKING';
  transactionRef: string;
  status: 'COMPLETED' | 'PENDING';
  createdAt: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  icon?: string;
}

export interface EventPoll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
}

export interface GuestTable {
  tableNumber: number;
  tableName: string;
  capacity: number;
  assignedGuests: {
    guestId: string;
    guestName: string;
    partySize: number;
    dietary?: string;
    isVip?: boolean;
  }[];
  totalSeated: number;
}

export interface SeatingPlanResult {
  tables: GuestTable[];
  unassignedCount: number;
  totalSeated: number;
  vipTableCount: number;
}

export interface BudgetItem {
  category: string;
  allocatedInr: number;
  percentage: number;
  description: string;
  status: 'essential' | 'recommended' | 'optional';
}

export interface CelebrationBudgetReport {
  totalEstimatedBudgetInr: number;
  costPerGuestInr: number;
  categories: BudgetItem[];
  savingsTips: string[];
}

export interface ExperienceWish {
  id: string;
  experienceId: string;
  tenantId: string;
  guestName: string;
  message: string;
  mediaUrl?: string;
  isApproved: boolean;
  createdAt: string;
}

export interface ExperienceAnalytics {
  experienceId: string;
  tenantId: string;
  totalViews: number;
  uniqueVisitors: number;
  rsvpCount: number;
  wishesCount: number;
  engagementRate: number;
  lastViewedAt?: string;
}

export interface FeatureDefinition {
  key: string;
  name: string;
  description: string;
  category: 'core' | 'personalization' | 'media' | 'analytics' | 'custom_domain';
  minTier: TierLevel;
  isAddon: boolean;
  priceInr: number;
  metadata?: Record<string, unknown>;
}

export interface PricingPlan {
  id: string;
  name: string;
  tier: TierLevel;
  priceInr: number;
  maxGuests: number;
  maxPhotos: number;
  customDomainAllowed: boolean;
  passwordProtectionAllowed: boolean;
  musicPlayerAllowed: boolean;
  analyticsAllowed: boolean;
  watermarkRemoved: boolean;
  durationDays: number;
  features: string[];
  isPopular?: boolean;
}

export interface CreateExperiencePayload {
  tenantId: string;
  title: string;
  occasionSlug: string;
  themeSlug: string;
  templateSlug?: string;
  eventDate?: string;
  customPath?: string;
  sections?: Partial<ExperienceSection>[];
  featuresEnabled?: string[];
  styleOverrides?: Partial<ThemeStyle>;
  metadata?: Record<string, unknown>;
}

export interface UpdateExperiencePayload {
  title?: string;
  eventDate?: string;
  themeSlug?: string;
  templateSlug?: string;
  customPath?: string;
  customDomain?: string;
  passwordProtection?: boolean;
  password?: string;
  sections?: ExperienceSection[];
  featuresEnabled?: string[];
  styleOverrides?: Partial<ThemeStyle>;
  metadata?: Record<string, unknown>;
}

export interface ExperienceFilter {
  occasionSlug?: string;
  status?: ExperienceStatus;
  tenantId?: string;
  search?: string;
}

export interface ThemeFilter {
  occasionSlug?: string;
  tier?: TierLevel;
  isFeatured?: boolean;
  search?: string;
}
