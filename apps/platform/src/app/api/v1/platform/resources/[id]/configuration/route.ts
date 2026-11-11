import { NextRequest, NextResponse } from 'next/server';
import { resourceEditor } from '../../../../_lib/control-plane-brain';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const config = resourceEditor.getConfiguration(id);
    const draft = resourceEditor.getDraft(id);
    return NextResponse.json({
      success: true,
      data: {
        ...config,
        draft: draft?.draft || null,
        draftUpdatedAt: draft?.updatedAt || null,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: err.message.includes('not found') ? 404 : 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    if (body.action === 'draft') {
      const result = resourceEditor.saveDraft(id, body.changes || {});
      return NextResponse.json({ success: true, data: result });
    }
    return NextResponse.json({ success: false, error: { message: 'Invalid action. Supported: draft' } }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message } }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const discarded = resourceEditor.discardDraft(id);
    return NextResponse.json({ success: true, data: { discarded } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message } }, { status: 500 });
  }
}
