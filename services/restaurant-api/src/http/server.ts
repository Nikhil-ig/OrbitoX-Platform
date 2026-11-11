/**
 * 🍷 RestaurantOS — HTTP Server & Domain Route Dispatcher
 */

import * as http from 'http';
import * as url from 'url';
import {
  validateAndResolveContext,
  resolveAllowedOrigin,
  validateOrGenerateRequestId,
  logger,
  resolveTenantFromRequest,
  withTenantContext,
  renderTenantNotFoundPage,
  verifyPlatformAuth,
  verifyBridgeRequest,
  getDefaultBridgeKeys,
} from '../../packages/domain';
import { getTenantRepository } from '../../packages/storage';
import { PosService } from '@orbitox-io/pos';
import { renderSuspendedTenantPage } from '../../packages/ui';
import {
  PORT,
  HOSTNAME,
  isProductionEnvironment,
  eventBus,
  postgresStore,
  customDomainService,
  nonceStore,
  pgEventListener,
  getPinnedGrantKeys,
  restaurantGrantEnforcer,
  closeRuntimeServer,
  incrementTotalRequests,
  assertRestaurantOsProductionConfig,
  GSTIN_REGEX,
} from '../shared/state';
import { readRawBody, sendJson, sendHtml, isSameOriginRequest } from './middleware';
import { resolveRequestIdentity, checkTenantRateLimit } from './identity';
import { handleHealthSystemRoutes } from './health';
import { handleProbesAndEventsRoutes } from '../shared/events';
import type { PreTenantRouteContext, TenantRouteContext, VerifiedBridgeContext } from './types';

// Domain Route Handlers
import { handleAuthRoutes } from '../modules/auth';
import { handleTenancyRoutes } from '../modules/tenancy';
import { handleProvisioningRoutes } from '../modules/provisioning';
import { handleMenuRoutes } from '../modules/menu';
import { handleOrdersRoutes } from '../modules/orders';
import { handleTablesRoutes } from '../modules/tables';
import { handleKitchenRoutes } from '../modules/kitchen';
import { handlePaymentsRoutes } from '../modules/payments';
import { handleInvoicingRoutes } from '../modules/invoicing';
import { handleDinersRoutes } from '../modules/diners';
import { handleOwnersRoutes } from '../modules/owners';
import { handleSupportRoutes } from '../modules/support';
import { handleLegacyUiRoutes } from '../views';

export {
  isProductionEnvironment,
  pgEventListener,
  postgresStore,
  getPinnedGrantKeys,
  restaurantGrantEnforcer,
  closeRuntimeServer,
  assertRestaurantOsProductionConfig,
  GSTIN_REGEX,
};

const TENANT_ROUTE_HANDLERS: Array<(ctx: TenantRouteContext) => Promise<boolean>> = [
  handleTenancyRoutes,
  handleAuthRoutes,
  handleProbesAndEventsRoutes,
  handleOrdersRoutes,
  handlePaymentsRoutes,
  handleInvoicingRoutes,
  handleKitchenRoutes,
  handleTablesRoutes,
  handleOwnersRoutes,
  handleSupportRoutes,
  handleMenuRoutes,
  handleDinersRoutes,
  handleLegacyUiRoutes,
];

