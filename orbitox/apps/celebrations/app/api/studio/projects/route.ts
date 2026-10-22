import { NextResponse } from 'next/server';
import { StudioStorageService } from '@/services/StudioStorageService';
import { CanonicalProjectDocument } from '@/types/CanonicalProjectDocument';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const contextId = searchParams.get('contextId') || undefined;
    const projects = StudioStorageService.listProjects(contextId);
    return NextResponse.json({ success: true, projects });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list projects' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const project = body as CanonicalProjectDocument;

    if (!project || !project.id || !project.slug) {
      return NextResponse.json({ error: 'Invalid project document payload' }, { status: 400 });
    }

    const saved = StudioStorageService.saveProject(project);
    return NextResponse.json({ success: true, project: saved });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create project' }, { status: 500 });
  }
}
