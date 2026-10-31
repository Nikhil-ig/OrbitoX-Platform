import { NextRequest, NextResponse } from 'next/server';
import { signBridgeRequest, getDefaultBridgeKeys, TENANT_RE } from '@orbitox-io/bridge';
import { platformRepository } from '@/lib/platform-repository';

// Programmatic link registry permitted strictly in test builds only
const tenantLinkRegistry = new Map<string, string>();

const isTestBuild = (): boolean => (process.env.NODE_ENV || '').toLowerCase().trim() === 'test';

export function registerRestaurantTenantLink(platformTenantId: string, restaurantOsTenantId: string): void {
  if (!isTestBuild()) {
    throw new Error(
      'tenantLinkRegistry is permitted only in test builds (NODE_ENV=test). In production, plugin installations must be provisioned in the installation table.'
    );
  }
  const trimmedTarget = restaurantOsTenantId?.trim();
  if (!trimmedTarget || !TENANT_RE.test(trimmedTarget)) {
    throw new Error(
      `Target RestaurantOS tenant ID "${restaurantOsTenantId}" is not in canonical format (org/{org}/project/{proj}/environment/{env}).`
    );
  }
  tenantLinkRegistry.set(platformTenantId.trim(), trimmedTarget);
}

export function clearRestaurantTenantLinks(): void {
  if (!isTestBuild()) {
    throw new Error('tenantLinkRegistry is permitted only in test builds (NODE_ENV=test).');
  }
  tenantLinkRegistry.clear();
}

/**
 * Resolves a non-canonical platform tenant identifier (e.g. project slug or alias)
 * to its canonical RestaurantOS tenant identifier strictly by querying the platform's
 * plugin installation table. Never scans raw configOverrides blobs, never guesses,
 * and never falls back to an arbitrary environment.
 */
export async function resolveLinkedRestaurantTenant(
  tenantId: string
): Promise<string | undefined> {
  const trimmed = tenantId?.trim();
  if (!trimmed) return undefined;

  // 1. Check test link registry (strictly permitted in test builds only)
  if (isTestBuild() && tenantLinkRegistry.has(trimmed)) {
    return tenantLinkRegistry.get(trimmed);
  }

  // 2. Query platform plugin installation table directly for this tenant and restaurant plugin
  try {
    const inst =
      (await platformRepository.getPluginInstallation(trimmed, '@orbitox/restaurant')) ||
      (await platformRepository.getPluginInstallation(trimmed, 'restaurant'));

    if (inst && inst.status === 'ACTIVE' && inst.runtimeTenantId && TENANT_RE.test(inst.runtimeTenantId)) {
      return inst.runtimeTenantId;
    }
  } catch {
    // Return undefined if query fails
  }

  return undefined;
}

export function getRestaurantPublicUrl(): string | undefined {
  return process.env.RESTAURANTOS_PUBLIC_URL?.trim();
}

export function getRestaurantRuntimeUrl(): string | undefined {
  return (
    process.env.RESTAURANTOS_RUNTIME_URL?.trim() ||
    process.env.RESTAURANTOS_PUBLIC_URL?.trim() ||
    process.env.RESTAURANT_STORE_URL?.trim()
  );
}

/**
 * Answers HTTP 308 Permanent Redirect to RestaurantOS public origin for guest/diner routes.
 * In production, fails closed with 503 RESTAURANT_RUNTIME_NOT_CONFIGURED if RESTAURANTOS_PUBLIC_URL is unset.
 */
