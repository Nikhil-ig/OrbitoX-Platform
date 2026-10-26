import { NextRequest } from 'next/server';
import { restaurantRuntime } from '../_lib/restaurant-runtime';
import { createLegacyProxyResponse } from '../_lib/legacy-proxy';
import { withRestaurantGuard } from '@/app/api/_lib/route-auth';

/**
 * ⚠️ LEGACY COMPATIBILITY PROXY: Kitchen Display System (KDS)
 * Target runtime: http://localhost:4010/api/restaurant/kds/tasks
 */
export const GET = withRestaurantGuard(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const stationId = searchParams.get('stationId') || 'st_tandoor';

    const queue = restaurantRuntime.orderKitchenService.getStationQueue(stationId);
    return createLegacyProxyResponse({ success: true, data: queue });
  } catch (error: any) {
    return createLegacyProxyResponse(
      { success: false, error: error.message || 'Failed to fetch KDS queue' },
      { status: 500 }
    );
  }
}, { adminOnly: true, sensitive: true });

export const POST = withRestaurantGuard(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { taskId, newStatus, bumpedBy } = body;

    if (!taskId || !newStatus) {
      return createLegacyProxyResponse(
        { success: false, error: 'taskId and newStatus are required' },
        { status: 400 }
      );
    }

    const updatedTask = restaurantRuntime.orderKitchenService.updateTaskStatus({
      taskId,
      newStatus,
      bumpedBy,
    });

    return createLegacyProxyResponse({ success: true, data: updatedTask });
  } catch (error: any) {
    return createLegacyProxyResponse(
      { success: false, error: error.message || 'Failed to update task status' },
      { status: 422 }
    );
  }
}, { adminOnly: true, sensitive: true });
