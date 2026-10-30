/**
 * 🛡️ OrbitoX Platform — Sample-Data Plugin Isolation & Gate (Phase 2b-5)
 * ─────────────────────────────────────────────────────────────────────────────
 * Architectural Rule:
 * Sample-data plugins (CRM, finance, commerce, HRMS, school, inventory) must NOT
 * serve demo data in production as if it were real.
 *
 * Each plugin is guarded behind a per-plugin feature flag that is OFF by default
 * in production.
 * - When OFF: UI pages display "Coming Soon" and APIs return HTTP 404 PLUGIN_NOT_AVAILABLE.
 * - Platform catalogue marks them "NOT_INSTALLABLE" until each is rebuilt to the
 *   HospitalOS standard (own schema, RLS, automated migrations, test suites).
 */

export type SamplePluginId = 'crm' | 'finance' | 'commerce' | 'hrms' | 'school' | 'inventory';

export const SAMPLE_PLUGINS: readonly SamplePluginId[] = [
  'crm',
  'finance',
  'commerce',
  'hrms',
  'school',
  'inventory',
] as const;

export const SAMPLE_PLUGIN_NAMES: Record<SamplePluginId, string> = {
  crm: 'CRM & Sales Pipeline',
  finance: 'Finance & Ledger Engine',
  commerce: 'Commerce & Store Engine',
  hrms: 'HRMS & Workforce Suite',
  school: 'School & Campus OS',
  inventory: 'Inventory & Logistics',
};

export const SAMPLE_PACKAGE_IDS: Record<SamplePluginId, string[]> = {
  crm: ['@orbitox/crm', '@orbitox-io/crm'],
  finance: ['@orbitox/finance', '@orbitox-io/finance'],
  commerce: ['@orbitox/commerce', '@orbitox-io/commerce'],
  hrms: ['@orbitox/hrms', '@orbitox-io/hrms'],
  school: ['@orbitox/school', '@orbitox-io/school'],
  inventory: ['@orbitox/inventory', '@orbitox-io/inventory'],
};

export function isSamplePlugin(id: string): id is SamplePluginId {
  return (SAMPLE_PLUGINS as readonly string[]).includes(id.toLowerCase());
}

export function isSamplePackage(packageId: string): boolean {
  const norm = packageId.toLowerCase().trim();
  for (const ids of Object.values(SAMPLE_PACKAGE_IDS)) {
    if (ids.some((id) => id.toLowerCase() === norm)) {
      return true;
    }
  }
  return false;
}

export function getSamplePluginForPackage(packageId: string): SamplePluginId | undefined {
  const norm = packageId.toLowerCase().trim();
  for (const [pluginId, ids] of Object.entries(SAMPLE_PACKAGE_IDS)) {
    if (ids.some((id) => id.toLowerCase() === norm)) {
      return pluginId as SamplePluginId;
    }
  }
  return undefined;
}

/**
 * Evaluates whether a sample-data plugin is enabled.
 * Default in production is strictly FALSE (OFF).
 * When off: pages show 'coming soon' and APIs return 404 PLUGIN_NOT_AVAILABLE.
 */
export function isSamplePluginEnabled(plugin: SamplePluginId): boolean {
  const envVar = `ORBITOX_ENABLE_${plugin.toUpperCase()}_PLUGIN`;
  const explicit = process.env[envVar]?.toLowerCase().trim();
  if (explicit === 'true' || explicit === '1') return true;
  if (explicit === 'false' || explicit === '0') return false;

  const rawNodeEnv = (process.env.NODE_ENV || '').toLowerCase().trim();
  const isProduction = rawNodeEnv === 'production' || !rawNodeEnv;

  if (isProduction) {
    return false; // OFF by default in production
  }

  // In non-production (development, test), default to true unless ORBITOX_DISABLE_SAMPLE_PLUGINS is true
  if (process.env.ORBITOX_DISABLE_SAMPLE_PLUGINS === 'true') {
    return false;
  }
  return true;
}
