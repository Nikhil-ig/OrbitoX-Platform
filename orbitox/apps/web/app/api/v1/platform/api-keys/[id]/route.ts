import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard } from '@/app/api/v1/_lib/api-guard';
import { ApiResponse, ApiRequestContext } from '@/app/api/v1/_lib/api-types';
import { auditService } from '@/app/api/v1/_lib/platform-governance';
import { platformRepository } from '@/lib/platform-repository';

export const GET = withApiGuard(
  {
    serviceId: 'platform',
    serviceName: 'Platform Keys Service',
    routeClass: 'platform-admin',
    requiredScopes: ['platform.keys.read', 'admin'],
  },
  async (req: NextRequest, ctx: ApiRequestContext) => {
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop() || '';

    const key = await platformRepository.getApiKey(id);
    if (!key) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: { code: 'KEY_NOT_FOUND', message: `API key [${id}] not found` },
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        },
        { status: 404 }
      );
    }

    const [project, environment] = await Promise.all([
      platformRepository.getProject(key.projectId),
      platformRepository.getEnvironment(key.environmentId),
    ]);
    const { authVerifier, rawSecret, rawKey, ...safeKey } = key as any;

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        ...safeKey,
        projectName: project?.name,
        projectSlug: project?.slug,
        environmentName: environment?.name,
        environmentType: environment?.type,
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
    serviceName: 'Platform Keys Service',
    requiredScopes: ['platform.keys.update', 'admin'],
    allowPublic: false,
  },
  async (req: NextRequest, ctx: ApiRequestContext) => {
    try {
      const url = new URL(req.url);
      const id = url.pathname.split('/').pop() || '';
      const body = await req.json();

      const existing = await platformRepository.getApiKey(id);
      if (!existing) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: { code: 'KEY_NOT_FOUND', message: `API key [${id}] not found` },
            meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
          },
          { status: 404 }
        );
      }

      if (body.status) {
        const updated = await platformRepository.setKeyStatus(existing.id, body.status, body.reason);
        await auditService.log({
          action: 'API_KEY_STATUS_CHANGED',
          entityType: 'PLATFORM_KEY',
          entityId: existing.id,
          userId: ctx.apiKey || 'platform_admin',
          contextId: ctx.tenantId || 'global',
          reason: body.reason || `Status changed from ${existing.status} to ${body.status}`,
          oldValue: { status: existing.status },
          newValue: { status: body.status },
        });
        await platformRepository.recordPlatformAdminAudit({
          action: 'API_KEY_STATUS_CHANGED',
          entityType: 'PLATFORM_KEY',
          entityId: existing.id,
          projectId: existing.projectId,
          environmentId: existing.environmentId,
          actorId: ctx.apiKey || 'platform_admin',
          reason: body.reason || `Status changed from ${existing.status} to ${body.status}`,
          metadata: { oldStatus: existing.status, newStatus: body.status },
        });

        return NextResponse.json<ApiResponse>({
          success: true,
          data: updated,
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        });
      }

      return NextResponse.json<ApiResponse>({
        success: true,
        data: existing,
        meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
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
