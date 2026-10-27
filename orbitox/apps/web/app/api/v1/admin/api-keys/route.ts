import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../../_lib/api-guard';
import { ApiResponse } from '../../_lib/api-types';
import { platformRepository } from '@/lib/platform-repository';

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

    let keys = (await platformRepository.listApiKeys()).map((key) => ({
      ...key,
      maskedKey: key.maskedDisplay,
      status: key.status.toLowerCase(),
      environment: key.keyPrefix.includes('_live_') ? 'production' : key.keyPrefix.includes('_stage_') ? 'staging' : 'development',
    }));

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
        projectId: requestedProjectId,
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

      const projectId = requestedProjectId || providerId;
      const project = projectId ? await platformRepository.getProject(projectId) : undefined;
      if (!project) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: { code: 'INVALID_PROJECT', message: 'A valid projectId is required to issue a durable API key.' } },
          { status: 400 }
        );
      }
      const environmentRecord = (await platformRepository.listEnvironments(project.id)).find(
        (item) => item.slug.toLowerCase() === environment.toLowerCase()
      );
      if (!environmentRecord) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: { code: 'INVALID_ENVIRONMENT', message: `Environment ${environment} was not found for this project.` } },
          { status: 400 }
        );
      }
      const { keyRecord, rawSecret } = await platformRepository.createApiKey({
        name,
        environmentId: environmentRecord.id,
        projectId: project.id,
        capabilities: scopes,
        ipAllowlist: body.ipAllowlist,
        rateLimitPerMin,
        tenantScope: tenantScope || [project.slug],
        expiresInDays: body.expiresInDays,
        createdBy: 'platform-admin',
      });
      await platformRepository.recordPlatformAdminAudit({
        action: 'API_KEY_ISSUED',
        entityType: 'PLATFORM_KEY',
        entityId: keyRecord.id,
        projectId: project.id,
        environmentId: environmentRecord.id,
        actorId: 'platform-admin',
        reason: `Issued key for service ${serviceId}`,
        metadata: { keyId: keyRecord.keyId, keyPrefix: keyRecord.keyPrefix, capabilities: keyRecord.capabilities },
      });

      PlatformApiState.recordTelemetry({
        tenantId: project.slug,
        facade: 'SecurityFacade',
        level: 'SECURITY',
        message: `Issued new CSPRNG API Key [${name}] for service [${serviceId}] (${environment}).`,
      });

      const { authVerifier, ...safeRecord } = keyRecord;

      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          keyRecord: { ...safeRecord, serviceId, serviceName: serviceName || serviceId, providerId, providerName },
          rawSecret,
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
