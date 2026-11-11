import { NextRequest, NextResponse } from 'next/server';
import { resourceGraph, reconciliation } from '../../_lib/control-plane-brain';
import { auditService } from '../../_lib/platform-governance';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    
    // Get recent audit log entries
    const auditRecords = (auditService as any).queryLedger
      ? (auditService as any).queryLedger({ limit })
      : (auditService as any).getRecords
      ? (auditService as any).getRecords()
      : [];

    // Scan for recent drifts / operations across graph
    const nodes = resourceGraph.getAllNodes();
    const activeNodes = nodes.filter((n) => n.driftState !== 'IN_SYNC' || n.lifecycleStatus === 'PROVISIONING');

    return NextResponse.json({
      success: true,
      data: {
        operations: auditRecords,
        activeReconciliations: activeNodes.map((n) => ({
          resourceId: n.resourceId,
          name: n.name,
          type: n.resourceType,
          driftState: n.driftState,
          status: n.lifecycleStatus,
          updatedAt: n.updatedAt,
        })),
        totalNodes: nodes.length,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}
