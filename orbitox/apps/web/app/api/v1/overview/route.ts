import { NextRequest, NextResponse } from 'next/server';
import { externalProjectEngine, PersistentControlStore } from '@orbitox/external-project-engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/overview
 * Master overview of fleet status, active attention flags, and recent audit activity.
 * Protected by ORBITOX_ADMIN_TOKEN via middleware.ts.
 */
export async function GET(req: NextRequest) {
  try {
    const store = PersistentControlStore.getInstance();
    const snapshot = externalProjectEngine.fleet.snapshot();
    const projectsMap = store.getProjects();

    const needsAttention = snapshot.projects.filter((p) => p.attention.length > 0);

    const allAudits = store.getAudits();
    const recentActivity = allAudits.slice(0, 30).map((audit) => {
      const proj = projectsMap[audit.projectId];
      return {
        id: audit.id,
        projectId: audit.projectId,
        projectName: proj?.name ?? audit.projectId,
        projectSlug: proj?.slug ?? audit.projectId,
        timestamp: audit.timestamp,
        actor: audit.actor,
        action: audit.action,
        status: audit.status,
        details: audit.details,
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          summary: snapshot.summary,
          needsAttention,
          recentActivity,
          generatedAt: snapshot.generatedAt,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: { code: 'INTERNAL', message } }, { status: 500 });
  }
}
