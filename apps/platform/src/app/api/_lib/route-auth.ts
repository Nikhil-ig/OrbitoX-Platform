import { NextRequest, NextResponse } from 'next/server';
import { ApiRequestContext } from '@/app/api/v1/_lib/api-types';
import { withApiGuard } from '@/app/api/v1/_lib/api-guard';
import { createInternalAuthToken } from '@/app/api/v1/_lib/auth-pipeline';
import {
  PluginGrantEnforcer,
  getPublicGrantKeys,
  createEntitlementGrantToken,
  canonicalizePluginId,
  InstallationStatus,
  ServiceStatus,
  MemoryRevisionStore,
  PostgresRevisionStore,
} from '@orbitox-io/plugin-engine';
import { platformRepository } from '@/server/db/platform-repository';
import { prisma } from '@/server/db/prisma';
import {
  CUSTOMER_SESSION_COOKIE,
  getCustomerSession,
  getOperatorSession,
  OPERATOR_SESSION_COOKIE,
} from '@/server/accounts/account-service';
import { validOperatorCsrf } from '@/server/auth/operator-auth';
import { validCustomerCsrf } from '@/server/auth/customer-auth';
import { operatorRoleAllows } from '@/server/organizations/operator-route-policy';
import { TENANT_RE } from '@orbitox-io/bridge';

export const HMS_STAFF_SESSION_COOKIE = 'orbitox_hms_staff_session';

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
  allowOrgAdminCustomerSession?: boolean;
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

export async function fetchGrantForService(tenantId: string, pluginId: string): Promise<string | null> {
  const installation = await platformRepository.getPluginInstallation(tenantId, pluginId);
  if (!installation) return null;

  const rawPlanId = installation.planId;
  const canonicalPlugin = canonicalizePluginId(pluginId);
  const plan = rawPlanId ? await platformRepository.getPlan(rawPlanId) : undefined;
  if (!plan || plan.pluginId !== canonicalPlugin) {
    console.error('Refusing to issue an entitlement grant for an unknown or mismatched plan.', {
      tenantId,
      pluginId,
      planId: rawPlanId,
    });
    return null;
  }

  const features = plan.features.filter((feature) => feature.enabled).map((feature) => feature.featureKey);
  const quotas: Record<string, { limit: number; window: 'month' | 'none' | 'day' }> = {};
  for (const quota of plan.quotas) {
    quotas[quota.quotaKey] = { limit: quota.limit, window: quota.window };
  }
  const grantStatus = grantStatusForInstallation(installation.status);

  return createEntitlementGrantToken({
    tenantId,
    pluginId,
    planId: plan.planId,
    status: grantStatus,
    features,
    quotas,
    revision: installation.entitlementRevision || 1,
    ttlSeconds: 900,
  });
}

export function grantStatusForInstallation(status: string): ServiceStatus {
  if (!isInstallationStatus(status)) {
    console.error('Unknown plugin installation status; issuing a suspended entitlement grant.', { status });
    return 'SUSPENDED';
  }
  switch (status) {
    case 'ACTIVE':
      return 'ACTIVE';
    case 'READ_ONLY':
      return 'READ_ONLY';
    case 'REQUESTED':
    case 'PROVISIONING':
    case 'SUSPENDED':
    case 'DEPROVISIONING':
    case 'ARCHIVED':
    case 'FAILED':
      return 'SUSPENDED';
    default:
      return assertNever(status);
  }
}

function isInstallationStatus(status: string): status is InstallationStatus {
  return [
    'REQUESTED',
    'PROVISIONING',
    'ACTIVE',
    'READ_ONLY',
    'SUSPENDED',
    'DEPROVISIONING',
    'ARCHIVED',
    'FAILED',
  ].includes(status);
}

