import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../../_lib/api-guard';

export const GET = withApiGuard(
  {
    serviceId: 'admin',
    serviceName: 'Platform Administration OS',
  },
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const serviceId = searchParams.get('serviceId');
    const environment = searchParams.get('environment');
    const status = searchParams.get('status');

    let keys: any[] = PlatformApiState.getApiKeys();

    if (serviceId && serviceId !== 'all') {
      keys = keys.filter((k: any) => k.serviceId === serviceId || k.serviceId === 'all');
    }
    if (environment && environment !== 'all') {
      keys = keys.filter((k: any) => k.environment === environment);
    }
    if (status && status !== 'all') {
      keys = keys.filter((k: any) => k.status === status);
    }

    return NextResponse.json({
      success: true,
      data: keys,
      meta: { total: keys.length },
    });
  }
);

export const POST = withApiGuard(
  {
    serviceId: 'admin',
    serviceName: 'Platform Administration OS',
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
        isRoot,
      } = body;

      if (!name || !serviceId) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_INPUT', message: 'Fields "name" and "serviceId" are required.' } },
          { status: 400 }
        );
      }

      // Root keys cannot be created through the API
      if (isRoot || scopes.includes('*')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Root keys with wildcard (*) scopes cannot be created through the API. Use bootstrap-root-key script.',
            },
          },
          { status: 403 }
        );
      }

      const { createNewApiKey } = await import('../../_lib/guard');
      const { rawKey, record } = createNewApiKey({
        name,
        environment,
        scopes,
        tenantScope: providerId ? [providerId] : undefined,
        rateLimitPerMin,
      });

      const responsePayload = {
        ...record,
        rawKey,
        serviceId,
        serviceName: serviceName || serviceId,
        providerId,
        providerName,
      };

      PlatformApiState.recordTelemetry({
        tenantId: providerId,
        facade: 'SecurityFacade',
        level: 'SECURITY',
        message: `Issued new cryptographic API Key [${name}] for service [${serviceId}] (${environment}).`,
      });

      return NextResponse.json({
        success: true,
        data: responsePayload,
        message: 'API Key generated successfully. Save the rawKey securely as it will not be displayed again.',
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: err.message } },
        { status: 400 }
      );
    }
  }
);
