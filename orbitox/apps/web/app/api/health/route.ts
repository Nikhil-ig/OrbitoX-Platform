import { NextResponse } from 'next/server';
import { PlatformRepository } from '@orbitox-io/plugin-engine';

/** Liveness probe for Docker / load balancers. Public, minimal, no internals. */
export const dynamic = 'force-dynamic';

export function GET() {
  try {
    PlatformRepository.initialize();
    PlatformRepository.assertPersistenceHealthy();
    return NextResponse.json({ ok: true, service: 'orbitox-control-plane' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json(
      { ok: false, service: 'orbitox-control-plane' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
