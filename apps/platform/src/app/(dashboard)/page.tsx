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

const INITIAL_TABLES: TableState[] = [
  {
    id: 'tbl-1',
    tableNumber: 'T-01',
    seats: 4,
    floor: 'Main Dining',
    status: 'OCCUPIED',
    dinerCount: 3,
    billAmount: 1850,
    durationMinutes: 24,
    activeItems: [
      { name: 'Paneer Butter Masala', qty: 1 },
      { name: 'Garlic Naan', qty: 3 },
      { name: 'Cold Pressed Lime', qty: 2 },
    ],
  },
  {
    id: 'tbl-2',
    tableNumber: 'T-02',
    seats: 2,
    floor: 'Main Dining',
    status: 'OCCUPIED',
    dinerCount: 2,
    billAmount: 940,
    durationMinutes: 14,
    activeItems: [
      { name: 'Crispy Corn Salt & Pepper', qty: 1 },
      { name: 'Brewed Cold Coffee', qty: 2 },
    ],
  },
  {
    id: 'tbl-3',
    tableNumber: 'T-03',
    seats: 6,
    floor: 'Main Dining',
    status: 'BILLING',
    dinerCount: 5,
    billAmount: 3420,
    durationMinutes: 48,
    activeItems: [
      { name: 'Dal Makhani', qty: 2 },
      { name: 'Butter Chicken Bowl', qty: 2 },
      { name: 'Jeera Rice', qty: 2 },
      { name: 'Gulab Jamun with Rabdi', qty: 4 },
    ],
  },
  {
    id: 'tbl-4',
    tableNumber: 'T-04',
    seats: 4,
    floor: 'Main Dining',
    status: 'AVAILABLE',
  },
  {
    id: 'tbl-5',
    tableNumber: 'T-05',
    seats: 4,
    floor: 'Main Dining',
    status: 'OCCUPIED',
    dinerCount: 4,
    billAmount: 2120,
    durationMinutes: 19,
    activeItems: [
      { name: 'Smoked Margherita Pizza', qty: 1 },
      { name: 'Truffle Fries', qty: 2 },
      { name: 'Peach Iced Tea', qty: 3 },
    ],
  },
  {
    id: 'tbl-6',
    tableNumber: 'T-06',
    seats: 2,
    floor: 'Main Dining',
    status: 'AVAILABLE',
  },
  {
    id: 'tbl-7',
    tableNumber: 'T-07',
    seats: 8,
    floor: 'Terrace',
    status: 'OCCUPIED',
    dinerCount: 7,
    billAmount: 4890,
    durationMinutes: 32,
    activeItems: [
      { name: 'Family Mezze Platter', qty: 2 },
      { name: 'Wood-fired Sourdough Pizza', qty: 2 },
      { name: 'Virgin Sangria Carafe', qty: 2 },
    ],
  },
  {
    id: 'tbl-8',
    tableNumber: 'T-08',
    seats: 4,
    floor: 'Terrace',
    status: 'AVAILABLE',
  },
];

export default function CustomerDashboardPage() {
  const [tables, setTables] = React.useState<TableState[]>(INITIAL_TABLES);
  const [selectedFloor, setSelectedFloor] = React.useState<string>('ALL');
  const [selectedTable, setSelectedTable] = React.useState<TableState | null>(null);
  const [restaurantName] = React.useState('Orchid Bistro');
  const [restaurantCity] = React.useState('Bengaluru');

  const floors = ['ALL', 'Main Dining', 'Terrace'];

  const filteredTables = React.useMemo(() => {
    if (selectedFloor === 'ALL') return tables;
    return tables.filter((t) => t.floor === selectedFloor);
  }, [tables, selectedFloor]);

  const occupiedCount = tables.filter((t) => t.status === 'OCCUPIED').length;
  const billingCount = tables.filter((t) => t.status === 'BILLING').length;
  const availableCount = tables.filter((t) => t.status === 'AVAILABLE').length;
  const totalRevenueToday = tables.reduce((acc, t) => acc + (t.billAmount || 0), 28450);
  const totalActiveDiners = tables.reduce((acc, t) => acc + (t.dinerCount || 0), 0);

  const handleSettleTable = (tableId: string) => {
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? { ...t, status: 'AVAILABLE', billAmount: undefined, dinerCount: undefined, activeItems: undefined, durationMinutes: undefined }
          : t,
      ),
    );
    setSelectedTable(null);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* 1. Light Top Utility & Brand Bar */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 sm:px-8 py-3.5 sticky top-0 z-30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-[#14161A] text-white flex items-center justify-center font-bold text-sm shadow-sm">
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
            className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-[#14161A] text-white hover:bg-black transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>Operator Console</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </header>

      {/* 2. Main Content Workspace */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Metric KPI Cards (matching 2 · Customer dashboard — light.png) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 space-y-2 border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Today&apos;s Revenue</span>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)]">
              ₹{totalRevenueToday.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              +14.8% vs yesterday · 34 bills settled
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
              {Math.round(((occupiedCount + billingCount) / tables.length) * 100)}% occupied · {availableCount} available
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
              Avg party size: 3.2 diners / table
            </p>
          </Card>

          <Card className="p-5 space-y-2 border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Avg Ticket Time</span>
              <Clock className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)]">
              14.2 min
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              -3.4m prep time via DAG Kitchen KDS
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
                    ? 'bg-[#14161A] text-white shadow-sm'
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
                    className="rounded-full"
                    onClick={() => handleSettleTable(selectedTable.id)}
                  >
                    <Receipt className="h-3.5 w-3.5 mr-1.5" />
                    Settle & Clear Table
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setSelectedTable(null)}
                >
                  Close
                </Button>
              </div>
            </div>

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
      </main>
    </div>
  );
}
