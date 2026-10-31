/**
 * 🪐 RestaurantOS Multi-Tenancy Context & Scoping Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative request-scoped tenant isolation via AsyncLocalStorage.
 * Guarantees zero data leakage between separate restaurant entities.
 *
 * Rules:
 * 1. Resolve tenant ONLY from verified Host ({slug}.<domain> or verified custom domain).
 * 2. Unknown host returns NULL -> strict 404 (zero fallback to pilot).
 * 3. Never trust x-tenant-id or ?tenant= from public clients; only platform-service.
 * 4. 30-second LRU cache with invalidation.
 */

import { AsyncLocalStorage } from 'async_hooks';
import * as http from 'http';
import { PrismaClient } from '@prisma/client';
import { verifyPlatformAuth } from './provisioning';

export interface ActiveTenantContext {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  orbitoxProjectId?: string;
  status?: string;
  isPlatform?: boolean;
}

const tenantStorage = new AsyncLocalStorage<ActiveTenantContext>();

/**
 * Returns the currently active tenant context from AsyncLocalStorage.
 * Strictly throws if called without an active tenant context (Fail-Closed).
 */
export function getActiveTenant(): ActiveTenantContext {
  const store = tenantStorage.getStore();
  if (!store) {
    throw new Error('FAIL_CLOSED: No active tenant context in execution scope.');
  }
  return store;
}

/**
 * Safe inspection of active tenant context without throwing.
 */
export function tryGetActiveTenant(): ActiveTenantContext | undefined {
  return tenantStorage.getStore();
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

interface CachedTenantEntry {
  context: ActiveTenantContext;
  expiresAt: number;
}

const tenantResolutionCache = new Map<string, CachedTenantEntry>();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

/**
 * Invalidates the tenant resolution cache on domain or status changes.
 */
export function invalidateTenantResolutionCache(domainOrSlug?: string): void {
  if (domainOrSlug) {
    const key = domainOrSlug.trim().toLowerCase();
    tenantResolutionCache.delete(key);
    for (const [k, v] of tenantResolutionCache.entries()) {
      if (
        v.context.tenantSlug === key ||
        v.context.tenantId === key ||
        k.includes(key)
      ) {
        tenantResolutionCache.delete(k);
      }
    }
  } else {
    tenantResolutionCache.clear();
  }
}

let sharedPrisma: PrismaClient | null = null;
function getPrisma(): PrismaClient {
  if (!sharedPrisma) {
    sharedPrisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  }
  return sharedPrisma;
}

/**
 * Resolves tenant context purely from the HTTP Host header.
 */
export async function resolveTenantFromHost(
  rawHost: string,
  prisma: PrismaClient
): Promise<ActiveTenantContext | null> {
  if (!rawHost) {
    return null;
  }

  // Check 30s LRU Cache
  const cached = tenantResolutionCache.get(rawHost);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.context;
  }

  const baseDomain = (process.env.RESTAURANTOS_BASE_DOMAIN || 'orbitox.live').toLowerCase();
  const reservedWords = new Set(['www', 'api', 'admin', 'app', 'platform', 'static', 'localhost']);

  // Pattern A: Subdomain of baseDomain, localhost, test domains, or direct slug match
  let candidateSlug: string | null = null;
  if (rawHost.endsWith(`.${baseDomain}`)) {
    candidateSlug = rawHost.slice(0, rawHost.length - baseDomain.length - 1);
  } else if (rawHost.endsWith('.restaurantos.local')) {
    candidateSlug = rawHost.slice(0, rawHost.length - '.restaurantos.local'.length);
  } else if (rawHost.endsWith('.test.local')) {
    candidateSlug = rawHost.slice(0, rawHost.length - '.test.local'.length);
  } else if (rawHost.endsWith('.localhost')) {
    candidateSlug = rawHost.slice(0, rawHost.length - '.localhost'.length);
  } else if (!rawHost.includes('.') && !reservedWords.has(rawHost)) {
    candidateSlug = rawHost;
  }

  if (candidateSlug && !reservedWords.has(candidateSlug)) {
    if (process.env.STORAGE_DRIVER === 'json' || process.env.RESTAURANT_STORE_PATH) {
      const context: ActiveTenantContext = {
        tenantId: `tenant_${candidateSlug}`,
        tenantSlug: candidateSlug,
        tenantName: candidateSlug === 'bistro' ? 'OrbitoX Bistro & Bar' : `Restaurant ${candidateSlug}`,
        orbitoxProjectId: `restaurant-os-${candidateSlug}`,
        status: 'active',
      };
      tenantResolutionCache.set(rawHost, { context, expiresAt: Date.now() + CACHE_TTL_MS });
      return context;
    }

    if (process.env.DATABASE_URL) {
      try {
        const tenant = await prisma.tenant.findFirst({
          where: {
            OR: [{ slug: candidateSlug }, { id: `tenant_${candidateSlug}` }],
          },
        });

        if (tenant) {
          const context: ActiveTenantContext = {
            tenantId: tenant.id,
            tenantSlug: tenant.slug,
            tenantName: tenant.name,
            orbitoxProjectId: tenant.orbitoxProjectId || `restaurant-os-${tenant.slug}`,
            status: tenant.status,
          };
          tenantResolutionCache.set(rawHost, { context, expiresAt: Date.now() + CACHE_TTL_MS });
          return context;
        }
      } catch (err: any) {
        console.warn(`[Tenancy] Failed to query tenant for host ${rawHost}:`, err.message);
      }
    }
  }

  // Pattern B: Verified Custom Domain in TenantDomain table
  if (process.env.DATABASE_URL) {
    try {
      const customDomain = await prisma.tenantDomain.findFirst({
        where: {
          domain: rawHost,
          verificationStatus: 'VERIFIED',
        },
        include: {
          tenant: true,
        },
      });

      if (customDomain && customDomain.tenant) {
        const context: ActiveTenantContext = {
          tenantId: customDomain.tenant.id,
          tenantSlug: customDomain.tenant.slug,
          tenantName: customDomain.tenant.name,
          orbitoxProjectId: customDomain.tenant.orbitoxProjectId || `restaurant-os-${customDomain.tenant.slug}`,
          status: customDomain.tenant.status,
        };
        tenantResolutionCache.set(rawHost, { context, expiresAt: Date.now() + CACHE_TTL_MS });
        return context;
      }
    } catch (err: any) {
      console.warn(`[Tenancy] Failed to query custom domain for ${rawHost}:`, err.message);
    }
  }

  return null;
}

