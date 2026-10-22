import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../../../_lib/api-guard';
import { ApiResponse } from '../../../_lib/api-types';

/**
 * 🪐 OrbitoX Architecture Snapshot Export & Restore API
 *
 * Allows exporting a portable, cryptographically sealed (SHA-256) JSON snapshot
 * of the entire running platform state (projects, API keys, service quotas, providers,
 * rate limits, and audit logs) and importing it into any Standalone or Distributed node.
 */

export const GET = withApiGuard(
  {
    serviceId: 'system',
    serviceName: 'System State Snapshot Exporter',
    requireAuth: false,
    rateLimitPerMin: 120,
  },
  async (req, ctx) => {
    const isDownload = req.nextUrl.searchParams.get('download') === 'true';
    const snapshot = PlatformApiState.exportSnapshot();

    if (isDownload) {
      const fileName = `orbitox-snapshot-${snapshot.metadata.snapshotId}.json`;
      const jsonContent = JSON.stringify(snapshot, null, 2);

      return new Response(jsonContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'x-orbitox-snapshot-id': snapshot.metadata.snapshotId,
          'x-orbitox-snapshot-checksum': snapshot.metadata.checksum,
        },
      });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        snapshot,
        downloadUrl: '/api/v1/system/switch/snapshot?download=true',
      },
      meta: {
        tenantId: ctx.tenantId,
        serviceId: ctx.serviceId,
        latencyMs: 2,
        timestamp: new Date().toISOString(),
        requestId: ctx.requestId,
      },
    });
  }
);

export const POST = withApiGuard(
  {
    serviceId: 'system',
    serviceName: 'System State Snapshot Restorer',
    requireAuth: false,
    rateLimitPerMin: 60,
  },
  async (req, ctx) => {
    let payload: any = null;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_JSON',
            message: 'Failed to parse JSON body. Please provide a valid OrbitoX snapshot object.',
          },
          meta: {
            tenantId: ctx.tenantId,
            serviceId: ctx.serviceId,
            latencyMs: 1,
            timestamp: new Date().toISOString(),
            requestId: ctx.requestId,
          },
        },
        { status: 400 }
      );
    }

    try {
      // Handle either direct snapshot or { snapshot: ... }
      const snapshotObj = payload.snapshot || payload;
      const result = PlatformApiState.importSnapshot(snapshotObj);

      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          message: result.message,
          stats: result.stats,
          cluster: PlatformApiState.getClusterMetrics(),
        },
        meta: {
          tenantId: ctx.tenantId,
          serviceId: ctx.serviceId,
          latencyMs: 2,
          timestamp: new Date().toISOString(),
          requestId: ctx.requestId,
        },
      });
    } catch (err: any) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'RESTORE_FAILED',
            message: err.message || 'Snapshot ingestion failed verification.',
          },
          meta: {
            tenantId: ctx.tenantId,
            serviceId: ctx.serviceId,
            latencyMs: 1,
            timestamp: new Date().toISOString(),
            requestId: ctx.requestId,
          },
        },
        { status: 422 }
      );
    }
  }
);
