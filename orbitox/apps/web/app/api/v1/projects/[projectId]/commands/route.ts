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

    const authError = authorizeProjectRequest(req, projectId, 'POLL_COMMANDS');
    if (authError) return authError;

    const statusFilter = req.nextUrl.searchParams.get('status');

    let commands = externalProjectEngine.runtimeController.getCommands(projectId);
    if (statusFilter) {
      commands = commands.filter((c) => c.status === statusFilter);
    }

    return NextResponse.json({ success: true, commands });
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

    const { action = 'ISSUE', commandAction, parameters = {}, commandId, result, error } = body;

    if (action === 'ISSUE') {
      // Only administrators may issue commands; runtimes may only report completion.
      if (req.headers.get('x-orbitox-principal') !== 'admin') {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'Only an administrator can issue commands.' } },
          { status: 403 },
        );
      }
      if (!commandAction) {
        return NextResponse.json({ error: 'Missing commandAction' }, { status: 400 });
      }
      const cmd = externalProjectEngine.runtimeController.issueCommand(
        projectId,
        commandAction,
        parameters,
        'platform:admin'
      );
      return NextResponse.json({ success: true, command: cmd });
    }

    const authError = authorizeProjectRequest(req, projectId, action);
    if (authError) return authError;

    if (action === 'COMPLETE') {
      if (!commandId) {
        return NextResponse.json({ error: 'Missing commandId' }, { status: 400 });
      }
      externalProjectEngine.runtimeController.completeCommand(commandId, result, error);
      return NextResponse.json({ success: true, commandId });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
