import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../../_lib/api-guard';
import { ApiResponse } from '../../_lib/api-types';
import { PlatformKeyEngine } from '@orbitox-io/plugin-engine';

export const GET = withApiGuard(
  {
    serviceId: 'admin',
    serviceName: 'Platform Administration OS',
    routeClass: 'platform-admin',
    requiredScopes: ['admin', 'read'],
  },
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const serviceId = searchParams.get('serviceId');
    const environment = searchParams.get('environment');
    const status = searchParams.get('status');

    let keys = PlatformApiState.getApiKeys();

    if (serviceId && serviceId !== 'all') {
      keys = keys.filter((k: any) => k.serviceId === serviceId || k.serviceId === 'all');
    }
    if (environment && environment !== 'all') {
      keys = keys.filter((k: any) => k.environment === environment);
    }
    if (status && status !== 'all') {
      keys = keys.filter((k: any) => k.status === status);
    }

    // Ensure zero raw secrets are ever returned
    const sanitized = keys.map((k: any) => {
      const { rawKey, authVerifier, ...safe } = k;
      return safe;
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: sanitized,
      meta: {
        latencyMs: 1,
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        pagination: {
          page: 1,
          limit: sanitized.length,
          total: sanitized.length,
          totalPages: 1,
        },
      },
    });
  }
);

export const POST = withApiGuard(
  {
    serviceId: 'admin',
    serviceName: 'Platform Administration OS',
    routeClass: 'platform-admin',
    requiredScopes: ['admin', 'write'],
  },
  async (req: NextRequest) => {
    try {
      const body = await req.json();
      const {
        name,
        serviceId,
        serviceName,
        providerId,
        providerName,
        environment = 'production',
        scopes = ['read', 'write'],
        rateLimitPerMin = 1200,
        tenantScope,
      } = body;

      if (!name || !serviceId) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: { code: 'INVALID_INPUT', message: 'Fields "name" and "serviceId" are required.' } },
          { status: 400 }
        );
      }

      // Generate cryptographically secure CSPRNG key with HMAC verifier
      const generated = PlatformKeyEngine.generateKey(environment);

      const newKey: any = {
        id: generated.keyId,
        name,
        keyPrefix: generated.keyPrefix,
        maskedKey: generated.maskedDisplay,
        secretFingerprint: generated.secretFingerprint,
        authVerifier: generated.authVerifier,
        serviceId,
        serviceName: serviceName || serviceId,
        providerId,
        providerName,
        environment,
        scopes,
        capabilities: scopes,
        tenantScope: tenantScope || (providerId ? [providerId] : []),
        createdAt: new Date().toISOString(),
        lastUsedAt: 'Never',
        status: 'active',
        rateLimitPerMin,
        requestsLast30Days: 0,
      };

      PlatformApiState.addApiKey(newKey);

      PlatformApiState.recordTelemetry({
        tenantId: providerId || 'admin',
        facade: 'SecurityFacade',
        level: 'SECURITY',
        message: `Issued new CSPRNG API Key [${name}] for service [${serviceId}] (${environment}).`,
      });

      const { authVerifier, ...safeRecord } = newKey;

      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          keyRecord: safeRecord,
          rawSecret: generated.rawSecret,
          warning: 'This raw secret will never be shown again. Store it securely in your deployment pipeline or vault.',
        },
        meta: {
          latencyMs: 1,
          timestamp: new Date().toISOString(),
          requestId: `req_${Date.now()}`,
        },
      });
    } catch (err: any) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: { code: 'BAD_REQUEST', message: err.message } },
        { status: 400 }
      );
    }
  }
);
