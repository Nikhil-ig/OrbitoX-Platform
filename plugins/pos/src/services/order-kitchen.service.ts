/**
 * 🍽️ OrbitoX RestaurantOS - Order Orchestrator & Kitchen KDS Service
 * ─────────────────────────────────────────────────────────────
 * Implements:
 * - 4-Dimension Order State Transitions (Commercial, Fulfillment, Payment, Kitchen)
 * - Deterministic Customer Visibility Projection derivation
 * - Synchronized Kitchen Preparation DAG task scheduling
 * - Station-level KDS task bumping & expo consolidation
 * - Optimistic Concurrency Control (OCC) version enforcement
 * - Durable Idempotency request deduplication
 */

import * as crypto from 'crypto';
import {
  OrderStateMachine,
  CommercialState,
  FulfillmentState,
  OrderPaymentState,
  KitchenState,
  CustomerVisibilityProjection,
  ConcurrencyConflictError,
} from '../domain/order-state-machines';
import {
  KitchenDagScheduler,
  KitchenPreparationTask,
  PreparationTaskStatus,
  OrderDishInput,
} from '../domain/kitchen-dag';
import { PricingQuote, CartItemInput } from '../domain/pricing-quote';
import { IdempotencyEngine, PlatformIdempotencyRecord } from '../domain/idempotency-outbox';
import { RestaurantCatalogItem } from '../domain/catalog';

export interface OrderItemRecord {
  readonly orderItemId: string;
  readonly itemId: string;
  readonly itemName: string;
  readonly quantity: number;
  readonly unitPriceMinor: bigint;
  readonly totalMinor: bigint;
  readonly selectedModifiers: string[];
  readonly preparationStatus: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';
  readonly stationId: string;
  readonly stationName: string;
  readonly estimatedDurationMinutes: number;
}

export interface RestaurantOrderRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly companyId: string;
  readonly locationId: string;
  readonly sessionId: string;
  readonly participantId: string;
  readonly orderNumber: string;
  readonly commercialState: CommercialState;
  readonly fulfillmentState: FulfillmentState;
  readonly paymentState: OrderPaymentState;
  readonly kitchenState: KitchenState;
  readonly quoteId: string;
  readonly idempotencyKey?: string;
  readonly totalMinor: bigint;
  readonly currency: string;
  readonly specialInstructions?: string;
  readonly items: OrderItemRecord[];
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SubmitOrderParams {
  readonly tenantId: string;
  readonly companyId: string;
  readonly locationId: string;
  readonly sessionId: string;
  readonly participantId: string;
  readonly quote: PricingQuote;
  readonly cartItems: CartItemInput[];
  readonly catalogItems: Map<string, RestaurantCatalogItem>;
  readonly idempotencyKey?: string;
  readonly specialInstructions?: string;
}

export class OrderKitchenService {
  private readonly orders = new Map<string, RestaurantOrderRecord>(); // orderId -> Order
  private readonly tasks = new Map<string, KitchenPreparationTask>(); // taskId -> Task
  private readonly idempotencyStore = new Map<string, PlatformIdempotencyRecord>(); // key -> Record
  private orderSequence = 1000;

