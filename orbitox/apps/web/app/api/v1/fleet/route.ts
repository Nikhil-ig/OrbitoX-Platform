import { NextRequest, NextResponse } from 'next/server';
import { externalProjectEngine, FleetConnection } from '@orbitox/external-project-engine';

export const dynamic = 'force-dynamic';

const CONNECTIONS: FleetConnection[] = ['ONLINE', 'STALE', 'OFFLINE', 'NEVER_CONNECTED'];

/**
 * GET /api/v1/fleet
 * Real-time overview of every project connected to this control plane.
 *
 * Query: ?q=<text>  ?connection=ONLINE|STALE|OFFLINE|NEVER_CONNECTED  ?attention=1
 * Protected by the admin token (see middleware.ts).
 */
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const connectionParam = params.get('connection')?.toUpperCase() as FleetConnection | undefined;
    if (connectionParam && !CONNECTIONS.includes(connectionParam)) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: `connection must be one of: ${CONNECTIONS.join(', ')}` } },
        { status: 400 },
      );
    }

    const snapshot = externalProjectEngine.fleet.snapshot({
      q: params.get('q') ?? undefined,
      connection: connectionParam,
      attentionOnly: params.get('attention') === '1' || params.get('attention') === 'true',
    });

    return NextResponse.json({ success: true, data: snapshot }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: { code: 'INTERNAL', message } }, { status: 500 });
  }
}
