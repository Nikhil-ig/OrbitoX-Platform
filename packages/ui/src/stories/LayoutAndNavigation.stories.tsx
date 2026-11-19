import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AppShell } from '../components/app-shell';
import { PageHeader } from '../components/page-header';
import { StatCard } from '../components/stat-card';
import { DescriptionList } from '../components/description-list';
import { Timeline } from '../components/timeline';
import { Stepper } from '../components/stepper';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/tabs';
import { CommandPalette } from '../components/command-palette';
import { Button } from '../components/button';
import { SegmentedControl } from '../components/segmented-control';
import { HeroStat, StatStrip } from '../components/hero-stat';
import { PillNav } from '../components/pill-nav';
import { ListRowLink } from '../components/list-row-link';
import { ActivityFeed } from '../components/activity-feed';
import { BottomTabBar } from '../components/bottom-tab-bar';
import { BottomSheet, BottomSheetTrigger, BottomSheetContent, BottomSheetHeader, BottomSheetTitle, BottomSheetDescription, BottomSheetFooter } from '../components/bottom-sheet';
import { ActionCard } from '../components/action-card';
import { SwipeActions } from '../components/swipe-actions';
import { LayoutDashboard, Settings, Users, CreditCard, Terminal, Sparkles, Building, Key, CheckCircle2, Trash2 } from 'lucide-react';
import { formatINR } from '../format';

