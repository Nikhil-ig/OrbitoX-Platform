import { NextRequest, NextResponse } from 'next/server';
import { resourceEditor } from '../../../../_lib/control-plane-brain';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const actions = resourceEditor.getAvailableActions(id);
    return NextResponse.json({
      success: true,
      data: actions,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: err.message.includes('not found') ? 404 : 500 }
    );
  }
}
