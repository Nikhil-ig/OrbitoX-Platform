'use client';

import * as React from 'react';
import {
  Card,
  Badge,
  Button,
  PillNav,
  StatusPill,
  DangerousAction,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  InlineAlert,
  ProgressBar,
  Stepper,
  StepItem,
} from '@orbitox-io/ui';
import {
  Terminal,
  Search,
  Building,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Plus,
  RefreshCw,
  Eye,
  Layers,
  Download,
  ExternalLink,
  ShieldCheck,
  Server,
  Key,
} from 'lucide-react';
import type {
  ProvisioningSummary,
  ProvisioningOperationItem,
} from '@/server/provisioning/provisioning-service';

export interface ProvisioningClientProps {
  initialSummary: ProvisioningSummary;
  initialOperations: ProvisioningOperationItem[];
  availableOrganizations: Array<{ id: string; name: string; slug: string }>;
  initialStatusFilter?: string;
  initialTenantParam?: string;
}

const STEP_DESCRIPTIONS: Record<string, string> = {
  validate_and_reserve: 'Schema verification, slug uniqueness & quota reservation check',
  create_entities: 'Organization membership, project container & environment mapping',
  create_subscription_and_entitlement: 'Commercial plan subscription & entitlement grant token',
  issue_api_keys: 'Scoped live API key (orb_live_...) with SHA-256 verifier',
  provision_plugins: 'Distributed plugin lifecycle invocation (HMS / RestaurantOS)',
  push_first_grant: 'Signed Ed25519 platform grant dispatched to runtime',
  finalize_active: 'State flipped to ACTIVE and activation webhook emitted',
};

