'use client';

import * as React from 'react';
import { notFound } from 'next/navigation';
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
  formatINR,
  formatRelative,
  LineChart,
  DonutChart,
  type ServerErrorPayload,
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
} from 'lucide-react';

// Access gate check (client-side guard; server config protects build)
const isDevOrStaging =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_APP_ENV === 'staging' ||
  process.env.ORBITOX_ENV === 'staging';

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

const MOCK_BRANCHES: BranchRecord[] = [
  { id: 'BR-001', name: 'Koramangala Flagship', location: 'Bengaluru, KA', status: 'active', turnoverPaise: 125000000, lastActive: Date.now() - 120000, activeOrders: 18 },
  { id: 'BR-002', name: 'Indiranagar Hub', location: 'Bengaluru, KA', status: 'active', turnoverPaise: 84500000, lastActive: Date.now() - 3600000, activeOrders: 12 },
  { id: 'BR-003', name: 'Bandra West Dining', location: 'Mumbai, MH', status: 'active', turnoverPaise: 215000000, lastActive: Date.now() - 7200000, activeOrders: 29 },
  { id: 'BR-004', name: 'Connaught Place Central', location: 'New Delhi, DL', status: 'pending', turnoverPaise: 32000000, lastActive: Date.now() - 86400000, activeOrders: 0 },
  { id: 'BR-005', name: 'Hitec City Express', location: 'Hyderabad, TS', status: 'suspended', turnoverPaise: 65000000, lastActive: Date.now() - 604800000, activeOrders: 0 },
  { id: 'BR-006', name: 'Salt Lake Sector V', location: 'Kolkata, WB', status: 'active', turnoverPaise: 74000000, lastActive: Date.now() - 1800000, activeOrders: 15 },
  { id: 'BR-007', name: 'Anna Nagar Bistro', location: 'Chennai, TN', status: 'active', turnoverPaise: 91000000, lastActive: Date.now() - 14400000, activeOrders: 22 },
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

export default function DesignSystemConsolePage() {
  if (!isDevOrStaging) {
    notFound();
  }

  // Brand Palette state (Option A vs Option B)
  const [brandPalette, setBrandPalette] = React.useState<'titanium-slate' | 'obsidian-amber'>('titanium-slate');
  const [themeMode, setThemeMode] = React.useState<'dark' | 'light'>('dark');

  // Table State
  const [branches] = React.useState(MOCK_BRANCHES);
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [selectedBranchIds, setSelectedBranchIds] = React.useState<string[]>([]);

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

  // Toggle Theme mode on root
  const toggleTheme = () => {
    const next = themeMode === 'dark' ? 'light' : 'dark';
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
          {formatRelative(row.original.lastActive)}
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
          { id: 'design', label: 'Design System', href: '/console/_design', icon: <Palette className="h-4 w-4" />, active: true },
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
            <TabsList className="grid grid-cols-4 w-full max-w-2xl">
              <TabsTrigger value="data-table">DataTable & Actions</TabsTrigger>
              <TabsTrigger value="forms">Form & Server Errors</TabsTrigger>
              <TabsTrigger value="security">Security & PHI</TabsTrigger>
              <TabsTrigger value="charts">Visualizations</TabsTrigger>
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
                      secret="sk_stage_orb_99887766554433221100"
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
          </Tabs>
        </div>
      </AppShell>
    </div>
  );
}
