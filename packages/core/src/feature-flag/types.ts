export type FlagDimension =
  | 'context_id'
  | 'organisation_id'
  | 'tenant_id'
  | 'plan_id'
  | 'country'
  | 'environment'
  | 'user_id'
  | 'percentage'
  | 'date_before'
  | 'date_after';

export interface FlagCondition {
  dimension: FlagDimension;
  operator: 'eq' | 'in' | 'lte' | 'gte' | 'contains';
  value: string | string[] | number | boolean;
}

export interface FlagOverride {
  id: string;
  priority: number; // Higher is evaluated first
  effect: boolean;  // True = enabled, False = disabled
  conditions: FlagCondition[]; // ALL conditions must match
}

export interface FeatureFlag {
  id: string;
  displayName: string;
  description: string;
  pluginId?: string; // null means platform-wide
  category: 'feature' | 'experiment' | 'ops' | 'beta';
  defaultValue: boolean;
  overrides: FlagOverride[];
}
