import { NextRequest, NextResponse } from 'next/server';
import { resourceEditor } from '../../../../_lib/control-plane-brain';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const history = resourceEditor.getConfigurationHistory(id);
    return NextResponse.json({
      success: true,
      data: history,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}
