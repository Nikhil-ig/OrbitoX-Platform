import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard } from '@/app/api/v1/_lib/api-guard';
import { ApiResponse, ApiRequestContext } from '@/app/api/v1/_lib/api-types';
import { planEntitlement } from '@/app/api/v1/_lib/control-plane-brain';

export const GET = withApiGuard(
  {
    serviceId: 'platform',
    serviceName: 'Platform Effective Plan Service',
    allowPublic: true,
  },
  async (req: NextRequest, ctx: ApiRequestContext) => {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    // Path looks like /api/v1/platform/projects/[id]/effective-plan
    const idIdx = pathParts.indexOf('projects') + 1;
    const projectId = idIdx > 0 && idIdx < pathParts.length ? pathParts[idIdx] : '';

    if (!projectId) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: { code: 'INVALID_PROJECT_ID', message: 'Missing project ID in request path' },
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        },
        { status: 400 }
      );
    }

    try {
      const effectivePlan = planEntitlement.getEffectivePlan(projectId);
      return NextResponse.json<ApiResponse>({
        success: true,
        data: effectivePlan,
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
          error: { code: 'EFFECTIVE_PLAN_ERROR', message: err.message },
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        },
        { status: 404 }
      );
    }
  }
);