export function handleRestaurantPublicRedirect(
  request: NextRequest,
  targetPath?: string
): NextResponse {
  const publicUrl = getRestaurantPublicUrl();
  const rawNodeEnv = (process.env.NODE_ENV || '').toLowerCase().trim();
  const isProduction = rawNodeEnv === 'production' || !rawNodeEnv;

  if (isProduction && !publicUrl) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'RESTAURANT_RUNTIME_NOT_CONFIGURED',
          message:
            'RestaurantOS runtime public origin is not configured (missing RESTAURANTOS_PUBLIC_URL).',
        },
      },
      { status: 503 }
    );
  }

  const baseOrigin = (publicUrl || 'http://localhost:4010').replace(/\/$/, '');
  const pathname = targetPath || request.nextUrl.pathname;
  const search = request.nextUrl.search;
  const targetUrl = `${baseOrigin}${pathname}${search}`;

  const sunsetDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString();
  console.warn(
    `[RESTAURANT_LEGACY_REDIRECT] ${request.method} ${request.nextUrl.pathname} -> ${targetUrl} (client: ${
      request.headers.get('user-agent') || 'unknown'
    }, ip: ${request.headers.get('x-forwarded-for') || request.headers.get('host') || 'unknown'})`
  );

  const response = NextResponse.redirect(targetUrl, 308);
  response.headers.set('Deprecation', 'true');
  response.headers.set('Sunset', sunsetDate);
  response.headers.set('X-Legacy-Route', request.nextUrl.pathname);
  return response;
}

/**
 * Forwards staff/admin calls to RestaurantOS runtime using cryptographically signed bridge requests.
 * Extracts the tenant strictly from the verified platform principal, never from client input.
 */
export async function forwardSignedBridgeCall(
  request: NextRequest,
  targetPath: string,
  verifiedTenantId: string,
  principal = { sub: 'platform_control_plane', scopes: ['tenant:admin', 'platform:superuser'] }
): Promise<Response> {
  const runtimeUrl = getRestaurantRuntimeUrl();
  const rawNodeEnv = (process.env.NODE_ENV || '').toLowerCase().trim();
  const isProduction = rawNodeEnv === 'production' || !rawNodeEnv;

  if (isProduction && !runtimeUrl) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'RESTAURANT_RUNTIME_NOT_CONFIGURED',
          message:
            'RestaurantOS runtime backend is not configured (missing RESTAURANTOS_RUNTIME_URL).',
        },
      },
      { status: 503 }
    );
  }

  const baseOrigin = (runtimeUrl || 'http://127.0.0.1:4010').replace(/\/$/, '');
  const search = request.nextUrl.search;
  const targetPathWithQuery = `${targetPath}${search}`;
  const targetFullUrl = `${baseOrigin}${targetPathWithQuery}`;

  // Read request body if method has body
  let bodyText = '';
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      bodyText = await request.text();
    } catch {}
  }

  // Strict tenant verification: platform must never vouch for a synthetic or guessed tenant
  const rawTenant = verifiedTenantId?.trim();
  if (!rawTenant) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Tenant identity is required.',
        },
      },
      { status: 401 }
    );
  }

  let canonicalTenant = rawTenant;
  if (!TENANT_RE.test(canonicalTenant)) {
    const linkedTenant = await resolveLinkedRestaurantTenant(canonicalTenant);
    if (!linkedTenant) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RESTAURANT_TENANT_NOT_LINKED',
            message: `Tenant "${canonicalTenant}" is not linked to an active RestaurantOS installation.`,
          },
        },
        { status: 403 }
      );
    }
    canonicalTenant = linkedTenant;
  }

  const keys = getDefaultBridgeKeys();
  const signedHeaders = signBridgeRequest(keys, {
    method: request.method,
    pathWithQuery: targetPathWithQuery,
    tenantId: canonicalTenant,
    principal,
    body: bodyText,
  });

  const upstreamHeaders: Record<string, string> = {
    ...signedHeaders,
  };
  const contentType = request.headers.get('content-type');
  if (contentType) upstreamHeaders['content-type'] = contentType;

  try {
    const upstreamRes = await fetch(targetFullUrl, {
      method: request.method,
      headers: upstreamHeaders,
      body: bodyText || undefined,
    });

    const upstreamBody = await upstreamRes.arrayBuffer();
    const responseHeaders = new Headers();
    upstreamRes.headers.forEach((val, key) => {
      if (key.toLowerCase() !== 'transfer-encoding') {
        responseHeaders.set(key, val);
      }
    });

    return new Response(upstreamBody, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UPSTREAM_GATEWAY_ERROR',
          message: `Failed to forward bridge call to RestaurantOS: ${err.message}`,
        },
      },
      { status: 502 }
    );
  }
}
