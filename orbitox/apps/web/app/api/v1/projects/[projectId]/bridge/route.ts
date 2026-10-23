import { NextRequest, NextResponse } from 'next/server';
import { externalProjectEngine, RuntimeRegistrationError } from '@orbitox/external-project-engine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.projectId;
    const body = await req.json();

    const { action, payload } = body;

    if (action === 'REGISTER') {
      const response = externalProjectEngine.runtimeController.handleRegistration({
        ...payload,
        projectId,
      });
      return NextResponse.json(response);
    }

    if (action === 'HEARTBEAT') {
      externalProjectEngine.runtimeController.handleHeartbeat({
        ...payload,
        projectId,
      });
      const proj = externalProjectEngine.runtimeController.getProject(projectId);
      return NextResponse.json({
        success: true,
        desiredRevision: proj?.desiredRevisionNumber || 1,
        activeRevision: proj?.activeRevisionNumber || 1,
        syncStatus: proj?.syncStatus || 'IN_SYNC',
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'ACKNOWLEDGE_REVISION') {
      externalProjectEngine.runtimeController.acknowledgeAppliedRevision(
        projectId,
        payload.runtimeId || 'runtime',
        payload.appliedRevision,
        payload.status || 'SUCCESS',
        payload.error
      );
      return NextResponse.json({
        success: true,
        acknowledgedRevision: payload.appliedRevision,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'AUDIT') {
      externalProjectEngine.runtimeController.recordAudit({
        id: `aud_${Date.now()}`,
        projectId,
        timestamp: payload.timestamp || new Date().toISOString(),
        actor: payload.actor || 'runtime',
        action: payload.action,
        status: payload.status || 'SUCCESS',
        details: payload.metadata || payload.details,
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: `Unknown bridge action: ${action}` }, { status: 400 });
  } catch (err: any) {
    if (err instanceof RuntimeRegistrationError) {
      return NextResponse.json({ success: false, error: { code: err.code, message: err.message } }, { status: err.status });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.projectId;

    const signedConfig = externalProjectEngine.runtimeController.generateSignedConfiguration(projectId);
    return NextResponse.json(signedConfig);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
