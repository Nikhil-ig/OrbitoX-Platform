import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { ApiResponse } from '@/app/api/v1/_lib/api-types';
import { approvalEngine, auditService, isDatabasePersistenceEnabled } from '@/app/api/v1/_lib/platform-governance';
import { getOperatorSession, OPERATOR_SESSION_COOKIE } from '@/server/accounts/account-service';
import { validOperatorCsrf } from '@/server/auth/operator-auth';
import { unsealTotpSecret, getTotpStep } from '@/server/auth/account-security';
import { recordPlatformAuditEvent } from '@/server/audit/audit-console-service';

function getCanonicalOperatorRoles(role: string): string[] {
  switch (role) {
    case 'PLATFORM_OWNER':
      return ['PLATFORM_OWNER', 'PLATFORM_SUPERADMIN', 'SECURITY_ADMIN', 'INFRA_LEAD', 'OPERATOR'];
    case 'OPERATOR':
      return ['OPERATOR'];
    case 'BILLING':
      return ['BILLING'];
    case 'SUPPORT_READONLY':
      return ['SUPPORT_READONLY'];
    default:
      return [role];
  }
}

async function resolveOperatorCaller(req: NextRequest): Promise<{
  operatorId: string;
  email: string;
  role: string;
  roles: string[];
  reauthenticatedAt?: Date | null;
  isCookieAuth: boolean;
  csrfTokenHash?: string;
} | null> {
  const authHeader = req.headers.get('authorization')?.trim() || '';
  const bearerCandidate = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
  const cookieCandidate = req.cookies.get(OPERATOR_SESSION_COOKIE)?.value;

  const sessionToken = cookieCandidate || bearerCandidate;
  if (!sessionToken) {
    return null;
  }

  const session = await getOperatorSession(sessionToken);
  if (!session || !session.operatorId) {
    return null;
  }

  return {
    operatorId: session.operatorId,
    email: session.email,
    role: session.role,
    roles: getCanonicalOperatorRoles(session.role),
    reauthenticatedAt: session.reauthenticatedAt,
    isCookieAuth: Boolean(cookieCandidate),
    csrfTokenHash: session.csrfTokenHash,
  };
}

