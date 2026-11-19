/**
 * 🔄 OrbitoX RestaurantOS - 4-Dimension Order State Machines & Customer Projection
 * ─────────────────────────────────────────────────────────────
 * INVARIANT: Never compress order lifecycle into one giant mutable status.
 * Order lifecycle is composed of 4 orthogonal authoritative dimensions:
 * 1. CommercialState (Contractual & liability status)
 * 2. FulfillmentState (Physical dish handover status)
 * 3. OrderPaymentState (Settlement & monetary status)
 * 4. KitchenState (Culinary station execution status)
 *
 * Customer-facing status is a DERIVED PROJECTION, never a raw database column.
 * All mutations enforce Optimistic Concurrency Control via integer aggregate versioning.
 */

export type CommercialState = 'DRAFT' | 'SUBMITTED' | 'CONFIRMED' | 'REJECTED' | 'VOIDED';
export type FulfillmentState = 'UNFULFILLED' | 'PREPARING' | 'READY_TO_SERVE' | 'SERVED' | 'CANCELLED';
export type OrderPaymentState = 'UNPAID' | 'AUTHORIZED' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED';
export type KitchenState = 'NOT_SENT' | 'QUEUED' | 'IN_PROGRESS' | 'EXPEDITED' | 'COMPLETED';

export type CustomerVisibilityStage =
  | 'DRAFT'
  | 'RECEIVED'
  | 'CONFIRMED'
  | 'COOKING'
  | 'EXPEDITING'
  | 'READY'
  | 'SERVED'
  | 'CANCELLED';

export interface CustomerVisibilityProjection {
  readonly stage: CustomerVisibilityStage;
  readonly friendlyTitle: string;
  readonly friendlyMessage: string;
  readonly progressPercent: number;
  readonly estimatedReadyAt?: string;
  readonly canCancel: boolean;
  readonly canModify: boolean;
}

export class ConcurrencyConflictError extends Error {
  constructor(
    public readonly aggregateId: string,
    public readonly currentVersion: number,
    public readonly expectedVersion: number
  ) {
    super(
      `Concurrency Conflict on aggregate [${aggregateId}]: expected version ${expectedVersion}, but current database version is ${currentVersion}. Refresh and retry.`
    );
    this.name = 'ConcurrencyConflictError';
  }
}

export class OrderStateMachine {
  // 1. Commercial State Transitions
  private static readonly commercialTransitions: Record<CommercialState, CommercialState[]> = {
    DRAFT: ['SUBMITTED', 'VOIDED'],
    SUBMITTED: ['CONFIRMED', 'REJECTED', 'VOIDED'],
    CONFIRMED: ['VOIDED'],
    REJECTED: [],
    VOIDED: [],
  };

  // 2. Fulfillment State Transitions
  private static readonly fulfillmentTransitions: Record<FulfillmentState, FulfillmentState[]> = {
    UNFULFILLED: ['PREPARING', 'CANCELLED'],
    PREPARING: ['READY_TO_SERVE', 'CANCELLED'],
    READY_TO_SERVE: ['SERVED', 'CANCELLED'],
    SERVED: [],
    CANCELLED: [],
  };

  // 3. Payment State Transitions
  private static readonly paymentTransitions: Record<OrderPaymentState, OrderPaymentState[]> = {
    UNPAID: ['AUTHORIZED', 'PARTIALLY_PAID', 'PAID'],
    AUTHORIZED: ['PAID', 'UNPAID'],
    PARTIALLY_PAID: ['PAID'],
    PAID: ['REFUNDED'],
    REFUNDED: [],
  };

  // 4. Kitchen State Transitions
  private static readonly kitchenTransitions: Record<KitchenState, KitchenState[]> = {
    NOT_SENT: ['QUEUED'],
    QUEUED: ['IN_PROGRESS'],
    IN_PROGRESS: ['EXPEDITED', 'COMPLETED'],
    EXPEDITED: ['COMPLETED'],
    COMPLETED: [],
  };

  /**
   * Validate transition for Commercial State.
   */
  static validateCommercialTransition(current: CommercialState, next: CommercialState): void {
    const allowed = this.commercialTransitions[current];
    if (!allowed || !allowed.includes(next)) {
      throw new Error(`Invalid CommercialState transition: Cannot transition from ${current} to ${next}`);
    }
  }

  /**
   * Validate transition for Fulfillment State.
   */
  static validateFulfillmentTransition(current: FulfillmentState, next: FulfillmentState): void {
    const allowed = this.fulfillmentTransitions[current];
    if (!allowed || !allowed.includes(next)) {
      throw new Error(`Invalid FulfillmentState transition: Cannot transition from ${current} to ${next}`);
    }
  }

