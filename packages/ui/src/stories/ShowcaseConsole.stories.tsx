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
  ProgressBar,
  BottomTabBar,
  ActionCard,
  Banner,
} from '../components';
import {
  LayoutDashboard,
  Building,
  Key,
  Shield,
  CreditCard,
  Settings,
  Terminal,
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
  Plus,
  Search,
  FileText,
  Users,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Send,
  Zap,
} from 'lucide-react';

const meta: Meta = {
  title: 'Showcase/Console & Platform',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

// ─── C0. Shared Console Sidebar (Desktop, Dark Mood) ───
export const C0_ConsoleSidebar: StoryObj = {
  name: 'C0: Console Sidebar (Desktop, Dark)',
  render: () => (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] p-8 flex justify-center items-start">
      <div className="w-[272px] bg-[var(--color-surface)] rounded-[28px] border border-[var(--color-border)] p-4 flex flex-col min-h-[720px] shadow-2xl relative">
        {/* Top Logo */}
        <div className="flex items-center justify-between px-2 pt-2 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white">
              <Zap className="h-4 w-4" />
            </div>
            <span className="font-bold text-lg tracking-tight text-[var(--color-text)]">orbitoX</span>
          </div>
          <span className="text-[11px] font-semibold text-[var(--color-text-muted)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] px-2.5 py-0.5 rounded-full">
            Console
          </span>
        </div>

        {/* Search / AI Pill */}
        <div className="px-1 mb-4">
          <button
            type="button"
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] hover:border-[var(--color-accent)] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5" />
              <span>Search or ask AI</span>
            </div>
            <kbd className="text-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] px-1.5 py-0.5 rounded">⌘K</kbd>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 px-1">
          <button
            type="button"
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-full bg-[var(--color-accent)] text-white text-xs font-medium shadow-[0_4px_16px_rgba(61,110,245,0.4)] cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard className="h-4 w-4" />
              <span>Overview</span>
            </div>
          </button>

          <button
            type="button"
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] text-xs font-medium transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Building className="h-4 w-4" />
              <span>Organizations</span>
            </div>
            <span className="text-[11px] text-[var(--color-text-muted)]">128</span>
          </button>

          <button
            type="button"
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] text-xs font-medium transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Users className="h-4 w-4" />
              <span>Tenants</span>
            </div>
            <span className="text-[11px] text-[var(--color-text-muted)]">342</span>
          </button>

          <button
            type="button"
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] text-xs font-medium transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Terminal className="h-4 w-4" />
              <span>Provisioning</span>
            </div>
            <span className="text-[10px] font-bold text-[#FF6B6B] bg-[#FF6B6B]/15 px-2 py-0.5 rounded-full">2</span>
          </button>

          <button
            type="button"
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] text-xs font-medium transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <CreditCard className="h-4 w-4" />
              <span>Billing</span>
            </div>
            <span className="text-[10px] font-bold text-[#FF6B6B] bg-[#FF6B6B]/15 px-2 py-0.5 rounded-full">3</span>
          </button>

          <button
            type="button"
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] text-xs font-medium transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Shield className="h-4 w-4" />
              <span>Data rights</span>
            </div>
            <span className="text-[10px] font-bold text-[#FF6B6B] bg-[#FF6B6B]/15 px-2 py-0.5 rounded-full">1</span>
          </button>

          <button
            type="button"
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] text-xs font-medium transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Key className="h-4 w-4" />
              <span>Security & keys</span>
            </div>
          </button>

          <button
            type="button"
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] text-xs font-medium transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <FileText className="h-4 w-4" />
              <span>Audit log</span>
            </div>
          </button>

          <button
            type="button"
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] text-xs font-medium transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-[#C4B5FD]" />
              <span>Ask OrbitoX</span>
            </div>
            <span className="text-[10px] font-bold text-white bg-[#6D28D9] px-1.5 py-0.5 rounded-full">AI</span>
          </button>

          <button
            type="button"
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] text-xs font-medium transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </div>
          </button>
        </nav>

        {/* Bottom Card */}
        <div className="mt-auto pt-4 border-t border-[var(--color-border)]">
          <div className="rounded-[var(--radius-row)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
            <span className="text-[10px] font-bold text-[#14161A] bg-[#FBBF24] px-2 py-0.5 rounded-full inline-block">
              STAGING
            </span>
            <p className="text-xs text-[var(--color-text-muted)] mt-1.5">Test data only.</p>
          </div>
        </div>
      </div>
    </div>
  ),
};

