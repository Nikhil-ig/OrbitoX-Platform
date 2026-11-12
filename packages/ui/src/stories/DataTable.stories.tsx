import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DataTable, type ColumnDef } from '../components/data-table';
import { StatusPill } from '../components/status-pill';
import { formatINR, formatRelative } from '../format';
import { Button } from '../components/button';

const meta: Meta = {
  title: 'Components/Data/DataTable',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

interface OrderRow {
  id: string;
  customer: string;
  status: string;
  totalPaise: number;
  time: number;
}

const mockOrders: OrderRow[] = [
  { id: 'ORD-101', customer: 'Priya Sharma', status: 'ACTIVE', totalPaise: 45000, time: Date.now() - 60000 },
  { id: 'ORD-102', customer: 'Rahul Verma', status: 'COMPLETED', totalPaise: 125000, time: Date.now() - 1800000 },
  { id: 'ORD-103', customer: 'Ananya Roy', status: 'PAID', totalPaise: 89000, time: Date.now() - 3600000 },
  { id: 'ORD-104', customer: 'Deepak Patel', status: 'SUSPENDED', totalPaise: 32000, time: Date.now() - 7200000 },
];

const columns: ColumnDef<OrderRow>[] = [
  {
    id: 'id',
    header: 'Order ID',
    accessorKey: 'id',
    cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.id}</span>,
  },
  {
    id: 'customer',
    header: 'Customer',
    accessorKey: 'customer',
    cell: ({ row }) => <span className="text-xs">{row.original.customer}</span>,
  },
  {
    id: 'status',
    header: 'Status',
    accessorKey: 'status',
    cell: ({ row }) => <StatusPill status={row.original.status} />,
  },
  {
    id: 'total',
    header: 'Total (INR)',
    accessorKey: 'totalPaise',
    cell: ({ row }) => (
      <span className="font-mono text-xs font-medium">
        {formatINR(row.original.totalPaise)}
      </span>
    ),
  },
  {
    id: 'time',
    header: 'Placed',
    accessorKey: 'time',
    cell: ({ row }) => (
      <span className="text-xs text-[var(--color-text-muted)]">
        {formatRelative(row.original.time)}
      </span>
    ),
  },
];

export const PrimaryTable: StoryObj = {
  render: () => (
    <div className="max-w-4xl p-4">
      <DataTable
        columns={columns}
        data={mockOrders}
        enableRowSelection
        bulkActions={(selected) => (
          <Button variant="destructive" size="sm" className="h-7 text-xs">
            Archive ({selected.length})
          </Button>
        )}
      />
    </div>
  ),
};

