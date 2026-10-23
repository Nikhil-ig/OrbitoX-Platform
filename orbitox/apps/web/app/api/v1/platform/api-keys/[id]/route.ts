import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard } from '@/app/api/v1/_lib/api-guard';
import { ApiResponse, ApiRequestContext } from '@/app/api/v1/_lib/api-types';
import { PlatformRepository } from '@orbitox-io/plugin-engine';
import { auditService } from '@/app/api/v1/_lib/platform-governance';

export const GET = withApiGuard(
  {
    serviceId: 'platform',
    serviceName: 'Platform Keys Service',
    requiredScopes: ['platform.keys.read'],
  },
  async (req: NextRequest, ctx: ApiRequestContext) => {
    PlatformRepository.initialize();
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop() || '';

    const key = PlatformRepository.getApiKey(id);
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

    const project = PlatformRepository.getProject(key.projectId);
    const environment = PlatformRepository.getEnvironment(key.environmentId);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        ...key,
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

      const existing = PlatformRepository.getApiKey(id);
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
        const updated = PlatformRepository.setKeyStatus(existing.id, body.status, body.reason);
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
