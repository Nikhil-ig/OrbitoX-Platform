import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard } from '@/app/api/v1/_lib/api-guard';
import { ApiResponse, ApiRequestContext } from '@/app/api/v1/_lib/api-types';
import { auditService } from '@/app/api/v1/_lib/platform-governance';

export const GET = withApiGuard(
  {
    serviceId: 'platform',
    serviceName: 'Platform Audit Service',
    routeClass: 'platform-admin',
    requiredScopes: ['platform.audit.read', 'admin'],
  },
  async (req: NextRequest, ctx: ApiRequestContext) => {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || undefined;
    const entityType = url.searchParams.get('entityType') || undefined;
    const contextId = url.searchParams.get('contextId') || undefined;

    const events = auditService.query({ action, entityType, contextId });
    const chainVerification = auditService.verifyChain();

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        events: events.slice().reverse(), // most recent first
        chainVerification,
        ledgerStatus: chainVerification.valid ? 'INTACT_IMMUTABLE' : 'CHAIN_TAMPERED',
        totalEvents: events.length,
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
    serviceName: 'Platform Audit Service',
    requiredScopes: ['platform.audit.verify', 'admin'],
    allowPublic: false,
  },
  async (req: NextRequest, ctx: ApiRequestContext) => {
    const verification = auditService.verifyChain();

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        verification,
        timestamp: new Date().toISOString(),
        verifiedBy: ctx.apiKey || 'platform_admin',
        algorithm: 'SHA-256 (Merkle Hash Chain: previousHash -> rowHash)',
        verdict: verification.valid ? 'PASSED_CRYPTOGRAPHIC_CONSISTENCY' : 'INTEGRITY_BREACH',
      },
      meta: {
        latencyMs: 1,
        timestamp: new Date().toISOString(),
        requestId: ctx.requestId,
      },
    });
  }
);
