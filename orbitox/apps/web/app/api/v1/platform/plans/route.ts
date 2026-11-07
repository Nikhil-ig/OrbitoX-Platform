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
      await platformRepository.ensurePlanCatalogueSeeded();
      const pluginId = req.nextUrl?.searchParams?.get('pluginId') || undefined;
      const plans = await platformRepository.listPlans(pluginId);

      return NextResponse.json<ApiResponse>(
        {
          success: true,
          data: plans,
          meta: {
            latencyMs: 1,
            timestamp: new Date().toISOString(),
            requestId: ctx.requestId,
          },
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

export const POST = withApiGuard(
  {
    serviceId: 'platform',
    serviceName: 'Plan Catalogue Service',
    routeClass: 'platform-admin',
    allowPublic: false,
    requiredScopes: ['platform.plans.manage', 'admin'],
  },
  async (req: NextRequest, ctx: ApiRequestContext) => {
    try {
      const body = await req.json();
      if (!body.planId || !body.pluginId || !body.name) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: { code: 'INVALID_INPUT', message: 'Fields "planId", "pluginId", and "name" are required.' },
            meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
          },
          { status: 400 }
        );
      }

      const plan = await platformRepository.createPlan(body);

      await platformRepository.recordPlatformAdminAudit({
        action: 'PLAN_CREATED',
        entityType: 'PLAN',
        entityId: plan.planId,
        actorId: ctx.apiKey || 'platform_admin',
        reason: `Created plan ${plan.planId} for plugin ${plan.pluginId}`,
        metadata: { tier: plan.tier, priceMinor: plan.priceMinor },
      });

      return NextResponse.json<ApiResponse>(
        {
          success: true,
          data: plan,
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        },
        { status: 201 }
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
