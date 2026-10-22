import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard } from '@/app/api/v1/_lib/api-guard';
import { ApiResponse, ApiRequestContext } from '@/app/api/v1/_lib/api-types';
import { PlatformRepository } from '@orbitox-io/plugin-engine';
import { auditService } from '@/app/api/v1/_lib/platform-governance';

export const GET = withApiGuard(
  {
    serviceId: 'platform',
    serviceName: 'Platform Keys Service',
    allowPublic: true,
  },
  async (req: NextRequest, ctx: ApiRequestContext) => {
    PlatformRepository.initialize();
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId') || undefined;
    const environmentId = url.searchParams.get('environmentId') || undefined;
    const status = url.searchParams.get('status') as any || undefined;

    const keys = PlatformRepository.listApiKeys({ projectId, environmentId, status });

    const enriched = keys.map((key) => {
      const project = PlatformRepository.getProject(key.projectId);
      const environment = PlatformRepository.getEnvironment(key.environmentId);
      return {
        ...key,
        projectName: project?.name || 'Unknown Project',
        projectSlug: project?.slug || 'unknown',
        environmentName: environment?.name || 'Unknown Environment',
        environmentType: environment?.type || 'DEVELOPMENT',
      };
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: enriched,
      meta: {
        latencyMs: 1,
        timestamp: new Date().toISOString(),
        requestId: ctx.requestId,
      },
    });
  }
);

export const POST = withApiGuard(
  {
    serviceId: 'platform',
    serviceName: 'Platform Keys Service',
    requiredScopes: ['platform.keys.create', 'admin'],
    allowPublic: false,
  },
  async (req: NextRequest, ctx: ApiRequestContext) => {
    try {
      const body = await req.json();
      const {
        name,
        projectId,
        environmentId,
        keyType,
        capabilities,
        ipAllowlist,
        rateLimitPerMin,
        tenantScope,
        expiresInDays,
      } = body;

      if (!name || !projectId || !environmentId) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: {
              code: 'INVALID_INPUT',
              message: 'Name, projectId, and environmentId are required fields',
            },
            meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
          },
          { status: 400 }
        );
      }

      const created = PlatformRepository.createApiKey({
        name,
        projectId,
        environmentId,
        keyType: keyType || 'PROJECT_SCOPED',
        capabilities: capabilities && capabilities.length > 0 ? capabilities : ['platform.read'],
        ipAllowlist: ipAllowlist || [],
        rateLimitPerMin: rateLimitPerMin || 1200,
        tenantScope: tenantScope || [],
        expiresInDays: expiresInDays ? Number(expiresInDays) : 90,
        createdBy: ctx.apiKey || 'platform_admin',
      });

      // Immutable audit log (never recording plaintext secret)
      await auditService.log({
        action: 'API_KEY_ISSUED',
        entityType: 'PLATFORM_KEY',
        entityId: created.keyRecord.id,
        userId: ctx.apiKey || 'platform_admin',
        contextId: ctx.tenantId || 'global',
        reason: `Issued new machine key [${name}] for environment [${environmentId}]`,
        newValue: {
          keyId: created.keyRecord.keyId,
          keyPrefix: created.keyRecord.keyPrefix,
          secretFingerprint: created.keyRecord.secretFingerprint,
          capabilities: created.keyRecord.capabilities,
          riskScore: created.keyRecord.riskScore,
          expiresAt: created.keyRecord.expiresAt,
        },
      });

      // Return raw secret ONCE for human operator safe copy
      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          keyRecord: created.keyRecord,
          rawSecret: created.rawSecret,
          warning: 'This raw secret will never be shown again. Store it securely in your deployment pipeline or vault.',
        },
        meta: {
          latencyMs: 1,
          timestamp: new Date().toISOString(),
          requestId: ctx.requestId,
        },
      });
    } catch (err: any) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: { code: 'KEY_CREATION_FAILED', message: err.message },
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        },
        { status: 500 }
      );
    }
  }
);
