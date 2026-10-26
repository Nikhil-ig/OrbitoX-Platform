import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
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

    let keys = PlatformApiState.getApiKeys();

    if (serviceId && serviceId !== 'all') {
      keys = keys.filter((k) => k.serviceId === serviceId || k.serviceId === 'all');
    }
    if (environment && environment !== 'all') {
      keys = keys.filter((k) => k.environment === environment);
    }
    if (status && status !== 'all') {
      keys = keys.filter((k) => k.status === status);
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
      } = body;

      if (!name || !serviceId) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_INPUT', message: 'Fields "name" and "serviceId" are required.' } },
          { status: 400 }
        );
      }

      const prefix = `orb_${environment === 'production' ? 'live' : 'test'}_`;
      const randomSecret = Math.random().toString(36).substring(2, 14) + Math.random().toString(36).substring(2, 14);
      const rawKey = `${prefix}${randomSecret}`;
      const maskedKey = `${prefix}********************${randomSecret.slice(-4)}`;

      const newKey = {
        id: `key-${Date.now()}`,
        name,
        keyPrefix: prefix,
        maskedKey,
        rawKey,
        serviceId,
        serviceName: serviceName || serviceId,
        providerId,
        providerName,
        environment,
        scopes,
        createdAt: 'Just now',
        lastUsedAt: 'Never',
        status: 'active',
        rateLimitPerMin,
        requestsLast30Days: 0,
      };

      PlatformApiState.addApiKey(newKey);

      PlatformApiState.recordTelemetry({
        tenantId: providerId,
        facade: 'SecurityFacade',
        level: 'SECURITY',
        message: `Issued new Ed25519-compatible API Key [${name}] for service [${serviceId}] (${environment}).`,
      });

      return NextResponse.json({
        success: true,
        data: newKey,
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
