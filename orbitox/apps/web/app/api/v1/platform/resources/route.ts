import { NextRequest, NextResponse } from 'next/server';
import { resourceGraph, resourceRegistry } from '../../_lib/control-plane-brain';
import { ResourceType } from '@orbitox/core/control-plane';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') as ResourceType | null;
    const status = searchParams.get('status');
    const search = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const cursor = parseInt(searchParams.get('cursor') || '0', 10);

    let items = search
      ? resourceGraph.searchResources(search, { type: type || undefined })
      : resourceGraph.getAllNodes(type || undefined);

    if (status) {
      items = items.filter((n) => n.lifecycleStatus === status || n.driftState === status);
    }

    const total = items.length;
    const paginated = items.slice(cursor, cursor + limit);
    const nextCursor = cursor + limit < total ? cursor + limit : null;

    return NextResponse.json({
      success: true,
      data: {
        total,
        items: paginated,
        nextCursor,
        metadata: resourceGraph.getMetadata(),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    resourceGraph.registerNode(body);

    return NextResponse.json({
      success: true,
      data: body,
      metadata: resourceGraph.getMetadata(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 400 }
    );
  }
}
