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

    const dependents = resourceGraph.getDependents(resource.resourceId);
    const transitive = resourceGraph.getTransitiveDependents(resource.resourceId);

    return NextResponse.json({
      success: true,
      data: {
        resourceId: resource.resourceId,
        directTotal: dependents.length,
        transitiveTotal: transitive.length,
        directDependents: dependents,
        transitiveDependents: transitive,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}
