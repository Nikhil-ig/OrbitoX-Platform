import { NextRequest, NextResponse } from 'next/server';
import { resourceGraph } from '../../../_lib/control-plane-brain';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, targetPlanTier } = body;

    if (!projectId || !targetPlanTier) {
      return NextResponse.json(
        { success: false, error: { message: 'Missing required fields: projectId, targetPlanTier' } },
        { status: 400 }
      );
    }

    const preflight = resourceGraph.preflightPlanDowngrade(projectId, targetPlanTier);

    return NextResponse.json({
      success: true,
      data: preflight,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}
