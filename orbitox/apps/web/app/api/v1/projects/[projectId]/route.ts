import { NextRequest, NextResponse } from 'next/server';
import {
  externalProjectEngine,
  PersistentControlStore,
  ONLINE_WINDOW_MS,
  STALE_WINDOW_MS,
  FleetConnection,
  FleetAttention,
} from '@orbitox/external-project-engine';

export const dynamic = 'force-dynamic';

function ts(value: string | undefined | null): number {
  if (!value) return 0;
  const n = Date.parse(value);
  return Number.isNaN(n) ? 0 : n;
}

function classify(session: any, nowMs: number): { connection: FleetConnection; ageMs: number | null } {
  if (!session || !session.lastHeartbeatAt) return { connection: 'NEVER_CONNECTED', ageMs: null };
  const lastMs = ts(session.lastHeartbeatAt);
  if (lastMs === 0) return { connection: 'NEVER_CONNECTED', ageMs: null };
  const ageMs = Math.max(0, nowMs - lastMs);
  if (ageMs <= ONLINE_WINDOW_MS) return { connection: 'ONLINE', ageMs };
  if (ageMs <= STALE_WINDOW_MS) return { connection: 'STALE', ageMs };
  return { connection: 'OFFLINE', ageMs };
}

/**
 * GET /api/v1/projects/{projectId}
 * Full project record, session state, revision drift, commands, and capabilities.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const store = PersistentControlStore.getInstance();

    const project = store.getProject(projectId);
    const session = store.getSession(projectId);

    if (!project && !session) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: `Project ${projectId} not found` } },
        { status: 404 }
      );
    }

    const nowMs = Date.now();
    const { connection, ageMs } = classify(session, nowMs);

    const environments = store.getEnvironments(projectId);
    const plugins = store.getPlugins(projectId);
    const revisions = store.getRevisions(projectId);
    const commands = store.getCommands(projectId);
    const audits = store.getAudits(projectId);

    const desiredRevision = session?.desiredRevision ?? project?.desiredRevisionNumber ?? 1;
    const appliedRevision = session?.appliedRevision ?? project?.activeRevisionNumber ?? 0;
    const revisionDrift = Math.max(0, desiredRevision - appliedRevision);
    const syncStatus = session?.syncStatus ?? project?.syncStatus ?? (revisionDrift > 0 ? 'OUT_OF_SYNC' : 'IN_SYNC');

    const failedCommands = commands.filter((c) => c.status === 'FAILED').length;
    const queuedCommands = commands.filter((c) => c.status === 'QUEUED' || c.status === 'DISPATCHED').length;

    const attention: FleetAttention[] = [];
    if (connection === 'OFFLINE') attention.push('OFFLINE');
    if (connection === 'NEVER_CONNECTED') attention.push('NEVER_CONNECTED');
    if (connection === 'STALE') attention.push('STALE');
    if (syncStatus === 'OUT_OF_SYNC' || revisionDrift > 0) attention.push('OUT_OF_SYNC');
    if (failedCommands > 0) attention.push('FAILED_COMMAND');

    const anySession = session as any;
    const anyProject = project as any;
    const manifest = anySession?.manifest ?? anyProject?.manifest ?? {
      projectId,
      name: project?.name ?? session?.slug ?? projectId,
      slug: session?.slug ?? project?.slug ?? projectId,
      version: anySession?.version ?? anyProject?.manifest?.version ?? '1.0.0',
      type: 'custom-os',
      runtime: {
        type: 'standalone',
        entrypoint: 'n/a',
        defaultPort: session?.runtimePort ?? 3000,
        healthEndpoint: '/health',
      },
      capabilities: session?.capabilities ?? [],
      apis: session?.declaredApis ?? [],
      enabledPlugins: plugins.filter((p) => p.enabled).map((p) => p.name),
      enabledFeatures: [],
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          id: projectId,
          slug: session?.slug ?? project?.slug ?? projectId,
          name: project?.name ?? session?.slug ?? projectId,
          status: project?.status ?? (connection === 'ONLINE' ? 'ACTIVE' : 'INACTIVE'),
          connection,
          lastSeenSecondsAgo: ageMs === null ? null : Math.round(ageMs / 1000),
          lastHeartbeatAt: session?.lastHeartbeatAt ?? null,
          registeredAt: session?.registeredAt ?? project?.createdAt ?? null,
          desiredRevision,
          appliedRevision,
          revisionDrift,
          syncStatus,
          runtime: {
            url: session?.runtimeUrl ?? null,
            port: session?.runtimePort ?? null,
            version: anySession?.version ?? manifest?.version ?? '1.0.0',
            uptimeSeconds: session?.metrics?.uptimeSeconds ?? null,
            memoryMb: session?.metrics?.memoryMb ?? null,
            pid: session?.metrics?.pid ?? null,
            declaredApis: session?.declaredApis ?? [],
            capabilities: session?.capabilities ?? [],
          },
          manifest,
          environments,
          plugins,
          revisions,
          commandsCount: {
            total: commands.length,
            queued: queuedCommands,
            failed: failedCommands,
          },
          lastActivity: audits[0]
            ? {
                timestamp: audits[0].timestamp,
                action: audits[0].action,
                actor: audits[0].actor,
                status: audits[0].status,
              }
            : null,
          attention,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: { code: 'INTERNAL', message } }, { status: 500 });
  }
}
