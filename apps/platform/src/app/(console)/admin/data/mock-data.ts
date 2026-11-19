export interface ServiceItem {
  id: string;
  name: string;
  packageName: string;
  category: 'sales' | 'healthcare' | 'ecommerce' | 'finance' | 'hr' | 'logistics' | 'restaurant' | 'education' | 'retail';
  version: string;
  status: 'active' | 'blocked' | 'maintenance' | 'beta';
  description: string;
  icon: string;
  badgeColor: string;
  latencyMs: number;
  uptimePercent: number;
  activeTenants: number;
  monthlyApiCalls: number;
  apiCallLimit: number;
  storageMb: number;
  storageLimitMb: number;
  author: string;
  permissions: {
    code: string;
    description: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }[];
  endpoints: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    desc: string;
  }[];
}

export interface BusinessCategory {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  gradient: string;
  providerCount: number;
  activeServices: string[];
  totalApiCalls: string;
  totalActiveUsers: string;
  description: string;
}

export interface DnsDiagnosticInfo {
  cnameTarget: string;
  cnameStatus: 'verified' | 'pending' | 'failed';
  sslIssuer: string;
  sslExpiresDays: number;
  edgeLatencyMs: number;
  tlsVersion: string;
  anycastIp: string;
}

export interface LiveRecordItem {
  id: string;
  title: string;
  badge: string;
  badgeType: 'success' | 'warning' | 'info' | 'danger';
  details: string;
  timestamp: string;
  extraMeta?: Record<string, string>;
}

export interface BusinessProvider {
  id: string;
  categorySlug: string;
  name: string;
  legalEntity: string;
  tagline: string;
  city: string;
  country: string;
  status: 'active' | 'blocked' | 'maintenance' | 'trial';
  plan: string;
  customDomain: string;
  cnameVerified: boolean;
  sslActive: boolean;
  avatar: string;
  createdAt: string;
  metrics: {
    label: string;
    value: string;
    subtext: string;
  }[];
  monthlyApiCalls: number;
  apiCallQuota: number;
  storageUsedGb: number;
  storageQuotaGb: number;
  enabledServices: string[];
  apiKeysCount: number;
  contactEmail: string;
  technicalLead: string;
  dnsDiagnostics?: DnsDiagnosticInfo;
  liveRecords?: LiveRecordItem[];
}

export interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  maskedKey: string;
  rawKey?: string;
  serviceId: string; // or 'all'
  serviceName: string;
  providerId?: string;
  providerName?: string;
  environment: 'production' | 'staging' | 'sandbox';
  scopes: string[];
  createdAt: string;
  lastUsedAt: string;
  status: 'active' | 'blocked' | 'revoked';
  rateLimitPerMin: number;
  requestsLast30Days: number;
}

export interface PlatformQuotaMetric {
  id: string;
  name: string;
  icon: string;
  used: number;
  limit: number;
  unit: string;
  percentage: number;
  trend: string;
  trendUp: boolean;
  status: 'healthy' | 'warning' | 'critical';
}

export interface SystemNodeHealth {
  id: string;
  region: string;
  location: string;
  status: 'operational' | 'degraded' | 'maintenance';
  latencyMs: number;
  cpuLoad: number;
  memoryUsagePercent: number;
  activeSockets: number;
}

export interface FacadeStatus {
  name: string;
  description: string;
  antiTamperFrozen: boolean;
  activeHooks: number;
  status: 'healthy' | 'warning';
}

// ───────────────────────────────────────────────
// ALL 9 ORBITOX SERVICES (PLUGINS)
// ───────────────────────────────────────────────
export const INITIAL_SERVICES: ServiceItem[] = [
  {
    id: 'hms',
    name: 'Hospital Management System (HMS)',
    packageName: '@orbitox/hms',
    category: 'healthcare',
    version: '2.4.0',
    status: 'active',
    description: 'Mission-critical clinical workflows, patient EHR/EMR, triage state machines, bed & ward matrices, and telemetry.',
    icon: 'hospital',
    badgeColor: '#EC4899',
    latencyMs: 14,
    uptimePercent: 99.99,
    activeTenants: 12,
    monthlyApiCalls: 4820000,
    apiCallLimit: 10000000,
    storageMb: 420000,
    storageLimitMb: 1000000,
    author: 'OrbitoX Clinical Labs',
    permissions: [
      { code: 'hms.patients.read', description: 'Query patient demographic & clinical records', riskLevel: 'high' },
      { code: 'hms.triage.execute', description: 'Advance emergency triage state machine', riskLevel: 'critical' },
      { code: 'hms.pharmacy.dispense', description: 'Authorize drug and pharmaceutical delivery', riskLevel: 'critical' },
      { code: 'hms.telemetry.stream', description: 'Ingest IoT biometric telemetry streams', riskLevel: 'medium' },
      { code: 'hms.beds.allocate', description: 'Assign intensive care and acute care beds', riskLevel: 'medium' },
    ],
    endpoints: [
      { method: 'GET', path: '/api/v1/hms/patients', desc: 'List tenant patients' },
      { method: 'POST', path: '/api/v1/hms/triage/advance', desc: 'Execute triage state transition' },
      { method: 'GET', path: '/api/v1/hms/telemetry/live', desc: 'WebSocket biometric feed' },
      { method: 'POST', path: '/api/v1/hms/beds/reserve', desc: 'Hold ward bed allocation' },
    ],
  },
  {
    id: 'restaurant',
    name: 'Restaurant & Kitchen OS',
    packageName: '@orbitox/restaurant',
    category: 'restaurant',
    version: '2.2.0',
    status: 'active',
    description: 'Interactive kitchen display systems (KDS), table floor plans, multi-station ticket firing, and reservation management.',
    icon: 'restaurant',
    badgeColor: '#F59E0B',
    latencyMs: 16,
    uptimePercent: 99.97,
    activeTenants: 14,
    monthlyApiCalls: 2750000,
    apiCallLimit: 6000000,
    storageMb: 180000,
    storageLimitMb: 400000,
    author: 'OrbitoX Hospitality Team',
    permissions: [
      { code: 'restaurant.orders.kds', description: 'Fire tickets to kitchen prep stations', riskLevel: 'medium' },
      { code: 'restaurant.tables.reserve', description: 'Manage table floor plan and bookings', riskLevel: 'low' },
      { code: 'restaurant.menu.manage', description: 'Update digital menu, modifiers, and 86 list', riskLevel: 'low' },
    ],
    endpoints: [
      { method: 'GET', path: '/api/v1/restaurant/kds/tickets', desc: 'Live kitchen ticket queue' },
      { method: 'POST', path: '/api/v1/restaurant/orders/fire', desc: 'Send order to kitchen line' },
      { method: 'GET', path: '/api/v1/restaurant/tables/layout', desc: 'Floor plan table matrix' },
    ],
  },
];

