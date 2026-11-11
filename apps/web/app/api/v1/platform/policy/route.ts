import { NextRequest, NextResponse } from 'next/server';
import { policyResolution } from '../../_lib/control-plane-brain';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const environmentId = searchParams.get('environmentId') || 'proj_omni_production';
    const property = searchParams.get('property') || 'rateLimitPerMin';

    const result = await policyResolution.resolvePolicy(environmentId, property);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}
