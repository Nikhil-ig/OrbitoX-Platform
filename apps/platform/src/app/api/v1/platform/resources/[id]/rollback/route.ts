import { NextRequest, NextResponse } from 'next/server';
import { resourceEditor } from '../../../../_lib/control-plane-brain';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const result = await resourceEditor.rollbackConfiguration(
      id,
      body.targetVersion,
      body.actor || 'platform_admin'
    );
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