export async function GET(req: NextRequest) {
  const caller = await resolveOperatorCaller(req);
  if (!caller) {
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authenticated operator session required.' },
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
    const caller = await resolveOperatorCaller(req);
    if (!caller) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authenticated operator session required.' },
        },
        { status: 401 }
      );
    }

    if (caller.isCookieAuth && !validOperatorCsrf(req, caller.csrfTokenHash || '')) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: { code: 'CSRF_INVALID', message: 'CSRF validation failed.' },
        },
        { status: 403 }
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

    const targetStageId =
      stageId ||
      approvalRequest.stages.find((s) => s.status === 'PENDING')?.stageId ||
      approvalRequest.stages[0]?.stageId ||
      'stage_1';

    if (action === 'APPROVE') {
      // Step-up verification for high-risk approval
      const hasRecentReauth =
        caller.reauthenticatedAt &&
        Date.now() - new Date(caller.reauthenticatedAt).getTime() <= 5 * 60 * 1000;

      if (!hasRecentReauth) {
        if (!totpCode || typeof totpCode !== 'string' || !/^\d{6}$/.test(totpCode.trim())) {
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: { code: 'INVALID_TOTP', message: 'Valid 6-digit TOTP code is required.' },
            },
            { status: 403 }
          );
        }

        const operator = await prisma.platformOperator.findUnique({
          where: { id: caller.operatorId },
          select: { mfaTotpSealed: true, lastTotpStep: true },
        });

        if (!operator || !operator.mfaTotpSealed) {
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: { code: 'MFA_REQUIRED', message: 'Operator MFA is not configured.' },
            },
            { status: 403 }
          );
        }

        const secret = unsealTotpSecret(operator.mfaTotpSealed);
        const step = getTotpStep(secret, totpCode.trim());

        if (step === null) {
          // TOTP code is invalid
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: { code: 'INVALID_TOTP', message: 'Invalid 6-digit TOTP code.' },
            },
            { status: 403 }
          );
        }

        // Atomic TOTP step consumption to prevent replay attack
        const now = new Date();
        const updateRes = await prisma.platformOperator.updateMany({
          where: {
            id: caller.operatorId,
            OR: [
              { lastTotpStep: null },
              { lastTotpStep: { lt: step } },
            ],
          },
          data: {
            lastTotpStep: step,
            updatedAt: now,
          },
        });

        if (updateRes.count !== 1) {
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: {
                code: 'TOTP_REPLAY_DETECTED',
                message: 'TOTP code has already been consumed. Replay is rejected.',
              },
            },
            { status: 403 }
          );
        }
      }

      // Execute approval with atomic transactional persistence
      try {
        const updated = await approvalEngine.approveStage(
          requestId,
          targetStageId,
          caller.email,
          caller.roles,
          comments
        );

        await auditService.log({
          action: 'FOUR_EYES_APPROVAL_GRANTED',
          entityType: approvalRequest.entityType || 'APPROVAL_REQUEST',
          entityId: requestId,
          userId: caller.operatorId,
          userEmail: caller.email,
          contextId: approvalRequest.contextId || 'global',
          reason: comments || 'Operator approved four-eyes authorization stage',
          newValue: { status: updated.status, stageId: targetStageId, approvedBy: caller.email },
        });

        if (isDatabasePersistenceEnabled() && (prisma as any)?.platformAuditEvent?.create) {
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
          });
        }

        return NextResponse.json<ApiResponse>({
          success: true,
          data: updated,
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: crypto.randomUUID() },
        });
      } catch (err: any) {
        const message = err?.message || 'Approval execution failed.';
        const isSelfApproval = message.includes('SELF_APPROVAL_FORBIDDEN');
        const isInsufficientRole = message.includes('INSUFFICIENT_ROLES');
        const isConflict = message.includes('CONCURRENCY_CONFLICT');
        const status = isSelfApproval || isInsufficientRole ? 403 : isConflict ? 409 : 400;
        const code = isSelfApproval
          ? 'SELF_APPROVAL_FORBIDDEN'
          : isInsufficientRole
          ? 'INSUFFICIENT_ROLES'
          : isConflict
          ? 'CONCURRENCY_CONFLICT'
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
      // Execute rejection with atomic transactional persistence and role check
      try {
        const updated = await approvalEngine.rejectRequest(
          requestId,
          targetStageId,
          caller.email,
          caller.roles,
          comments
        );

        await auditService.log({
          action: 'FOUR_EYES_APPROVAL_REJECTED',
          entityType: approvalRequest.entityType || 'APPROVAL_REQUEST',
          entityId: requestId,
          userId: caller.operatorId,
          userEmail: caller.email,
          contextId: approvalRequest.contextId || 'global',
          reason: comments || 'Operator rejected four-eyes authorization stage',
          newValue: { status: 'REJECTED', stageId: targetStageId, rejectedBy: caller.email },
        });

        if (isDatabasePersistenceEnabled() && (prisma as any)?.platformAuditEvent?.create) {
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
          });
        }

        return NextResponse.json<ApiResponse>({
          success: true,
          data: updated,
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: crypto.randomUUID() },
        });
      } catch (err: any) {
        const message = err?.message || 'Rejection failed.';
        const isInsufficientRole = message.includes('INSUFFICIENT_ROLES');
        const isConflict = message.includes('CONCURRENCY_CONFLICT');
        const status = isInsufficientRole ? 403 : isConflict ? 409 : 400;
        const code = isInsufficientRole
          ? 'INSUFFICIENT_ROLES'
          : isConflict
          ? 'CONCURRENCY_CONFLICT'
          : 'REJECTION_FAILED';

        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: { code, message },
          },
          { status }
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
