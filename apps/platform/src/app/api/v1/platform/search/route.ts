import { NextRequest, NextResponse } from 'next/server';
import { resourceGraph, resourceRegistry } from '../../_lib/control-plane-brain';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        data: {
          query: '',
          total: 0,
          results: [],
        },
      });
    }

    const matches = resourceGraph.searchResources(query, { limit });

    const results = matches.map((node) => {
      const actions = resourceRegistry.getActionsForResource(node.resourceType, node.lifecycleStatus);
      return {
        resourceId: node.resourceId,
        resourceType: node.resourceType,
        name: node.name,
        lifecycleStatus: node.lifecycleStatus,
        driftState: node.driftState,
        organizationId: node.organizationId,
        projectId: node.projectId,
        environmentId: node.environmentId,
        contextActions: actions.slice(0, 4).map((a) => ({
          id: a.id,
          name: a.name,
          allowed: a.allowed,
          riskLevel: a.riskLevel,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        query,
        total: results.length,
        results,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}
