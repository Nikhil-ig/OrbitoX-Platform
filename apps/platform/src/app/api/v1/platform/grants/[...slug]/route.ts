import { NextRequest, NextResponse } from 'next/server';
import {
  canonicalizePluginId,
  createEntitlementGrantToken,
} from '@orbitox-io/plugin-engine';
import { getDefaultBridgeKeys, verifyBridgeRequest, MemoryNonceStore } from '@orbitox-io/bridge';
import { platformRepository } from '@/server/db/platform-repository';
import { grantStatusForInstallation } from '@/app/api/_lib/route-auth';

const bridgeNonceStore = new MemoryNonceStore();

function parseTenantAndPlugin(req: NextRequest, slug: string[]): { tenantId: string; pluginId: string } | null {
  const { searchParams } = new URL(req.url);
  const qTenant = searchParams.get('tenant') || searchParams.get('tenantId');
  const qPlugin = searchParams.get('plugin') || searchParams.get('pluginId');
  if (qTenant && qPlugin) {
    return { tenantId: qTenant, pluginId: qPlugin };
  }

  if (!slug || slug.length === 0) return null;

  // Pattern: org/<o>/project/<p>/environment/<e>/<plugin...>
  // Find where 'org' starts
  const orgIndex = slug.indexOf('org');
  if (orgIndex !== -1 && slug.length >= orgIndex + 6) {
    const tenantSegments = slug.slice(orgIndex, orgIndex + 6);
    const tenantId = tenantSegments.join('/');
    const pluginSegments = slug.slice(orgIndex + 6);
    const pluginId = pluginSegments.join('/');
    if (tenantId && pluginId) {
      return { tenantId, pluginId };
    }
  }

  // Fallback: 2-part slug (e.g. [encodedTenant, encodedPlugin])
  if (slug.length === 2 && slug[0] && slug[1]) {
    return {
      tenantId: decodeURIComponent(slug[0]),
      pluginId: decodeURIComponent(slug[1]),
    };
  }

  return null;
}

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ slug: string[] }> }
) {
  const params = props?.params ?? Promise.resolve({ slug: [] });
  try {
    let bridgeKeys;
    try {
      bridgeKeys = getDefaultBridgeKeys();
    } catch (keyErr: any) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', code: 'BRIDGE_SIGNATURE_REQUIRED', message: `Bridge key configuration error: ${keyErr?.message || keyErr}` },
        { status: 401 }
      );
    }
    const url = new URL(req.url);
    const pathWithQuery = url.pathname + url.search;
    const bodyText = await req.clone().text();

    const headersObj: Record<string, string> = {};
    req.headers.forEach((v, k) => {
      headersObj[k] = v;
    });

    const verified = await verifyBridgeRequest(bridgeKeys, bridgeNonceStore, {
      method: req.method,
      pathWithQuery,
      headers: headersObj,
      rawBody: bodyText,
    });

    if (!verified.ok) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: `Signed bridge authorization failed: ${verified.reason}` },
        { status: 401 }
      );
    }

    // 2. Parse tenantId and pluginId
    const resolvedParams = await params;
    const resolved = parseTenantAndPlugin(req, resolvedParams?.slug || []);
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'Could not resolve tenantId and pluginId from path or query.' },
        { status: 400 }
      );
    }

    const { tenantId } = resolved;
    const canonicalPlugin = canonicalizePluginId(resolved.pluginId);

    // 3. Verify tenant and plugin in signature (C2)
    if (verified.tenantId !== tenantId) {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN', message: 'Tenant in bridge signature does not match requested tenant.' },
        { status: 403 }
      );
    }

    const signedPlugin = verified.principal.sub;
    const signedScopes = verified.principal.scopes || [];
    if (
      signedPlugin !== canonicalPlugin &&
      signedPlugin !== resolved.pluginId &&
      !signedScopes.includes(canonicalPlugin) &&
      !signedScopes.includes(resolved.pluginId) &&
      !signedScopes.includes('*')
    ) {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN', message: 'Plugin in bridge signature does not match requested plugin.' },
        { status: 403 }
      );
    }

    // 3. Lookup PluginInstallation in repository
    const installation = await platformRepository.getPluginInstallation(tenantId, canonicalPlugin);
    if (!installation) {
      return NextResponse.json(
        { success: false, error: 'INSTALLATION_NOT_FOUND', message: `No installation found for tenant "${tenantId}" and plugin "${canonicalPlugin}".` },
        { status: 404 }
      );
    }

    // 4. Map installation status to Grant ServiceStatus
    const grantStatus = grantStatusForInstallation(installation.status);

    // 5. Lookup Plan, features, and quotas
    let features: string[] = [];
    let quotas: Record<string, { limit: number; window: 'day' | 'month' | 'none' }> = {};
    const planId = installation.planId;
    if (!planId) {
      return NextResponse.json(
        { success: false, error: 'PLAN_NOT_CONFIGURED' },
        { status: 409 }
      );
    }

    const plan = await platformRepository.getPlan(planId);
    if (!plan || plan.pluginId !== canonicalPlugin) {
      console.error('Refusing to issue a grant for a missing or mismatched catalogue plan.', {
        tenantId,
        pluginId: canonicalPlugin,
        planId,
      });
      return NextResponse.json(
        { success: false, error: 'PLAN_NOT_FOUND' },
        { status: 409 }
      );
    }
    features = plan.features.filter((f) => f.enabled).map((f) => f.featureKey);
    for (const q of plan.quotas) {
      quotas[q.quotaKey] = {
        limit: q.limit,
        window: q.window as any,
      };
    }

    // 6. Mint 15-minute token
    const token = createEntitlementGrantToken({
      tenantId,
      pluginId: canonicalPlugin,
      planId,
      status: grantStatus,
      features,
      quotas,
      revision: installation.entitlementRevision || 1,
      ttlSeconds: 900, // 15 minutes
    });

    const exp = Math.floor(Date.now() / 1000) + 900;

    return NextResponse.json({
      success: true,
      token,
      grant: token,
      expiresAt: exp,
      revision: installation.entitlementRevision || 1,
      status: grantStatus,
      planId,
      features,
      quotas,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
