import { EventBusService } from '@orbitox/core';
import { PosOrder, AddToCartPayload, OrderStatus, PaymentMethod } from './types';
import { PosStateMachine } from './pos-state-machine';

export class HeadlessPosService {
  private readonly TAX_RATE = 0.08; // 8%

  constructor(
    private readonly eventBus: EventBusService,
    // Database injected via constructor in real apps
    private readonly mockDb: Map<string, PosOrder> = new Map()
  ) {}

  async createOrder(tableNumber?: string, contextId: string = 'system'): Promise<PosOrder> {
    const order: PosOrder = {
      id: `order_${Date.now()}`,
      orderNumber: `ORD-${Math.floor(Math.random() * 10000)}`,
      tableNumber,
      status: 'OPEN',
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.mockDb.set(order.id, order);

    await this.eventBus.emit('pos.order.created', { orderId: order.id }, contextId, 'PosService');
    return order;
  }

  async addItem(orderId: string, payload: AddToCartPayload, contextId: string): Promise<PosOrder> {
    const order = this.mockDb.get(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);
    if (order.status !== 'OPEN') throw new Error(`Cannot add items to order in ${order.status} state`);

    const subtotal = payload.quantity * payload.unitPrice;
    
    order.items.push({
      id: `item_${Date.now()}`,
      ...payload,
      subtotal
    });

    this.recalculateTotals(order);
    this.mockDb.set(order.id, order);

    await this.eventBus.emit('pos.order.item_added', { orderId: order.id, productId: payload.productId }, contextId, 'PosService');
    return order;
  }

  async processPayment(orderId: string, method: PaymentMethod, contextId: string): Promise<PosOrder> {
    const order = this.mockDb.get(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);

    PosStateMachine.validateTransition(order.status, 'PAID');
    
    order.paymentMethod = method;
    order.status = 'PAID';
    order.updatedAt = new Date().toISOString();
    this.mockDb.set(order.id, order);

    await this.eventBus.emit('pos.payment.processed', { orderId: order.id, method }, contextId, 'PosService');
    return order;
  }

  private recalculateTotals(order: PosOrder): void {
    order.subtotal = order.items.reduce((sum, item) => sum + item.subtotal, 0);
    order.tax = order.subtotal * this.TAX_RATE;
    order.total = order.subtotal + order.tax;
    order.updatedAt = new Date().toISOString();
  }

  async getOrder(orderId: string): Promise<PosOrder | undefined> {
    return this.mockDb.get(orderId);
  }
}
