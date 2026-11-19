import { NextRequest, NextResponse } from 'next/server';
import { resourceGraph, resourceRegistry, impactAnalysis, policyResolution } from '../../../_lib/control-plane-brain';

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
    const impact = await impactAnalysis.calculateImpact('inspect', resource.resourceId);
    const actions = resourceRegistry.getActionsForResource(resource.resourceType, resource.lifecycleStatus);

    // If resource is API_KEY, evaluate effective authorization
    let effectiveAuth = null;
    if (resource.resourceType === 'API_KEY') {
      effectiveAuth = resourceGraph.getEffectiveKeyAuthorization(resource.resourceId);
    }

    return NextResponse.json({
      success: true,
      data: {
        resource,
        dependencies,
        dependents,
        impactSummary: impact,
        permittedActions: actions,
        effectiveAuth,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}
