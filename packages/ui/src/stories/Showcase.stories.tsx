import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  AppShell,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  HeroStat,
  StatStrip,
  PillNav,
  ListRowLink,
  ActivityFeed,
  SegmentedControl,
  Switch,
  Label,
  LiveStatusBar,
  MenuItemCard,
  QuantityStepper,
  Stepper,
  DangerousAction,
  CopyOnceSecret,
  ProgressBar,
  MeterRow,
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
  Banner,
  EmptyState,
  ErrorState,
  Skeleton,
} from '../components';
import { LollipopChart } from '../charts/lollipop-chart';
import { ComparisonLineChart } from '../charts/comparison-line-chart';
import { HourlyBarChart } from '../charts/hourly-bar-chart';
import {
  LayoutDashboard,
  Building,
  Key,
  Shield,
  CreditCard,
  Settings,
  Terminal,
  Utensils,
  AlertTriangle,
  RotateCw,
  RefreshCw,
  Check,
  Lock,
  Clock,
  Sparkles,
  Inbox,
  AlertCircle,
  CheckCircle2,
  Trash2,
  ChefHat,
  Bell,
  Coffee,
  Plus,
} from 'lucide-react';
import { formatINR } from '../i18n';

const meta: Meta = {
  title: 'Showcase/Visual Language 7B.1',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

// ─── A1. Operator Console Overview (Dark Mood, Desktop) ───
export const A1_OperatorConsoleOverview: StoryObj = {
  name: 'A1: Operator Console Overview (Dark, Desktop)',
  render: () => (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <AppShell
        appName="OrbitoX Operator"
        navItems={[
          { id: 'overview', label: 'Overview', href: '#', icon: <LayoutDashboard className="h-4 w-4" />, active: true },
          { id: 'orgs', label: 'Organizations', href: '#', icon: <Building className="h-4 w-4" /> },
          { id: 'provisioning', label: 'Provisioning', href: '#', icon: <Terminal className="h-4 w-4" />, badge: <span className="h-2 w-2 rounded-full bg-[var(--color-warning)]" /> },
          { id: 'security', label: 'Security & Keys', href: '#', icon: <Key className="h-4 w-4" /> },
          { id: 'billing', label: 'Billing', href: '#', icon: <CreditCard className="h-4 w-4" /> },
          { id: 'settings', label: 'Appearance', href: '#', icon: <Settings className="h-4 w-4" /> },
        ]}
        pluginNavItems={[
          { id: 'restaurant-os', label: 'RestaurantOS', href: '#' },
          { id: 'hms', label: 'Hospitality HMS', href: '#' },
        ]}
        bottomCard={
          <div className="rounded-[var(--radius-row)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--color-warning)]">STAGING</span>
              <span className="text-[10px] text-[var(--color-text-muted)]">v1.4.0</span>
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Cluster: ap-south-1 (Mumbai)</p>
          </div>
        }
      >
        <div className="space-y-8 max-w-6xl mx-auto py-2">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
                Fleet Operations & Telemetry
              </h1>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                Real-time tenant health, revenue throughput, and provisioning state.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" className="rounded-full">
                Refresh telemetry
              </Button>
              <Button variant="primary" size="sm" className="rounded-full">
                Provision new tenant
              </Button>
            </div>
          </div>

          {/* Top Hero Stat & StatStrip */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <HeroStat
                label="Monthly Platform ARR"
                value="₹42.8M"
                subtext="Across 1,248 active enterprise tenants"
                trend={{ value: '+18.4% vs last mo', direction: 'up' }}
              />
            </div>
            <div className="lg:col-span-2 flex flex-col justify-center">
              <StatStrip
                stats={[
                  { label: 'Active Tenants', value: '1,248', trend: { value: '+24 new', direction: 'up' } },
                  { label: 'API Calls (24h)', value: '184.2M', trend: { value: '99.98% ok', direction: 'up' } },
                  { label: 'P95 Latency', value: '14.2ms', trend: { value: '-2.1ms', direction: 'up' } },
                  { label: 'Failed Jobs', value: '2', trend: { value: 'Requires retry', direction: 'down' } },
                ]}
              />
            </div>
          </div>

          {/* Lollipop Daily Velocity Chart & Activity Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <LollipopChart
                title="Daily Transaction Throughput"
                description="Cluster-wide processed orders across all active restaurant & HMS tenants"
                data={[
                  { label: 'Mon', value: 42000 },
                  { label: 'Tue', value: 58000 },
                  { label: 'Wed', value: 51000 },
                  { label: 'Thu', value: 74000 },
                  { label: 'Fri', value: 92000 },
                  { label: 'Sat', value: 128000, isSelected: true },
                  { label: 'Sun', value: 114000 },
                ]}
                valueFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
              />
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">System Audit Trail</CardTitle>
                  <CardDescription>Tamper-evident administrative logs</CardDescription>
                </CardHeader>
                <CardContent>
                  <ActivityFeed
                    items={[
                      {
                        id: '1',
                        actor: 'Operator Maya',
                        action: 'rotated production signing keypair for @orbitox/hms',
                        tag: 'Security',
                        time: '8m ago',
                      },
                      {
                        id: '2',
                        actor: 'Saga Engine',
                        action: 'provisioned PostgreSQL tenant db for Taj Hospitality',
                        tag: 'DB',
                        time: '24m ago',
                      },
                      {
                        id: '3',
                        actor: 'Auth Guard',
                        action: 'blocked anomalous token request from CIDR 194.26.29.0/24',
                        tag: 'WAF',
                        time: '1h ago',
                      },
                    ]}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Highlighted Tenants List */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold tracking-wide uppercase text-[var(--color-text-muted)]">
              Tenants Requiring Attention
            </h3>
            <div className="space-y-2">
              <ListRowLink
                title="Grand Hyatt Regency (Mumbai)"
                subtitle="Tenant ID: tenant_hyatt_bom · Domain: hyatt.mumbai.orbitox.net"
                status="good"
                badge="Active"
                highlighted
              />
              <ListRowLink
                title="Bandra Kitchens Fleet"
                subtitle="Tenant ID: tenant_bandra_bom · Rate limit budget 94% exhausted"
                status="warning"
                badge="High Quota"
              />
              <ListRowLink
                title="Oasis Medical Center"
                subtitle="Tenant ID: tenant_oasis_blr · Grace period expired (30d overdue)"
                status="problem"
                badge="Action Required"
              />
            </div>
          </div>
        </div>
      </AppShell>
    </div>
  ),
};

// ─── A2. Customer Dashboard Home (Light Mood, Desktop) ───
export const A2_CustomerDashboardHome: StoryObj = {
  name: 'A2: Customer Dashboard Home (Light, Desktop)',
  render: () => (
    <div className="min-h-screen bg-[#EEF1F5] text-[var(--color-text)] p-4 sm:p-8" data-theme="light">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Bar with Brand & PillNav */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--near-black)] text-white font-bold text-sm">
              OX
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text)]">Bukhara Tandoor & Grill</h2>
              <p className="text-xs text-[var(--color-text-muted)]">Organization: ITC Hospitality · Plan: Growth</p>
            </div>
          </div>

          <PillNav
            items={[
              { id: 'today', label: 'Today', active: true },
              { id: 'orders', label: 'Orders', badge: '12' },
              { id: 'menu', label: 'Menu & Dishes' },
              { id: 'tables', label: 'Floors & Tables' },
              { id: 'billing', label: 'Billing & Plan' },
              { id: 'settings', label: 'Settings' },
            ]}
          />
        </header>

        {/* Live Status Bar */}
        <LiveStatusBar
          icon={<Utensils className="h-4 w-4" />}
          title="Service Active: Dinner Rush"
          subtitle="24 orders in prep · 6 ready for pickup · Average prep time: 14 min"
          actionLabel="Open KDS Screen"
          onAction={() => alert('Opening KDS...')}
        />

        {/* Hero Revenue Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1 shadow-lg border-[var(--color-border)]">
            <CardHeader className="pb-2">
              <CardDescription>Today's Net Gross</CardDescription>
              <CardTitle className="text-4xl font-light tracking-tight text-[var(--color-text)]">
                ₹84,250
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant="success">+14.2%</Badge>
                <span className="text-xs text-[var(--color-text-muted)]">vs last Saturday at this hour</span>
              </div>
              <div className="mt-6 pt-4 border-t border-[var(--color-border)] grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[var(--color-text-muted)]">Dine-in (78%)</span>
                  <p className="font-semibold text-sm mt-0.5">₹65,715</p>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)]">Takeaway (22%)</span>
                  <p className="font-semibold text-sm mt-0.5">₹18,535</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Meter Row Progress Cards */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Resource Consumption & Quotas</CardTitle>
              <CardDescription>Current billing cycle utilization against Growth plan limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <MeterRow
                label="API Order Bandwidth"
                value="48,210 / 50,000 req"
                percent={96}
                helper="Threshold warning: consider upgrading to Pro Tier to prevent throttling."
              />
              <MeterRow
                label="Custom Menu Photos Storage"
                value="1.4 GB / 5 GB"
                percent={28}
                helper="Fast CDN delivery enabled across India regions."
              />
              <MeterRow
                label="Staff Accounts"
                value="12 / 20 seats"
                percent={60}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  ),
};

