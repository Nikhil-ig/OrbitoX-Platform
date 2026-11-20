'use client';

import * as React from 'react';
import {
  Card,
  Badge,
  Button,
  PillNav,
  StatusPill,
  DangerousAction,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  InlineAlert,
  ProgressBar,
} from '@orbitox-io/ui';
import {
  Search,
  CreditCard,
  Building,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Plus,
  FileText,
  Download,
  ShieldAlert,
  Send,
  Eye,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import type {
  BillingSummary,
  BillingInvoiceItem,
  BillingInvoiceListResult,
} from '@/server/billing/billing-service';
import { useStepUpAuth } from '../components/step-up-modal';

interface BillingClientProps {
  initialSummary: BillingSummary;
  initialInvoices: BillingInvoiceListResult;
  operatorEmail: string;
  operatorRole: string;
}

export function BillingClient({
  initialSummary,
  initialInvoices,
  operatorEmail,
  operatorRole,
}: BillingClientProps) {
  const { stepUpDialog, requestStepUpAuth } = useStepUpAuth();
  const [summary, setSummary] = React.useState<BillingSummary>(initialSummary);
  const [invoices, setInvoices] = React.useState<BillingInvoiceItem[]>(initialInvoices.items);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [timeRange, setTimeRange] = React.useState('month');
  const [loading, setLoading] = React.useState(false);
  const [actionMessage, setActionMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal / Drawer states
  const [selectedInvoice, setSelectedInvoice] = React.useState<BillingInvoiceItem | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = React.useState(false);
  const [showAddPlanDrawer, setShowAddPlanDrawer] = React.useState(false);
  const [showGraceModal, setShowGraceModal] = React.useState(false);
  const [showWebhookModal, setShowWebhookModal] = React.useState(false);

  // Form states
  const [newPlan, setNewPlan] = React.useState({
    planId: '',
    name: '',
    pluginId: '@orbitox/restaurant',
    tier: 'growth',
    priceMinor: 249900,
    interval: 'month',
    gracePeriodDays: 7,
  });

  const [gracePolicyForm, setGracePolicyForm] = React.useState({
    planId: 'plan_restaurant_growth',
    gracePeriodDays: 7,
    reason: '',
  });

  const [submittingPlan, setSubmittingPlan] = React.useState(false);
  const [retryingInvoiceId, setRetryingInvoiceId] = React.useState<string | null>(null);
  const [remindingSubId, setRemindingSubId] = React.useState<string | null>(null);

  // Refresh data from API
  const refreshInvoices = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const res = await fetch(`/api/v1/platform/billing/invoices?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data?.items) {
        setInvoices(json.data.items);
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to refresh invoices.' });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  // Handle Search submit or enter
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      refreshInvoices();
    }
  };

  const getCsrfToken = () => {
    if (typeof document === 'undefined') return '';
    return document.cookie.match(/(?:orbitox_operator_csrf|orbitox_customer_csrf|orbitox_csrf)=([^;]+)/)?.[1] || '';
  };

  // 1. Retry Payment Action
  const handleRetryPayment = async (invoice: BillingInvoiceItem) => {
    try {
      setRetryingInvoiceId(invoice.id);
      setActionMessage(null);
      const res = await fetch(`/api/v1/platform/billing/invoices/${encodeURIComponent(invoice.id)}/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Payment retry failed');
      }
      setActionMessage({ type: 'success', text: `Payment retry queued for invoice ${invoice.id}.` });
      refreshInvoices();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setRetryingInvoiceId(null);
    }
  };

  // 2. Mark Paid Action (DangerousAction)
  const handleExecuteMarkPaid = async (targetId: string, reason: string) => {
    try {
      setActionMessage(null);
      const res = await fetch(`/api/v1/platform/billing/invoices/${encodeURIComponent(targetId)}/mark-paid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to mark invoice as paid.');
      }
      setActionMessage({ type: 'success', text: `Invoice ${targetId} marked as paid successfully.` });
      refreshInvoices();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // 3. Cancel Subscription Action (DangerousAction)
  const handleExecuteCancelSubscription = async (targetSubId: string, reason: string) => {
    try {
      setActionMessage(null);
      const res = await fetch(`/api/v1/platform/billing/subscriptions/${encodeURIComponent(targetSubId)}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to cancel subscription.');
      }
      setActionMessage({ type: 'success', text: `Subscription ${targetSubId} cancelled successfully.` });
      refreshInvoices();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // 4. Update Grace Period Action
  const handleSaveGracePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionMessage(null);
      const res = await fetch('/api/v1/platform/billing/grace-period', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        body: JSON.stringify(gracePolicyForm),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to update grace period policy.');
      }
      setActionMessage({ type: 'success', text: `Grace policy for ${gracePolicyForm.planId} updated.` });
      setShowGraceModal(false);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // 5. Create Plan Action
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingPlan(true);
      setActionMessage(null);
      const res = await fetch('/api/v1/platform/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        body: JSON.stringify(newPlan),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to add plan catalogue entry.');
      }
      setActionMessage({ type: 'success', text: `Plan ${newPlan.name} (${newPlan.planId}) added to catalogue.` });
      setShowAddPlanDrawer(false);
      setNewPlan({
        planId: '',
        name: '',
        pluginId: '@orbitox/restaurant',
        tier: 'growth',
        priceMinor: 249900,
        interval: 'month',
        gracePeriodDays: 7,
      });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setSubmittingPlan(false);
    }
  };

  // 6. Send Grace Reminder Action
  const handleSendReminder = async (subId: string) => {
    try {
      setRemindingSubId(subId);
      setActionMessage(null);
      const res = await fetch(`/api/v1/platform/billing/subscriptions/${encodeURIComponent(subId)}/remind`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to dispatch payment reminder.');
      }
      setActionMessage({ type: 'success', text: `Payment reminder queued for delivery to ${json.data.recipient}.` });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setRemindingSubId(null);
    }
  };

  // 7. Resolve Unknown Webhook Event Action
  const handleResolveUnknownEvent = async (eventId: string) => {
    try {
      setActionMessage(null);
      const res = await fetch(`/api/v1/platform/billing/unknown-events/${encodeURIComponent(eventId)}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        body: JSON.stringify({ resolution: 'Operator reviewed and marked handled' }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to resolve unknown event.');
      }
      setActionMessage({ type: 'success', text: `Webhook event ${eventId} marked as handled and resolved.` });
      const summaryRes = await fetch('/api/v1/platform/billing/summary');
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        if (summaryData.data) setSummary(summaryData.data);
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-4 px-2">
      {/* Toast / Alert banner */}
      {actionMessage && (
        <InlineAlert
          variant={actionMessage.type === 'error' ? 'danger' : 'success'}
          title={actionMessage.type === 'error' ? 'Operational Alert' : 'Success'}
        >
          {actionMessage.text}
        </InlineAlert>
      )}

      {/* Header with Subtitle and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-[var(--color-text-muted)]">Razorpay · live mode off (staging)</div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)] mt-1">
            Billing & payments
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <PillNav
            items={[
              { id: 'week', label: 'Week' },
              { id: 'month', label: 'Month' },
              { id: 'year', label: 'Year' },
            ]}
            activeId={timeRange}
            onSelect={(id) => setTimeRange(id)}
          />
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full text-xs"
            onClick={() => setShowGraceModal(true)}
          >
            Grace Policy
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="rounded-full text-xs flex items-center gap-1.5"
            onClick={() => setShowAddPlanDrawer(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Plan</span>
          </Button>
        </div>
      </div>

      {/* Top 4 Hero Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="text-3xl font-light tracking-tight text-[var(--color-text)]">
            {summary.totalCollectedFormatted}
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Collected in November</div>
          <div className="text-[11px] text-[var(--color-success)] font-medium mt-1">
            +{summary.growthVsLastMonthPercent}% vs October
          </div>
        </Card>

        <Card className="p-4 border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="text-3xl font-light tracking-tight text-[var(--color-text)]">
            {summary.activeSubscriptionsCount}
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Active subscriptions</div>
        </Card>

        <Card className="p-4 border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="text-3xl font-light tracking-tight text-[var(--color-warning)]">
            {summary.gracePeriodCount}
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">In grace period</div>
        </Card>

        <Card className="p-4 border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="text-3xl font-light tracking-tight text-[var(--color-danger)]">
            {summary.unknownEventsCount}
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Unknown webhook event</div>
        </Card>
      </div>

      {/* 2-Column: Needs Action & Revenue by Product */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Needs Action Card */}
        <Card className="p-5 space-y-4 border-[var(--color-border)] bg-[var(--color-surface)]">
          <h3 className="font-semibold text-sm text-[var(--color-text)]">Needs action</h3>

          {/* Unknown Event Alert Box */}
          {summary.needsAction.unknownEvent && (
            <div className="p-4 rounded-[var(--radius-row)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--color-danger)] bg-[var(--color-danger)]/15 border border-[var(--color-danger)]/40 px-2 py-0.5 rounded-full">
                  Unknown event
                </span>
                <span className="text-[var(--color-text-muted)] font-mono">{summary.needsAction.unknownEvent.receivedAt}</span>
              </div>
              <p className="text-xs text-[var(--color-text)] leading-relaxed">
                Razorpay sent <code className="text-[var(--color-danger)] font-semibold font-mono">{summary.needsAction.unknownEvent.eventType}</code>. We store it and change nothing until you decide.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-full bg-[var(--color-surface)] text-[var(--color-text)] text-xs"
                  onClick={() => setShowWebhookModal(true)}
                >
                  Review payload
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => summary.needsAction.unknownEvent && handleResolveUnknownEvent(summary.needsAction.unknownEvent.id)}
                >
                  Mark handled
                </Button>
              </div>
            </div>
          )}

          {/* Grace Period Rows */}
          <div className="space-y-2">
            {summary.needsAction.graceSubscriptions.map((sub) => (
              <div
                key={sub.id}
                className="p-3 rounded-[var(--radius-row)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-warning)]" />
                  <div>
                    <div className="font-medium text-xs text-[var(--color-text)]">{sub.tenantName}</div>
                    <div className="text-[11px] text-[var(--color-text-muted)]">
                      Grace · {sub.daysRemaining} days left · ₹{(sub.amountMinor / 100).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-full text-xs"
                    disabled={remindingSubId === sub.id}
                    onClick={() => handleSendReminder(sub.id)}
                  >
                    {remindingSubId === sub.id ? 'Sending…' : 'Send reminder'}
                  </Button>
                  <DangerousAction
                    trigger={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full text-xs text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
                      >
                        Cancel
                      </Button>
                    }
                    title="Cancel Commercial Subscription"
                    description={`Cancelling subscription ${sub.id} immediately revokes auto-renewal and initiates tenant suspension procedures.`}
                    expectedConfirmationText="CANCEL_SUBSCRIPTION"
                    requireReason={true}
                    onStepUpAuth={requestStepUpAuth}
                    confirmButtonLabel="Cancel Subscription"
                    onConfirm={(payload) => handleExecuteCancelSubscription(sub.id, payload.reason || '')}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Revenue by Product Card */}
        <Card className="p-5 space-y-4 border-[var(--color-border)] bg-[var(--color-surface)]">
          <h3 className="font-semibold text-sm text-[var(--color-text)]">Revenue by product</h3>

          <div className="space-y-4 pt-1">
            {summary.revenueByProduct.map((prod) => (
              <div key={prod.productId}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[var(--color-text)] font-medium">{prod.productName}</span>
                  <span className="font-semibold text-[var(--color-text)]">{prod.amountFormatted}</span>
                </div>
                <ProgressBar
                  value={prod.percentage}
                  max={100}
                  size="sm"
                  variant={prod.productId === 'hms' ? 'primary' : 'success'}
                  ariaLabel={`Revenue for ${prod.productName}`}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Invoices & Payments DataTable Card */}
      <Card className="p-5 space-y-4 border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-[var(--color-text)]">Payments & Invoices</h3>
            <Badge variant="outline" className="text-[10px] font-mono border-[var(--color-border)] text-[var(--color-text-muted)] px-2 py-0.5 rounded-full">
              {invoices.length} entries
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                aria-label="Search payment, tenant or organization"
                placeholder="Search payment or org"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pl-8 pr-3 py-1.5 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-colors w-48 sm:w-64"
              />
            </div>

            <div className="flex rounded-full bg-[var(--color-surface-raised)] p-0.5 border border-[var(--color-border)] text-xs">
              {['ALL', 'CAPTURED', 'FAILED', 'PENDING'].map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setStatusFilter(st);
                  }}
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
                const csvHeader = 'Invoice ID,Payment ID,Organization,Tenant,Method,Status,Amount,Date\n';
                const rows = invoices
                  .map(
                    (i) =>
                      `"${i.id}","${i.paymentId}","${i.organizationName}","${i.tenantName}","${i.paymentMethod}","${i.status}","₹${(i.amountMinor / 100).toLocaleString('en-IN')}","${i.createdAt}"`
                  )
                  .join('\n');
                const blob = new Blob([csvHeader + rows], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `orbitox-invoices-${Date.now()}.csv`;
                a.click();
              }}
            >
              Export CSV
            </Button>
          </div>
        </div>

        {/* Invoice Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                <th className="py-2.5 px-3 font-medium uppercase tracking-wider text-[11px]">Payment</th>
                <th className="py-2.5 px-3 font-medium uppercase tracking-wider text-[11px]">Organization</th>
                <th className="py-2.5 px-3 font-medium uppercase tracking-wider text-[11px]">Method</th>
                <th className="py-2.5 px-3 font-medium uppercase tracking-wider text-[11px]">Status</th>
                <th className="py-2.5 px-3 font-medium uppercase tracking-wider text-[11px]">Date</th>
                <th className="py-2.5 px-3 font-medium uppercase tracking-wider text-[11px] text-right">Amount</th>
                <th className="py-2.5 px-3 font-medium uppercase tracking-wider text-[11px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {invoices.length > 0 ? (
                invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-[var(--color-surface-raised)]/60 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedInvoice(inv);
                      setShowDetailDrawer(true);
                    }}
                  >
                    <td className="py-3 px-3 font-mono text-[11px] font-semibold text-[var(--color-text)]">
                      {inv.paymentId}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-[var(--color-text)]">{inv.organizationName}</div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">{inv.tenantName}</div>
                    </td>
                    <td className="py-3 px-3 text-[var(--color-text-muted)]">{inv.paymentMethod}</td>
                    <td className="py-3 px-3">
                      {inv.status === 'CAPTURED' && (
                        <span className="text-[10px] text-[var(--color-success)] bg-[var(--color-success)]/15 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Captured
                        </span>
                      )}
                      {inv.status === 'FAILED' && (
                        <span className="text-[10px] text-[var(--color-danger)] bg-[var(--color-danger)]/15 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> Failed {inv.failureReason ? `· ${inv.failureReason}` : ''}
                        </span>
                      )}
                      {inv.status === 'PENDING' && (
                        <span className="text-[10px] text-[var(--color-warning)] bg-[var(--color-warning)]/15 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[var(--color-text-muted)]">
                      {new Date(inv.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="py-3 px-3 font-semibold text-right text-[var(--color-text)]">
                      ₹{(inv.amountMinor / 100).toLocaleString('en-IN')}
                    </td>
                    <td
                      className="py-3 px-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        {inv.status === 'FAILED' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="rounded-full text-[11px] px-2.5 py-0.5 h-6"
                            disabled={retryingInvoiceId === inv.id}
                            onClick={() => handleRetryPayment(inv)}
                          >
                            {retryingInvoiceId === inv.id ? 'Retrying…' : 'Retry'}
                          </Button>
                        )}
                        {(inv.status === 'FAILED' || inv.status === 'PENDING') && (
                          <DangerousAction
                            trigger={
                              <Button
                                variant="secondary"
                                size="sm"
                                className="rounded-full text-[11px] px-2.5 py-0.5 h-6 text-[var(--color-success)]"
                              >
                                Mark Paid
                              </Button>
                            }
                            title="Mark Invoice as Paid"
                            description={`Manually recording payment for invoice ${inv.id} (₹${(inv.amountMinor / 100).toLocaleString('en-IN')}). This action bypasses gateway settlement and will be permanently recorded in the audit trail.`}
                            expectedConfirmationText="MARK_PAID"
                            requireReason={true}
                            onStepUpAuth={requestStepUpAuth}
                            confirmButtonLabel="Mark as Paid"
                            onConfirm={(payload) => handleExecuteMarkPaid(inv.id, payload.reason || '')}
                          />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-full text-[11px] px-2 py-0.5 h-6 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                          aria-label={`View details for invoice ${inv.id}`}
                          title={`View details for invoice ${inv.id}`}
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setShowDetailDrawer(true);
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
                    No matching billing invoices or payments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invoice Detail Sheet (Slide-in Drawer) */}
      <Sheet open={showDetailDrawer} onOpenChange={setShowDetailDrawer}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {selectedInvoice && (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle className="text-base font-bold text-[var(--color-text)]">
                  Invoice {selectedInvoice.id}
                </SheetTitle>
              </SheetHeader>

              <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
                <div>
                  <div className="text-xs text-[var(--color-text-muted)]">Transaction Reference</div>
                  <div className="font-mono text-sm font-bold text-[var(--color-text)]">{selectedInvoice.paymentId}</div>
                </div>
                <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 rounded-full border-[var(--color-border)]">
                  {selectedInvoice.status}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--color-text-muted)]">Organization</span>
                  <span className="font-medium text-[var(--color-text)]">{selectedInvoice.organizationName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--color-text-muted)]">Tenant Workspace</span>
                  <span className="font-medium text-[var(--color-text)]">{selectedInvoice.tenantName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--color-text-muted)]">Payment Gateway</span>
                  <span className="font-mono text-[var(--color-text)]">Razorpay Smart Routing</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--color-text-muted)]">Method</span>
                  <span className="text-[var(--color-text)]">{selectedInvoice.paymentMethod}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--color-text-muted)]">Date & Time</span>
                  <span className="text-[var(--color-text)]">{new Date(selectedInvoice.createdAt).toLocaleString('en-IN')}</span>
                </div>
                {selectedInvoice.failureReason && (
                  <div className="flex justify-between text-xs text-[var(--color-danger)]">
                    <span>Gateway Error</span>
                    <span className="font-mono">{selectedInvoice.failureReason}</span>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-[var(--radius-row)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] space-y-2">
                <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                  <span>Base Subscription Fee</span>
                  <span>₹{((selectedInvoice.amountMinor * 100) / 118 / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                  <span>Integrated GST (18%)</span>
                  <span>₹{((selectedInvoice.amountMinor * 18) / 118 / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[var(--color-text)] pt-2 border-t border-[var(--color-border)]">
                  <span>Total Amount Charged</span>
                  <span>₹{(selectedInvoice.amountMinor / 100).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-4">
                {selectedInvoice.status === 'FAILED' && (
                  <Button
                    variant="primary"
                    size="default"
                    className="rounded-full w-full"
                    disabled={retryingInvoiceId === selectedInvoice.id}
                    onClick={() => handleRetryPayment(selectedInvoice)}
                  >
                    {retryingInvoiceId === selectedInvoice.id ? 'Retrying…' : 'Retry Payment via Gateway'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Plan Sheet */}
      <Sheet open={showAddPlanDrawer} onOpenChange={setShowAddPlanDrawer}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base font-bold text-[var(--color-text)]">
              Add Plan to Catalogue
            </SheetTitle>
          </SheetHeader>

          <form onSubmit={handleCreatePlan} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-text)]">Plan Identifier</label>
              <input
                type="text"
                required
                placeholder="plan_restaurant_growth"
                value={newPlan.planId}
                onChange={(e) => setNewPlan({ ...newPlan, planId: e.target.value })}
                className="w-full px-3 py-2 rounded-[var(--radius-row)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-xs font-mono text-[var(--color-text)] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-text)]">Display Name</label>
              <input
                type="text"
                required
                placeholder="RestaurantOS Growth Plan"
                value={newPlan.name}
                onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                className="w-full px-3 py-2 rounded-[var(--radius-row)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-xs text-[var(--color-text)] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-text)]">Product Plugin</label>
              <select
                value={newPlan.pluginId}
                onChange={(e) => setNewPlan({ ...newPlan, pluginId: e.target.value })}
                className="w-full px-3 py-2 rounded-[var(--radius-row)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-xs text-[var(--color-text)] focus:outline-none"
              >
                <option value="@orbitox/restaurant">RestaurantOS (@orbitox/restaurant)</option>
                <option value="@orbitox/hms">HospitalOS (@orbitox/hms)</option>
                <option value="@orbitox-io/plugin-engine">Platform Core Engine</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text)]">Price (INR)</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={newPlan.priceMinor / 100}
                  onChange={(e) => setNewPlan({ ...newPlan, priceMinor: Number(e.target.value) * 100 })}
                  className="w-full px-3 py-2 rounded-[var(--radius-row)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-xs font-mono text-[var(--color-text)] focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text)]">Billing Interval</label>
                <select
                  value={newPlan.interval}
                  onChange={(e) => setNewPlan({ ...newPlan, interval: e.target.value })}
                  className="w-full px-3 py-2 rounded-[var(--radius-row)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-xs text-[var(--color-text)] focus:outline-none"
                >
                  <option value="month">Monthly</option>
                  <option value="year">Annual</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-text)]">Grace Period (Days)</label>
              <input
                type="number"
                min={1}
                value={newPlan.gracePeriodDays}
                onChange={(e) => setNewPlan({ ...newPlan, gracePeriodDays: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-[var(--radius-row)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-xs font-mono text-[var(--color-text)] focus:outline-none"
              />
            </div>

            <div className="pt-4 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-full"
                onClick={() => setShowAddPlanDrawer(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={submittingPlan}
                className="rounded-full"
              >
                {submittingPlan ? 'Creating Plan…' : 'Save Plan to Database'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Grace Policy Modal (Dialog) */}
      <Dialog open={showGraceModal} onOpenChange={setShowGraceModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[var(--color-text)]">
              Configure Plan Grace Period Policy
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveGracePolicy} className="space-y-4 pt-2">
            <p className="text-xs text-[var(--color-text-muted)]">
              Adjust the delinquent grace window before automated suspension hooks are triggered on the tenant runtime.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-text)]">Plan ID</label>
              <input
                type="text"
                required
                value={gracePolicyForm.planId}
                onChange={(e) => setGracePolicyForm({ ...gracePolicyForm, planId: e.target.value })}
                className="w-full px-3 py-2 rounded-[var(--radius-row)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-xs font-mono text-[var(--color-text)] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-text)]">Grace Days Allowed</label>
              <input
                type="number"
                min={1}
                max={60}
                required
                value={gracePolicyForm.gracePeriodDays}
                onChange={(e) => setGracePolicyForm({ ...gracePolicyForm, gracePeriodDays: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-[var(--radius-row)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-xs font-mono text-[var(--color-text)] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-text)]">
                Reason for Policy Change (Mandatory, $\ge 5$ chars)
              </label>
              <textarea
                required
                rows={2}
                placeholder="Commercial concession extended for festival season"
                value={gracePolicyForm.reason}
                onChange={(e) => setGracePolicyForm({ ...gracePolicyForm, reason: e.target.value })}
                className="w-full px-3 py-2 rounded-[var(--radius-row)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-xs text-[var(--color-text)] focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-full"
                onClick={() => setShowGraceModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="rounded-full"
                disabled={gracePolicyForm.reason.trim().length < 5}
              >
                Update Policy
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Review Webhook Modal (Dialog) */}
      <Dialog open={showWebhookModal} onOpenChange={setShowWebhookModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[var(--color-text)]">
              Unknown Gateway Webhook Event
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div className="flex justify-between items-center text-[var(--color-text-muted)] pb-2 border-b border-[var(--color-border)]">
              <span>Event ID: <code className="font-mono text-[var(--color-text)]">{summary.needsAction.unknownEvent?.id}</code></span>
              <span>Type: <strong className="text-[var(--color-danger)] font-mono">{summary.needsAction.unknownEvent?.eventType}</strong></span>
            </div>

            <p className="text-[var(--color-text-muted)]">{summary.needsAction.unknownEvent?.reason}</p>

            <div className="p-3 rounded-[var(--radius-row)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] font-mono text-[11px] overflow-x-auto text-[var(--color-text)]">
              <pre>{JSON.stringify({ event: 'subscription.paused', subscription_id: 'sub_masala_03', reason: 'customer_requested' }, null, 2)}</pre>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full"
                onClick={() => setShowWebhookModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Step-Up Re-Authentication Modal */}
      {stepUpDialog}
    </div>
  );
}
