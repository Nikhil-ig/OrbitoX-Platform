import { NextRequest, NextResponse } from 'next/server';
import { externalProjectEngine } from '@orbitox/external-project-engine';
import { authorizeProjectRequest } from '../../_lib/project-guard';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.projectId;

    const authError = authorizeProjectRequest(req, projectId, 'GET');
    if (authError) return authError;

    const plans = externalProjectEngine.quoteService.listPlans();
    const project = externalProjectEngine.runtimeController.getProject(projectId);

    return NextResponse.json({
      success: true,
      projectId,
      currentPlanReferences: project?.manifest.planReferences || ['plan_restaurant_growth'],
      availablePlans: plans,
    });
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

    const authError = authorizeProjectRequest(req, projectId, 'PUT');
    if (authError) return authError;

    const principal = req.headers.get('x-orbitox-principal');
    if (principal !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin privileges required to update project plans.',
          },
        },
        { status: 403 }
      );
    }

    const body = await req.json();

    const project = externalProjectEngine.runtimeController.getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (body.planReferences) {
      project.manifest.planReferences = body.planReferences;
    }

    const updatedConfig = externalProjectEngine.runtimeController.updateDesiredState(projectId, {
      activePlan: body.primaryPlanId || body.planReferences?.[0],
    });

    return NextResponse.json({
      success: true,
      project,
      signedConfig: updatedConfig,
      message: 'Plan references updated and projected to runtime',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
