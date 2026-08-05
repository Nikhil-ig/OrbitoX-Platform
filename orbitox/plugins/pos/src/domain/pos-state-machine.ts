import { OrderStatus } from './types';

export class PosStateMachine {
  private static readonly transitions: Record<OrderStatus, OrderStatus[]> = {
    OPEN: ['PENDING_PAYMENT', 'VOIDED'],
    PENDING_PAYMENT: ['PAID', 'OPEN', 'VOIDED'],
    PAID: ['FULFILLED', 'VOIDED'],
    FULFILLED: [],
    VOIDED: []
  };

  static validateTransition(currentStatus: OrderStatus, nextStatus: OrderStatus): void {
    const allowed = this.transitions[currentStatus];
    if (!allowed || !allowed.includes(nextStatus)) {
      throw new Error(`Invalid POS Order transition: Cannot move from ${currentStatus} to ${nextStatus}`);
    }
  }
}
