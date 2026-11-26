import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard } from '@/app/api/v1/_lib/api-guard';
import { ApiResponse, ApiRequestContext } from '@/app/api/v1/_lib/api-types';
import { auditConsoleService } from '@/server/audit/audit-console-service';
import { auditService, isDatabasePersistenceEnabled } from '@/app/api/v1/_lib/platform-governance';

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

    let events: any[] = [];
    let chainVerification: any;
    let totalEvents = 0;

    if (isDatabasePersistenceEnabled()) {
      try {
        const overview = await auditConsoleService.queryAuditLogs({
          search: action,
          entityId: contextId,
          pageSize: 100,
        });
        events = overview.items;
        totalEvents = overview.total;
        chainVerification = await auditConsoleService.verifyPostgresAuditChain();
      } catch (err) {
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: {
                code: 'AUDIT_LEDGER_UNAVAILABLE',
                message: `Failed to query audit ledger from persistent storage: ${err instanceof Error ? err.message : String(err)}`,
              },
              meta: {
                latencyMs: 1,
                timestamp: new Date().toISOString(),
                requestId: ctx.requestId,
              },
            },
            { status: 503 }
          );
        }
        events = auditService.query({ action, entityType, contextId }).slice().reverse();
        chainVerification = auditService.verifyChain();
        totalEvents = events.length;
      }
    } else {
      events = auditService.query({ action, entityType, contextId }).slice().reverse();
      chainVerification = auditService.verifyChain();
      totalEvents = events.length;
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        events,
        chainVerification,
        ledgerStatus: chainVerification.valid ? 'INTACT_IMMUTABLE' : 'CHAIN_TAMPERED',
        totalEvents,
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
    let verification: any;

    if (isDatabasePersistenceEnabled()) {
      try {
        verification = await auditConsoleService.verifyPostgresAuditChain();
      } catch (err) {
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: {
                code: 'AUDIT_VERIFICATION_FAILED',
                message: `Database audit verification failed: ${err instanceof Error ? err.message : String(err)}`,
              },
              meta: {
                latencyMs: 1,
                timestamp: new Date().toISOString(),
                requestId: ctx.requestId,
              },
            },
            { status: 503 }
          );
        }
        verification = {
          valid: false,
          totalEntries: 0,
          verifiedChainEntries: 0,
          status: 'UNKNOWN',
          algorithm: 'SHA-256 (PostgreSQL Ledger Verification)',
          details: err instanceof Error ? err.message : 'Database audit verification failure',
        };
      }
    } else {
      const inMemory = auditService.verifyChain();
      verification = {
        valid: inMemory.valid,
        totalEntries: inMemory.totalEntries,
        verifiedChainEntries: inMemory.totalEntries,
        brokenAtIndex: inMemory.brokenAtIndex,
        status: inMemory.valid ? 'VERIFIED' : 'FAILED',
        algorithm: 'SHA-256 (Merkle Hash Chain: previousHash -> rowHash)',
        details: inMemory.valid
          ? `All ${inMemory.totalEntries} in-memory audit records verified.`
          : `Hash chain broken at index ${inMemory.brokenAtIndex}`,
      };
    }

    const isSuccess = verification.status === 'VERIFIED' || (verification.valid === true && verification.status !== 'FAILED');

    return NextResponse.json<ApiResponse>(
      {
        success: verification.status !== 'FAILED',
        data: {
          verification,
          timestamp: new Date().toISOString(),
          verifiedBy: ctx.actorLabel || ctx.keyId || ctx.operatorId || 'platform_admin',
          algorithm: verification.algorithm || 'SHA-256 (Merkle Hash Chain: previousHash -> rowHash)',
          verdict: isSuccess
            ? 'PASSED_CRYPTOGRAPHIC_CONSISTENCY'
            : verification.status === 'UNKNOWN'
              ? 'VERIFICATION_UNAVAILABLE'
              : 'INTEGRITY_BREACH',
        },
        meta: {
          latencyMs: 1,
          timestamp: new Date().toISOString(),
          requestId: ctx.requestId,
        },
      },
      { status: verification.status === 'FAILED' ? 409 : 200 }
    );
  }
);
