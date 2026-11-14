'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Plus, ExternalLink, ShieldCheck, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Input,
} from '@orbitox-io/ui';
import type { TenantListResult, TenantSummary } from '@/server/tenants/tenants-service';

export interface TenantsIndexClientProps {
  initialData: TenantListResult;
}

export function TenantsIndexClient({ initialData }: TenantsIndexClientProps) {
  const router = useRouter();
  const [data, setData] = React.useState<TenantListResult>(initialData);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [pluginFilter, setPluginFilter] = React.useState<'ALL' | 'pos' | 'crm' | 'hospital'>('ALL');
  const [loading, setLoading] = React.useState(false);

  const fetchTenants = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (pluginFilter !== 'ALL') params.set('plugin', pluginFilter);

      const res = await fetch(`/api/v1/platform/tenants?${params.toString()}`);
      const json = await res.json();
      if (json?.success && json.data) {
        setData(json.data);
      }
    } catch {
      // Keep existing data on background error
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, pluginFilter]);

  // Debounced search trigger
  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchTenants();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter, pluginFilter, fetchTenants]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
            🪐 Tenant Fleet Registry
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Multi-tenant environments, custom domains, and cryptographic cell isolation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchTenants}
            disabled={loading}
            className="rounded-full flex items-center gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push('/platform/tenants/new')}
            className="rounded-full flex items-center gap-2"
          >
            <Plus className="h-3.5 w-3.5" />
            Launch Provisioning Wizard
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)] pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by tenant name, slug, custom domain, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-full bg-[var(--color-surface-raised)] border-[var(--color-border)] text-sm text-[var(--color-text)]"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] shrink-0">
            {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-[var(--color-primary)] text-[var(--color-primary-contrast)] shadow-sm'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {s === 'ALL' ? 'All Status' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Plugin Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] shrink-0">
            {[
              { id: 'ALL', label: 'All Plugins' },
              { id: 'pos', label: 'POS' },
              { id: 'crm', label: 'CRM' },
              { id: 'hospital', label: 'HospitalOS' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPluginFilter(p.id as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  pluginFilter === p.id
                    ? 'bg-[var(--color-primary)] text-[var(--color-primary-contrast)] shadow-sm'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Tenant Fleet Grid / List */}
      <div className="space-y-3">
        {data.items.length === 0 ? (
          <Card className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
            <Layers className="h-10 w-10 mx-auto text-[var(--color-text-muted)] mb-3" />
            <h3 className="text-base font-semibold text-[var(--color-text)]">No tenants found</h3>
            <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-sm mx-auto">
              No tenant matches the current search query or filter parameters.
            </p>
            <div className="mt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('ALL');
                  setPluginFilter('ALL');
                }}
                className="rounded-full"
              >
                Clear all filters
              </Button>
            </div>
          </Card>
        ) : (
          data.items.map((tenant) => (
            <Card
              key={tenant.id}
              className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 hover:border-[var(--color-border-hover)] transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <Link
                      href={`/console/tenants/${tenant.id}`}
                      className="text-base font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors"
                    >
                      {tenant.name}
                    </Link>
                    <Badge
                      variant={
                        tenant.status === 'ACTIVE'
                          ? 'default'
                          : tenant.status === 'SUSPENDED'
                          ? 'destructive'
                          : 'outline'
                      }
                      className="rounded-full text-[11px] uppercase tracking-wider"
                    >
                      {tenant.status}
                    </Badge>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                      {tenant.planTier.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)] flex-wrap">
                    <span>
                      Slug: <span className="font-mono text-[var(--color-text)]">{tenant.slug}</span>
                    </span>
                    <span>·</span>
                    <span>
                      ID: <span className="font-mono text-[var(--color-text)]">{tenant.id}</span>
                    </span>
                    {tenant.customDomain && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1 font-mono text-[var(--color-text)]">
                          <ShieldCheck className="h-3 w-3 text-[var(--color-success)]" />
                          {tenant.customDomain}
                        </span>
                      </>
                    )}
                  </div>

                  {tenant.installedPlugins.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                      <span className="text-[11px] text-[var(--color-text-muted)]">Plugins:</span>
                      {tenant.installedPlugins.map((plugin) => (
                        <span
                          key={plugin}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] font-mono"
                        >
                          {plugin}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs text-[var(--color-text-muted)]">Monthly API Calls</div>
                    <div className="text-sm font-semibold text-[var(--color-text)]">
                      {tenant.monthlyApiCalls.toLocaleString()} / {tenant.apiCallQuota.toLocaleString()}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/console/tenants/${tenant.id}`)}
                    className="rounded-full flex items-center gap-1.5"
                  >
                    <span>Manage</span>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Pagination Footer */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] pt-2">
          <span>
            Showing {data.items.length} of {data.total} tenants
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={data.page <= 1}
              onClick={() => {}}
              className="rounded-full text-xs"
            >
              Previous
            </Button>
            <span>
              Page {data.page} of {data.totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={data.page >= data.totalPages}
              onClick={() => {}}
              className="rounded-full text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
