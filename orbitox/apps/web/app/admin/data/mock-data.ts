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
    id: 'commerce',
    name: 'Commerce & Store Engine',
    packageName: '@orbitox/commerce',
    category: 'ecommerce',
    version: '1.0.0',
    status: 'active',
    description: 'Headless multi-tenant checkout, catalog engine, product variants, live storefront builder, and order orchestration.',
    icon: 'ecommerce',
    badgeColor: '#A855F7',
    latencyMs: 18,
    uptimePercent: 99.98,
    activeTenants: 19,
    monthlyApiCalls: 9140000,
    apiCallLimit: 20000000,
    storageMb: 850000,
    storageLimitMb: 2000000,
    author: 'OrbitoX Commerce Division',
    permissions: [
      { code: 'commerce.catalog.manage', description: 'Create and update products & variant matrices', riskLevel: 'medium' },
      { code: 'commerce.orders.fulfill', description: 'Process order lifecycle & inventory deduping', riskLevel: 'high' },
      { code: 'commerce.payments.charge', description: 'Execute zero-trust payment processor tokens', riskLevel: 'critical' },
      { code: 'commerce.builder.theme', description: 'Deploy live storefront aesthetic changes', riskLevel: 'low' },
    ],
    endpoints: [
      { method: 'GET', path: '/api/v1/commerce/products', desc: 'Query catalog items' },
      { method: 'POST', path: '/api/v1/commerce/checkout/initiate', desc: 'Begin secure checkout flow' },
      { method: 'POST', path: '/api/v1/commerce/orders/fulfill', desc: 'Transition order to fulfilled' },
    ],
  },
  {
    id: 'crm',
    name: 'CRM & Sales Pipeline',
    packageName: '@orbitox/crm',
    category: 'sales',
    version: '1.0.1',
    status: 'active',
    description: 'Headless lead scoring, zero-leak deal pipeline, contact intelligence, and automated sales outreach sequences.',
    icon: 'sales',
    badgeColor: '#3B82F6',
    latencyMs: 12,
    uptimePercent: 99.95,
    activeTenants: 26,
    monthlyApiCalls: 3200000,
    apiCallLimit: 8000000,
    storageMb: 210000,
    storageLimitMb: 500000,
    author: 'OrbitoX Platform Core',
    permissions: [
      { code: 'crm.leads.read', description: 'View customer contacts and sales pipeline stages', riskLevel: 'medium' },
      { code: 'crm.leads.create', description: 'Ingest inbound opportunities from webforms', riskLevel: 'low' },
      { code: 'crm.deals.manage', description: 'Reassign deal stages, probabilities, and payouts', riskLevel: 'high' },
    ],
    endpoints: [
      { method: 'GET', path: '/api/v1/crm/leads', desc: 'Fetch paginated leads' },
      { method: 'POST', path: '/api/v1/crm/leads', desc: 'Create new prospect' },
      { method: 'PATCH', path: '/api/v1/crm/deals/:id/stage', desc: 'Update deal stage' },
    ],
  },
  {
    id: 'restaurant',
    name: 'Restaurant & Kitchen OS',
    packageName: '@orbitox/restaurant',
    category: 'restaurant',
    version: '1.0.0',
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
  {
    id: 'finance',
    name: 'Finance & Ledger Engine',
    packageName: '@orbitox/finance',
    category: 'finance',
    version: '1.0.0',
    status: 'active',
    description: 'Double-entry bookkeeping, automated multi-currency tax computation, automated invoicing, and audit trail ledger.',
    icon: 'finance',
    badgeColor: '#10B981',
    latencyMs: 22,
    uptimePercent: 99.99,
    activeTenants: 31,
    monthlyApiCalls: 4100000,
    apiCallLimit: 10000000,
    storageMb: 530000,
    storageLimitMb: 1200000,
    author: 'OrbitoX FinTech Group',
    permissions: [
      { code: 'finance.ledger.read', description: 'Access general ledger and balance sheets', riskLevel: 'high' },
      { code: 'finance.invoices.generate', description: 'Draft and emit legally compliant tax invoices', riskLevel: 'high' },
      { code: 'finance.tax.calculate', description: 'Compute jurisdictional VAT, GST, and sales tax', riskLevel: 'medium' },
    ],
    endpoints: [
      { method: 'GET', path: '/api/v1/finance/ledger', desc: 'Retrieve double-entry ledger' },
      { method: 'POST', path: '/api/v1/finance/invoices', desc: 'Generate customer invoice' },
      { method: 'POST', path: '/api/v1/finance/tax/estimate', desc: 'Calculate applicable taxes' },
    ],
  },
  {
    id: 'inventory',
    name: 'Inventory & Stock Logistics',
    packageName: '@orbitox/inventory',
    category: 'logistics',
    version: '1.0.0',
    status: 'active',
    description: 'Multi-warehouse stock balancing, barcode barcode SKU tracking, batch expiry, and automated reorder points.',
    icon: 'inventory',
    badgeColor: '#06B6D4',
    latencyMs: 15,
    uptimePercent: 99.96,
    activeTenants: 28,
    monthlyApiCalls: 3800000,
    apiCallLimit: 8000000,
    storageMb: 310000,
    storageLimitMb: 600000,
    author: 'OrbitoX Supply Chain Ops',
    permissions: [
      { code: 'inventory.stock.adjust', description: 'Mutate physical inventory counts and write-offs', riskLevel: 'high' },
      { code: 'inventory.warehouses.manage', description: 'Configure bin locations and distribution hubs', riskLevel: 'medium' },
      { code: 'inventory.reorder.automate', description: 'Trigger automatic POs to suppliers', riskLevel: 'medium' },
    ],
    endpoints: [
      { method: 'GET', path: '/api/v1/inventory/items', desc: 'List inventory SKU levels' },
      { method: 'POST', path: '/api/v1/inventory/stock/adjust', desc: 'Log stock adjustment' },
      { method: 'GET', path: '/api/v1/inventory/warehouses', desc: 'Fetch multi-warehouse nodes' },
    ],
  },
  {
    id: 'hrms',
    name: 'HRMS & Workforce Suite',
    packageName: '@orbitox/hrms',
    category: 'hr',
    version: '1.0.0',
    status: 'active',
    description: 'Employee lifecycle, digital onboarding checklists, PTO approval chains, payroll integrations, and organizational hierarchy.',
    icon: 'hr',
    badgeColor: '#8B5CF6',
    latencyMs: 17,
    uptimePercent: 99.94,
    activeTenants: 22,
    monthlyApiCalls: 1850000,
    apiCallLimit: 5000000,
    storageMb: 190000,
    storageLimitMb: 400000,
    author: 'OrbitoX People Labs',
    permissions: [
      { code: 'hrms.employees.manage', description: 'Create employee contracts and salary bands', riskLevel: 'critical' },
      { code: 'hrms.leave.approve', description: 'Authorize statutory and vacation leaves', riskLevel: 'low' },
      { code: 'hrms.payroll.process', description: 'Generate monthly bank payout batches', riskLevel: 'critical' },
    ],
    endpoints: [
      { method: 'GET', path: '/api/v1/hrms/employees', desc: 'Directory of staff' },
      { method: 'POST', path: '/api/v1/hrms/leave/requests', desc: 'Submit leave request' },
      { method: 'POST', path: '/api/v1/hrms/payroll/run', desc: 'Execute payroll computation' },
    ],
  },
  {
    id: 'school',
    name: 'School & Campus OS',
    packageName: '@orbitox/school',
    category: 'education',
    version: '1.0.0',
    status: 'active',
    description: 'Student registration, course grading rubrics, attendance monitoring, parent portal, and academic credentials verification.',
    icon: 'education',
    badgeColor: '#6366F1',
    latencyMs: 14,
    uptimePercent: 99.98,
    activeTenants: 11,
    monthlyApiCalls: 1600000,
    apiCallLimit: 4000000,
    storageMb: 290000,
    storageLimitMb: 600000,
    author: 'OrbitoX Academy Network',
    permissions: [
      { code: 'school.students.enroll', description: 'Enroll students and generate academic IDs', riskLevel: 'medium' },
      { code: 'school.courses.publish', description: 'Publish curriculum, schedules, and credits', riskLevel: 'low' },
      { code: 'school.attendance.track', description: 'Record student attendance and absentee alerts', riskLevel: 'low' },
    ],
    endpoints: [
      { method: 'GET', path: '/api/v1/school/students', desc: 'Query enrolled students' },
      { method: 'POST', path: '/api/v1/school/attendance/log', desc: 'Record daily attendance' },
      { method: 'GET', path: '/api/v1/school/courses', desc: 'Course syllabus and roster' },
    ],
  },
  {
    id: 'pos',
    name: 'Point of Sale (Omnichannel)',
    packageName: '@orbitox/pos',
    category: 'retail',
    version: '1.0.0',
    status: 'active',
    description: 'High-throughput checkout register, offline barcode scanning, receipt printers, and unified credit card terminal integration.',
    icon: 'pos',
    badgeColor: '#14B8A6',
    latencyMs: 9,
    uptimePercent: 99.99,
    activeTenants: 24,
    monthlyApiCalls: 4900000,
    apiCallLimit: 12000000,
    storageMb: 240000,
    storageLimitMb: 500000,
    author: 'OrbitoX Retail Hardware Lab',
    permissions: [
      { code: 'pos.checkout.process', description: 'Perform immediate cash/card sales', riskLevel: 'high' },
      { code: 'pos.terminal.sync', description: 'Synchronize offline drawer sessions', riskLevel: 'medium' },
      { code: 'pos.receipts.generate', description: 'Print electronic & thermal paper receipts', riskLevel: 'low' },
    ],
    endpoints: [
      { method: 'POST', path: '/api/v1/pos/orders/checkout', desc: 'Process register checkout' },
      { method: 'POST', path: '/api/v1/pos/drawer/open', desc: 'Trigger cash drawer opening' },
      { method: 'GET', path: '/api/v1/pos/sync/status', desc: 'Query offline sync queue' },
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
    activeServices: ['hms', 'inventory', 'finance', 'crm', 'hrms'],
    totalApiCalls: '11.09M',
    totalActiveUsers: '116,000 Patients',
    description: 'High-compliance medical centers running OrbitoX HMS for clinical triage, pharmacy dispense, bed telemetry, and zero-leak health records.',
  },
  {
    id: 'cat-ecommerce',
    slug: 'ecommerce',
    title: 'E-Commerce & Global Brands',
    subtitle: 'Omnichannel Storefronts, Catalogs & Checkout Engines',
    icon: 'ecommerce',
    color: '#A855F7',
    gradient: 'linear-gradient(135deg, rgba(168,85,247,0.2) 0%, rgba(99,102,241,0.1) 100%)',
    providerCount: 4,
    activeServices: ['commerce', 'inventory', 'crm', 'finance', 'pos'],
    totalApiCalls: '8.87M',
    totalActiveUsers: '270,300 Shoppers',
    description: 'Luxury brands, multi-warehouse consumer goods, and rapid checkout direct-to-consumer storefronts powered by OrbitoX Commerce.',
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
    activeServices: ['restaurant', 'pos', 'inventory', 'finance'],
    totalApiCalls: '3.11M',
    totalActiveUsers: '7,100 Daily Covers',
    description: 'Bistros, franchise chains, and multi-station cloud kitchens running high-speed KDS firing orders directly to prep lines.',
  },
  {
    id: 'cat-education',
    slug: 'education',
    title: 'Schools & Global Academies',
    subtitle: 'Student Registers, Academic Grading & LMS Portals',
    icon: 'education',
    color: '#6366F1',
    gradient: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(56,189,248,0.1) 100%)',
    providerCount: 3,
    activeServices: ['school', 'finance', 'hrms', 'crm'],
    totalApiCalls: '4.17M',
    totalActiveUsers: '34,100 Students',
    description: 'University campuses and private educational institutes automating enrollment, credential verification, and tuition invoicing.',
  },
  {
    id: 'cat-retail',
    slug: 'retail',
    title: 'Retail Stores & Supermarkets',
    subtitle: 'Omnichannel POS Terminals, Multi-Lane Drawers & Barcode Sync',
    icon: 'retail',
    color: '#14B8A6',
    gradient: 'linear-gradient(135deg, rgba(20,184,166,0.2) 0%, rgba(16,185,129,0.1) 100%)',
    providerCount: 3,
    activeServices: ['pos', 'inventory', 'finance', 'commerce'],
    totalApiCalls: '4.99M',
    totalActiveUsers: '383 POS Registers',
    description: 'Physical supermarket chains and luxury boutiques requiring offline-capable high-speed cash register and barcode checkout.',
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
      enabledServices: ['hms', 'inventory', 'finance', 'crm'],
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
      enabledServices: ['hms', 'inventory', 'finance', 'crm', 'hrms'],
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
      enabledServices: ['hms', 'inventory', 'crm'],
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
      enabledServices: ['hms', 'finance'],
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
      enabledServices: ['hms', 'inventory', 'finance', 'crm'],
      apiKeysCount: 5,
      contactEmail: 'contact@singaporegen.care.sg',
      technicalLead: 'Tan Wei Ming, Director of Biomedical Informatics',
    },
  ],
  ecommerce: [
    {
      id: 'aura-luxury',
      categorySlug: 'ecommerce',
      name: 'Aura Luxury Fashion & Jewels',
      legalEntity: 'Aura Maison de Mode SAS',
      tagline: 'Haute Couture, Rare Gems & Global Concierge',
      city: 'Paris',
      country: 'France',
      status: 'active',
      plan: 'Enterprise Scale',
      customDomain: 'shop.auraluxury.fr',
      cnameVerified: true,
      sslActive: true,
      avatar: 'gem',
      createdAt: '2024-09-12',
      metrics: [
        { label: 'Monthly Orders', value: '128,400', subtext: '+18% MoM growth' },
        { label: 'Monthly Revenue', value: '$4.20M', subtext: 'Average Order $380' },
        { label: 'Storefront Latency', value: '24 ms', subtext: 'Edge SSR' },
        { label: 'Active SKUs', value: '12,500', subtext: 'Live in 14 Currencies' },
      ],
      monthlyApiCalls: 4800000,
      apiCallQuota: 8000000,
      storageUsedGb: 410,
      storageQuotaGb: 800,
      enabledServices: ['commerce', 'inventory', 'crm', 'finance'],
      apiKeysCount: 4,
      contactEmail: 'tech@auraluxury.fr',
      technicalLead: 'Jean-Luc Moreau, Head of Digital Architecture',
    },
    {
      id: 'novatech-direct',
      categorySlug: 'ecommerce',
      name: 'NovaTech Gear & Electronics',
      legalEntity: 'NovaTech Hardware Technologies Inc',
      tagline: 'Direct-to-Consumer Custom PCs & Audio Gear',
      city: 'San Francisco',
      country: 'USA',
      status: 'active',
      plan: 'Growth Pro',
      customDomain: 'checkout.novatechgear.com',
      cnameVerified: true,
      sslActive: true,
      avatar: 'zap',
      createdAt: '2025-01-20',
      metrics: [
        { label: 'Monthly Orders', value: '84,200', subtext: 'Multi-Warehouse' },
        { label: 'Monthly Revenue', value: '$2.90M', subtext: 'High Ticket Consumer' },
        { label: 'Active SKUs', value: '4,800', subtext: 'Serial Tracked' },
        { label: 'Cart Conversion', value: '4.8%', subtext: 'Fast Checkout' },
      ],
      monthlyApiCalls: 2350000,
      apiCallQuota: 5000000,
      storageUsedGb: 290,
      storageQuotaGb: 600,
      enabledServices: ['commerce', 'inventory', 'pos'],
      apiKeysCount: 3,
      contactEmail: 'ops@novatechgear.com',
      technicalLead: 'David Chen, Director of Commerce Engineering',
    },
    {
      id: 'verde-organics',
      categorySlug: 'ecommerce',
      name: 'Verde Organics Superfoods',
      legalEntity: 'Verde Organics Harvest Corp',
      tagline: 'Farm-to-Door Organic Nutrition & Cold-Pressed Elixirs',
      city: 'Austin',
      country: 'USA',
      status: 'active',
      plan: 'Growth Pro',
      customDomain: 'market.verdeorganics.bio',
      cnameVerified: true,
      sslActive: true,
      avatar: 'botanical',
      createdAt: '2025-02-14',
      metrics: [
        { label: 'Monthly Orders', value: '39,500', subtext: '68% Recurring Subscriptions' },
        { label: 'Monthly Revenue', value: '$890K', subtext: 'High Retention' },
        { label: 'Cold-Chain Warehouses', value: '4 Hubs', subtext: 'Same-day Dispatch' },
        { label: 'Active Subscribers', value: '24,000', subtext: 'Auto-Renew' },
      ],
      monthlyApiCalls: 1100000,
      apiCallQuota: 2500000,
      storageUsedGb: 140,
      storageQuotaGb: 350,
      enabledServices: ['commerce', 'crm', 'inventory'],
      apiKeysCount: 2,
      contactEmail: 'hello@verdeorganics.bio',
      technicalLead: 'Chloe Miller, Lead Developer',
    },
    {
      id: 'kinfolk-home',
      categorySlug: 'ecommerce',
      name: 'Kinfolk Artisanal Furnishings',
      legalEntity: 'Kinfolk Nordic Living ApS',
      tagline: 'Minimalist Scandinavian Craftsmanship & Interiors',
      city: 'Copenhagen',
      country: 'Denmark',
      status: 'active',
      plan: 'Starter Biz',
      customDomain: 'store.kinfolkhome.dk',
      cnameVerified: true,
      sslActive: true,
      avatar: 'store',
      createdAt: '2025-03-01',
      metrics: [
        { label: 'Monthly Orders', value: '18,200', subtext: 'Freight Delivered' },
        { label: 'Monthly Revenue', value: '$640K', subtext: 'Handcrafted Pieces' },
        { label: 'Showrooms', value: '3 Hubs', subtext: 'Copenhagen, Oslo, Berlin' },
        { label: 'Returns Rate', value: '0.8%', subtext: 'Industry Leading' },
      ],
      monthlyApiCalls: 620000,
      apiCallQuota: 1500000,
      storageUsedGb: 85,
      storageQuotaGb: 200,
      enabledServices: ['commerce', 'inventory'],
      apiKeysCount: 2,
      contactEmail: 'contact@kinfolkhome.dk',
      technicalLead: 'Lars Nygard, CTO',
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
      enabledServices: ['restaurant', 'pos', 'inventory', 'finance'],
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
      enabledServices: ['restaurant', 'pos', 'inventory'],
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
      enabledServices: ['restaurant', 'pos'],
      apiKeysCount: 2,
      contactEmail: 'bbq@smokedcuredbbq.com',
      technicalLead: 'Hank Taylor, Founder & General Manager',
    },
  ],
  education: [
    {
      id: 'stanford-horizon',
      categorySlug: 'education',
      name: 'Stanford Horizon Global Institute',
      legalEntity: 'Horizon Higher Education Trust',
      tagline: 'Interdisciplinary AI, Neuroscience & Climate Engineering',
      city: 'Palo Alto',
      country: 'USA',
      status: 'active',
      plan: 'Campus Enterprise',
      customDomain: 'portal.stanfordhorizon.edu',
      cnameVerified: true,
      sslActive: true,
      avatar: 'education',
      createdAt: '2024-08-15',
      metrics: [
        { label: 'Enrolled Students', value: '18,500', subtext: 'Undergrad & Graduate' },
        { label: 'Faculty & Researchers', value: '940 Staff', subtext: 'Tenured & Postdoc' },
        { label: 'Active Courses', value: '620 Classes', subtext: 'Smart LMS Synced' },
        { label: 'Annual Research Grants', value: '$42M', subtext: 'Finance Ledger Tracked' },
      ],
      monthlyApiCalls: 2100000,
      apiCallQuota: 4500000,
      storageUsedGb: 680,
      storageQuotaGb: 1200,
      enabledServices: ['school', 'finance', 'hrms', 'crm'],
      apiKeysCount: 4,
      contactEmail: 'it-security@stanfordhorizon.edu',
      technicalLead: 'Dr. Arthur Sterling, VP of University Computing',
    },
    {
      id: 'oxford-academy',
      categorySlug: 'education',
      name: 'Oxford St. Jude Academy',
      legalEntity: 'Oxford Collegiate Preparatory Ltd',
      tagline: 'Rigorous International Baccalaureate Preparatory School',
      city: 'Oxford',
      country: 'UK',
      status: 'active',
      plan: 'Growth Pro',
      customDomain: 'campus.oxfordstjude.ac.uk',
      cnameVerified: true,
      sslActive: true,
      avatar: 'school',
      createdAt: '2025-01-10',
      metrics: [
        { label: 'Enrolled Students', value: '6,200', subtext: 'K-12 Prep' },
        { label: 'Faculty', value: '380 Staff', subtext: 'Cambridge Certified' },
        { label: 'Parent Portal Users', value: '11,400', subtext: 'Realtime Gradebook' },
        { label: 'Attendance Rate', value: '98.2%', subtext: 'Automated SMS Alerts' },
      ],
      monthlyApiCalls: 820000,
      apiCallQuota: 1800000,
      storageUsedGb: 260,
      storageQuotaGb: 500,
      enabledServices: ['school', 'finance'],
      apiKeysCount: 2,
      contactEmail: 'bursar@oxfordstjude.ac.uk',
      technicalLead: 'Simon Albright, Head of Educational Technology',
    },
    {
      id: 'pacific-stem',
      categorySlug: 'education',
      name: 'Pacific International STEM Academy',
      legalEntity: 'Pacific STEM Foundations Inc',
      tagline: 'Robotics, Coding & Space Technology for Young Leaders',
      city: 'Sydney',
      country: 'Australia',
      status: 'active',
      plan: 'Campus Enterprise',
      customDomain: 'lms.pacificstem.edu.au',
      cnameVerified: true,
      sslActive: true,
      avatar: 'rocket',
      createdAt: '2024-11-25',
      metrics: [
        { label: 'Enrolled Students', value: '9,400', subtext: 'Secondary School' },
        { label: 'Robotics Labs', value: '18 Stations', subtext: 'Hardware Integrated' },
        { label: 'Course Completion', value: '94.5%', subtext: 'Gamified Modules' },
        { label: 'Graduating Cohort', value: '1,200', subtext: 'Ed25519 Signed Diplomas' },
      ],
      monthlyApiCalls: 1250000,
      apiCallQuota: 2500000,
      storageUsedGb: 390,
      storageQuotaGb: 700,
      enabledServices: ['school', 'crm', 'hrms'],
      apiKeysCount: 3,
      contactEmail: 'admin@pacificstem.edu.au',
      technicalLead: 'Brooke Henderson, Director of Digital Learning',
    },
  ],
  retail: [
    {
      id: 'apex-supermarkets',
      categorySlug: 'retail',
      name: 'Apex Urban Supermarkets',
      legalEntity: 'Apex Retail Holdings PLC',
      tagline: 'High-Density Metropolitan Supermarkets & Grocery Hubs',
      city: 'London',
      country: 'UK',
      status: 'active',
      plan: 'Retail Enterprise',
      customDomain: 'till.apexmarkets.co.uk',
      cnameVerified: true,
      sslActive: true,
      avatar: 'shopping-bag',
      createdAt: '2024-10-02',
      metrics: [
        { label: 'Physical Stores', value: '42 Stores', subtext: 'Greater London & South' },
        { label: 'Active Checkout Tills', value: '310 Registers', subtext: 'Offline Resilient' },
        { label: 'Daily Transactions', value: '84,000 Sales', subtext: 'Realtime Stock Dedup' },
        { label: 'Active Cashiers', value: '620 Staff', subtext: 'PIN Authenticated' },
      ],
      monthlyApiCalls: 3400000,
      apiCallQuota: 7000000,
      storageUsedGb: 490,
      storageQuotaGb: 900,
      enabledServices: ['pos', 'inventory', 'finance', 'commerce'],
      apiKeysCount: 5,
      contactEmail: 'pos-ops@apexmarkets.co.uk',
      technicalLead: 'Gareth Edwards, Head of Store Infrastructure',
    },
    {
      id: 'solstice-eyewear',
      categorySlug: 'retail',
      name: 'Solstice Luxury Eyewear',
      legalEntity: 'Solstice Optique Italia Srl',
      tagline: 'Handmade Italian Acetate Frames & Bespoke Optometry',
      city: 'Milan',
      country: 'Italy',
      status: 'active',
      plan: 'Growth Pro',
      customDomain: 'pos.solsticeoptic.it',
      cnameVerified: true,
      sslActive: true,
      avatar: 'eye',
      createdAt: '2025-01-30',
      metrics: [
        { label: 'Boutique Stores', value: '18 Boutiques', subtext: 'Milan, Paris, Geneva' },
        { label: 'Registers & iPads', value: '45 Registers', subtext: 'Bluetooth Barcode' },
        { label: 'Average Transaction', value: '€420', subtext: 'Prescription Lenses' },
        { label: 'Stock Sync Speed', value: '< 200 ms', subtext: 'Cross-Store Visibility' },
      ],
      monthlyApiCalls: 880000,
      apiCallQuota: 2000000,
      storageUsedGb: 115,
      storageQuotaGb: 300,
      enabledServices: ['pos', 'inventory', 'crm'],
      apiKeysCount: 3,
      contactEmail: 'store@solsticeoptic.it',
      technicalLead: 'Gianna Moretti, Retail IT Manager',
    },
    {
      id: 'summit-gear',
      categorySlug: 'retail',
      name: 'Summit Gear Outdoor Outfitters',
      legalEntity: 'Summit Mountaineering Equipment Co',
      tagline: 'Alpine Climbing, Mountaineering & Technical Ski Equipment',
      city: 'Denver',
      country: 'USA',
      status: 'active',
      plan: 'Growth Pro',
      customDomain: 'pos.summitgear.com',
      cnameVerified: true,
      sslActive: true,
      avatar: 'globe',
      createdAt: '2025-02-18',
      metrics: [
        { label: 'Mountain Stores', value: '9 Hubs', subtext: 'Colorado & Utah' },
        { label: 'Checkout Tills', value: '28 Registers', subtext: 'Ski Rental Matrix' },
        { label: 'Gear Rental Fleet', value: '3,400 Units', subtext: 'RFID Tagged' },
        { label: 'Loyalty Members', value: '48,000', subtext: 'Summit Points' },
      ],
      monthlyApiCalls: 710000,
      apiCallQuota: 1500000,
      storageUsedGb: 90,
      storageQuotaGb: 250,
      enabledServices: ['pos', 'inventory'],
      apiKeysCount: 2,
      contactEmail: 'support@summitgear.com',
      technicalLead: 'Colt Becker, Operations & Tech Lead',
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
    maskedKey: 'orb_live_root_9f8a********************4b12',
    rawKey: 'orb_live_root_9f8a84b01e43cdb71a2e917d4b12',
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
    maskedKey: 'orb_live_hms_3c1d********************9e01',
    rawKey: 'orb_live_hms_3c1d91a742ee14fa8b21c4509e01',
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
    maskedKey: 'orb_live_hms_7e2a********************11df',
    rawKey: 'orb_live_hms_7e2a4411fb2280d963c4017f11df',
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
    id: 'key-comm-01',
    name: 'Aura Luxury Global Storefront CDN',
    keyPrefix: 'orb_live_com_',
    maskedKey: 'orb_live_com_88bc********************66a2',
    rawKey: 'orb_live_com_88bc392f4477aa2015df308866a2',
    serviceId: 'commerce',
    serviceName: 'Commerce & Store Engine',
    providerId: 'aura-luxury',
    providerName: 'Aura Luxury Fashion & Jewels',
    environment: 'production',
    scopes: ['commerce.catalog.manage', 'commerce.orders.fulfill', 'commerce.payments.charge'],
    createdAt: '2024-09-15',
    lastUsedAt: '12 secs ago',
    status: 'active',
    rateLimitPerMin: 4000,
    requestsLast30Days: 4800000,
  },
  {
    id: 'key-rest-01',
    name: 'Bella Italia Kitchen KDS Screen Feeds',
    keyPrefix: 'orb_live_rst_',
    maskedKey: 'orb_live_rst_44a1********************77ef',
    rawKey: 'orb_live_rst_44a1bb3244cc9081eef1923177ef',
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
    id: 'key-pos-01',
    name: 'Apex Supermarkets Till Registers Fleet',
    keyPrefix: 'orb_live_pos_',
    maskedKey: 'orb_live_pos_19df********************bb82',
    rawKey: 'orb_live_pos_19df77e23112aa54d2417799bb82',
    serviceId: 'pos',
    serviceName: 'Point of Sale (Omnichannel)',
    providerId: 'apex-supermarkets',
    providerName: 'Apex Urban Supermarkets',
    environment: 'production',
    scopes: ['pos.checkout.process', 'pos.terminal.sync'],
    createdAt: '2024-10-05',
    lastUsedAt: '30 secs ago',
    status: 'active',
    rateLimitPerMin: 3000,
    requestsLast30Days: 3400000,
  },
  {
    id: 'key-crm-01',
    name: 'Apollo Health CRM Integration Hub',
    keyPrefix: 'orb_live_crm_',
    maskedKey: 'orb_live_crm_62ee********************55dc',
    rawKey: 'orb_live_crm_62ee182044bb77fa9183cc4455dc',
    serviceId: 'crm',
    serviceName: 'CRM & Sales Pipeline',
    providerId: 'apollo-city',
    providerName: 'Apollo Super Speciality Hospital',
    environment: 'production',
    scopes: ['crm.leads.read', 'crm.leads.create'],
    createdAt: '2025-02-05',
    lastUsedAt: '18 mins ago',
    status: 'active',
    rateLimitPerMin: 1000,
    requestsLast30Days: 920000,
  },
  {
    id: 'key-school-01',
    name: 'Stanford Horizon Student Roster Sync',
    keyPrefix: 'orb_live_sch_',
    maskedKey: 'orb_live_sch_51aa********************8831',
    rawKey: 'orb_live_sch_51aa893144efbc2071aa99448831',
    serviceId: 'school',
    serviceName: 'School & Campus OS',
    providerId: 'stanford-horizon',
    providerName: 'Stanford Horizon Global Institute',
    environment: 'production',
    scopes: ['school.students.enroll', 'school.courses.publish'],
    createdAt: '2024-08-20',
    lastUsedAt: '1 hour ago',
    status: 'active',
    rateLimitPerMin: 1500,
    requestsLast30Days: 1400000,
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
    maskedKey: 'orb_live_hms_99aa********************0011',
    rawKey: 'orb_live_hms_99aa001122334455667788990011',
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
    maskedKey: 'orb_live_omni_7f9c********************4e8a',
    rawKey: 'orb_live_omni_7f9c2d1b4e8a11223344556677884e8a',
    serviceId: 'all',
    serviceName: 'All Subscribed Microservices (Restaurant + POS + Commerce + CRM)',
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
    maskedKey: 'orb_live_mednet_18df********************99cb',
    rawKey: 'orb_live_mednet_18df39a24411bb2091ef77aa99cb',
    serviceId: 'all',
    serviceName: 'Healthcare Network (HMS + Inventory + CRM + HRMS)',
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
  {
    id: 'key-aura-01',
    name: 'Aura Luxury Boutiques D2C Commerce Key',
    keyPrefix: 'orb_live_aura_',
    maskedKey: 'orb_live_aura_55bb********************11ee',
    rawKey: 'orb_live_aura_55bb90ef44cc11aa2011ff8811ee',
    serviceId: 'all',
    serviceName: 'Omnichannel D2C (Commerce + POS + Inventory + CRM)',
    providerId: 'proj-aura-d2c',
    providerName: 'Aura Luxury Boutiques Group',
    environment: 'production',
    scopes: ['*'],
    createdAt: '2025-02-04',
    lastUsedAt: 'Just now',
    status: 'active',
    rateLimitPerMin: 1800,
    requestsLast30Days: 3890000,
  },
  {
    id: 'key-campus-01',
    name: 'CampusCloud Multi-Campus Academies Key',
    keyPrefix: 'orb_live_campus_',
    maskedKey: 'orb_live_campus_33aa********************88ff',
    rawKey: 'orb_live_campus_33aa77ff2211bb3388ee001188ff',
    serviceId: 'all',
    serviceName: 'B2B2C Academies (School + Finance + HRMS + CRM)',
    providerId: 'proj-campuscloud',
    providerName: 'CampusCloud Global Academies',
    environment: 'production',
    scopes: ['*'],
    createdAt: '2025-03-01',
    lastUsedAt: '12 mins ago',
    status: 'active',
    rateLimitPerMin: 600,
    requestsLast30Days: 780000,
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

  if (provider.categorySlug === 'ecommerce') {
    return [
      {
        id: 'rec-e1',
        title: 'Direct Storefront Checkout Fulfilled — Order #ORD-9821',
        badge: 'Paid & Fulfilled',
        badgeType: 'success',
        details: 'Total: $420.00 via Apple Pay. High-speed edge SSR checkout completed in 18ms.',
        timestamp: '1 min ago',
        extraMeta: { Destination: 'Paris, FR', Gateway: 'Stripe Zero-Trust Token' },
      },
      {
        id: 'rec-e2',
        title: 'Inventory Deduped Across Multi-Warehouse Hub',
        badge: 'Stock Balanced',
        badgeType: 'info',
        details: 'SKU #AUR-LUX-204 (Silk Kaftan): 4 units held in Milan Central Hub, 2 dispatched.',
        timestamp: '6 mins ago',
        extraMeta: { Warehouse: 'Milan Hub A', ReorderPoint: 'OK (>15 remaining)' },
      },
      {
        id: 'rec-e3',
        title: 'Storefront Theme Studio Deployment',
        badge: 'Live on Edge',
        badgeType: 'warning',
        details: 'Aura Luxury Autumn Collection banner and typography updated to production CDN.',
        timestamp: '32 mins ago',
        extraMeta: { DeployId: 'dep_aura_891b', CDN: 'Global Edge Anycast' },
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
    enabledServices: ['restaurant', 'pos', 'commerce', 'crm', 'finance', 'inventory'],
    monthlyApiCalls: 42800000,
    apiCallQuota: 100000000,
    rateLimitPerMin: 10000,
    storageUsedGb: 1840,
    storageQuotaGb: 10000,
    features: ['o2o_kitchen_routing', 'pos_drawer_sync', 'instant_stripe_ledger', 'webhook_dispatches'],
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
    description: 'Multi-hospital clinical matrix connecting emergency triage bays, ward bed reservations, pharmaceutical inventory tracking, and electronic health records.',
    plan: 'enterprise',
    planLabel: 'Enterprise Dedicated',
    status: 'active',
    customDomain: 'api.mednet-health.org',
    primaryApiKeyId: 'key-mednet-01',
    primaryApiKeyPrefix: 'orb_live_mednet_',
    enabledServices: ['hms', 'inventory', 'crm', 'hrms', 'finance'],
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
  {
    id: 'proj-aura-d2c',
    name: 'Aura Luxury Boutiques Group',
    slug: 'aura-luxury',
    organization: 'Aura International Maison Inc.',
    businessModel: 'D2C',
    businessModelLabel: 'Omnichannel D2C & Luxury Commerce',
    description: 'Direct-to-consumer flagship storefront, multi-currency checkout engine, inventory warehouse sync, and personalized VIP clienteling.',
    plan: 'pro',
    planLabel: 'Pro Scale',
    status: 'active',
    customDomain: 'api.aura-luxury.boutique',
    primaryApiKeyId: 'key-aura-01',
    primaryApiKeyPrefix: 'orb_live_aura_',
    enabledServices: ['commerce', 'inventory', 'pos', 'crm'],
    monthlyApiCalls: 3890000,
    apiCallQuota: 5000000,
    rateLimitPerMin: 1800,
    storageUsedGb: 310,
    storageQuotaGb: 500,
    features: ['vip_tier_discounts', 'multi_currency_checkout', 'realtime_stock_reserves'],
    contactEmail: 'engineering@aura-luxury.boutique',
    technicalLead: 'Camille Laurent, Head of Digital Architecture',
    createdAt: '2025-02-04',
    lastActiveAt: 'Just now',
    recentLatencyMs: 16,
  },
  {
    id: 'proj-campuscloud',
    name: 'CampusCloud Global Academies',
    slug: 'campuscloud',
    organization: 'CampusCloud EduTech Solutions',
    businessModel: 'B2B2C',
    businessModelLabel: 'B2B2C Multi-Campus Academy Platform',
    description: 'Cloud education network managing student registers, automated fee collections, faculty payroll, and admissions CRM pipelines.',
    plan: 'growth',
    planLabel: 'Growth Startup',
    status: 'active',
    customDomain: 'api.campuscloud.edu',
    primaryApiKeyId: 'key-campus-01',
    primaryApiKeyPrefix: 'orb_live_campus_',
    enabledServices: ['school', 'finance', 'hrms', 'crm'],
    monthlyApiCalls: 780000,
    apiCallQuota: 1000000,
    rateLimitPerMin: 600,
    storageUsedGb: 64,
    storageQuotaGb: 100,
    features: ['student_roster_sync', 'tuition_fee_invoicing', 'parent_sms_alerts'],
    contactEmail: 'dev@campuscloud.edu',
    technicalLead: 'David O\'Connor, Lead Platform Engineer',
    createdAt: '2025-03-01',
    lastActiveAt: '12 mins ago',
    recentLatencyMs: 13,
  },
];

