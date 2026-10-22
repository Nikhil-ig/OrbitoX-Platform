import { NextRequest, NextResponse } from 'next/server';
import { externalProjectEngine } from '@orbitox/external-project-engine';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.projectId;
    const project = externalProjectEngine.runtimeController.getProject(projectId);

    if (!project) {
      // Check if project exists on disk in projects/external-os
      const slug = projectId.replace('project_', '').replace(/_/g, '-');
      const manifestPath = path.resolve(process.cwd(), '../../projects/external-os', slug, 'orbitox.project.json');
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        return NextResponse.json({ success: true, manifest });
      }
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, manifest: project.manifest });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.projectId;
    const body = await req.json();

    const project = externalProjectEngine.runtimeController.getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    project.manifest = { ...project.manifest, ...body };
    project.updatedAt = new Date().toISOString();

    if (project.localPath) {
      const manifestPath = path.join(project.localPath, 'orbitox.project.json');
      if (fs.existsSync(manifestPath)) {
        fs.writeFileSync(manifestPath, JSON.stringify(project.manifest, null, 2), 'utf8');
      }
    }

    return NextResponse.json({ success: true, manifest: project.manifest });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
