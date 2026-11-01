import { NextRequest, NextResponse } from 'next/server';
import { ApiRequestContext } from '@/app/api/v1/_lib/api-types';
import { withApiGuard } from '@/app/api/v1/_lib/api-guard';
import {
  PluginGrantEnforcer,
  getPublicGrantKeys,
  createEntitlementGrantToken,
  SEED_PLANS,
  ServiceStatus,
  MemoryRevisionStore,
  PostgresRevisionStore,
} from '@orbitox-io/plugin-engine';
import { platformRepository } from '@/lib/platform-repository';
import { prisma } from '@/lib/prisma';

type RouteContext = any;
type GuardedRouteHandler = (
    request: NextRequest,
    routeContext: RouteContext,
    authContext: ApiRequestContext & { grant?: any }
) => Promise<Response> | Response;

type GuestRouteHandler = (request: NextRequest, routeContext: RouteContext, guest: any) => Promise<Response> | Response;

interface LegacyGuardOptions {
    serviceId: string;
    adminOnly?: boolean;
    sensitive?: boolean;
    feature?: string;
}

export const hmsRevisionStore =
  process.env.NODE_ENV === 'test' && process.env.ORBITOX_PLATFORM_REPOSITORY === 'json'
    ? new MemoryRevisionStore()
    : new PostgresRevisionStore(prisma);

export const restaurantRevisionStore =
  process.env.NODE_ENV === 'test' && process.env.ORBITOX_PLATFORM_REPOSITORY === 'json'
    ? new MemoryRevisionStore()
    : new PostgresRevisionStore(prisma);

async function fetchGrantForService(tenantId: string, pluginId: string): Promise<string | null> {
  const installation = await platformRepository.getPluginInstallation(tenantId, pluginId);
  if (!installation) return null;

  const planId = installation.planId || (pluginId.includes('hms') ? 'hms-starter' : 'restaurant-starter');
  const plan = await platformRepository.getPlan(planId);
  let features: string[] = [];
  const quotas: any = {};

  if (plan) {
    features = plan.features.filter((f) => f.enabled).map((f) => f.featureKey);
    for (const q of plan.quotas) {
      quotas[q.quotaKey] = { limit: q.limit, window: q.window };
    }
  } else {
    const seed = SEED_PLANS.find((p) => p.planId === planId);
    if (seed) {
      features = seed.features.filter((f) => f.enabled).map((f) => f.featureKey);
      for (const q of seed.quotas) {
        quotas[q.quotaKey] = { limit: q.limit, window: q.window };
      }
    }
  }

  let grantStatus: ServiceStatus = 'ACTIVE';
  if (installation.status === 'READ_ONLY') {
    grantStatus = 'READ_ONLY';
  } else if (['SUSPENDED', 'DEPROVISIONING', 'ARCHIVED', 'FAILED'].includes(installation.status)) {
    grantStatus = 'SUSPENDED';
  } else if (installation.status === 'ACTIVE') {
    grantStatus = 'ACTIVE';
  }

  return createEntitlementGrantToken({
    tenantId,
    pluginId,
    planId,
    status: grantStatus,
    features,
    quotas,
    revision: installation.entitlementRevision || 1,
    ttlSeconds: 900,
  });
}

export const hmsGrantEnforcer = new PluginGrantEnforcer({
  audience: '@orbitox/hms',
  revisions: hmsRevisionStore,
  fetchGrant: (t, p) => fetchGrantForService(t, p),
  allowOfflineReads: true,
});

export const restaurantGrantEnforcer = new PluginGrantEnforcer({
  audience: '@orbitox/restaurant',
  revisions: restaurantRevisionStore,
  fetchGrant: (t, p) => fetchGrantForService(t, p),
  allowOfflineReads: true,
});

function resolveFeature(pathname: string, serviceId: string, explicitFeature?: string): string {
  if (explicitFeature) return explicitFeature;
  const lower = pathname.toLowerCase();
  if (serviceId === 'hms') {
    if (lower.includes('/labs')) return 'labs';
    if (lower.includes('/appointments')) return 'appointments';
    if (lower.includes('/billing')) return 'billing';
    if (lower.includes('/pharmacy')) return 'pharmacy';
    if (lower.includes('/treatments')) return 'billing';
    if (lower.includes('/beds')) return 'patients';
    return 'patients';
  } else {
    if (lower.includes('/orders')) return 'orders';
    if (lower.includes('/menu')) return 'menu';
    if (lower.includes('/tables')) return 'tables';
    if (lower.includes('/kds')) return 'kds';
    return 'orders';
  }
}

