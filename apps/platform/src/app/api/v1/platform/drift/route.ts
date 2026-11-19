import { NextRequest, NextResponse } from 'next/server';
import { resourceGraph } from '../../_lib/control-plane-brain';

export async function GET(req: NextRequest) {
  try {
    const summary = resourceGraph.getDriftSummary();

    const counts = {
      IN_SYNC: summary.IN_SYNC.length,
      DRIFTED: summary.DRIFTED.length,
      RECONCILING: summary.RECONCILING.length,
      BLOCKED: summary.BLOCKED.length,
      FAILED: summary.FAILED.length,
      UNKNOWN: summary.UNKNOWN.length,
    };

    return NextResponse.json({
      success: true,
      data: {
        summary: counts,
        items: summary,
        totalResources: resourceGraph.getAllNodes().length,
        evaluatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}
