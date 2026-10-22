import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard } from '@/app/api/v1/_lib/api-guard';
import { ApiResponse, ApiRequestContext } from '@/app/api/v1/_lib/api-types';
import { PlatformRepository } from '@orbitox-io/plugin-engine';
import { auditService } from '@/app/api/v1/_lib/platform-governance';

export const GET = withApiGuard(
  {
    serviceId: 'platform',
    serviceName: 'Platform Projects Service',
    allowPublic: true,
  },
  async (req: NextRequest, ctx: ApiRequestContext) => {
    PlatformRepository.initialize();
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop() || '';

    const project = PlatformRepository.getProject(id);
    if (!project) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: { code: 'PROJECT_NOT_FOUND', message: `Project [${id}] not found` },
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        },
        { status: 404 }
      );
    }

    const environments = PlatformRepository.listEnvironments(project.id);
    const keys = PlatformRepository.listApiKeys({ projectId: project.id });
    const credentials = PlatformRepository.listCredentials({ projectId: project.id });

    const environmentsWithDetails = environments.map((env) => {
      const domains = PlatformRepository.listDomains(env.id);
      const quota = PlatformRepository.getQuotaPolicy(env.id);
      const installations = PlatformRepository.listInstallations(env.id);
      return {
        ...env,
        domains,
        quota,
        installations,
      };
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        ...project,
        environments: environmentsWithDetails,
        keysCount: keys.length,
        credentialsCount: credentials.length,
      },
      meta: {
        latencyMs: 1,
        timestamp: new Date().toISOString(),
        requestId: ctx.requestId,
      },
    });
  }
);

export const PATCH = withApiGuard(
  {
    serviceId: 'platform',
    serviceName: 'Platform Projects Service',
    requiredScopes: ['platform.projects.update', 'admin'],
    allowPublic: false,
  },
  async (req: NextRequest, ctx: ApiRequestContext) => {
    try {
      const url = new URL(req.url);
      const id = url.pathname.split('/').pop() || '';
      const body = await req.json();

      const existing = PlatformRepository.getProject(id);
      if (!existing) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: { code: 'PROJECT_NOT_FOUND', message: `Project [${id}] not found` },
            meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
          },
          { status: 404 }
        );
      }

      const updated = PlatformRepository.updateProject(existing.id, body);

      // Audit log the mutation
      await auditService.log({
        action: 'PROJECT_UPDATED',
        entityType: 'PLATFORM_PROJECT',
        entityId: existing.id,
        userId: ctx.apiKey || 'platform_admin',
        contextId: ctx.tenantId || 'global',
        reason: body.reason || `Updated project properties for [${existing.name}]`,
        oldValue: { status: existing.status, planTier: existing.planTier },
        newValue: { status: updated?.status, planTier: updated?.planTier, updates: body },
      });

      return NextResponse.json<ApiResponse>({
        success: true,
        data: updated,
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
          error: { code: 'UPDATE_FAILED', message: err.message },
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        },
        { status: 500 }
      );
    }
  }
);
