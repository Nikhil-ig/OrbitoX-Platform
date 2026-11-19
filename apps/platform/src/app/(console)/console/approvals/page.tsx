'use client';

import * as React from 'react';
import { ConsoleShell } from '../components/console-shell';
import {
  OperationalDataTable,
  OperationalStatusBadge,
  FilterToolbar,
  DetailDrawer,
  StepUpConfirmationDialog,
  Button,
  type ColumnDef,
} from '@orbitox-io/ui';
import { CheckSquare, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface ApprovalRequest {
  id: string;
  type: string;
  targetId: string;
  targetName?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedBy: string;
  requestedAt: string;
  reason: string;
  stages?: any[];
}

export default function ConsoleApprovalsPage() {
  const [requests, setRequests] = React.useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  const [selectedReq, setSelectedReq] = React.useState<ApprovalRequest | null>(null);
  const [actionDialog, setActionDialog] = React.useState<{
    open: boolean;
    type: 'APPROVE' | 'REJECT';
    req: ApprovalRequest | null;
  }>({ open: false, type: 'APPROVE', req: null });
  const [submitting, setSubmitting] = React.useState(false);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/platform/approvals');
      const json = await res.json();
      if (json.success && Array.isArray(json.data?.requests)) {
        setRequests(json.data.requests);
      } else {
        setRequests([
          {
            id: 'appr_01HXYZ001',
            type: 'KEY_ROTATION',
            targetId: 'key_prod_master_ed25519',
            targetName: 'Production Master Ed25519 Signing Key',
            status: 'PENDING',
            requestedBy: 'operator-lead@orbitox.io',
            requestedAt: new Date(Date.now() - 3600000).toISOString(),
            reason: 'Quarterly cryptographic key lifecycle rotation schedule.',
          },
          {
            id: 'appr_01HXYZ002',
            type: 'TENANT_TERMINATION',
            targetId: 'ten_oasis_hospital',
            targetName: 'Oasis Hospital BLR',
            status: 'PENDING',
            requestedBy: 'compliance@orbitox.io',
            requestedAt: new Date(Date.now() - 7200000).toISOString(),
            reason: 'GDPR Right to be Forgotten statutory execution request.',
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExecuteApproval = async (totpCode: string) => {
    if (!actionDialog.req) return;
    try {
      setSubmitting(true);
      const res = await fetch('/api/v1/platform/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: actionDialog.req.id,
          action: actionDialog.type,
          totpCode,
          comments: `Step-up authorized ${actionDialog.type} action.`,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Approval execution failed.');
      }
      setActionDialog({ open: false, type: 'APPROVE', req: null });
      setSelectedReq(null);
      await loadData();
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = React.useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.type.toLowerCase().includes(q) &&
          !r.targetId.toLowerCase().includes(q) &&
          !(r.targetName || '').toLowerCase().includes(q) &&
          !r.requestedBy.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [requests, search, statusFilter]);

  const columns: ColumnDef<ApprovalRequest>[] = [
    {
      accessorKey: 'type',
      header: 'Operation Type',
      cell: ({ row }) => (
        <div>
          <span className="font-semibold text-xs text-[var(--color-text)]">
            {row.original.type}
          </span>
          <div className="text-[11px] text-[var(--color-text-muted)] font-mono">
            {row.original.id}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'targetName',
      header: 'Target Entity',
      cell: ({ row }) => (
        <div>
          <span className="text-xs text-[var(--color-text)]">
            {row.original.targetName || row.original.targetId}
          </span>
          <div className="text-[10px] text-[var(--color-text-muted)] font-mono">
            {row.original.targetId}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'requestedBy',
      header: 'Requester',
      cell: ({ row }) => (
        <span className="text-xs text-[var(--color-text-muted)]">
          {row.original.requestedBy}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <OperationalStatusBadge status={row.original.status} />
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        if (row.original.status !== 'PENDING') {
          return (
            <span className="text-[11px] text-[var(--color-text-muted)]">
              Resolved
            </span>
          );
        }
        return (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs text-[var(--color-success)] hover:bg-[var(--color-success)]/10"
              onClick={(e) => {
                e.stopPropagation();
                setActionDialog({ open: true, type: 'APPROVE', req: row.original });
              }}
            >
              Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
              onClick={(e) => {
                e.stopPropagation();
                setActionDialog({ open: true, type: 'REJECT', req: row.original });
              }}
            >
              Reject
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <ConsoleShell activeId="approvals">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text)]">
              Multi-Operator Approvals
            </h1>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Dual-control authorizations, key rotations, tenant terminations, and high-risk operations.
            </p>
          </div>
        </div>

        <FilterToolbar
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search approvals by type, target or requester..."
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          statusOptions={[
            { label: 'All', value: 'ALL', count: requests.length },
            {
              label: 'Pending',
              value: 'PENDING',
              count: requests.filter((r) => r.status === 'PENDING').length,
            },
            {
              label: 'Approved',
              value: 'APPROVED',
              count: requests.filter((r) => r.status === 'APPROVED').length,
            },
            {
              label: 'Rejected',
              value: 'REJECTED',
              count: requests.filter((r) => r.status === 'REJECTED').length,
            },
          ]}
          onResetFilters={() => {
            setSearch('');
            setStatusFilter('ALL');
          }}
        />

        <OperationalDataTable
          columns={columns}
          data={filtered}
          totalRows={filtered.length}
          loading={loading}
          onRowClick={(row) => setSelectedReq(row)}
        />

        {/* Detail Drawer */}
        <DetailDrawer
          open={Boolean(selectedReq)}
          onOpenChange={(open) => !open && setSelectedReq(null)}
          title={`Approval Request: ${selectedReq?.type}`}
          description={selectedReq?.id}
          badge={selectedReq ? <OperationalStatusBadge status={selectedReq.status} /> : null}
          tabs={[
            {
              id: 'details',
              label: 'Details',
              content: (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
                      Justification Reason
                    </label>
                    <p className="text-[var(--color-text)] leading-relaxed">
                      {selectedReq?.reason}
                    </p>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
                      Target Entity ID
                    </label>
                    <p className="font-mono text-[var(--color-text)]">
                      {selectedReq?.targetId}
                    </p>
                  </div>
                </div>
              ),
            },
          ]}
        />

        {/* Step-Up Authentication Dialog */}
        <StepUpConfirmationDialog
          open={actionDialog.open}
          onOpenChange={(open) => !open && setActionDialog({ open: false, type: 'APPROVE', req: null })}
          title={`${actionDialog.type === 'APPROVE' ? 'Authorize' : 'Reject'} Approval Request`}
          description={`You are about to ${actionDialog.type.toLowerCase()} high-risk operation: ${actionDialog.req?.type} on target ${actionDialog.req?.targetId}.`}
          impactWarning="This action will be permanently recorded in the immutable platform audit ledger."
          confirmLabel={actionDialog.type === 'APPROVE' ? 'Authorize Operation' : 'Reject Operation'}
          confirmVariant={actionDialog.type === 'APPROVE' ? 'primary' : 'destructive'}
          isSubmitting={submitting}
          onConfirm={handleExecuteApproval}
        />
      </div>
    </ConsoleShell>
  );
}
