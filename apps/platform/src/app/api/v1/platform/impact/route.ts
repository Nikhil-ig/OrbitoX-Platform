import { NextRequest, NextResponse } from 'next/server';
import { impactAnalysis } from '../../_lib/control-plane-brain';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, targetResourceId, proposedPayload } = body;

    if (!action || !targetResourceId) {
      return NextResponse.json(
        { success: false, error: { message: 'Must provide action and targetResourceId.' } },
        { status: 400 }
      );
    }

    const impact = await impactAnalysis.calculateImpact(action, targetResourceId, proposedPayload);

    return NextResponse.json({
      success: true,
      data: impact,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}
