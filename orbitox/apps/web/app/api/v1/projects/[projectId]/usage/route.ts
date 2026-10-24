import { NextRequest, NextResponse } from 'next/server';
import { externalProjectEngine } from '@orbitox/external-project-engine';
import { authorizeProjectRequest } from '../../_lib/project-guard';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.projectId;

    const authError = authorizeProjectRequest(req, projectId, 'POST');
    if (authError) return authError;

    const principal = req.headers.get('x-orbitox-principal');
    if (principal === 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin cannot report runtime usage; use project runtime key.',
          },
        },
        { status: 403 }
      );
    }

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

    const body = await req.json().catch(() => ({}));
    const key = body.key;
    if (!key || typeof key !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Entitlement key is required.',
          },
        },
        { status: 400 }
      );
    }

    const rawAmount = body.amount !== undefined ? Number(body.amount) : 1;
    const amount = Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : 1;

    const report = externalProjectEngine.usageTracking.reportUsage(projectId, key, amount);

    return NextResponse.json({
      success: true,
      key: report.key,
      limit: report.limit,
      used: report.used,
      enforced: report.enforced,
      allowed: report.allowed,
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.projectId;

    const authError = authorizeProjectRequest(req, projectId, 'DELETE');
    if (authError) return authError;

    const principal = req.headers.get('x-orbitox-principal');
    if (principal !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin privileges required to reset usage counters.',
          },
        },
        { status: 403 }
      );
    }

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

    const key = req.nextUrl.searchParams.get('key') || req.nextUrl.searchParams.get('reset') || undefined;
    externalProjectEngine.usageTracking.resetUsage(projectId, key);

    return NextResponse.json({
      success: true,
      projectId,
      key: key || 'ALL_KEYS',
      message: 'Usage counter reset successfully.',
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