// ───────────────────────────────────────────────
// BUSINESS SERVICE VERTICAL CATEGORIES
// ───────────────────────────────────────────────
export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  {
    id: 'cat-hospitals',
    slug: 'hospitals',
    title: 'Hospitals & Healthcare Networks',
    subtitle: 'EMR, Intensive Care, Inpatient Matrix & Diagnostics',
    icon: 'hospitals',
    color: '#EC4899',
    gradient: 'linear-gradient(135deg, rgba(236,72,153,0.2) 0%, rgba(168,85,247,0.1) 100%)',
    providerCount: 5,
    activeServices: ['hms'],
    totalApiCalls: '11.09M',
    totalActiveUsers: '116,000 Patients',
    description: 'High-compliance medical centers running OrbitoX HMS for clinical triage, pharmacy dispense, bed telemetry, and zero-leak health records.',
  },
  {
    id: 'cat-restaurants',
    slug: 'restaurants',
    title: 'Restaurants & Hospitality Chains',
    subtitle: 'Kitchen Display Systems (KDS), Table Floormaps & QR Menus',
    icon: 'restaurants',
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(239,68,68,0.1) 100%)',
    providerCount: 3,
    activeServices: ['restaurant'],
    totalApiCalls: '3.11M',
    totalActiveUsers: '7,100 Daily Covers',
    description: 'Bistros, franchise chains, and multi-station cloud kitchens running high-speed KDS firing orders directly to prep lines.',
  },
];

