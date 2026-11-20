'use client';

import * as React from 'react';
import Link from 'next/link';
import { ConsoleShell } from '../../components/console-shell';
import {
  Card,
  Button,
  OperationalDataTable,
  OperationalStatusBadge,
  FilterToolbar,
  DetailDrawer,
  type ColumnDef,
} from '@orbitox-io/ui';
import { Sliders, Palette, Search, Settings, ShieldCheck, CheckCircle2, Lock } from 'lucide-react';

interface ConfigItem {
  id?: string;
  resourceName?: string;
  targetName?: string;
  resourceType: string;
  configKey?: string;
  key?: string;
  currentValue?: any;
  value?: any;
  editability?: string;
  isEditable?: boolean;
  riskScore?: number;
  description?: string;
}

const CATEGORIES = [
  'ALL',
  'COMPUTE',
  'IDENTITY',
  'COMMERCIAL',
  'NETWORKING',
  'SECURITY',
  'GOVERNANCE',
];

export default function ConsoleSettingsConfigurationPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<ConfigItem[]>([]);
  const [selectedCategory, setSelectedCategory] = React.useState('ALL');
  const [selectedItem, setSelectedItem] = React.useState<ConfigItem | null>(null);

  const executeSearch = React.useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/platform/configuration?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success) {
        setResults(data.data || []);
      }
    } catch (err) {
      console.error('Config search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    executeSearch(searchQuery);
  }, [executeSearch, searchQuery]);

  const filtered = React.useMemo(() => {
    return results.filter((item) => {
      if (selectedCategory === 'ALL') return true;
      if (selectedCategory === 'COMPUTE')
        return ['SERVICE', 'SERVER_NODE', 'SERVICE_DEPLOYMENT', 'REPLICA'].includes(item.resourceType);
      if (selectedCategory === 'IDENTITY')
        return ['ORGANIZATION', 'PROJECT', 'ENVIRONMENT', 'TENANT'].includes(item.resourceType);
      if (selectedCategory === 'COMMERCIAL')
        return ['PLAN', 'SUBSCRIPTION', 'QUOTA_POLICY', 'RATE_LIMIT_POLICY'].includes(item.resourceType);
      if (selectedCategory === 'NETWORKING')
        return ['DOMAIN', 'DNS_RECORD', 'TLS_CERTIFICATE', 'EDGE_ROUTE'].includes(item.resourceType);
      if (selectedCategory === 'SECURITY')
        return ['API_KEY', 'CREDENTIAL', 'SECURITY_FINDING'].includes(item.resourceType);
      return true;
    });
  }, [results, selectedCategory]);

  const columns: ColumnDef<ConfigItem>[] = [
    {
      accessorKey: 'targetName',
      header: 'Target Resource',
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-xs text-[var(--color-text)]">
            {row.original.targetName || row.original.resourceName || row.original.id || 'Resource'}
          </div>
          <div className="text-[11px] font-mono text-[var(--color-text-muted)]">
            {row.original.resourceType}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'configKey',
      header: 'Parameter Key',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-[var(--color-text)]">
          {row.original.configKey || row.original.key || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'currentValue',
      header: 'Desired Value',
      cell: ({ row }) => {
        const val = row.original.currentValue ?? row.original.value;
        const displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '—');
        return (
          <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text)]">
            {displayVal.length > 30 ? `${displayVal.slice(0, 30)}…` : displayVal}
          </span>
        );
      },
    },
    {
      accessorKey: 'editability',
      header: 'Editability & Policy',
      cell: ({ row }) => {
        const isEditable = row.original.isEditable !== false;
        return (
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
            {isEditable ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Editable</span>
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5 text-amber-500" />
                <span>Ceiling Restricted</span>
              </>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'riskScore',
      header: 'Risk Score',
      cell: ({ row }) => {
        const score = row.original.riskScore || 20;
        return (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              score >= 80
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                : score >= 50
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
            }`}
          >
            {score}/100
          </span>
        );
      },
    },
  ];

  return (
    <ConsoleShell activeId="appearance">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Settings Sub-Navigation Tabs */}
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-3">
          <Link
            href="/console/settings/appearance"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            <Palette className="h-3.5 w-3.5" />
            Appearance
          </Link>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text)]">
            <Sliders className="h-3.5 w-3.5 text-[var(--color-primary)]" />
            Platform Configuration
          </div>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text)]">
            Universal Configuration Center
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Search, inspect, and modify configuration parameters across all 35 platform subsystems.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 space-y-1">
            <span className="text-[11px] text-[var(--color-text-muted)]">Searchable Parameters</span>
            <div className="text-2xl font-bold text-[var(--color-text)]">{results.length}</div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              ✓ Real-time indexed from graph
            </span>
          </Card>
          <Card className="p-4 space-y-1">
            <span className="text-[11px] text-[var(--color-text-muted)]">Configurable Subsystems</span>
            <div className="text-2xl font-bold text-[var(--color-primary)]">35 Types</div>
            <span className="text-[11px] text-[var(--color-text-muted)]">Schema-driven editors</span>
          </Card>
          <Card className="p-4 space-y-1">
            <span className="text-[11px] text-[var(--color-text-muted)]">Control Invariant</span>
            <div className="text-sm font-semibold text-[var(--color-text)] mt-1">
              Child Narrowing Policy
            </div>
            <span className="text-[11px] text-[var(--color-text-muted)]">
              Children cannot expand ceilings
            </span>
          </Card>
          <Card className="p-4 space-y-1">
            <span className="text-[11px] text-[var(--color-text-muted)]">Protection Model</span>
            <div className="text-sm font-semibold text-amber-600 dark:text-amber-400 mt-1">
              Four-Eyes Quorum Guard
            </div>
            <span className="text-[11px] text-[var(--color-text-muted)]">
              Risk ≥ 80 requires approval
            </span>
          </Card>
        </div>

        {/* Search & Category Pills */}
        <div className="space-y-3">
          <FilterToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search parameters: replicas, rateLimitRpm, mTLS, quota, region..."
            onResetFilters={() => setSearchQuery('')}
          />

          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* DataTable */}
        <OperationalDataTable
          columns={columns}
          data={filtered}
          totalRows={filtered.length}
          loading={loading}
          emptyTitle="No configuration parameters found"
          emptyDescription="Try adjusting your search query or category filter."
          onRowClick={(row) => setSelectedItem(row)}
        />

        {/* Detail Drawer */}
        <DetailDrawer
          open={Boolean(selectedItem)}
          onOpenChange={(open) => !open && setSelectedItem(null)}
          title={selectedItem?.targetName || selectedItem?.resourceName || 'Parameter Detail'}
          description={selectedItem?.configKey || selectedItem?.key}
          tabs={[
            {
              id: 'overview',
              label: 'Overview',
              content: (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
                      Resource Type
                    </label>
                    <p className="font-mono text-[var(--color-text)]">{selectedItem?.resourceType}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
                      Current Desired Value
                    </label>
                    <pre className="p-3 bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-[var(--radius-card)] font-mono text-[11px] text-[var(--color-text)] overflow-x-auto">
                      {JSON.stringify(selectedItem?.currentValue ?? selectedItem?.value, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
                      Policy & Editability
                    </label>
                    <p className="text-[var(--color-text-muted)] leading-relaxed">
                      {selectedItem?.isEditable !== false
                        ? 'This parameter can be updated through the platform control plane with appropriate operator role privileges.'
                        : 'This parameter is constrained by parent environment ceilings and cannot be escalated without tenant re-provisioning.'}
                    </p>
                  </div>
                </div>
              ),
            },
          ]}
          actions={
            <Button variant="outline" size="sm" onClick={() => setSelectedItem(null)}>
              Close
            </Button>
          }
        />
      </div>
    </ConsoleShell>
  );
}
