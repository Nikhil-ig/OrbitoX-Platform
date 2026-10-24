import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { withApiGuard, PlatformApiState } from '../../../_lib/api-guard';

export const POST = withApiGuard(
  {
    serviceId: 'commerce',
    serviceName: 'Commerce & Store Engine',
  },
  async (req: NextRequest, ctx) => {
    try {
      const body = await req.json();
      const { items = [], customerEmail, customerName, total } = body;

      if (!items.length) {
        return NextResponse.json(
          { success: false, error: { code: 'EMPTY_CART', message: 'Cart must contain at least one item.' } },
          { status: 400 }
        );
      }

      const orderId = `ord-${crypto.randomUUID()}`;
      const sessionToken = `tok_chk_${crypto.randomBytes(16).toString('hex')}`;

      PlatformApiState.recordTelemetry({
        tenantId: ctx.tenantId,
        facade: 'BillingFacade',
        level: 'INFO',
        message: `Initiated checkout session [${orderId}] for $${total || 0} (${items.length} items).`,
      });

      return NextResponse.json({
        success: true,
        data: {
          orderId,
          sessionToken,
          status: 'pending_payment',
          totalAmount: total || 1250,
          currency: 'USD',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          checkoutUrl: `/store/${ctx.tenantId || 'aura-luxury'}/checkout?session=${sessionToken}`,
        },
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: err.message } },
        { status: 400 }
      );
    }
  }
);
