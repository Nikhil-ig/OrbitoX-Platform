import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard } from '@/app/api/v1/_lib/api-guard';
import { ApiResponse, ApiRequestContext } from '@/app/api/v1/_lib/api-types';
import { auditService } from '@/app/api/v1/_lib/platform-governance';
import { platformRepository } from '@/lib/platform-repository';

export const POST = withApiGuard(
  {
    serviceId: 'platform',
    serviceName: 'Platform Keys Service',
    requiredScopes: ['platform.keys.revoke', 'admin'],
    allowPublic: false,
  },
  async (req: NextRequest, ctx: ApiRequestContext) => {
    try {
      const url = new URL(req.url);
      const segments = url.pathname.split('/');
      const keyId = segments[segments.length - 2] || '';
      const body = await req.json().catch(() => ({}));

      const existing = await platformRepository.getApiKey(keyId);
      if (!existing) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: { code: 'KEY_NOT_FOUND', message: `API key [${keyId}] not found` },
            meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
          },
          { status: 404 }
        );
      }

      const reason = body.reason || 'Revoked by Platform Administrator via Control Center';
      const updated = await platformRepository.setKeyStatus(existing.id, 'REVOKED', reason);

      // Record in immutable audit ledger
      await auditService.log({
        action: 'API_KEY_REVOKED',
        entityType: 'PLATFORM_KEY',
        entityId: existing.id,
        userId: ctx.apiKey || 'platform_admin',
        contextId: ctx.tenantId || 'global',
        reason,
        oldValue: { status: existing.status },
        newValue: { status: 'REVOKED', reason },
      });
      await platformRepository.recordPlatformAdminAudit({
        action: 'API_KEY_REVOKED',
        entityType: 'PLATFORM_KEY',
        entityId: existing.id,
        projectId: existing.projectId,
        environmentId: existing.environmentId,
        actorId: ctx.apiKey || 'platform_admin',
        reason,
        metadata: { oldStatus: existing.status, newStatus: 'REVOKED' },
      });

      return NextResponse.json<ApiResponse>({
        success: true,
        data: updated,
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
          error: { code: 'REVOCATION_FAILED', message: err.message },
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        },
        { status: 500 }
      );
    }
  }
);
