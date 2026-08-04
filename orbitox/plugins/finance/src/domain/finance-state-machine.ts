import { InvoiceStatus } from './types';

const ALLOWED_INVOICE_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ['ISSUED', 'VOID'],
  ISSUED: ['PAID', 'OVERDUE', 'VOID'],
  OVERDUE: ['PAID', 'VOID'],
  PAID: [],
  VOID: []
};

export class FinanceStateMachine {
  static canTransition(current: InvoiceStatus, next: InvoiceStatus): boolean {
    return ALLOWED_INVOICE_TRANSITIONS[current]?.includes(next) ?? false;
  }

  static validateTransition(current: InvoiceStatus, next: InvoiceStatus): void {
    if (!this.canTransition(current, next)) {
      throw new Error(`Invalid Finance Invoice State Transition: Cannot move invoice from ${current} to ${next}`);
    }
  }

  static calculateInvoiceTotals(items: Array<{ quantity: number; unitPrice: number }>, taxRate: number = 0.18) {
    const subtotal = items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
    const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;
    return { subtotal, taxAmount, totalAmount };
  }
}