// ─── A3. Appearance Settings (Interactive, Desktop) ───
export const A3_AppearanceSettings: StoryObj = {
  name: 'A3: Appearance Settings (Interactive, Desktop)',
  render: () => {
    const [theme, setTheme] = React.useState('dark');
    const [accent, setAccent] = React.useState('ocean');
    const [density, setDensity] = React.useState('standard');
    const [radius, setRadius] = React.useState(28);
    const [smoothMotion, setSmoothMotion] = React.useState(true);
    const [boldFocus, setBoldFocus] = React.useState(false);

    const presets = [
      { id: 'ocean', name: 'Ocean', colorClass: 'bg-[#3D6EF5]' },
      { id: 'emerald', name: 'Emerald', colorClass: 'bg-[#047857]' },
      { id: 'sunflower', name: 'Sunflower', colorClass: 'bg-[#F59E0B]' },
      { id: 'saffron', name: 'Saffron', colorClass: 'bg-[#C2410C]' },
      { id: 'ruby', name: 'Ruby', colorClass: 'bg-[#E11D48]' },
      { id: 'coral', name: 'Coral', colorClass: 'bg-[#D9381E]' },
      { id: 'violet', name: 'Violet', colorClass: 'bg-[#7C3AED]' },
      { id: 'teal', name: 'Teal', colorClass: 'bg-[#0F766E]' },
    ];

    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] p-6 sm:p-12">
        <div className="max-w-2xl mx-auto space-y-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
              Appearance & Personalization
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Configure your workspace display mood, brand accent, and spatial density.
            </p>
          </div>

          {/* Theme Mode Segmented */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Color Mood</CardTitle>
              <CardDescription>Select operator console dark mode, daylight mode, or match system.</CardDescription>
            </CardHeader>
            <CardContent>
              <SegmentedControl
                options={[
                  { id: 'auto', label: 'Auto (System)' },
                  { id: 'dark', label: 'Dark (Console default)' },
                  { id: 'light', label: 'Light (Customer default)' },
                ]}
                value={theme}
                onChange={setTheme}
              />
            </CardContent>
          </Card>

          {/* Accent Presets */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Accent Preset (8 Curated Colors)</CardTitle>
              <CardDescription>
                High-contrast WCAG 2.2 AA certified accent palettes for primary buttons and active indicators.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {presets.map((p) => {
                  const isSelected = accent === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setAccent(p.id)}
                      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-full border text-xs font-medium transition-all cursor-pointer ${isSelected
                          ? 'border-[var(--color-primary)] bg-[var(--color-surface-raised)] ring-2 ring-[var(--color-primary)]/30 text-[var(--color-text)]'
                          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)]'
                        }`}
                    >
                      <span className={`h-3.5 w-3.5 rounded-full shrink-0 shadow-xs ${p.colorClass}`} />
                      <span className="truncate">{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Spacing Density */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Spacing Density</CardTitle>
              <CardDescription>Scale whitespace padding across cards, tables, and navigation.</CardDescription>
            </CardHeader>
            <CardContent>
              <SegmentedControl
                options={[
                  { id: 'compact', label: 'Compact (0.65x)' },
                  { id: 'standard', label: 'Standard (1.0x)' },
                  { id: 'relaxed', label: 'Relaxed (1.25x)' },
                ]}
                value={density}
                onChange={setDensity}
              />
            </CardContent>
          </Card>

          {/* Corner Radius Slider */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Corner Radius: {radius}px</CardTitle>
              <CardDescription>Geometric card rounding (4px to 32px in steps of 4px).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                type="range"
                aria-label="Corner radius slider"
                min={4}
                max={32}
                step={4}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full accent-[var(--color-primary)] cursor-pointer"
              />
              <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                <span>4px (Sharp)</span>
                <span>16px (Subtle)</span>
                <span className="font-bold text-[var(--color-text)]">28px (Master Look)</span>
                <span>32px (Hero)</span>
              </div>
            </CardContent>
          </Card>

          {/* Accessibility Toggles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Accessibility & Motion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="smooth-anim" className="text-sm font-semibold">Smooth Animations</Label>
                  <p className="text-xs text-[var(--color-text-muted)]">Disable to set all transition durations to 0ms</p>
                </div>
                <Switch id="smooth-anim" checked={smoothMotion} onCheckedChange={setSmoothMotion} />
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
                <div>
                  <Label htmlFor="bold-focus" className="text-sm font-semibold">Bold Focus Rings</Label>
                  <p className="text-xs text-[var(--color-text-muted)]">High-visibility 3px keyboard outline</p>
                </div>
                <Switch id="bold-focus" checked={boldFocus} onCheckedChange={setBoldFocus} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  },
};

// ─── A4. Diner Template "Saffron" (Phone, Tenant) ───
export const A4_DinerTemplateSaffron: StoryObj = {
  name: 'A4: Diner Template "Saffron" (Phone, Tenant)',
  render: () => (
    <div className="min-h-screen bg-[#FDF8F5] text-[#2A1810] flex justify-center py-6 px-4">
      {/* Phone Mockup Frame */}
      <div className="w-full max-w-[390px] min-h-[720px] bg-[#FFFFFF] rounded-[44px] shadow-2xl border-8 border-[#2A1810] flex flex-col overflow-hidden relative">
        {/* Dynamic Island Header */}
        <div className="bg-[#FFFFFF] px-6 pt-4 pb-3 flex items-center justify-between border-b border-[#F0E4DC]">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[#C2410C] text-white flex items-center justify-center font-bold text-xs">
              S
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#2A1810]">Saffron Tandoor</h3>
              <p className="text-[10px] text-[#8C6D5E]">Table 4 · Dine-In</p>
            </div>
          </div>
          <Badge className="bg-[#C2410C]/10 text-[#9A3412] border-none font-semibold text-[10px]">
            Live Menu
          </Badge>
        </div>

        {/* Live Status Bar */}
        <div className="p-3">
          <LiveStatusBar
            icon={<Clock className="h-3.5 w-3.5 text-white" />}
            title="Kitchen preparing your order"
            subtitle="Order #108 · 3 items · Est. 12 mins"
          />
        </div>

        {/* Menu Items List */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C6D5E]">Chef Recommendations</h4>
            <span className="text-[10px] text-[#9A3412] font-semibold">Veg & Non-Veg</span>
          </div>

          <MenuItemCard
            title="Saffron Murgh Dum Biryani"
            description="Aged basmati rice slow-cooked with tender chicken, brown onions, pure Kashmiri saffron."
            pricePaise={65000}
            tags={['Signature', 'Spicy']}
            onAdd={() => alert('Added Biryani')}
          />

          <MenuItemCard
            title="Paneer Tikka Kastoori"
            description="Charcoal-smoked cottage cheese cubes marinated in yellow chili, mustard and fenugreek."
            pricePaise={49000}
            tags={['Vegetarian', 'Tandoor']}
            onAdd={() => alert('Added Paneer Tikka')}
          />

          <MenuItemCard
            title="Dal Bukhara Slow-Simmered"
            description="Overnight simmered whole black lentils with fresh tomato puree and white butter."
            pricePaise={42000}
            tags={['Classic', 'Vegetarian']}
            onAdd={() => alert('Added Dal')}
          />
        </div>

        {/* Floating Bottom Cart Pill */}
        <div className="p-4 bg-gradient-to-t from-white via-white to-transparent">
          <button
            type="button"
            className="w-full flex items-center justify-between py-3.5 px-6 rounded-full bg-[#C2410C] text-white font-semibold text-sm shadow-lg shadow-[#C2410C]/30 hover:brightness-110 active:scale-98 transition-all cursor-pointer"
          >
            <span>View Cart (3 items)</span>
            <span>₹1,560 incl. GST</span>
          </button>
        </div>
      </div>
    </div>
  ),
};

// ─── C2. Tenant Detail + Suspend Dialog (Dark, Desktop) ───
export const C2_TenantDetailWithSuspend: StoryObj = {
  name: 'C2: Tenant Detail & Dangerous Action Suspend (Dark, Desktop)',
  render: () => {
    const [isSuspendOpen, setIsSuspendOpen] = React.useState(true);

    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">Oasis Medical Center</h1>
                <Badge variant="destructive">OVERDUE BILLING</Badge>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Tenant ID: tenant_oasis_blr · Custom Domain: portal.oasismedical.in
              </p>
            </div>

            <DangerousAction
              trigger={
                <Button variant="destructive" size="sm" className="rounded-full">
                  Suspend Tenant
                </Button>
              }
              title="Suspend Tenant Environment"
              description="Suspending this tenant will immediately return 402 PAYMENT_REQUIRED on all external API requests, disable POS write transactions, and revoke operator API tokens. Hospital patient telemetry will fail closed."
              expectedConfirmationText="SUSPEND"
              requireReason
              confirmButtonLabel="Suspend Tenant"
              onConfirm={async ({ reason }) => {
                alert(`Tenant suspended for audited reason: ${reason}`);
              }}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tenant Isolation & Database Topology</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[var(--color-text-muted)]">Database Engine</span>
                  <p className="font-semibold text-sm">PostgreSQL 16 (Row-Level Security Scoped)</p>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)]">Cryptographic PHI Ring</span>
                  <p className="font-semibold text-sm">AES-256-GCM Active (Key ID: phi_k2_live)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  },
};

// ─── C4. Provisioning Job Timeline (Dark, Desktop) ───
export const C4_ProvisioningJobTimeline: StoryObj = {
  name: 'C4: Provisioning Job Timeline (Dark, Desktop)',
  render: () => (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight">Provisioning Job: op_7a2_e04f21</h1>
              <Badge variant="destructive">FAILED AT STEP 3</Badge>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Pipeline: Automated Multi-Tenant RLS & Custom Domain Routing
            </p>
          </div>

          <Button variant="primary" size="sm" className="rounded-full">
            <RotateCw className="h-4 w-4 mr-1.5" /> Retry Failed Step
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Async Saga Execution Steps</CardTitle>
            <CardDescription>
              Crash-durability verified step execution with compensation rollback guarantees.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Stepper
              orientation="vertical"
              items={[
                {
                  id: 'step-1',
                  title: 'Allocate Tenant Cryptographic Keys',
                  description: 'Generated Ed25519 signing keypair and AES-256-GCM PHI ring.',
                  status: 'done',
                },
                {
                  id: 'step-2',
                  title: 'Provision PostgreSQL 16 Isolated Schema',
                  description: 'Executed additive migrations and configured zero-trust RLS tenant policies.',
                  status: 'done',
                },
                {
                  id: 'step-3',
                  title: 'Verify CNAME DNS Record Propagation',
                  description: 'Domain portal.oasismedical.in returned SERVFAIL. DNS records not yet propagated.',
                  status: 'failed',
                },
                {
                  id: 'step-4',
                  title: 'Activate Entitlement Grants and Issue Operator Token',
                  description: 'Waiting for upstream verification step to complete.',
                  status: 'waiting',
                },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  ),
};

// ─── C6. Security & Keys (Dark, Desktop) ───
export const C6_SecurityAndKeys: StoryObj = {
  name: 'C6: Security & Keys (Dark, Desktop)',
  render: () => {
    const [rotatedSecret, setRotatedSecret] = React.useState<string | null>(
      'orb_live_sec_89a3f20b841cd4091e77ba331c9441df8021'
    );

    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Cryptographic Security & API Keys</h1>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Zero-trust authentication credentials with volatile memory wipe and single-reveal security.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              className="rounded-full"
              onClick={() => setRotatedSecret('orb_live_sec_' + Math.random().toString(16).slice(2))}
            >
              Rotate Keypair
            </Button>
          </div>

          {/* Copy Once Secret Panel */}
          {rotatedSecret && (
            <CopyOnceSecret
              secret={rotatedSecret}
              label="Production Ed25519 Signing Secret"
              onDismiss={() => setRotatedSecret(null)}
            />
          )}

          {/* Key List Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Active Operator Keypairs</CardTitle>
              <CardDescription>Managed cryptographic identities across cluster</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <ListRowLink
                  title="Cluster Root Signing Key (k1)"
                  subtitle="Key ID: key_root_ed25519 · SHA-256: 7f83b1657ff1... · Created 12 days ago"
                  status="good"
                  badge="Active"
                />
                <ListRowLink
                  title="Staging Sandbox Key (k2)"
                  subtitle="Key ID: key_stage_ed25519 · SHA-256: 3c99021da491... · Rotated yesterday"
                  status="good"
                  badge="Active"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  },
};

// ─── P1. Pop-ups, Toasts, Banners & States (Light/Dark) ───
export const P1_PopupsToastsBannersAndStates: StoryObj = {
  name: 'P1: Pop-ups, Toasts, Banners & States',
  render: () => (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Feedback & Edge States (P1)</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Standard banners, toasts, empty states, error fallbacks, and skeleton loading cards.
          </p>
        </div>

        {/* 1. Banners */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Banners</h3>
          <Banner
            variant="warning"
            title="Scheduled Maintenance Notice"
            description="OrbitoX platform database upgrades scheduled for Sunday 02:00–02:30 UTC. Read-only fallback will be active."
          />
          <Banner
            variant="info"
            title="RestaurantOS v1.4.0 Live"
            description="New lollipop throughput charts and FSSAI dietary badges are now available on all diner templates."
          />
        </div>

        {/* 2. Toast Mockup */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Toast Notification Pill</h3>
          <div className="flex items-center justify-between p-3.5 rounded-full bg-[var(--near-black)] text-white shadow-xl max-w-md border border-white/10">
            <div className="flex items-center gap-2.5 px-2">
              <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
              <span className="text-xs font-medium">Theme updated · saved to your account</span>
            </div>
            <button type="button" className="text-xs text-white/70 hover:text-white px-2 cursor-pointer">
              Dismiss
            </button>
          </div>
        </div>

        {/* 3. Empty & Error States */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                message="Unable to reach Prometheus cluster in ap-south-1. Reconnecting with exponential backoff..."
                onRetry={() => alert('Retrying connection...')}
              />
            </CardContent>
          </Card>
        </div>

        {/* 4. Skeleton Loading State */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Skeleton Loading State</h3>
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
    </div>
  ),
};

// ─── S1. Kitchen Screen (Tablet Landscape, Dark) ───
export const S1_KitchenScreen: StoryObj = {
  name: 'S1: Kitchen Screen (Tablet Landscape, Dark)',
  render: () => (
    <div className="min-h-[700px] bg-[#0D0F12] text-[#F2F4F7] p-6 select-none" data-theme="dark">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* KDS Header */}
        <header className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
              <ChefHat className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Kitchen Display Station (KDS)</h2>
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

        {/* 3 Ticket Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Priority Ticket */}
          <div className="rounded-[28px] border-2 border-[var(--color-danger)]/50 bg-[#14171C] p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Overdue (22m)</span>
                <h3 className="text-lg font-bold text-white">Order #104 · Table 4</h3>
              </div>
              <RingTimer totalSeconds={900} elapsedSeconds={1320} size="md" />
            </div>

            <div className="space-y-3 pt-2 border-t border-white/10 text-xs">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <VegMark type="non-veg" size="sm" />
                  <span className="font-semibold text-white">2x Murgh Tikka Masala</span>
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

            <Button variant="primary" className="w-full rounded-full min-h-[52px] text-sm font-bold shadow-md">
              Mark Order Ready (Bump)
            </Button>
          </div>

          {/* Column 2: In-Progress Ticket */}
          <div className="rounded-[28px] border border-white/10 bg-[#14171C] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-warning)]">Preparing (8m)</span>
                <h3 className="text-lg font-bold text-white">Order #105 · Table 8</h3>
              </div>
              <RingTimer totalSeconds={900} elapsedSeconds={480} size="md" />
            </div>

            <div className="space-y-3 pt-2 border-t border-white/10 text-xs">
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

            <Button variant="secondary" className="w-full rounded-full min-h-[52px] text-sm font-bold">
              Mark Order Ready
            </Button>
          </div>

          {/* Column 3: New Ticket */}
          <div className="rounded-[28px] border border-white/10 bg-[#14171C] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-success)]">Just Arrived</span>
                <h3 className="text-lg font-bold text-white">Order #106 · Takeaway</h3>
              </div>
              <RingTimer totalSeconds={900} elapsedSeconds={60} size="md" />
            </div>

            <div className="space-y-3 pt-2 border-t border-white/10 text-xs">
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

            <Button variant="secondary" className="w-full rounded-full min-h-[52px] text-sm font-bold">
              Start Preparation
            </Button>
          </div>
        </div>
      </div>
    </div>
  ),
};

// ─── D1. Owner Phone: Today (Phone, Light) ───
export const D1_OwnerPhoneToday: StoryObj = {
  name: 'D1: Owner Phone: Today (Phone, Light)',
  render: () => (
    <div className="min-h-screen bg-[#EEF1F5] flex justify-center py-6 px-4" data-theme="light">
      <div className="w-full max-w-[390px] min-h-[740px] bg-white rounded-[44px] shadow-2xl border-8 border-[#14161A] flex flex-col overflow-hidden relative">
        {/* Top Header */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-[#E2E8F0]">
          <div>
            <h3 className="font-bold text-base text-[#14161A]">Today's Performance</h3>
            <p className="text-[11px] text-[#5A6170]">Saturday, 12 Nov · Bukhara</p>
          </div>
          <button type="button" aria-label="Notifications" className="p-2 rounded-full hover:bg-black/5 cursor-pointer">
            <Bell className="h-4 w-4 text-[#14161A]" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">
          <HeroStat
            label="Gross Today"
            value="₹72,400"
            subtext="148 orders fulfilled"
            trend={{ value: '+16.2% vs yesterday', direction: 'up' }}
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

        {/* Floating Pill Bottom Tab Bar */}
        <BottomTabBar
          items={[
            { id: 'today', label: 'Today', icon: <LayoutDashboard className="h-4 w-4" /> },
            { id: 'orders', label: 'Orders', icon: <CreditCard className="h-4 w-4" />, badge: 4 },
            { id: 'add', label: 'Quick Bill', icon: <Plus className="h-5 w-5" />, isPrimaryAction: true },
            { id: 'menu', label: 'Menu', icon: <Utensils className="h-4 w-4" /> },
            { id: 'more', label: 'More', icon: <Settings className="h-4 w-4" /> },
          ]}
          activeId="today"
          className="absolute bottom-3 inset-x-3"
        />
      </div>
    </div>
  ),
};

// ─── D4. Waiter Phone: My Tables (Phone, Dark) ───
export const D4_WaiterPhoneMyTables: StoryObj = {
  name: 'D4: Waiter Phone: My Tables (Phone, Dark)',
  render: () => {
    const [selectedTable, setSelectedTable] = React.useState<string | null>('T4');

    return (
      <div className="min-h-screen bg-[#0D0F12] flex justify-center py-6 px-4" data-theme="dark">
        <div className="w-full max-w-[390px] min-h-[740px] bg-[#14171C] text-[#F2F4F7] rounded-[44px] shadow-2xl border-8 border-[#1B1F25] flex flex-col overflow-hidden relative">
          {/* Waiter Header */}
          <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-white/10">
            <div>
              <h3 className="font-bold text-base text-white">Waiter Service Stand</h3>
              <p className="text-[11px] text-[var(--color-text-muted)]">Server: Rahul · Station B</p>
            </div>
            <Badge variant="outline" className="text-[10px]">6 Assigned Tables</Badge>
          </div>

          {/* Active Tables List */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">My Active Tables</h4>

            <BottomSheet>
              <BottomSheetTrigger asChild>
                <button type="button" className="w-full text-left cursor-pointer p-0 border-0 bg-transparent">
                  <ActionCard
                    title="Table 4 · 4 Guests"
                    subtitle="Order #108 · 12m elapsed · ₹2,450"
                    status={<Badge variant="warning">Billing Ready</Badge>}
                    highlighted
                  />
                </button>
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

          {/* Floating Pill Bottom Tab Bar */}
          <BottomTabBar
            items={[
              { id: 'tables', label: 'Tables', icon: <LayoutDashboard className="h-4 w-4" /> },
              { id: 'orders', label: 'Orders', icon: <CreditCard className="h-4 w-4" />, badge: 2 },
              { id: 'take', label: 'Take Order', icon: <Plus className="h-5 w-5" />, isPrimaryAction: true },
              { id: 'kds', label: 'Kitchen', icon: <ChefHat className="h-4 w-4" /> },
              { id: 'profile', label: 'Profile', icon: <Settings className="h-4 w-4" /> },
            ]}
            activeId="tables"
            className="absolute bottom-3 inset-x-3"
          />
        </div>
      </div>
    );
  },
};
