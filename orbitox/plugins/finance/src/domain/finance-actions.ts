import * as crypto from 'crypto';
import { Invoice, InvoiceStatus, CreateInvoicePayload, FinanceFilter } from './types';
import { FinanceStateMachine } from './finance-state-machine';

export class HeadlessFinanceService {
  private invoices: Invoice[] = [];

  constructor(initialInvoices: Invoice[] = []) {
    this.invoices = [...initialInvoices];
  }

  createInvoice(payload: CreateInvoicePayload): Invoice {
    if (!payload.customerName || payload.customerName.trim() === '') {
      throw new Error('Finance Invoice Creation Failed: Customer name is required.');
    }
    if (!payload.items || payload.items.length === 0) {
      throw new Error('Finance Invoice Creation Failed: At least one line item is required.');
    }

    const taxRate = payload.taxRate ?? 0.18;
    const { subtotal, taxAmount, totalAmount } = FinanceStateMachine.calculateInvoiceTotals(payload.items, taxRate);

    const formattedItems = payload.items.map((i) => ({
      description: i.description.trim(),
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      total: i.quantity * i.unitPrice
    }));

    const newInvoice: Invoice = {
      id: `inv_${crypto.randomUUID()}`,
      invoiceNumber: `INV-${crypto.randomInt(10000, 100000)}`,
      customerName: payload.customerName.trim(),
      customerEmail: payload.customerEmail.trim(),
      items: formattedItems,
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      status: 'DRAFT',
      dueDate: payload.dueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.invoices.unshift(newInvoice);
    return newInvoice;
  }

  updateInvoiceStatus(invoiceId: string, nextStatus: InvoiceStatus): Invoice {
    const inv = this.invoices.find((i) => i.id === invoiceId);
    if (!inv) {
      throw new Error(`Invoice Not Found: ${invoiceId}`);
    }

    FinanceStateMachine.validateTransition(inv.status, nextStatus);

    const updatedInv: Invoice = {
      ...inv,
      status: nextStatus,
      updatedAt: new Date().toISOString()
    };

    const index = this.invoices.findIndex((i) => i.id === invoiceId);
    if (index !== -1) {
      this.invoices[index] = updatedInv;
    }

    return updatedInv;
  }

  filterInvoices(filter: FinanceFilter = {}): Invoice[] {
    return this.invoices.filter((inv) => {
      if (filter.status && inv.status !== filter.status) return false;
      if (filter.search) {
        const query = filter.search.toLowerCase();
        const matchesCustomer = inv.customerName.toLowerCase().includes(query);
        const matchesNumber = inv.invoiceNumber.toLowerCase().includes(query);
        if (!matchesCustomer && !matchesNumber) return false;
      }
      return true;
    });
  }

  inspectInvoiceRisk(invoiceId: string): { riskScore: number; reason: string; collectionProbability: number } {
    const inv = this.invoices.find((i) => i.id === invoiceId);
    if (!inv) {
      throw new Error(`Invoice Not Found: ${invoiceId}`);
    }

    let riskScore = 10;
    let collectionProbability = 99;
    let reason = 'Low risk, healthy invoice status';

    if (inv.status === 'OVERDUE') {
      const today = new Date();
      const dueDate = new Date(inv.dueDate);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));
      
      if (daysOverdue > 60) {
        riskScore = 90;
        collectionProbability = 10;
        reason = `Severely overdue by ${daysOverdue} days. High default risk.`;
      } else {
        riskScore = 50;
        collectionProbability = 60;
        reason = `Overdue by ${daysOverdue} days. Action required.`;
      }
    } else if (inv.status === 'ISSUED' && inv.totalAmount > 50000) {
      riskScore = 30;
      collectionProbability = 85;
      reason = 'High-value invoice, monitor closely for payment timeline.';
    }

    return {
      riskScore,
      reason,
      collectionProbability
    };
  }
}
