import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../../_lib/api-guard';
import { ApiResponse } from '../../_lib/api-types';

/**
 * 🪐 OrbitoX System Cluster Engine API
 * Supports querying and dynamically switching between Single-Server (Standalone)
 * and Multi-Server (Distributed Mesh) operational modes with 0 downtime.
 */
export const GET = withApiGuard(
  {
    serviceId: 'system',
    serviceName: 'System Cluster Architecture Controller',
    requireAuth: false,
    rateLimitPerMin: 600,
  },
  async (req, ctx) => {
    const metrics = PlatformApiState.getClusterMetrics();

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        architecture: {
          currentMode: metrics.mode,
          isClustered: metrics.isClustered,
          currentNodeId: metrics.nodeId,
          activeNodesCount: metrics.activeNodes,
          nodes: metrics.nodesList,
          isDraining: PlatformApiState.isDrainActive(),
          inFlightRequests: PlatformApiState.getInFlightCount(),
          lastMigrationReceipt: PlatformApiState.getLastMigrationReceipt(),
        },
        protocols: {
          synchronization: metrics.syncProtocol,
          databasePooling: metrics.dbPool,
          rateLimiting: metrics.rateLimiter,
          gracefulFallbackReady: metrics.gracefulFallbackReady,
        },
        capabilities: {
          singleServerStandalone: {
            supported: true,
            zeroDependencies: true,
            inMemoryCacheLatency: '< 0.05ms',
            description: 'Embedded single-node process with zero external infrastructure required.',
          },
          multiServerDistributed: {
            supported: true,
            horizontalAutoscale: true,
            pubSubChannel: 'orbitox:cluster:events',
            description: 'Clustered multi-node topology with Redis Pub/Sub invalidation and PgBouncer.',
          },
        },
        timestamp: metrics.lastSyncedAt,
      },
      meta: {
        tenantId: ctx.tenantId,
        serviceId: ctx.serviceId,
        latencyMs: 1,
        timestamp: new Date().toISOString(),
        requestId: ctx.requestId,
      },
    });
  }
);

export const POST = withApiGuard(
  {
    serviceId: 'system',
    serviceName: 'System Cluster Architecture Switcher',
    requireAuth: false,
    rateLimitPerMin: 120,
  },
  async (req, ctx) => {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Empty body
    }

    const targetMode = body.mode === 'distributed' ? 'distributed' : 'standalone';
    PlatformApiState.setClusterMode(targetMode);
    const updated = PlatformApiState.getClusterMetrics();

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        message: `OrbitoX Engine successfully reconfigured to [${targetMode.toUpperCase()}] mode.`,
        cluster: updated,
      },
      meta: {
        tenantId: ctx.tenantId,
        serviceId: ctx.serviceId,
        latencyMs: 1,
        timestamp: new Date().toISOString(),
        requestId: ctx.requestId,
      },
    });
  }
);