// ─── C1. Organization Detail (Desktop, Dark Mood) ───
export const C1_OrganizationDetail: StoryObj = {
  name: 'C1: Organization Detail (Desktop, Dark)',
  render: () => (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <AppShell
        appName="OrbitoX Operator"
        navItems={[
          { id: 'overview', label: 'Overview', href: '#', icon: <LayoutDashboard className="h-4 w-4" /> },
          { id: 'orgs', label: 'Organizations', href: '#', icon: <Building className="h-4 w-4" />, active: true },
          { id: 'tenants', label: 'Tenants', href: '#', icon: <Users className="h-4 w-4" /> },
          { id: 'provisioning', label: 'Provisioning', href: '#', icon: <Terminal className="h-4 w-4" /> },
          { id: 'billing', label: 'Billing', href: '#', icon: <CreditCard className="h-4 w-4" /> },
          { id: 'security', label: 'Security & keys', href: '#', icon: <Key className="h-4 w-4" /> },
        ]}
      >
        <div className="space-y-6 max-w-6xl mx-auto py-2">
          {/* Breadcrumb & Header */}
          <div>
            <div className="text-xs text-[#2563EB] dark:text-[#60A5FA] font-semibold mb-1">
              Organizations / Shah Hospitality Group
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-[#FB923C]/20 text-[#9A3412] dark:text-[#FB923C] font-bold text-base flex items-center justify-center border border-[#FB923C]/30">
                  SH
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
                      Shah Hospitality Group
                    </h1>
                    <span className="text-[11px] font-semibold text-[#065F46] dark:text-[#34D399] bg-[#D1FAE5] dark:bg-[#34D399]/15 border border-[#10B981]/30 dark:border-[#34D399]/30 px-2.5 py-0.5 rounded-full">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    Owner Priya Shah · Bengaluru · customer since March 2026 · GSTIN 29ABCDE1234F1Z5
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Button variant="secondary" size="sm" className="rounded-full">
                  Suspend...
                </Button>
                <Button variant="secondary" size="sm" className="rounded-full">
                  Impersonate (read-only)
                </Button>
                <Button variant="primary" size="sm" className="rounded-full">
                  Change plan
                </Button>
              </div>
            </div>
          </div>

          {/* Secondary Nav Tabs */}
          <PillNav
            items={[
              { id: 'overview', label: 'Overview', active: true },
              { id: 'tenants', label: 'Tenants' },
              { id: 'members', label: 'Members' },
              { id: 'billing', label: 'Billing' },
              { id: 'data-rights', label: 'Data rights' },
              { id: 'audit', label: 'Audit' },
            ]}
          />

          {/* 4 Stat Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-3xl font-light tracking-tight text-[var(--color-text)]">3</div>
              <div className="text-xs text-[var(--color-text-muted)] mt-1">Tenants · limit 5</div>
            </Card>
            <Card className="p-4">
              <div className="text-3xl font-light tracking-tight text-[var(--color-text)]">9</div>
              <div className="text-xs text-[var(--color-text-muted)] mt-1">Members · 2 owners</div>
            </Card>
            <Card className="p-4">
              <div className="text-3xl font-light tracking-tight text-[var(--color-text)]">₹7,497</div>
              <div className="text-xs text-[var(--color-text-muted)] mt-1">Monthly · Growth</div>
            </Card>
            <Card className="p-4">
              <div className="text-3xl font-light tracking-tight text-[var(--color-text)]">0</div>
              <div className="text-xs text-[var(--color-text-muted)] mt-1">Open data requests</div>
            </Card>
          </div>

          {/* 3 Detail Column Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tenants Column */}
            <Card className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm text-[var(--color-text)]">Tenants</h3>
                  <a href="#" className="text-xs text-[#2563EB] dark:text-[#60A5FA] hover:underline">Add tenant</a>
                </div>
                <div className="space-y-3">
                  <div className="p-3 rounded-[var(--radius-row)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#34D399]" />
                        <span className="font-medium text-xs text-[var(--color-text)]">Masala House</span>
                      </div>
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">RestaurantOS · template Saffron · 2 branches</p>
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)]">Live</span>
                  </div>

                  <div className="p-3 rounded-[var(--radius-row)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#34D399]" />
                        <span className="font-medium text-xs text-[var(--color-text)]">Shah Family Clinic</span>
                      </div>
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">HospitalOS · 12 staff</p>
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)]">Live</span>
                  </div>

                  <div className="p-3 rounded-[var(--radius-row)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#FBBF24]" />
                        <span className="font-medium text-xs text-[var(--color-text)]">Chai & Co.</span>
                      </div>
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">RestaurantOS · provisioning step 4 of 6</p>
                    </div>
                    <span className="text-xs text-[#B45309] dark:text-[#FBBF24]">Setting up</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Members Column */}
            <Card className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm text-[var(--color-text)]">Members</h3>
                  <a href="#" className="text-xs text-[#2563EB] dark:text-[#60A5FA] hover:underline">Manage</a>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-[#FB923C]/20 text-[#9A3412] dark:text-[#FB923C] font-semibold flex items-center justify-center">PS</div>
                      <div>
                        <div className="font-medium text-[var(--color-text)]">Priya Shah</div>
                        <div className="text-[10px] text-[var(--color-text-muted)]">Owner · MFA on</div>
                      </div>
                    </div>
                    <span className="text-[11px] text-[var(--color-text-muted)]">Active now</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-[#60A5FA]/20 text-[#1E40AF] dark:text-[#60A5FA] font-semibold flex items-center justify-center">RK</div>
                      <div>
                        <div className="font-medium text-[var(--color-text)]">Rahul Kapoor</div>
                        <div className="text-[10px] text-[var(--color-text-muted)]">Owner · MFA on</div>
                      </div>
                    </div>
                    <span className="text-[11px] text-[var(--color-text-muted)]">2 h ago</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-[#D1FAE5] dark:bg-[#34D399]/20 text-[#065F46] dark:text-[#34D399] font-semibold flex items-center justify-center">MD</div>
                      <div>
                        <div className="font-medium text-[var(--color-text)]">Meera Das</div>
                        <div className="text-[10px] text-[#B45309] dark:text-[#FBBF24]">Admin · MFA not set up</div>
                      </div>
                    </div>
                    <span className="text-[11px] text-[var(--color-text-muted)]">Yesterday</span>
                  </div>
                </div>
              </div>
              <div className="text-xs text-[var(--color-text-muted)] pt-3 border-t border-[var(--color-border)] mt-4">
                + 6 more members
              </div>
            </Card>

            {/* Plan & Billing Column */}
            <Card className="p-5 flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-sm text-[var(--color-text)] mb-3">Plan & billing</h3>
                <div className="text-3xl font-bold tracking-tight text-[var(--color-text)] mb-4">
                  Growth
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">Next charge</span>
                    <span className="font-medium text-[var(--color-text)]">₹7,497 on 1 Dec</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">Payment method</span>
                    <span className="font-medium text-[var(--color-text)]">UPI AutoPay · Razorpay</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">Last payment</span>
                    <span className="font-medium text-[#065F46] dark:text-[#34D399]">Paid · 1 Nov</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">Paid templates</span>
                    <span className="font-medium text-[var(--color-text)]">Noir (Masala House)</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-4 mt-4 border-t border-[var(--color-border)]">
                <Button variant="secondary" size="sm" className="rounded-full flex-1">
                  Change plan
                </Button>
                <Button variant="secondary" size="sm" className="rounded-full flex-1">
                  Invoices
                </Button>
              </div>
            </Card>
          </div>

          {/* Recent Activity Audit Strip */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-[var(--color-text)]">Recent activity</h3>
              <a href="#" className="text-xs text-[#2563EB] dark:text-[#60A5FA] hover:underline">Full audit log</a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="flex items-start gap-2">
                <span className="h-2 w-2 rounded-full bg-[var(--color-accent)] mt-1 shrink-0" />
                <div>
                  <p className="text-[var(--color-text)]">Priya Shah switched Masala House to template Noir</p>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Today 11:20</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="h-2 w-2 rounded-full bg-[var(--color-accent)] mt-1 shrink-0" />
                <div>
                  <p className="text-[var(--color-text)]">Rahul Kapoor invited Meera Das as Admin</p>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Yesterday 18:02</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="h-2 w-2 rounded-full bg-[var(--color-accent)] mt-1 shrink-0" />
                <div>
                  <p className="text-[var(--color-text)]">System started provisioning Chai & Co.</p>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Yesterday 17:40</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </AppShell>
    </div>
  ),
};

// ─── C3. Billing & Payments (Desktop, Dark Mood) ───
export const C3_BillingAndPayments: StoryObj = {
  name: 'C3: Billing & Payments (Desktop, Dark)',
  render: () => (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <AppShell
        appName="OrbitoX Operator"
        navItems={[
          { id: 'overview', label: 'Overview', href: '#', icon: <LayoutDashboard className="h-4 w-4" /> },
          { id: 'orgs', label: 'Organizations', href: '#', icon: <Building className="h-4 w-4" /> },
          { id: 'billing', label: 'Billing', href: '#', icon: <CreditCard className="h-4 w-4" />, active: true },
          { id: 'security', label: 'Security & keys', href: '#', icon: <Key className="h-4 w-4" /> },
        ]}
      >
        <div className="space-y-6 max-w-6xl mx-auto py-2">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs text-[var(--color-text-muted)]">Razorpay · live mode off (staging)</div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)] mt-1">
                Billing & payments
              </h1>
            </div>
            <PillNav
              items={[
                { id: 'week', label: 'Week' },
                { id: 'month', label: 'Month', active: true },
                { id: 'year', label: 'Year' },
              ]}
            />
          </div>

          {/* 4 Top Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-3xl font-light tracking-tight text-[var(--color-text)]">₹4.8L</div>
              <div className="text-xs text-[var(--color-text-muted)] mt-1">Collected in November</div>
              <div className="text-[11px] text-[#065F46] dark:text-[#34D399] font-medium mt-1">+12% vs October</div>
            </Card>
            <Card className="p-4">
              <div className="text-3xl font-light tracking-tight text-[var(--color-text)]">311</div>
              <div className="text-xs text-[var(--color-text-muted)] mt-1">Active subscriptions</div>
            </Card>
            <Card className="p-4">
              <div className="text-3xl font-light tracking-tight text-[#FBBF24]">3</div>
              <div className="text-xs text-[var(--color-text-muted)] mt-1">In grace period</div>
            </Card>
            <Card className="p-4">
              <div className="text-3xl font-light tracking-tight text-[#FF6B6B]">1</div>
              <div className="text-xs text-[var(--color-text-muted)] mt-1">Unknown webhook event</div>
            </Card>
          </div>

          {/* Needs Action & Revenue by Product */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Needs Action Card */}
            <Card className="p-5 space-y-4">
              <h3 className="font-semibold text-sm text-[var(--color-text)]">Needs action</h3>

              {/* Alert Box */}
              <div className="p-4 rounded-[var(--radius-row)] border border-rose-200 dark:border-rose-500/30 bg-rose-50/70 dark:bg-rose-950/20 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#991B1B] dark:text-rose-200 bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800/40 px-2 py-0.5 rounded-full">
                    Unknown event
                  </span>
                  <span className="text-[var(--color-text-muted)]">08:03</span>
                </div>
                <p className="text-xs text-[var(--color-text)]">
                  Razorpay sent <code className="text-[#991B1B] dark:text-rose-300 font-semibold">subscription.paused</code>. We store it and change nothing until you decide.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Button variant="secondary" size="sm" className="rounded-full bg-white text-[#14161A] hover:bg-white/90">
                    Review payload
                  </Button>
                  <Button variant="secondary" size="sm" className="rounded-full">
                    Mark handled
                  </Button>
                </div>
              </div>

              {/* Grace Period Rows */}
              <div className="space-y-2">
                <div className="p-3 rounded-[var(--radius-row)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-[#FBBF24]" />
                    <div>
                      <div className="font-medium text-xs text-[var(--color-text)]">Masala House</div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">Grace · 4 days left · ₹2,499</div>
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" className="rounded-full text-xs">
                    Send reminder
                  </Button>
                </div>

                <div className="p-3 rounded-[var(--radius-row)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-[#FBBF24]" />
                    <div>
                      <div className="font-medium text-xs text-[var(--color-text)]">Lotus Dental</div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">Grace · 9 days left · ₹7,999</div>
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" className="rounded-full text-xs">
                    Send reminder
                  </Button>
                </div>
              </div>
            </Card>

            {/* Revenue by Product Card */}
            <Card className="p-5 space-y-4">
              <h3 className="font-semibold text-sm text-[var(--color-text)]">Revenue by product</h3>

              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[var(--color-text)]">RestaurantOS plans</span>
                    <span className="font-semibold text-[var(--color-text)]">₹2.9L</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--color-surface-raised)] overflow-hidden">
                    <div className="h-full bg-[#FBBF24] rounded-full w-[65%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[var(--color-text)]">HospitalOS plans</span>
                    <span className="font-semibold text-[var(--color-text)]">₹1.6L</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--color-surface-raised)] overflow-hidden">
                    <div className="h-full bg-[#2DD4BF] rounded-full w-[35%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[var(--color-text)]">Paid diner templates</span>
                    <span className="font-semibold text-[var(--color-text)]">₹21,450</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--color-surface-raised)] overflow-hidden">
                    <div className="h-full bg-[#A855F7] rounded-full w-[12%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[var(--color-text)]">AI assistant add-on</span>
                    <span className="font-semibold text-[var(--color-text)]">₹8,200</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--color-surface-raised)] overflow-hidden">
                    <div className="h-full bg-[#3B82F6] rounded-full w-[6%]" />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Payments Table Card */}
          <Card className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="font-semibold text-sm text-[var(--color-text)]">Payments</h3>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <input
                    type="text"
                    aria-label="Search payment or organization"
                    placeholder="Search payment or org"
                    className="pl-8 pr-3 py-1.5 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-xs text-[var(--color-text)] focus:outline-none"
                  />
                </div>
                <Button variant="secondary" size="sm" className="rounded-full text-xs">
                  Export CSV
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                    <th className="py-2 font-medium">Payment</th>
                    <th className="py-2 font-medium">Organization</th>
                    <th className="py-2 font-medium">Method</th>
                    <th className="py-2 font-medium">Status</th>
                    <th className="py-2 font-medium">Date</th>
                    <th className="py-2 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  <tr>
                    <td className="py-3 font-mono text-[11px]">pay_Nx81...Q2</td>
                    <td className="py-3 font-medium text-[var(--color-text)]">Shah Hospitality Group</td>
                    <td className="py-3 text-[var(--color-text-muted)]">UPI AutoPay</td>
                    <td className="py-3"><span className="text-[10px] text-[#065F46] dark:text-[#34D399] bg-[#D1FAE5] dark:bg-[#34D399]/15 px-2 py-0.5 rounded-full font-medium">Captured</span></td>
                    <td className="py-3 text-[var(--color-text-muted)]">1 Nov</td>
                    <td className="py-3 font-semibold text-right text-[var(--color-text)]">₹7,497</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-mono text-[11px]">pay_Nw77...K9</td>
                    <td className="py-3 font-medium text-[var(--color-text)]">City Hospital</td>
                    <td className="py-3 text-[var(--color-text-muted)]">Card ·· 4821</td>
                    <td className="py-3"><span className="text-[10px] text-[#065F46] dark:text-[#34D399] bg-[#D1FAE5] dark:bg-[#34D399]/15 px-2 py-0.5 rounded-full font-medium">Captured</span></td>
                    <td className="py-3 text-[var(--color-text-muted)]">1 Nov</td>
                    <td className="py-3 font-semibold text-right text-[var(--color-text)]">₹15,999</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-mono text-[11px]">pay_Nv02...A4</td>
                    <td className="py-3 font-medium text-[var(--color-text)]">Masala House</td>
                    <td className="py-3 text-[var(--color-text-muted)]">UPI AutoPay</td>
                    <td className="py-3"><span className="text-[10px] text-[#991B1B] dark:text-[#FF6B6B] bg-[#FEE2E2] dark:bg-[#FF6B6B]/15 px-2 py-0.5 rounded-full font-medium">Failed · insufficient funds</span></td>
                    <td className="py-3 text-[var(--color-text-muted)]">1 Nov</td>
                    <td className="py-3 font-semibold text-right text-[var(--color-text)]">₹2,499</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </AppShell>
    </div>
  ),
};

