import { NextRequest, NextResponse } from 'next/server';
import { reconciliation } from '../../_lib/control-plane-brain';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { resourceId } = body;

    if (resourceId) {
      const result = await reconciliation.reconcileResource(resourceId);
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    const summary = await reconciliation.reconcileAll();
    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}
