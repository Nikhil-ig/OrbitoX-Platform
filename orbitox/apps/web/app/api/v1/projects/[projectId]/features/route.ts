import { NextRequest, NextResponse } from 'next/server';
import { externalProjectEngine } from '@orbitox/external-project-engine';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.projectId;
    const signedConfig = externalProjectEngine.runtimeController.generateSignedConfiguration(projectId);

    return NextResponse.json({
      success: true,
      projectId,
      features: signedConfig.features,
      entitlements: signedConfig.entitlements,
      mcpTools: signedConfig.mcpTools,
      desiredState: signedConfig.desiredState,
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
    const body = await req.json();

    const signedConfig = externalProjectEngine.runtimeController.updateDesiredState(projectId, {
      features: body.features,
      entitlements: body.entitlements,
      customConfig: body.desiredState,
    });

    externalProjectEngine.runtimeController.recordAudit({
      id: `aud_${Date.now()}`,
      projectId,
      timestamp: new Date().toISOString(),
      actor: 'platform_admin',
      action: 'DESIRED_STATE_UPDATED',
      status: 'SUCCESS',
      details: { configVersion: signedConfig.configVersion },
    });

    return NextResponse.json({
      success: true,
      message: 'Features and desired state updated. Projected to external runtime.',
      signedConfig,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
