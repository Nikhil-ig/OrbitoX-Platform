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
import { LayoutDashboard, Settings, Users, CreditCard, Terminal } from 'lucide-react';
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

