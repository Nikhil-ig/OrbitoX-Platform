import { NextRequest } from 'next/server';
import { withRestaurantGuard } from '@/app/api/_lib/route-auth';
import { forwardSignedBridgeCall } from '../_lib/restaurant-routing';

/**
 * 🛰️ OrbitoX RestaurantOS — Kitchen Display System (KDS) Bridge Gateway (Phase 2b-5)
 * Staff and admin operations that stay on the platform.
 * Cryptographically forwarded and signed with @orbitox-io/bridge.
 * Verified tenant extracted strictly from the platform principal, NEVER from client input.
 */
export const GET = withRestaurantGuard(
  async (request: NextRequest, _routeContext, authContext) => {
    return forwardSignedBridgeCall(
      request,
      '/api/restaurant/kds',
      authContext.tenantId
    );
  },
  { adminOnly: true, sensitive: true }
);

export const POST = withRestaurantGuard(
  async (request: NextRequest, _routeContext, authContext) => {
    return forwardSignedBridgeCall(
      request,
      '/api/restaurant/kds',
      authContext.tenantId
    );
  },
  { adminOnly: true, sensitive: true }
);
