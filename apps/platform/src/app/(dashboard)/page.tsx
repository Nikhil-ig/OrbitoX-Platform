'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  UtensilsCrossed,
  ChefHat,
  QrCode,
  TrendingUp,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
  RefreshCw,
  Search,
  Receipt,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
} from '@orbitox-io/ui';

interface TableState {
  id: string;
  tableNumber: string;
  seats: number;
  floor: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'BILLING';
  dinerCount?: number;
  billAmount?: number;
  durationMinutes?: number;
  activeItems?: Array<{ name: string; qty: number }>;
}

export default function CustomerDashboardPage() {
  const [tables, setTables] = React.useState<TableState[]>([]);
  const [selectedFloor, setSelectedFloor] = React.useState<string>('ALL');
  const [selectedTable, setSelectedTable] = React.useState<TableState | null>(null);
  const [restaurantName, setRestaurantName] = React.useState('Restaurant Operating Center');
  const [restaurantCity, setRestaurantCity] = React.useState('Bengaluru');
  const [activeSlug, setActiveSlug] = React.useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const [isSettling, setIsSettling] = React.useState(false);
  const [settlementError, setSettlementError] = React.useState<string | null>(null);

  // Authoritative data loading from customer session and restaurant runtime
  const loadAuthoritativeState = React.useCallback(async () => {
    try {
      const meRes = await fetch('/api/v1/customer/auth/me');
      if (!meRes.ok) {
        setHasLoaded(true);
        return;
      }
      const meData = await meRes.json();
      const primaryOrgId = meData.memberships?.[0]?.organizationId;
      if (!primaryOrgId) {
        setHasLoaded(true);
        return;
      }

      const tenantsRes = await fetch(`/api/v1/customer/organizations/${encodeURIComponent(primaryOrgId)}/tenants`);
      if (!tenantsRes.ok) {
        setHasLoaded(true);
        return;
      }
      const tenantsData = await tenantsRes.json();
      const firstProject = tenantsData.projects?.[0];
      if (!firstProject) {
        setHasLoaded(true);
        return;
      }

      setRestaurantName(firstProject.name || 'My Restaurant');
      setActiveSlug(firstProject.slug);

      // 1. Fetch live table fleet from RestaurantOS runtime
      const tablesRes = await fetch(`/api/v1/customer/tenants/${encodeURIComponent(firstProject.slug)}/tables`);
      if (tablesRes.ok) {
        const tablesData = await tablesRes.json();
        if (Array.isArray(tablesData.tables) && tablesData.tables.length > 0) {
          const liveTables: TableState[] = tablesData.tables.map((t: any) => ({
            id: String(t.id),
            tableNumber: t.number || `T-${String(t.id).padStart(2, '0')}`,
            seats: t.capacity || 4,
            floor: t.floorId || t.section || 'Main Dining',
            status: t.status === 'OCCUPIED' || t.status === 'BILLING' ? t.status : 'AVAILABLE',
            dinerCount: t.dinerCount || (t.status === 'OCCUPIED' || t.status === 'BILLING' ? t.capacity : undefined),
            billAmount: t.activeBillMinor ? t.activeBillMinor / 100 : undefined,
            durationMinutes: t.turnTimeMinutes,
            activeItems: t.activeItems,
          }));
          setTables(liveTables);
        } else {
          setTables([]);
        }
      } else {
        // Query preview summary for baseline restaurant metadata if table endpoint unavailable
        const previewRes = await fetch(`/api/v1/customer/tenants/${encodeURIComponent(firstProject.slug)}/preview-summary`);
        if (previewRes.ok) {
          const previewData = await previewRes.json();
          if (previewData?.preview?.restaurant?.city) {
            setRestaurantCity(previewData.preview.restaurant.city);
          }
        }
        setTables([]);
      }
    } catch {
      // Retain safe state on connection interruption
    } finally {
      setHasLoaded(true);
    }
  }, []);

  React.useEffect(() => {
    loadAuthoritativeState();
  }, [loadAuthoritativeState]);

  const floors = React.useMemo(() => {
    const set = new Set<string>();
    tables.forEach((t) => {
      if (t.floor) set.add(t.floor);
    });
    return set.size > 0 ? ['ALL', ...Array.from(set)] : ['ALL', 'Main Dining', 'Terrace'];
  }, [tables]);

  const filteredTables = React.useMemo(() => {
    if (selectedFloor === 'ALL') return tables;
    return tables.filter((t) => t.floor === selectedFloor);
  }, [tables, selectedFloor]);

  const occupiedCount = tables.filter((t) => t.status === 'OCCUPIED').length;
  const billingCount = tables.filter((t) => t.status === 'BILLING').length;
  const availableCount = tables.filter((t) => t.status === 'AVAILABLE').length;
  const totalRevenueToday = tables.reduce((acc, t) => acc + (t.billAmount || 0), 0);
  const totalActiveDiners = tables.reduce((acc, t) => acc + (t.dinerCount || 0), 0);

  const handleSettleTable = async (tableId: string) => {
    if (!activeSlug || isSettling) return;
    setIsSettling(true);
    setSettlementError(null);

    try {
      const table = tables.find((t) => t.id === tableId) || selectedTable;
      const amountMinor = table?.billAmount ? Math.round(table.billAmount * 100) : 0;

      const res = await fetch(`/api/v1/customer/tenants/${encodeURIComponent(activeSlug)}/tables/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          tableNumber: table?.tableNumber,
          amountMinor,
          paymentMethod: 'CASH',
          idempotencyKey: `settle_${tableId}_${Date.now()}`,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || 'Table settlement failed on restaurant runtime.');
      }

      // Re-query authoritative table matrix from runtime
      await loadAuthoritativeState();
      setSelectedTable(null);
    } catch (err: any) {
      setSettlementError(err?.message || 'Settlement failed on runtime.');
    } finally {
      setIsSettling(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* 1. Light Top Utility & Brand Bar */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 sm:px-8 py-3.5 sticky top-0 z-30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-gray-950 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            <UtensilsCrossed className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-[var(--color-text)]">
                {restaurantName}
              </h1>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Service
              </span>
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              {restaurantCity} · RestaurantOS v1.4.0
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/onboarding"
            className="text-xs font-semibold px-3 py-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] transition-colors flex items-center gap-1.5"
          >
            <QrCode className="h-3.5 w-3.5 text-gray-500" />
            <span>QR Setup</span>
          </Link>
          <Link
            href="/console/overview"
            className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-gray-950 text-white hover:bg-black transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>Operator Console</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </header>

      {/* 2. Main Content Workspace */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {hasLoaded && tables.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-4">
            <UtensilsCrossed className="h-12 w-12 text-gray-400 mx-auto" />
            <h2 className="text-xl font-bold text-[var(--color-text)]">No Restaurant Configured</h2>
            <p className="text-xs text-[var(--color-text-muted)] max-w-md mx-auto">
              You haven&apos;t provisioned any restaurant floors or tables yet. Complete onboarding to activate table matrices, QR sheets, and kitchen display.
            </p>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md"
            >
              <span>Launch Restaurant Onboarding</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <>
            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-5 space-y-2 border border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Today&apos;s Revenue</span>
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)]">
                  ₹{totalRevenueToday.toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)] font-medium">
                  Authoritative live floor balance
                </p>
              </Card>

              <Card className="p-5 space-y-2 border border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Table Occupancy</span>
                  <UtensilsCrossed className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)]">
                  {occupiedCount + billingCount} / {tables.length}
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  {tables.length > 0 ? Math.round(((occupiedCount + billingCount) / tables.length) * 100) : 0}% occupied · {availableCount} available
                </p>
              </Card>

              <Card className="p-5 space-y-2 border border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Active Diners</span>
                  <Users className="h-4 w-4 text-amber-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)]">
                  {totalActiveDiners} Guests
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  Live seated diner headcount
                </p>
              </Card>

              <Card className="p-5 space-y-2 border border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Avg Ticket Time</span>
                  <Clock className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)]">
                  0.0 min
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)] font-medium">
                  DAG Kitchen KDS scheduler ready
                </p>
              </Card>
            </div>

            {/* 3. Floor Filter & Action Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {floors.map((fl) => (
                  <button
                    key={fl}
                    type="button"
                    onClick={() => setSelectedFloor(fl)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      selectedFloor === fl
                        ? 'bg-gray-950 text-white shadow-sm'
                        : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {fl === 'ALL' ? 'All Floors' : fl}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span>Occupied ({occupiedCount})</span>
                </span>
                <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <span>Billing ({billingCount})</span>
                </span>
                <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                  <span className="h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-700" />
                  <span>Available ({availableCount})</span>
                </span>
              </div>
            </div>

            {/* 4. Table Floor Matrix Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredTables.map((tbl) => {
                const isSelected = selectedTable?.id === tbl.id;

                return (
                  <Card
                    key={tbl.id}
                    onClick={() => setSelectedTable(tbl)}
                    className={`p-5 rounded-3xl cursor-pointer transition-all border flex flex-col justify-between space-y-3 ${
                      isSelected
                        ? 'ring-2 ring-[var(--color-primary)] border-[var(--color-primary)] bg-[var(--color-surface-hover)] shadow-md'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-gray-400 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-base font-extrabold text-[var(--color-text)]">
                          {tbl.tableNumber}
                        </span>
                        <span className="text-[11px] text-[var(--color-text-muted)] block">
                          {tbl.seats} Seats · {tbl.floor}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          tbl.status === 'OCCUPIED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : tbl.status === 'BILLING'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {tbl.status}
                      </span>
                    </div>

                    {tbl.status !== 'AVAILABLE' ? (
                      <div className="space-y-1.5 pt-2 border-t border-[var(--color-border)]">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-[var(--color-text-muted)]">Active Bill</span>
                          <span className="text-sm font-extrabold text-[var(--color-text)] font-mono">
                            ₹{tbl.billAmount?.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
                          <span>{tbl.dinerCount} diners</span>
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="h-3 w-3" />
                            {tbl.durationMinutes}m ago
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-[var(--color-border)] text-center text-xs text-[var(--color-text-muted)] italic py-2">
                        Ready for walk-in or reservation
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* 5. Selected Table Quick Drawer / Action Modal */}
            {selectedTable && (
              <div className="p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-[var(--color-text)]">
                        Table {selectedTable.tableNumber}
                      </h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          selectedTable.status === 'OCCUPIED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : selectedTable.status === 'BILLING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {selectedTable.status}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {selectedTable.seats} Seats · {selectedTable.floor} Floor
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedTable.status !== 'AVAILABLE' && (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isSettling}
                        className="rounded-full"
                        onClick={() => handleSettleTable(selectedTable.id)}
                      >
                        {isSettling ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            Settling...
                          </>
                        ) : (
                          <>
                            <Receipt className="h-3.5 w-3.5 mr-1.5" />
                            Settle & Clear Table
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="rounded-full"
                      onClick={() => {
                        setSelectedTable(null);
                        setSettlementError(null);
                      }}
                    >
                      Close
                    </Button>
                  </div>
                </div>

                {settlementError && (
                  <div className="p-3 rounded-[var(--radius-card)] bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    {settlementError}
                  </div>
                )}

                {selectedTable.activeItems && (
                  <div className="space-y-2 text-xs">
                    <span className="font-semibold text-[var(--color-text-muted)] uppercase tracking-wider text-[11px]">
                      Current Order Items
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedTable.activeItems.map((it, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-[var(--radius-card)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex justify-between"
                        >
                          <span className="font-medium text-[var(--color-text)]">{it.name}</span>
                          <span className="font-bold text-[var(--color-text)]">×{it.qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
