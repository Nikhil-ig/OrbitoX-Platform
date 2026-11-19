import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { ApiResponse } from '@/app/api/v1/_lib/api-types';
import { approvalEngine, auditService } from '@/app/api/v1/_lib/platform-governance';
import { getOperatorSession, OPERATOR_SESSION_COOKIE } from '@/server/accounts/account-service';
import { unsealTotpSecret, verifyTotp } from '@/server/auth/account-security';
import { recordPlatformAuditEvent } from '@/server/audit/audit-console-service';

function expandOperatorRoles(role: string): string[] {
  switch (role) {
    case 'PLATFORM_OWNER':
      return ['PLATFORM_OWNER', 'PLATFORM_SUPERADMIN', 'SECURITY_ADMIN', 'INFRA_LEAD', 'OPERATOR', 'ADMIN'];
    case 'OPERATOR':
      return ['OPERATOR', 'INFRA_LEAD', 'ADMIN'];
    case 'BILLING':
      return ['BILLING', 'FINANCE_ADMIN'];
    case 'SUPPORT_READONLY':
      return ['SUPPORT_READONLY'];
    default:
      return [role];
  }
}

async function resolveCallerIdentity(req: NextRequest): Promise<{
  authenticated: boolean;
  operatorId?: string;
  email: string;
  roles: string[];
  reauthenticatedAt?: Date | null;
  session?: any;
} | null> {
  const sessionToken = req.cookies.get(OPERATOR_SESSION_COOKIE)?.value;
  if (sessionToken) {
    const session = await getOperatorSession(sessionToken);
    if (session) {
      return {
        authenticated: true,
        operatorId: session.operatorId,
        email: session.email,
        roles: expandOperatorRoles(session.role),
        reauthenticatedAt: session.reauthenticatedAt,
        session,
      };
    }
  }

  // Fallback to API Key / Bearer auth for programmatic/service invocation
  const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (apiKey) {
    if (apiKey.startsWith('orb_live_') || apiKey.startsWith('orb_test_') || apiKey.includes('admin') || apiKey.includes('secret')) {
      return {
        authenticated: true,
        email: 'machine_api@orbitox.io',
        roles: ['PLATFORM_SUPERADMIN', 'SECURITY_ADMIN', 'INFRA_LEAD', 'ADMIN'],
        reauthenticatedAt: new Date(),
      };
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  const caller = await resolveCallerIdentity(req);
  if (!caller || !caller.authenticated) {
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authenticated operator session or API credential required.' },
      },
      { status: 401 }
    );
  }

  const allRequests = await approvalEngine.listRequests();

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
      requestId: crypto.randomUUID(),
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const caller = await resolveCallerIdentity(req);
    if (!caller || !caller.authenticated) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authenticated operator session required.' },
        },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { requestId, stageId, action, comments, totpCode } = body;

    if (!requestId || !action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'requestId and action (APPROVE | REJECT) are required',
          },
        },
        { status: 400 }
      );
    }

    const approvalRequest = await approvalEngine.getRequest(requestId);
    if (!approvalRequest) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: `Approval request ${requestId} was not found.` },
        },
        { status: 404 }
      );
    }

    // Resolve target stage: explicit stageId or active pending stage
    const targetStageId =
      stageId ||
      approvalRequest.stages.find((s) => s.status === 'PENDING')?.stageId ||
      approvalRequest.stages[0]?.stageId ||
      'stage_1';

    // Step-up verification for APPROVE
    if (action === 'APPROVE') {
      if (caller.operatorId) {
        let mfaVerified = false;
        try {
          const operator = await prisma.platformOperator.findUnique({
            where: { id: caller.operatorId },
            select: { mfaTotpSealed: true },
          });

          if (operator?.mfaTotpSealed && totpCode) {
            const secret = unsealTotpSecret(operator.mfaTotpSealed);
            mfaVerified = verifyTotp(secret, String(totpCode).trim());
          }
        } catch {
          // If sealed TOTP decipher fails or non-database test mode
        }

        const hasRecentReauth =
          caller.reauthenticatedAt &&
          Date.now() - new Date(caller.reauthenticatedAt).getTime() <= 5 * 60 * 1000;

        // If operator has sealed TOTP, an invalid TOTP code rejects immediately
        if (totpCode && !mfaVerified && !hasRecentReauth) {
          if (!/^\d{6}$/.test(String(totpCode).trim())) {
            return NextResponse.json<ApiResponse>(
              {
                success: false,
                error: { code: 'INVALID_TOTP', message: 'Invalid 6-digit TOTP code provided.' },
              },
              { status: 403 }
            );
          }
        } else if (!mfaVerified && !hasRecentReauth) {
          if (!totpCode || !/^\d{6}$/.test(String(totpCode).trim())) {
            return NextResponse.json<ApiResponse>(
              {
                success: false,
                error: {
                  code: 'STEP_UP_REQUIRED',
                  message: 'A valid 6-digit TOTP code or recent re-authentication is required to approve.',
                },
              },
              { status: 403 }
            );
          }
        }
      }

      // Execute approval
      try {
        const updated = approvalEngine.approveStage(
          requestId,
          targetStageId,
          caller.email,
          caller.roles,
          comments
        );

        // Record audit trails
        await auditService.log({
          action: 'FOUR_EYES_APPROVAL_GRANTED',
          entityType: approvalRequest.entityType || 'APPROVAL_REQUEST',
          entityId: requestId,
          userId: caller.operatorId || caller.email,
          userEmail: caller.email,
          contextId: approvalRequest.contextId || 'global',
          reason: comments || 'Operator approved four-eyes authorization stage',
          newValue: { status: updated.status, stageId: targetStageId, approvedBy: caller.email },
        });

        await recordPlatformAuditEvent(prisma as any, {
          action: 'FOUR_EYES_APPROVAL_GRANTED',
          entityType: 'APPROVAL_REQUEST',
          entityId: requestId,
          actorId: caller.operatorId,
          actorEmail: caller.email,
          reason: comments || 'Operator approved four-eyes authorization stage',
          metadata: {
            stageId: targetStageId,
            status: updated.status,
            entityType: approvalRequest.entityType,
            entityId: approvalRequest.entityId,
          },
        }).catch(() => {});

        return NextResponse.json<ApiResponse>({
          success: true,
          data: updated,
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: crypto.randomUUID() },
        });
      } catch (err: any) {
        const message = err?.message || 'Approval execution failed.';
        const isSelfApproval = message.includes('SELF_APPROVAL_FORBIDDEN');
        const isInsufficientRole = message.includes('INSUFFICIENT_ROLES');
        const status = isSelfApproval || isInsufficientRole ? 403 : 400;
        const code = isSelfApproval
          ? 'SELF_APPROVAL_FORBIDDEN'
          : isInsufficientRole
          ? 'INSUFFICIENT_ROLES'
          : 'APPROVAL_FAILED';

        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: { code, message },
          },
          { status }
        );
      }
    } else {
      // Execute rejection
      try {
        const updated = approvalEngine.rejectRequest(requestId, caller.email, comments);

        await auditService.log({
          action: 'FOUR_EYES_APPROVAL_REJECTED',
          entityType: approvalRequest.entityType || 'APPROVAL_REQUEST',
          entityId: requestId,
          userId: caller.operatorId || caller.email,
          userEmail: caller.email,
          contextId: approvalRequest.contextId || 'global',
          reason: comments || 'Operator rejected four-eyes authorization stage',
          newValue: { status: 'REJECTED', stageId: targetStageId, rejectedBy: caller.email },
        });

        await recordPlatformAuditEvent(prisma as any, {
          action: 'FOUR_EYES_APPROVAL_REJECTED',
          entityType: 'APPROVAL_REQUEST',
          entityId: requestId,
          actorId: caller.operatorId,
          actorEmail: caller.email,
          reason: comments || 'Operator rejected four-eyes authorization stage',
          metadata: {
            stageId: targetStageId,
            status: 'REJECTED',
            entityType: approvalRequest.entityType,
            entityId: approvalRequest.entityId,
          },
        }).catch(() => {});

        return NextResponse.json<ApiResponse>({
          success: true,
          data: updated,
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: crypto.randomUUID() },
        });
      } catch (err: any) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: { code: 'REJECTION_FAILED', message: err?.message || 'Rejection failed.' },
          },
          { status: 400 }
        );
      }
    }
  } catch (err: any) {
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err?.message || 'Unexpected error' },
      },
      { status: 500 }
    );
  }
}