// ───────────────────────────────────────────────
// PROVIDERS PER BUSINESS VERTICAL
// ───────────────────────────────────────────────
export const BUSINESS_PROVIDERS: Record<string, BusinessProvider[]> = {
  hospitals: [
    {
      id: 'st-jude',
      categorySlug: 'hospitals',
      name: 'St. Jude Metropolitan Medical Center',
      legalEntity: 'St. Jude Healthcare Trust Inc.',
      tagline: 'Level-1 Trauma & Acute Pediatric Medical Care',
      city: 'New York',
      country: 'USA',
      status: 'active',
      plan: 'Enterprise Tier 1',
      customDomain: 'emr.stjudemed.org',
      cnameVerified: true,
      sslActive: true,
      avatar: 'hospital',
      createdAt: '2025-01-15',
      metrics: [
        { label: 'Licensed Beds', value: '650 Beds', subtext: '94% Occupancy' },
        { label: 'Registered Patients', value: '14,200', subtext: '+320 this week' },
        { label: 'Emergency Triage', value: '18 min avg', subtext: 'Door-to-Doctor' },
        { label: 'Active Doctors', value: '184 MDs', subtext: 'On-Call Matrix' },
      ],
      monthlyApiCalls: 1420000,
      apiCallQuota: 3000000,
      storageUsedGb: 340,
      storageQuotaGb: 800,
      enabledServices: ['hms'],
      apiKeysCount: 4,
      contactEmail: 'admin@stjudemed.org',
      technicalLead: 'Dr. Elena Rostova, Chief Medical Information Officer',
    },
    {
      id: 'mayo-health',
      categorySlug: 'hospitals',
      name: 'Mayo Global Health System',
      legalEntity: 'Mayo Unified Clinical Group',
      tagline: 'Multi-Specialty Research & Tertiary Care Hospital',
      city: 'Rochester',
      country: 'USA',
      status: 'active',
      plan: 'Enterprise Dedicated',
      customDomain: 'portal.mayoglobal.health',
      cnameVerified: true,
      sslActive: true,
      avatar: 'stethoscope',
      createdAt: '2024-11-10',
      metrics: [
        { label: 'Licensed Beds', value: '1,200 Beds', subtext: 'Full ICU/CCU' },
        { label: 'Registered Patients', value: '38,400', subtext: 'Global Referrals' },
        { label: 'IoT Vitals Devices', value: '1,450', subtext: 'Streaming telemetry' },
        { label: 'Active Doctors', value: '420 MDs', subtext: 'Board Certified' },
      ],
      monthlyApiCalls: 3850000,
      apiCallQuota: 6000000,
      storageUsedGb: 890,
      storageQuotaGb: 1500,
      enabledServices: ['hms'],
      apiKeysCount: 6,
      contactEmail: 'security@mayoglobal.health',
      technicalLead: 'Marcus Vance, VP of Health Technologies',
    },
    {
      id: 'apollo-city',
      categorySlug: 'hospitals',
      name: 'Apollo Super Speciality Hospital',
      legalEntity: 'Apollo Health Enterprises Ltd',
      tagline: 'Robotic Surgery & Cardiology Center of Excellence',
      city: 'Bengaluru',
      country: 'India',
      status: 'active',
      plan: 'Enterprise Tier 2',
      customDomain: 'telemetry.apollohealth.in',
      cnameVerified: true,
      sslActive: true,
      avatar: 'building',
      createdAt: '2025-02-01',
      metrics: [
        { label: 'Licensed Beds', value: '800 Beds', subtext: '88% Occupancy' },
        { label: 'Registered Patients', value: '22,100', subtext: 'Outpatient & IP' },
        { label: 'Pharmacy Throughput', value: '4,200/day', subtext: 'Automated Barcode' },
        { label: 'Active Doctors', value: '290 MDs', subtext: 'Specialists' },
      ],
      monthlyApiCalls: 2100000,
      apiCallQuota: 4000000,
      storageUsedGb: 510,
      storageQuotaGb: 1000,
      enabledServices: ['hms'],
      apiKeysCount: 3,
      contactEmail: 'infrastructure@apollohealth.in',
      technicalLead: 'Rajesh Kulkarni, Head of Cloud Infrastructure',
    },
    {
      id: 'mount-sinai',
      categorySlug: 'hospitals',
      name: 'Mount Sinai Regional Hospital',
      legalEntity: 'Mount Sinai Regional Care Alliance',
      tagline: 'Community Emergency and Maternal Healthcare',
      city: 'Chicago',
      country: 'USA',
      status: 'maintenance',
      plan: 'Growth Pro',
      customDomain: 'care.mountsinai-reg.org',
      cnameVerified: true,
      sslActive: true,
      avatar: 'hospital',
      createdAt: '2025-03-20',
      metrics: [
        { label: 'Licensed Beds', value: '420 Beds', subtext: 'Upgrading Wing B' },
        { label: 'Registered Patients', value: '9,800', subtext: 'Active Files' },
        { label: 'Ambulance Bays', value: '8 Units', subtext: 'GPS Dispatched' },
        { label: 'Active Doctors', value: '110 MDs', subtext: 'Shift Scheduled' },
      ],
      monthlyApiCalls: 780000,
      apiCallQuota: 1500000,
      storageUsedGb: 210,
      storageQuotaGb: 500,
      enabledServices: ['hms'],
      apiKeysCount: 2,
      contactEmail: 'tech@mountsinai-reg.org',
      technicalLead: 'Sarah Jenkins, Systems Architect',
    },
    {
      id: 'singapore-gen',
      categorySlug: 'hospitals',
      name: 'Singapore General Care Center',
      legalEntity: 'SGH Apex Health Group Pte',
      tagline: 'Smart Hospital IoT Telemetry & Oncology Care',
      city: 'Singapore',
      country: 'Singapore',
      status: 'active',
      plan: 'Enterprise Dedicated',
      customDomain: 'singaporegen.care.sg',
      cnameVerified: true,
      sslActive: true,
      avatar: 'shield',
      createdAt: '2024-12-05',
      metrics: [
        { label: 'Licensed Beds', value: '950 Beds', subtext: 'Automated Monitoring' },
        { label: 'Registered Patients', value: '31,500', subtext: 'Electronic MRN' },
        { label: 'Surgical Theatres', value: '24 OT Suites', subtext: 'Robotic Laparoscopy' },
        { label: 'Active Doctors', value: '340 MDs', subtext: 'Multilingual' },
      ],
      monthlyApiCalls: 2940000,
      apiCallQuota: 5000000,
      storageUsedGb: 720,
      storageQuotaGb: 1200,
      enabledServices: ['hms'],
      apiKeysCount: 5,
      contactEmail: 'contact@singaporegen.care.sg',
      technicalLead: 'Tan Wei Ming, Director of Biomedical Informatics',
    },
  ],
  restaurants: [
    {
      id: 'bella-italia',
      categorySlug: 'restaurants',
      name: 'Bella Italia Bistro & Trattoria Group',
      legalEntity: 'Bella Italia Hospitality SpA',
      tagline: 'Artisanal Neapolitan Woodfired Pizza & Pasta Trattorias',
      city: 'Rome',
      country: 'Italy',
      status: 'active',
      plan: 'Enterprise',
      customDomain: 'pos.bellaitaliagroup.it',
      cnameVerified: true,
      sslActive: true,
      avatar: 'utensils',
      createdAt: '2024-10-18',
      metrics: [
        { label: 'Active Outlets', value: '14 Locations', subtext: 'Rome, Milan, Florence' },
        { label: 'Daily Covers', value: '3,200 Guests', subtext: 'Peak Friday 4,800' },
        { label: 'Kitchen KDS Stations', value: '42 Screens', subtext: 'Station Firing' },
        { label: 'Order-to-Table', value: '12 min', subtext: 'Woodfire Line' },
      ],
      monthlyApiCalls: 1650000,
      apiCallQuota: 3000000,
      storageUsedGb: 120,
      storageQuotaGb: 300,
      enabledServices: ['restaurant'],
      apiKeysCount: 3,
      contactEmail: 'ops@bellaitaliagroup.it',
      technicalLead: 'Matteo Rossi, Head of IT Infrastructure',
    },
    {
      id: 'kanto-ramen',
      categorySlug: 'restaurants',
      name: 'Kanto Ramen & Izakaya Labs',
      legalEntity: 'Kanto Culinary Creations GK',
      tagline: 'Craft Tonkotsu Ramen, Yakitori & Japanese Highballs',
      city: 'Tokyo',
      country: 'Japan',
      status: 'active',
      plan: 'Growth Pro',
      customDomain: 'kds.kantoramen.jp',
      cnameVerified: true,
      sslActive: true,
      avatar: 'flame',
      createdAt: '2025-01-08',
      metrics: [
        { label: 'Active Outlets', value: '8 Locations', subtext: 'Tokyo Metropolitan' },
        { label: 'Daily Covers', value: '2,400 Guests', subtext: 'Automated Ticket Kiosks' },
        { label: 'Table Turnover', value: '28 min', subtext: 'Rapid Dining' },
        { label: 'Batch Broth Prep', value: '1,800 Liters', subtext: 'Tracked in Inventory' },
      ],
      monthlyApiCalls: 940000,
      apiCallQuota: 2000000,
      storageUsedGb: 75,
      storageQuotaGb: 200,
      enabledServices: ['restaurant'],
      apiKeysCount: 2,
      contactEmail: 'tech@kantoramen.jp',
      technicalLead: 'Kenji Takahashi, Systems Engineer',
    },
    {
      id: 'smoked-bbq',
      categorySlug: 'restaurants',
      name: 'Smoked & Cured BBQ Smokehouse',
      legalEntity: 'Smoked Pitmasters LLC',
      tagline: 'Texas Craft Brisket, Ribs & Craft Beer Smokehouse',
      city: 'Dallas',
      country: 'USA',
      status: 'active',
      plan: 'Growth Pro',
      customDomain: 'order.smokedcuredbbq.com',
      cnameVerified: true,
      sslActive: true,
      avatar: 'utensils',
      createdAt: '2025-02-28',
      metrics: [
        { label: 'Active Outlets', value: '4 Smokehouse Hubs', subtext: 'Austin, Dallas, Houston' },
        { label: 'Daily Covers', value: '1,500 Guests', subtext: 'Sell-Out by 3 PM' },
        { label: 'Meat Temperature IoT', value: '16 Probes', subtext: 'Continuous Pit Telemetry' },
        { label: 'Catering Orders', value: '$85K/mo', subtext: 'Corporate & Weddings' },
      ],
      monthlyApiCalls: 520000,
      apiCallQuota: 1200000,
      storageUsedGb: 48,
      storageQuotaGb: 150,
      enabledServices: ['restaurant'],
      apiKeysCount: 2,
      contactEmail: 'bbq@smokedcuredbbq.com',
      technicalLead: 'Hank Taylor, Founder & General Manager',
    },
  ],
};