function formatStepTitle(stepName: string): string {
  return stepName
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function ProvisioningClient({
  initialSummary,
  initialOperations,
  availableOrganizations,
  initialStatusFilter = 'ALL',
  initialTenantParam = '',
}: ProvisioningClientProps) {
  const [summary, setSummary] = React.useState<ProvisioningSummary>(initialSummary);
  const [operations, setOperations] = React.useState<ProvisioningOperationItem[]>(initialOperations);
  const [statusFilter, setStatusFilter] = React.useState<string>(initialStatusFilter);
  const [searchQuery, setSearchQuery] = React.useState<string>(initialTenantParam);
  const [timeRange, setTimeRange] = React.useState<string>('24h');

  // Slide-in drawers
  const [selectedOperation, setSelectedOperation] = React.useState<ProvisioningOperationItem | null>(null);
  const [showInspectorDrawer, setShowInspectorDrawer] = React.useState<boolean>(false);
  const [showWizardDrawer, setShowWizardDrawer] = React.useState<boolean>(false);

  // Loading & action states
  const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);
  const [retryingOpId, setRetryingOpId] = React.useState<string | null>(null);
  const [actionMessage, setActionMessage] = React.useState<{
    type: 'success' | 'danger' | 'info';
    text: string;
  } | null>(null);

  // Wizard Form State
  const [wizardForm, setWizardForm] = React.useState({
    organizationId: availableOrganizations[0]?.id || '',
    name: '',
    slug: '',
    region: 'ap-south-1',
    environment: 'production',
    pluginId: 'hospital-os',
    planTier: 'hms-starter',
  });
  const [submittingWizard, setSubmittingWizard] = React.useState<boolean>(false);

  // Auto-slugify when name changes
  const handleNameChange = (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setWizardForm((prev) => ({
      ...prev,
      name,
      slug: prev.slug === '' || prev.slug === prev.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        ? slug
        : prev.slug,
    }));
  };

  // Helper to fetch live data
  const refreshOperations = async () => {
    setIsRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('query', searchQuery.trim());

      const res = await fetch(`/api/v1/platform/operations?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setSummary(json.data.summary);
          setOperations(json.data.operations);
        }
      }
    } catch {
      // Keep existing data on transient network error
    } finally {
      setIsRefreshing(false);
    }
  };

  // Trigger filter changes
  React.useEffect(() => {
    refreshOperations();
  }, [statusFilter, searchQuery]);

  // Cancel Operation (Dangerous Action requiring reason)
  const handleCancelOperation = async (opId: string, reason: string) => {
    try {
      const res = await fetch(`/api/v1/platform/operations/${opId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': document.cookie.match(/orbitox_csrf=([^;]+)/)?.[1] || '',
        },
        body: JSON.stringify({ reason }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Cancellation rejected by server.');
      }

      setActionMessage({
        type: 'success',
        text: `Operation ${opId} successfully cancelled and compensated.`,
      });

      if (selectedOperation?.id === opId) {
        setSelectedOperation(json.data);
      }
      refreshOperations();
    } catch (err: any) {
      setActionMessage({
        type: 'danger',
        text: err.message || 'Failed to cancel operation.',
      });
    }
  };

  // Retry Operation
  const handleRetryOperation = async (opId: string) => {
    setRetryingOpId(opId);
    try {
      const res = await fetch(`/api/v1/platform/operations/${opId}/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': document.cookie.match(/orbitox_csrf=([^;]+)/)?.[1] || '',
        },
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Retry rejected by server.');
      }

      setActionMessage({
        type: 'success',
        text: `Operation ${opId} re-enqueued for execution.`,
      });

      if (selectedOperation?.id === opId) {
        setSelectedOperation(json.data);
      }
      refreshOperations();
    } catch (err: any) {
      setActionMessage({
        type: 'danger',
        text: err.message || 'Failed to retry operation.',
      });
    } finally {
      setRetryingOpId(null);
    }
  };

  // Submit New Tenant Provisioning Wizard
  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingWizard(true);
    try {
      const payload = {
        organizationId: wizardForm.organizationId,
        name: wizardForm.name,
        slug: wizardForm.slug,
        region: wizardForm.region,
        environment: wizardForm.environment,
        plugins: [
          {
            id: wizardForm.pluginId,
            plan: wizardForm.planTier,
          },
        ],
      };

      const res = await fetch('/api/v1/platform/operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': document.cookie.match(/orbitox_csrf=([^;]+)/)?.[1] || '',
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Provisioning creation failed.');
      }

      setActionMessage({
        type: 'success',
        text: `Tenant provisioning saga initiated for "${wizardForm.name}" (ID: ${json.data.id}).`,
      });

      setShowWizardDrawer(false);
      setWizardForm({
        organizationId: availableOrganizations[0]?.id || '',
        name: '',
        slug: '',
        region: 'ap-south-1',
        environment: 'production',
        pluginId: 'hospital-os',
        planTier: 'hms-starter',
      });

      // Open inspector for new operation
      setSelectedOperation(json.data);
      setShowInspectorDrawer(true);
      refreshOperations();
    } catch (err: any) {
      setActionMessage({
        type: 'danger',
        text: err.message || 'Failed to initiate tenant provisioning.',
      });
    } finally {
      setSubmittingWizard(false);
    }
  };

  // Convert operation steps to Stepper StepItem format
  const getStepperSteps = (op: ProvisioningOperationItem): StepItem[] => {
    return (op.steps || []).map((step, idx) => {
      let status: StepItem['status'] = 'waiting';
      if (step.status === 'COMPLETED') status = 'done';
      else if (step.status === 'RUNNING') status = 'in_progress';
      else if (step.status === 'FAILED') status = 'failed';
      else if (step.status === 'SKIPPED') status = 'waiting';

      const timeText = step.durationMs !== undefined ? `${step.durationMs}ms` : undefined;
      const description = step.error
        ? `Error: ${step.error}`
        : STEP_DESCRIPTIONS[step.name] || 'Orchestration step';

      return {
        id: step.id || String(idx + 1),
        title: formatStepTitle(step.name),
        description,
        status,
        time: timeText,
      };
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {/* Top Banner / Toast message */}
      {actionMessage && (
        <InlineAlert
          variant={actionMessage.type}
          title={actionMessage.type === 'success' ? 'Operation Success' : 'Operation Notice'}
          onClose={() => setActionMessage(null)}
        >
          {actionMessage.text}
        </InlineAlert>
      )}

      {/* Hero Header Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
              Provisioning Operations
            </h1>
            <Badge variant="secondary" className="font-mono text-[10px] px-2 py-0.5 rounded-full">
              SAGA v2.4
            </Badge>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Asynchronous database cell creation, cryptographic key generation, and service bootstrap orchestrations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <PillNav
            items={[
              { id: '1h', label: '1 hour' },
              { id: '24h', label: '24 hours' },
              { id: '7d', label: '7 days' },
            ]}
            activeId={timeRange}
            onSelect={(id) => setTimeRange(id)}
          />
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full text-xs flex items-center gap-1.5"
            aria-label="Refresh operations list"
            onClick={refreshOperations}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="rounded-full text-xs flex items-center gap-1.5"
            onClick={() => setShowWizardDrawer(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Tenant Provision</span>
          </Button>
        </div>
      </div>

      {/* Top 4 Hero Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="text-3xl font-light tracking-tight text-[var(--color-primary)]">
            {summary.activeCount}
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Active Sagas</div>
          <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
            In-flight orchestrations
          </div>
        </Card>

        <Card className="p-4 border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="text-3xl font-light tracking-tight text-[var(--color-success)]">
            {summary.completed24hCount}
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Completed (24h)</div>
          <div className="text-[11px] text-[var(--color-success)] mt-0.5">
            100% saga durability
          </div>
        </Card>

        <Card className="p-4 border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="text-3xl font-light tracking-tight text-[var(--color-danger)]">
            {summary.failedCount}
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Failed / Partial</div>
          <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
            {summary.failedCount > 0 ? 'Requires operator review' : 'Zero unhandled faults'}
          </div>
        </Card>

        <Card className="p-4 border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="text-3xl font-light tracking-tight text-[var(--color-text)]">
            {summary.avgDurationSeconds}s
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Avg Step Duration</div>
          <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
            p95 across 7 steps
          </div>
        </Card>
      </div>

      {/* Operations Table Card */}
      <Card className="p-5 space-y-4 border-[var(--color-border)] bg-[var(--color-surface)]">
        {/* Search & Filter Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search by tenant, organization, or op_ id..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-xs text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-full bg-[var(--color-surface-raised)] p-0.5 border border-[var(--color-border)] text-xs">
              {['ALL', 'PROVISIONING', 'ACTIVE', 'FAILED', 'CANCELLED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                    statusFilter === st
                      ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st.charAt(0) + st.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="rounded-full text-xs"
              onClick={() => {
                const csvHeader = 'Operation ID,Type,Tenant,Organization,Status,Current Step,Duration,Date\n';
                const rows = operations
                  .map(
                    (o) =>
                      `"${o.id}","${o.type}","${o.tenantName}","${o.organizationName}","${o.status}","${o.currentStepName}","${o.durationFormatted}","${o.createdAt}"`
                  )
                  .join('\n');
                const blob = new Blob([csvHeader + rows], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `provisioning-operations-${Date.now()}.csv`;
                a.click();
              }}
            >
              <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                <th className="py-2.5 px-3 font-medium uppercase tracking-wider text-[11px]">Operation ID</th>
                <th className="py-2.5 px-3 font-medium uppercase tracking-wider text-[11px]">Tenant & Org</th>
                <th className="py-2.5 px-3 font-medium uppercase tracking-wider text-[11px]">Status</th>
                <th className="py-2.5 px-3 font-medium uppercase tracking-wider text-[11px]">Saga Step</th>
                <th className="py-2.5 px-3 font-medium uppercase tracking-wider text-[11px]">Duration</th>
                <th className="py-2.5 px-3 font-medium uppercase tracking-wider text-[11px]">Initiated</th>
                <th className="py-2.5 px-3 font-medium uppercase tracking-wider text-[11px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {operations.length > 0 ? (
                operations.map((op) => (
                  <tr
                    key={op.id}
                    className="hover:bg-[var(--color-surface-raised)]/60 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedOperation(op);
                      setShowInspectorDrawer(true);
                    }}
                  >
                    <td className="py-3 px-3 font-mono text-[11px] font-semibold text-[var(--color-text)]">
                      {op.id}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-[var(--color-text)]">{op.tenantName}</div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">{op.organizationName}</div>
                    </td>
                    <td className="py-3 px-3">
                      {op.status === 'ACTIVE' && (
                        <span className="text-[10px] text-[var(--color-success)] bg-[var(--color-success)]/15 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      )}
                      {op.status === 'PROVISIONING' && (
                        <span className="text-[10px] text-[var(--color-primary)] bg-[var(--color-primary)]/15 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                          <Clock className="h-3 w-3 animate-spin" /> Provisioning
                        </span>
                      )}
                      {op.status === 'FAILED' && (
                        <span className="text-[10px] text-[var(--color-danger)] bg-[var(--color-danger)]/15 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> Failed
                        </span>
                      )}
                      {op.status === 'CANCELLED' && (
                        <span className="text-[10px] text-[var(--color-text-muted)] bg-[var(--color-surface-raised)] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                          Cancelled
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-[var(--color-text)]">
                          {op.currentStepIndex}/{op.totalSteps}
                        </span>
                        <span className="text-[11px] text-[var(--color-text-muted)] truncate max-w-[140px]">
                          {op.currentStepName}
                        </span>
                      </div>
                      <div className="w-24 mt-1">
                        <ProgressBar
                          value={(op.currentStepIndex / op.totalSteps) * 100}
                          max={100}
                          size="sm"
                          variant={
                            op.status === 'FAILED'
                              ? 'danger'
                              : op.status === 'ACTIVE'
                              ? 'success'
                              : 'primary'
                          }
                          ariaLabel={`Step progress for ${op.id}`}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-[var(--color-text-muted)]">
                      {op.durationFormatted}
                    </td>
                    <td className="py-3 px-3 text-[var(--color-text-muted)]">
                      {new Date(op.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {op.status === 'FAILED' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="rounded-full text-[11px] px-2.5 py-0.5 h-6"
                            disabled={retryingOpId === op.id}
                            onClick={() => handleRetryOperation(op.id)}
                          >
                            {retryingOpId === op.id ? 'Retrying…' : 'Retry'}
                          </Button>
                        )}

                        {op.status === 'PROVISIONING' && (
                          <DangerousAction
                            trigger={
                              <Button
                                variant="secondary"
                                size="sm"
                                className="rounded-full text-[11px] px-2.5 py-0.5 h-6 text-[var(--color-danger)]"
                              >
                                Cancel
                              </Button>
                            }
                            title="Cancel In-Flight Provisioning Saga"
                            description={`Cancelling operation ${op.id} for "${op.tenantName}". This immediately invokes plugin compensation (deprovisioning any created databases/hostnames) and permanently records the cancellation in the audit trail.`}
                            expectedConfirmationText="CANCEL_OPERATION"
                            requireReason={true}
                            confirmButtonLabel="Cancel Saga"
                            onConfirm={(payload) => handleCancelOperation(op.id, payload.reason || '')}
                          />
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-full text-[11px] px-2 py-0.5 h-6 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                          aria-label={`Inspect operation details for ${op.id}`}
                          title={`Inspect operation details for ${op.id}`}
                          onClick={() => {
                            setSelectedOperation(op);
                            setShowInspectorDrawer(true);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-[var(--color-text-muted)]">
                    No matching provisioning operations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Slide-in Operation Inspector Drawer */}
      <Sheet open={showInspectorDrawer} onOpenChange={setShowInspectorDrawer}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          {selectedOperation && (
            <div className="space-y-6">
              <SheetHeader>
                <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                  <div>
                    <SheetTitle className="text-base font-bold text-[var(--color-text)]">
                      Saga Orchestration Diagnostics
                    </SheetTitle>
                    <div className="text-xs text-[var(--color-text-muted)] font-mono mt-0.5">
                      {selectedOperation.id}
                    </div>
                  </div>
                  <div>
                    {selectedOperation.status === 'ACTIVE' && (
                      <span className="text-xs text-[var(--color-success)] bg-[var(--color-success)]/15 px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Active
                      </span>
                    )}
                    {selectedOperation.status === 'PROVISIONING' && (
                      <span className="text-xs text-[var(--color-primary)] bg-[var(--color-primary)]/15 px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 animate-spin" /> In Progress
                      </span>
                    )}
                    {selectedOperation.status === 'FAILED' && (
                      <span className="text-xs text-[var(--color-danger)] bg-[var(--color-danger)]/15 px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1">
                        <XCircle className="h-3.5 w-3.5" /> Failed
                      </span>
                    )}
                    {selectedOperation.status === 'CANCELLED' && (
                      <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-raised)] px-2.5 py-1 rounded-full font-medium">
                        Cancelled
                      </span>
                    )}
                  </div>
                </div>
              </SheetHeader>

              {/* Target Tenant Card */}
              <div className="p-4 rounded-[var(--radius-row)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--color-text-muted)]">Target Tenant:</span>
                  <span className="font-semibold text-[var(--color-text)]">{selectedOperation.tenantName}</span>
                </div>
                <div className="flex justify-between items-center font-mono text-[11px]">
                  <span className="text-[var(--color-text-muted)]">Tenant ID:</span>
                  <span className="text-[var(--color-text)]">{selectedOperation.tenantId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--color-text-muted)]">Organization:</span>
                  <span className="text-[var(--color-text)]">{selectedOperation.organizationName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--color-text-muted)]">Total Elapsed Duration:</span>
                  <span className="font-mono text-[var(--color-text)]">{selectedOperation.durationFormatted}</span>
                </div>
                {selectedOperation.leaseOwner && (
                  <div className="flex justify-between items-center font-mono text-[11px]">
                    <span className="text-[var(--color-text-muted)]">Active Worker Lease:</span>
                    <span className="text-[var(--color-primary)]">{selectedOperation.leaseOwner}</span>
                  </div>
                )}
              </div>

              {/* Error Notice if Failed */}
              {selectedOperation.error && (
                <div className="p-3 rounded-[var(--radius-row)] bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 text-xs text-[var(--color-danger)] space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" /> Saga Step Execution Fault
                  </div>
                  <div className="font-mono text-[11px] leading-relaxed">{selectedOperation.error}</div>
                </div>
              )}

              {/* 7-Step Vertical Stepper */}
              <div className="space-y-3">
                <h3 className="font-semibold text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                  Distributed Saga Steps (7 / 7)
                </h3>
                <div className="p-4 rounded-[var(--radius-row)] border border-[var(--color-border)] bg-[var(--color-surface)]">
                  <Stepper
                    steps={getStepperSteps(selectedOperation)}
                    orientation="vertical"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--color-border)]">
                {selectedOperation.status === 'PROVISIONING' && (
                  <DangerousAction
                    trigger={
                      <Button variant="danger" size="sm" className="rounded-full">
                        Cancel & Compensate
                      </Button>
                    }
                    title="Cancel In-Flight Provisioning Saga"
                    description={`Cancelling operation ${selectedOperation.id} immediately invokes plugin deprovisioning compensation to roll back any allocated database resources or Cloudflare hostnames.`}
                    expectedConfirmationText="CANCEL_OPERATION"
                    requireReason={true}
                    confirmButtonLabel="Cancel Saga"
                    onConfirm={(payload) => handleCancelOperation(selectedOperation.id, payload.reason || '')}
                  />
                )}

                {selectedOperation.status === 'FAILED' && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="rounded-full"
                    disabled={retryingOpId === selectedOperation.id}
                    onClick={() => handleRetryOperation(selectedOperation.id)}
                  >
                    {retryingOpId === selectedOperation.id ? 'Retrying…' : 'Retry Failed Steps'}
                  </Button>
                )}

                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setShowInspectorDrawer(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Slide-in New Tenant Provisioning Wizard Drawer */}
      <Sheet open={showWizardDrawer} onOpenChange={setShowWizardDrawer}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <div className="pb-2 border-b border-[var(--color-border)]">
              <SheetTitle className="text-base font-bold text-[var(--color-text)]">
                Provision New Tenant
              </SheetTitle>
              <div className="text-xs text-[var(--color-text-muted)] mt-1">
                Coordinates database cell creation, API keys, and commercial plan entitlements.
              </div>
            </div>
          </SheetHeader>

          <form onSubmit={handleCreateTenant} className="space-y-4 pt-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-medium text-[var(--color-text)]">Target Organization</label>
              <select
                required
                value={wizardForm.organizationId}
                onChange={(e) => setWizardForm({ ...wizardForm, organizationId: e.target.value })}
                className="w-full px-3 py-2 rounded-[var(--radius-row)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-xs text-[var(--color-text)] focus:outline-none"
              >
                {availableOrganizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.slug})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-[var(--color-text)]">Tenant Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Diagnostics Central"
                value={wizardForm.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-3 py-2 rounded-[var(--radius-row)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-xs text-[var(--color-text)] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-[var(--color-text)]">Tenant Slug</label>
              <input
                type="text"
                required
                placeholder="apex-diag-central"
                value={wizardForm.slug}
                onChange={(e) => setWizardForm({ ...wizardForm, slug: e.target.value })}
                className="w-full px-3 py-2 rounded-[var(--radius-row)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] font-mono text-xs text-[var(--color-text)] focus:outline-none"
              />
              <span className="text-[11px] text-[var(--color-text-muted)]">
                Will resolve to {wizardForm.slug || 'slug'}.orbitox.io
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-medium text-[var(--color-text)]">Region</label>
                <select
                  value={wizardForm.region}
                  onChange={(e) => setWizardForm({ ...wizardForm, region: e.target.value })}
                  className="w-full px-3 py-2 rounded-[var(--radius-row)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-xs text-[var(--color-text)] focus:outline-none"
                >
                  <option value="ap-south-1">ap-south-1 (Mumbai)</option>
                  <option value="us-east-1">us-east-1 (N. Virginia)</option>
                  <option value="eu-central-1">eu-central-1 (Frankfurt)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-[var(--color-text)]">Environment</label>
                <select
                  value={wizardForm.environment}
                  onChange={(e) => setWizardForm({ ...wizardForm, environment: e.target.value })}
                  className="w-full px-3 py-2 rounded-[var(--radius-row)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-xs text-[var(--color-text)] focus:outline-none"
                >
                  <option value="production">Production</option>
                  <option value="staging">Staging</option>
                  <option value="sandbox">Sandbox</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="font-medium text-[var(--color-text)]">Product Suite & Plan Tier</label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  className={`p-3 rounded-[var(--radius-row)] border cursor-pointer transition-all ${
                    wizardForm.pluginId === 'hospital-os'
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                      : 'border-[var(--color-border)] bg-[var(--color-surface-raised)]'
                  }`}
                  onClick={() => setWizardForm({ ...wizardForm, pluginId: 'hospital-os', planTier: 'hms-starter' })}
                >
                  <div className="font-semibold text-xs text-[var(--color-text)]">HospitalOS</div>
                  <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Clinical & HMS</div>
                </div>

                <div
                  className={`p-3 rounded-[var(--radius-row)] border cursor-pointer transition-all ${
                    wizardForm.pluginId === 'restaurant-os'
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                      : 'border-[var(--color-border)] bg-[var(--color-surface-raised)]'
                  }`}
                  onClick={() => setWizardForm({ ...wizardForm, pluginId: 'restaurant-os', planTier: 'standard' })}
                >
                  <div className="font-semibold text-xs text-[var(--color-text)]">RestaurantOS</div>
                  <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">POS & KDS</div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-[var(--color-text)]">Plan Tier</label>
              <select
                value={wizardForm.planTier}
                onChange={(e) => setWizardForm({ ...wizardForm, planTier: e.target.value })}
                className="w-full px-3 py-2 rounded-[var(--radius-row)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-xs text-[var(--color-text)] focus:outline-none"
              >
                {wizardForm.pluginId === 'hospital-os' ? (
                  <>
                    <option value="hms-starter">Starter (₹4,999/mo) — 20 Beds, Basic EHR</option>
                    <option value="hms-growth">Growth (₹14,999/mo) — 100 Beds, Lab & Pharmacy</option>
                    <option value="hms-enterprise">Enterprise (₹49,999/mo) — Unlimited Beds, PACS & ICU</option>
                  </>
                ) : (
                  <>
                    <option value="standard">Standard (₹2,999/mo) — 5 Outlets, QR Menu</option>
                    <option value="growth">Growth (₹8,999/mo) — 20 Outlets, Inventory & KDS</option>
                    <option value="enterprise">Enterprise (₹24,999/mo) — Unlimited Outlets, Franchise API</option>
                  </>
                )}
              </select>
            </div>

            <div className="pt-4 flex items-center justify-end gap-2 border-t border-[var(--color-border)]">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-full"
                onClick={() => setShowWizardDrawer(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="rounded-full"
                disabled={submittingWizard || !wizardForm.name.trim() || !wizardForm.slug.trim()}
              >
                {submittingWizard ? 'Initiating Saga…' : 'Start Provisioning Saga'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
