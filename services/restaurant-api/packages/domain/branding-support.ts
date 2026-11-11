import { DEFAULT_TEMPLATES, type TemplateSectionConfig } from './marketplace';

export interface TenantBrandConfig {
  restaurantName: string;
  tagline: string;
  logoUrl: string;
  heroBannerUrl?: string;
  faviconUrl: string;
  appIconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  surfaceColor: string;
  textColor: string;
  fontFamilyHeading: string;
  fontFamilyBody: string;
  activeTemplateId: string;
  subdomain: string;
  customDomain?: string;
  domainStatus: 'UNCONFIGURED' | 'PENDING_DNS' | 'VERIFIED' | 'ACTIVE' | 'FAILED';
  sslStatus: 'NOT_PROVISIONED' | 'PROVISIONING' | 'ACTIVE';
  customCss?: string;
  phone?: string;
  socialLinks: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
    mapsUrl?: string;
  };
  seo: {
    title: string;
    description: string;
    ogImage: string;
  };
  locale: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  branchOverrides: Record<string, Partial<TenantBrandConfig>>;
  updatedAt: string;
}

export interface TemplateDraftAndPublication {
  templateId: string;
  version: number;
  draftSections: TemplateSectionConfig[];
  draftTokens: Record<string, any>;
  publishedSections: TemplateSectionConfig[];
  publishedTokens: Record<string, any>;
  lastSavedAt: string;
  lastPublishedAt?: string;
  revisions: {
    revisionId: string;
    version: number;
    publishedAt: string;
    publishedBy: string;
    sections: TemplateSectionConfig[];
    tokens: Record<string, any>;
    summary: string;
  }[];
}

export interface SupportTicketMessage {
  id: string;
  sender: 'RESTAURANT_STAFF' | 'ORBITOX_SUPPORT' | 'SYSTEM_ESCALATION';
  authorName: string;
  text: string;
  timestamp: string;
  attachments?: string[];
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  branchId: string;
  branchName: string;
  staffId: string;
  staffName: string;
  category:
    | 'BILLING'
    | 'HARDWARE_KDS'
    | 'TABLE_LAYOUT'
    | 'PAYMENTS'
    | 'MENU_SYNC'
    | 'DOMAIN_SETUP'
    | 'URGENT_INCIDENT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  subject: string;
  description: string;
  status: 'OPEN' | 'INVESTIGATING' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  messages: SupportTicketMessage[];
}