// ───────────────────────────────────────────────
// PLATFORM & SERVICE API KEYS
// ───────────────────────────────────────────────
export const INITIAL_API_KEYS: ApiKeyItem[] = [
  {
    id: 'key-root-01',
    name: 'Universal Root Service Orchestrator',
    keyPrefix: 'orb_live_root_',
    maskedKey: 'orb_live_root_••••••••••••••••••••••••demo',
    rawKey: 'orb_live_root_mock_demo_orchestrator_token_01',
    serviceId: 'all',
    serviceName: 'Platform Universal Root',
    environment: 'production',
    scopes: ['*'],
    createdAt: '2025-01-01',
    lastUsedAt: 'Just now',
    status: 'active',
    rateLimitPerMin: 10000,
    requestsLast30Days: 14280000,
  },
  {
    id: 'key-hms-01',
    name: 'St. Jude Clinical EMR Bridge',
    keyPrefix: 'orb_live_hms_',
    maskedKey: 'orb_live_hms_••••••••••••••••••••••••demo',
    rawKey: 'orb_live_hms_mock_demo_st_jude_token_01',
    serviceId: 'hms',
    serviceName: 'Hospital Management (HMS)',
    providerId: 'st-jude',
    providerName: 'St. Jude Metropolitan Medical Center',
    environment: 'production',
    scopes: ['hms.patients.read', 'hms.triage.execute', 'hms.beds.allocate'],
    createdAt: '2025-01-16',
    lastUsedAt: '2 mins ago',
    status: 'active',
    rateLimitPerMin: 2000,
    requestsLast30Days: 1420000,
  },
  {
    id: 'key-hms-02',
    name: 'Mayo Health IoT Telemetry Ingest',
    keyPrefix: 'orb_live_hms_',
    maskedKey: 'orb_live_hms_••••••••••••••••••••••••demo',
    rawKey: 'orb_live_hms_mock_demo_mayo_health_token_02',
    serviceId: 'hms',
    serviceName: 'Hospital Management (HMS)',
    providerId: 'mayo-health',
    providerName: 'Mayo Global Health System',
    environment: 'production',
    scopes: ['hms.telemetry.stream', 'hms.patients.read'],
    createdAt: '2024-11-15',
    lastUsedAt: '1 min ago',
    status: 'active',
    rateLimitPerMin: 5000,
    requestsLast30Days: 3850000,
  },
  {
    id: 'key-rest-01',
    name: 'Bella Italia Kitchen KDS Screen Feeds',
    keyPrefix: 'orb_live_rst_',
    maskedKey: 'orb_live_rst_••••••••••••••••••••••••demo',
    rawKey: 'orb_live_rst_mock_demo_bella_italia_token_01',
    serviceId: 'restaurant',
    serviceName: 'Restaurant & Kitchen OS',
    providerId: 'bella-italia',
    providerName: 'Bella Italia Bistro & Trattoria Group',
    environment: 'production',
    scopes: ['restaurant.orders.kds', 'restaurant.tables.reserve'],
    createdAt: '2024-10-20',
    lastUsedAt: '4 mins ago',
    status: 'active',
    rateLimitPerMin: 1500,
    requestsLast30Days: 1650000,
  },
  {
    id: 'key-dev-sandbox',
    name: 'Staging QA & Automation Testing Key',
    keyPrefix: 'orb_test_dev_',
    maskedKey: 'orb_test_dev_0000********************9999',
    rawKey: 'orb_test_dev_0000112233445566778899009999',
    serviceId: 'all',
    serviceName: 'All Services (Sandbox)',
    environment: 'sandbox',
    scopes: ['*'],
    createdAt: '2025-02-01',
    lastUsedAt: '4 hours ago',
    status: 'active',
    rateLimitPerMin: 500,
    requestsLast30Days: 85000,
  },
  {
    id: 'key-legacy-revoked',
    name: 'Old Mount Sinai Legacy V1 Connector',
    keyPrefix: 'orb_live_hms_',
    maskedKey: 'orb_live_hms_••••••••••••••••••••••••demo',
    rawKey: 'orb_live_hms_mock_demo_legacy_revoked_token_01',
    serviceId: 'hms',
    serviceName: 'Hospital Management (HMS)',
    providerId: 'mount-sinai',
    providerName: 'Mount Sinai Regional Hospital',
    environment: 'production',
    scopes: ['hms.patients.read'],
    createdAt: '2024-06-12',
    lastUsedAt: '3 months ago',
    status: 'revoked',
    rateLimitPerMin: 0,
    requestsLast30Days: 0,
  },
  {
    id: 'key-omni-01',
    name: 'OmniDeliver Global O2O2B2B2C Master Key',
    keyPrefix: 'orb_live_omni_',
    maskedKey: 'orb_live_omni_••••••••••••••••••••••••demo',
    rawKey: 'orb_live_omni_mock_demo_omnideliver_master_01',
    serviceId: 'all',
    serviceName: 'All Subscribed Microservices (RestaurantOS)',
    providerId: 'proj-omnideliver',
    providerName: 'OmniDeliver Global Network',
    environment: 'production',
    scopes: ['*'],
    createdAt: '2025-01-10',
    lastUsedAt: 'Just now',
    status: 'active',
    rateLimitPerMin: 10000,
    requestsLast30Days: 42800000,
  },
  {
    id: 'key-mednet-01',
    name: 'MedNet Health Alliance Core Clinical Key',
    keyPrefix: 'orb_live_mednet_',
    maskedKey: 'orb_live_mednet_••••••••••••••••••••••••demo',
    rawKey: 'orb_live_mednet_mock_demo_mednet_alliance_01',
    serviceId: 'all',
    serviceName: 'Healthcare Network (HospitalOS HMS)',
    providerId: 'proj-mednet',
    providerName: 'MedNet Health Alliance',
    environment: 'production',
    scopes: ['*'],
    createdAt: '2024-11-22',
    lastUsedAt: '2 mins ago',
    status: 'active',
    rateLimitPerMin: 4500,
    requestsLast30Days: 18400000,
  },
];