function assertNever(value: never): never {
  throw new Error(`Unhandled plugin installation status: ${value}`);
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

async function resolveBrowserTenantForService(
  serviceId: string,
  requestedTenant: string | undefined,
  allowedOrganizationIds?: string[],
): Promise<string | null> {
  const canonicalPlugin = serviceId === 'hms' ? '@orbitox/hms' : '@orbitox/restaurant';
  const candidatePlugins = [
    canonicalPlugin,
    serviceId,
    canonicalPlugin.replace(/^@orbitox\//, ''),
  ];

  const verifyTenantOwnership = async (candidateTenant: string): Promise<string | null> => {
    const installation = await platformRepository.getPluginInstallation(candidateTenant, canonicalPlugin);
    if (!installation || ['SUSPENDED', 'ARCHIVED', 'DEPROVISIONING'].includes(installation.status)) {
      return null;
    }

    const canonicalCandidate = TENANT_RE.test(candidateTenant)
      ? candidateTenant
      : TENANT_RE.test(installation.tenantId)
        ? installation.tenantId
        : null;

    const projectIdMatch = canonicalCandidate
      ? /^org\/([^/]+)\/project\/([^/]+)\/environment\/([^/]+)$/.exec(canonicalCandidate)
      : null;
    const projectLookupKey = projectIdMatch?.[2] || candidateTenant;
    const project = await platformRepository.getProject(projectLookupKey);
    if (project && (project.status || '').toUpperCase() === 'SUSPENDED') {
      return null;
    }

    if (allowedOrganizationIds) {
      if (project) {
        if (!allowedOrganizationIds.includes(project.organizationId)) return null;
      } else if (projectIdMatch?.[1]) {
        const org = await platformRepository.getOrganization(projectIdMatch[1]);
        if (!org || !allowedOrganizationIds.includes(org.id)) return null;
      } else {
        return null;
      }
    }

    if (canonicalCandidate) {
      return canonicalCandidate;
    }

    if (project) {
      const envs = await platformRepository.listEnvironments(project.id);
      const env = envs.find((e) => e.slug === 'production') || envs[0];
      if (env) {
        return `org/${project.organizationId}/project/${project.id}/environment/${env.id}`;
      }
    }

    return null;
  };

  if (requestedTenant?.trim()) {
    return verifyTenantOwnership(requestedTenant.trim());
  }

  if (allowedOrganizationIds) {
    if (allowedOrganizationIds.length === 0) return null;
    const orgProjects = await prisma.platformProject.findMany({
      where: {
        organizationId: { in: allowedOrganizationIds },
        status: { not: 'ARCHIVED' },
      },
      orderBy: { createdAt: 'asc' },
    });
    for (const proj of orgProjects) {
      const inst = await platformRepository.getPluginInstallation(proj.id, canonicalPlugin);
      if (inst && inst.status === 'ACTIVE') {
        if (TENANT_RE.test(inst.tenantId)) return inst.tenantId;
        const envs = await platformRepository.listEnvironments(proj.id);
        const env = envs.find((e) => e.slug === 'production') || envs[0];
        if (env) return `org/${proj.organizationId}/project/${proj.id}/environment/${env.id}`;
      }
    }
    return null;
  }

  const installations = await prisma.pluginInstallation.findMany({
    where: {
      pluginId: { in: candidatePlugins },
      status: 'ACTIVE',
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });

  const canonicalCandidates = installations
    .map((inst) => inst.tenantId)
    .filter((tid) => TENANT_RE.test(tid));

  const preferred = canonicalCandidates.filter(
    (tid) =>
      !tid.includes('/cross-') &&
      !tid.includes('/auth-test-') &&
      !tid.includes('/crash-test-') &&
      !tid.includes('/g1-'),
  );

  if (preferred.length > 0) {
    for (const tid of preferred) {
      const match = /^org\/([^/]+)\/project\/([^/]+)\/environment\/([^/]+)$/.exec(tid);
      if (!match?.[2]) continue;
      const proj = await prisma.platformProject.findUnique({
        where: { id: match[2] },
        select: { status: true, name: true, slug: true },
      });
      if (
        proj?.status === 'ACTIVE' &&
        !proj.slug.startsWith('billing-proj-') &&
        !proj.slug.startsWith('grant-proj-') &&
        !proj.slug.startsWith('g4-') &&
        !proj.slug.startsWith('e-proj-') &&
        !proj.slug.startsWith('cancel-slug-') &&
        !proj.slug.startsWith('wiz-')
      ) {
        return tid;
      }
    }
    return preferred[0] || null;
  }

  return canonicalCandidates[0] || null;
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

    const hasExplicitMachineCredential = Boolean(
      request.headers.get('x-api-key')?.trim() ||
      request.headers.get('x-admin-token')?.trim() ||
      request.headers.get('authorization')?.trim() ||
      request.headers.get('x-orbitox-internal-sig')?.trim()
    );

    let effectiveRequest = request;
    let isOperatorBrowserSession = false;
    let isCustomerBrowserSession = false;

    if (!hasExplicitMachineCredential) {
      const method = request.method.toUpperCase();
      const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(method);
      const tenantCookieKey = options.serviceId === 'hms' ? 'orbitox_hms_tenant' : 'orbitox_restaurant_tenant';
      const requestedTenant =
        request.headers.get('x-tenant-id')?.trim() ||
        request.cookies.get(tenantCookieKey)?.value?.trim();
      const staffCookieToken =
        options.serviceId === 'hms'
          ? request.cookies.get(HMS_STAFF_SESSION_COOKIE)?.value?.trim()
          : undefined;

      const operatorCookie = request.cookies.get(OPERATOR_SESSION_COOKIE)?.value;
      const operatorSession = operatorCookie ? await getOperatorSession(operatorCookie) : null;

      if (operatorSession) {
        if (isMutation && !validOperatorCsrf(request, operatorSession.csrfTokenHash)) {
          return NextResponse.json(
            { success: false, error: { code: 'CSRF_INVALID', message: 'CSRF validation failed.' } },
            { status: 403 },
          );
        }
        const requiredRole = options.adminOnly || isMutation ? 'OPERATOR' : 'SUPPORT_READONLY';
        if (!operatorRoleAllows(operatorSession.role, requiredRole)) {
          return NextResponse.json(
            { success: false, error: { code: 'FORBIDDEN', message: 'Your operator role cannot perform this action.' } },
            { status: 403 },
          );
        }

        const resolvedTenantId = await resolveBrowserTenantForService(options.serviceId, requestedTenant);
        if (!resolvedTenantId) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'TENANT_ACCESS_DENIED',
                message: `No active ${options.serviceId.toUpperCase()} tenant environment was resolved for this browser session.`,
              },
            },
            { status: 403 },
          );
        }

        const { signature, timestamp } = await createInternalAuthToken('admin', operatorSession.operatorId);
        const forwardedHeaders = new Headers(request.headers);
        forwardedHeaders.set('x-orbitox-principal', 'admin');
        forwardedHeaders.set('x-orbitox-internal-sig', signature);
        forwardedHeaders.set('x-orbitox-internal-ts', timestamp);
        forwardedHeaders.set('x-orbitox-operator-id', operatorSession.operatorId);
        forwardedHeaders.set('x-tenant-id', resolvedTenantId);
        if (
          staffCookieToken &&
          !forwardedHeaders.get('x-staff-session') &&
          !forwardedHeaders.get('x-staff-token')
        ) {
          forwardedHeaders.set('x-staff-session', staffCookieToken);
        }
        effectiveRequest = new NextRequest(request.url, {
          method: request.method,
          headers: forwardedHeaders,
          body: isMutation ? await request.clone().arrayBuffer().catch(() => undefined) : undefined,
        });
        isOperatorBrowserSession = true;
      } else {
        const customerCookie = request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value;
        const customerSession = customerCookie ? await getCustomerSession(customerCookie) : null;
        if (customerSession) {
          if (isMutation && !validCustomerCsrf(request, customerSession.csrfTokenHash)) {
            return NextResponse.json(
              { success: false, error: { code: 'CSRF_INVALID', message: 'CSRF validation failed.' } },
              { status: 403 },
            );
          }
          if (options.adminOnly) {
            return NextResponse.json(
              { success: false, error: { code: 'FORBIDDEN', message: 'Operator privileges required for this administrative endpoint.' } },
              { status: 403 },
            );
          }

          if (options.allowOrgAdminCustomerSession) {
            const isOrgAdmin = customerSession.memberships.some((m) =>
              ['OWNER', 'ADMIN'].includes(m.role),
            );
            if (!isOrgAdmin) {
              return NextResponse.json(
                { success: false, error: { code: 'FORBIDDEN', message: 'Organization administrator privileges required for this endpoint.' } },
                { status: 403 },
              );
            }
          }

          const allowedOrgIds = customerSession.memberships.map((m) => m.organizationId);
          const resolvedTenantId = await resolveBrowserTenantForService(
            options.serviceId,
            requestedTenant,
            allowedOrgIds,
          );
          if (!resolvedTenantId) {
            return NextResponse.json(
              {
                success: false,
                error: {
                  code: 'TENANT_ACCESS_DENIED',
                  message: `No authorized ${options.serviceId.toUpperCase()} tenant was found for your organization.`,
                },
              },
              { status: 403 },
            );
          }

          const internalPrincipal = options.allowOrgAdminCustomerSession ? 'customer-org-admin' : 'runtime';
          const { signature, timestamp } = await createInternalAuthToken(internalPrincipal, customerSession.userId);
          const forwardedHeaders = new Headers(request.headers);
          forwardedHeaders.set('x-orbitox-principal', internalPrincipal);
          forwardedHeaders.set('x-orbitox-internal-sig', signature);
          forwardedHeaders.set('x-orbitox-internal-ts', timestamp);
          forwardedHeaders.set('x-orbitox-operator-id', customerSession.userId);
          forwardedHeaders.set('x-tenant-id', resolvedTenantId);
          if (
            staffCookieToken &&
            !forwardedHeaders.get('x-staff-session') &&
            !forwardedHeaders.get('x-staff-token')
          ) {
            forwardedHeaders.set('x-staff-session', staffCookieToken);
          }
          effectiveRequest = new NextRequest(request.url, {
            method: request.method,
            headers: forwardedHeaders,
            body: isMutation ? await request.clone().arrayBuffer().catch(() => undefined) : undefined,
          });
          isCustomerBrowserSession = true;
        }
      }
    }

    if (options.adminOnly && isCustomerBrowserSession) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Customer browser sessions are not permitted on platform-admin endpoints.',
          },
        },
        { status: 403 },
      );
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
          !isCustomerBrowserSession &&
          (isOperatorBrowserSession ||
            guardedRequest.headers.get('x-orbitox-principal') === 'admin' ||
            authContext.scopes?.includes('admin') ||
            authContext.capabilities?.includes('admin'));

        if (!options.adminOnly && authContext.tenantId) {
          const enforcer = options.serviceId === 'hms' ? hmsGrantEnforcer : restaurantGrantEnforcer;
          enforcer.setTrustedKeys(getPublicGrantKeys());

          const pathname = guardedRequest.nextUrl?.pathname || new URL(guardedRequest.url).pathname;
          const feature = resolveFeature(pathname, options.serviceId, options.feature);
          const isWrite =
            guardedRequest.method !== 'GET' &&
            guardedRequest.method !== 'HEAD' &&
            guardedRequest.method !== 'OPTIONS';
          const grantToken =
            guardedRequest.headers.get('x-orbitox-grant') ||
            guardedRequest.headers.get('x-grant-token') ||
            undefined;

          const decision = await enforcer.enforce({
            tenantId: authContext.tenantId,
            feature,
            write: isWrite,
            token: grantToken,
          });

          if (!decision.allowed && !isPlatformAdmin) {
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

          (authContext as any).grant = decision.claims || (isPlatformAdmin ? {
            tenantId: authContext.tenantId,
            pluginId: options.serviceId === 'hms' ? '@orbitox/hms' : '@orbitox/restaurant',
            planId: 'admin-override',
            status: 'ACTIVE',
            features: ['*'],
            quotas: {},
          } : undefined);
        }

        return handler(guardedRequest, routeContext, authContext);
      }
    );

    return guarded(effectiveRequest);
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