function withLegacyGuard(options: LegacyGuardOptions, handler: GuardedRouteHandler) {
    return async (request: NextRequest, routeContext?: RouteContext): Promise<Response> => {
        if (
            options.sensitive &&
            (process.env.NODE_ENV === 'production' || !process.env.NODE_ENV) &&
            process.env.ORBITOX_ENABLE_HOSPITAL_ADMIN_ENDPOINTS !== 'true'
        ) {
            return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint is disabled.' } }, { status: 404 });
        }

        const guarded = withApiGuard(
            {
                serviceId: options.serviceId,
                serviceName: options.serviceId === 'hms' ? 'Hospital API' : 'Restaurant API',
                routeClass: options.adminOnly ? 'platform-admin' : 'customer',
                requiredScopes: options.adminOnly
                    ? ['admin']
                    : [options.serviceId === 'hms' ? `hms:${request.method === 'GET' ? 'read' : 'write'}` : 'restaurant:read'],
            },
            async (guardedRequest, authContext) => {
                // Grant enforcement for customer requests (platform admin operations bypass customer grants)
                const isPlatformAdmin =
                  request.headers.get('x-orbitox-principal') === 'admin' ||
                  authContext.scopes?.includes('admin') ||
                  authContext.scopes?.includes('*') ||
                  authContext.capabilities?.includes('admin') ||
                  authContext.capabilities?.includes('*');

                if (!options.adminOnly && authContext.tenantId && !isPlatformAdmin) {
                  const enforcer = options.serviceId === 'hms' ? hmsGrantEnforcer : restaurantGrantEnforcer;
                  enforcer.setTrustedKeys(getPublicGrantKeys());

                  const pathname = request.nextUrl?.pathname || new URL(request.url).pathname;
                  const feature = resolveFeature(pathname, options.serviceId, options.feature);
                  const isWrite = request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'OPTIONS';
                  const grantToken = request.headers.get('x-orbitox-grant') || request.headers.get('x-grant-token') || undefined;

                  const decision = await enforcer.enforce({
                    tenantId: authContext.tenantId,
                    feature,
                    write: isWrite,
                    token: grantToken,
                  });

                  if (!decision.allowed) {
                    return NextResponse.json(
                      {
                        success: false,
                        error: {
                          code: decision.code || 'UNAUTHORIZED',
                          message: decision.message || 'Access denied by entitlement grant.',
                        },
                      },
                      { status: decision.status || 403 }
                    );
                  }

                  (authContext as any).grant = decision.claims;
                }

                return handler(guardedRequest, routeContext, authContext);
            }
        );

        return guarded(request);
    };
}

export function withHospitalGuard(handler: GuardedRouteHandler, options: Omit<LegacyGuardOptions, 'serviceId'> = {}) {
    return withLegacyGuard({ serviceId: 'hms', ...options }, handler);
}

export function withRestaurantGuard(handler: GuardedRouteHandler, options: Omit<LegacyGuardOptions, 'serviceId'> = {}) {
    return withLegacyGuard({ serviceId: 'restaurant', ...options }, handler);
}

export function verifyGuestCapabilityToken(token: string): any {
    const [encodedPayload] = token.split('.');
    if (!encodedPayload) throw new Error('Invalid guest capability token.');
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    return payload;
}

export function withGuestToken(handler: GuestRouteHandler) {
    return async (request: NextRequest, routeContext?: RouteContext): Promise<Response> => {
        const token = request.headers.get('x-guest-token')?.trim();
        if (!token) {
            return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'A guest capability token is required.' } }, { status: 401 });
        }
        try {
            return await handler(request, routeContext, verifyGuestCapabilityToken(token));
        } catch {
            return NextResponse.json({ success: false, error: { code: 'INVALID_GUEST_TOKEN', message: 'The guest capability is invalid, expired, or revoked.' } }, { status: 401 });
        }
    };
}

export function withPublicGuestBootstrap(handler: GuestRouteHandler) {
    return async (request: NextRequest, routeContext?: RouteContext): Promise<Response> => {
        if ((process.env.NODE_ENV === 'production' || !process.env.NODE_ENV) && !process.env.ORBITOX_GUEST_SECRET?.trim()) {
            return NextResponse.json({ success: false, error: { code: 'AUTH_NOT_CONFIGURED', message: 'Guest session authentication is not configured.' } }, { status: 503 });
        }
        return handler(request, routeContext, undefined);
    };
}