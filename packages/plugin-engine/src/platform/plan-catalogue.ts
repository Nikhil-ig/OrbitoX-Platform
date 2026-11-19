/**
 * OrbitoX Phase 3 Plan Catalogue & Entitlement State Machine Definitions
 */

export type QuotaWindow = 'none' | 'day' | 'month';

export interface PlanFeatureItem {
  featureKey: string;
  description?: string;
  enabled: boolean;
}

export interface PlanQuotaItem {
  quotaKey: string;
  limit: number;
  window: QuotaWindow;
  unit: string;
}

export interface PluginCatalogueItem {
  id?: string;
  pluginId: string;
  name: string;
  description?: string;
  version: string;
  status: 'ACTIVE' | 'DEPRECATED';
  createdAt?: string;
  updatedAt?: string;
}

export interface PlanCatalogueRecord {
  id?: string;
  planId: string;
  pluginId: string;
  name: string;
  description?: string;
  tier: string;
  priceMinor: number;
  currency: string;
  billingInterval: 'month' | 'year';
  gracePeriodDays: number;
  suspensionGraceDays: number;
  status: 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED';
  features: PlanFeatureItem[];
  quotas: PlanQuotaItem[];
  createdAt?: string;
  updatedAt?: string;
}

export const SEED_PLUGINS: PluginCatalogueItem[] = [
  {
    pluginId: '@orbitox/hms',
    name: 'HospitalOS',
    description: 'Multi-tenant Hospital Management System with RLS, appointments, labs, billing and staff roles',
    version: '2.3.1',
    status: 'ACTIVE',
  },
  {
    pluginId: '@orbitox/restaurant',
    name: 'RestaurantOS',
    description: 'Hospitality & Restaurant POS, Kitchen Display System (KDS) and Floor Management',
    version: '2.1.0',
    status: 'ACTIVE',
  },
];

