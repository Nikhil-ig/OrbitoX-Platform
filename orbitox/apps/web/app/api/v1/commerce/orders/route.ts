import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { withApiGuard, PlatformApiState } from '../../_lib/api-guard';

let orders = [
  {
    id: 'ORD-9821',
    customer: 'Isabella Rossellini',
    email: 'isabella@rossellini.it',
    total: 2140,
    status: 'paid',
    itemsCount: 2,
    createdAt: 'Today, 14:20',
  },
  {
    id: 'ORD-9820',
    customer: 'Julian Sterling',
    email: 'j.sterling@mayfair.co.uk',
    total: 890,
    status: 'processing',
    itemsCount: 1,
    createdAt: 'Today, 12:15',
  },
  {
    id: 'ORD-9819',
    customer: 'Chloe Zhao',
    email: 'chloe.zhao@cinematic.org',
    total: 3400,
    status: 'shipped',
    itemsCount: 1,
    createdAt: 'Yesterday',
  },
];

export const GET = withApiGuard(
  {
    serviceId: 'commerce',
    serviceName: 'Commerce & Store Engine',
  },
  async () => {
    return NextResponse.json({
      success: true,
      data: orders,
      meta: { total: orders.length },
    });
  }
);

export const POST = withApiGuard(
  {
    serviceId: 'commerce',
    serviceName: 'Commerce & Store Engine',
  },
  async (req: NextRequest, ctx) => {
    try {
      const body = await req.json();
      const newOrder = {
        id: `ORD-${crypto.randomInt(1000, 10000)}`,
        customer: body.customer || 'Guest Customer',
        email: body.email || 'customer@example.com',
        total: Number(body.total) || 120,
        status: body.status || 'paid',
        itemsCount: body.itemsCount || 1,
        createdAt: 'Just now',
      };

      orders = [newOrder, ...orders];

      PlatformApiState.recordTelemetry({
        tenantId: ctx.tenantId,
        facade: 'BillingFacade',
        level: 'INFO',
        message: `Order completed [${newOrder.id}] ($${newOrder.total}) for customer [${newOrder.customer}].`,
      });

      return NextResponse.json({
        success: true,
        data: newOrder,
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: err.message } },
        { status: 400 }
      );
    }
  }
);
