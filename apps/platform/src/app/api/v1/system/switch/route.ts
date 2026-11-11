import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../../_lib/api-guard';
import { ApiResponse } from '../../_lib/api-types';

/**
 * 🪐 OrbitoX Easy Architecture Switch & State Transfer API
 *
 * Facilitates 1-click / 1-line seamless migration between:
 * - Distributed Clustered Mesh (Redis, PgBouncer, Multi-Node)
 * - Standalone Single Node (Zero-Dependency, Embedded In-Memory V8, Instant Dev/Edge)
 *
 * Includes graceful traffic drain, cryptographic snapshot generation (SHA-256),
 * and state re-hydration with 0 data loss.
 */

export const GET = withApiGuard(
  {
    serviceId: 'system',
    serviceName: 'Architecture Switch & Migration Status',
    requireAuth: false,
    rateLimitPerMin: 300,
  },
  async (req, ctx) => {
    const metrics = PlatformApiState.getClusterMetrics();
    const isDraining = PlatformApiState.isDrainActive();
    const inFlightRequests = PlatformApiState.getInFlightCount();
    const lastReceipt = PlatformApiState.getLastMigrationReceipt();
    const lastSnapshot = PlatformApiState.getLastSnapshot();

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        currentMode: metrics.mode,
        isClustered: metrics.isClustered,
        nodeId: metrics.nodeId,
        isDraining,
        inFlightRequests,
        lastMigrationReceipt: lastReceipt,
        lastSnapshotMetadata: lastSnapshot?.metadata || null,
        capabilities: {
          easySwitchSupported: true,
          zeroDataLossTransfer: true,
          autoTrafficDrain: true,
          cryptographicCheck: true,
          supportedTransitions: [
            { from: 'distributed', to: 'standalone', label: 'Scale Down to Standalone Single Node' },
            { from: 'standalone', to: 'distributed', label: 'Scale Up to Clustered Multi-Server Mesh' },
          ],
        },
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
    serviceName: 'Architecture Switch & State Transfer Operator',
    requireAuth: false,
    rateLimitPerMin: 60,
  },
  async (req, ctx) => {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // empty body
    }

    const targetMode = body.targetMode === 'distributed' ? 'distributed' : 'standalone';
    const transferState = body.transferState !== false;
    const autoDrain = body.autoDrain !== false;

    const result = await PlatformApiState.executeSwitch(targetMode, {
      transferState,
      autoDrain,
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        message: result.message,
        previousMode: result.previousMode,
        currentMode: result.newMode,
        transferReceipt: result.transferReceipt,
        snapshotMetadata: result.snapshot?.metadata || null,
        cluster: PlatformApiState.getClusterMetrics(),
      },
      meta: {
        tenantId: ctx.tenantId,
        serviceId: ctx.serviceId,
        latencyMs: result.transferReceipt.durationMs,
        timestamp: new Date().toISOString(),
        requestId: ctx.requestId,
      },
    });
  }
);