  /**
   * Validate transition for Payment State.
   */
  static validatePaymentTransition(current: OrderPaymentState, next: OrderPaymentState): void {
    const allowed = this.paymentTransitions[current];
    if (!allowed || !allowed.includes(next)) {
      throw new Error(`Invalid PaymentState transition: Cannot transition from ${current} to ${next}`);
    }
  }

  /**
   * Validate transition for Kitchen State.
   */
  static validateKitchenTransition(current: KitchenState, next: KitchenState): void {
    const allowed = this.kitchenTransitions[current];
    if (!allowed || !allowed.includes(next)) {
      throw new Error(`Invalid KitchenState transition: Cannot transition from ${current} to ${next}`);
    }
  }

  /**
   * Enforces Optimistic Concurrency Control (OCC).
   * Verifies that the aggregate's version matches expected caller version before mutation.
   */
  static assertVersionMatch(aggregateId: string, currentVersion: number, expectedVersion: number): void {
    if (currentVersion !== expectedVersion) {
      throw new ConcurrencyConflictError(aggregateId, currentVersion, expectedVersion);
    }
  }

  /**
   * Derives the customer-facing visibility projection from authoritative internal states.
   * INVARIANT: Never exposes raw internal errors, station kitchen queues, or staff voids directly to diners.
   */
  static deriveCustomerProjection(states: {
    commercial: CommercialState;
    fulfillment: FulfillmentState;
    payment: OrderPaymentState;
    kitchen: KitchenState;
    estimatedReadyAt?: string;
  }): CustomerVisibilityProjection {
    const { commercial, fulfillment, kitchen, estimatedReadyAt } = states;

    // Terminal Cancellation
    if (commercial === 'REJECTED' || commercial === 'VOIDED' || fulfillment === 'CANCELLED') {
      return {
        stage: 'CANCELLED',
        friendlyTitle: 'Order Cancelled',
        friendlyMessage: 'This order was cancelled. If you have questions, please request assistance from staff.',
        progressPercent: 0,
        estimatedReadyAt,
        canCancel: false,
        canModify: false,
      };
    }

    // Terminal Served
    if (fulfillment === 'SERVED') {
      return {
        stage: 'SERVED',
        friendlyTitle: 'Order Served',
        friendlyMessage: 'Delivered to your table. Enjoy your meal!',
        progressPercent: 100,
        estimatedReadyAt,
        canCancel: false,
        canModify: false,
      };
    }

    // Ready at Expo
    if (fulfillment === 'READY_TO_SERVE') {
      return {
        stage: 'READY',
        friendlyTitle: 'Order Ready',
        friendlyMessage: 'Your dishes are freshly prepared! A server is bringing them to your table.',
        progressPercent: 95,
        estimatedReadyAt,
        canCancel: false,
        canModify: false,
      };
    }

    // Expediting / Plating
    if (kitchen === 'EXPEDITED') {
      return {
        stage: 'EXPEDITING',
        friendlyTitle: 'Finishing Touches',
        friendlyMessage: 'Chefs are plating and garnishing your order at the pass.',
        progressPercent: 85,
        estimatedReadyAt,
        canCancel: false,
        canModify: false,
      };
    }

    // Cooking
    if (kitchen === 'IN_PROGRESS' || fulfillment === 'PREPARING') {
      return {
        stage: 'COOKING',
        friendlyTitle: 'Preparing Your Food',
        friendlyMessage: 'Your dishes are actively being prepared by our kitchen stations.',
        progressPercent: 65,
        estimatedReadyAt,
        canCancel: false,
        canModify: false,
      };
    }

    // Submitted / Received (Pending restaurant review)
    if (commercial === 'SUBMITTED') {
      return {
        stage: 'RECEIVED',
        friendlyTitle: 'Order Received',
        friendlyMessage: "We've received your order and the restaurant is reviewing it.",
        progressPercent: 20,
        estimatedReadyAt,
        canCancel: true,
        canModify: true,
      };
    }

    // Confirmed in Kitchen Queue
    if (commercial === 'CONFIRMED' || kitchen === 'QUEUED') {
      return {
        stage: 'CONFIRMED',
        friendlyTitle: 'Order Confirmed',
        friendlyMessage: 'Order confirmed! Kitchen ticket scheduled for preparation.',
        progressPercent: 40,
        estimatedReadyAt,
        canCancel: true, // Can cancel before prep begins
        canModify: false,
      };
    }

    // Draft
    return {
      stage: 'DRAFT',
      friendlyTitle: 'Cart In Progress',
      friendlyMessage: 'Review your items and tap Submit Order to send to the kitchen.',
      progressPercent: 5,
      canCancel: true,
      canModify: true,
    };
  }
}
