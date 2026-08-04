import { useState, useCallback } from 'react';
import { Invoice, InvoiceStatus, CreateInvoicePayload, FinanceFilter } from '../domain/types';
import { HeadlessFinanceService } from '../domain/finance-actions';

const defaultFinanceService = new HeadlessFinanceService([
  {
    id: 'inv-1',
    invoiceNumber: 'INV-90210',
    customerName: 'Stark Industries',
    customerEmail: 'billing@stark.com',
    items: [
      { description: 'Enterprise Platform OS License', quantity: 1, unitPrice: 15000, total: 15000 },
      { description: 'Dedicated SLA Support (1 yr)', quantity: 1, unitPrice: 5000, total: 5000 }
    ],
    subtotal: 20000,
    taxRate: 0.18,
    taxAmount: 3600,
    totalAmount: 23600,
    status: 'ISSUED',
    dueDate: '2026-09-01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]);

export function useInvoices(filter: FinanceFilter = {}) {
  const [service] = useState(() => defaultFinanceService);
  const [invoices, setInvoices] = useState<Invoice[]>(() => service.filterInvoices(filter));

  const refreshInvoices = useCallback(() => {
    setInvoices(service.filterInvoices(filter));
  }, [service, filter]);

  return {
    invoices,
    refreshInvoices
  };
}

export function useFinanceActions() {
  const [service] = useState(() => defaultFinanceService);

  const createInvoice = useCallback((payload: CreateInvoicePayload): Invoice => {
    return service.createInvoice(payload);
  }, [service]);

  const updateInvoiceStatus = useCallback((invoiceId: string, nextStatus: InvoiceStatus): Invoice => {
    return service.updateInvoiceStatus(invoiceId, nextStatus);
  }, [service]);

  return {
    createInvoice,
    updateInvoiceStatus
  };
}
