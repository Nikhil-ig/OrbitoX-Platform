'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AppShell,
  PageHeader,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  StatCard,
  Button,
  Input,
  Badge,
  StatusPill,
  DataTable,
  type ColumnDef,
  Form,
  FormField,
  FormAlert,
  SubmitButton,
  DangerousAction,
  MaskedField,
  CopyOnceSecret,
  Banner,
  cn,
  formatINR,
  formatRelative,
  LineChart,
  DonutChart,
  type ServerErrorPayload,
  HeroStat,
  StatStrip,
  PillNav,
  ListRowLink,
  ActivityFeed,
  LiveStatusBar,
  QuantityStepper,
  MenuItemCard,
  ProgressBar,
  MeterRow,
  LollipopChart,
  Stepper,
  SegmentedControl,
  BottomTabBar,
  BottomSheet,
  BottomSheetTrigger,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetFooter,
  SwipeActions,
  RingTimer,
  VegMark,
  ActionCard,
  FloorPlan,
  EmptyState,
  ErrorState,
  Skeleton,
} from '@orbitox-io/ui';
import {
  Building2,
  Palette,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  Users,
  Sun,
  Moon,
  Sparkles,
  Layers,
  AlertOctagon,
  RefreshCw,
  ChefHat,
  Bell,
  CheckCircle2,
  Trash2,
  Inbox,
  Plus,
  Utensils,
  LayoutDashboard,
} from 'lucide-react';

// Form Schema
const branchFormSchema = z.object({
  branchName: z.string().min(3, 'Branch name must be at least 3 characters'),
  managerPhone: z.string().min(10, 'Valid 10-digit Indian phone number required'),
  gstin: z.string().min(15, 'GSTIN must be 15 alphanumeric characters'),
  monthlyTurnoverPaise: z.number().min(10000, 'Minimum budget is ₹100.00'),
});

type BranchFormData = z.infer<typeof branchFormSchema>;

// Mock Table Data
interface BranchRecord {
  id: string;
  name: string;
  location: string;
  status: 'active' | 'pending' | 'suspended';
  turnoverPaise: number;
  lastActive: number;
  activeOrders: number;
}

const REFERENCE_NOW = Date.UTC(2026, 10, 12, 12, 0, 0);

const MOCK_BRANCHES: BranchRecord[] = [
  { id: 'BR-001', name: 'Koramangala Flagship', location: 'Bengaluru, KA', status: 'active', turnoverPaise: 125000000, lastActive: REFERENCE_NOW - 120000, activeOrders: 18 },
  { id: 'BR-002', name: 'Indiranagar Hub', location: 'Bengaluru, KA', status: 'active', turnoverPaise: 84500000, lastActive: REFERENCE_NOW - 3600000, activeOrders: 12 },
  { id: 'BR-003', name: 'Bandra West Dining', location: 'Mumbai, MH', status: 'active', turnoverPaise: 215000000, lastActive: REFERENCE_NOW - 7200000, activeOrders: 29 },
  { id: 'BR-004', name: 'Connaught Place Central', location: 'New Delhi, DL', status: 'pending', turnoverPaise: 32000000, lastActive: REFERENCE_NOW - 86400000, activeOrders: 0 },
  { id: 'BR-005', name: 'Hitec City Express', location: 'Hyderabad, TS', status: 'suspended', turnoverPaise: 65000000, lastActive: REFERENCE_NOW - 604800000, activeOrders: 0 },
  { id: 'BR-006', name: 'Salt Lake Sector V', location: 'Kolkata, WB', status: 'active', turnoverPaise: 74000000, lastActive: REFERENCE_NOW - 1800000, activeOrders: 15 },
  { id: 'BR-007', name: 'Anna Nagar Bistro', location: 'Chennai, TN', status: 'active', turnoverPaise: 91000000, lastActive: REFERENCE_NOW - 14400000, activeOrders: 22 },
];

// Mock Chart Series
const MOCK_REVENUE_SERIES = [
  { name: 'Mon', revenue: 42000, orders: 120 },
  { name: 'Tue', revenue: 58000, orders: 155 },
  { name: 'Wed', revenue: 51000, orders: 140 },
  { name: 'Thu', revenue: 69000, orders: 185 },
  { name: 'Fri', revenue: 98000, orders: 260 },
  { name: 'Sat', revenue: 145000, orders: 380 },
  { name: 'Sun', revenue: 162000, orders: 410 },
];

const MOCK_CATEGORY_SERIES = [
  { name: 'Dine-In', value: 55 },
  { name: 'Takeaway', value: 25 },
  { name: 'Online Delivery', value: 15 },
  { name: 'Catering', value: 5 },
];

