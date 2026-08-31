import { Cart } from '../../types/cart.types';
import { Address, Order } from '../../types/order.types';
import { PaymentProviderType, PaymentOrderResponse } from '../../types/payment.types';
import { CartEngine } from '../cart/cart.engine';
import { OrderEngine } from '../order/order.engine';
import { PaymentEngine } from '../payment/payment.engine';
import { ShippingEngine } from '../shipping/shipping.engine';

export interface CheckoutSession {
  cart: Cart;
  shippingAddress?: Address;
  billingAddress?: Address;
  shippingMethodId?: string;
  paymentMethod: PaymentProviderType;
  customerEmail?: string;
  customerPhone?: string;
  customerNotes?: string;
}

export class CheckoutEngine {
  constructor(
    private readonly cartEngine: CartEngine,
    private readonly orderEngine: OrderEngine,
    private readonly paymentEngine: PaymentEngine,
    private readonly shippingEngine: ShippingEngine
  ) {}

  async processCheckout(
    tenantId: string,
    storeId: string,
    session: CheckoutSession
  ): Promise<{ order: Order; paymentOrder?: PaymentOrderResponse }> {
    if (!session.customerEmail) {
      throw new Error('Checkout failed: Email address is required.');
    }
    if (!session.shippingAddress) {
      throw new Error('Checkout failed: Shipping address is required.');
    }

    // 1. Create the Order in Pending state
    const order = this.orderEngine.createOrderFromCart(tenantId, storeId, {
      cartId: session.cart.id,
      customerEmail: session.customerEmail,
      customerPhone: session.customerPhone,
      shippingAddress: session.shippingAddress,
      billingAddress: session.billingAddress,
      paymentMethod: session.paymentMethod,
      shippingMethodId: session.shippingMethodId,
      customerNotes: session.customerNotes,
    });

    // 2. If non-COD, generate payment order with chosen gateway
    let paymentOrder: PaymentOrderResponse | undefined;

    if (session.paymentMethod !== 'cod') {
      paymentOrder = await this.paymentEngine.createPaymentOrder(storeId, session.paymentMethod, {
        orderId: order.id,
        amount: order.grandTotal,
        currency: order.currency,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        receiptNumber: order.orderNumber,
        metadata: { storeId, tenantId },
      });
    }

    return { order, paymentOrder };
  }
}
