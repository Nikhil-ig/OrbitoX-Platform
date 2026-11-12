import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DataTable, type ColumnDef } from '../components/data-table';
import { FilterBar, type FilterPill } from '../components/filter-bar';
import { Pagination } from '../components/pagination';
import { StatusPill } from '../components/status-pill';
import { formatINR } from '../format';
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
  placedAt: string;
}

const mockOrders: OrderRow[] = [
  { id: 'ORD-101', customer: 'Priya Sharma — Corporate Catering (Bengaluru South Cluster)', status: 'ACTIVE', totalPaise: 45000, placedAt: '12 Nov, 10:15 AM' },
  { id: 'ORD-102', customer: 'Rahul Verma', status: 'COMPLETED', totalPaise: 125000, placedAt: '12 Nov, 09:42 AM' },
  { id: 'ORD-103', customer: 'Ananya Roy', status: 'PAID', totalPaise: 89000, placedAt: '12 Nov, 09:10 AM' },
  { id: 'ORD-104', customer: 'Deepak Patel — Extra Long Enterprise Storefront Account Identifier Overflow Test', status: 'SUSPENDED', totalPaise: 32000, placedAt: '12 Nov, 08:25 AM' },
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
    cell: ({ row }) => (
      <span className="block max-w-[200px] truncate text-xs" title={row.original.customer}>
        {row.original.customer}
      </span>
    ),
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
    id: 'placedAt',
    header: 'Placed',
    accessorKey: 'placedAt',
    cell: ({ row }) => (
      <span className="text-xs text-[var(--color-text-muted)]">
        {row.original.placedAt}
      </span>
    ),
  },
];

export const PrimaryTableWithFilterAndPagination: StoryObj = {
  render: () => {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [pageIndex, setPageIndex] = React.useState(0);
    const [pageSize, setPageSize] = React.useState(10);
    const [statusFilter, setStatusFilter] = React.useState<string | null>('ACTIVE');

    const pills: FilterPill[] = statusFilter
      ? [
          {
            id: 'status',
            label: 'Status',
            value: statusFilter,
            onRemove: () => setStatusFilter(null),
          },
        ]
      : [];

    const filtered = mockOrders.filter((row) => {
      if (!searchQuery.trim()) return true;
      return row.customer.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
      <div className="max-w-4xl p-4 space-y-4">
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Filter orders by customer..."
          activePills={pills}
          onClearAll={() => {
            setStatusFilter(null);
            setSearchQuery('');
          }}
        />
        <DataTable
          columns={columns}
          data={filtered}
          enableRowSelection
          bulkActions={(selected) => (
            <Button variant="destructive" size="sm" className="h-7 text-xs">
              Archive ({selected.length})
            </Button>
          )}
          renderMobileCard={(row) => (
            <div className="p-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold">{row.id}</span>
                <StatusPill status={row.status} />
              </div>
              <p className="text-xs truncate">{row.customer}</p>
              <p className="font-mono text-xs text-[var(--color-text-muted)]">{formatINR(row.totalPaise)}</p>
            </div>
          )}
        />
        <Pagination
          pageIndex={pageIndex}
          pageSize={pageSize}
          totalRows={48}
          onPageChange={setPageIndex}
          onPageSizeChange={setPageSize}
        />
      </div>
    );
  },
};

export const LoadingTable: StoryObj = {
  render: () => (
    <div className="max-w-4xl p-4">
      <DataTable columns={columns} data={[]} loading />
    </div>
  ),
};

export const EmptyTable: StoryObj = {
  render: () => (
    <div className="max-w-4xl p-4">
      <DataTable columns={columns} data={[]} />
    </div>
  ),
};

export const ErrorTable: StoryObj = {
  render: () => (
    <div className="max-w-4xl p-4">
      <DataTable
        columns={columns}
        data={[]}
        error="PostgreSQL read replica failed statement timeout (5000ms)."
        onRetry={() => undefined}
      />
    </div>
  ),
};