export const SEED_PLANS: PlanCatalogueRecord[] = [
  {
    planId: 'hms-starter',
    pluginId: '@orbitox/hms',
    name: 'HospitalOS Starter',
    description: 'Core hospital management for clinics and small hospitals: patient registry, appointments and billing',
    tier: 'starter',
    priceMinor: 990000,
    currency: 'INR',
    billingInterval: 'month',
    gracePeriodDays: 7,
    suspensionGraceDays: 30,
    status: 'ACTIVE',
    features: [
      { featureKey: 'patients', description: 'Patient registry and demographics', enabled: true },
      { featureKey: 'appointments', description: 'Doctor and OPD appointment booking', enabled: true },
      { featureKey: 'billing', description: 'Patient invoices and cash/card ledger payments', enabled: true },
    ],
    quotas: [
      { quotaKey: 'patients', limit: 500, window: 'none', unit: 'records' },
      { quotaKey: 'beds', limit: 20, window: 'none', unit: 'units' },
      { quotaKey: 'doctors', limit: 10, window: 'none', unit: 'staff' },
      { quotaKey: 'api_calls', limit: 10000, window: 'month', unit: 'requests' },
    ],
  },
  {
    planId: 'hms-pro',
    pluginId: '@orbitox/hms',
    name: 'HospitalOS Pro',
    description: 'Comprehensive hospital operating system including diagnostic labs, verification and pharmacy',
    tier: 'pro',
    priceMinor: 2490000,
    currency: 'INR',
    billingInterval: 'month',
    gracePeriodDays: 7,
    suspensionGraceDays: 30,
    status: 'ACTIVE',
    features: [
      { featureKey: 'patients', description: 'Patient registry and demographics', enabled: true },
      { featureKey: 'appointments', description: 'Doctor and OPD appointment booking', enabled: true },
      { featureKey: 'billing', description: 'Patient invoices and cash/card ledger payments', enabled: true },
      { featureKey: 'labs', description: 'Lab tests, diagnostic orders and result verification', enabled: true },
      { featureKey: 'pharmacy', description: 'Clinical pharmacy dispensing and medication inventory', enabled: true },
    ],
    quotas: [
      { quotaKey: 'patients', limit: 5000, window: 'none', unit: 'records' },
      { quotaKey: 'beds', limit: 500, window: 'none', unit: 'units' },
      { quotaKey: 'doctors', limit: 100, window: 'none', unit: 'staff' },
      { quotaKey: 'api_calls', limit: 100000, window: 'month', unit: 'requests' },
    ],
  },
  {
    planId: 'restaurant-starter',
    pluginId: '@orbitox/restaurant',
    name: 'RestaurantOS Starter',
    description: 'Essential dining, orders, tables and kitchen display for cafes and bistros',
    tier: 'starter',
    priceMinor: 490000,
    currency: 'INR',
    billingInterval: 'month',
    gracePeriodDays: 7,
    suspensionGraceDays: 30,
    status: 'ACTIVE',
    features: [
      { featureKey: 'orders', description: 'Dining and takeaway order management', enabled: true },
      { featureKey: 'menu', description: 'Dynamic menu catalogue and item pricing', enabled: true },
      { featureKey: 'tables', description: 'Table management and floor layout', enabled: true },
      { featureKey: 'kds', description: 'Kitchen Display System with real-time bump', enabled: true },
    ],
    quotas: [
      { quotaKey: 'orders', limit: 1000, window: 'month', unit: 'records' },
      { quotaKey: 'tables', limit: 15, window: 'none', unit: 'units' },
      { quotaKey: 'staff', limit: 10, window: 'none', unit: 'staff' },
      { quotaKey: 'api_calls', limit: 25000, window: 'month', unit: 'requests' },
    ],
  },
  {
    planId: 'restaurant-pro',
    pluginId: '@orbitox/restaurant',
    name: 'RestaurantOS Pro',
    description: 'Full restaurant suite with kitchen display, inventory deduction, pos billing and analytics',
    tier: 'pro',
    priceMinor: 1290000,
    currency: 'INR',
    billingInterval: 'month',
    gracePeriodDays: 7,
    suspensionGraceDays: 30,
    status: 'ACTIVE',
    features: [
      { featureKey: 'orders', description: 'Dining and takeaway order management', enabled: true },
      { featureKey: 'menu', description: 'Dynamic menu catalogue and item pricing', enabled: true },
      { featureKey: 'tables', description: 'Table management and floor layout', enabled: true },
      { featureKey: 'kds', description: 'Kitchen Display System with real-time bump', enabled: true },
      { featureKey: 'inventory', description: 'Ingredient tracking and automatic stock deduction', enabled: true },
      { featureKey: 'analytics', description: 'Revenue, sales and table turnover analytics', enabled: true },
      { featureKey: 'pos', description: 'Integrated billing, split payments and tax invoice generation', enabled: true },
    ],
    quotas: [
      { quotaKey: 'orders', limit: 10000, window: 'month', unit: 'records' },
      { quotaKey: 'tables', limit: 200, window: 'none', unit: 'units' },
      { quotaKey: 'staff', limit: 100, window: 'none', unit: 'staff' },
      { quotaKey: 'api_calls', limit: 250000, window: 'month', unit: 'requests' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// Installation State Machine (Part C)
// REQUESTED → PROVISIONING → ACTIVE ⇄ READ_ONLY → SUSPENDED → DEPROVISIONING → ARCHIVED, plus FAILED
// ─────────────────────────────────────────────────────────────

export type InstallationStatus =
  | 'REQUESTED'
  | 'PROVISIONING'
  | 'ACTIVE'
  | 'READ_ONLY'
  | 'SUSPENDED'
  | 'DEPROVISIONING'
  | 'ARCHIVED'
  | 'FAILED';

export const LEGAL_INSTALLATION_TRANSITIONS: Record<InstallationStatus, InstallationStatus[]> = {
  REQUESTED: ['PROVISIONING', 'FAILED'],
  PROVISIONING: ['ACTIVE', 'FAILED'],
  ACTIVE: ['READ_ONLY', 'SUSPENDED', 'DEPROVISIONING', 'ARCHIVED'],
  READ_ONLY: ['ACTIVE', 'SUSPENDED', 'DEPROVISIONING', 'ARCHIVED'],
  SUSPENDED: ['ACTIVE', 'DEPROVISIONING', 'ARCHIVED'],
  DEPROVISIONING: ['ARCHIVED', 'FAILED'],
  FAILED: ['PROVISIONING', 'ARCHIVED'],
  ARCHIVED: [], // Re-activation is an explicit, audited admin action only
};

export class InvalidStateTransitionError extends Error {
  readonly code = 'INVALID_STATE_TRANSITION';
  constructor(readonly currentStatus: string, readonly targetStatus: string) {
    super(`Invalid installation state transition from "${currentStatus}" to "${targetStatus}".`);
  }
}

export function assertValidInstallationTransition(
  currentStatus: string,
  targetStatus: string,
  isAdminReactivation = false
): void {
  if (currentStatus === targetStatus) return;

  const current = currentStatus.toUpperCase() as InstallationStatus;
  const target = targetStatus.toUpperCase() as InstallationStatus;

  if (current === 'ARCHIVED') {
    if (!isAdminReactivation) {
      const err = new Error(
        `Cannot re-activate ARCHIVED plugin installation. Re-activation requires an explicit, audited admin action.`
      );
      (err as any).code = 'ARCHIVED_RESURRECTION_REFUSED';
      throw err;
    }
    if (target !== 'ACTIVE' && target !== 'PROVISIONING') {
      throw new InvalidStateTransitionError(currentStatus, targetStatus);
    }
    return;
  }

  const allowed = LEGAL_INSTALLATION_TRANSITIONS[current];
  if (!allowed || !allowed.includes(target)) {
    throw new InvalidStateTransitionError(currentStatus, targetStatus);
  }
}
