/**
 * OrbitoX 6G Data-Rights Plugin Contract (G1)
 * -----------------------------------------------------------------------------
 * Versioned contract every first-party plugin implements so the platform can
 * export, correct, restrict, or erase tenant and data-principal records
 * uniformly across local schemas and remote bridge services.
 */

export const PLUGIN_DATA_CONTRACT_VERSION = 'v1' as const;

export type ErasureMode = 'DELETE' | 'RESTRICT';

export interface PrincipalRef {
  kind: 'patient' | 'staff' | 'diner' | 'customer' | string;
  id?: string;
  email?: string;
  phone?: string;
  mrn?: string;
}

export interface DataRightsContext {
  actorId: string;
  actorEmail?: string | null;
  reason: string;
  requestId?: string;
}

export interface TenantExportTableChunk {
  table: string;
  columns: readonly string[];
  rows: Array<Record<string, unknown>>;
}

export interface TenantErasureSummary {
  contractVersion: typeof PLUGIN_DATA_CONTRACT_VERSION;
  pluginId: string;
  tenantId: string;
  mode: ErasureMode;
  rowsDeletedByTable: Record<string, number>;
  rowsRestrictedByTable: Record<string, number>;
}

export interface PrincipalExportSummary {
  contractVersion: typeof PLUGIN_DATA_CONTRACT_VERSION;
  pluginId: string;
  tenantId: string;
  principal: PrincipalRef;
  tables: Record<string, Array<Record<string, unknown>>>;
  auditEventId?: string;
}

export interface PrincipalCorrectionPatch {
  fields: Record<string, unknown>;
}

export interface PrincipalCorrectionSummary {
  contractVersion: typeof PLUGIN_DATA_CONTRACT_VERSION;
  pluginId: string;
  tenantId: string;
  principal: PrincipalRef;
  updatedFields: string[];
  updatedCount: number;
  auditEventId?: string;
}

export interface PrincipalErasureSummary {
  contractVersion: typeof PLUGIN_DATA_CONTRACT_VERSION;
  pluginId: string;
  tenantId: string;
  principal: PrincipalRef;
  mode: ErasureMode;
  rowsDeletedByTable: Record<string, number>;
  rowsRestrictedByTable: Record<string, number>;
  auditEventId?: string;
}

export interface PluginDataRightsAdapter {
  readonly contractVersion: typeof PLUGIN_DATA_CONTRACT_VERSION;
  readonly pluginId: string;
  exportTenant(tenantId: string, context: DataRightsContext): AsyncIterable<TenantExportTableChunk>;
  eraseTenant(
    tenantId: string,
    mode: ErasureMode,
    context: DataRightsContext,
  ): Promise<TenantErasureSummary>;
  principalExport(
    tenantId: string,
    principal: PrincipalRef,
    context: DataRightsContext,
  ): Promise<PrincipalExportSummary>;
  principalCorrect(
    tenantId: string,
    principal: PrincipalRef,
    patch: PrincipalCorrectionPatch,
    context: DataRightsContext,
  ): Promise<PrincipalCorrectionSummary>;
  principalErase(
    tenantId: string,
    principal: PrincipalRef,
    mode: ErasureMode,
    context: DataRightsContext,
  ): Promise<PrincipalErasureSummary>;
}

export const DEFAULT_PLUGIN_ERASURE_POLICY: Readonly<Record<string, ErasureMode>> = Object.freeze({
  '@orbitox/hms': 'RESTRICT',
  '@orbitox/restaurant': 'DELETE',
});

export function normalizeDataRightsPluginId(pluginId: string): string {
  const trimmed = pluginId.trim().toLowerCase();
  if (
    trimmed === '@orbitox/hms' ||
    trimmed === '@orbitox-io/hms' ||
    trimmed === '@orbitox/hospital' ||
    trimmed === 'hospital-os' ||
    trimmed === 'hms'
  ) {
    return '@orbitox/hms';
  }
  if (
    trimmed === '@orbitox/restaurant' ||
    trimmed === '@orbitox-io/restaurant' ||
    trimmed === 'restaurant-os' ||
    trimmed === 'restaurant'
  ) {
    return '@orbitox/restaurant';
  }
  return pluginId.trim();
}

export function parsePluginErasurePolicy(rawJson?: string): Record<string, ErasureMode> {
  const result: Record<string, ErasureMode> = { ...DEFAULT_PLUGIN_ERASURE_POLICY };
  const raw = rawJson?.trim();
  if (!raw) return result;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('ORBITOX_PLUGIN_ERASURE_POLICY must be valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('ORBITOX_PLUGIN_ERASURE_POLICY must be a JSON object mapping pluginId -> DELETE | RESTRICT.');
  }

  for (const [pluginKey, mode] of Object.entries(parsed)) {
    if (mode !== 'DELETE' && mode !== 'RESTRICT') {
      throw new Error(
        `Invalid erasure mode "${String(mode)}" for plugin "${pluginKey}". Expected "DELETE" or "RESTRICT".`,
      );
    }
    result[normalizeDataRightsPluginId(pluginKey)] = mode;
  }

  return result;
}

export function resolvePluginErasureMode(pluginId: string, rawPolicyJson?: string): ErasureMode {
  const canonical = normalizeDataRightsPluginId(pluginId);
  const policy = parsePluginErasurePolicy(rawPolicyJson);
  return policy[canonical] ?? 'RESTRICT';
}
