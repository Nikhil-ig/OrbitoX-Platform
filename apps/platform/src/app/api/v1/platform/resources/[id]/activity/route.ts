import { NextRequest, NextResponse } from 'next/server';
import { resourceGraph } from '../../../../_lib/control-plane-brain';
import { auditService } from '../../../../_lib/platform-governance';

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

    const auditLogs = auditService.query({ entityId: resource.resourceId });

    return NextResponse.json({
      success: true,
      data: {
        resourceId: resource.resourceId,
        resourceType: resource.resourceType,
        totalEntries: auditLogs.length,
        events: auditLogs,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}
