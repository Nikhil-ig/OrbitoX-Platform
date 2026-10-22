import { NextResponse } from 'next/server';
import { StudioStorageService } from '@/services/StudioStorageService';
import { CanonicalProjectDocument } from '@/types/CanonicalProjectDocument';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { searchParams } = new URL(req.url);
    const contextId = searchParams.get('contextId') || undefined;

    const project = StudioStorageService.getProject(params.id, contextId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, project });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to retrieve project' }, { status: 500 });
  }
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const body = await req.json();
    const patch = body as CanonicalProjectDocument;

    const existing = StudioStorageService.getProject(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const merged: CanonicalProjectDocument = {
      ...existing,
      ...patch,
      id: existing.id,
      metadata: {
        ...existing.metadata,
        ...(patch.metadata || {}),
        updatedAt: new Date().toISOString(),
      },
    };

    const saved = StudioStorageService.saveProject(merged);
    return NextResponse.json({ success: true, project: saved });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update project' }, { status: 500 });
  }
}
