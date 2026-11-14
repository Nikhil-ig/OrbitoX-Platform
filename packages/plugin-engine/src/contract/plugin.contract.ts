/**
 * 🪐 OrbitoX Plugin Contract Specification
 * ─────────────────────────────────────────────────────────────────────────────
 * Defines the standard architectural shape for modular, zero-leakage OrbitoX plugins.
 * Follows Medusa's proven architecture: modules + workflows + providers.
 *
 * Structure of a Plugin:
 *   - Manifest: identity, entitlements (feature keys + quota keys), events, migrations
 *   - Domain: pure business logic functions (no IO, no DB, no HTTP)
 *   - Service: business workflows using an injected Repository and Clock
 *   - Routes: framework-agnostic HTTP handler map
 *   - Events: reactive event handlers
 *   - Migrations: declarative schema/state migrations
 */

export interface PluginQuotas {
  key: string;
  defaultLimit?: number;
  window?: 'daily' | 'monthly';
  description?: string;
}

export interface PluginEntitlements {
  features: string[];
  quotas?: PluginQuotas[];
}

export interface PluginEventConfig {
  emits?: string[];
  subscribes?: string[];
}

export interface PluginMigration {
  id: string;
  description?: string;
  up: (context: any) => Promise<void> | void;
  down?: (context: any) => Promise<void> | void;
}

export interface PluginManifestContract {
  id: string;
  name: string;
  version: string;
  displayName: string;
  description?: string;
  author?: string;
  entitlements: PluginEntitlements;
  events?: PluginEventConfig;
  migrations?: PluginMigration[];
}

export interface PluginClock {
  now(): Date;
  iso(): string;
}

export class DefaultPluginClock implements PluginClock {
  now(): Date {
    return new Date();
  }
  iso(): string {
    return new Date().toISOString();
  }
}

export interface PluginRequestContext<TServices = any> {
  tenantId: string;
  tenant?: any;
  params: Record<string, string>;
  query: Record<string, any>;
  body: any;
  headers: Record<string, string | string[] | undefined>;
  services: TServices;
  user?: {
    id: string;
    roles?: string[];
    tenantId?: string;
    [key: string]: any;
  };
  entitlements?: {
    hasFeature: (featureName: string) => boolean;
  };
}

export interface PluginResponse<T = any> {
  status?: number;
  headers?: Record<string, string>;
  body?: T;
}

export type PluginHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

export type PluginRouteHandler<TServices = any, TBody = any, TRes = any> = (
  ctx: PluginRequestContext<TServices>
) => Promise<PluginResponse<TRes> | TRes> | PluginResponse<TRes> | TRes;

export interface PluginRouteDefinition<TServices = any> {
  path: string;
  method: PluginHttpMethod;
  handler: PluginRouteHandler<TServices>;
  requiresAuth?: boolean;
  scopes?: string[];
  entitlement?: {
    feature?: string;
    quotaKey?: string;
  };
  rateLimitPerMin?: number;
  description?: string;
}

export interface OrbitoXPlugin<TDomain = any, TService = any, TRepo = any> {
  manifest: PluginManifestContract;
  domain: TDomain;
  service:
    | ((deps: { repository: TRepo; clock: PluginClock; events?: any }) => TService)
    | TService;
  routes?: PluginRouteDefinition<TService>[] | Record<string, PluginRouteDefinition<TService>>;
  events?: Record<string, (event: any, context: any) => Promise<void> | void>;
  migrations?: PluginMigration[];
}

/**
 * Type-safe helper to define an OrbitoX Plugin
 */
export function defineOrbitoXPlugin<TD, TS, TR>(
  definition: OrbitoXPlugin<TD, TS, TR>
): OrbitoXPlugin<TD, TS, TR> {
  return definition;
}
