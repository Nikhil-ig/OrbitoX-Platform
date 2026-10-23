import { NextResponse } from 'next/server';

/** Liveness probe for Docker / load balancers. Public, minimal, no internals. */
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ ok: true, service: 'orbitox-control-plane' }, { headers: { 'Cache-Control': 'no-store' } });
}
