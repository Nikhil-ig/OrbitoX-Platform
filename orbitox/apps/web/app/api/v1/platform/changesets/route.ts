import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard } from '@/app/api/v1/_lib/api-guard';
import { ApiResponse, ApiRequestContext } from '@/app/api/v1/_lib/api-types';
import { changeSet } from '@/app/api/v1/_lib/control-plane-brain';

export const POST = withApiGuard(
  {
    serviceId: 'platform',
    serviceName: 'Platform ChangeSet Engine',
    requiredScopes: ['platform.changesets.read'],
  },
  async (req: NextRequest, ctx: ApiRequestContext) => {
    try {
      const body = await req.json();
      const { action = 'plan', name, description, steps = [], changeSetId, actor = 'operator', autoRollback = true } = body;

      if (action === 'plan') {
        const plan = changeSet.createChangeSetPlan(name || 'Ad-hoc ChangeSet', description || '', steps);
        return NextResponse.json<ApiResponse>({
          success: true,
          data: plan,
          meta: { latencyMs: 2, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        });
      }

      if (action === 'execute') {
        const plan = changeSet.getChangeSet(changeSetId);
        if (!plan) {
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: { code: 'CHANGESET_NOT_FOUND', message: `ChangeSet [${changeSetId}] not found.` },
              meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
            },
            { status: 404 }
          );
        }

        const execution = await changeSet.executeChangeSet(plan, { actor, autoRollback, dryRun: false });
        return NextResponse.json<ApiResponse>({
          success: true,
          data: execution,
          meta: { latencyMs: 10, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        });
      }

      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: { code: 'INVALID_ACTION', message: `Unknown action [${action}]. Allowed: plan, execute` },
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        },
        { status: 400 }
      );
    } catch (err: any) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: { code: 'CHANGESET_ERROR', message: err.message },
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        },
        { status: 400 }
      );
    }
  }
);
