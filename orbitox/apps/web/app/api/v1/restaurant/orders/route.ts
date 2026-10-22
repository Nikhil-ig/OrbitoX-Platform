import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../../_lib/api-guard';

let restaurantOrders = [
  { id: 'TKT-101', table: 'Table 4', items: ['Wood-Fired Truffle Margherita', 'Barolo DOCG 2018 Glass'], total: 50, status: 'cooking', elapsedMin: 8 },
  { id: 'TKT-102', table: 'Table 12', items: ['Wagyu Ribeye Steak (A5 8oz)', 'Wild Mushroom Risotto'], total: 129, status: 'ready', elapsedMin: 18 },
  { id: 'TKT-103', table: 'Bar 2', items: ['Classic Tiramisu al Mascarpone'], total: 16, status: 'served', elapsedMin: 2 },
];

export const GET = withApiGuard(
  {
    serviceId: 'restaurant',
    serviceName: 'Restaurant & Kitchen OS',
  },
  async () => {
    return NextResponse.json({
      success: true,
      data: restaurantOrders,
      meta: { total: restaurantOrders.length },
    });
  }
);

export const POST = withApiGuard(
  {
    serviceId: 'restaurant',
    serviceName: 'Restaurant & Kitchen OS',
  },
  async (req: NextRequest, ctx) => {
    try {
      const body = await req.json();
      const newOrder = {
        id: `TKT-${Math.floor(100 + Math.random() * 900)}`,
        table: body.table || 'Takeout',
        items: body.items || ['Chef Special'],
        total: Number(body.total) || 45,
        status: 'received',
        elapsedMin: 0,
      };

      restaurantOrders = [newOrder, ...restaurantOrders];

      PlatformApiState.recordTelemetry({
        tenantId: ctx.tenantId,
        facade: 'EventsFacade',
        level: 'INFO',
        message: `Kitchen order dispatched: [${newOrder.id}] for [${newOrder.table}] ($${newOrder.total}).`,
      });

      return NextResponse.json({
        success: true,
        data: newOrder,
        message: `Kitchen ticket ${newOrder.id} dispatched to display.`,
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: err.message } },
        { status: 400 }
      );
    }
  }
);
