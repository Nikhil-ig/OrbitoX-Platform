import { NextRequest, NextResponse } from 'next/server';
import { externalProjectEngine } from '@orbitox/external-project-engine';
import * as path from 'path';

export async function GET(req: NextRequest) {
  try {
    const templates = externalProjectEngine.factory.listTemplates();
    const projects = externalProjectEngine.runtimeController.listProjects();

    return NextResponse.json({
      success: true,
      templates,
      projects,
      totalProjects: projects.length,
      platformStatus: 'OPERATIONAL',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.slug || !body.name || !body.type) {
      return NextResponse.json(
        { error: 'Missing required fields: slug, name, type' },
        { status: 400 }
      );
    }

    const repoRoot = path.resolve(process.cwd(), '../..');

    const project = externalProjectEngine.factory.createProject({
      slug: body.slug,
      name: body.name,
      type: body.type,
      templateId: body.templateId,
      businessModel: body.businessModel || 'O2O2B2B2C',
      defaultPort: body.defaultPort,
      enabledPlugins: body.enabledPlugins,
      enabledFeatures: body.enabledFeatures,
      apis: body.apis,
      planReferences: body.planReferences,
      controlPlaneUrl: body.controlPlaneUrl || 'http://localhost:3005',
      workspaceRoot: repoRoot,
    });

    return NextResponse.json({
      success: true,
      project,
      message: `Project created at projects/external-os/${body.slug}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
