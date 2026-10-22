import { NextRequest, NextResponse } from 'next/server';
import { externalProjectEngine } from '@orbitox/external-project-engine';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.projectId;

    const revisions = externalProjectEngine.runtimeController.listRevisions(projectId);
    const proj = externalProjectEngine.runtimeController.getProject(projectId);
    const desiredState = externalProjectEngine.runtimeController.getDesiredState(projectId);

    return NextResponse.json({
      success: true,
      projectId,
      desiredRevisionNumber: proj?.desiredRevisionNumber || 1,
      activeRevisionNumber: proj?.activeRevisionNumber || 1,
      syncStatus: proj?.syncStatus || 'IN_SYNC',
      desiredState,
      revisions,
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
    const { action = 'APPLY', revisionId, desiredState, createdBy = 'platform:admin' } = body;

    if (action === 'DRAFT') {
      const draft = externalProjectEngine.runtimeController.createDraftRevision(
        projectId,
        desiredState,
        createdBy
      );
      return NextResponse.json({ success: true, revision: draft });
    }

    if (action === 'APPLY') {
      let targetRevisionId = revisionId;
      if (!targetRevisionId && desiredState) {
        const draft = externalProjectEngine.runtimeController.createDraftRevision(
          projectId,
          desiredState,
          createdBy
        );
        targetRevisionId = draft.revisionId;
      }

      if (!targetRevisionId) {
        return NextResponse.json({ error: 'Missing revisionId or desiredState' }, { status: 400 });
      }

      const outcome = externalProjectEngine.runtimeController.applyRevision(projectId, targetRevisionId);
      return NextResponse.json({
        success: true,
        revision: outcome.revision,
        signedConfig: outcome.signedConfig,
      });
    }

    if (action === 'ROLLBACK') {
      if (!revisionId) {
        return NextResponse.json({ error: 'Missing revisionId for rollback' }, { status: 400 });
      }
      const revisions = externalProjectEngine.runtimeController.listRevisions(projectId);
      const targetRev = revisions.find((r) => r.revisionId === revisionId);
      if (!targetRev) {
        return NextResponse.json({ error: 'Target revision not found' }, { status: 404 });
      }
      // Create new draft with target state and apply
      const draft = externalProjectEngine.runtimeController.createDraftRevision(
        projectId,
        targetRev.desiredState,
        `rollback:to:${revisionId}`
      );
      const outcome = externalProjectEngine.runtimeController.applyRevision(projectId, draft.revisionId);
      return NextResponse.json({
        success: true,
        message: `Successfully rolled back to revision ${targetRev.revisionNumber}`,
        revision: outcome.revision,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
