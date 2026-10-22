import { NextRequest, NextResponse } from 'next/server';
import { resourceGraph } from '../../../_lib/control-plane-brain';

export async function POST(req: NextRequest) {
  try {
    const report = resourceGraph.verifyGraphIntegrity();

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}