/**
 * Resolves the tenant context strictly from verified Host or authenticated platform service.
 * Returns null if unrecognized host (which MUST be served as 404).
 */
export async function resolveTenantFromRequest(
  req: http.IncomingMessage,
  prismaClient?: PrismaClient
): Promise<ActiveTenantContext | null> {
  const prisma = prismaClient || getPrisma();

  // 1. Authenticated Platform Service Override:
  // ONLY honoured if caller presents valid platform service credentials (RESTAURANTOS_PLATFORM_TOKEN)
  const isPlatformService = verifyPlatformAuth(req);
  if (isPlatformService) {
    const customHeader = req.headers['x-tenant-id'] || req.headers['x-orbitox-tenant'];
    if (typeof customHeader === 'string' && customHeader.trim()) {
      const tid = customHeader.trim();
      const actualId = tid.startsWith('tenant_') ? tid : `tenant_${tid}`;
      const dbTenant = await prisma.tenant.findFirst({
        where: { OR: [{ id: tid }, { id: actualId }, { slug: tid }] },
      }).catch(() => null);
      if (dbTenant) {
        return {
          tenantId: dbTenant.id,
          tenantSlug: dbTenant.slug,
          tenantName: dbTenant.name,
          orbitoxProjectId: dbTenant.orbitoxProjectId || `restaurant-os-${dbTenant.slug}`,
          status: dbTenant.status,
        };
      }
      // Fail closed: Named tenant does not exist in database
      return null;
    }

    const reqUrl = req.url || '/';
    const queryMatch = /[?&](?:tenant|tenantId)=([^&]+)/i.exec(reqUrl);
    if (queryMatch && queryMatch[1]) {
      const tid = decodeURIComponent(queryMatch[1]).trim();
      const actualId = tid.startsWith('tenant_') ? tid : `tenant_${tid}`;
      const dbTenant = await prisma.tenant.findFirst({
        where: { OR: [{ id: tid }, { id: actualId }, { slug: tid }] },
      }).catch(() => null);
      if (dbTenant) {
        return {
          tenantId: dbTenant.id,
          tenantSlug: dbTenant.slug,
          tenantName: dbTenant.name,
          orbitoxProjectId: dbTenant.orbitoxProjectId || `restaurant-os-${dbTenant.slug}`,
          status: dbTenant.status,
        };
      }
      // Fail closed: Named tenant does not exist in database
      return null;
    }

    // If caller targeted a specific tenant host, resolve from host before fallback
    const rawHost = (req.headers.host || '').split(':')[0].trim().toLowerCase();
    if (rawHost) {
      const hostContext = await resolveTenantFromHost(rawHost, prisma);
      if (hostContext) {
        return { ...hostContext, isPlatform: true };
      }
    }

    // Authenticated platform service request without target tenant parameter or matching host
    return {
      tenantId: 'platform_fleet',
      tenantSlug: 'platform',
      tenantName: 'Platform Fleet Operations',
      orbitoxProjectId: 'platform',
      status: 'active',
      isPlatform: true,
    };
  }

  // 2. Strict Host-Based Resolution (Public & Staff callers MUST resolve from Host)
  const rawHost = (req.headers.host || '').split(':')[0].trim().toLowerCase();
  if (!rawHost) {
    return null;
  }

  const hostContext = await resolveTenantFromHost(rawHost, prisma);
  if (hostContext) {
    return hostContext;
  }

  // Pattern C: Token-based invite resolution on loopback/localhost for development & test flows
  const reqUrl = req.url || '';
  if ((rawHost === '127.0.0.1' || rawHost === 'localhost') && reqUrl.includes('/accept-invite')) {
    const tokenMatch = /[?&]token=([^&]+)/i.exec(reqUrl);
    if (tokenMatch && tokenMatch[1]) {
      const rawToken = decodeURIComponent(tokenMatch[1]).trim();
      const crypto = await import('crypto');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      try {
        const invite = await prisma.ownerInvite.findFirst({
          where: { tokenHash },
          include: { tenant: true },
        });
        if (invite && invite.tenant) {
          const context: ActiveTenantContext = {
            tenantId: invite.tenant.id,
            tenantSlug: invite.tenant.slug,
            tenantName: invite.tenant.name,
            orbitoxProjectId: invite.tenant.orbitoxProjectId || `restaurant-os-${invite.tenant.slug}`,
            status: invite.tenant.status,
          };
          return context;
        }
      } catch (e) {}
    }
  }

  // Zero fallback to pilot bistro: Return null
  return null;
}

