import { NextRequest, NextResponse } from 'next/server';
import { externalProjectEngine } from '@orbitox/external-project-engine';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.projectId;
    const apis = externalProjectEngine.apiRegistry.listApis(projectId);

    return NextResponse.json({
      success: true,
      projectId,
      totalApis: apis.length,
      apis,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.projectId;
    const body = await req.json();

    const entry = externalProjectEngine.apiRegistry.registerApi(
      projectId,
      body.pluginId || '@orbitox/core',
      {
        name: body.name,
        route: body.route,
        method: body.method || 'GET',
        version: body.version || 'v1.0.0',
        requiresAuth: Boolean(body.requiresAuth),
        scopes: body.scopes || [],
        rateLimitPerMin: body.rateLimitPerMin || 300,
        description: body.description || '',
      }
    );

    return NextResponse.json({ success: true, api: entry });
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

    const updated = externalProjectEngine.apiRegistry.updateApi(projectId, body.name, body.updates);
    if (!updated) {
      return NextResponse.json({ error: `API not found: ${body.name}` }, { status: 404 });
    }

    return NextResponse.json({ success: true, api: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
