import { NextRequest } from 'next/server';
import { restaurantRuntime } from '../_lib/restaurant-runtime';
import { createLegacyProxyResponse } from '../_lib/legacy-proxy';
import { withGuestToken } from '@/app/api/_lib/route-auth';

/**
 * ⚠️ LEGACY COMPATIBILITY PROXY: Public Menu
 * Target runtime: http://localhost:4010/api/restaurant/menu
 */
export const GET = withGuestToken(async (_request: NextRequest, _routeContext, guest) => {
  try {
    const menu = restaurantRuntime.catalogService.getPublicMenu({ locationId: guest.locationId });
    return createLegacyProxyResponse({ success: true, data: menu });
  } catch (error: any) {
    return createLegacyProxyResponse(
      { success: false, error: error.message || 'Failed to fetch public menu' },
      { status: 500 }
    );
  }
});