// ───────────────────────────────────────────────
// PLATFORM QUOTA CONSUMPTION METRICS
// ───────────────────────────────────────────────
export const PLATFORM_QUOTAS: PlatformQuotaMetric[] = [
  {
    id: 'quota-calls',
    name: 'Total API Calls (Current Cycle)',
    icon: 'zap',
    used: 18450000,
    limit: 50000000,
    unit: 'calls',
    percentage: 36.9,
    trend: '+14.2% vs last month',
    trendUp: true,
    status: 'healthy',
  },
  {
    id: 'quota-storage',
    name: 'Multi-Tenant Encrypted Storage',
    icon: 'storage',
    used: 3.2,
    limit: 10.0,
    unit: 'TB',
    percentage: 32.0,
    trend: '+0.4 TB this cycle',
    trendUp: true,
    status: 'healthy',
  },
  {
    id: 'quota-tenants',
    name: 'Provisioned Business Tenants',
    icon: 'building',
    used: 18,
    limit: 50,
    unit: 'tenants',
    percentage: 36.0,
    trend: '+3 new onboarded',
    trendUp: true,
    status: 'healthy',
  },
  {
    id: 'quota-websockets',
    name: 'Concurrent Telemetry WebSockets',
    icon: 'activity',
    used: 4820,
    limit: 10000,
    unit: 'conns',
    percentage: 48.2,
    trend: 'Peak 6,400 during triage surge',
    trendUp: true,
    status: 'healthy',
  },
  {
    id: 'quota-webhooks',
    name: 'Outbound Webhook Dispatches',
    icon: 'quota',
    used: 89400,
    limit: 250000,
    unit: 'events',
    percentage: 35.8,
    trend: '99.98% delivery success',
    trendUp: true,
    status: 'healthy',
  },
  {
    id: 'quota-ai-tokens',
    name: 'Copilot AI Ingest & Reasoning Tokens',
    icon: 'cpu',
    used: 12400000,
    limit: 30000000,
    unit: 'tokens',
    percentage: 41.3,
    trend: 'HMS Clinical Triage Copilot 62%',
    trendUp: true,
    status: 'healthy',
  },
];