export default function DesignSystemClient() {
  // Brand Palette state (Option A vs Option B)
  const [brandPalette, setBrandPalette] = React.useState<'titanium-slate' | 'obsidian-amber'>('titanium-slate');
  const [themeMode, setThemeMode] = React.useState<'dark' | 'light'>('dark');

  // Table State
  const [branches] = React.useState(MOCK_BRANCHES);
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [selectedBranchIds, setSelectedBranchIds] = React.useState<string[]>([]);
  const [showcaseScreen, setShowcaseScreen] = React.useState<string>('A1');

  // Form State with simulated server rejection mapping
  const [serverErrors, setServerErrors] = React.useState<ServerErrorPayload | null>(null);
  const [formSubmittedData, setFormSubmittedData] = React.useState<BranchFormData | null>(null);

  const form = useForm<BranchFormData>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: {
      branchName: 'Koramangala Bistro',
      managerPhone: '9876543210',
      gstin: '29AAAAA0000A1Z5',
      monthlyTurnoverPaise: 50000000, // ₹5,00,000.00
    },
  });

  // Toggle Theme mode on root (sync with RootLayout's data-theme attribute)
  React.useEffect(() => {
    const active = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    setThemeMode(active);
  }, []);

  const toggleTheme = () => {
    const active =
      typeof document !== 'undefined'
        ? document.documentElement.getAttribute('data-theme') === 'light'
          ? 'light'
          : 'dark'
        : themeMode;
    const next = active === 'dark' ? 'light' : 'dark';
    setThemeMode(next);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', next);
    }
  };

  // Toggle Brand Palette
  const toggleBrand = () => {
    const next = brandPalette === 'titanium-slate' ? 'obsidian-amber' : 'titanium-slate';
    setBrandPalette(next);
  };

  // Simulate Server Rejection Error
  const handleSimulateServerError = () => {
    setServerErrors({
      error: 'Control Plane Verification Failed: Conflicting Tax Registration & Branch ID',
      code: 'GOV_GSTIN_CONFLICT',
      fieldErrors: {
        gstin: 'GSTIN is already associated with an existing active entity in state 29',
        branchName: 'Branch name duplicate in zone "South-KA"',
      },
    });
  };

  // Form Submit Handler
  const handleFormSubmit = async (data: BranchFormData) => {
    // Artificial 600ms latency to demonstrate double-submission prevention
    await new Promise((resolve) => setTimeout(resolve, 600));
    setServerErrors(null);
    setFormSubmittedData(data);
  };

  // Table Columns
  const columns: ColumnDef<BranchRecord>[] = [
    {
      id: 'id',
      header: 'Branch Code',
      accessorKey: 'id',
      cell: ({ row }: { row: { original: BranchRecord } }) => (
        <span className="font-mono text-xs font-semibold">{row.original.id}</span>
      ),
    },
    {
      id: 'name',
      header: 'Branch & City',
      accessorKey: 'name',
      cell: ({ row }: { row: { original: BranchRecord } }) => (
        <div>
          <div className="font-medium text-xs text-[var(--color-text)]">{row.original.name}</div>
          <div className="text-[11px] text-[var(--color-text-muted)]">{row.original.location}</div>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }: { row: { original: BranchRecord } }) => (
        <StatusPill status={row.original.status.toUpperCase()} />
      ),
    },
    {
      id: 'turnover',
      header: 'Revenue (INR)',
      accessorKey: 'turnoverPaise',
      cell: ({ row }: { row: { original: BranchRecord } }) => (
        <span className="font-mono font-medium text-xs">
          {formatINR(row.original.turnoverPaise, { short: true })}
        </span>
      ),
    },
    {
      id: 'lastActive',
      header: 'Last Pulse',
      accessorKey: 'lastActive',
      cell: ({ row }: { row: { original: BranchRecord } }) => (
        <span className="text-[11px] text-[var(--color-text-muted)]">
          {formatRelative(row.original.lastActive, REFERENCE_NOW)}
        </span>
      ),
    },
  ];

  // Filtered branches
  const filteredBranches = branches.filter((b) => {
    if (statusFilter === 'all') return true;
    return b.status === statusFilter;
  });

  return (
    <div
      data-brand={brandPalette}
      className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] font-sans antialiased"
    >
      {/* 1. Staging Environment Security Banner */}
      <Banner variant="warning">
        INTERNAL OPERATOR CONSOLE — DESIGN SYSTEM STAGE 7B VERIFICATION (STAGING ENVIRONMENT ONLY)
      </Banner>

      {/* 2. Unified AppShell */}
      <AppShell
        appName="OrbitoX Console"
        navItems={[
          { id: 'admin', label: 'Overview', href: '/console/admin', icon: <Layers className="h-4 w-4" /> },
          { id: 'design', label: 'Design System', href: '/console/design-system', icon: <Palette className="h-4 w-4" />, active: true },
          { id: 'platform', label: 'Tenants & POS', href: '/console/platform', icon: <Building2 className="h-4 w-4" /> },
          { id: 'keys', label: 'Security & Access', href: '/console/admin/api-keys', icon: <ShieldCheck className="h-4 w-4" /> },
        ]}
        tenantSwitcher={
          <div className="flex items-center gap-2">
            {/* Brand Palette Switcher */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleBrand}
              className="text-xs h-8 gap-1.5"
              icon={<Sparkles className="h-3.5 w-3.5 text-[var(--color-accent)]" />}
            >
              Palette: {brandPalette === 'titanium-slate' ? 'Option A (Slate)' : 'Option B (Amber)'}
            </Button>

            {/* Dark / Light Mode Switcher */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="h-8 w-8 p-0"
              aria-label="Toggle Theme"
            >
              {themeMode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        }
        breadcrumbs={
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
            <span>Operator Console</span>
            <span>/</span>
            <span className="text-[var(--color-text)] font-medium">Design System Lab</span>
          </div>
        }
        userMenu={
          <div className="flex flex-col text-xs text-right">
            <span className="font-semibold text-[var(--color-text)]">Chief Architect</span>
            <span className="text-[10px] text-[var(--color-text-muted)]">operator@orbitox.io</span>
          </div>
        }
      >
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* 3. Page Header */}
          <PageHeader
            title="Design System & Security Component Verification"
            description="Demonstrating strict token compliance, Next.js 15 standalone build compatibility, zero style-injection, and Indian locale formatting."
            actions={
              <DangerousAction
                trigger={
                  <Button variant="destructive" size="sm" icon={<AlertOctagon className="h-4 w-4" />}>
                    Purge Staging Ledger
                  </Button>
                }
                title="Purge Staging Branch Ledger"
                description="This will permanently delete simulated ledger records, active carts, and order streams across all staging tenants. This action cannot be undone."
                expectedConfirmationText="PURGE staging-cluster-alpha"
                requireReason
                onStepUpAuth={async () => {
                  // Simulate 400ms MFA step-up verification
                  await new Promise((r) => setTimeout(r, 400));
                  return true;
                }}
                onConfirm={({ reason }) => {
                  alert(`Ledger purged successfully with logged audit reason: "${reason}"`);
                }}
              />
            }
          />

          {/* 4. Financial Metric StatCards (Indian en-IN formatting) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Platform GMV (Current FY)"
              value={formatINR(1425000000, { short: true })} // ₹1.43 Cr
              change={{ value: '+18.4%', trend: 'up', label: 'vs last FY' }}
              icon={<TrendingUp className="h-5 w-5 text-[var(--color-primary)]" />}
            />
            <StatCard
              label="Daily Run Rate (DRR)"
              value={formatINR(4500000, { short: true })} // ₹4.5 L
              change={{ value: '+6.2%', trend: 'up' }}
              icon={<CreditCard className="h-5 w-5 text-[var(--color-success)]" />}
            />
            <StatCard
              label="Active DINER Sessions"
              value="3,842"
              change={{ value: 'Steady', trend: 'neutral' }}
              icon={<Users className="h-5 w-5 text-[var(--color-accent)]" />}
            />
            <StatCard
              label="Security Invariants"
              value="100% PASS"
              change={{ value: '0 violations', trend: 'up' }}
              icon={<ShieldCheck className="h-5 w-5 text-[var(--color-success)]" />}
            />
          </div>

          {/* 5. Deep-Dive Interactive Tabs */}
          <Tabs defaultValue="data-table" className="w-full">
            <TabsList className="grid grid-cols-5 w-full max-w-4xl">
              <TabsTrigger value="data-table">DataTable & Actions</TabsTrigger>
              <TabsTrigger value="forms">Form & Server Errors</TabsTrigger>
              <TabsTrigger value="security">Security & PHI</TabsTrigger>
              <TabsTrigger value="charts">Visualizations</TabsTrigger>
              <TabsTrigger value="showcase">7B.1 Canvas Showcase</TabsTrigger>
            </TabsList>

            {/* TAB 1: DataTable */}
            <TabsContent value="data-table" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle>Restaurant Branch Registry</CardTitle>
                      <CardDescription>
                        TanStack Table v8 integration with sticky headers, multi-row selection, and responsive card fallback.
                      </CardDescription>
                    </div>

                    {/* Filter controls */}
                    <div className="flex items-center gap-2">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-xs text-[var(--color-text)]"
                      >
                        <option value="all">All Statuses ({branches.length})</option>
                        <option value="active">Active Only</option>
                        <option value="pending">Pending Only</option>
                        <option value="suspended">Suspended Only</option>
                      </select>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  <DataTable
                    columns={columns}
                    data={filteredBranches}
                    enableRowSelection
                    bulkActions={(selectedRows) => (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            alert(`Bulk suspended ${selectedRows.length} branch(es)`);
                          }}
                        >
                          Suspend ({selectedRows.length})
                        </Button>
                      </div>
                    )}
                  />
                </CardContent>

                <CardFooter className="flex items-center justify-between border-t border-[var(--color-border)] py-3 px-4 text-xs text-[var(--color-text-muted)]">
                  <span>Showing {filteredBranches.length} of {branches.length} registered branches</span>
                  <span>Currency: INR (en-IN)</span>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* TAB 2: Form with Server Error Mapping */}
            <TabsContent value="forms" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Branch Configuration Form</CardTitle>
                      <CardDescription>
                        React Hook Form + Zod schema validation with automatic server-error mapping into individual fields and root alerts.
                      </CardDescription>
                    </CardHeader>

                    <CardContent>
                      <Form
                        form={form}
                        serverErrors={serverErrors}
                        clearServerErrors={() => setServerErrors(null)}
                        onSubmit={handleFormSubmit}
                        className="space-y-4"
                      >
                        {/* Top-Level Server Error Banner */}
                        <FormAlert />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField
                            name="branchName"
                            label="Branch Name"
                            hint="Official name appearing on customer invoices"
                            required
                          >
                            <Input placeholder="e.g. Indiranagar Prime" />
                          </FormField>

                          <FormField
                            name="managerPhone"
                            label="Manager Contact Phone"
                            hint="Indian 10-digit mobile number (+91)"
                            required
                          >
                            <Input placeholder="9876543210" />
                          </FormField>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField
                            name="gstin"
                            label="GSTIN Identifier"
                            hint="15-character Goods and Services Tax number"
                            required
                          >
                            <Input placeholder="29AAAAA0000A1Z5" />
                          </FormField>

                          <FormField
                            name="monthlyTurnoverPaise"
                            label="Initial Deposit Budget (Paise)"
                            hint="Integer minor units (e.g. 5000000 paise = ₹50,000)"
                            required
                          >
                            <Input
                              type="number"
                              {...form.register('monthlyTurnoverPaise', { valueAsNumber: true })}
                            />
                          </FormField>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                          <SubmitButton preventDoubleSubmission>
                            Save Branch Profile
                          </SubmitButton>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleSimulateServerError}
                          >
                            Simulate Server Rejection
                          </Button>

                          {serverErrors && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setServerErrors(null)}
                            >
                              Clear Errors
                            </Button>
                          )}
                        </div>
                      </Form>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Server State Inspector</CardTitle>
                      <CardDescription className="text-xs">
                        Real-time inspection of client submission & server mapping.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs">
                      <div>
                        <span className="font-semibold text-[var(--color-text-muted)]">Active Server Error:</span>
                        <pre className="mt-1 p-2 rounded bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[10px] font-mono overflow-auto max-h-36">
                          {serverErrors ? JSON.stringify(serverErrors, null, 2) : 'None (Clean)'}
                        </pre>
                      </div>

                      <div>
                        <span className="font-semibold text-[var(--color-text-muted)]">Last Clean Submission:</span>
                        <pre className="mt-1 p-2 rounded bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[10px] font-mono overflow-auto max-h-36">
                          {formSubmittedData ? JSON.stringify(formSubmittedData, null, 2) : 'None'}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: Security & PHI */}
            <TabsContent value="security" className="space-y-6 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* MaskedField Demo */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">MaskedField (PHI & Regulatory PII)</CardTitle>
                    <CardDescription>
                      Sensitive fields are strictly absent from the DOM until an audited reason is logged. Auto-hides on 60s timer and browser tab blur.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[var(--color-text-muted)] block">
                        Patient Aadhaar Number (UIDAI compliant):
                      </label>
                      <MaskedField
                        maskedPreview="•••• •••• 9921"
                        onReveal={async (reason) => {
                          // Simulates access-logged API decrypt call
                          await new Promise((r) => setTimeout(r, 300));
                          return '9876-5432-1098';
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[var(--color-text-muted)] block">
                        Direct Settlement Bank Account:
                      </label>
                      <MaskedField
                        maskedPreview="•••• •••• 5512"
                        onReveal={async (reason) => {
                          await new Promise((r) => setTimeout(r, 300));
                          return 'HDFC0001234 — 50100445566778';
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* CopyOnceSecret Demo */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">CopyOnceSecret (Volatile Memory Wipe)</CardTitle>
                    <CardDescription>
                      Single-use display for newly generated cryptographic tokens and private credentials.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CopyOnceSecret
                      secret="orb_test_staging_ingress_preview_01"
                      title="Branch Ingress Signing Key"
                      description="Copy and save this private token into your vault immediately. Once dismissed, this token is scrubbed from client memory."
                      onAcknowledged={() => {
                        console.log('Secret dismissed by operator');
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* TAB 4: Charts */}
            <TabsContent value="charts" className="space-y-6 pt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Weekly Revenue Velocity</CardTitle>
                    <CardDescription>
                      Recharts integration using CSS custom property tokens with zero inline styles and accessible table fallback.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LineChart
                      title="Weekly Revenue Velocity"
                      data={MOCK_REVENUE_SERIES}
                      xAxisKey="name"
                      series={[{ key: 'revenue', label: 'Gross Revenue (INR)' }]}
                      className="h-64"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Channel Order Distribution</CardTitle>
                    <CardDescription>
                      Donut chart with accessible table toggle and semantic status colors.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DonutChart
                      title="Channel Order Distribution"
                      data={MOCK_CATEGORY_SERIES}
                      className="h-64"
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* TAB 5: 7B.1 Canvas Showcase (Interactive Concept Canvas Review) */}
            <TabsContent value="showcase" className="space-y-6 pt-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-base">Master Brief 7B.1 Visual Language Showcase</CardTitle>
                      <CardDescription>
                        Interactive reproduction of all 11 required Master Brief screens (A1–A4, C2, C4, C6, P1, S1, D1, D4) using production components.
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: 'A1', label: 'A1. Operator Overview' },
                        { id: 'A2', label: 'A2. Customer Home' },
                        { id: 'A3', label: 'A3. Appearance' },
                        { id: 'A4', label: 'A4. Diner Saffron' },
                        { id: 'C2', label: 'C2. Tenant Suspend' },
                        { id: 'C4', label: 'C4. Provisioning' },
                        { id: 'C6', label: 'C6. Rotated Key' },
                        { id: 'P1', label: 'P1. Feedback & States' },
                        { id: 'S1', label: 'S1. Kitchen KDS' },
                        { id: 'D1', label: 'D1. Owner Phone' },
                        { id: 'D4', label: 'D4. Waiter Phone' },
                      ].map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setShowcaseScreen(s.id)}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer',
                            showcaseScreen === s.id
                              ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
                              : 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)]'
                          )}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 border-t border-[var(--color-border)]">
                  {showcaseScreen === 'A1' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-[var(--color-text)]">Fleet Operations & Telemetry (A1)</h3>
                          <p className="text-xs text-[var(--color-text-muted)]">Real-time tenant health and throughput.</p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-warning-subtle)] text-[var(--color-warning)] border border-[var(--color-warning)]/30">
                          STAGING v1.4.0
                        </span>
                      </div>
                      <StatStrip
                        stats={[
                          { label: 'Active Fleets', value: '42' },
                          { label: 'Network GMV', value: '₹1.43 Cr' },
                          { label: 'Avg Latency', value: '28ms' },
                          { label: 'Error Rate', value: '0.001%' },
                        ]}
                      />
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <HeroStat
                          title="Gross Platform Volume"
                          value="₹84,92,400"
                          label="Daily network throughput across 42 active tenants"
                          delta={{ value: '+16.8% vs last week', trend: 'up' }}
                        />
                        <Card>
                          <CardContent className="p-6 space-y-3">
                            <h4 className="text-xs font-bold uppercase text-[var(--color-text-muted)]">System Health</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs">
                                <span>Active Tenants</span>
                                <span className="font-semibold">42 / 45</span>
                              </div>
                              <ProgressBar value={42} max={45} variant="success" ariaLabel="Active Tenants" />
                              <div className="flex justify-between text-xs pt-1">
                                <span>API Quota</span>
                                <span className="font-semibold">78%</span>
                              </div>
                              <ProgressBar value={78} max={100} variant="primary" ariaLabel="API Quota" />
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase text-[var(--color-text-muted)]">Active Tenants</h4>
                        <ListRowLink
                          title="Cafe Oasis Koramangala"
                          subtitle="tenant_oasis_blr · ap-south-1 · 28 active orders"
                          statusDot="green"
                          highlighted
                        />
                        <ListRowLink
                          title="Bandra Kitchens Central"
                          subtitle="tenant_bandra_bom · Provisioning step 3 pending"
                          statusDot="amber"
                        />
                      </div>
                    </div>
                  )}

                  {showcaseScreen === 'A2' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-base text-[var(--color-text)]">Oasis Dining Dashboard (A2)</span>
                        <PillNav
                          activeId="overview"
                          items={[
                            { id: 'overview', label: 'Overview' },
                            { id: 'orders', label: 'Live Orders', badge: '14' },
                            { id: 'menu', label: 'Menu & POS' },
                          ]}
                          onChange={() => undefined}
                        />
                        <Badge variant="default">Live</Badge>
                      </div>
                      <Card hero className="border border-[var(--color-border)]">
                        <CardContent className="p-8 space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-xs uppercase text-[var(--color-text-muted)] font-semibold">Today's Dining Revenue</span>
                            <Badge variant="success">+24.5% vs yesterday</Badge>
                          </div>
                          <div className="text-5xl font-light tracking-tight text-[var(--color-text)]">₹1,42,850</div>
                          <p className="text-xs text-[var(--color-text-muted)]">Across 328 seated tables · Avg spend ₹435 per guest</p>
                        </CardContent>
                      </Card>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card><CardContent className="p-4"><MeterRow label="Monthly Plan Usage" current={7400} total={10000} valueDisplay="7,400 / 10,000 orders" /></CardContent></Card>
                        <Card><CardContent className="p-4"><MeterRow label="Table Occupancy" current={28} total={35} valueDisplay="80% full" variant="warning" /></CardContent></Card>
                        <Card><CardContent className="p-4"><MeterRow label="Kitchen Velocity" current={95} total={100} valueDisplay="Avg 6.2 min" variant="success" /></CardContent></Card>
                      </div>
                    </div>
                  )}

                  {showcaseScreen === 'A3' && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-bold text-[var(--color-text)]">Appearance Preferences (A3)</h3>
                        <p className="text-xs text-[var(--color-text-muted)]">Live preview of user appearance controls.</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader><CardTitle className="text-sm">Theme Mode</CardTitle></CardHeader>
                          <CardContent>
                            <SegmentedControl
                              value={themeMode}
                              onChange={(v: string) => {
                                setThemeMode(v as 'light' | 'dark');
                                document.documentElement.setAttribute('data-theme', v);
                              }}
                              options={[
                                { id: 'dark', label: 'Dark' },
                                { id: 'light', label: 'Light' },
                              ]}
                            />
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader><CardTitle className="text-sm">Accent Preset</CardTitle></CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-4 gap-2">
                              {['ocean', 'emerald', 'sunflower', 'saffron', 'ruby', 'coral', 'violet', 'teal'].map((a) => (
                                <button
                                  key={a}
                                  type="button"
                                  onClick={() => document.documentElement.setAttribute('data-accent', a)}
                                  className="px-2.5 py-1.5 rounded-full border border-[var(--color-border)] text-xs capitalize hover:bg-[var(--color-surface-raised)]"
                                >
                                  {a}
                                </button>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}

                  {showcaseScreen === 'A4' && (
                    <div className="flex justify-center p-4">
                      <div className="w-full max-w-[360px] rounded-[36px] border-4 border-slate-700 bg-[var(--color-bg)] p-4 space-y-4 shadow-xl">
                        <div className="flex justify-between items-center pb-2 border-b border-[var(--color-border)]">
                          <div>
                            <h4 className="font-bold text-sm text-[var(--color-text)]">The Saffron Room (A4)</h4>
                            <p className="text-[10px] text-[var(--color-text-muted)]">Table 7 · Fine Indian Dining</p>
                          </div>
                          <Badge variant="default">Menu</Badge>
                        </div>
                        <MenuItemCard
                          title="Dal Makhani Royale"
                          description="Slow-cooked black lentils, churned white butter, kasuri methi."
                          pricePaise={42000}
                          tags={['Signature', 'Vegetarian']}
                          onAdd={() => undefined}
                        />
                        <div className="flex justify-between items-center pt-2">
                          <span className="text-xs text-[var(--color-text-muted)]">Portion Size:</span>
                          <QuantityStepper value={2} onChange={() => undefined} min={1} max={5} />
                        </div>
                        <LiveStatusBar
                          title="Ready in 5 min"
                          subtitle="Order #42 · 2 items · Table 7"
                          actionLabel="Pay bill"
                          onAction={() => undefined}
                        />
                      </div>
                    </div>
                  )}

                  {showcaseScreen === 'C2' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-[var(--color-text)]">Cafe Oasis Koramangala (C2)</h3>
                            <Badge variant="success">Active</Badge>
                          </div>
                          <p className="text-xs text-[var(--color-text-muted)] mt-1">Tenant ID: tenant_oasis_blr · ap-south-1</p>
                        </div>
                        <DangerousAction
                          title="Suspend Tenant Environment"
                          description="Suspending halts order routing, staff POS terminals, and webhook deliveries."
                          expectedConfirmationText="SUSPEND"
                          requireReason
                          confirmButtonLabel="Suspend tenant"
                          onConfirm={async () => alert('Tenant suspended')}
                          trigger={
                            <Button variant="destructive" size="sm">
                              Suspend tenant
                            </Button>
                          }
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader><CardTitle className="text-sm">Tenant Configuration</CardTitle></CardHeader>
                          <CardContent className="space-y-2 text-xs">
                            <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">Domain:</span><span className="font-mono">order.cafeoasis.in</span></div>
                            <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">Signing Key:</span><span className="font-mono">ed25519:pub_7f8a...31b</span></div>
                            <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">Plan:</span><span className="font-semibold text-[var(--color-link)]">Enterprise Growth</span></div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader><CardTitle className="text-sm">Compliance & Audit</CardTitle></CardHeader>
                          <CardContent className="space-y-2 text-xs">
                            <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">Zero-Trust Isolation:</span><span className="text-[var(--color-success)] font-medium">Enforced</span></div>
                            <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">GSTIN:</span><span className="font-mono">29 AAAAA 0000A 1 Z 5</span></div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}

                  {showcaseScreen === 'C4' && (
                    <div className="space-y-6 max-w-xl mx-auto">
                      <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-4">
                        <div>
                          <h3 className="text-lg font-bold text-[var(--color-text)]">Provisioning Job: job_prv_9821 (C4)</h3>
                          <p className="text-xs text-[var(--color-text-muted)] mt-1">Target Tenant: Bandra Kitchens Express</p>
                        </div>
                        <Button variant="secondary" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />}>
                          Retry step
                        </Button>
                      </div>
                      <Card>
                        <CardHeader><CardTitle className="text-sm">Execution Timeline</CardTitle></CardHeader>
                        <CardContent>
                          <Stepper
                            orientation="vertical"
                            steps={[
                              { id: '1', title: 'Cryptographic Keypair Generation', description: 'Ed25519 key registered in tenant keychain.', status: 'done', time: '14:22:01' },
                              { id: '2', title: 'Tenant Database Schema Isolation', description: 'RLS policies applied to PostgreSQL cluster.', status: 'done', time: '14:22:08' },
                              { id: '3', title: 'DNS CNAME Verification', description: 'Failed: CNAME order.bandrakitchen.in timed out after 30s.', status: 'failed', time: '14:22:38' },
                              { id: '4', title: 'TLS Certificate Issuance', description: 'Waiting for DNS verification.', status: 'waiting' },
                            ]}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {showcaseScreen === 'C6' && (
                    <div className="space-y-6 max-w-2xl mx-auto">
                      <div>
                        <h3 className="text-lg font-bold text-[var(--color-text)]">API Keys & Cryptographic Credentials (C6)</h3>
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">Single-use display for newly generated secrets.</p>
                      </div>
                      <CopyOnceSecret
                        secret="ox_live_sec_9a8f27b31e0c4d82f7a93b51e048c27d14"
                        title="New Production Signing Secret Generated"
                        description="This key is displayed exactly once. Store it in a secure secret manager immediately. It will be wiped permanently on confirmation."
                        confirmLabel="I've stored it"
                        onAcknowledged={() => alert('Secret wiped from memory!')}
                      />
                    </div>
                  )}

                  {showcaseScreen === 'P1' && (
                    <div className="space-y-6 max-w-3xl mx-auto">
                      <div>
                        <h3 className="text-lg font-bold text-[var(--color-text)]">System Feedback & Edge States (P1)</h3>
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">
                          Standard banners, toasts, empty states, error fallbacks, and skeleton loading cards.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Banners</h4>
                        <Banner variant="warning">
                          Scheduled Maintenance Notice: Platform upgrades scheduled for Sunday 02:00–02:30 UTC. Read-only fallback will be active.
                        </Banner>
                        <Banner variant="info">
                          RestaurantOS v1.4.0 Live: New charts and FSSAI dietary badges are now available on all diner templates.
                        </Banner>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Toast Notification Pill</h4>
                        <div className="flex items-center justify-between p-3.5 rounded-full bg-[var(--near-black)] text-white shadow-xl max-w-md border border-white/10">
                          <div className="flex items-center gap-2.5 px-2">
                            <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
                            <span className="text-xs font-medium">Theme updated · saved to your account</span>
                          </div>
                          <button type="button" className="text-xs text-[var(--color-text-muted)] hover:text-white px-2 cursor-pointer">
                            Dismiss
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                          <CardContent className="pt-6">
                            <EmptyState
                              icon={<Inbox className="h-10 w-10 text-[var(--color-text-muted)]" />}
                              title="No Orders Received Today"
                              description="When diners place orders through your custom domain or QR code, they will stream here live."
                              action={<Button size="sm" className="rounded-full">Simulate Test Order</Button>}
                            />
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <ErrorState
                              title="Telemetry Pipeline Disconnected"
                              description="Unable to reach Prometheus cluster in ap-south-1. Reconnecting with exponential backoff..."
                              onRetry={() => alert('Retrying connection...')}
                            />
                          </CardContent>
                        </Card>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Skeleton Loading State</h4>
                        <Card>
                          <CardContent className="pt-6 space-y-4">
                            <div className="flex items-center justify-between">
                              <Skeleton className="h-6 w-48 rounded-full" />
                              <Skeleton className="h-8 w-24 rounded-full" />
                            </div>
                            <Skeleton className="h-14 w-full rounded-2xl" />
                            <div className="grid grid-cols-3 gap-3">
                              <Skeleton className="h-12 w-full rounded-xl" />
                              <Skeleton className="h-12 w-full rounded-xl" />
                              <Skeleton className="h-12 w-full rounded-xl" />
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}

                  {showcaseScreen === 'S1' && (
                    <div className="space-y-6 max-w-5xl mx-auto rounded-[28px] border border-[var(--color-border)] bg-[#0D0F12] text-[#F2F4F7] p-6 select-none shadow-2xl">
                      <header className="flex items-center justify-between border-b border-white/10 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
                            <ChefHat className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-white">Kitchen Display Station (S1)</h3>
                            <p className="text-xs text-[var(--color-text-muted)]">Bukhara Tandoor & Grill · Station: Hot Line</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-xs bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                            <span className="h-2 w-2 rounded-full bg-[var(--color-success)] animate-pulse" />
                            <span>Live Sync Active</span>
                          </div>
                          <Button size="sm" variant="secondary" className="rounded-full">
                            Sound Muted
                          </Button>
                        </div>
                      </header>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="rounded-[28px] border-2 border-[var(--color-danger)]/50 bg-[#14171C] p-5 space-y-4 shadow-xl">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-danger)]">Overdue (22m)</span>
                              <h4 className="text-base font-bold text-white">Order #104 · Table 4</h4>
                            </div>
                            <RingTimer totalSeconds={900} elapsedSeconds={1320} size="md" />
                          </div>
                          <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <VegMark type="non-veg" size="sm" />
                                <span className="font-semibold text-white">2x Murgh Tikka</span>
                              </div>
                              <Badge variant="outline" className="text-[10px]">Spicy</Badge>
                            </div>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <VegMark type="veg" size="sm" />
                                <span className="font-semibold text-white">4x Butter Garlic Naan</span>
                              </div>
                            </div>
                          </div>
                          <Button variant="primary" className="w-full rounded-full min-h-[48px] text-xs font-bold shadow-md">
                            Mark Ready (Bump)
                          </Button>
                        </div>

                        <div className="rounded-[28px] border border-white/10 bg-[#14171C] p-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-warning)]">Preparing (8m)</span>
                              <h4 className="text-base font-bold text-white">Order #105 · Table 8</h4>
                            </div>
                            <RingTimer totalSeconds={900} elapsedSeconds={480} size="md" />
                          </div>
                          <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <VegMark type="veg" size="sm" />
                                <span className="font-semibold text-white">1x Paneer Lababdar</span>
                              </div>
                              <Badge variant="outline" className="text-[10px]">Mild</Badge>
                            </div>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <VegMark type="veg" size="sm" />
                                <span className="font-semibold text-white">2x Tandoori Roti</span>
                              </div>
                            </div>
                          </div>
                          <Button variant="secondary" className="w-full rounded-full min-h-[48px] text-xs font-bold">
                            Mark Ready
                          </Button>
                        </div>

                        <div className="rounded-[28px] border border-white/10 bg-[#14171C] p-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-success)]">Just Arrived</span>
                              <h4 className="text-base font-bold text-white">Order #106 · Takeaway</h4>
                            </div>
                            <RingTimer totalSeconds={900} elapsedSeconds={60} size="md" />
                          </div>
                          <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <VegMark type="non-veg" size="sm" />
                                <span className="font-semibold text-white">1x Mutton Rogan Josh</span>
                              </div>
                            </div>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <VegMark type="veg" size="sm" />
                                <span className="font-semibold text-white">1x Jeera Rice</span>
                              </div>
                            </div>
                          </div>
                          <Button variant="secondary" className="w-full rounded-full min-h-[48px] text-xs font-bold">
                            Start Preparation
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {showcaseScreen === 'D1' && (
                    <div className="flex justify-center p-4">
                      <div className="w-full max-w-[390px] min-h-[700px] bg-white text-[#14161A] rounded-[44px] shadow-2xl border-8 border-[#14161A] flex flex-col overflow-hidden relative">
                        <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-[#E2E8F0]">
                          <div>
                            <h3 className="font-bold text-base text-[#14161A]">Today's Performance (D1)</h3>
                            <p className="text-[11px] text-[#5A6170]">Saturday, 12 Nov · Bukhara</p>
                          </div>
                          <button type="button" className="p-2 rounded-full hover:bg-black/5 cursor-pointer">
                            <Bell className="h-4 w-4 text-[#14161A]" />
                          </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">
                          <HeroStat
                            title="Gross Today"
                            value="₹72,400"
                            label="148 orders fulfilled"
                            delta={{ value: '+16.2% vs yesterday', trend: 'up' }}
                          />

                          <h4 className="text-xs font-bold uppercase tracking-wider text-[#5A6170]">Live Orders Requiring Action</h4>
                          <SwipeActions
                            leftAction={{
                              id: 'done',
                              label: 'Settle',
                              icon: <CheckCircle2 className="h-4 w-4" />,
                              onTrigger: () => alert('Order settled'),
                              variant: 'success',
                            }}
                            rightAction={{
                              id: 'void',
                              label: 'Void',
                              icon: <Trash2 className="h-4 w-4" />,
                              onTrigger: () => alert('Order voided'),
                              variant: 'destructive',
                            }}
                          >
                            <ActionCard
                              title="Table 7 · Bill Requested"
                              subtitle="4 guests · ₹3,850 · Cash/UPI"
                              highlighted
                            />
                          </SwipeActions>

                          <ActionCard
                            title="Online Takeaway #112"
                            subtitle="Ready for delivery pickup · Zomato driver assigned"
                            progress={100}
                            progressLabel="Packed"
                          />
                        </div>

                        <BottomTabBar
                          items={[
                            { id: 'today', label: 'Today', icon: <LayoutDashboard className="h-4 w-4" /> },
                            { id: 'orders', label: 'Orders', icon: <CreditCard className="h-4 w-4" />, badge: 4 },
                            { id: 'add', label: 'Quick Bill', icon: <Plus className="h-5 w-5" />, isPrimaryAction: true },
                            { id: 'menu', label: 'Menu', icon: <Utensils className="h-4 w-4" /> },
                            { id: 'more', label: 'More', icon: <Palette className="h-4 w-4" /> },
                          ]}
                          activeId="today"
                          className="absolute bottom-3 inset-x-3 sm:inset-x-3 sm:left-auto sm:translate-x-0"
                        />
                      </div>
                    </div>
                  )}

                  {showcaseScreen === 'D4' && (
                    <div className="flex justify-center p-4">
                      <div className="w-full max-w-[390px] min-h-[700px] bg-[#14171C] text-[#F2F4F7] rounded-[44px] shadow-2xl border-8 border-[#1B1F25] flex flex-col overflow-hidden relative">
                        <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-white/10">
                          <div>
                            <h3 className="font-bold text-base text-white">Waiter Stand (D4)</h3>
                            <p className="text-[11px] text-[var(--color-text-muted)]">Server: Rahul · Station B</p>
                          </div>
                          <Badge variant="outline" className="text-[10px]">6 Assigned</Badge>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">My Active Tables</h4>

                          <BottomSheet>
                            <BottomSheetTrigger asChild>
                              <div className="cursor-pointer">
                                <ActionCard
                                  title="Table 4 · 4 Guests"
                                  subtitle="Order #108 · 12m elapsed · ₹2,450"
                                  status={<Badge variant="warning">Billing Ready</Badge>}
                                  highlighted
                                />
                              </div>
                            </BottomSheetTrigger>
                            <BottomSheetContent>
                              <BottomSheetHeader>
                                <BottomSheetTitle>Table 4 · Order #108</BottomSheetTitle>
                                <BottomSheetDescription>
                                  Seated 4 guests · Started 19:45 · Bill total ₹2,450 incl. GST
                                </BottomSheetDescription>
                              </BottomSheetHeader>
                              <div className="space-y-2 py-2 text-xs">
                                <div className="flex justify-between py-1 border-b border-white/10">
                                  <span>2x Murgh Tikka Masala</span>
                                  <span className="font-semibold">₹1,300</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-white/10">
                                  <span>1x Dal Makhani</span>
                                  <span className="font-semibold">₹420</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-white/10">
                                  <span>4x Butter Naan</span>
                                  <span className="font-semibold">₹360</span>
                                </div>
                              </div>
                              <BottomSheetFooter>
                                <Button variant="primary" className="w-full rounded-full">
                                  Print Bill & Settle
                                </Button>
                              </BottomSheetFooter>
                            </BottomSheetContent>
                          </BottomSheet>

                          <ActionCard
                            title="Table 2 · 2 Guests"
                            subtitle="Order #109 · Mains Cooking · 6m elapsed"
                            status={<Badge variant="outline">In Prep</Badge>}
                          />

                          <ActionCard
                            title="Table 6 · Reserved (20:30)"
                            subtitle="Party of 6 · Sharma Birthday"
                            status={<Badge variant="secondary">Reserved</Badge>}
                          />
                        </div>

                        <BottomTabBar
                          items={[
                            { id: 'tables', label: 'Tables', icon: <LayoutDashboard className="h-4 w-4" /> },
                            { id: 'orders', label: 'Orders', icon: <CreditCard className="h-4 w-4" />, badge: 2 },
                            { id: 'take', label: 'Take Order', icon: <Plus className="h-5 w-5" />, isPrimaryAction: true },
                            { id: 'kds', label: 'Kitchen', icon: <ChefHat className="h-4 w-4" /> },
                            { id: 'profile', label: 'Profile', icon: <Palette className="h-4 w-4" /> },
                          ]}
                          activeId="tables"
                          className="absolute bottom-3 inset-x-3 sm:inset-x-3 sm:left-auto sm:translate-x-0"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </AppShell>
    </div>
  );
}
