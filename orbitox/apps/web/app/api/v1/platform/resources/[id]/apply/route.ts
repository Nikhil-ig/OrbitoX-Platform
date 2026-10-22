import { NextRequest, NextResponse } from 'next/server';
import { resourceEditor } from '../../../../_lib/control-plane-brain';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const result = await resourceEditor.applyConfiguration({
      resourceId: id,
      expectedVersion: body.expectedVersion,
      changes: body.changes || {},
      reason: body.reason,
      actor: body.actor || 'platform_admin',
    });
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error('[API apply error]', err);
    const errMsg = err?.message || String(err || 'Unknown error');
    const isConflict = errMsg.includes('RESOURCE_VERSION_CONFLICT') || errMsg.includes('CONFLICT');
    const isValidation = errMsg.includes('VALIDATION_FAILED') || errMsg.includes('Validation');
    return NextResponse.json(
      { success: false, error: { message: errMsg } },
      { status: isConflict ? 409 : isValidation ? 422 : 500 }
    );
  }
}
