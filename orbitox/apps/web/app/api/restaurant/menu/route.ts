import { NextRequest } from 'next/server';
import { restaurantRuntime } from '../_lib/restaurant-runtime';
import { createLegacyProxyResponse } from '../_lib/legacy-proxy';

/**
 * ⚠️ LEGACY COMPATIBILITY PROXY: Public Menu
 * Target runtime: http://localhost:4010/api/restaurant/menu
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const locationId = searchParams.get('locationId') || 'loc_ludhiana';

    const menu = restaurantRuntime.catalogService.getPublicMenu({ locationId });
    return createLegacyProxyResponse({ success: true, data: menu });
  } catch (error: any) {
    return createLegacyProxyResponse(
      { success: false, error: error.message || 'Failed to fetch public menu' },
      { status: 500 }
    );
  }
}
