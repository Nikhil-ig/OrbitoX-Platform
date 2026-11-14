'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  Database,
  KeyRound,
  Globe,
  Puzzle,
  Activity,
  History,
  CheckCircle2,
  Clock,
  ExternalLink,
  Plus,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  DangerousAction,
  Input,
  ProgressBar,
  useToast,
} from '@orbitox-io/ui';
import type { TenantDetail } from '@/server/tenants/tenants-service';

export interface TenantDetailClientProps {
  initialTenant: TenantDetail;
}

export function TenantDetailClient({ initialTenant }: TenantDetailClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [tenant, setTenant] = React.useState<TenantDetail>(initialTenant);
  const [activeTab, setActiveTab] = React.useState<'overview' | 'domains' | 'plugins' | 'quotas' | 'audit'>('overview');
  const [isActionLoading, setIsActionLoading] = React.useState(false);
  const [newDomain, setNewDomain] = React.useState('');
  const [isUpdatingDomain, setIsUpdatingDomain] = React.useState(false);

  const getCsrfToken = () => {
    if (typeof document === 'undefined') return undefined;
    return (
      document.cookie.split('; ').find((row) => row.startsWith('orbitox_operator_csrf='))?.split('=')[1] ||
      document.cookie.split('; ').find((row) => row.startsWith('orbitox_customer_csrf='))?.split('=')[1]
    );
  };

  const handleSuspend = async ({ reason }: { reason?: string }) => {
    try {
      setIsActionLoading(true);
      const csrfToken = getCsrfToken();
      const res = await fetch(`/api/v1/platform/tenants/${tenant.id}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify({ reason: reason || 'Operator administrative suspension' }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setTenant((prev) => ({
          ...prev,
          status: 'SUSPENDED',
          recentAuditEvents: [
            {
              id: `aud_${Date.now()}`,
              action: 'TENANT_SUSPENDED',
              actorEmail: 'operator@orbitox.io',
              occurredAt: new Date().toISOString(),
              reason: reason || 'Operator administrative suspension',
            },
            ...prev.recentAuditEvents,
          ],
        }));
        toast({
          title: 'Tenant suspended',
          description: `Tenant ${tenant.name} is now suspended. External API requests will fail with 402.`,
          variant: 'error',
        });
      } else {
        toast({
          title: 'Suspension failed',
          description: json.error?.message || 'Could not suspend tenant.',
          variant: 'error',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Network request failed',
        variant: 'error',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResume = async () => {
    try {
      setIsActionLoading(true);
      const csrfToken = getCsrfToken();
      const res = await fetch(`/api/v1/platform/tenants/${tenant.id}/resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify({ reason: 'Operator manual reactivation' }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setTenant((prev) => ({
          ...prev,
          status: 'ACTIVE',
          recentAuditEvents: [
            {
              id: `aud_${Date.now()}`,
              action: 'TENANT_RESUMED',
              actorEmail: 'operator@orbitox.io',
              occurredAt: new Date().toISOString(),
              reason: 'Operator manual reactivation',
            },
            ...prev.recentAuditEvents,
          ],
        }));
        toast({
          title: 'Tenant reactivated',
          description: `Tenant ${tenant.name} services have been successfully restored.`,
        });
      } else {
        toast({
          title: 'Reactivation failed',
          description: json.error?.message || 'Could not resume tenant.',
          variant: 'error',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Network request failed',
        variant: 'error',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdateDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;

    try {
      setIsUpdatingDomain(true);
      const csrfToken = getCsrfToken();
      const res = await fetch(`/api/v1/platform/tenants/${tenant.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify({ customDomain: newDomain.trim() }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setTenant((prev) => ({
          ...prev,
          customDomain: newDomain.trim(),
          domains: [
            {
              domain: newDomain.trim(),
              isApex: false,
              status: 'VERIFIED',
              tlsStatus: 'ACTIVE',
              configuredAt: new Date().toISOString(),
            },
            ...prev.domains,
          ],
        }));
        setNewDomain('');
        toast({
          title: 'Domain updated',
          description: `Custom domain configured to ${newDomain.trim()}`,
        });
      } else {
        toast({
          title: 'Update failed',
          description: json.error?.message || 'Could not update domain.',
          variant: 'error',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Network error',
        variant: 'error',
      });
    } finally {
      setIsUpdatingDomain(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Back button */}
      <div>
        <Link
          href="/console/tenants"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Tenant Registry</span>
        </Link>
      </div>

      {/* Screen C2 Header: Tenant Detail + Suspend Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
              {tenant.name}
            </h1>
            <Badge
              variant={
                tenant.status === 'ACTIVE'
                  ? 'default'
                  : tenant.status === 'SUSPENDED'
                  ? 'destructive'
                  : 'outline'
              }
              className="rounded-full text-xs font-semibold uppercase tracking-wider"
            >
              {tenant.status === 'SUSPENDED' ? 'SUSPENDED (402 PAYMENT_REQUIRED)' : tenant.status}
            </Badge>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
            Tenant ID: <span className="font-mono text-[var(--color-text)]">{tenant.id}</span> · Slug:{' '}
            <span className="font-mono text-[var(--color-text)]">{tenant.slug}</span>
            {tenant.customDomain && (
              <>
                {' '}· Custom Domain:{' '}
                <span className="font-mono text-[var(--color-text)]">{tenant.customDomain}</span>
              </>
            )}
          </p>
        </div>

        {/* Dangerous Action Suspend or Resume Button */}
        <div>
          {tenant.status === 'SUSPENDED' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handleResume}
              disabled={isActionLoading}
              className="rounded-full"
            >
              Resume Tenant
            </Button>
          ) : (
            <DangerousAction
              trigger={
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isActionLoading}
                  className="rounded-full"
                >
                  Suspend Tenant
                </Button>
              }
              title="Suspend Tenant Environment"
              description="Suspending this tenant will immediately return 402 PAYMENT_REQUIRED on all external API requests, disable POS write transactions, and revoke operator API tokens. Hospital patient telemetry will fail closed."
              expectedConfirmationText="SUSPEND"
              requireReason
              confirmButtonLabel="Suspend Tenant"
              onConfirm={handleSuspend}
            />
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-[var(--color-border)] pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Topology & Isolation', icon: Database },
          { id: 'domains', label: 'Custom Domains', icon: Globe },
          { id: 'plugins', label: 'Plugins & Add-ons', icon: Puzzle },
          { id: 'quotas', label: 'Quotas & Usage', icon: Activity },
          { id: 'audit', label: 'Audit Trail', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-colors shrink-0 ${
                isActive
                  ? 'bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Topology & Isolation (Showcase C2 Card Spec) */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-base text-[var(--color-text)]">
                Tenant Isolation & Database Topology
              </CardTitle>
              <CardDescription className="text-xs text-[var(--color-text-muted)]">
                Cryptographic boundaries and database row-level security configuration.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-[var(--radius-row)] bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
                  <span className="text-[var(--color-text-muted)] block mb-1">Database Engine</span>
                  <p className="font-semibold text-sm text-[var(--color-text)]">
                    {tenant.topology.databaseEngine}
                  </p>
                </div>
                <div className="p-4 rounded-[var(--radius-row)] bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
                  <span className="text-[var(--color-text-muted)] block mb-1">Cryptographic PHI Ring</span>
                  <p className="font-semibold text-sm text-[var(--color-text)]">
                    {tenant.topology.phiRing} (Key ID: {tenant.topology.phiKeyId})
                  </p>
                </div>
                <div className="p-4 rounded-[var(--radius-row)] bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
                  <span className="text-[var(--color-text-muted)] block mb-1">Isolation Model</span>
                  <p className="font-semibold text-sm text-[var(--color-text)]">
                    {tenant.topology.isolationModel}
                  </p>
                </div>
                <div className="p-4 rounded-[var(--radius-row)] bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
                  <span className="text-[var(--color-text-muted)] block mb-1">Cluster Region</span>
                  <p className="font-semibold text-sm text-[var(--color-text)]">
                    {tenant.topology.region}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-base text-[var(--color-text)]">
                Organization & Account Ownership
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-[var(--color-text-muted)] block mb-1">Organization</span>
                  <p className="font-semibold text-[var(--color-text)]">{tenant.organizationName}</p>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)] block mb-1">Plan Tier</span>
                  <p className="font-semibold text-[var(--color-text)] uppercase">{tenant.planTier}</p>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)] block mb-1">Created At</span>
                  <p className="font-mono text-[var(--color-text)]">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 2: Custom Domains & Routing */}
      {activeTab === 'domains' && (
        <div className="space-y-6">
          <Card className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-base text-[var(--color-text)]">
                Configured Custom Domains
              </CardTitle>
              <CardDescription className="text-xs text-[var(--color-text-muted)]">
                Apex domains and subdomains routing to this tenant cell.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-3">
              {tenant.domains.length === 0 ? (
                <div className="text-xs text-[var(--color-text-muted)] p-4 text-center">
                  No custom domains configured yet. Requests route via platform root wildcard.
                </div>
              ) : (
                tenant.domains.map((dom) => (
                  <div
                    key={dom.domain}
                    className="flex items-center justify-between p-3.5 rounded-[var(--radius-row)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <Globe className="h-4 w-4 text-[var(--color-primary)]" />
                      <div>
                        <div className="font-mono font-medium text-[var(--color-text)]">{dom.domain}</div>
                        <div className="text-[11px] text-[var(--color-text-muted)]">
                          Configured on {new Date(dom.configuredAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="rounded-full text-[11px]">
                        TLS: {dom.tlsStatus}
                      </Badge>
                      <Badge variant="default" className="rounded-full text-[11px]">
                        {dom.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}

              {/* Add Domain Form */}
              <form onSubmit={handleUpdateDomain} className="pt-4 flex items-center gap-3">
                <Input
                  type="text"
                  placeholder="e.g. portal.oasismedical.in"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="rounded-full bg-[var(--color-surface-raised)] border-[var(--color-border)] text-xs text-[var(--color-text)] flex-1"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isUpdatingDomain || !newDomain.trim()}
                  className="rounded-full shrink-0"
                >
                  Configure Domain
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 3: Installed Plugins */}
      {activeTab === 'plugins' && (
        <Card className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base text-[var(--color-text)]">
              Installed Plugins & Package Extensions
            </CardTitle>
            <CardDescription className="text-xs text-[var(--color-text-muted)]">
              Active extensions managed via @orbitox-io/plugin-engine v1.4.0.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 space-y-3">
            {tenant.plugins.length === 0 ? (
              <div className="text-xs text-[var(--color-text-muted)] p-4 text-center">
                No external plugins installed for this tenant.
              </div>
            ) : (
              tenant.plugins.map((plugin) => (
                <div
                  key={plugin.id}
                  className="flex items-center justify-between p-3.5 rounded-[var(--radius-row)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <Puzzle className="h-4 w-4 text-[var(--color-primary)]" />
                    <div>
                      <div className="font-mono font-medium text-[var(--color-text)]">
                        {plugin.pluginId}
                      </div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">
                        Runtime Scope: {plugin.runtimeTenantId} · v{plugin.version}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={plugin.status === 'ACTIVE' ? 'default' : 'destructive'}
                    className="rounded-full text-[11px]"
                  >
                    {plugin.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 4: Quotas & Resource Usage */}
      {activeTab === 'quotas' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Card className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-base text-[var(--color-text)]">Monthly API Calls</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-2">
              <div className="text-2xl font-bold text-[var(--color-text)]">
                {tenant.quotas.monthlyApiCalls.toLocaleString()}
                <span className="text-xs font-normal text-[var(--color-text-muted)] ml-2">
                  / {tenant.quotas.apiCallQuota.toLocaleString()} limit
                </span>
              </div>
              <ProgressBar value={tenant.quotas.usagePercent} max={100} variant="primary" />
              <p className="text-xs text-[var(--color-text-muted)]">
                Usage: {tenant.quotas.usagePercent}% of monthly allowance
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-base text-[var(--color-text)]">Rate Limiting & Storage</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[var(--color-text-muted)]">Rate Limit</span>
                <span className="font-semibold text-[var(--color-text)]">
                  {tenant.quotas.rateLimitPerMin} req / min
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--color-text-muted)]">Storage Quota</span>
                <span className="font-semibold text-[var(--color-text)]">
                  {tenant.quotas.storageUsedGb} GB / {tenant.quotas.storageQuotaGb} GB
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 5: Audit History */}
      {activeTab === 'audit' && (
        <Card className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base text-[var(--color-text)]">
              Tenant Audit Trail
            </CardTitle>
            <CardDescription className="text-xs text-[var(--color-text-muted)]">
              Append-only tamper-evident compliance audit trail for this tenant.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 space-y-3">
            {tenant.recentAuditEvents.length === 0 ? (
              <div className="text-xs text-[var(--color-text-muted)] p-4 text-center">
                No audit events recorded yet.
              </div>
            ) : (
              tenant.recentAuditEvents.map((aud) => (
                <div
                  key={aud.id}
                  className="flex items-center justify-between p-3 rounded-[var(--radius-row)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-xs"
                >
                  <div>
                    <div className="font-semibold text-[var(--color-text)]">{aud.action}</div>
                    <div className="text-[11px] text-[var(--color-text-muted)]">
                      By {aud.actorEmail} · {aud.reason || 'No additional details'}
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-[var(--color-text-muted)]">
                    {new Date(aud.occurredAt).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
