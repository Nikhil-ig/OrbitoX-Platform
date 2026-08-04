'use client';

import React from 'react';
import PlatformLayout from '../../(platform)/layout';
import { DynamicTable, ColumnDef, Card, Badge, Button } from '@orbitox/ui';

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  status: string;
  dueDate: string;
}

const columns: ColumnDef<InvoiceRow>[] = [
  { key: 'invoiceNumber', header: 'Invoice #' },
  { key: 'customerName', header: 'Customer Name' },
  { key: 'customerEmail', header: 'Email' },
  { key: 'subtotal', header: 'Subtotal' },
  { key: 'taxAmount', header: 'Tax (18%)' },
  { key: 'totalAmount', header: 'Total Amount' },
  {
    key: 'status',
    header: 'Status',
    render: (item: InvoiceRow) => {
      const variant = item.status === 'PAID' ? 'success' : item.status === 'ISSUED' ? 'info' : item.status === 'OVERDUE' ? 'danger' : 'warning';
      return <Badge variant={variant as any}>{item.status}</Badge>;
    },
  },
  { key: 'dueDate', header: 'Due Date' },
];

const mockInvoices: InvoiceRow[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-90210',
    customerName: 'Stark Industries',
    customerEmail: 'billing@stark.com',
    subtotal: '$20,000.00',
    taxAmount: '$3,600.00',
    totalAmount: '$23,600.00',
    status: 'ISSUED',
    dueDate: '2026-09-01',
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV-90211',
    customerName: 'Wayne Enterprises',
    customerEmail: 'accounts@wayne.com',
    subtotal: '$45,000.00',
    taxAmount: '$8,100.00',
    totalAmount: '$53,100.00',
    status: 'PAID',
    dueDate: '2026-08-15',
  },
  {
    id: 'inv-3',
    invoiceNumber: 'INV-90212',
    customerName: 'Cyberdyne Systems',
    customerEmail: 'finance@cyberdyne.io',
    subtotal: '$12,500.00',
    taxAmount: '$2,250.00',
    totalAmount: '$14,750.00',
    status: 'OVERDUE',
    dueDate: '2026-07-28',
  },
];

export default function InvoicesPage() {
  return (
    <PlatformLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 4px 0' }}>Finance & Invoices</h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              Headless billing engine, general ledger, tax calculation & invoice tracking
            </p>
          </div>
          <Button variant="primary">+ Create Invoice</Button>
        </div>

        <Card title="All Invoices">
          <DynamicTable columns={columns} data={mockInvoices} />
        </Card>
      </div>
    </PlatformLayout>
  );
}