// ───────────────────────────────────────────────
// SYSTEM NODES & FACADES STATUS (TELEMETRY)
// ───────────────────────────────────────────────
export const SYSTEM_NODES: SystemNodeHealth[] = [
  {
    id: 'node-us-east',
    region: 'us-east-1',
    location: 'North Virginia, USA',
    status: 'operational',
    latencyMs: 11,
    cpuLoad: 28.4,
    memoryUsagePercent: 42.1,
    activeSockets: 2150,
  },
  {
    id: 'node-eu-west',
    region: 'eu-west-1',
    location: 'Frankfurt, Germany',
    status: 'operational',
    latencyMs: 14,
    cpuLoad: 31.8,
    memoryUsagePercent: 46.5,
    activeSockets: 1680,
  },
  {
    id: 'node-ap-south',
    region: 'ap-southeast-1',
    location: 'Singapore Hub',
    status: 'operational',
    latencyMs: 19,
    cpuLoad: 24.2,
    memoryUsagePercent: 38.0,
    activeSockets: 990,
  },
];

export const SYSTEM_FACADES: FacadeStatus[] = [
  { name: 'SecurityFacade', description: 'Ed25519 signature enforcement, key rotation, zero-trust token isolation', antiTamperFrozen: true, activeHooks: 8, status: 'healthy' },
  { name: 'AuditFacade', description: 'Tamper-evident append-only ledger for all tenant mutations', antiTamperFrozen: true, activeHooks: 12, status: 'healthy' },
  { name: 'EventsFacade', description: 'Cross-plugin reactive event bus with backpressure queues', antiTamperFrozen: true, activeHooks: 34, status: 'healthy' },
  { name: 'ContextFacade', description: 'AsyncLocalStorage zero-drill active tenant resolver', antiTamperFrozen: true, activeHooks: 6, status: 'healthy' },
  { name: 'AiFacade', description: 'Dynamic copilot neural inference bridge and embeddings', antiTamperFrozen: true, activeHooks: 4, status: 'healthy' },
  { name: 'FeaturesFacade', description: 'Tenant-scoped feature toggles and gradual rollouts', antiTamperFrozen: true, activeHooks: 15, status: 'healthy' },
  { name: 'WorkflowsFacade', description: 'n8n automation webhook triggers and state orchestration', antiTamperFrozen: true, activeHooks: 9, status: 'healthy' },
  { name: 'BillingFacade', description: 'Stripe webhook listener, tier meter, and quota enforcement', antiTamperFrozen: true, activeHooks: 11, status: 'healthy' },
  { name: 'DbFacade', description: 'Multi-tenant scoped Prisma client with row-level tenant isolation', antiTamperFrozen: true, activeHooks: 18, status: 'healthy' },
];

export function getProviderDnsInfo(provider: BusinessProvider): DnsDiagnosticInfo {
  return (
    provider.dnsDiagnostics || {
      cnameTarget: 'cname.edge.orbitox.io',
      cnameStatus: provider.cnameVerified ? 'verified' : 'pending',
      sslIssuer: "Let's Encrypt Authority X3 (Wildcard)",
      sslExpiresDays: 78,
      edgeLatencyMs: 14,
      tlsVersion: 'TLS 1.3 / ChaCha20-Poly1305',
      anycastIp: '76.76.21.21 (Anycast Global CDN)',
    }
  );
}