const meta: Meta = {
  title: 'Components/Layout & Navigation',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

export const FullAppShellDemo: StoryObj = {
  render: () => (
    <AppShell
      appName="OrbitoX OS"
      navItems={[
        { id: 'dash', label: 'Dashboard', href: '#', icon: <LayoutDashboard className="h-4 w-4" />, active: true },
        { id: 'users', label: 'Staff & RBAC', href: '#', icon: <Users className="h-4 w-4" /> },
        { id: 'billing', label: 'Billing', href: '#', icon: <CreditCard className="h-4 w-4" /> },
        { id: 'settings', label: 'Settings', href: '#', icon: <Settings className="h-4 w-4" /> },
      ]}
      breadcrumbs={<span className="text-xs text-[var(--color-text-muted)]">Platform / Tenant Overview</span>}
      userMenu={<span className="text-xs font-medium">operator@orbitox.io</span>}
    >
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <PageHeader
          title="Branch Operations Overview"
          description="Monitor live revenue, tax invoices, and audit trails."
          actions={<Button size="sm">Export Audit Log</Button>}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Today's Gross"
            value={formatINR(8450000, { short: true })}
            change={{ value: '+12.5%', trend: 'up' }}
          />
          <StatCard
            label="Active Orders"
            value="42"
            change={{ value: 'Peak Hour', trend: 'neutral' }}
          />
          <StatCard
            label="Void Rate"
            value="0.4%"
            change={{ value: '-0.2%', trend: 'up' }}
          />
        </div>

        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Tenant Details</TabsTrigger>
            <TabsTrigger value="provisioning">Provisioning Timeline</TabsTrigger>
            <TabsTrigger value="onboarding">Onboarding Stepper</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="pt-4">
            <DescriptionList
              items={[
                { term: 'Tenant Slug', detail: 'diner-oasis-bengaluru' },
                { term: 'GSTIN', detail: '29 AAAAA 0000A 1 Z 5' },
                { term: 'Region', detail: 'ap-south-1 (Mumbai)' },
                { term: 'Compliance Tier', detail: 'Zero-Trust Hardened' },
              ]}
            />
          </TabsContent>

          <TabsContent value="provisioning" className="pt-4">
            <Timeline
              events={[
                { id: '1', title: 'Ed25519 Keypair Generated', timestamp: '10:02 IST', status: 'completed', description: 'Signed plugin manifest verified.' },
                { id: '2', title: 'Tenant Database Provisioned', timestamp: '10:03 IST', status: 'completed', description: 'Row-level isolation policy applied.' },
                { id: '3', title: 'TLS Certificate Issued', timestamp: '10:04 IST', status: 'in_progress', description: 'ACME challenge validating custom domain...' },
              ]}
            />
          </TabsContent>

          <TabsContent value="onboarding" className="pt-4">
            <Stepper
              activeStep={1}
              steps={[
                { id: 'kyc', title: 'Entity KYC', description: 'Verify GSTIN & PAN' },
                { id: 'domain', title: 'Domain Routing', description: 'Configure DNS CNAME' },
                { id: 'launch', title: 'Go Live', description: 'Activate terminals' },
              ]}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  ),
};

export const CommandPaletteDemo: StoryObj = {
  render: () => {
    const [open, setOpen] = React.useState(false);

    return (
      <div className="p-6 max-w-2xl space-y-4">
        <PageHeader
          title="Command Palette & Keyboard Navigation Showcase with Extended Multi-Tenant Breadcrumbs Truncation Handling"
          description="Press ⌘K / Ctrl+K or click below to open the role-filtered command palette."
          actions={
            <Button size="sm" variant="outline" icon={<Terminal className="h-4 w-4" />} onClick={() => setOpen(true)}>
              Open Command Palette
            </Button>
          }
        />

        <CommandPalette
          open={open}
          onOpenChange={setOpen}
          currentRole="operator"
          groups={[
            {
              group: 'Tenant Navigation',
              items: [
                {
                  id: 'tenants',
                  label: 'Browse Suspended Tenants',
                  description: 'Review compliance holds across ap-south-1',
                  shortcut: ['G', 'T'],
                  roles: ['operator', 'admin'],
                  onSelect: () => undefined,
                },
                {
                  id: 'rotate-keys',
                  label: 'Rotate Ed25519 Signing Key',
                  description: 'Issue new cryptographic plugin bundle key',
                  shortcut: ['⌘', 'R'],
                  roles: ['operator'],
                  onSelect: () => undefined,
                },
              ],
            },
          ]}
        />
      </div>
    );
  },
};

export const SegmentedControlDemo: StoryObj = {
  render: () => {
    const [val, setVal] = React.useState('standard');
    return (
      <div className="p-6 max-w-md space-y-4">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Segmented Control</h3>
        <SegmentedControl
          value={val}
          onChange={setVal}
          options={[
            { id: 'relaxed', label: 'Relaxed' },
            { id: 'standard', label: 'Standard' },
            { id: 'compact', label: 'Compact' },
          ]}
        />
      </div>
    );
  },
};

export const HeroStatDemo: StoryObj = {
  render: () => (
    <div className="p-6 max-w-3xl space-y-6">
      <HeroStat
        value="₹1,24,500"
        label="Today's live turnover"
        delta={{ value: '+18.4%', trend: 'up' }}
      />
      <StatStrip
        stats={[
          { label: 'Active Terminals', value: '142', delta: '+4' },
          { label: 'Diners Seated', value: '389', delta: '+12%' },
          { label: 'Avg Order Value', value: '₹640', delta: '+5%' },
        ]}
      />
    </div>
  ),
};

export const PillNavDemo: StoryObj = {
  render: () => {
    const [active, setActive] = React.useState('overview');
    return (
      <div className="p-6 max-w-2xl space-y-4">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Pill Navigation (Customer Mood)</h3>
        <PillNav
          activeId={active}
          onChange={setActive}
          items={[
            { id: 'overview', label: 'Overview' },
            { id: 'orders', label: 'Live Orders', badge: '12' },
            { id: 'menus', label: 'Menus & Catalog' },
            { id: 'settings', label: 'Settings' },
          ]}
        />
      </div>
    );
  },
};

export const ListRowLinkAndActivityDemo: StoryObj = {
  render: () => (
    <div className="p-6 max-w-xl space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Rounded List Rows</h3>
        <ListRowLink
          title="Cafe Oasis Koramangala"
          subtitle="Tenant ID: tenant_oasis_blr · ap-south-1"
          status="good"
          badge="Healthy"
          highlighted
        />
        <ListRowLink
          title="Bandra Kitchens Express"
          subtitle="Tenant ID: tenant_bandra_bom · ap-south-1"
          status="warning"
          badge="High Latency"
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Activity Feed Timeline</h3>
        <ActivityFeed
          items={[
            {
              id: '1',
              actor: 'Operator Maya',
              action: 'rotated production Ed25519 signing key',
              tag: 'Security',
              time: '12 min ago',
            },
            {
              id: '2',
              actor: 'Provisioning Engine',
              action: 'completed database migration for tenant_oasis_blr',
              tag: 'DB',
              time: '1 hour ago',
            },
          ]}
        />
      </div>
    </div>
  ),
};

export const MobileActionCardAndSwipe: StoryObj = {
  name: 'ActionCard & SwipeActions (Mobile First)',
  render: () => (
    <div className="p-6 max-w-md mx-auto space-y-4">
      <h3 className="text-sm font-semibold text-[var(--color-text)]">Swipeable Order Cards</h3>
      <SwipeActions
        leftAction={{
          id: 'ready',
          label: 'Ready',
          icon: <CheckCircle2 className="h-4 w-4" />,
          onTrigger: () => alert('Order marked ready'),
          variant: 'success',
        }}
        rightAction={{
          id: 'cancel',
          label: 'Cancel',
          icon: <Trash2 className="h-4 w-4" />,
          onTrigger: () => alert('Order cancelled'),
          variant: 'destructive',
        }}
      >
        <ActionCard
          title="Order #104 · Table 4"
          subtitle="2x Truffle Risotto, 1x San Pellegrino"
          progress={75}
          progressLabel="Cooking (12m elapsed)"
          highlighted
        />
      </SwipeActions>

      <ActionCard
        title="Bandra Kitchens Fleet"
        subtitle="Active tenant: tenant_bandra_bom"
        progress={92}
        progressLabel="Cluster Storage (92% used)"
      />
    </div>
  ),
};

export const BottomTabBarAndSheetDemo: StoryObj = {
  name: 'BottomTabBar & BottomSheet (Mobile Phone & Tablet)',
  render: () => (
    <div className="relative min-h-[360px] p-6 max-w-sm mx-auto border border-[var(--color-border)] rounded-[32px] bg-[var(--color-bg)] overflow-hidden">
      <div className="space-y-4">
        <h3 className="text-base font-bold text-[var(--color-text)]">Service Stand</h3>
        <p className="text-xs text-[var(--color-text-muted)]">
          Demonstrating floating pill tab bar with center primary action and bottom sheet detail.
        </p>

        <BottomSheet>
          <BottomSheetTrigger asChild>
            <Button variant="secondary" size="sm" className="w-full rounded-full">
              Open Order Detail (Bottom Sheet)
            </Button>
          </BottomSheetTrigger>
          <BottomSheetContent>
            <BottomSheetHeader>
              <BottomSheetTitle>Table 4 · Order #104</BottomSheetTitle>
              <BottomSheetDescription>
                Seated 4 guests · Server: Rahul · ₹2,450 incl. GST
              </BottomSheetDescription>
            </BottomSheetHeader>
            <div className="space-y-3 py-2 text-xs">
              <div className="flex justify-between border-b border-[var(--color-border)]/50 pb-2">
                <span className="font-medium text-[var(--color-text)]">2x Truffle Risotto</span>
                <span className="font-semibold text-[var(--color-text)]">₹1,700</span>
              </div>
              <div className="flex justify-between border-b border-[var(--color-border)]/50 pb-2">
                <span className="font-medium text-[var(--color-text)]">1x San Pellegrino</span>
                <span className="font-semibold text-[var(--color-text)]">₹750</span>
              </div>
            </div>
            <BottomSheetFooter>
              <Button variant="primary" className="w-full rounded-full">
                Print Bill & Settle
              </Button>
            </BottomSheetFooter>
          </BottomSheetContent>
        </BottomSheet>
      </div>

      <BottomTabBar
        items={[
          { id: 'tables', label: 'Tables', icon: <LayoutDashboard className="h-4 w-4" /> },
          { id: 'orders', label: 'Orders', icon: <CreditCard className="h-4 w-4" />, badge: 3 },
          { id: 'new', label: 'Take Order', icon: <Sparkles className="h-5 w-5" />, isPrimaryAction: true },
          { id: 'kds', label: 'Kitchen', icon: <Terminal className="h-4 w-4" /> },
          { id: 'more', label: 'More', icon: <Settings className="h-4 w-4" /> },
        ]}
        activeId="tables"
        className="absolute bottom-2 inset-x-2"
      />
    </div>
  ),
};