export async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const parsedUrl = url.parse(req.url || '', true);
  const pathname = parsedUrl.pathname || '/';
  const method = req.method || 'GET';

  if (pathname === '/favicon.ico') {
    res.writeHead(204, { 'Content-Type': 'image/x-icon' });
    res.end();
    return;
  }

  res.on('finish', () => {
    incrementTotalRequests(res.statusCode, method);
  });

  // --- ORBITOX PLATFORM BRIDGE SIGNATURE & TENANT VERIFICATION ---
  const rawSig = req.headers['x-orbitox-signature'] || req.headers['bridge-signature'] || req.headers['x-bridge-signature'];
  const rawTenantHeader = req.headers['x-tenant-id'] || req.headers['x-orbitox-tenant'] || req.headers['bridge-tenant'];

  let verifiedBridge: VerifiedBridgeContext | null = null;
  if (rawSig) {
    const rawBody = await readRawBody(req);
    const verifyRes = await verifyBridgeRequest(
      getDefaultBridgeKeys(),
      nonceStore,
      {
        method,
        pathWithQuery: req.url || '/',
        headers: req.headers as Record<string, string | undefined>,
        rawBody,
      },
    );
    if (!verifyRes.ok) {
      const failReason = (verifyRes as any).reason;
      sendJson(res, 401, {
        error: 'UNAUTHORIZED',
        code: failReason,
        message: `Bridge signature verification failed: ${failReason}`,
      });
      return;
    }
    verifiedBridge = { tenantId: verifyRes.tenantId, principal: verifyRes.principal };
  }

  const preCtx: PreTenantRouteContext = { req, res, pathname, method, parsedUrl, verifiedBridge };
  if (await handleHealthSystemRoutes(preCtx)) {
    return;
  }

  // Platform internal management endpoints (require platform auth token, bypass public host resolution)
  if (pathname.startsWith('/internal/')) {
    if (pathname === '/internal/tls/ask' && method === 'GET') {
      const askDomain = (parsedUrl.query.domain as string) || '';
      const allowed = await customDomainService.isDomainAllowedForTls(askDomain);
      if (allowed) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
      } else {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('FORBIDDEN: Domain not permitted for TLS');
      }
      return;
    }

    if (!verifyPlatformAuth(req)) {
      sendJson(res, 401, {
        error: 'UNAUTHORIZED',
        message: 'Platform service credentials required (RESTAURANTOS_PLATFORM_TOKEN >= 32 chars).',
      });
      return;
    }
  }

  // Authoritative host-based tenant resolution
  let tenantContext: any = null;
  if (verifiedBridge) {
    const targetTenantId = verifiedBridge.tenantId;
    const dbTenant = postgresStore?.prisma ? await postgresStore.prisma.tenant.findFirst({
      where: { OR: [{ id: targetTenantId }, { slug: targetTenantId }, { orbitoxProjectId: targetTenantId }] },
    }).catch(() => null) : null;

    if (dbTenant) {
      tenantContext = {
        tenantId: dbTenant.id,
        tenantSlug: dbTenant.slug,
        tenantName: dbTenant.name,
        orbitoxProjectId: dbTenant.orbitoxProjectId || `restaurant-os-${dbTenant.slug}`,
        status: dbTenant.status,
        planId: dbTenant.planId,
        entitlementRevision: dbTenant.entitlementRevision,
        isPlatform: true,
      };
    } else {
      tenantContext = {
        tenantId: targetTenantId,
        tenantSlug: targetTenantId.replace(/^org\/[^/]+\/project\/[^/]+\/environment\//, '').replace(/^tenant_/, '').replace(/[^a-z0-9-]/g, '-'),
        tenantName: 'Signed Bridge Tenant',
        orbitoxProjectId: targetTenantId,
        status: 'active',
        isPlatform: true,
      };
    }
  } else {
    tenantContext = await resolveTenantFromRequest(req, postgresStore?.prisma);
  }

  if (!tenantContext) {
    if (
      pathname.startsWith('/internal/') ||
      pathname.startsWith('/orbitox/lifecycle') ||
      pathname.startsWith('/orbitox/data-rights')
    ) {
      tenantContext = {
        tenantId: 'PLATFORM_SUPERUSER',
        tenantSlug: 'platform',
        tenantName: 'Platform Superuser',
        orbitoxProjectId: 'platform',
        status: 'active',
      };
    } else if (pathname === '/accept-invite' || pathname === '/api/restaurant/auth/accept-invite') {
      tenantContext = {
        tenantId: 'PENDING_INVITE',
        tenantSlug: 'invite',
        tenantName: 'Pending Restaurant',
        status: 'trial',
      };
    } else {
      const rawHost = (req.headers.host || '').split(':')[0].trim();
      if (rawTenantHeader && !rawSig) {
        sendJson(res, 401, {
          error: 'UNAUTHORIZED',
          code: 'UNVERIFIED_CLIENT_TENANT_HEADER',
          message: 'Client-supplied x-tenant-id rejected: requests carrying tenant headers must be signed via bridge-signature.',
        });
        return;
      }
      const acceptHeader = (req.headers.accept || '').toLowerCase();
      if (acceptHeader.includes('text/html')) {
        sendHtml(res, renderTenantNotFoundPage(rawHost || 'unknown'), 404);
      } else {
        sendJson(res, 404, {
          error: 'NOT_FOUND',
          code: 'TENANT_NOT_FOUND',
          message: `No restaurant tenant configured for host: ${rawHost || 'unknown'}`,
        });
      }
      return;
    }
  }

  preCtx.tenantContext = tenantContext;
  if (await handleProvisioningRoutes(preCtx)) {
    return;
  }

  res.setHeader('x-tenant-id', tenantContext.tenantId);
  return withTenantContext(tenantContext, async () => {
    const repo = getTenantRepository(tenantContext, postgresStore?.prisma, eventBus);
    const posService = new PosService(repo);
    const startHrTime = process.hrtime.bigint();
    const rawReqId = req.headers['x-request-id'] || req.headers['x-correlation-id'];
    const requestId = validateOrGenerateRequestId(rawReqId);
    res.setHeader('x-request-id', requestId);

    const branches = await repo.getBranches();
    const floors = await repo.getFloors();
    const context = validateAndResolveContext(
      branches,
      floors,
      parsedUrl.query.branch as string,
      parsedUrl.query.floor as string,
      (parsedUrl.query.service || parsedUrl.query.shift) as string,
    );

    const currentBranch = (await repo.getBranch(context.branchId)) || branches[0];
    const currentFloor = (await repo.getFloor(context.floorId)) || floors[0];
    const serviceShift = context.serviceName;

    res.on('finish', () => {
      if (pathname === '/favicon.ico') return;
      const durationNs = process.hrtime.bigint() - startHrTime;
      const durationMs = Math.round(Number(durationNs) / 10_000) / 100;
      logger.log({
        timestamp: new Date().toISOString(),
        level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
        message: `${method} ${pathname} ${res.statusCode} (${durationMs}ms)`,
        requestId,
        tenantId: tenantContext.tenantId,
        method,
        pathname,
        status: res.statusCode,
        durationMs,
        branchId: currentBranch?.id,
      });
    });

    const requestIdentity: any = verifiedBridge
      ? {
          type: 'PLATFORM_BRIDGE',
          id: verifiedBridge.principal.sub,
          role: 'ADMIN',
          isPrivileged: true,
          scopes: verifiedBridge.principal.scopes,
          tenantId: tenantContext.tenantId,
          authSource: 'BRIDGE_SIGNATURE',
        }
      : await resolveRequestIdentity(req, tenantContext.tenantId, repo);
    const activeStaffToken = requestIdentity.rawToken;
    const activeStaffRole = requestIdentity.role || (requestIdentity.type === 'ADMIN' ? 'ADMIN' : undefined);

    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && requestIdentity.authSource === 'COOKIE') {
      if (!isSameOriginRequest(req)) {
        sendJson(res, 403, {
          error: 'CSRF_REJECTED',
          code: 'CSRF_REJECTED',
          message: 'Cross-origin mutation rejected by CSRF protection policy.',
        });
        return;
      }
    }

    if (method === 'OPTIONS') {
      const allowedOrigin = resolveAllowedOrigin(req);
      const headers: Record<string, string> = {
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-idempotency-key, x-session-id, x-order-token, x-request-id, x-correlation-id, x-station-token',
        'Access-Control-Expose-Headers': 'x-request-id',
      };
      if (allowedOrigin) {
        headers['Access-Control-Allow-Origin'] = allowedOrigin;
        headers['Vary'] = 'Origin';
        headers['Access-Control-Allow-Credentials'] = 'true';
      }
      res.writeHead(204, headers);
      res.end();
      return;
    }

    if (!pathname.startsWith('/internal/') && pathname !== '/health' && pathname !== '/manifest.json') {
      const isStaffReq = Boolean(activeStaffToken) || requestIdentity.type === 'STAFF' || requestIdentity.type === 'ADMIN' || requestIdentity.type === 'STATION';
      const rateLimit = checkTenantRateLimit(tenantContext.tenantId, isStaffReq);
      res.setHeader('x-ratelimit-remaining', String(rateLimit.remaining));
      if (!rateLimit.allowed) {
        res.setHeader('retry-after', String(rateLimit.resetSeconds));
        sendJson(res, 429, {
          error: 'RATE_LIMIT_EXCEEDED',
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests for tenant ${tenantContext.tenantId}. Please retry after ${rateLimit.resetSeconds}s.`,
        });
        return;
      }
    }

    if (pathname === '/manifest.json' && method === 'GET') {
      const brand = await repo.getTenantBrand();
      const manifest = {
        name: brand?.restaurantName || tenantContext.tenantName,
        short_name: brand?.restaurantName || tenantContext.tenantSlug,
        description: brand?.tagline || `${brand?.restaurantName || tenantContext.tenantName} digital dining experience`,
        start_url: '/',
        display: 'standalone',
        theme_color: brand?.primaryColor || '#C86B3C',
        background_color: '#080A0D',
        icons: [
          {
            src: brand?.logoUrl || brand?.faviconUrl || '/favicon.ico',
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      };
      res.writeHead(200, {
        'Content-Type': 'application/manifest+json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      });
      res.end(JSON.stringify(manifest, null, 2));
      return;
    }

    const isTestOrDebugRoute =
      pathname.startsWith('/api/test/') ||
      pathname.startsWith('/debug/') ||
      pathname === '/debug' ||
      pathname.startsWith('/api/restaurant/test/') ||
      pathname === '/api/restaurant/reseed';

    if (isTestOrDebugRoute && process.env.RESTAURANTOS_ENABLE_TEST_ROUTES !== 'true') {
      sendJson(res, 404, {
        error: 'NOT_FOUND',
        code: 'NOT_FOUND',
        message: 'Endpoint not found or test routes disabled.',
      });
      return;
    }

    if (process.env.NODE_ENV !== 'production' && pathname === '/api/test/inject-task' && method === 'POST') {
      const { parseBody } = await import('./middleware');
      const body = await parseBody(req);
      await repo.addKitchenTask(body);
      sendJson(res, 200, { success: true, task: body });
      return;
    }

    const activeKeys = getPinnedGrantKeys();
    const shouldEnforceGrants = isProductionEnvironment || Object.keys(activeKeys).length > 0;
    const localTenant = postgresStore ? await postgresStore.getTenant(tenantContext.tenantId) : null;
    const isLocallySuspended = localTenant?.status === 'suspended' || tenantContext.status === 'suspended';

    if (
      postgresStore &&
      (shouldEnforceGrants || isLocallySuspended) &&
      !pathname.startsWith('/internal/') &&
      !pathname.startsWith('/orbitox/lifecycle') &&
      !pathname.startsWith('/orbitox/data-rights') &&
      !pathname.startsWith('/api/platform/lifecycle') &&
      !pathname.startsWith('/health') &&
      !pathname.startsWith('/metrics') &&
      !pathname.startsWith('/ready') &&
      !pathname.startsWith('/live') &&
      !pathname.startsWith('/uploads/') &&
      !pathname.startsWith('/assets/') &&
      pathname !== '/favicon.ico' &&
      tenantContext.tenantId !== 'PLATFORM_SUPERUSER' &&
      tenantContext.tenantId !== 'PENDING_INVITE'
    ) {
      const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
      let targetFeature = 'orders';
      if (pathname.startsWith('/api/restaurant/menu') || pathname.startsWith('/menu')) {
        targetFeature = 'menu';
      } else if (pathname.startsWith('/api/restaurant/tables') || pathname.startsWith('/tables') || pathname.startsWith('/floor')) {
        targetFeature = 'tables';
      } else if (pathname.startsWith('/api/restaurant/kds') || pathname.startsWith('/kds')) {
        targetFeature = 'kds';
      }

      const grantHeader = (req.headers['x-orbitox-grant'] || req.headers['x-entitlement-grant']) as string | undefined;
      if (Object.keys(activeKeys).length > 0) {
        restaurantGrantEnforcer.setTrustedKeys(activeKeys);
      }

      const grantDecision = shouldEnforceGrants
        ? await restaurantGrantEnforcer.enforce({
            tenantId: tenantContext.tenantId,
            feature: targetFeature,
            write: isWrite,
            token: grantHeader,
          })
        : { allowed: true };

      if (!grantDecision.allowed || isLocallySuspended) {
        if (isLocallySuspended) {
          if (isWrite) {
            sendJson(res, 403, {
              error: 'SERVICE_SUSPENDED',
              code: 'SERVICE_SUSPENDED',
              tenantSuspended: true,
              serviceSuspended: true,
              message: 'This restaurant account is temporarily suspended. Writes are disabled.',
            });
            return;
          }
          if (method === 'GET' && (pathname === '/' || pathname.startsWith('/dine') || pathname.startsWith('/kds') || pathname.startsWith('/swift-bite') || pathname.startsWith('/crave-atlas') || pathname.startsWith('/operations') || req.headers.accept?.toLowerCase().includes('text/html'))) {
            sendHtml(res, renderSuspendedTenantPage(localTenant?.name || tenantContext.tenantName), 403);
            return;
          }
        }

        const code = grantDecision.code || 'SERVICE_SUSPENDED';
        const status = grantDecision.status || 403;
        const message = grantDecision.message || 'This restaurant account is temporarily suspended.';

        if (isWrite || !req.headers.accept?.toLowerCase().includes('text/html')) {
          sendJson(res, status, { error: code, code, message });
          return;
        } else {
          sendHtml(res, renderSuspendedTenantPage(localTenant?.name || tenantContext.tenantName), status);
          return;
        }
      }
    }

    const routeCtx: TenantRouteContext = {
      req,
      res,
      pathname,
      method,
      parsedUrl,
      tenantContext,
      repo,
      posService,
      branches,
      floors,
      context,
      currentBranch,
      currentFloor,
      serviceShift,
      requestIdentity,
      activeStaffToken,
      activeStaffRole,
    };

    for (const handler of TENANT_ROUTE_HANDLERS) {
      if (await handler(routeCtx)) {
        return;
      }
    }

    sendJson(res, 404, { error: `Route not found: ${pathname}` });
  });
}

export function createServer(): http.Server {
  return http.createServer(handleRequest);
}

