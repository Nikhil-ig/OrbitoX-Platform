import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard } from '@/app/api/v1/_lib/api-guard';
import { ApiResponse, ApiRequestContext } from '@/app/api/v1/_lib/api-types';
import { planEntitlement } from '@/app/api/v1/_lib/control-plane-brain';

export const POST = withApiGuard(
  {
    serviceId: 'platform',
    serviceName: 'Platform Entitlement Engine',
    allowPublic: true,
  },
  async (req: NextRequest, ctx: ApiRequestContext) => {
    try {
      const body = await req.json();
      const { type, projectId, environmentId, packageId, featureKey, keyId, capability } = body;

      let verdict;
      if (type === 'package') {
        verdict = planEntitlement.isProjectEntitledToPackage(projectId, packageId);
      } else if (type === 'feature') {
        verdict = planEntitlement.isEnvironmentEntitledToFeature(environmentId, featureKey);
      } else if (type === 'capability') {
        verdict = planEntitlement.isKeyEntitledToCapability(keyId, capability);
      } else {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: { code: 'INVALID_ENTITLEMENT_TYPE', message: 'Type must be "package", "feature", or "capability"' },
            meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
          },
          { status: 400 }
        );
      }

      return NextResponse.json<ApiResponse>({
        success: true,
        data: verdict,
        meta: { latencyMs: 2, timestamp: new Date().toISOString(), requestId: ctx.requestId },
      });
    } catch (err: any) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: { code: 'ENTITLEMENT_EVALUATION_FAILED', message: err.message },
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        },
        { status: 400 }
      );
    }
  }
);