export const DEFAULT_BRAND_CONFIG: TenantBrandConfig = {
  restaurantName: 'OrbitoX Bistro & Bar',
  tagline: 'Modern Hospitality & Charcoal Embers',
  logoUrl: 'https://assets.orbitox.io/logos/orbitox-bistro-gold.svg',
  faviconUrl: '/favicon.ico',
  appIconUrl: 'https://assets.orbitox.io/icons/app-icon-192.png',
  primaryColor: '#C86B3C',
  secondaryColor: '#D99A45',
  accentColor: '#5D9A7A',
  surfaceColor: '#121519',
  textColor: '#F3EEE5',
  fontFamilyHeading: '"Playfair Display", Georgia, serif',
  fontFamilyBody: 'system-ui, -apple-system, sans-serif',
  activeTemplateId: 'tmpl_haute_gastronomy',
  subdomain: 'bistro.orbitox.live',
  customDomain: 'dine.orbitoxbistro.com',
  domainStatus: 'ACTIVE',
  sslStatus: 'ACTIVE',
  customCss: '/* Tenant custom overrides */\n.brand-badge { letter-spacing: 0.1em; }',
  socialLinks: {
    instagram: 'https://instagram.com/orbitoxbistro',
    twitter: 'https://twitter.com/orbitoxbistro',
    facebook: 'https://facebook.com/orbitoxbistro',
    mapsUrl: 'https://maps.google.com/?q=OrbitoX+Bistro',
  },
  seo: {
    title: 'OrbitoX Bistro & Bar — Luxury Charcoal Dining & Table Ordering',
    description: 'Experience artisan Indian tandoor, sommelier pairings, and contactless table ordering powered by RestaurantOS 3.0.',
    ogImage: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop&q=80',
  },
  locale: 'en-IN',
  currency: 'INR',
  currencySymbol: '₹',
  timezone: 'Asia/Kolkata',
  branchOverrides: {
    branch_chd: {
      restaurantName: 'OrbitoX Bistro · Chandigarh Sector 17',
      primaryColor: '#4A8BB2',
      tagline: 'Patio & Garden Gastronomy',
      subdomain: 'chd.orbitox.live',
    },
    branch_del: {
      restaurantName: 'OrbitoX Bistro · Connaught Place Delhi',
      primaryColor: '#D99A45',
      tagline: 'Colonial Verandah & Craft Cocktails',
      subdomain: 'delhi.orbitox.live',
    },
  },
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_TEMPLATE_DRAFT: TemplateDraftAndPublication = {
  templateId: 'tmpl_haute_gastronomy',
  version: 3,
  draftSections: DEFAULT_TEMPLATES[0].defaultSections,
  draftTokens: DEFAULT_TEMPLATES[0].defaultTokens,
  publishedSections: DEFAULT_TEMPLATES[0].defaultSections,
  publishedTokens: DEFAULT_TEMPLATES[0].defaultTokens,
  lastSavedAt: new Date().toISOString(),
  lastPublishedAt: new Date().toISOString(),
  revisions: [
    {
      revisionId: 'rev_v3_initial',
      version: 3,
      publishedAt: new Date().toISOString(),
      publishedBy: 'Sukhwinder Sandhu (Manager)',
      sections: DEFAULT_TEMPLATES[0].defaultSections,
      tokens: DEFAULT_TEMPLATES[0].defaultTokens,
      summary: 'Production publication of Haute Gastronomy Noir theme for Autumn 2026.',
    },
  ],
};

export const DEFAULT_SUPPORT_TICKETS: SupportTicket[] = [
  {
    id: 'tkt_101',
    ticketNumber: 'ORB-8492',
    branchId: 'branch_ldh',
    branchName: 'Ludhiana Main',
    staffId: 'stf_mgr_ldh_01',
    staffName: 'Sukhwinder Sandhu',
    category: 'HARDWARE_KDS',
    severity: 'MEDIUM',
    subject: 'Kitchen bump-bar Bluetooth disconnect on Curry Line terminal',
    description: 'The physical bump bar disconnected during peak rush yesterday. Requesting hardware troubleshooting steps or pairing re-initialization guide.',
    status: 'INVESTIGATING',
    assignedTo: 'OrbitoX Technical Support (Level 2)',
    createdAt: new Date(Date.now() - 3600 * 1000 * 14).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    messages: [
      {
        id: 'msg_101_1',
        sender: 'RESTAURANT_STAFF',
        authorName: 'Sukhwinder Sandhu',
        text: 'The Curry Line bump bar showed flashing amber LED around 20:30 PM. We had to use on-screen touch bump instead.',
        timestamp: new Date(Date.now() - 3600 * 1000 * 14).toISOString(),
      },
      {
        id: 'msg_101_2',
        sender: 'ORBITOX_SUPPORT',
        authorName: 'Aarav at OrbitoX Support',
        text: 'Hello Sukhwinder! We inspected the station logs. Firmware v2.1 had a power-saving timeout trigger. We pushed a diagnostic patch to your runtime.',
        timestamp: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
      },
    ],
  },
  {
    id: 'tkt_102',
    ticketNumber: 'ORB-8510',
    branchId: 'branch_chd',
    branchName: 'Chandigarh Sector 17',
    staffId: 'stf_mgr_chd_01',
    staffName: 'Karan Kapoor',
    category: 'DOMAIN_SETUP',
    severity: 'LOW',
    subject: 'Requesting assistance configuring custom CNAME for dine.sector17bistro.com',
    description: 'We pointed CNAME to ingress.orbitox.io but SSL provisioning shows PENDING_DNS in White-Label settings.',
    status: 'OPEN',
    assignedTo: 'Cloud Infrastructure Team',
    createdAt: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
    messages: [
      {
        id: 'msg_102_1',
        sender: 'RESTAURANT_STAFF',
        authorName: 'Karan Kapoor',
        text: 'DNS TTL was set to 3600s with GoDaddy. Waiting for global propagation.',
        timestamp: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
      },
    ],
  },
];
