import {
  Order,
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus,
  CreateOrderPayload,
  OrderItem,
  OrderTimelineEvent,
} from '../../types/order.types';
import { CartEngine } from '../cart/cart.engine';
import { ProductEngine } from '../product/product.engine';
import { PaymentEngine } from '../payment/payment.engine';
import { CustomerEngine } from '../customer/customer.engine';

export class OrderEngine {
  private orders: Map<string, Order> = new Map();
  private storeOrderSequence: Map<string, number> = new Map();

  constructor(
    private readonly cartEngine: CartEngine,
    private readonly productEngine: ProductEngine,
    private readonly paymentEngine?: PaymentEngine,
    private readonly customerEngine?: CustomerEngine,
    initialOrders: Order[] = []
  ) {
    for (const order of initialOrders) {
      this.orders.set(order.id, order);
    }
  }

  createOrderFromCart(tenantId: string, storeId: string, payload: CreateOrderPayload): Order {
    const cart = this.cartEngine.getCartById(payload.cartId);
    if (!cart || cart.items.length === 0) {
      throw new Error('Order creation failed: Cart is empty or does not exist.');
    }

    const nextSeq = (this.storeOrderSequence.get(storeId) || 1000) + 1;
    this.storeOrderSequence.set(storeId, nextSeq);
    const orderNumber = `ORD-${nextSeq}`;
    const now = new Date().toISOString();

    const orderItems: OrderItem[] = cart.items.map((item) => ({
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId: item.productId,
      variantId: item.variantId,
      title: item.title,
      variantTitle: item.variantTitle,
      sku: item.sku,
      price: item.price,
      quantity: item.quantity,
      totalPrice: item.price * item.quantity,
      imageUrl: item.imageUrl,
    }));

    const initialTimeline: OrderTimelineEvent[] = [
      {
        id: `tl_${Date.now()}_1`,
        type: 'status_change',
        title: 'Order Placed',
        description: `Customer placed order #${orderNumber} via ${payload.paymentMethod.toUpperCase()}`,
        actor: payload.customerEmail,
        timestamp: now,
      },
    ];

    const isCod = payload.paymentMethod === 'cod';

    const newOrder: Order = {
      id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      storeId,
      tenantId,
      orderNumber,
      customerEmail: payload.customerEmail.trim(),
      customerPhone: payload.customerPhone || payload.shippingAddress.phone,
      status: isCod ? 'confirmed' : 'pending',
      paymentStatus: isCod ? 'pending' : 'pending',
      fulfillmentStatus: 'unfulfilled',
      currency: cart.currency,
      items: orderItems,
      subtotal: cart.totals.subtotal,
      discountAmount: cart.totals.discountAmount,
      taxAmount: cart.totals.taxAmount,
      shippingAmount: cart.totals.shippingAmount,
      grandTotal: cart.totals.grandTotal,
      couponCode: cart.appliedDiscount?.code,
      shippingAddress: payload.shippingAddress,
      billingAddress: payload.billingAddress || payload.shippingAddress,
      paymentMethod: payload.paymentMethod,
      shippingMethod: payload.shippingMethodId || 'Standard Insured Delivery',
      customerNotes: payload.customerNotes,
      timeline: initialTimeline,
      createdAt: now,
      updatedAt: now,
    };

    // Deduct stock for all items
    for (const item of orderItems) {
      this.productEngine.deductInventory(item.productId, item.quantity, item.variantId);
    }

    // Record / Update Customer in CRM
    if (this.customerEngine) {
      this.customerEngine.recordCustomerOrder(storeId, tenantId, {
        email: newOrder.customerEmail,
        phone: newOrder.customerPhone,
        firstName: payload.shippingAddress.firstName,
        lastName: payload.shippingAddress.lastName,
        address: payload.shippingAddress,
        orderTotal: newOrder.grandTotal,
      });
    }

    this.orders.set(newOrder.id, newOrder);

    // Clear the cart
    this.cartEngine.clearCart(cart.id);

    return newOrder;
  }

  getOrderById(orderId: string): Order | null {
    return this.orders.get(orderId) || null;
  }

  getOrderByNumber(storeId: string, orderNumber: string): Order | null {
    const cleanNum = orderNumber.toUpperCase().trim();
    for (const ord of this.orders.values()) {
      if (ord.storeId === storeId && ord.orderNumber === cleanNum) {
        return ord;
      }
    }
    return null;
  }

  listOrdersByStore(storeId: string, statusFilter?: OrderStatus): Order[] {
    let list = Array.from(this.orders.values()).filter((o) => o.storeId === storeId);
    if (statusFilter) {
      list = list.filter((o) => o.status === statusFilter);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  updateOrderStatus(orderId: string, newStatus: OrderStatus, actor: string = 'Store Admin', note?: string): Order {
    const order = this.orders.get(orderId);
    if (!order) throw new Error(`Order '${orderId}' not found.`);

    const oldStatus = order.status;
    order.status = newStatus;
    order.updatedAt = new Date().toISOString();

    order.timeline.push({
      id: `tl_${Date.now()}`,
      type: 'status_change',
      title: `Status Changed to ${newStatus.toUpperCase()}`,
      description: note || `Order status updated from ${oldStatus} to ${newStatus}`,
      actor,
      timestamp: order.updatedAt,
    });

    return order;
  }

  markPaymentPaid(orderId: string, transactionId: string, provider: string): Order {
    const order = this.orders.get(orderId);
    if (!order) throw new Error(`Order '${orderId}' not found.`);

    order.paymentStatus = 'paid';
    if (order.status === 'pending') {
      order.status = 'confirmed';
    }
    order.paymentTransactionId = transactionId;
    order.updatedAt = new Date().toISOString();

    order.timeline.push({
      id: `tl_${Date.now()}`,
      type: 'payment',
      title: 'Payment Successful',
      description: `Payment of $${order.grandTotal} captured via ${provider.toUpperCase()} (Ref: ${transactionId})`,
      actor: 'Payment Gateway',
      timestamp: order.updatedAt,
    });

    return order;
  }

  updateFulfillment(
    orderId: string,
    status: FulfillmentStatus,
    trackingNumber?: string,
    carrier?: string,
    actor: string = 'Warehouse'
  ): Order {
    const order = this.orders.get(orderId);
    if (!order) throw new Error(`Order '${orderId}' not found.`);

    order.fulfillmentStatus = status;
    if (status === 'fulfilled' || status === 'partially_fulfilled') {
      order.status = 'shipped';
    }
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (carrier) order.carrier = carrier;
    order.updatedAt = new Date().toISOString();

    order.timeline.push({
      id: `tl_${Date.now()}`,
      type: 'fulfillment',
      title: `Fulfillment: ${status.toUpperCase()}`,
      description: trackingNumber ? `Dispatched via ${carrier || 'Courier'}. Tracking: ${trackingNumber}` : undefined,
      actor,
      timestamp: order.updatedAt,
    });

    return order;
  }
}
