import { NextRequest } from 'next/server';
import { restaurantRuntime } from '../_lib/restaurant-runtime';
import { createLegacyProxyResponse } from '../_lib/legacy-proxy';
import { QRTrustEngine } from '@orbitox/pos';
import { withGuestToken } from '@/app/api/_lib/route-auth';

/**
 * ⚠️ LEGACY COMPATIBILITY PROXY: Orders Submission and Status
 * Target runtime: http://localhost:4010/api/restaurant/orders
 */
export const POST = withGuestToken(async (request: NextRequest, _routeContext, tokenPayload) => {
  try {
    const body = await request.json();
    const { quoteId, cartItems, idempotencyKey, specialInstructions } = body;
    const capabilityToken = request.headers.get('x-guest-token') || '';

    if (!quoteId || !cartItems) {
      return createLegacyProxyResponse(
        { success: false, error: 'quoteId and cartItems are required' },
        { status: 400 }
      );
    }

    // 1. Verify and redeem quote
    const redeemedQuote = restaurantRuntime.catalogService.redeemQuote(quoteId, cartItems);

    // Submit against the active session identified by the verified guest token.
    const catalogMap = restaurantRuntime.getCatalogMap();
    const submittedOrder = restaurantRuntime.orderKitchenService.submitOrder({
      tenantId: tokenPayload.tenantId,
      companyId: tokenPayload.companyId,
      locationId: tokenPayload.locationId,
      sessionId: tokenPayload.diningSessionId,
      participantId: tokenPayload.participantId,
      quote: redeemedQuote,
      cartItems,
      catalogItems: catalogMap,
      idempotencyKey,
      specialInstructions,
    });

    // 4. Auto-accept and schedule into Kitchen DAG (only if newly SUBMITTED)
    let confirmedOrder = submittedOrder;
    let tasks: any[] = [];

    if (submittedOrder.commercialState === 'SUBMITTED') {
      const scheduled = restaurantRuntime.orderKitchenService.acceptAndScheduleOrder({
        orderId: submittedOrder.id,
        expectedVersion: submittedOrder.version,
      });
      confirmedOrder = scheduled.order;
      tasks = scheduled.tasks;

      // 5. Emit Realtime Events to Session Room and Station Rooms
      const sessionRoom = `session:${tokenPayload.tenantId}:${tokenPayload.locationId}:${tokenPayload.diningSessionId}`;
      restaurantRuntime.realtimeGateway.emitToRoom({
        room: sessionRoom,
        eventType: 'order.confirmed',
        tenantId: tokenPayload.tenantId,
        locationId: tokenPayload.locationId,
        sessionId: tokenPayload.diningSessionId,
        payload: {
          orderId: confirmedOrder.id,
          orderNumber: confirmedOrder.orderNumber,
          customerStage: 'CONFIRMED',
          progressPercent: 40,
        },
      });

      for (const task of tasks) {
        const stationRoom = `station:${tokenPayload.tenantId}:${tokenPayload.locationId}:${task.stationId}`;
        restaurantRuntime.realtimeGateway.emitToRoom({
          room: stationRoom,
          eventType: 'kitchen.task_scheduled',
          tenantId: tokenPayload.tenantId,
          locationId: tokenPayload.locationId,
          payload: {
            taskId: task.id,
            orderNumber: confirmedOrder.orderNumber,
            itemName: task.itemName,
            quantity: task.quantity,
            fireAt: task.fireAt,
            targetServeAt: task.targetServeAt,
          },
        });
      }
    }

    return createLegacyProxyResponse({
      success: true,
      data: {
        orderId: confirmedOrder.id,
        orderNumber: confirmedOrder.orderNumber,
        status: confirmedOrder.commercialState,
        customerStage: 'CONFIRMED',
        totalMinor: confirmedOrder.totalMinor.toString(),
        tasksCount: tasks.length,
      },
    });
  } catch (error: any) {
    return createLegacyProxyResponse(
      { success: false, error: error.message || 'Order submission failed' },
      { status: 422 }
    );
  }
});

export const GET = withGuestToken(async (request: NextRequest, _routeContext, guest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return createLegacyProxyResponse({ success: false, error: 'orderId is required' }, { status: 400 });
    }

    const order = restaurantRuntime.orderKitchenService.getOrder(orderId);
    if (!order) {
      return createLegacyProxyResponse({ success: false, error: 'Order not found' }, { status: 404 });
    }
    if (order.participantId !== guest.participantId || order.sessionId !== guest.diningSessionId) {
      return createLegacyProxyResponse({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const projection = restaurantRuntime.orderKitchenService.getOrderCustomerProjection(orderId);

    return createLegacyProxyResponse({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        commercialState: order.commercialState,
        fulfillmentState: order.fulfillmentState,
        kitchenState: order.kitchenState,
        totalMinor: order.totalMinor.toString(),
        projection,
        items: order.items.map(item => ({
          name: item.itemName,
          quantity: item.quantity,
          station: item.stationName,
          status: item.preparationStatus,
        })),
      },
    });
  } catch (error: any) {
    return createLegacyProxyResponse(
      { success: false, error: error.message || 'Failed to fetch order status' },
      { status: 500 }
    );
  }
});
