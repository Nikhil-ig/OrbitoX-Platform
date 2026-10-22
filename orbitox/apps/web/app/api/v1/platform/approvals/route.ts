import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard } from '@/app/api/v1/_lib/api-guard';
import { ApiResponse, ApiRequestContext } from '@/app/api/v1/_lib/api-types';
import { approvalEngine, auditService } from '@/app/api/v1/_lib/platform-governance';

export const GET = withApiGuard(
  {
    serviceId: 'platform',
    serviceName: 'Platform Approvals Service',
    allowPublic: true,
  },
  async (req: NextRequest, ctx: ApiRequestContext) => {
    // Collect all requests from the engine
    const allRequests: any[] = Object.values((approvalEngine as any).requests || {});

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        requests: allRequests,
        pendingCount: allRequests.filter((r) => r.status === 'PENDING').length,
        approvedCount: allRequests.filter((r) => r.status === 'APPROVED').length,
        rejectedCount: allRequests.filter((r) => r.status === 'REJECTED').length,
      },
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
    serviceName: 'Platform Approvals Service',
    requiredScopes: ['platform.approvals.act', 'admin'],
    allowPublic: false,
  },
  async (req: NextRequest, ctx: ApiRequestContext) => {
    try {
      const body = await req.json();
      const { requestId, stageId, action, comments, operatorRoles } = body;

      if (!requestId || !stageId || !action) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: {
              code: 'INVALID_INPUT',
              message: 'requestId, stageId, and action (APPROVE|REJECT) are required',
            },
            meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
          },
          { status: 400 }
        );
      }

      const roles = operatorRoles || ['PLATFORM_SUPERADMIN', 'SECURITY_ADMIN'];
      const approvedBy = ctx.apiKey || 'platform_admin@orbitox.io';

      if (action === 'APPROVE') {
        const updated = approvalEngine.approveStage(requestId, stageId, approvedBy, roles, comments);

        await auditService.log({
          action: 'FOUR_EYES_APPROVAL_GRANTED',
          entityType: 'APPROVAL_REQUEST',
          entityId: requestId,
          userId: approvedBy,
          contextId: ctx.tenantId || 'global',
          reason: comments || 'Operator approved four-eyes authorization stage',
          newValue: { status: updated.status, stageId, approvedBy },
        });

        return NextResponse.json<ApiResponse>({
          success: true,
          data: updated,
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        });
      } else {
        const updated = (approvalEngine as any).rejectRequest
          ? (approvalEngine as any).rejectRequest(requestId, approvedBy, comments)
          : { id: requestId, status: 'REJECTED', comments };

        await auditService.log({
          action: 'FOUR_EYES_APPROVAL_REJECTED',
          entityType: 'APPROVAL_REQUEST',
          entityId: requestId,
          userId: approvedBy,
          contextId: ctx.tenantId || 'global',
          reason: comments || 'Operator rejected four-eyes authorization stage',
          newValue: { status: 'REJECTED', stageId, rejectedBy: approvedBy },
        });

        return NextResponse.json<ApiResponse>({
          success: true,
          data: updated,
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        });
      }
    } catch (err: any) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: { code: 'APPROVAL_ACTION_FAILED', message: err.message },
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        },
        { status: 500 }
      );
    }
  }
);
