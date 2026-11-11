import { NextRequest, NextResponse } from 'next/server';
import { resourceGraph, policyResolution } from '../../../../_lib/control-plane-brain';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const capability = searchParams.get('capability') || undefined;

    const resource = resourceGraph.getNode(id);
    if (!resource) {
      return NextResponse.json(
        { success: false, error: { message: `Resource [${id}] not found in platform graph.` } },
        { status: 404 }
      );
    }

    if (resource.resourceType === 'API_KEY') {
      const authExplanation = resourceGraph.getEffectiveKeyAuthorization(resource.resourceId, capability);
      return NextResponse.json({
        success: true,
        data: {
          resourceType: 'API_KEY',
          resourceId: resource.resourceId,
          name: resource.name,
          ...authExplanation,
        },
      });
    }

    // Standard Policy Resolution Derivation Tree
    const property = searchParams.get('property') || 'rateLimitPerMin';
    const resolution = await policyResolution.resolvePolicy(resource.resourceId, property);

    return NextResponse.json({
      success: true,
      data: {
        resourceId: resource.resourceId,
        resourceType: resource.resourceType,
        ...resolution,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}
