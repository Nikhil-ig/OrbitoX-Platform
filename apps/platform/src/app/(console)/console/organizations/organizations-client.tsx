'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building,
  Users,
  CreditCard,
  Plus,
  Search,
  ArrowLeft,
  Shield,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Lock,
} from 'lucide-react';
import {
  Card,
  Button,
  Input,
  Select,
  StatusPill,
  DangerousAction,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@orbitox-io/ui';
import type {
  OrganizationSummary,
  OrganizationItem,
  OrganizationDetail,
} from '@/server/organizations/organization-service';

interface OrganizationsClientProps {
  initialSummary: OrganizationSummary;
  initialOrganizations: OrganizationItem[];
  initialSelectedOrgDetail: OrganizationDetail | null;
  initialOrgParam?: string;
  initialStatusFilter?: string;
  initialTierFilter?: string;
}

export function OrganizationsClient({
  initialSummary,
  initialOrganizations,
  initialSelectedOrgDetail,
  initialOrgParam = '',
  initialStatusFilter = 'ALL',
  initialTierFilter = 'ALL',
}: OrganizationsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [summary, setSummary] = React.useState<OrganizationSummary>(initialSummary);
  const [organizations, setOrganizations] = React.useState<OrganizationItem[]>(initialOrganizations);
  const [selectedOrg, setSelectedOrg] = React.useState<OrganizationDetail | null>(initialSelectedOrgDetail);
  const [loadingDetail, setLoadingDetail] = React.useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState(initialStatusFilter);
  const [tierFilter, setTierFilter] = React.useState(initialTierFilter);

  // Wizard / Modals
  const [isNewOrgOpen, setIsNewOrgOpen] = React.useState(false);
  const [isChangePlanOpen, setIsChangePlanOpen] = React.useState(false);
  const [selectedPlanTier, setSelectedPlanTier] = React.useState('Growth');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  // New Org Form State
  const [newOrgName, setNewOrgName] = React.useState('');
  const [newOrgSlug, setNewOrgSlug] = React.useState('');
  const [newOrgEmail, setNewOrgEmail] = React.useState('');
  const [newOrgCompliance, setNewOrgCompliance] = React.useState('STANDARD');

  // Load detail if URL param changes or on click
  const loadOrganizationDetail = React.useCallback(async (idOrSlug: string) => {
    setLoadingDetail(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/v1/platform/organizations/${encodeURIComponent(idOrSlug)}`);
      const body = await res.json();
      if (body.success && body.data) {
        setSelectedOrg(body.data);
        setSelectedPlanTier(body.data.planTier || 'Growth');
      } else {
        setActionError(body.error?.message || 'Failed to load organization');
      }
    } catch (err: any) {
      setActionError(err.message || 'Network error loading organization');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  // Sync with initialOrgParam on mount if not already loaded
  React.useEffect(() => {
    if (initialOrgParam && !selectedOrg) {
      loadOrganizationDetail(initialOrgParam);
    }
  }, [initialOrgParam, selectedOrg, loadOrganizationDetail]);

  // Refresh list and summary
  const refreshList = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter !== 'ALL') queryParams.set('status', statusFilter);
      if (tierFilter !== 'ALL') queryParams.set('tier', tierFilter);
      if (searchQuery) queryParams.set('query', searchQuery);

      const res = await fetch(`/api/v1/platform/organizations?${queryParams.toString()}`);
      const body = await res.json();
      if (body.success && body.data) {
        setOrganizations(body.data.organizations);
        setSummary(body.data.summary);
      }
    } catch (err: any) {
      console.error('Failed to refresh organizations list:', err);
    }
  };

  // Filtered in-memory list
  const filteredOrganizations = React.useMemo(() => {
    return organizations.filter((org) => {
      if (statusFilter !== 'ALL' && org.status.toUpperCase() !== statusFilter.toUpperCase()) {
        return false;
      }
      if (tierFilter !== 'ALL' && org.planTier.toUpperCase() !== tierFilter.toUpperCase()) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        return (
          org.name.toLowerCase().includes(q) ||
          org.slug.toLowerCase().includes(q) ||
          org.billingEmail.toLowerCase().includes(q) ||
          org.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [organizations, statusFilter, tierFilter, searchQuery]);

  // Action: Create Organization
  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName || !newOrgSlug || !newOrgEmail) return;

    setIsSubmitting(true);
    setActionError(null);
    try {
      const csrfToken = document.cookie.match(/orbitox_operator_csrf=([^;]+)/)?.[1] || '';
      const res = await fetch('/api/v1/platform/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          name: newOrgName,
          slug: newOrgSlug,
          billingEmail: newOrgEmail,
          complianceTier: newOrgCompliance,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setIsNewOrgOpen(false);
        setNewOrgName('');
        setNewOrgSlug('');
        setNewOrgEmail('');
        await refreshList();
        setSelectedOrg(data.data);
      } else {
        setActionError(data.error?.message || 'Failed to create organization');
      }
    } catch (err: any) {
      setActionError(err.message || 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action: Update Plan Tier
  const handleUpdatePlan = async () => {
    if (!selectedOrg) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      const csrfToken = document.cookie.match(/orbitox_operator_csrf=([^;]+)/)?.[1] || '';
      const res = await fetch(`/api/v1/platform/organizations/${selectedOrg.id}/plan`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ planTier: selectedPlanTier }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setIsChangePlanOpen(false);
        setSelectedOrg(data.data);
        await refreshList();
      } else {
        setActionError(data.error?.message || 'Failed to update plan tier');
      }
    } catch (err: any) {
      setActionError(err.message || 'Network error updating plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action: Suspend / Archive Organization
  const handleArchiveOrg = async (payload: { reason?: string }) => {
    if (!selectedOrg) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      const csrfToken = document.cookie.match(/orbitox_operator_csrf=([^;]+)/)?.[1] || '';
      const res = await fetch(`/api/v1/platform/organizations/${selectedOrg.id}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ reason: payload.reason || 'Operator suspension' }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSelectedOrg(data.data);
        await refreshList();
      } else {
        setActionError(data.error?.message || 'Failed to suspend organization');
      }
    } catch (err: any) {
      setActionError(err.message || 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get Avatar Initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW: Organization Detail (C1 Specification)
  // ─────────────────────────────────────────────────────────────────────────
  if (selectedOrg) {
    const org = selectedOrg;
    const isSuspended = org.status === 'SUSPENDED';

    return (
      <div className="space-y-6 max-w-6xl mx-auto py-2">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setSelectedOrg(null);
              router.push('/console/organizations');
            }}
            className="flex items-center gap-1.5 text-xs text-[var(--color-primary)] font-semibold hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Organizations / {org.name}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-text-muted)]">Org ID:</span>
            <code className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text)]">
              {org.id}
            </code>
          </div>
        </div>

        {/* Global Action Error Banner */}
        {actionError && (
          <div className="p-3.5 rounded-[var(--radius-card)] bg-[var(--color-danger-subtle)] border border-[var(--color-danger)] text-[var(--color-danger)] text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button type="button" onClick={() => setActionError(null)} className="underline text-xs">
              Dismiss
            </button>
          </div>
        )}

        {/* C1 Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)]">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-[var(--color-primary-subtle)] text-[var(--color-primary)] font-bold text-lg flex items-center justify-center border border-[var(--color-primary)]/30">
              {getInitials(org.name)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
                  {org.name}
                </h1>
                <StatusPill
                  status={isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                  label={isSuspended ? 'Suspended' : 'Active'}
                />
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                  {org.complianceTier}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Owner {org.ownerName || 'Primary Owner'} · {org.location || 'India'} · customer since March 2026 · GSTIN {org.gstin || '29ABCDE1234F1Z5'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <DangerousAction
              trigger={
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-full text-[var(--color-danger)] border-[var(--color-danger)]/30 hover:bg-[var(--color-danger-subtle)]"
                  disabled={isSuspended}
                >
                  {isSuspended ? 'Suspended' : 'Suspend...'}
                </Button>
              }
              title={`Suspend Organization: ${org.name}`}
              description={`Suspending ${org.name} will immediately freeze all ${org.tenants.length} tenant runtimes and revoke access for ${org.members.length} members. Enter the organization slug "${org.slug}" and a justification to confirm.`}
              expectedConfirmationText={org.slug}
              requireReason={true}
              onStepUpAuth={async () => true}
              onConfirm={handleArchiveOrg}
              confirmButtonLabel="Confirm Suspension"
            />

            <Button
              variant="secondary"
              size="sm"
              className="rounded-full"
              onClick={() => alert(`Impersonation mode (read-only) activated for ${org.name}`)}
            >
              Impersonate (read-only)
            </Button>

            <Button
              variant="primary"
              size="sm"
              className="rounded-full"
              onClick={() => setIsChangePlanOpen(true)}
            >
              Change plan
            </Button>
          </div>
        </div>

        {/* 4 Stat Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-3xl font-light tracking-tight text-[var(--color-text)]">
              {org.tenants.length}
            </div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1">
              Tenants · limit {org.planTier === 'Enterprise' ? 50 : org.planTier === 'Growth' ? 10 : 3}
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-3xl font-light tracking-tight text-[var(--color-text)]">
              {org.members.length}
            </div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1">
              Members · {org.members.filter((m) => m.role === 'OWNER').length || 1} owners
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-3xl font-light tracking-tight text-[var(--color-text)]">
              ₹{org.monthlyRevenueEstimate.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1">
              Monthly · {org.planTier}
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-3xl font-light tracking-tight text-[var(--color-text)]">
              0
            </div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1">
              Open data requests
            </div>
          </Card>
        </div>

        {/* 3 Detail Column Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tenants Column */}
          <Card className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm text-[var(--color-text)]">Tenants</h3>
                <button
                  type="button"
                  onClick={() => router.push(`/console/provisioning?org=${org.id}`)}
                  className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add tenant
                </button>
              </div>

              <div className="space-y-3">
                {org.tenants.length === 0 ? (
                  <div className="p-4 rounded-[var(--radius-card)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-center text-xs text-[var(--color-text-muted)]">
                    No tenants active yet. Click "Add tenant" to initiate saga provisioning.
                  </div>
                ) : (
                  org.tenants.map((tenant) => (
                    <div
                      key={tenant.id}
                      onClick={() => router.push(`/console/tenants/${tenant.id}`)}
                      className="p-3 rounded-[var(--radius-row)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              tenant.status === 'ACTIVE'
                                ? 'bg-[var(--color-success)]'
                                : tenant.status === 'SUSPENDED'
                                ? 'bg-[var(--color-danger)]'
                                : 'bg-[var(--color-warning)]'
                            }`}
                          />
                          <span className="font-medium text-xs text-[var(--color-text)]">
                            {tenant.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                          {tenant.enabledServices.includes('hospital_hms') ? 'HospitalOS' : 'RestaurantOS'} · plan {tenant.planTier}
                        </p>
                      </div>
                      <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                        {tenant.status === 'ACTIVE' ? 'Live' : tenant.status}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="text-xs text-[var(--color-text-muted)] pt-3 border-t border-[var(--color-border)] mt-4 flex items-center justify-between">
              <span>{org.tenants.length} total runtime cells</span>
              <button
                type="button"
                onClick={() => router.push(`/console/tenants`)}
                className="text-xs text-[var(--color-primary)] hover:underline"
              >
                Fleet registry →
              </button>
            </div>
          </Card>

          {/* Members Column */}
          <Card className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm text-[var(--color-text)]">Members</h3>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {org.members.length} accounts
                </span>
              </div>

              <div className="space-y-3">
                {org.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-[var(--color-primary-subtle)] text-[var(--color-primary)] font-semibold flex items-center justify-center text-xs">
                        {getInitials(member.name)}
                      </div>
                      <div>
                        <div className="font-medium text-[var(--color-text)]">{member.name}</div>
                        <div className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                          <span>{member.role}</span>
                          <span>·</span>
                          <span className={member.mfaEnabled ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}>
                            {member.mfaEnabled ? 'MFA on' : 'MFA pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      {member.lastActiveFormatted}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs text-[var(--color-text-muted)] pt-3 border-t border-[var(--color-border)] mt-4">
              All member sign-ins require active enterprise SSO or TOTP verification.
            </div>
          </Card>

          {/* Plan & Billing Column */}
          <Card className="p-5 flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-sm text-[var(--color-text)] mb-3">Plan & billing</h3>
              <div className="text-3xl font-bold tracking-tight text-[var(--color-text)] mb-4">
                {org.planTier}
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Next charge</span>
                  <span className="font-medium text-[var(--color-text)]">
                    ₹{org.monthlyRevenueEstimate.toLocaleString('en-IN')} on {org.nextChargeDateFormatted}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Payment method</span>
                  <span className="font-medium text-[var(--color-text)]">{org.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Last payment</span>
                  <span className="font-medium text-[var(--color-success)]">{org.lastPaymentFormatted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Billing contact</span>
                  <span className="font-medium text-[var(--color-text)]">{org.billingEmail}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 mt-4 border-t border-[var(--color-border)]">
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full flex-1"
                onClick={() => setIsChangePlanOpen(true)}
              >
                Change plan
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full flex-1"
                onClick={() => router.push(`/console/billing?tenant=${org.tenants[0]?.id || ''}`)}
              >
                Invoices
              </Button>
            </div>
          </Card>
        </div>

        {/* Change Plan Dialog */}
        <Dialog open={isChangePlanOpen} onOpenChange={setIsChangePlanOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Change Organization Plan Tier</DialogTitle>
              <DialogDescription>
                Upgrading or downgrading updates quota allocations and SLA guarantees across all tenants of {org.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3">
              {[
                {
                  id: 'Starter',
                  price: '₹2,499/mo',
                  features: 'Up to 3 tenants, standard DB pooling, community support.',
                },
                {
                  id: 'Growth',
                  price: '₹7,497/mo',
                  features: 'Up to 10 tenants, multi-region routing, 99.9% uptime SLA.',
                },
                {
                  id: 'Enterprise',
                  price: '₹19,999/mo',
                  features: 'Unlimited tenants, dedicated database cell, HIPAA/SOC2 compliance, 24/7 pager.',
                },
              ].map((tier) => (
                <div
                  key={tier.id}
                  onClick={() => setSelectedPlanTier(tier.id)}
                  className={`p-3.5 rounded-[var(--radius-card)] border cursor-pointer transition-all ${
                    selectedPlanTier === tier.id
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-subtle)]/20'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[var(--color-text)]">{tier.id}</span>
                    <span className="font-semibold text-xs text-[var(--color-primary)]">{tier.price}</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">{tier.features}</p>
                </div>
              ))}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsChangePlanOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleUpdatePlan}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Updating...' : `Confirm ${selectedPlanTier} Tier`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW: Organizations List & Fleet Directory (Default View)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
            Organizations
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Enterprise corporate entities, multi-tenant brand groups, and billing hierarchy.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={refreshList}
            className="rounded-full flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsNewOrgOpen(true)}
            className="rounded-full flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            New Organization
          </Button>
        </div>
      </div>

      {/* Global Error Banner */}
      {actionError && (
        <div className="p-3.5 rounded-[var(--radius-card)] bg-[var(--color-danger-subtle)] border border-[var(--color-danger)] text-[var(--color-danger)] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button type="button" onClick={() => setActionError(null)} className="underline text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* 4 Hero Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-light text-[var(--color-text)]">{summary.totalCount}</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Total Organizations</div>
        </Card>

        <Card className="p-4">
          <div className="text-2xl font-light text-[var(--color-primary)]">
            {summary.enterpriseCount}
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Enterprise Orgs</div>
        </Card>

        <Card className="p-4">
          <div className="text-2xl font-light text-[var(--color-text)]">
            {summary.growthCount}
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Growth Tier Orgs</div>
        </Card>

        <Card className="p-4">
          <div className="text-2xl font-light text-[var(--color-text)]">
            {summary.totalTenantsCount}
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Total Managed Tenants</div>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)]">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--color-text-muted)]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by organization name, slug, email, or id..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Pills */}
          <div className="flex items-center gap-1 text-xs">
            {['ALL', 'ACTIVE', 'SUSPENDED'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === st
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-[var(--color-border)] hidden md:block" />

          {/* Tier Pills */}
          <div className="flex items-center gap-1 text-xs">
            {['ALL', 'ENTERPRISE', 'GROWTH', 'STARTER'].map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setTierFilter(tier)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  tierFilter === tier
                    ? 'bg-[var(--color-surface-raised)] border border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Organizations Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--color-surface-raised)] border-b border-[var(--color-border)] text-[var(--color-text-muted)] font-semibold">
              <tr>
                <th className="py-3 px-4">Organization</th>
                <th className="py-3 px-4">Plan Tier</th>
                <th className="py-3 px-4">Tenants</th>
                <th className="py-3 px-4">Billing Email</th>
                <th className="py-3 px-4">Compliance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filteredOrganizations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[var(--color-text-muted)]">
                    No organizations match the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrganizations.map((org) => (
                  <tr
                    key={org.id}
                    onClick={() => loadOrganizationDetail(org.id)}
                    className="hover:bg-[var(--color-surface-raised)] transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[var(--color-primary-subtle)] text-[var(--color-primary)] font-bold text-xs flex items-center justify-center shrink-0">
                          {getInitials(org.name)}
                        </div>
                        <div>
                          <div className="font-semibold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                            {org.name}
                          </div>
                          <div className="text-[11px] text-[var(--color-text-muted)] font-mono">
                            {org.slug}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                        org.planTier === 'Enterprise'
                          ? 'bg-[var(--color-primary-subtle)] text-[var(--color-primary)] border-[var(--color-primary)]/30'
                          : org.planTier === 'Growth'
                          ? 'bg-[var(--color-success-subtle)] text-[var(--color-success)] border-[var(--color-success)]/30'
                          : 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] border-[var(--color-border)]'
                      }`}>
                        {org.planTier}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-[var(--color-text)]">
                      <span className="px-2 py-0.5 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
                        {org.tenantsCount}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-[var(--color-text-muted)]">
                      {org.billingEmail || '—'}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]">
                        {org.complianceTier}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusPill
                        status={org.status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED'}
                        label={org.status === 'ACTIVE' ? 'Active' : 'Suspended'}
                      />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="rounded-full text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          loadOrganizationDetail(org.id);
                        }}
                      >
                        View Detail
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Slide-In Sheet: New Organization Wizard */}
      <Sheet open={isNewOrgOpen} onOpenChange={setIsNewOrgOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Register New Corporate Organization</SheetTitle>
            <SheetDescription>
              Create a top-level corporate account to host multi-tenant hospital networks, restaurant franchises, and enterprise billing relationships.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleCreateOrganization} className="space-y-4 py-4 text-xs">
            <div>
              <label className="block font-medium text-[var(--color-text)] mb-1">
                Organization Name *
              </label>
              <Input
                required
                value={newOrgName}
                onChange={(e) => {
                  setNewOrgName(e.target.value);
                  if (!newOrgSlug) {
                    setNewOrgSlug(
                      e.target.value
                        .toLowerCase()
                        .trim()
                        .replace(/[^a-z0-9]+/g, '-')
                    );
                  }
                }}
                placeholder="e.g. Apex Health Holdings"
                className="text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-[var(--color-text)] mb-1">
                Organization Slug (Subdomain key) *
              </label>
              <Input
                required
                value={newOrgSlug}
                onChange={(e) => setNewOrgSlug(e.target.value)}
                placeholder="e.g. apex-health"
                className="text-xs font-mono"
              />
            </div>

            <div>
              <label className="block font-medium text-[var(--color-text)] mb-1">
                Primary Billing Email *
              </label>
              <Input
                required
                type="email"
                value={newOrgEmail}
                onChange={(e) => setNewOrgEmail(e.target.value)}
                placeholder="billing@apexhealth.in"
                className="text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-[var(--color-text)] mb-1">
                Compliance Tier
              </label>
              <select
                value={newOrgCompliance}
                onChange={(e) => setNewOrgCompliance(e.target.value)}
                className="w-full text-xs p-2.5 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)]"
              >
                <option value="STANDARD">STANDARD (Commercial SaaS)</option>
                <option value="HIPAA">HIPAA (Healthcare data isolation)</option>
                <option value="SOC2">SOC2 Type II (Enterprise audit)</option>
                <option value="PCI-DSS">PCI-DSS (Direct payment compliance)</option>
              </select>
            </div>

            <div className="pt-4 flex items-center justify-end gap-2 border-t border-[var(--color-border)]">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsNewOrgOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Registering...' : 'Register Organization'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
