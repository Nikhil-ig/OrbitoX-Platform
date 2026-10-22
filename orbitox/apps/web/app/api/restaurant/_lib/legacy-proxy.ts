/**
 * ⚠️ LEGACY COMPATIBILITY PROXY HELPER
 * ─────────────────────────────────────────────────────────────────────────────
 * ARCHITECTURAL BOUNDARY:
 * OrbitoX Platform on port 3005 is strictly an authoritative CONTROL PLANE.
 * It is NOT the runtime host for culinary operations, diner carts, or KDS queues.
 *
 * All endpoints under /api/restaurant/* are maintained solely as a temporary
 * backward-compatibility proxy layer during the platform remediation transition.
 *
 * PRODUCTION CLIENT INSTRUCTION:
 * Point your API clients, POS integrations, and Mobile PWAs directly to the
 * independent runtime plane product:
 *   http://localhost:4010/api/restaurant/*
 *
 * REMOVAL PLAN:
 * - Phase 1: Annotate all legacy endpoints with deprecation headers & audit telemetry (CURRENT)
 * - Phase 2: Redirect all incoming /api/restaurant/* calls with HTTP 307 to runtime plane
 * - Phase 3: Sunset and complete removal in OrbitoX Platform v2.0.0
 */

import { NextResponse } from 'next/server';

export const LEGACY_PROXY_HEADERS = {
  'X-Legacy-Proxy': 'true',
  'X-OrbitoX-Plane': 'CONTROL_PLANE_LEGACY_ADAPTER',
  'X-Deprecation-Warning':
    'DEPRECATED: /api/restaurant/* routes on port 3005 are legacy proxies. Connect directly to the independent Runtime Product at http://localhost:4010. Sunset removal scheduled for v2.0.',
  'X-Runtime-Target': 'http://localhost:4010',
};

export function createLegacyProxyResponse(data: any, init?: ResponseInit): NextResponse {
  const headers = new Headers(init?.headers);
  for (const [key, val] of Object.entries(LEGACY_PROXY_HEADERS)) {
    headers.set(key, val);
  }
  return NextResponse.json(data, {
    ...init,
    headers,
  });
}
