import { Injectable, NotFoundException } from '@nestjs/common';
import { Invoice } from '@orbitox/types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InvoiceService {
  private invoices = new Map<string, Invoice>();

  async createInvoice(contextId: string, subscriptionId: string, amount: number): Promise<Invoice> {
    const invoice: Invoice = {
      id: uuidv4(),
      contextId,
      subscriptionId,
      amount,
      currency: 'USD',
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.invoices.set(invoice.id, invoice);
    return invoice;
  }

  async getInvoice(invoiceId: string): Promise<Invoice> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }
    return invoice;
  }

  async markAsPaid(invoiceId: string): Promise<void> {
    const invoice = await this.getInvoice(invoiceId);
    invoice.status = 'paid';
    invoice.paidAt = new Date();
    invoice.updatedAt = new Date();
  }
}
