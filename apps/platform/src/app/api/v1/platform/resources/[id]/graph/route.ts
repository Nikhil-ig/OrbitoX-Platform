import { NextRequest, NextResponse } from 'next/server';
import { resourceGraph } from '../../../../_lib/control-plane-brain';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const resource = resourceGraph.getNode(id);
    if (!resource) {
      return NextResponse.json(
        { success: false, error: { message: `Resource [${id}] not found in platform graph.` } },
        { status: 404 }
      );
    }

    const dependencies = resourceGraph.getDependencies(resource.resourceId);
    const dependents = resourceGraph.getDependents(resource.resourceId);

    const relatedNodes = [resource, ...dependencies, ...dependents];
    const relatedNodeIds = new Set(relatedNodes.map((n) => n.resourceId));

    const localEdges = resourceGraph.getAllEdges().filter(
      (e) => relatedNodeIds.has(e.sourceId) && relatedNodeIds.has(e.targetId)
    );

    return NextResponse.json({
      success: true,
      data: {
        centerNodeId: resource.resourceId,
        nodes: relatedNodes,
        edges: localEdges,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}