// ─── C5. Data Rights Requests (Desktop, Dark Mood) ───
export const C5_DataRightsRequests: StoryObj = {
  name: 'C5: Data Rights Requests (Desktop, Dark)',
  render: () => (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <AppShell
        appName="OrbitoX Operator"
        navItems={[
          { id: 'overview', label: 'Overview', href: '#', icon: <LayoutDashboard className="h-4 w-4" /> },
          { id: 'orgs', label: 'Organizations', href: '#', icon: <Building className="h-4 w-4" /> },
          { id: 'data-rights', label: 'Data rights', href: '#', icon: <Shield className="h-4 w-4" />, active: true },
        ]}
      >
        <div className="space-y-6 max-w-6xl mx-auto py-2">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs text-[var(--color-text-muted)]">Exports, deletions and patient or customer requests</div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)] mt-1">
                Data rights
              </h1>
            </div>
            <Button variant="secondary" size="sm" className="rounded-full">
              <Shield className="h-3.5 w-3.5 mr-1.5" />
              Verify a certificate
            </Button>
          </div>

          {/* 3 Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-5 space-y-3">
              <span className="text-[10px] font-semibold text-[#0F766E] dark:text-[#2DD4BF] bg-[#CCFBF1] dark:bg-[#2DD4BF]/15 px-2.5 py-0.5 rounded-full inline-block">
                Export · running
              </span>
              <h3 className="font-bold text-base text-[var(--color-text)]">City Hospital</h3>
              <p className="text-xs text-[var(--color-text-muted)]">Whole organization · HospitalOS</p>
              <div className="space-y-1.5 pt-2">
                <ProgressBar value={64} className="h-1.5" />
                <p className="text-[11px] text-[var(--color-text-muted)]">9 of 14 tables · started 09:15</p>
              </div>
            </Card>

            <Card className="p-5 space-y-3 border border-rose-200 dark:border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/10">
              <span className="text-[10px] font-semibold text-[#991B1B] dark:text-rose-200 bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800/40 px-2.5 py-0.5 rounded-full inline-block">
                Deletion scheduled
              </span>
              <h3 className="font-bold text-base text-[var(--color-text)]">Orchid Bistro</h3>
              <div className="text-3xl font-light text-[var(--color-text)]">17 days</div>
              <p className="text-xs text-[var(--color-text-muted)]">Erases on 29 Nov · owner can still cancel</p>
            </Card>

            <Card className="p-5 space-y-3 border border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/10">
              <span className="text-[10px] font-semibold text-[#92400E] dark:text-amber-200 bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800/40 px-2.5 py-0.5 rounded-full inline-block">
                Patient request · restrict
              </span>
              <h3 className="font-bold text-base text-[var(--color-text)]">Sunrise Clinic</h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Patient P-•••482 asked to stop processing. Records are hidden and locked.
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)] pt-1">Received yesterday · due in 29 days</p>
            </Card>
          </div>

          {/* All Requests Table Card */}
          <Card className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="font-semibold text-sm text-[var(--color-text)]">All requests</h3>
              <PillNav
                items={[
                  { id: 'all', label: 'All', active: true },
                  { id: 'exports', label: 'Exports' },
                  { id: 'deletions', label: 'Deletions' },
                  { id: 'person', label: 'Person requests' },
                ]}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                    <th className="py-2 font-medium">Request</th>
                    <th className="py-2 font-medium">Organization</th>
                    <th className="py-2 font-medium">Status</th>
                    <th className="py-2 font-medium">Requested</th>
                    <th className="py-2 font-medium text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  <tr>
                    <td className="py-3 font-medium text-[var(--color-text)]">Organization deletion</td>
                    <td className="py-3 text-[var(--color-text-muted)]">Blue Door Café</td>
                    <td className="py-3"><span className="text-[10px] text-[#065F46] dark:text-[#34D399] bg-[#D1FAE5] dark:bg-[#34D399]/15 px-2 py-0.5 rounded-full font-medium">Erased · 0 rows left</span></td>
                    <td className="py-3 text-[var(--color-text-muted)]">2 Oct</td>
                    <td className="py-3 text-right"><a href="#" className="text-[#2563EB] dark:text-[#60A5FA] font-semibold underline">Certificate</a></td>
                  </tr>
                  <tr>
                    <td className="py-3 font-medium text-[var(--color-text)]">Customer export</td>
                    <td className="py-3 text-[var(--color-text-muted)]">Masala House</td>
                    <td className="py-3"><span className="text-[10px] text-[#065F46] dark:text-[#34D399] bg-[#D1FAE5] dark:bg-[#34D399]/15 px-2 py-0.5 rounded-full font-medium">Ready · link used</span></td>
                    <td className="py-3 text-[var(--color-text-muted)]">8 Nov</td>
                    <td className="py-3 text-right text-[var(--color-text-muted)]">Expired after download</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-medium text-[var(--color-text)]">Patient correction</td>
                    <td className="py-3 text-[var(--color-text-muted)]">Shah Family Clinic</td>
                    <td className="py-3"><span className="text-[10px] text-[#065F46] dark:text-[#34D399] bg-[#D1FAE5] dark:bg-[#34D399]/15 px-2 py-0.5 rounded-full font-medium">Done</span></td>
                    <td className="py-3 text-[var(--color-text-muted)]">5 Nov</td>
                    <td className="py-3 text-right text-[var(--color-text-muted)]">Audit only, no PHI shown</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* Verified Deletion Certificate Banner */}
          <div className="p-4 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#D1FAE5] dark:bg-[#34D399]/15 text-[#065F46] dark:text-[#34D399] flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-[var(--color-text)]">Deletion certificate · Blue Door Café</h4>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Signed with Ed25519, key dc-2026-1 · signature valid · 0 rows in 61 tables
                </p>
              </div>
            </div>
            <Button variant="secondary" size="sm" className="rounded-full bg-white text-[#14161A] hover:bg-white/90">
              Download JSON
            </Button>
          </div>
        </div>
      </AppShell>
    </div>
  ),
};

