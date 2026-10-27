import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard } from '@/app/api/v1/_lib/api-guard';
import { ApiResponse, ApiRequestContext } from '@/app/api/v1/_lib/api-types';
import { auditService } from '@/app/api/v1/_lib/platform-governance';
import { platformRepository } from '@/lib/platform-repository';

export const GET = withApiGuard(
  {
    serviceId: 'platform',
    serviceName: 'Platform Projects Service',
    routeClass: 'platform-admin',
    requiredScopes: ['platform.projects.read', 'admin'],
  },
  async (req: NextRequest, ctx: ApiRequestContext) => {
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop() || '';

    const project = await platformRepository.getProject(id);
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

    const [environments, keys, credentials] = await Promise.all([
      platformRepository.listEnvironments(project.id),
      platformRepository.listApiKeys({ projectId: project.id }),
      platformRepository.listCredentials({ projectId: project.id }),
    ]);

    const environmentsWithDetails = await Promise.all(environments.map(async (env) => {
      const [domains, quota, installations] = await Promise.all([
        platformRepository.listDomains(env.id),
        platformRepository.getQuotaPolicy(env.id),
        platformRepository.listInstallations(env.id),
      ]);
      return {
        ...env,
        domains,
        quota,
        installations,
      };
    }));

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

      const existing = await platformRepository.getProject(id);
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

      const updated = await platformRepository.updateProject(existing.id, body);

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
      await platformRepository.recordPlatformAdminAudit({
        action: 'PROJECT_UPDATED',
        entityType: 'PLATFORM_PROJECT',
        entityId: existing.id,
        organizationId: existing.organizationId,
        projectId: existing.id,
        actorId: ctx.apiKey || 'platform_admin',
        reason: body.reason || `Updated project properties for [${existing.name}]`,
        metadata: { oldStatus: existing.status, newStatus: updated?.status, updates: body },
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