  /**
   * Submits a guest order backed by a validated PricingQuote and Idempotency key.
   */
  submitOrder(params: SubmitOrderParams): RestaurantOrderRecord {
    // 1. Idempotency Check
    if (params.idempotencyKey) {
      const existingIdemp = this.idempotencyStore.get(params.idempotencyKey);
      const evalResult = IdempotencyEngine.evaluate(existingIdemp, {
        quoteId: params.quote.quoteId,
        cartItems: params.cartItems,
      });

      if (evalResult.status === 'CACHED_HIT') {
        const cachedOrder = this.orders.get(evalResult.responseBody.orderId);
        if (cachedOrder) return cachedOrder;
      } else if (evalResult.status === 'CONFLICT_PAYLOAD_MISMATCH') {
        throw new Error(evalResult.error);
      }
    }

    // 2. Prepare order line items
    const lineItems: OrderItemRecord[] = [];
    const dishesForDag: OrderDishInput[] = [];

    for (const itemInput of params.cartItems) {
      const catalogItem = params.catalogItems.get(itemInput.itemId);
      if (!catalogItem) throw new Error(`Catalog item ${itemInput.itemId} not found`);

      const orderItemId = `oi_${crypto.randomUUID()}`;
      const unitPriceMinor = catalogItem.basePriceMinor; // Base price
      const totalMinor = unitPriceMinor * BigInt(itemInput.quantity);

      lineItems.push({
        orderItemId,
        itemId: catalogItem.id,
        itemName: catalogItem.name,
        quantity: itemInput.quantity,
        unitPriceMinor,
        totalMinor,
        selectedModifiers: itemInput.selectedModifierIds,
        preparationStatus: 'PENDING',
        stationId: `st_${catalogItem.stationRouting.toLowerCase()}`,
        stationName: catalogItem.stationRouting,
        estimatedDurationMinutes: catalogItem.preparationDurationMinutes,
      });

      dishesForDag.push({
        orderItemId,
        itemName: catalogItem.name,
        quantity: itemInput.quantity,
        stationId: `st_${catalogItem.stationRouting.toLowerCase()}`,
        stationName: catalogItem.stationRouting,
        estimatedDurationMinutes: catalogItem.preparationDurationMinutes,
        selectedModifiers: itemInput.selectedModifierIds,
      });
    }

    const orderId = `ord_${crypto.randomUUID()}`;
    const orderNumber = `ORD-${++this.orderSequence}`;
    const now = new Date().toISOString();

    const order: RestaurantOrderRecord = {
      id: orderId,
      tenantId: params.tenantId,
      companyId: params.companyId,
      locationId: params.locationId,
      sessionId: params.sessionId,
      participantId: params.participantId,
      orderNumber,
      commercialState: 'SUBMITTED',
      fulfillmentState: 'UNFULFILLED',
      paymentState: 'UNPAID',
      kitchenState: 'QUEUED',
      quoteId: params.quote.quoteId,
      idempotencyKey: params.idempotencyKey,
      totalMinor: params.quote.totalMinor,
      currency: params.quote.currency,
      specialInstructions: params.specialInstructions,
      items: lineItems,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    this.orders.set(orderId, order);

    // 3. Save Idempotency Record
    if (params.idempotencyKey) {
      const idempRecord = IdempotencyEngine.createRecord({
        tenantId: params.tenantId,
        key: params.idempotencyKey,
        scope: 'POST /api/v1/orders',
        payload: { quoteId: params.quote.quoteId, cartItems: params.cartItems },
        responseStatus: 201,
        responseBody: { orderId: order.id, orderNumber: order.orderNumber },
      });
      this.idempotencyStore.set(params.idempotencyKey, idempRecord);
    }

    return order;
  }

  /**
   * Restaurant staff accepts the order and schedules kitchen DAG tasks.
   */
  acceptAndScheduleOrder(params: {
    orderId: string;
    expectedVersion: number;
    confirmedAt?: Date;
  }): { order: RestaurantOrderRecord; tasks: KitchenPreparationTask[] } {
    const order = this.orders.get(params.orderId);
    if (!order) throw new Error('Order not found');

    // Optimistic Concurrency Control (OCC)
    OrderStateMachine.assertVersionMatch(order.id, order.version, params.expectedVersion);

    // Validate state transition
    OrderStateMachine.validateCommercialTransition(order.commercialState, 'CONFIRMED');

    // Schedule Kitchen DAG tasks with synchronized fire times
    const dishesForDag: OrderDishInput[] = order.items.map(item => ({
      orderItemId: item.orderItemId,
      itemName: item.itemName,
      quantity: item.quantity,
      stationId: item.stationId,
      stationName: item.stationName,
      estimatedDurationMinutes: item.estimatedDurationMinutes,
      selectedModifiers: item.selectedModifiers,
    }));

    const scheduledTasks = KitchenDagScheduler.scheduleOrder({
      tenantId: order.tenantId,
      companyId: order.companyId,
      locationId: order.locationId,
      orderId: order.id,
      dishes: dishesForDag,
      orderConfirmedAt: params.confirmedAt ?? new Date(),
    });

    for (const task of scheduledTasks) {
      this.tasks.set(task.id, task);
    }

    const updatedOrder: RestaurantOrderRecord = {
      ...order,
      commercialState: 'CONFIRMED',
      kitchenState: 'QUEUED',
      version: order.version + 1,
      updatedAt: new Date().toISOString(),
    };

    this.orders.set(order.id, updatedOrder);
    return { order: updatedOrder, tasks: scheduledTasks };
  }

  /**
   * Station chef starts or bumps preparation of a task.
   */
  updateTaskStatus(params: {
    taskId: string;
    newStatus: PreparationTaskStatus;
    bumpedBy?: string;
  }): KitchenPreparationTask {
    const task = this.tasks.get(params.taskId);
    if (!task) throw new Error('Kitchen task not found');

    const updatedTask: KitchenPreparationTask = {
      ...task,
      status: params.newStatus,
      bumpedBy: params.bumpedBy ?? task.bumpedBy,
      startedAt: params.newStatus === 'IN_PROGRESS' ? new Date().toISOString() : task.startedAt,
      completedAt: params.newStatus === 'READY' || params.newStatus === 'BUMPED' ? new Date().toISOString() : task.completedAt,
      version: task.version + 1,
    };

    this.tasks.set(task.id, updatedTask);

    // Update parent order kitchenState
    const order = this.orders.get(task.orderId);
    if (order) {
      const orderTasks = Array.from(this.tasks.values()).filter(t => t.orderId === order.id);
      const allReady = orderTasks.every(t => t.status === 'READY' || t.status === 'BUMPED');
      const anyInProgress = orderTasks.some(t => t.status === 'IN_PROGRESS');

      let newKitchenState = order.kitchenState;
      let newFulfillment = order.fulfillmentState;

      if (allReady) {
        newKitchenState = 'COMPLETED';
        newFulfillment = 'READY_TO_SERVE';
      } else if (anyInProgress) {
        newKitchenState = 'IN_PROGRESS';
        newFulfillment = 'PREPARING';
      }

      if (newKitchenState !== order.kitchenState || newFulfillment !== order.fulfillmentState) {
        this.orders.set(order.id, {
          ...order,
          kitchenState: newKitchenState,
          fulfillmentState: newFulfillment,
          version: order.version + 1,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return updatedTask;
  }

  /**
   * Retrieves KDS queue for a specific kitchen station.
   */
  getStationQueue(stationId: string): KitchenPreparationTask[] {
    const stationTasks = Array.from(this.tasks.values()).filter(t => t.stationId === stationId);
    return KitchenDagScheduler.sortKdsQueue(stationTasks);
  }

  /**
   * Retrieves human-friendly customer visibility projection.
   */
  getOrderCustomerProjection(orderId: string): CustomerVisibilityProjection {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');

    return OrderStateMachine.deriveCustomerProjection({
      commercial: order.commercialState,
      fulfillment: order.fulfillmentState,
      payment: order.paymentState,
      kitchen: order.kitchenState,
    });
  }

  /**
   * Retrieves an order by ID.
   */
  getOrder(orderId: string): RestaurantOrderRecord | undefined {
    return this.orders.get(orderId);
  }
}