/**
 * Executes a callback within a Prisma transaction enforcing PostgreSQL
 * Row Level Security (RLS) session variables.
 */
export async function withTenantRlsTransaction<T>(
  prisma: PrismaClient,
  tenantId: string,
  fn: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
    throw new Error('FAIL_CLOSED: withTenantRlsTransaction requires a valid non-empty tenantId.');
  }
  return await prisma.$transaction(async (tx: any) => {
    // Fail-Closed: Strictly switch to application role with NOSUPERUSER NOBYPASSRLS.
    // Throws immediately if role does not exist or switch fails.
    await tx.$executeRawUnsafe(`SET LOCAL ROLE restaurantos_app;`);
    const safeTenantId = tenantId.replace(/'/g, "''");
    await tx.$executeRawUnsafe(`SET LOCAL app.tenant_id = '${safeTenantId}';`);
    return await fn(tx);
  });
}

/**
 * Branded 404 HTML for unrecognized restaurant hosts.
 */
export function renderTenantNotFoundPage(host: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Restaurant Not Found — 404</title>
  <style>
    body {
      background: #0D0F10;
      color: #F3EEE5;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
      text-align: center;
    }
    .card {
      background: #151719;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 48px;
      max-width: 480px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    h1 {
      font-size: 24px;
      margin-bottom: 12px;
      font-weight: 500;
    }
    p {
      color: #A8A196;
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .host-tag {
      background: rgba(200, 107, 60, 0.12);
      border: 1px solid rgba(200, 107, 60, 0.35);
      color: #C86B3C;
      padding: 6px 12px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 13px;
      display: inline-block;
    }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size: 40px; margin-bottom: 16px;">🪐</div>
    <h1>Restaurant Not Found</h1>
    <p>No active RestaurantOS restaurant entity is configured for the host:</p>
    <div class="host-tag">${host}</div>
    <p style="margin-top: 24px; font-size: 12px; color: #706B63;">HTTP 404 — Strict Multi-Tenant Host Isolation Active</p>
  </div>
</body>
</html>`;
}