export function getProviderLiveRecords(provider: BusinessProvider): LiveRecordItem[] {
  if (provider.liveRecords && provider.liveRecords.length > 0) {
    return provider.liveRecords;
  }

  if (provider.categorySlug === 'hospitals') {
    return [
      {
        id: 'rec-h1',
        title: 'Emergency Triage Escalation — Patient #MRN-84920',
        badge: 'ICU Triage Level 1',
        badgeType: 'danger',
        details: 'Admitted to Acute Cardiac Care Unit (Ward 4B). SpO2: 92%, BP: 145/95 mmHg. Attending: Dr. Elena Rostova.',
        timestamp: '2 mins ago',
        extraMeta: { Room: 'ICU-04', Physician: 'Dr. Rostova', Protocol: 'STEMI Rapid Firing' },
      },
      {
        id: 'rec-h2',
        title: 'IoT Telemetry Biometrics Synced — Ward 3 Telemetry Grid',
        badge: 'Streaming Live',
        badgeType: 'success',
        details: '18 continuous ECG/pulse oximeter devices transmitting via WebSockets to central monitoring station.',
        timestamp: '4 mins ago',
        extraMeta: { Frequency: '250 Hz', PacketLoss: '0.001%', Latency: '8ms' },
      },
      {
        id: 'rec-h3',
        title: 'Pharmacy Automated Drug Dispensation',
        badge: 'Rx Verified',
        badgeType: 'info',
        details: 'Automated dispensing unit released IV Piperacillin/Tazobactam 4.5g. Double-verified by barcode scan.',
        timestamp: '11 mins ago',
        extraMeta: { Pharmacist: 'Staff Pharm. Lee', Drawer: 'Pyxis Unit B' },
      },
      {
        id: 'rec-h4',
        title: 'Electronic Health Record Mutated',
        badge: 'Audit Signed',
        badgeType: 'success',
        details: 'Ed25519 tamper-proof audit record appended for surgical consent form #SC-8921.',
        timestamp: '24 mins ago',
        extraMeta: { Signer: 'Dr. Marcus Vance', Hash: 'ed25519:7a8b...19ef' },
      },
    ];
  }

  if (provider.categorySlug === 'restaurants') {
    return [
      {
        id: 'rec-r1',
        title: 'Kitchen Ticket Fired to Station 2 (Woodfire Pizza)',
        badge: 'Station Fired',
        badgeType: 'warning',
        details: 'Table #8: 2x Pizza Diavola, 1x Truffle Tagliolini, 1x Chianti Classico. Prep timer started.',
        timestamp: 'Just now',
        extraMeta: { Table: 'Table 8', Server: 'Marco R.', Station: 'Woodfire Line' },
      },
      {
        id: 'rec-r2',
        title: 'Table Floor Matrix Mutation',
        badge: 'Table Seated',
        badgeType: 'success',
        details: 'Table #14 (Cover 6) marked occupied. Digital QR ordering session initialized.',
        timestamp: '7 mins ago',
        extraMeta: { Session: 'sess_table_14_qr', Covers: '6 Guests' },
      },
      {
        id: 'rec-r3',
        title: 'Point-of-Sale Register Drawer Batch Closed',
        badge: 'Audit Reconciled',
        badgeType: 'info',
        details: 'Till 1 shift reconciliation completed: €1,840.00 cash + €4,250.00 contactless matched.',
        timestamp: '1 hour ago',
        extraMeta: { Cashier: 'Elena B.', Variance: '€0.00' },
      },
    ];
  }

  return [
    {
      id: 'rec-g1',
      title: `${provider.name} Operating Session Sync`,
      badge: 'Active & Verified',
      badgeType: 'success',
      details: `Zero-trust multi-tenant context verified for domain ${provider.customDomain}. Current latency: 12ms.`,
      timestamp: '3 mins ago',
      extraMeta: { Domain: provider.customDomain, Tier: provider.plan },
    },
    {
      id: 'rec-g2',
      title: 'Automated Quota & Rate Limit Tick',
      badge: 'Within Limits',
      badgeType: 'info',
      details: `${provider.monthlyApiCalls.toLocaleString()} requests logged this cycle out of ${provider.apiCallQuota.toLocaleString()} allocated.`,
      timestamp: '15 mins ago',
      extraMeta: { Utilization: `${Math.round((provider.monthlyApiCalls / provider.apiCallQuota) * 100)}%` },
    },
  ];
}

// ───────────────────────────────────────────────
// CLIENT PROJECTS & O2O2B2B2C ECOSYSTEM DATA MODEL
// ───────────────────────────────────────────────

export type BusinessModelType =
  | 'O2O2B2B2C'
  | 'B2B2C'
  | 'B2B_SaaS'
  | 'D2C'
  | 'HEALTHCARE_NETWORK'
  | 'FRANCHISE_RETAIL';

export interface PlanTierPreset {
  id: 'starter' | 'growth' | 'pro' | 'enterprise' | 'hyperscale';
  name: string;
  monthlyFee: string;
  defaultCallQuota: number;
  defaultRateLimitPerMin: number;
  defaultStorageQuotaGb: number;
  maxPlugins: number;
  highlightFeatures: string[];
}

