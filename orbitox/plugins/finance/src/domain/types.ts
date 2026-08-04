export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE' | 'VOID';

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoicePayload {
  customerName: string;
  customerEmail: string;
  items: Array<{ description: string; quantity: number; unitPrice: number }>;
  taxRate?: number;
  dueDate: string;
}

export interface FinanceFilter {
  status?: InvoiceStatus;
  search?: string;
}