// ─── D7. Operator Console on Phone (Dark Mood, Mobile 390x844) ───
export const D7_OperatorConsolePhone: StoryObj = {
  name: 'D7: Operator Console on Phone (Mobile, Dark)',
  render: () => (
    <div className="min-h-screen bg-[var(--color-bg)] flex justify-center py-6 px-4" data-theme="dark">
      <div className="w-full max-w-[390px] min-h-[740px] bg-[#0D0F12] text-[#F2F4F7] rounded-[44px] shadow-2xl border-8 border-[#1B1F25] flex flex-col overflow-hidden relative">
        {/* Top Header */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white">
              <Zap className="h-3.5 w-3.5" />
            </div>
            <span className="font-bold text-base tracking-tight text-white">orbitoX</span>
            <span className="text-[9px] font-bold text-[#14161A] bg-[#FBBF24] px-1.5 py-0.2 rounded-full">
              STAGING
            </span>
          </div>
          <button type="button" aria-label="Ask AI" className="h-8 w-8 rounded-full bg-[#6D28D9] text-white flex items-center justify-center shadow-[0_2px_10px_rgba(109,40,217,0.4)] cursor-pointer">
            <Sparkles className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 pb-24">
          <h2 className="text-2xl font-bold tracking-tight text-white leading-tight">
            Everything is running fine.
          </h2>

          {/* 2 Top Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-[20px] bg-[#14171C] border border-white/5">
              <div className="text-3xl font-light text-white">342</div>
              <div className="text-[11px] text-[#9AA3AF] mt-1">active tenants</div>
            </div>
            <div className="p-4 rounded-[20px] bg-[#14171C] border border-white/5">
              <div className="text-3xl font-light text-white">₹4.8L</div>
              <div className="text-[11px] text-[#9AA3AF] mt-1">this month</div>
            </div>
          </div>

          {/* Needs a decision */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-white">Needs a decision</h3>
              <span className="h-4 w-4 rounded-full bg-[#FF6B6B] text-white text-[10px] font-bold flex items-center justify-center">
                3
              </span>
            </div>

            {/* Blue Highlighted Card */}
            <div className="p-4 rounded-[24px] bg-[var(--color-accent)] text-white shadow-[0_8px_24px_rgba(61,110,245,0.35)] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] font-bold bg-white text-blue-900 px-2 py-0.5 rounded-full">
                  AI drafted
                </span>
                <span className="text-white font-medium text-[11px]">now</span>
              </div>
              <h4 className="font-bold text-sm leading-tight">
                Email 2 owners a payment reminder
              </h4>
              <div className="flex items-center gap-2 pt-1">
                <button type="button" className="flex-1 py-2 rounded-full bg-white text-[#14161A] text-xs font-semibold cursor-pointer">
                  Approve
                </button>
                <button type="button" className="flex-1 py-2 rounded-full border border-white/40 text-white text-xs font-medium cursor-pointer">
                  Review
                </button>
              </div>
            </div>

            {/* Alert Row 1 */}
            <div className="p-3.5 rounded-[20px] bg-[#14171C] border border-[#FF6B6B]/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-[#FF6B6B]" />
                <div>
                  <div className="font-semibold text-xs text-white">Green Leaf Café failed setup</div>
                  <div className="text-[10px] text-[#9AA3AF]">DNS step · retry is safe</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#9AA3AF]" />
            </div>

            {/* Alert Row 2 */}
            <div className="p-3.5 rounded-[20px] bg-[#14171C] border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-[#FBBF24]" />
                <div>
                  <div className="font-semibold text-xs text-white">Unknown Razorpay event</div>
                  <div className="text-[10px] text-[#9AA3AF]">subscription.paused · 08:03</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#9AA3AF]" />
            </div>
          </div>
        </div>

        {/* Floating Pill Bottom Tab Bar */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="h-14 bg-[#14171C] border border-white/10 rounded-full flex items-center justify-around px-2 shadow-2xl backdrop-blur-md">
            <button type="button" aria-label="Overview" className="h-10 w-10 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center cursor-pointer">
              <LayoutDashboard className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Tenants" className="p-2 text-[#9AA3AF] hover:text-white cursor-pointer">
              <Users className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Billing" className="p-2 text-[#9AA3AF] hover:text-white cursor-pointer">
              <CreditCard className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Notifications" className="p-2 text-[#9AA3AF] hover:text-white cursor-pointer">
              <Bell className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Menu" className="p-2 text-[#9AA3AF] hover:text-white cursor-pointer">
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  ),
};

// ─── AI1. Ask OrbitoX AI Assistant over MCP (Desktop, Dark Mood) ───
export const AI1_AskOrbitoXAssistant: StoryObj = {
  name: 'AI1: Ask OrbitoX Assistant over MCP (Desktop, Dark)',
  render: () => (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <AppShell
        appName="OrbitoX Operator"
        navItems={[
          { id: 'overview', label: 'Overview', href: '#', icon: <LayoutDashboard className="h-4 w-4" /> },
          { id: 'orgs', label: 'Organizations', href: '#', icon: <Building className="h-4 w-4" /> },
          { id: 'ai', label: 'Ask OrbitoX', href: '#', icon: <Sparkles className="h-4 w-4 text-[#A78BFA]" />, active: true },
        ]}
      >
        <div className="max-w-6xl mx-auto py-2 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat Stream (2 cols) */}
          <div className="lg:col-span-2 flex flex-col justify-between min-h-[680px] space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
                Ask OrbitoX
              </h1>
              <span className="text-xs text-[#581C87] dark:text-[#A78BFA] bg-[#EDE9FE] dark:bg-[#A78BFA]/15 border border-[#8B5CF6]/30 dark:border-[#A78BFA]/30 px-2.5 py-0.5 rounded-full font-medium">
                Acts as you · every step logged
              </span>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 space-y-5 overflow-y-auto pr-2">
              {/* User Prompt */}
              <div className="flex justify-end">
                <div className="max-w-md px-4 py-2.5 rounded-[22px] bg-[var(--color-accent)] text-white text-xs font-medium shadow-md">
                  Which restaurants are in their grace period this week? Remind the owners.
                </div>
              </div>

              {/* AI Assistant Turn */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center">
                    <Sparkles className="h-3 w-3" />
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <span className="px-2 py-0.5 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[#065F46] dark:text-[#34D399]">
                      ✓ billing.list_subscriptions status=grace
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[#065F46] dark:text-[#34D399]">
                      ✓ orgs.get_owner x2
                    </span>
                  </div>
                </div>

                <div className="text-xs text-[var(--color-text)] leading-relaxed">
                  Two restaurants are in grace. Both failed a UPI AutoPay on 1 November.
                </div>

                {/* Grace List Rows */}
                <div className="space-y-1.5 pl-2 border-l-2 border-[var(--color-accent)]">
                  <div className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#FB923C]" />
                      <span className="font-semibold text-[var(--color-text)]">Masala House</span>
                      <span className="text-[var(--color-text-muted)]">Priya Shah</span>
                    </div>
                    <span className="text-[var(--color-text-muted)]">4 days left · ₹2,499</span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#FB923C]" />
                      <span className="font-semibold text-[var(--color-text)]">Orchid Bistro</span>
                      <span className="text-[var(--color-text-muted)]">Arjun Mehta</span>
                    </div>
                    <span className="text-[var(--color-text-muted)]">6 days left · ₹2,499</span>
                  </div>
                </div>

                <div className="text-xs text-[var(--color-text)]">
                  I've drafted a reminder. Nothing is sent until you approve.
                </div>

                {/* Approval Card */}
                <Card className="p-4 border border-purple-200 dark:border-purple-500/40 bg-purple-50/70 dark:bg-purple-950/20 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#581C87] dark:text-purple-200 bg-purple-100 dark:bg-purple-900/60 border border-purple-300 dark:border-purple-700/50 px-2 py-0.5 rounded-full">
                      Needs your approval
                    </span>
                    <code className="text-[11px] font-mono text-[#374151] dark:text-[var(--color-text-muted)]">billing.send_payment_reminder</code>
                  </div>
                  <h4 className="font-bold text-sm text-[var(--color-text)]">
                    Email 2 owners a payment reminder
                  </h4>
                  <div className="p-3 rounded-[var(--radius-row)] bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] italic">
                    “Hi Priya, your OrbitoX payment of ₹2,499 didn't go through on 1 Nov. Please update your payment method within 4 days to keep Masala House running...”
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <Button variant="secondary" size="sm" className="rounded-full bg-white text-[#14161A] hover:bg-white/90">
                      Approve and send
                    </Button>
                    <Button variant="secondary" size="sm" className="rounded-full">
                      Edit message
                    </Button>
                    <button type="button" className="text-xs text-[#374151] dark:text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer">
                      Cancel
                    </button>
                  </div>
                </Card>
              </div>
            </div>

            {/* Input Bar */}
            <div className="pt-2">
              <div className="flex items-center gap-2 p-1.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] focus-within:border-[var(--color-accent)]">
                <input
                  type="text"
                  aria-label="Ask about tenants, billing, provisioning"
                  placeholder="Ask about tenants, billing, provisioning..."
                  className="flex-1 px-4 py-2 bg-transparent text-xs text-[var(--color-text)] focus:outline-none"
                />
                <button type="button" aria-label="Send" className="h-8 w-8 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center cursor-pointer">
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Rail: Tools (MCP) (1 col) */}
          <Card className="p-5 space-y-4">
            <div>
              <h3 className="font-semibold text-sm text-[var(--color-text)]">Tools (MCP)</h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
                The assistant can only use the tools below, with your role's permissions. You decide which need approval.
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 rounded-[var(--radius-row)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-between">
                <span className="font-mono text-xs text-[var(--color-text)]">tenants.search / get</span>
                <span className="text-[10px] font-semibold text-[#065F46] dark:text-[#34D399] bg-[#D1FAE5] dark:bg-[#34D399]/15 px-2 py-0.5 rounded-full">Read freely</span>
              </div>

              <div className="p-3 rounded-[var(--radius-row)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-between">
                <span className="font-mono text-xs text-[var(--color-text)]">billing.list_subscriptions</span>
                <span className="text-[10px] font-semibold text-[#065F46] dark:text-[#34D399] bg-[#D1FAE5] dark:bg-[#34D399]/15 px-2 py-0.5 rounded-full">Read freely</span>
              </div>

              <div className="p-3 rounded-[var(--radius-row)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-between">
                <span className="font-mono text-xs text-[var(--color-text)]">billing.send_payment_reminder</span>
                <span className="text-[10px] font-semibold text-[#581C87] dark:text-purple-200 bg-purple-100 dark:bg-purple-900/60 border border-purple-300 dark:border-purple-700/50 px-2 py-0.5 rounded-full">Ask me first</span>
              </div>

              <div className="p-3 rounded-[var(--radius-row)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-between">
                <span className="font-mono text-xs text-[var(--color-text)]">provisioning.retry</span>
                <span className="text-[10px] font-semibold text-[#581C87] dark:text-purple-200 bg-purple-100 dark:bg-purple-900/60 border border-purple-300 dark:border-purple-700/50 px-2 py-0.5 rounded-full">Ask me first</span>
              </div>

              <div className="p-3 rounded-[var(--radius-row)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-between">
                <span className="font-mono text-xs text-[var(--color-text)]">tenants.suspend</span>
                <span className="text-[10px] font-semibold text-[#92400E] dark:text-amber-200 bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800/40 px-2 py-0.5 rounded-full">Ask me + password</span>
              </div>

              <div className="p-3 rounded-[var(--radius-row)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-between">
                <span className="font-mono text-xs text-[var(--color-text)]">data_rights.erase</span>
                <span className="text-[10px] font-semibold text-[#991B1B] dark:text-rose-200 bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800/40 px-2 py-0.5 rounded-full">Never through AI</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--color-border)]">
              <a href="#" className="text-xs text-[#2563EB] dark:text-[#60A5FA] hover:underline inline-flex items-center gap-1">
                Connect an external MCP client
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </Card>
        </div>
      </AppShell>
    </div>
  ),
};

