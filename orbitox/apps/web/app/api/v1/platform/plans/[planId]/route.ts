import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard } from '@/app/api/v1/_lib/api-guard';
import { ApiResponse, ApiRequestContext } from '@/app/api/v1/_lib/api-types';
import { platformRepository } from '@/lib/platform-repository';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  {
    serviceId: 'platform',
    serviceName: 'Plan Catalogue Service',
    routeClass: 'platform-admin',
    allowPublic: false,
    requiredScopes: ['platform.plans', 'admin'],
  },
  async (req: NextRequest, ctx: ApiRequestContext) => {
    try {
      const url = new URL(req.url);
      const planId = url.pathname.split('/').pop() || '';

      const plan = await platformRepository.getPlan(planId);
      if (!plan) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: { code: 'NOT_FOUND', message: `Plan "${planId}" not found.` },
            meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
          },
          { status: 404 }
        );
      }

      return NextResponse.json<ApiResponse>(
        {
          success: true,
          data: plan,
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    } catch (err: any) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: { code: 'INTERNAL', message: err.message },
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        },
        { status: 500 }
      );
    }
  }
);

export const PATCH = withApiGuard(
  {
    serviceId: 'platform',
    serviceName: 'Plan Catalogue Service',
    routeClass: 'platform-admin',
    allowPublic: false,
    requiredScopes: ['platform.plans.manage', 'admin'],
  },
  async (req: NextRequest, ctx: ApiRequestContext) => {
    try {
      const url = new URL(req.url);
      const planId = url.pathname.split('/').pop() || '';
      const body = await req.json();

      const updated = await platformRepository.updatePlan(planId, body);

      await platformRepository.recordPlatformAdminAudit({
        action: 'PLAN_UPDATED',
        entityType: 'PLAN',
        entityId: planId,
        actorId: ctx.apiKey || 'platform_admin',
        reason: `Updated plan ${planId}`,
        metadata: { updates: body },
      });

      return NextResponse.json<ApiResponse>({
        success: true,
        data: updated,
        meta: { latencyMs: 2, timestamp: new Date().toISOString(), requestId: ctx.requestId },
      });
    } catch (err: any) {
      const status = err.message?.includes('not found') ? 404 : 500;
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: { code: status === 404 ? 'NOT_FOUND' : 'INTERNAL', message: err.message },
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        },
        { status }
      );
    }
  }
);

export const PUT = PATCH;
