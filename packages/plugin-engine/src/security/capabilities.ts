/**
 * 🪐 OrbitoX Typed Capability Matrix & Presets
 * Replaces arbitrary string arrays with a structured grammar:
 * <package>.<resource>.<action>
 */

export type CorePackageNamespace =
  | 'platform'
  | 'restaurant'
  | 'hms'
  | 'system';

export type PlatformCapability =
  // ─── Platform OS Administration ───
  | 'platform.projects.read'
  | 'platform.projects.provision'
  | 'platform.projects.mutate'
  | 'platform.projects.suspend'
  | 'platform.keys.read'
  | 'platform.keys.create'
  | 'platform.keys.rotate'
  | 'platform.keys.revoke'
  | 'platform.credentials.read'
  | 'platform.credentials.create'
  | 'platform.credentials.rotate'
  | 'platform.credentials.revoke'
  | 'platform.packages.inspect'
  | 'platform.packages.verify'
  | 'platform.packages.install'
  | 'platform.packages.rollback'
  | 'platform.audit.read'
  | 'platform.approvals.request'
  | 'platform.approvals.act'
  | 'platform.telemetry.read'
  | 'platform.tests.execute'
  
  // ─── Restaurant OS ───
  | 'restaurant.orders.read'
  | 'restaurant.orders.create'
  | 'restaurant.orders.update'
  | 'restaurant.orders.cancel'
  | 'restaurant.kds.view'
  | 'restaurant.kds.fire'
  | 'restaurant.menu.read'
  | 'restaurant.menu.manage'
  | 'restaurant.tables.view'
  | 'restaurant.tables.reserve'
  
  // ─── Healthcare (HMS) ───
  | 'hms.patients.read'
  | 'hms.patients.register'
  | 'hms.triage.execute'
  | 'hms.beds.view'
  | 'hms.beds.allocate'
  | 'hms.pharmacy.dispense'
  | 'hms.telemetry.stream';

export interface CapabilityPreset {
  id: string;
  name: string;
  description: string;
  packageNamespace: CorePackageNamespace;
  capabilities: PlatformCapability[];
}

export const CAPABILITY_PRESETS: Record<string, CapabilityPreset> = {
  // ─── Restaurant OS Presets ───
  'restaurant_read_only': {
    id: 'restaurant_read_only',
    name: 'Restaurant Read-Only (Auditor / TV Display)',
    description: 'Permits viewing menu items, table status, and active orders without mutation capabilities.',
    packageNamespace: 'restaurant',
    capabilities: [
      'restaurant.menu.read',
      'restaurant.orders.read',
      'restaurant.tables.view',
      'restaurant.kds.view',
    ],
  },
  'restaurant_floor_operator': {
    id: 'restaurant_floor_operator',
    name: 'Restaurant Operations (Waitstaff / KDS)',
    description: 'Standard staff profile for placing orders, updating seat sessions, and viewing prep queues.',
    packageNamespace: 'restaurant',
    capabilities: [
      'restaurant.menu.read',
      'restaurant.orders.read',
      'restaurant.orders.create',
      'restaurant.orders.update',
      'restaurant.tables.view',
      'restaurant.tables.reserve',
      'restaurant.kds.view',
      'restaurant.kds.fire',
    ],
  },
  'restaurant_store_manager': {
    id: 'restaurant_store_manager',
    name: 'Restaurant General Manager',
    description: 'Full restaurant domain authority including menu pricing, discounts, and order cancellations.',
    packageNamespace: 'restaurant',
    capabilities: [
      'restaurant.menu.read',
      'restaurant.menu.manage',
      'restaurant.orders.read',
      'restaurant.orders.create',
      'restaurant.orders.update',
      'restaurant.orders.cancel',
      'restaurant.tables.view',
      'restaurant.tables.reserve',
      'restaurant.kds.view',
      'restaurant.kds.fire',
    ],
  },

  // ─── Healthcare Presets ───
  'hms_clinical_read': {
    id: 'hms_clinical_read',
    name: 'Clinical Observer / Telemetry Monitor',
    description: 'Read-only access to patient biometric monitors and bed occupancy matrices.',
    packageNamespace: 'hms',
    capabilities: [
      'hms.patients.read',
      'hms.beds.view',
      'hms.telemetry.stream',
    ],
  },
  'hms_triage_nurse': {
    id: 'hms_triage_nurse',
    name: 'Emergency Ward Triage Nurse',
    description: 'Authorizes emergency triage state transitions and inpatient ward bed holds.',
    packageNamespace: 'hms',
    capabilities: [
      'hms.patients.read',
      'hms.patients.register',
      'hms.triage.execute',
      'hms.beds.view',
      'hms.beds.allocate',
    ],
  },

  // ─── Platform SRE & DevOps ───
  'platform_sre_observer': {
    id: 'platform_sre_observer',
    name: 'Platform SRE Observer',
    description: 'Read-only operational access to platform telemetry, node mesh, test suites, and audit streams.',
    packageNamespace: 'platform',
    capabilities: [
      'platform.projects.read',
      'platform.keys.read',
      'platform.credentials.read',
      'platform.packages.inspect',
      'platform.audit.read',
      'platform.telemetry.read',
      'platform.tests.execute',
    ],
  },
};

/**
 * Validates whether an actor with `grantedCapabilities` is authorized to perform `requiredCapability`.
 * Supports package wildcarding (e.g. `restaurant.*`) and platform root (`*`), while preventing scope escalation.
 */
export function hasCapability(grantedCapabilities: string[], requiredCapability: string): boolean {
  if (!grantedCapabilities || grantedCapabilities.length === 0) return false;
  if (!requiredCapability) return false;

  for (const granted of grantedCapabilities) {
    if (granted === '*') return true;
    if (granted === requiredCapability) return true;

    // Check package-level wildcard: e.g. "restaurant.*" matches "restaurant.orders.read"
    if (granted.endsWith('.*')) {
      const packagePrefix = granted.slice(0, -2);
      if (requiredCapability.startsWith(`${packagePrefix}.`)) {
        return true;
      }
    }
  }

  return false;
}
