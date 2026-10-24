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

    const project = externalProjectEngine.runtimeController.getProject(projectId);
    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Project ${projectId} not found.`,
          },
        },
        { status: 404 }
      );
    }

    const entitlements = externalProjectEngine.usageTracking.getProjectEntitlements(projectId);

    return NextResponse.json({
      success: true,
      projectId,
      entitlements,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err.message,
        },
      },
      { status: 500 }
    );
  }
}
