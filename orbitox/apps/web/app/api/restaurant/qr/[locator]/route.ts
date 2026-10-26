import { NextRequest } from 'next/server';
import { restaurantRuntime } from '../../_lib/restaurant-runtime';
import { createLegacyProxyResponse } from '../../_lib/legacy-proxy';
import { withPublicGuestBootstrap } from '@/app/api/_lib/route-auth';

/**
 * ⚠️ LEGACY COMPATIBILITY PROXY: QR Discovery
 * Target runtime: http://localhost:4010/api/restaurant/qr/:locator
 */
export const GET = withPublicGuestBootstrap(async (
  request: NextRequest,
  { params }: { params: Promise<{ locator: string }> }
) => {
  try {
    const { locator } = await params;
    const discovery = restaurantRuntime.qrService.resolveDiscoveryContext(locator);
    return createLegacyProxyResponse({ success: true, data: discovery });
  } catch (error: any) {
    return createLegacyProxyResponse(
      { success: false, error: error.message || 'Failed to resolve QR locator' },
      { status: 404 }
    );
  }
});
