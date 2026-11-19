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

    const desired = resource.desiredState || {};
    const observed = resource.observedState || {};

    const differences: Record<string, { desired: unknown; observed: unknown }> = {};
    const allKeys = new Set([...Object.keys(desired), ...Object.keys(observed)]);

    for (const key of allKeys) {
      const dVal = (desired as any)[key];
      const oVal = (observed as any)[key];
      if (JSON.stringify(dVal) !== JSON.stringify(oVal)) {
        differences[key] = { desired: dVal, observed: oVal };
      }
    }

    const isDrifted = Object.keys(differences).length > 0;

    return NextResponse.json({
      success: true,
      data: {
        resourceId: resource.resourceId,
        resourceType: resource.resourceType,
        driftState: resource.driftState,
        isDrifted,
        differences,
        desiredState: desired,
        observedState: observed,
        lastObservedAt: resource.updatedAt,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}
