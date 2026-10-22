import { NextRequest, NextResponse } from 'next/server';
import { resourceEditor } from '../../_lib/control-plane-brain';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const results = resourceEditor.searchConfigurations(query);
    return NextResponse.json({
      success: true,
      data: results,
      total: results.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}
