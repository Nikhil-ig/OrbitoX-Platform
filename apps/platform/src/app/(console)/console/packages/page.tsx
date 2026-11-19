'use client';

import * as React from 'react';
import { ConsoleShell } from '../components/console-shell';
import {
  OperationalDataTable,
  OperationalStatusBadge,
  FilterToolbar,
  DetailDrawer,
  Button,
  type ColumnDef,
} from '@orbitox-io/ui';
import { Package, ShieldCheck, ExternalLink, Download } from 'lucide-react';

interface PlatformPackage {
  packageId: string;
  name: string;
  version: string;
  tier?: string;
  description?: string;
  signatureVerified?: boolean;
  status?: string;
}

export default function ConsolePackagesPage() {
  const [packages, setPackages] = React.useState<PlatformPackage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [selectedPkg, setSelectedPkg] = React.useState<PlatformPackage | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/v1/platform/packages');
      const json = await res.json();
      const items = Array.isArray(json.data)
        ? json.data
        : Array.isArray(json.data?.packages)
        ? json.data.packages
        : [];
      if (res.ok && json.success) {
        setPackages(items);
      } else {
        setError(json.error?.message || 'Failed to load platform packages from server.');
        setPackages([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Network error fetching platform packages.');
      setPackages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = React.useMemo(() => {
    if (!search) return packages;
    const q = search.toLowerCase();
    return packages.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.packageId.toLowerCase().includes(q)
    );
  }, [packages, search]);

  const columns: ColumnDef<PlatformPackage>[] = [
    {
      accessorKey: 'name',
      header: 'Package Name',
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-xs text-[var(--color-text)]">
            {row.original.name}
          </div>
          <div className="text-[11px] font-mono text-[var(--color-text-muted)]">
            {row.original.packageId}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'version',
      header: 'Version',
      cell: ({ row }) => (
        <span className="font-mono text-xs px-2 py-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text)]">
          {row.original.version}
        </span>
      ),
    },
    {
      accessorKey: 'tier',
      header: 'Tier / Scope',
      cell: ({ row }) => (
        <span className="text-xs text-[var(--color-text-muted)]">
          {row.original.tier || 'Core'}
        </span>
      ),
    },
    {
      accessorKey: 'signatureVerified',
      header: 'Cryptographic Signature',
      cell: ({ row }) => {
        const verified = row.original.signatureVerified === true;
        const integrityStatus = (row.original as any).integrityStatus;
        const hasKey = Boolean(
          (row.original as any).hasEd25519Signature ||
          (row.original as any).signingPublicKeyPem
        );
        return (
          <div
            className={`flex items-center gap-1.5 text-xs ${
              verified
                ? 'text-[var(--color-success)]'
                : hasKey
                ? 'text-[var(--color-warning)]'
                : 'text-[var(--color-text-muted)]'
            }`}
          >
            {verified ? (
              <>
                <ShieldCheck className="h-4 w-4" />
                <span>Ed25519 Verified</span>
              </>
            ) : integrityStatus === 'LEGACY_MANIFEST_ONLY' ? (
              <>
                <Package className="h-4 w-4" />
                <span>Legacy Manifest Only</span>
              </>
            ) : hasKey ? (
              <>
                <Package className="h-4 w-4" />
                <span>Unverified Signature</span>
              </>
            ) : (
              <>
                <Package className="h-4 w-4" />
                <span>Unsigned</span>
              </>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <OperationalStatusBadge status={row.original.status || 'ACTIVE'} />
      ),
    },
  ];

  return (
    <ConsoleShell activeId="packages">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text)]">
              Packages & Plugin Engine
            </h1>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Registered platform packages, npm scopes, and cryptographic Ed25519 integrity proofs.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-[var(--radius-row)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-[var(--color-danger)] shrink-0" />
              <div>
                <div className="text-xs font-semibold text-[var(--color-danger)]">Failed to load packages</div>
                <div className="text-[11px] text-[var(--color-text-muted)]">{error}</div>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={loadData}>
              Retry
            </Button>
          </div>
        )}

        <FilterToolbar
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search packages by name or scope..."
          onResetFilters={() => setSearch('')}
        />

        <OperationalDataTable
          columns={columns}
          data={filtered}
          totalRows={filtered.length}
          loading={loading}
          emptyTitle="No packages catalogued"
          emptyDescription="There are currently no platform packages registered in the system."
          onRowClick={(row) => setSelectedPkg(row)}
        />

        {/* Package Detail Drawer */}
        <DetailDrawer
          open={Boolean(selectedPkg)}
          onOpenChange={(open) => !open && setSelectedPkg(null)}
          title={selectedPkg?.name || 'Package Detail'}
          description={selectedPkg?.packageId}
          badge={<OperationalStatusBadge status={selectedPkg?.status || 'ACTIVE'} />}
          tabs={[
            {
              id: 'overview',
              label: 'Overview',
              content: (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
                      Description
                    </label>
                    <p className="text-[var(--color-text)] leading-relaxed">
                      {selectedPkg?.description || 'Core platform system module.'}
                    </p>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
                      Version & Integrity
                    </label>
                    <p className="font-mono text-[var(--color-text)]">
                      {selectedPkg?.version} · Signed with Ed25519 Primary Authority Key
                    </p>
                  </div>
                </div>
              ),
            },
          ]}
          actions={
            <Button variant="outline" size="sm" onClick={() => setSelectedPkg(null)}>
              Close
            </Button>
          }
        />
      </div>
    </ConsoleShell>
  );
}
