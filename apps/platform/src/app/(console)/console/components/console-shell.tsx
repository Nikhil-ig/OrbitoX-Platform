'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Boxes,
  FolderKanban,
  Terminal,
  Package,
  CreditCard,
  CheckSquare,
  Key,
  FileText,
  ShieldAlert,
  Palette,
  LogOut,
  Sparkles,
  Layers,
  Search,
  Sliders,
  Code2,
  TestTube,
  Bell,
} from 'lucide-react';
import {
  ResponsiveShell,
  type NavItem,
  Button,
  CommandPalette,
  type CommandGroup,
} from '@orbitox-io/ui';

export interface ConsoleShellProps {
  children: React.ReactNode;
  activeId?: string;
  operatorEmail?: string;
  operatorRole?: string;
  breadcrumbs?: React.ReactNode;
}

export function ConsoleShell({
  children,
  activeId = 'overview',
  operatorEmail: propOperatorEmail,
  operatorRole: propOperatorRole,
  breadcrumbs,
}: ConsoleShellProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [sessionOperator, setSessionOperator] = React.useState<{ email?: string; role?: string } | null>(null);
  const [sessionLoading, setSessionLoading] = React.useState(!propOperatorEmail);
  const [isCommandOpen, setIsCommandOpen] = React.useState(false);
  const [counts, setCounts] = React.useState<{
    orgs?: number;
    tenants?: number;
    provisioning?: number;
    billing?: number;
    dataRights?: number;
  }>({});

  React.useEffect(() => {
    if (propOperatorEmail && propOperatorRole) return;
    let isMounted = true;
    fetch('/api/v1/platform/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (isMounted && json?.success && json.operator) {
          setSessionOperator(json.operator);
        }
      })
      .catch(() => { })
      .finally(() => {
        if (isMounted) setSessionLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [propOperatorEmail, propOperatorRole]);

  // Fetch summary counts for badges
  React.useEffect(() => {
    let isMounted = true;
    fetch('/api/v1/platform/overview/summary')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (isMounted && json?.success && json.data) {
          setCounts({
            tenants: json.data.activeTenants,
            provisioning: json.data.failedJobsCount,
          });
        }
      })
      .catch(() => { });
    return () => {
      isMounted = false;
    };
  }, []);

  const activeEmail =
    propOperatorEmail ||
    sessionOperator?.email ||
    (sessionLoading ? 'Loading session...' : 'Unauthenticated');

  const activeRole =
    propOperatorRole ||
    sessionOperator?.role ||
    (sessionLoading ? '...' : 'GUEST');

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await fetch('/api/v1/platform/auth/logout', { method: 'POST' });
      router.push('/platform/login');
      router.refresh();
    } catch {
      router.push('/platform/login');
    }
  };

  const isProduction = process.env.NODE_ENV === 'production';
  const envLabel = isProduction ? 'PRODUCTION' : 'STAGING';

  // Command palette configuration
  const commandGroups: CommandGroup[] = [
    {
      group: 'Core Navigation',
      items: [
        {
          id: 'nav-overview',
          label: 'Overview',
          description: 'Control center dashboard, telemetry & health',
          icon: <LayoutDashboard className="h-4 w-4" />,
          onSelect: () => router.push('/console/overview'),
        },
        {
          id: 'nav-organizations',
          label: 'Organizations',
          description: 'Manage accounts, compliance & enterprise plans',
          icon: <Building2 className="h-4 w-4" />,
          onSelect: () => router.push('/console/organizations'),
        },
        {
          id: 'nav-tenants',
          label: 'Tenants',
          description: 'Cell management, custom domains & quotas',
          icon: <Boxes className="h-4 w-4" />,
          onSelect: () => router.push('/console/tenants'),
        },
        {
          id: 'nav-provisioning',
          label: 'Provisioning',
          description: 'Async jobs, sagas, retries & rollback',
          icon: <Terminal className="h-4 w-4" />,
          onSelect: () => router.push('/console/provisioning'),
        },
        {
          id: 'nav-billing',
          label: 'Billing & Subscriptions',
          description: 'Revenue, invoices, grace periods & webhooks',
          icon: <CreditCard className="h-4 w-4" />,
          onSelect: () => router.push('/console/billing'),
        },
        {
          id: 'nav-data-rights',
          label: 'Data Rights',
          description: 'Privacy requests, exports & deletion certificates',
          icon: <ShieldAlert className="h-4 w-4" />,
          onSelect: () => router.push('/console/data-rights'),
        },
        {
          id: 'nav-security',
          label: 'Security & Keys',
          description: 'API keys, operator access & lockouts',
          icon: <Key className="h-4 w-4" />,
          onSelect: () => router.push('/console/security'),
        },
        {
          id: 'nav-audit',
          label: 'Audit Log',
          description: 'Cryptographic hash chain compliance trail',
          icon: <FileText className="h-4 w-4" />,
          onSelect: () => router.push('/console/audit'),
        },
        {
          id: 'nav-ai',
          label: 'Ask OrbitoX',
          description: 'AI assistant over Model Context Protocol',
          icon: <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />,
          onSelect: () => router.push('/console/ai'),
        },
        {
          id: 'nav-settings',
          label: 'Settings & Appearance',
          description: 'Appearance, themes, fonts & platform config',
          icon: <Palette className="h-4 w-4" />,
          onSelect: () => router.push('/console/settings/appearance'),
        },
      ],
    },
    {
      group: 'Management Surfaces',
      items: [
        {
          id: 'nav-projects',
          label: 'Projects & Environments',
          description: 'Project isolation, staging & production envs',
          icon: <FolderKanban className="h-4 w-4" />,
          onSelect: () => router.push('/console/projects'),
        },
        {
          id: 'nav-packages',
          label: 'Packages & Plugins',
          description: 'Plugin engine, catalogue & signatures',
          icon: <Package className="h-4 w-4" />,
          onSelect: () => router.push('/console/packages'),
        },
        {
          id: 'nav-approvals',
          label: 'Approvals & Four-Eyes Quorum',
          description: 'Multi-party authorization & step-up verification',
          icon: <CheckSquare className="h-4 w-4" />,
          onSelect: () => router.push('/console/approvals'),
        },
        {
          id: 'nav-explorer',
          label: 'API Explorer',
          description: 'OpenAPI specification & endpoint catalog',
          icon: <Code2 className="h-4 w-4" />,
          onSelect: () => router.push('/console/developer/explorer'),
        },
        {
          id: 'nav-tests',
          label: 'Verification Center',
          description: 'Architectural invariants & cryptographic verification',
          icon: <TestTube className="h-4 w-4" />,
          onSelect: () => router.push('/console/developer/tests'),
        },
      ],
    },
    {
      group: 'Installed Product Runtimes',
      items: [
        {
          id: 'nav-restaurant',
          label: 'RestaurantOS Architecture Boundary',
          description: 'Manage RestaurantOS tenants from the Fleet Registry (decoupled runtime)',
          icon: <Layers className="h-4 w-4" />,
          onSelect: () => router.push('/admin/restaurant'),
        },
        {
          id: 'nav-hms',
          label: 'Hospitality HMS',
          description: 'Open HospitalOS clinical EHR & beds matrix',
          icon: <Building2 className="h-4 w-4" />,
          onSelect: () => router.push('/hms'),
        },
      ],
    },
  ];

  // 10 Authoritative Primary Navigation Items (per approved concept design)
  const navItems: NavItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      href: '/console/overview',
      icon: <LayoutDashboard className="h-4 w-4" />,
      active: activeId === 'overview',
    },
    {
      id: 'organizations',
      label: 'Organizations',
      href: '/console/organizations',
      icon: <Building2 className="h-4 w-4" />,
      active: activeId === 'orgs' || activeId === 'organizations',
      badge: counts.orgs ? (
        <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
          {counts.orgs}
        </span>
      ) : undefined,
    },
    {
      id: 'tenants',
      label: 'Tenants',
      href: '/console/tenants',
      icon: <Boxes className="h-4 w-4" />,
      active: activeId === 'tenants',
      badge: counts.tenants ? (
        <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
          {counts.tenants}
        </span>
      ) : undefined,
    },
    {
      id: 'provisioning',
      label: 'Provisioning',
      href: '/console/provisioning',
      icon: <Terminal className="h-4 w-4" />,
      active: activeId === 'provisioning',
      badge: counts.provisioning && counts.provisioning > 0 ? (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--color-danger)]/20 text-[var(--color-danger)]">
          {counts.provisioning}
        </span>
      ) : undefined,
    },
    {
      id: 'billing',
      label: 'Billing',
      href: '/console/billing',
      icon: <CreditCard className="h-4 w-4" />,
      active: activeId === 'billing',
      badge: counts.billing && counts.billing > 0 ? (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--color-warning)]/20 text-[var(--color-warning)]">
          {counts.billing}
        </span>
      ) : undefined,
    },
    {
      id: 'data-rights',
      label: 'Data Rights',
      href: '/console/data-rights',
      icon: <ShieldAlert className="h-4 w-4" />,
      active: activeId === 'data-rights',
      badge: counts.dataRights && counts.dataRights > 0 ? (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--color-danger)]/20 text-[var(--color-danger)]">
          {counts.dataRights}
        </span>
      ) : undefined,
    },
    {
      id: 'security',
      label: 'Security & Keys',
      href: '/console/security',
      icon: <Key className="h-4 w-4" />,
      active: activeId === 'security',
    },
    {
      id: 'audit',
      label: 'Audit Log',
      href: '/console/audit',
      icon: <FileText className="h-4 w-4" />,
      active: activeId === 'audit',
    },
    {
      id: 'ai-assistant',
      label: 'Ask OrbitoX',
      href: '/console/ai',
      icon: <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />,
      active: activeId === 'ai' || activeId === 'ai-assistant',
      badge: (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
          AI
        </span>
      ),
    },
    {
      id: 'appearance',
      label: 'Settings',
      href: '/console/settings/appearance',
      icon: <Palette className="h-4 w-4" />,
      active: activeId === 'appearance' || activeId === 'settings',
    },
    {
      id: 'design-system',
      label: 'Design System',
      href: '/console/design-system',
      icon: <Sparkles className="h-4 w-4" />,
      badge: (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]">
          Internal
        </span>
      ),
      active: activeId === 'design-system',
    },
  ];

  // Grouped Management Surfaces (accessible expandable or secondary section)
  const managementNavItems: NavItem[] = [
    {
      id: 'projects',
      label: 'Projects',
      href: '/console/projects',
      icon: <FolderKanban className="h-4 w-4" />,
      active: activeId === 'projects',
    },
    {
      id: 'packages',
      label: 'Packages & Plugins',
      href: '/console/packages',
      icon: <Package className="h-4 w-4" />,
      active: activeId === 'packages',
    },
    {
      id: 'approvals',
      label: 'Approvals',
      href: '/console/approvals',
      icon: <CheckSquare className="h-4 w-4" />,
      active: activeId === 'approvals',
    },
    {
      id: 'explorer',
      label: 'API Explorer',
      href: '/console/developer/explorer',
      icon: <Code2 className="h-4 w-4" />,
      active: activeId === 'explorer',
    },
    {
      id: 'tests',
      label: 'Verification Center',
      href: '/console/developer/tests',
      icon: <TestTube className="h-4 w-4" />,
      active: activeId === 'tests',
    },
  ];

  // Installed Products
  const bottomNavItems: NavItem[] = [
    {
      id: 'hms',
      label: 'Hospitality HMS',
      href: '/hms',
      icon: <Building2 className="h-4 w-4" />,
      badge: (
        <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
          Live
        </span>
      ),
    },
  ];

  // Accurate Environment Status Card (matches Shared console sidebar.png)
  const bottomCard = (
    <div className="rounded-[16px] p-3 bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
      <div className="flex items-center gap-2">
        <span
          className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full ${isProduction
              ? 'bg-emerald-400 text-emerald-950'
              : 'bg-amber-400 text-amber-950'
            }`}
        >
          {envLabel}
        </span>
      </div>
      <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5 leading-snug">
        {isProduction
          ? 'Live control plane. Operational mutations persist to primary storage.'
          : 'Test data only. Real patient and customer data never goes here.'}
      </p>
    </div>
  );

  // Active Operator Profile (for SidebarCard bottom slot)
  const userProfile = (
    <div className="flex flex-col gap-2 p-3 rounded-[var(--radius-row)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex items-center justify-between">
        <span
          className={`text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded-full ${isProduction
              ? 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]'
              : 'bg-[var(--color-info)]/15 text-[var(--color-info)]'
            }`}
        >
          {envLabel}
        </span>
        <span className="text-[10px] text-[var(--color-text-muted)] font-mono">v1.4.0</span>
      </div>

      <div className="flex items-center justify-between gap-2 mt-1">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-[var(--color-text)] truncate" title={activeEmail}>
            {activeEmail}
          </div>
          <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-mono">
            {activeRole}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={loggingOut}
          className="h-8 w-8 p-0 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-danger)] shrink-0"
          title="Sign out of operator session"
          aria-label="Sign out of operator session"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  // Search Button Slot for Sidebar (matches "Search or ask AI ⌘K")
  const searchSlot = (
    <button
      type="button"
      onClick={() => setIsCommandOpen(true)}
      className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)]/40 transition-colors cursor-pointer text-xs select-none"
      aria-label="Search or ask AI"
    >
      <div className="flex items-center gap-2 truncate">
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">Search or ask AI</span>
      </div>
      <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]">
        ⌘K
      </kbd>
    </button>
  );

  // TopBar Action Slot (Environment pill, AI Assistant link, Lock/Signout)
  const topBarActions = (
    <div className="flex items-center gap-2">
      <span
        className={`hidden sm:inline-flex text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-full ${isProduction
            ? 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]'
            : 'bg-[var(--color-info)]/15 text-[var(--color-info)]'
          }`}
      >
        {envLabel}
      </span>

      <Link
        href="/console/ai"
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] transition-colors min-h-[32px]"
      >
        <Sparkles className="h-3.5 w-3.5 text-[var(--color-primary)]" />
        <span className="hidden md:inline">Ask AI</span>
      </Link>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        disabled={loggingOut}
        className="h-8 w-8 p-0 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
        title="Sign out"
        aria-label="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );

  // Brand header matching "orbitox" + "Console" pill badge
  const brand = (
    <div className="flex items-center gap-2.5">
      <div className="h-7 w-7 rounded-xl bg-[var(--color-primary)] flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
        <Sparkles className="h-4 w-4 text-white" />
      </div>
      <span className="font-bold text-base tracking-tight text-[var(--color-text)]">
        orbitox
      </span>
      <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]">
        Console
      </span>
    </div>
  );

  return (
    <>
      <ResponsiveShell
        appName="OrbitoX Console"
        brand={brand}
        searchSlot={searchSlot}
        navItems={navItems}
        managementNavItems={managementNavItems}
        managementSectionTitle="Management"
        bottomNavItems={bottomNavItems}
        bottomCard={bottomCard}
        userProfile={userProfile}
        topBarActions={topBarActions}
        breadcrumbs={breadcrumbs}
        linkComponent={Link}
      >
        {children}
      </ResponsiveShell>

      {/* Global ⌘K Command Palette */}
      <CommandPalette
        open={isCommandOpen}
        onOpenChange={setIsCommandOpen}
        groups={commandGroups}
        currentRole={activeRole}
      />
    </>
  );
}
