import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard } from '@/app/api/v1/_lib/api-guard';
import { ApiResponse, ApiRequestContext } from '@/app/api/v1/_lib/api-types';
import { PlatformRepository } from '@orbitox-io/plugin-engine';
import { auditService } from '@/app/api/v1/_lib/platform-governance';

export const POST = withApiGuard(
  {
    serviceId: 'platform',
    serviceName: 'Platform Keys Service',
    requiredScopes: ['platform.keys.rotate', 'admin'],
    allowPublic: false,
  },
  async (req: NextRequest, ctx: ApiRequestContext) => {
    try {
      const url = new URL(req.url);
      const segments = url.pathname.split('/');
      const keyId = segments[segments.length - 2] || '';
      const body = await req.json().catch(() => ({}));

      const existing = PlatformRepository.getApiKey(keyId);
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

      const graceWindowDays = body.graceWindowDays !== undefined ? Number(body.graceWindowDays) : 3;

      const result = PlatformRepository.rotateApiKey(existing.id, {
        graceWindowDays,
        operatorEmail: body.operatorEmail || ctx.apiKey || 'platform_admin@orbitox.io',
      });

      if (!result) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: { code: 'ROTATION_FAILED', message: 'Could not complete key rotation' },
            meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
          },
          { status: 500 }
        );
      }

      // Record in cryptographic audit ledger
      await auditService.log({
        action: 'API_KEY_ROTATED',
        entityType: 'PLATFORM_KEY',
        entityId: existing.id,
        userId: ctx.apiKey || 'platform_admin',
        contextId: ctx.tenantId || 'global',
        reason: `Zero-downtime key rotation. Replacement: [${result.replacementKey.keyId}]. Grace window: ${graceWindowDays} days.`,
        oldValue: { keyId: existing.keyId, status: existing.status },
        newValue: {
          replacementKeyId: result.replacementKey.keyId,
          replacementFingerprint: result.replacementKey.secretFingerprint,
          graceWindowDays,
        },
      });

      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          replacementKey: result.replacementKey,
          replacementRawSecret: result.replacementRawSecret,
          graceWindowDays,
          message: `Key successfully rotated. Previous key will remain active for ${graceWindowDays} days to ensure zero client downtime.`,
        },
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
          error: { code: 'ROTATION_FAILED', message: err.message },
          meta: { latencyMs: 1, timestamp: new Date().toISOString(), requestId: ctx.requestId },
        },
        { status: 500 }
      );
    }
  }
);
