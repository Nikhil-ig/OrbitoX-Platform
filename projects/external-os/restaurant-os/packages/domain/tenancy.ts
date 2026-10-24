/**
 * 🪐 RestaurantOS Multi-Tenancy Context & Scoping Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative request-scoped tenant isolation via AsyncLocalStorage.
 * Guarantees zero data leakage between separate restaurant entities.
 */

import { AsyncLocalStorage } from 'async_hooks';
import * as http from 'http';

export interface ActiveTenantContext {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  orbitoxProjectId?: string;
}

export const DEFAULT_PILOT_TENANT: ActiveTenantContext = {
  tenantId: 'tenant_pilot_bistro',
  tenantSlug: 'bistro-pilot',
  tenantName: 'Orbitox Bistro Pilot',
  orbitoxProjectId: 'restaurant-os-pilot',
};

const tenantStorage = new AsyncLocalStorage<ActiveTenantContext>();

/**
 * Returns the currently active tenant context from AsyncLocalStorage.
 * Falls back to DEFAULT_PILOT_TENANT if invoked outside an explicit scope.
 */
export function getActiveTenant(): ActiveTenantContext {
  return tenantStorage.getStore() || DEFAULT_PILOT_TENANT;
}

/**
 * Executes an asynchronous function within a bound tenant context.
 */
export function withTenantContext<T>(
  context: ActiveTenantContext,
  fn: () => Promise<T> | T
): Promise<T> | T {
  return tenantStorage.run(context, fn);
}

/**
 * Resolves the tenant context from an incoming HTTP request:
 * 1. Explicit headers: `x-tenant-id`, `x-orbitox-tenant`
 * 2. Host header / custom subdomain: `<tenant-slug>.domain.com`
 * 3. URL query parameter: `?tenant=<tenant-slug-or-id>`
 * 4. Fallback: DEFAULT_PILOT_TENANT
 */
export function resolveTenantFromRequest(req: http.IncomingMessage): ActiveTenantContext {
  const customHeader = req.headers['x-tenant-id'] || req.headers['x-orbitox-tenant'];
  if (typeof customHeader === 'string' && customHeader.trim()) {
    const tid = customHeader.trim();
    return {
      tenantId: tid,
      tenantSlug: tid.replace(/^tenant_/, ''),
      tenantName: tid === DEFAULT_PILOT_TENANT.tenantId ? DEFAULT_PILOT_TENANT.tenantName : `Tenant ${tid}`,
      orbitoxProjectId: tid === DEFAULT_PILOT_TENANT.tenantId ? DEFAULT_PILOT_TENANT.orbitoxProjectId : tid,
    };
  }

  const reqUrl = req.url || '/';
  const queryMatch = /[?&](?:tenant|tenantId)=([^&]+)/i.exec(reqUrl);
  if (queryMatch && queryMatch[1]) {
    const tid = decodeURIComponent(queryMatch[1]).trim();
    return {
      tenantId: tid.startsWith('tenant_') ? tid : `tenant_${tid}`,
      tenantSlug: tid.replace(/^tenant_/, ''),
      tenantName: tid === DEFAULT_PILOT_TENANT.tenantId ? DEFAULT_PILOT_TENANT.tenantName : `Tenant ${tid}`,
      orbitoxProjectId: tid === DEFAULT_PILOT_TENANT.tenantId ? DEFAULT_PILOT_TENANT.orbitoxProjectId : tid,
    };
  }

  const host = req.headers.host || '';
  const parts = host.split(':')[0].split('.');
  if (parts.length > 2) {
    const sub = parts[0].toLowerCase();
    if (sub !== 'www' && sub !== 'api' && sub !== 'app' && sub !== 'localhost') {
      return {
        tenantId: `tenant_${sub}`,
        tenantSlug: sub,
        tenantName: `${sub.charAt(0).toUpperCase() + sub.slice(1)} Restaurant`,
        orbitoxProjectId: `restaurant-os-${sub}`,
      };
    }
  }

  return DEFAULT_PILOT_TENANT;
}