export const PLAN_TIER_PRESETS: Record<string, PlanTierPreset> = {
  starter: {
    id: 'starter',
    name: 'Developer Sandbox',
    monthlyFee: '$0 / mo',
    defaultCallQuota: 100000,
    defaultRateLimitPerMin: 120,
    defaultStorageQuotaGb: 10,
    maxPlugins: 2,
    highlightFeatures: ['Community Support', 'Sandbox SSL', 'Standard Latency'],
  },
  growth: {
    id: 'growth',
    name: 'Growth Startup',
    monthlyFee: '$490 / mo',
    defaultCallQuota: 1000000,
    defaultRateLimitPerMin: 600,
    defaultStorageQuotaGb: 100,
    maxPlugins: 4,
    highlightFeatures: ['Wildcard Subdomains', 'Custom CNAME', 'Daily Audit Logs', 'Webhook Dispatch'],
  },
  pro: {
    id: 'pro',
    name: 'Pro Scale',
    monthlyFee: '$1,450 / mo',
    defaultCallQuota: 5000000,
    defaultRateLimitPerMin: 1800,
    defaultStorageQuotaGb: 500,
    maxPlugins: 7,
    highlightFeatures: ['99.95% SLA', 'Cryptographic Signatures', 'Multi-Region Routing', 'Priority Rate Limits'],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Dedicated',
    monthlyFee: '$4,200 / mo',
    defaultCallQuota: 25000000,
    defaultRateLimitPerMin: 5000,
    defaultStorageQuotaGb: 2000,
    maxPlugins: 9,
    highlightFeatures: ['Dedicated Hardware Isolated Facades', 'Ed25519 Custom Keys', 'Real-Time Telemetry Socket', '24/7 Phone SLA'],
  },
  hyperscale: {
    id: 'hyperscale',
    name: 'HyperScale O2O2B2B2C Custom',
    monthlyFee: '$9,800 / mo',
    defaultCallQuota: 100000000,
    defaultRateLimitPerMin: 12000,
    defaultStorageQuotaGb: 10000,
    maxPlugins: 9,
    highlightFeatures: ['Unlimited O2O2B2B2C Multi-Tier Routing', 'Zero-Latency Edge RAM Cache', 'Custom Domain Cluster', 'Dedicated Architect'],
  },
};

export interface ClientProject {
  id: string;
  name: string;
  slug: string;
  organization: string;
  businessModel: BusinessModelType;
  businessModelLabel: string;
  description: string;
  plan: 'starter' | 'growth' | 'pro' | 'enterprise' | 'hyperscale';
  planLabel: string;
  status: 'active' | 'throttled' | 'suspended';
  customDomain?: string;
  primaryApiKeyId?: string;
  primaryApiKeyPrefix?: string;
  enabledServices: string[]; // e.g. ['commerce', 'restaurant', 'pos', 'crm']
  monthlyApiCalls: number;
  apiCallQuota: number;
  rateLimitPerMin: number;
  storageUsedGb: number;
  storageQuotaGb: number;
  features: string[];
  contactEmail: string;
  technicalLead: string;
  createdAt: string;
  lastActiveAt: string;
  recentLatencyMs: number;
}

export const INITIAL_CLIENT_PROJECTS: ClientProject[] = [
  {
    id: 'proj-omnideliver',
    name: 'OmniDeliver Global Network',
    slug: 'omnideliver',
    organization: 'OmniLogistics Platform Corp',
    businessModel: 'O2O2B2B2C',
    businessModelLabel: 'O2O2B2B2C (Kitchen-to-Merchant-to-Consumer)',
    description: 'High-speed Online-to-Offline delivery network orchestrating restaurant kitchen prep lines, in-store POS register checkouts, merchant CRM accounts, and consumer mobile apps.',
    plan: 'hyperscale',
    planLabel: 'HyperScale O2O2B2B2C Custom',
    status: 'active',
    customDomain: 'api.omnideliver.global',
    primaryApiKeyId: 'key-omni-01',
    primaryApiKeyPrefix: 'orb_live_omni_',
      enabledServices: ['restaurant'],
    monthlyApiCalls: 42800000,
    apiCallQuota: 100000000,
    rateLimitPerMin: 10000,
    storageUsedGb: 1840,
    storageQuotaGb: 10000,
    features: ['o2o_kitchen_routing', 'dine_qr_sessions', 'realtime_kds', 'webhook_dispatches'],
    contactEmail: 'platform@omnideliver.global',
    technicalLead: 'Sophia Martinez, VP of Core Infrastructure',
    createdAt: '2025-01-10',
    lastActiveAt: 'Just now',
    recentLatencyMs: 14,
  },
  {
    id: 'proj-mednet',
    name: 'MedNet Health Alliance',
    slug: 'mednet-health',
    organization: 'MedNet Regional Healthcare Trust',
    businessModel: 'HEALTHCARE_NETWORK',
    businessModelLabel: 'B2B Enterprise Healthcare Network',
    description: 'Multi-hospital clinical matrix connecting emergency triage bays, ward bed reservations, clinical labs, and electronic health records.',
    plan: 'enterprise',
    planLabel: 'Enterprise Dedicated',
    status: 'active',
    customDomain: 'api.mednet-health.org',
    primaryApiKeyId: 'key-mednet-01',
    primaryApiKeyPrefix: 'orb_live_mednet_',
      enabledServices: ['hms'],
    monthlyApiCalls: 18400000,
    apiCallQuota: 25000000,
    rateLimitPerMin: 4500,
    storageUsedGb: 1250,
    storageQuotaGb: 2000,
    features: ['triage_level_state_machine', 'bed_ward_matrix', 'telemetry_stream', 'phi_deep_encryption'],
    contactEmail: 'security@mednet-health.org',
    technicalLead: 'Dr. Michael Chen, Chief Information Officer',
    createdAt: '2024-11-22',
    lastActiveAt: '2 mins ago',
    recentLatencyMs: 11,
  },
];

