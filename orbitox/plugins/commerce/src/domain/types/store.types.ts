export type StoreStatus = 'draft' | 'active' | 'maintenance' | 'suspended';

export interface StoreSocialLinks {
  instagram?: string;
  twitter?: string;
  facebook?: string;
  youtube?: string;
  tiktok?: string;
  pinterest?: string;
}

export interface StoreContactInfo {
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  supportHours?: string;
}

export interface StoreSettings {
  currency: string;
  currencySymbol: string;
  timezone: string;
  locale: string;
  taxRatePercent: number;
  pricesIncludeTax: boolean;
  allowGuestCheckout: boolean;
  inventoryTrackingEnabled: boolean;
  lowStockThreshold: number;
  freeShippingThreshold?: number;
  defaultShippingFee: number;
  socialLinks?: StoreSocialLinks;
  contact?: StoreContactInfo;
  announcementText?: string;
  announcementEnabled?: boolean;
  // WhatsApp Commerce Settings
  whatsappNumber?: string;
  whatsappEnabled?: boolean;
  whatsappDefaultMessage?: string;
  // Vertical Commerce Settings
  verticalPreset?: 'punjabi-jutti' | 'phulkari' | 'ethnic-wear' | 'bridal-couture' | 'general';
  instagramShopHandle?: string;
  showBiteFreeGuarantee?: boolean;
  showSizeGuideModal?: boolean;
}

export interface Store {
  id: string;
  tenantId: string; // Multi-tenancy link to OrbitoX context
  slug: string; // e.g. "aura-fashion" -> aura-fashion.orbitox.com
  name: string;
  verticalCategory?: string; // e.g. "punjabi-jutti" | "traditional-fashion"
  tagline?: string;
  description?: string;
  logoUrl?: string;
  faviconUrl?: string;
  status: StoreStatus;
  primaryDomain?: string; // e.g. "shop.aurafashion.com"
  customDomains: string[];
  currentVersion: number;
  publishedVersion: number;
  activeThemeId: string;
  settings: StoreSettings;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStorePayload {
  name: string;
  slug: string;
  tagline?: string;
  description?: string;
  logoUrl?: string;
  themePresetId?: string;
  currency?: string;
  settings?: Partial<StoreSettings>;
}

export interface UpdateStorePayload {
  name?: string;
  tagline?: string;
  description?: string;
  logoUrl?: string;
  faviconUrl?: string;
  status?: StoreStatus;
  primaryDomain?: string;
  activeThemeId?: string;
  settings?: Partial<StoreSettings>;
}
