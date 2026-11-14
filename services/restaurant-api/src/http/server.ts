import * as http from 'http';
import * as url from 'url';
import {
  sendJson,
  sendHtml,
  parseBody,
  readRawBody,
  parseBuffer,
  extractImageBuffer,
  checkTenantRateLimit,
  isSameOriginRequest,
  resolveRequestIdentity,
  checkTestKillPoint,
  postgresStore,
  eventBus,
  runtimeController,
  razorpayAdapter,
  provisioningService,
  customDomainService,
  ownerSelfService,
  nonceStore,
  pgEventListener,
  getPinnedGrantKeys,
  isProductionEnvironment,
  closeRuntimeServer,
  assertRestaurantOsProductionConfig,
  GSTIN_REGEX,
  restaurantGrantEnforcer,
  incrementTotalRequests,
  recordStatusCount,
  recordMethodCount,
  RequestContext,
  verifyPlatformAuth,
} from './context';
import { router, ensureModulesRegistered } from './router';
import {
  resolveTenantFromRequest,
  withTenantContext,
  validateAndResolveContext,
  validateOrGenerateRequestId,
  logger,
  renderTenantNotFoundPage,
  resolveAllowedOrigin,
  verifyBridgeRequest,
  getDefaultBridgeKeys,
} from '../shared';
import { getTenantRepository } from '../storage';
import { PosService } from '@orbitox-io/pos';

import { renderSuspendedTenantPage } from '../views/pages/invite';

export {
  postgresStore,
  eventBus,
  runtimeController,
  razorpayAdapter,
  provisioningService,
  customDomainService,
  ownerSelfService,
  nonceStore,
  pgEventListener,
  getPinnedGrantKeys,
  isProductionEnvironment,
  closeRuntimeServer,
  assertRestaurantOsProductionConfig,
  GSTIN_REGEX,
  restaurantGrantEnforcer,
  sendJson,
  sendHtml,
  parseBody,
  readRawBody,
  verifyPlatformAuth,
};

export async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  ensureModulesRegistered();

  const parsedUrl = url.parse(req.url || '', true);
  const pathname = parsedUrl.pathname || '/';
  const method = req.method || 'GET';

  res.on('finish', () => {
    incrementTotalRequests();
    recordStatusCount(res.statusCode);
    recordMethodCount(method);
  });

  // 1. Bridge signature verification (MUST run first, before fast pre-tenant or any routes)
  const rawSig = req.headers['x-orbitox-signature'] || req.headers['bridge-signature'] || req.headers['x-bridge-signature'];
  const rawTenantHeader = req.headers['x-tenant-id'] || req.headers['x-orbitox-tenant'] || req.headers['bridge-tenant'];

  let verifiedBridge: { tenantId: string; principal: { sub: string; scopes: string[] } } | null = null;

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
      }
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

  // Fast pre-tenant endpoints (only if not verified bridge)
  if (
    !verifiedBridge &&
    (pathname === '/favicon.ico' ||
      pathname === '/healthz/ready' ||
      pathname === '/ready' ||
      pathname === '/health' ||
      pathname === '/healthz' ||
      pathname === '/healthz/live' ||
      pathname === '/live' ||
      pathname === '/metrics' ||
      pathname.startsWith('/uploads/') ||
      pathname.startsWith('/assets/'))
  ) {
    const dummyContext: RequestContext = {
      pathname,
      method,
      parsedUrl,
      tenantContext: null,
      repo: null as any,
      posService: null as any,
      requestIdentity: { type: 'ANONYMOUS', id: 'anon', isPrivileged: false },
      requestId: validateOrGenerateRequestId(req.headers['x-request-id'] as string),
      params: {},
      sendJson: (statusCode, data) => sendJson(res, statusCode, data),
      sendHtml: (html, statusCode) => sendHtml(res, html, statusCode),
      parseBody: () => parseBody(req),
      readRawBody: () => readRawBody(req),
      parseBuffer: () => parseBuffer(req),
      extractImageBuffer: () => extractImageBuffer(req),
      checkRateLimit: () => ({ allowed: true, remaining: 100, resetSeconds: 60 }),
      checkKillPoint: () => {},
    };
    const handled = await router.dispatch(method, pathname, req, res, dummyContext);
    if (handled) return;
  }

  // Platform internal management endpoints (require platform auth token, bypass public host resolution)
  if (pathname.startsWith('/internal/')) {
    // Caddy On-Demand TLS Ask gatekeeper: Called by reverse proxy to authorize automated SSL issuance
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
      (parsedUrl.query.service || parsedUrl.query.shift) as string
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

    // --- ORBITOX PLUGIN GRANT & ENTITLEMENT ENFORCEMENT (G6) ---
    const activeKeys = getPinnedGrantKeys();
    const shouldEnforceGrants =
      isProductionEnvironment || Object.keys(activeKeys).length > 0;
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
          sendJson(res, status, {
            error: code,
            code,
            message,
          });
          return;
        }

        sendHtml(res, renderSuspendedTenantPage(localTenant?.name || tenantContext.tenantName), status);
        return;
      }
    }

    const reqContext: RequestContext = {
      pathname,
      method,
      parsedUrl,
      tenantContext,
      repo,
      posService,
      requestIdentity,
      activeStaffToken,
      activeStaffRole,
      currentBranch,
      currentFloor,
      serviceShift,
      requestId,
      verifiedBridge,
      params: {},
      sendJson: (statusCode, data) => sendJson(res, statusCode, data),
      sendHtml: (html, statusCode) => sendHtml(res, html, statusCode),
      parseBody: () => parseBody(req),
      readRawBody: () => readRawBody(req),
      parseBuffer: () => parseBuffer(req),
      extractImageBuffer: () => extractImageBuffer(req),
      checkRateLimit: (isStaff) => checkTenantRateLimit(tenantContext.tenantId, isStaff),
      checkKillPoint: (stage) => checkTestKillPoint(req, stage),
    };

    const handled = await router.dispatch(method, pathname, req, res, reqContext);
    if (!handled) {
      sendJson(res, 404, { error: 'NOT_FOUND', message: `Route ${method} ${pathname} not found.` });
    }
  });
}
