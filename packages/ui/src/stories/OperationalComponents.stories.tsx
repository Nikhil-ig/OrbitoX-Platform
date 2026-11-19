import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { type ColumnDef } from '@tanstack/react-table';
import { OperationalStatusBadge } from '../components/operational-status-badge';
import { FilterToolbar } from '../components/filter-toolbar';
import { DetailDrawer } from '../components/detail-drawer';
import { StepUpConfirmationDialog } from '../components/step-up-confirmation-dialog';
import { OperationalDataTable } from '../components/operational-data-table';
import { Button } from '../components/button';

const meta: Meta = {
  title: 'Operations/OperationalComponents',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

export const StatusBadges: StoryObj = {
  render: () => (
    <div className="flex flex-wrap gap-3 p-4">
      <OperationalStatusBadge status="ACTIVE" />
      <OperationalStatusBadge status="HEALTHY" />
      <OperationalStatusBadge status="WARNING" />
      <OperationalStatusBadge status="DEGRADED" />
      <OperationalStatusBadge status="FAILED" />
      <OperationalStatusBadge status="REVOKED" />
      <OperationalStatusBadge status="PENDING" />
      <OperationalStatusBadge status="CUSTOM" tone="neutral" />
    </div>
  ),
};

export const Toolbar: StoryObj = {
  render: () => {
    const [query, setQuery] = React.useState('');
    const [status, setStatus] = React.useState('ALL');
    return (
      <div className="p-4 max-w-2xl">
        <FilterToolbar
          searchQuery={query}
          onSearchChange={setQuery}
          statusFilter={status}
          onStatusChange={setStatus}
          statusOptions={[
            { label: 'All', value: 'ALL', count: 42 },
            { label: 'Active', value: 'ACTIVE', count: 35 },
            { label: 'Suspended', value: 'SUSPENDED', count: 7 },
          ]}
          onResetFilters={() => {
            setQuery('');
            setStatus('ALL');
          }}
        />
      </div>
    );
  },
};

export const Drawer: StoryObj = {
  render: () => {
    const [open, setOpen] = React.useState(false);
    return (
      <div className="p-4">
        <Button onClick={() => setOpen(true)}>Open Detail Drawer</Button>
        <DetailDrawer
          open={open}
          onOpenChange={setOpen}
          title="Tenant Details: acme-corp"
          description="Tenant ID: ten_01HXYZ123456789"
          badge={<OperationalStatusBadge status="ACTIVE" />}
          tabs={[
            {
              id: 'overview',
              label: 'Overview',
              content: <div className="text-sm">Tenant Overview Panel</div>,
            },
            {
              id: 'domains',
              label: 'Domains',
              count: 2,
              content: <div className="text-sm">Custom Domains Panel</div>,
            },
          ]}
          actions={
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
          }
        />
      </div>
    );
  },
};

export const StepUpDialog: StoryObj = {
  render: () => {
    const [open, setOpen] = React.useState(false);
    return (
      <div className="p-4">
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Rotate Primary Signing Key
        </Button>
        <StepUpConfirmationDialog
          open={open}
          onOpenChange={setOpen}
          title="Rotate Primary Ed25519 Signing Key"
          description="Rotating this cryptographic key invalidates previous tokens after the 24-hour grace window."
          impactWarning="All tenant API consumers must refresh signatures within 24 hours."
          confirmLabel="Authorize Key Rotation"
          onConfirm={async (code) => {
            alert(`Confirmed with TOTP: ${code}`);
            setOpen(false);
          }}
        />
      </div>
    );
  },
};

interface SampleRow {
  id: string;
  name: string;
  status: string;
  domains: number;
}

const sampleData: SampleRow[] = [
  { id: 'ten_01', name: 'Acme Corp', status: 'ACTIVE', domains: 3 },
  { id: 'ten_02', name: 'Beta Logistics', status: 'SUSPENDED', domains: 1 },
  { id: 'ten_03', name: 'Gamma Retail', status: 'PROVISIONING', domains: 0 },
];

const sampleCols: ColumnDef<SampleRow>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: (info) => <span className="font-mono text-xs">{info.getValue() as string}</span>,
  },
  {
    accessorKey: 'name',
    header: 'Tenant Name',
    cell: (info) => <span className="font-medium text-xs">{info.getValue() as string}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: (info) => <OperationalStatusBadge status={info.getValue() as string} />,
  },
  {
    accessorKey: 'domains',
    header: 'Domains',
    cell: (info) => <span className="text-xs">{info.getValue() as number}</span>,
  },
];

export const DataTableStory: StoryObj = {
  name: 'OperationalDataTable',
  render: () => {
    return (
      <div className="p-4">
        <OperationalDataTable
          columns={sampleCols}
          data={sampleData}
          totalRows={sampleData.length}
          enableRowSelection
        />
      </div>
    );
  },
};
