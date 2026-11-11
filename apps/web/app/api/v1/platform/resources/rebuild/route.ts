import { NextRequest, NextResponse } from 'next/server';
import { resourceGraph, platformRepoProvider } from '../../../_lib/control-plane-brain';
import { auditService } from '../../../_lib/platform-governance';

export async function POST(req: NextRequest) {
  try {
    const report = await resourceGraph.rebuildFromAuthoritativeSources(platformRepoProvider);

    await auditService.log({
      action: 'GRAPH_REBUILD_TRIGGERED',
      entityType: 'RESOURCE_GRAPH',
      entityId: 'graph_projection_master',
      userId: 'operator_system',
      contextId: 'context_global',
      reason: 'Manual or lifecycle triggered authoritative projection rebuild from PlatformRepository',
      newValue: {
        nodeCount: report.nodeCount,
        edgeCount: report.edgeCount,
        status: report.status,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        rebuilt: true,
        report,
        metadata: resourceGraph.getMetadata(),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}
