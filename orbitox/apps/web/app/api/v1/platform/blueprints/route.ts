import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard } from '@/app/api/v1/_lib/api-guard';
import { ApiResponse, ApiRequestContext } from '@/app/api/v1/_lib/api-types';
import { blueprint } from '@/app/api/v1/_lib/control-plane-brain';

export const GET = withApiGuard(
  {
    serviceId: 'platform',
    serviceName: 'Platform Blueprint Service',
    requiredScopes: ['platform.blueprints.read'],
  },
  async (_req: NextRequest, ctx: ApiRequestContext) => {
    const list = blueprint.listBlueprints();
    return NextResponse.json<ApiResponse>({
      success: true,
      data: list,
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
    serviceName: 'Platform Blueprint Service',
    requiredScopes: ['platform.blueprints.read'],
  },
  async (req: NextRequest, ctx: ApiRequestContext) => {
    try {
      const body = await req.json();
      const { action } = body;

      if (action === 'compare') {
        const { sourceEnvId, targetEnvId } = body;
        const diff = blueprint.compareEnvironments(sourceEnvId, targetEnvId);
        return NextResponse.json<ApiResponse>({
          success: true,
          data: diff,
          meta: { latencyMs: 2, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        });
      }

      if (action === 'clone') {
        const { sourceProjectId, targetProjectId, targetProjectName, organizationId } = body;
        const cloned = blueprint.cloneBlueprint(sourceProjectId, {
          id: targetProjectId,
          name: targetProjectName,
          organizationId: organizationId || 'org_default',
        });
        return NextResponse.json<ApiResponse>({
          success: true,
          data: cloned,
          meta: { latencyMs: 2, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        });
      }

      if (action === 'promote') {
        const { sourceEnvId, targetEnvId } = body;
        const result = await blueprint.promoteConfiguration(sourceEnvId, targetEnvId);
        return NextResponse.json<ApiResponse>({
          success: true,
          data: result,
          meta: { latencyMs: 2, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        });
      }

      // Default: register blueprint
      blueprint.registerBlueprint(body.blueprint);
      return NextResponse.json<ApiResponse>({
        success: true,
        data: { message: `Blueprint [${body.blueprint?.id}] registered successfully` },
        meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
      });
    } catch (err: any) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: { code: 'BLUEPRINT_OPERATION_FAILED', message: err.message },
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        },
        { status: 400 }
      );
    }
  }
);
